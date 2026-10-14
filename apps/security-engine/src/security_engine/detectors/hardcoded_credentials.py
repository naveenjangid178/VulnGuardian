
import ast
import re

from security_engine.models.detection import (
    DetectionEvidence,
    DetectionMetadata,
    DetectionResult,
    SourceLocation,
)


CREDENTIAL_NAMES = {
    "password",
    "passwd",
    "pwd",
    "secret",
    "api_key",
    "apikey",
    "access_token",
    "auth_token",
    "client_secret",
    "private_key",
    "db_password",
    "database_password",
}

PLACEHOLDERS = {
    "",
    "password",
    "your_password",
    "your_secret",
    "your_api_key",
    "your_token",
    "change_me",
    "changeme",
    "example",
    "placeholder",
    "none",
    "null",
    "todo",
    "xxx",
    "redacted",
}


def _normalize_name(name: str) -> str:
    """Normalize camelCase and punctuation in variable names."""
    name = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", name)
    return re.sub(r"[^a-zA-Z0-9]+", "_", name).lower().strip("_")


def _is_credential_name(name: str) -> bool:
    """Check whether a variable name suggests a credential."""
    normalized = _normalize_name(name)
    parts = set(normalized.split("_"))

    return (
        normalized in CREDENTIAL_NAMES
        or "password" in parts
        or "passwd" in parts
        or "secret" in parts
        or "token" in parts
        or "private_key" in normalized
        or ("api" in parts and "key" in parts)
    )


def _get_string_value(node: ast.expr) -> str | None:
    """Return a literal string, including simple adjacent string literals."""
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value.strip()

    return None


def _is_placeholder(value: str) -> bool:
    """Ignore common placeholders and template-style values."""
    normalized = value.strip().lower()

    if normalized in PLACEHOLDERS:
        return True

    if normalized.startswith(("your_", "example_", "replace_me")):
        return True

    if normalized.startswith("<") and normalized.endswith(">"):
        return True

    if normalized.startswith("${") and normalized.endswith("}"):
        return True

    return False


def _assignment_targets(node: ast.AST):
    """Return targets and assigned value for supported assignments."""
    if isinstance(node, ast.Assign):
        return node.targets, node.value

    if isinstance(node, ast.AnnAssign):
        return [node.target], node.value

    if isinstance(node, ast.NamedExpr):
        return [node.target], node.value

    return [], None


def detect_hardcoded_credentials(
    source: str,
    file_path: str,
) -> list[DetectionResult]:
    """
    Detect likely hardcoded credentials in Python assignments.

    Supported patterns include ordinary, annotated, and walrus
    assignments with literal string values. This rule does not
    execute source code or verify whether a secret is valid.
    """
    try:
        tree = ast.parse(source, filename=file_path)
    except (SyntaxError, ValueError, TypeError):
        return []

    detections: list[DetectionResult] = []
    seen: set[tuple[int, str]] = set()

    for node in ast.walk(tree):
        targets, value_node = _assignment_targets(node)

        if value_node is None:
            continue

        value = _get_string_value(value_node)

        if value is None or _is_placeholder(value):
            continue

        for target in targets:
            candidate_targets = (
                target.elts
                if isinstance(target, (ast.Tuple, ast.List))
                else [target]
            )

            for candidate in candidate_targets:
                if not isinstance(candidate, ast.Name):
                    continue

                if not _is_credential_name(candidate.id):
                    continue

                key = (node.lineno, candidate.id)

                if key in seen:
                    continue

                seen.add(key)

                detections.append(
                    DetectionResult(
                        detector_type="AST",
                        vulnerability_slug="hardcoded-credentials",
                        file_path=file_path,
                        location=SourceLocation(
                            start_line=node.lineno,
                            start_column=node.col_offset + 1,
                            end_line=getattr(
                                node, "end_lineno", node.lineno
                            ) or node.lineno,
                            end_column=(
                                node.end_col_offset + 1
                                if getattr(node, "end_col_offset", None)
                                is not None
                                else None
                            ),
                        ),
                        confidence=0.85,
                        evidence=DetectionEvidence(
                            type="literal-credential-assignment",
                            message=(
                                "A credential-like variable is assigned "
                                "a non-placeholder string literal. "
                                "Verify whether the value is a real secret."
                            ),
                            source=candidate.id,
                        ),
                        metadata=DetectionMetadata(
                            analyzer="vulnguardian-python-ast",
                            analyzer_version="0.1.1",
                            rule_id="PY-HARDCODED-CREDENTIAL-001",
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
