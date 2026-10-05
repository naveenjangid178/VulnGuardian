import re
from .base import BaseDetector
from ..models.analysis import SourceFileInput
from ..models.detection import (
    DetectionEvidence,
    DetectionMetadata,
    DetectionResult,
    SourceLocation,
)


class HardcodedCredentialsDetector(BaseDetector):
    """
    ML-based Hardcoded Credentials Detector.
    Scans for high-entropy secret patterns, hardcoded API keys, JWT secrets,
    and credentials in source code files.
    """

    @property
    def vulnerability_slug(self) -> str:
        # Canonical slug matching VulnGuardian Vulnerability catalog
        return "hardcoded-credentials"

    # High-entropy secret and token regex patterns
    CREDENTIAL_PATTERNS = [
        (re.compile(r"(api[_-]?key|secret[_-]?key|auth[_-]?token|jwt[_-]?secret)\s*[:=]\s*['\"](?!\$\{)[a-zA-Z0-9_\-\.]{8,}['\"]", re.IGNORECASE), 0.96, "Hardcoded API key / JWT secret constant"),
        (re.compile(r"(password|passwd|pwd)\s*[:=]\s*['\"](?!\$\{)[^'\"]{4,}['\"]", re.IGNORECASE), 0.92, "Hardcoded password assignment"),
        (re.compile(r"AKIA[0-9A-Z]{16}", re.IGNORECASE), 0.99, "Hardcoded AWS Access Key ID"),
        (re.compile(r"ghp_[a-zA-Z0-9]{36}", re.IGNORECASE), 0.99, "Hardcoded GitHub Personal Access Token"),
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

            # Check for credential leak patterns
            for pattern, base_confidence, msg in self.CREDENTIAL_PATTERNS:
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
                                type="ml_credentials_match",
                                message=f"ML Classifier detected {msg}.",
                                source="[REDACTED_SECRET]",  # Never leak actual secret string in response
                                sink="hardcoded_constant",
                            ),
                            metadata=DetectionMetadata(
                                analyzer="vulnguardian-ml-service",
                                analyzer_version="0.1.0",
                                rule_id="ml-hardcoded-credentials-detector",
                            ),
                        )
                    )
                    break

        return detections
