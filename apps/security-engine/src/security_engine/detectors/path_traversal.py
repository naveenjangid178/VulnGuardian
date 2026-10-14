
import ast

from security_engine.models.detection import (
    DetectionEvidence,
    DetectionMetadata,
    DetectionResult,
    SourceLocation,
)


RULE_ID = "PY-PATH-TRAVERSAL-001"
ANALYZER_VERSION = "0.1.0"

# Common operations that can access files.
FILE_SINKS = {
    "open",
    "read_text",
    "read_bytes",
    "write_text",
    "write_bytes",
    "unlink",
    "mkdir",
    "rmdir",
    "remove",
    "rename",
    "replace",
}

# Common sources of potentially untrusted input.
INPUT_METHODS = {
    "input",
    "get",
    "getlist",
}

REQUEST_ROOTS = {
    "request",
    "req",
}


def _attribute_name(node: ast.AST) -> str | None:
    """Return the final name of a call or attribute."""
    if isinstance(node, ast.Name):
        return node.id

    if isinstance(node, ast.Attribute):
        return node.attr

    return None


def _contains_untrusted_input(
    node: ast.AST,
    tainted_names: set[str],
) -> bool:
    """
    Heuristically identify expressions that use untrusted input.

    This is lightweight AST analysis, not complete taint analysis.
    """
    for child in ast.walk(node):
        if isinstance(child, ast.Name) and child.id in tainted_names:
            return True

        if isinstance(child, ast.Call):
            method_name = _attribute_name(child.func)

            # Examples: request.args.get("file"),
            # request.form.get("filename"), input().
            if method_name == "input":
                return True

            if (
                method_name in INPUT_METHODS
                and isinstance(child.func, ast.Attribute)
                and isinstance(child.func.value, ast.Attribute)
                and isinstance(child.func.value.value, ast.Name)
                and child.func.value.value.id in REQUEST_ROOTS
            ):
                return True

            # Examples: request.args["file"],
            # request.GET.get("file") on common frameworks.
            if (
                method_name in INPUT_METHODS
                and isinstance(child.func, ast.Attribute)
                and isinstance(child.func.value, ast.Attribute)
                and isinstance(child.func.value.value, ast.Name)
                and child.func.value.attr.lower()
                in {"args", "form", "get", "post", "query_params", "data"}
            ):
                return True

    return False


def _is_path_constructor(node: ast.AST) -> bool:
    """Recognize common path-object constructors."""
    if not isinstance(node, ast.Call):
        return False

    name = _attribute_name(node.func)

    return name in {"Path", "PurePath", "PosixPath", "WindowsPath"}


def _path_expression_for_sink(call: ast.Call) -> ast.AST | None:
    """Get the path expression used by a recognized file operation."""
    method_name = _attribute_name(call.func)

    # open(path, ...) and os.open(path, ...).
    if isinstance(call.func, ast.Name) and call.func.id == "open":
        return call.args[0] if call.args else None

    if (
        isinstance(call.func, ast.Attribute)
        and call.func.attr == "open"
        and call.args
    ):
        return call.args[0]

    # Path(path).read_text(), Path(path).unlink(), etc.
    if (
        isinstance(call.func, ast.Attribute)
        and method_name in FILE_SINKS
        and _is_path_constructor(call.func.value)
    ):
        path_call = call.func.value
        return path_call.args[0] if path_call.args else None

    # Path variable methods are handled when the variable's
    # assignment can be resolved by the visitor.
    if (
        isinstance(call.func, ast.Attribute)
        and method_name in FILE_SINKS
    ):
        return call.func.value

    return None


class _PathTraversalVisitor(ast.NodeVisitor):
    """Find suspicious file operations involving untrusted input."""

    def __init__(self, source: str, file_path: str):
        self.source = source
        self.file_path = file_path
        self.tainted_names: set[str] = set()
        self.assignments: dict[str, ast.AST] = {}
        self.detections: list[DetectionResult] = []
        self.seen: set[tuple[int, int]] = set()

    def _resolve(self, node: ast.AST) -> ast.AST:
        """Resolve simple variable assignments without executing code."""
        seen: set[str] = set()

        while isinstance(node, ast.Name) and node.id in self.assignments:
            if node.id in seen:
                break

            seen.add(node.id)
            node = self.assignments[node.id]

        return node

    def visit_Assign(self, node: ast.Assign) -> None:
        self.visit(node.value)

        value = self._resolve(node.value)

        for target in node.targets:
            if isinstance(target, ast.Name):
                self.assignments[target.id] = value

                if _contains_untrusted_input(value, self.tainted_names):
                    self.tainted_names.add(target.id)

                # Direct input calls are tainted even when the input
                # source is not a known request object.
                if isinstance(value, ast.Call):
                    if _attribute_name(value.func) in INPUT_METHODS:
                        self.tainted_names.add(target.id)

            elif isinstance(target, (ast.Tuple, ast.List)):
                for element in target.elts:
                    if isinstance(element, ast.Name):
                        self.assignments.pop(element.id, None)
                        self.tainted_names.discard(element.id)

    def visit_AnnAssign(self, node: ast.AnnAssign) -> None:
        if node.value is None:
            return

        self.visit(node.value)
        value = self._resolve(node.value)

        if isinstance(node.target, ast.Name):
            self.assignments[node.target.id] = value

            if (
                _contains_untrusted_input(value, self.tainted_names)
                or (
                    isinstance(value, ast.Call)
                    and _attribute_name(value.func) in INPUT_METHODS
                )
            ):
                self.tainted_names.add(node.target.id)

    def visit_AugAssign(self, node: ast.AugAssign) -> None:
        self.visit(node.value)

        if isinstance(node.target, ast.Name):
            self.assignments.pop(node.target.id, None)

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        for decorator in node.decorator_list:
            self.visit(decorator)

        for default in node.args.defaults:
            self.visit(default)

        previous_assignments = self.assignments
        previous_tainted = self.tainted_names

        self.assignments = previous_assignments.copy()
        self.tainted_names = previous_tainted.copy()

        for statement in node.body:
            self.visit(statement)

        self.assignments = previous_assignments
        self.tainted_names = previous_tainted

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self.visit_FunctionDef(node)

    def visit_Call(self, node: ast.Call) -> None:
        path_expression = _path_expression_for_sink(node)

        if path_expression is not None:
            resolved_path = self._resolve(path_expression)

            if _contains_untrusted_input(
                resolved_path,
                self.tainted_names,
            ):
                self._add_detection(resolved_path, node)

        self.generic_visit(node)

    
    def _add_detection(
        self,
        path_expression: ast.AST,
        call: ast.Call,
    ) -> None:
        # Report the file operation as the primary location.
        line = call.lineno
        column = call.col_offset
        key = (line, column)

        if key in self.seen:
            return

        self.seen.add(key)

        end_line = getattr(call, "end_lineno", line) or line
        end_column = getattr(call, "end_col_offset", None)

        self.detections.append(
            DetectionResult(
                detector_type="AST",
                vulnerability_slug="path-traversal",
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
                confidence=0.70,
                evidence=DetectionEvidence(
                    type="untrusted-file-path",
                    message=(
                        "A file operation appears to use a path derived "
                        "from potentially untrusted input. Validate the "
                        "input and resolve the final path to ensure it "
                        "remains inside the intended directory."
                    ),
                    source=(
                        ast.get_source_segment(self.source, path_expression)
                        or "potentially untrusted file path"
                    ),
                ),
                metadata=DetectionMetadata(
                    analyzer="vulnguardian-python-ast",
                    analyzer_version=ANALYZER_VERSION,
                    rule_id=RULE_ID,
                ),
            )
        )


def detect_path_traversal(
    source: str,
    file_path: str,
) -> list[DetectionResult]:
    """
    Detect suspicious file operations using potentially untrusted paths.

    This heuristic detector does not execute submitted source code and
    does not provide complete interprocedural taint analysis.
    """
    try:
        tree = ast.parse(source, filename=file_path)
    except (SyntaxError, ValueError, TypeError):
        return []

    visitor = _PathTraversalVisitor(source, file_path)
    visitor.visit(tree)

    visitor.detections.sort(
        key=lambda finding: (
            finding.location.start_line,
            finding.location.start_column or 0,
        )
    )

    return visitor.detections
