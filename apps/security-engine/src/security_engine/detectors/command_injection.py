
"""Heuristic AST detector for Python command injection vulnerabilities."""

import ast

from security_engine.models.detection import (
    DetectionEvidence,
    DetectionMetadata,
    DetectionResult,
    SourceLocation,
)

RULE_ID = "PY-COMMAND-INJECTION-001"
ANALYZER = "vulnguardian-python-ast"
ANALYZER_VERSION = "0.1.0"

# Functions that execute a command through a shell.
SHELL_SINKS = {
    "system",
    "popen",
}

SUBPROCESS_SINKS = {
    "run",
    "call",
    "Popen",
    "check_call",
    "check_output",
}

INPUT_FUNCTIONS = {"input"}
REQUEST_METHODS = {"get", "post", "put", "patch", "delete"}


class CommandInjectionVisitor(ast.NodeVisitor):
    """Find likely untrusted input flowing into shell command execution."""

    def __init__(self, source: str, file_path: str) -> None:
        self.source = source
        self.file_path = file_path
        self.detections: list[DetectionResult] = []
        self.tainted_names: set[str] = set()
        self.seen_locations: set[tuple[int, int]] = set()

    def visit_Assign(self, node: ast.Assign) -> None:
        """Track simple variables assigned untrusted input."""
        if self._is_untrusted(node.value):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    self.tainted_names.add(target.id)

        self.generic_visit(node)

    def visit_AnnAssign(self, node: ast.AnnAssign) -> None:
        if node.value is not None and self._is_untrusted(node.value):
            if isinstance(node.target, ast.Name):
                self.tainted_names.add(node.target.id)

        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        if self._is_shell_sink(node):
            command = self._command_argument(node)

            if command is not None and self._is_untrusted(command):
                self._add_detection(node, command)

        elif self._is_subprocess_sink(node):
            command = self._command_argument(node)
            shell_enabled = any(
                keyword.arg == "shell"
                and isinstance(keyword.value, ast.Constant)
                and keyword.value.value is True
                for keyword in node.keywords
            )

            if (
                shell_enabled
                and command is not None
                and self._is_untrusted(command)
            ):
                self._add_detection(node, command)

        self.generic_visit(node)

    def _is_shell_sink(self, node: ast.Call) -> bool:
        function = node.func

        return (
            isinstance(function, ast.Attribute)
            and function.attr in SHELL_SINKS
            and isinstance(function.value, ast.Name)
            and function.value.id == "os"
        )

    def _is_subprocess_sink(self, node: ast.Call) -> bool:
        function = node.func

        return (
            isinstance(function, ast.Attribute)
            and function.attr in SUBPROCESS_SINKS
            and isinstance(function.value, ast.Name)
            and function.value.id == "subprocess"
        )

    @staticmethod
    def _command_argument(node: ast.Call) -> ast.expr | None:
        """Return the first positional argument, if present."""
        return node.args[0] if node.args else None

    def _is_untrusted(self, node: ast.AST) -> bool:
        """Check for direct input sources or tracked variable names."""
        if isinstance(node, ast.Call):
            function = node.func

            if isinstance(function, ast.Name):
                if function.id in INPUT_FUNCTIONS:
                    return True

            if isinstance(function, ast.Attribute):
                if (
                    function.attr in REQUEST_METHODS
                    and self._looks_like_request_object(function.value)
                ):
                    return True

        if isinstance(node, ast.Name):
            return node.id in self.tainted_names

        if isinstance(node, ast.BinOp):
            return self._is_untrusted(node.left) or self._is_untrusted(
                node.right
            )

        if isinstance(node, ast.JoinedStr):
            return any(
                isinstance(value, ast.FormattedValue)
                and self._is_untrusted(value.value)
                for value in node.values
            )

        if isinstance(node, ast.FormattedValue):
            return self._is_untrusted(node.value)

        if isinstance(node, ast.Call):
            # Detect formatting such as command.format(user_input).
            if isinstance(node.func, ast.Attribute):
                if node.func.attr == "format":
                    return self._is_untrusted(node.func.value) or any(
                        self._is_untrusted(arg) for arg in node.args
                    )

            return any(self._is_untrusted(arg) for arg in node.args)

        if isinstance(node, (ast.List, ast.Tuple)):
            return any(self._is_untrusted(item) for item in node.elts)

        return False

    @staticmethod
    def _looks_like_request_object(node: ast.AST) -> bool:
        """Recognize common request and query parameter access patterns."""
        if isinstance(node, ast.Name):
            return node.id.lower() in {
                "request",
                "req",
                "query",
                "params",
                "args",
            }

        if isinstance(node, ast.Attribute):
            return node.attr.lower() in {
                "args",
                "form",
                "query",
                "query_params",
                "GET",
            }

        return False

    def _add_detection(
        self, call: ast.Call, command: ast.expr
    ) -> None:
        location_key = (call.lineno, call.col_offset)

        if location_key in self.seen_locations:
            return

        self.seen_locations.add(location_key)

        try:
            command_source = ast.get_source_segment(self.source, command)
        except (ValueError, TypeError):
            command_source = None

        self.detections.append(
            DetectionResult(
                detector_type="AST",
                vulnerability_slug="command-injection",
                file_path=self.file_path,
                location=SourceLocation(
                    start_line=call.lineno,
                    start_column=call.col_offset + 1,
                    end_line=call.end_lineno or call.lineno,
                    end_column=(call.end_col_offset or call.col_offset) + 1,
                ),
                confidence=0.90,
                evidence=DetectionEvidence(
                    type="tainted_command",
                    message=(
                        "Untrusted input may influence a command executed "
                        "through a shell."
                    ),
                    source=command_source,
                ),
                metadata=DetectionMetadata(
                    analyzer=ANALYZER,
                    analyzer_version=ANALYZER_VERSION,
                    rule_id=RULE_ID,
                ),
            )
        )


def detect_command_injection(
    source: str,
    file_path: str,
) -> list[DetectionResult]:
    """Return potential command injection findings without running the code."""
    try:
        tree = ast.parse(source)
    except (SyntaxError, ValueError, TypeError):
        return []

    visitor = CommandInjectionVisitor(source, file_path)
    visitor.visit(tree)

    return sorted(
        visitor.detections,
        key=lambda item: (
            item.location.start_line,
            item.location.start_column,
        ),
    )
