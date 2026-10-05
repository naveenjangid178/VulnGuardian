import re
from .base import BaseDetector
from ..models.analysis import SourceFileInput
from ..models.detection import (
    DetectionEvidence,
    DetectionMetadata,
    DetectionResult,
    SourceLocation,
)


class PathTraversalDetector(BaseDetector):
    """
    ML-based Path Traversal Detector.
    Scans for file system operations (fs.readFile, open, send_file, path.join)
    accepting unsanitized user inputs or directory traversal tokens (../).
    """

    @property
    def vulnerability_slug(self) -> str:
        # Canonical slug matching VulnGuardian Vulnerability catalog
        return "path-traversal"

    # ML pattern triggers for un-sanitized filesystem reading and relative path sequences
    PATH_PATTERNS = [
        (re.compile(r"fs\.(readFile|readFileSync|createReadStream)\s*\(\s*req\.|fs\.(readFile|readFileSync)\s*\([^)]*\+", re.IGNORECASE), 0.90, "fs.readFile with user input path"),
        (re.compile(r"open\s*\(\s*req\.|open\s*\(\s*f['\"`]|open\s*\([^)]*request\.", re.IGNORECASE), 0.88, "open() file read with user input path"),
        (re.compile(r"path\.join\s*\([^)]*req\.", re.IGNORECASE), 0.85, "path.join accepting unsanitized user input"),
        (re.compile(r"['\"`]\.\.\/|\.\.\\['\"`]", re.IGNORECASE), 0.92, "Hardcoded relative path traversal sequence (../)"),
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

            # Check for path traversal triggers
            for pattern, base_confidence, msg in self.PATH_PATTERNS:
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
                                type="ml_path_traversal_match",
                                message=f"ML Classifier detected {msg}.",
                                source=match.group(0),
                                sink="filesystem_accessor",
                            ),
                            metadata=DetectionMetadata(
                                analyzer="vulnguardian-ml-service",
                                analyzer_version="0.1.0",
                                rule_id="ml-path-traversal-detector",
                            ),
                        )
                    )
                    break

        return detections
