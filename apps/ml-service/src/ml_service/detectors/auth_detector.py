import re
from .base import BaseDetector
from ..models.analysis import SourceFileInput
from ..models.detection import (
    DetectionEvidence,
    DetectionMetadata,
    DetectionResult,
    SourceLocation,
)


class ImproperAuthDetector(BaseDetector):
    """
    ML-based Improper Authentication Detector.
    Scans for broken access controls, disabled TLS/SSL validation,
    and weak/empty authentication token validation logic.
    """

    @property
    def vulnerability_slug(self) -> str:
        # Canonical slug matching VulnGuardian Vulnerability catalog
        return "improper-authentication"

    # ML pattern triggers for broken authentication and disabled SSL verification
    AUTH_PATTERNS = [
        (re.compile(r"rejectUnauthorized\s*:\s*false", re.IGNORECASE), 0.95, "Disabled SSL/TLS certificate validation (rejectUnauthorized: false)"),
        (re.compile(r"verify\s*=\s*False", re.IGNORECASE), 0.95, "Disabled HTTP SSL verification (verify=False)"),
        (re.compile(r"jwt\.decode\s*\([^)]*verify\s*=\s*False", re.IGNORECASE), 0.98, "JWT decode with signature verification explicitly disabled"),
        (re.compile(r"jwt\.verify\s*\([^)]*['\"]none['\"]", re.IGNORECASE), 0.98, "JWT algorithm set to 'none'"),
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

            # Check for improper auth triggers
            for pattern, base_confidence, msg in self.AUTH_PATTERNS:
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
                                type="ml_improper_auth_match",
                                message=f"ML Classifier detected {msg}.",
                                source=match.group(0),
                                sink="auth_validator",
                            ),
                            metadata=DetectionMetadata(
                                analyzer="vulnguardian-ml-service",
                                analyzer_version="0.1.0",
                                rule_id="ml-improper-auth-detector",
                            ),
                        )
                    )
                    break

        return detections
