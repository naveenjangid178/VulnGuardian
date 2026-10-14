
import ast

from security_engine.models.detection import (
    DetectionEvidence,
    DetectionMetadata,
    DetectionResult,
    SourceLocation,
)


RULE_ID = "PY-SQL-INJECTION-001"
ANALYZER_VERSION = "0.1.0"

EXECUTION_METHODS = {
    "execute",
    "executemany",
    "executescript",
}

SQL_KEYWORDS = {
    "select",
    "insert",
    "update",
    "delete",
    "replace",
    "drop",
    "alter",
    "truncate",
    "exec",
    "execute",
    "union",
}


def _is_sql_text(value: str) -> bool:
    """Check whether text contains recognizable SQL keywords."""
    import re

    return any(
        re.search(rf"\b{keyword}\b", value, re.IGNORECASE)
        for keyword in SQL_KEYWORDS
    )


def _literal_text(node: ast.AST) -> str:
    """Collect literal strings from an expression."""
    parts = []

    for child in ast.walk(node):
        if isinstance(child, ast.Constant) and isinstance(child.value, str):
            parts.append(child.value)

    return " ".join(parts)


def _resolve(
    node: ast.AST,
    assignments: dict[str, ast.AST],
    seen: set[str] | None = None,
) -> ast.AST:
    """Resolve simple variable assignments without executing code."""
    if seen is None:
        seen = set()

    if isinstance(node, ast.Name) and node.id in assignments:
        if node.id not in seen:
            return _resolve(
                assignments[node.id],
                assignments,
                seen | {node.id},
            )

    return node


def _has_dynamic_sql(
    node: ast.AST,
    assignments: dict[str, ast.AST],
) -> bool:
    """Identify SQL expressions containing dynamic values."""
    node = _resolve(node, assignments)

    if isinstance(node, ast.JoinedStr):
        return any(
            isinstance(part, ast.FormattedValue)
            for part in node.values
        )

    if isinstance(node, ast.BinOp):
        if isinstance(node.op, ast.Mod):
            return _is_sql_text(_literal_text(node.left))

        return (
            _has_dynamic_sql(node.left, assignments)
            or _has_dynamic_sql(node.right, assignments)
        )

    if isinstance(node, ast.Call):
        if (
            isinstance(node.func, ast.Attribute)
            and node.func.attr == "format"
        ):
            template = node.func.value

            return (
                bool(node.args or node.keywords)
                and _is_sql_text(_literal_text(template))
            )

        return False

    if isinstance(node, (ast.Name, ast.Attribute, ast.Subscript)):
        return True

    if isinstance(node, ast.IfExp):
        return (
            _has_dynamic_sql(node.body, assignments)
            or _has_dynamic_sql(node.orelse, assignments)
        )

    return False


class _SQLInjectionVisitor(ast.NodeVisitor):
    """Inspect Python statements and track simple query assignments."""

    def __init__(self, source: str, file_path: str):
        self.source = source
        self.file_path = file_path
        self.assignments: dict[str, ast.AST] = {}
        self.detections: list[DetectionResult] = []
        self.seen: set[tuple[int, int]] = set()

    def visit_Assign(self, node: ast.Assign) -> None:
        self.visit(node.value)

        for target in node.targets:
            if isinstance(target, ast.Name):
                self.assignments[target.id] = node.value
            elif isinstance(target, (ast.Tuple, ast.List)):
                for element in target.elts:
                    if isinstance(element, ast.Name):
                        self.assignments.pop(element.id, None)

    def visit_AnnAssign(self, node: ast.AnnAssign) -> None:
        if node.value is not None:
            self.visit(node.value)

            if isinstance(node.target, ast.Name):
                self.assignments[node.target.id] = node.value

    def visit_AugAssign(self, node: ast.AugAssign) -> None:
        self.visit(node.value)

        if isinstance(node.target, ast.Name):
            self.assignments.pop(node.target.id, None)

    def visit_NamedExpr(self, node: ast.NamedExpr) -> None:
        self.visit(node.value)

        if isinstance(node.target, ast.Name):
            self.assignments[node.target.id] = node.value

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        for decorator in node.decorator_list:
            self.visit(decorator)

        for default in node.args.defaults:
            self.visit(default)

        previous = self.assignments
        self.assignments = previous.copy()

        for statement in node.body:
            self.visit(statement)

        self.assignments = previous

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self.visit_FunctionDef(node)

    def visit_Call(self, node: ast.Call) -> None:
        if (
            isinstance(node.func, ast.Attribute)
            and node.func.attr in EXECUTION_METHODS
            and node.args
        ):
            query = _resolve(node.args[0], self.assignments)

            if (
                _is_sql_text(_literal_text(query))
                and _has_dynamic_sql(query, self.assignments)
            ):
                self._add_detection(query, node)

        self.generic_visit(node)

    def _add_detection(
        self,
        query: ast.AST,
        call: ast.Call,
    ) -> None:
        line = getattr(query, "lineno", call.lineno)
        column = getattr(query, "col_offset", call.col_offset)
        key = (line, column)

        if key in self.seen:
            return

        self.seen.add(key)

        end_line = (
            getattr(query, "end_lineno", call.end_lineno or line) or line
        )
        end_column = getattr(query, "end_col_offset", None)

        self.detections.append(
            DetectionResult(
                detector_type="AST",
                vulnerability_slug="sql-injection",
                file_path=self.file_path,
                location=SourceLocation(
                    start_line=line,
                    start_column=column + 1,
                    end_line=end_line,
                    end_column=(
                        end_column + 1
                        if end_column is not None
                        else None
                    ),
                ),
                confidence=0.75,
                evidence=DetectionEvidence(
                    type="dynamic-sql-construction",
                    message=(
                        "SQL appears to be constructed using dynamic "
                        "values before execution. Review the data flow "
                        "and use parameterized queries where possible."
                    ),
                    source=(
                        ast.get_source_segment(self.source, query)
                        or "dynamic SQL expression"
                    ),
                ),
                metadata=DetectionMetadata(
                    analyzer="vulnguardian-python-ast",
                    analyzer_version=ANALYZER_VERSION,
                    rule_id=RULE_ID,
                ),
            )
        )


def detect_sql_injection(
    source: str,
    file_path: str,
) -> list[DetectionResult]:
    """
    Detect suspicious dynamic SQL passed to common execution methods.

    This is a heuristic AST detector, not complete taint analysis.
    Submitted source code is parsed but never executed.
    """
    try:
        tree = ast.parse(source, filename=file_path)
    except (SyntaxError, ValueError, TypeError):
        return []

    visitor = _SQLInjectionVisitor(source, file_path)
    visitor.visit(tree)

    visitor.detections.sort(
        key=lambda finding: (
            finding.location.start_line,
            finding.location.start_column or 0,
        )
    )

    return visitor.detections
