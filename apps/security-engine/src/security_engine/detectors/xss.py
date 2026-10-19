
"""AST-based heuristic detection for Python server-side XSS."""

import ast

from security_engine.models.detection import (
    DetectionEvidence,
    DetectionMetadata,
    DetectionResult,
    SourceLocation,
)


RULE_ID = "PY-XSS-001"
ANALYZER_VERSION = "0.1.0"

HTML_SINKS = {"Markup", "mark_safe", "HTML"}
HTML_RENDER_METHODS = {"render_template_string"}


def _contains_dynamic_content(node: ast.AST) -> bool:
    """Check whether an expression contains dynamic string construction."""
    if isinstance(node, ast.JoinedStr):
        return any(
            isinstance(part, ast.FormattedValue)
            for part in node.values
        )

    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        return True

    if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
        if node.func.attr in {"format", "format_map"}:
            return True

    return any(
        _contains_dynamic_content(child)
        for child in ast.iter_child_nodes(node)
    )


def _is_html_sink(node: ast.Call) -> bool:
    """Check whether a call targets a known HTML-related sink."""
    if isinstance(node.func, ast.Name):
        return node.func.id in HTML_SINKS

    if isinstance(node.func, ast.Attribute):
        return node.func.attr in HTML_RENDER_METHODS

    return False


def detect_xss(
    source: str,
    file_path: str = "<unknown>",
) -> list[DetectionResult]:
    """
    Detect dynamic content passed to selected HTML-related sinks.

    This heuristic is not complete taint analysis. Source code is parsed,
    never executed.
    """
    try:
        tree = ast.parse(source, filename=file_path)
    except (SyntaxError, ValueError, TypeError):
        return []

    detections: list[DetectionResult] = []

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call) or not _is_html_sink(node):
            continue

        if not node.args or not _contains_dynamic_content(node.args[0]):
            continue

        evidence_source = (
            ast.get_source_segment(source, node)
            or "dynamic HTML expression"
        )

        detections.append(
            DetectionResult(
                detector_type="AST",
                vulnerability_slug="xss",
                file_path=file_path,
                location=SourceLocation(
                    start_line=node.lineno,
                    start_column=node.col_offset + 1,
                    end_line=node.end_lineno or node.lineno,
                    end_column=(
                        node.end_col_offset + 1
                        if node.end_col_offset is not None
                        else None
                    ),
                ),
                confidence=0.70,
                evidence=DetectionEvidence(
                    type="dynamic-html-construction",
                    message=(
                        "Dynamic content is passed to an HTML-related "
                        "sink. Verify that untrusted content is escaped "
                        "or sanitized appropriately for its output context."
                    ),
                    source=evidence_source,
                ),
                metadata=DetectionMetadata(
                    analyzer="vulnguardian-python-ast",
                    analyzer_version=ANALYZER_VERSION,
                    rule_id=RULE_ID,
                ),
            )
        )

    detections.sort(
        key=lambda finding: (
            finding.location.start_line,
            finding.location.start_column or 0,
        )
    )

    return detections
