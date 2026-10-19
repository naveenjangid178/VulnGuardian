
"""Heuristic AST detection for potential improper authentication.

This detector identifies:
- Explicit authentication-bypass-like function calls.
- FastAPI routes with no authentication dependency visible in the
  route decorator or function parameters.

Limitations:
- Authentication may be enforced by middleware, router-level dependencies,
  or custom framework integrations.
- Dependency names are indicators, not proof of security.
- Findings require human review.
"""

import ast

from security_engine.models.detection import (
    DetectionEvidence,
    DetectionMetadata,
    DetectionResult,
    SourceLocation,
)

RULE_ID = "PY-AUTH-001"
ANALYZER_VERSION = "0.2.0"

BYPASS_FUNCTION_NAMES = {
    "skip_auth",
    "disable_auth",
    "bypass_auth",
}

AUTH_DEPENDENCY_NAMES = {
    "require_auth",
    "require_authentication",
    "authenticate",
    "verify_token",
    "verify_jwt",
    "get_current_user",
    "get_current_active_user",
    "require_user",
    "require_admin",
    "check_permissions",
    "authorize",
}

HTTP_ROUTE_DECORATORS = {
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "options",
    "head",
    "api_route",
}


def _call_name(node: ast.Call) -> str | None:
    """Return a called function or method name."""
    if isinstance(node.func, ast.Name):
        return node.func.id
    if isinstance(node.func, ast.Attribute):
        return node.func.attr
    return None


def _dotted_name(node: ast.AST) -> str | None:
    """Return a dotted name for a Name or Attribute expression."""
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        parent = _dotted_name(node.value)
        return f"{parent}.{node.attr}" if parent else node.attr
    return None


def _contains_auth_dependency(node: ast.AST) -> bool:
    """Check whether an expression visibly references a known auth helper."""
    for child in ast.walk(node):
        name = _dotted_name(child)
        if name and name.rsplit(".", 1)[-1] in AUTH_DEPENDENCY_NAMES:
            return True
    return False


def _route_decorators(
    function: ast.FunctionDef | ast.AsyncFunctionDef,
) -> list[ast.Call]:
    """Return decorators that look like HTTP route declarations."""
    routes = []

    for decorator in function.decorator_list:
        if not isinstance(decorator, ast.Call):
            continue

        name = _dotted_name(decorator.func)
        if name and name.rsplit(".", 1)[-1] in HTTP_ROUTE_DECORATORS:
            routes.append(decorator)

    return routes


def _has_visible_authentication(
    function: ast.FunctionDef | ast.AsyncFunctionDef,
    route: ast.Call,
) -> bool:
    """Look for explicit authentication dependency indicators."""
    if _contains_auth_dependency(route):
        return True

    for argument in function.args.args + function.args.kwonlyargs:
        if argument.arg in {"user", "current_user", "current_active_user"}:
            return True

    for default in function.args.defaults + [
        value for value in function.args.kw_defaults if value is not None
    ]:
        if _contains_auth_dependency(default):
            return True

    return False


def detect_improper_authentication(
    source: str,
    file_path: str = "<unknown>",
) -> list[DetectionResult]:
    """Detect explicit bypass markers and routes without visible auth checks."""
    try:
        tree = ast.parse(source, filename=file_path)
    except (SyntaxError, ValueError, TypeError):
        return []

    detections: list[DetectionResult] = []
    seen: set[tuple[int, str]] = set()

    def add_finding(
        node: ast.AST,
        *,
        kind: str,
        message: str,
        confidence: float,
    ) -> None:
        line = getattr(node, "lineno", 1)
        if (line, kind) in seen:
            return
        seen.add((line, kind))

        evidence_source = (
            ast.get_source_segment(source, node)
            or kind
        )

        detections.append(
            DetectionResult(
                detector_type="AST",
                vulnerability_slug="improper-authentication",
                file_path=file_path,
                location=SourceLocation(
                    start_line=line,
                    start_column=getattr(node, "col_offset", 0) + 1,
                    end_line=getattr(node, "end_lineno", line) or line,
                    end_column=(
                        getattr(node, "end_col_offset", None) + 1
                        if getattr(node, "end_col_offset", None) is not None
                        else None
                    ),
                ),
                confidence=confidence,
                evidence=DetectionEvidence(
                    type=kind,
                    message=message,
                    source=evidence_source,
                ),
                metadata=DetectionMetadata(
                    analyzer="vulnguardian-python-ast",
                    analyzer_version=ANALYZER_VERSION,
                    rule_id=RULE_ID,
                ),
            )
        )

    # Detect explicit calls that resemble authentication bypasses.
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue

        name = _call_name(node)
        if name in BYPASS_FUNCTION_NAMES:
            add_finding(
                node,
                kind="potential-authentication-bypass",
                message=(
                    "An authentication-bypass-like function is called. "
                    "Verify that it cannot disable authentication on "
                    "protected operations."
                ),
                confidence=0.70,
            )

    # Detect FastAPI-style routes without visible authentication indicators.
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue

        for route in _route_decorators(node):
            if _has_visible_authentication(node, route):
                continue

            add_finding(
                node,
                kind="route-without-visible-authentication",
                message=(
                    "This HTTP route has no recognized authentication "
                    "dependency in its decorator or parameters. Authentication "
                    "may still be enforced by middleware or router configuration; "
                    "review before classifying this as a vulnerability."
                ),
                confidence=0.40,
            )

    detections.sort(
        key=lambda finding: (
            finding.location.start_line,
            finding.location.start_column or 0,
        )
    )
    return detections
