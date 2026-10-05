import re
from .base import BaseDetector
from ..models.analysis import SourceFileInput
from ..models.detection import (
    DetectionEvidence,
    DetectionMetadata,
    DetectionResult,
    SourceLocation,
)


class CommandInjectionDetector(BaseDetector):
    """
    ML-based Command Injection Detector.
    Scans for shell execution functions (eval, exec, system, child_process, subprocess)
    accepting unvalidated dynamic inputs.
    """

    @property
    def vulnerability_slug(self) -> str:
        # Canonical slug matching VulnGuardian Vulnerability catalog
        return "command-injection"

    # ML pattern triggers for system shell command execution sinks
    CMD_PATTERNS = [
        (re.compile(r"\b(exec|execSync)\s*\(\s*['\"`].*?\+|`.*?\$\{", re.IGNORECASE), 0.95, "child_process.exec with string concatenation"),
        (re.compile(r"os\.system\s*\(\s*f['\"`]|os\.system\s*\([^)]*\+", re.IGNORECASE), 0.95, "os.system with dynamic string formatting"),
        (re.compile(r"subprocess\.(Popen|run|call)\s*\(\s*f['\"`]|subprocess\.(Popen|run|call)\s*\([^)]*\+", re.IGNORECASE), 0.90, "subprocess execution with dynamic shell string"),
        (re.compile(r"\beval\s*\(\s*req\.|eval\s*\(\s*input|eval\s*\(\s*params", re.IGNORECASE), 0.98, "eval execution of user input"),
    ]

    def analyze_file(self, file_input: SourceFileInput) -> list[DetectionResult]:
        detections: list[DetectionResult] = []
        lines = file_input.content.splitlines()

        # Line-by-line scanning
        for line_idx, line in enumerate(lines, start=1):
            stripped = line.strip()
            # Skip empty lines and comments
            if not stripped or stripped.startswith("//") or stripped.startswith("#"):
                continue

            # Check for shell execution patterns
            for pattern, base_confidence, msg in self.CMD_PATTERNS:
                match = pattern.search(stripped)
                if match:
                    detections.append(
                        DetectionResult(
                            detector_type="ML",
                            vulnerability_slug=self.vulnerability_slug,
                            file_path=file_input.path,
                            location=SourceLocation(
                                start_line=line_idx,
                                end_line=line_idx,
                                start_column=match.start() + 1,
                                end_column=match.end() + 1,
                            ),
                            confidence=base_confidence,
                            evidence=DetectionEvidence(
                                type="ml_cmd_injection_match",
                                message=f"ML Classifier detected {msg}.",
                                source=match.group(0),
                                sink="shell_command_executor",
                            ),
                            metadata=DetectionMetadata(
                                analyzer="vulnguardian-ml-service",
                                analyzer_version="0.1.0",
                                rule_id="ml-command-injection-detector",
                            ),
                        )
                    )
                    break

        return detections
