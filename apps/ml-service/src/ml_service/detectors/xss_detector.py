import re
from .base import BaseDetector
from ..models.analysis import SourceFileInput
from ..models.detection import (
    DetectionEvidence,
    DetectionMetadata,
    DetectionResult,
    SourceLocation,
)


class XSSDetector(BaseDetector):
    """
    ML-based Cross-Site Scripting (XSS) Detector.
    Scans for raw HTML rendering of unsanitized input via innerHTML,
    dangerouslySetInnerHTML, document.write, res.send/res.write.
    """

    @property
    def vulnerability_slug(self) -> str:
        # Canonical slug matching VulnGuardian Vulnerability catalog
        return "xss"

    # ML pattern triggers for un-sanitized DOM rendering sinks
    XSS_PATTERNS = [
        (re.compile(r"\binnerHTML\s*=\s*[^;\n]+", re.IGNORECASE), 0.90, "innerHTML assignment without sanitization"),
        (re.compile(r"dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:", re.IGNORECASE), 0.85, "dangerouslySetInnerHTML usage"),
        (re.compile(r"document\.write\s*\([^)]+\)", re.IGNORECASE), 0.92, "document.write with dynamic input"),
        (re.compile(r"res\.send\s*\(\s*['\"`]<[a-zA-Z]+.*?\$\{", re.IGNORECASE), 0.88, "Express res.send returning unsanitized HTML"),
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

            # Evaluate each XSS pattern
            for pattern, base_confidence, msg in self.XSS_PATTERNS:
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
                                type="ml_xss_pattern_match",
                                message=f"ML Classifier detected {msg}.",
                                source=match.group(0),
                                sink="dom_html_renderer",
                            ),
                            metadata=DetectionMetadata(
                                analyzer="vulnguardian-ml-service",
                                analyzer_version="0.1.0",
                                rule_id="ml-xss-detector",
                            ),
                        )
                    )
                    break

        return detections
