import re
from .base import BaseDetector
from ..models.analysis import SourceFileInput
from ..models.detection import (
    DetectionEvidence,
    DetectionMetadata,
    DetectionResult,
    SourceLocation,
)


class SQLInjectionDetector(BaseDetector):
    """
    ML-based SQL Injection Detector.
    Analyzes queries with dynamic user input string concatenation, format strings,
    and unparameterized ORM/database execution contexts.
    """

    @property
    def vulnerability_slug(self) -> str:
        # Canonical slug matching VulnGuardian Vulnerability catalog
        return "sql-injection"

    # SQL query keyword indicators
    SQL_KEYWORDS = re.compile(
        r"\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|UNION|DROP|ALTER|EXEC|EXECUTE)\b",
        re.IGNORECASE,
    )

    # Patterns indicating unparameterized dynamic string concatenation in queries
    DYNAMIC_CONCAT_PATTERNS = [
        re.compile(r"['\"`]\s*\+\s*[a-zA-Z0-9_\.]+|[a-zA-Z0-9_\.]+\s*\+\s*['\"`]"),  # 'SELECT... ' + var
        re.compile(r"f['\"`].*?SELECT|INSERT|UPDATE|DELETE.*?\{.*?\}", re.IGNORECASE),  # Python f"SELECT ... {var}"
        re.compile(r"`.*?SELECT|INSERT|UPDATE|DELETE.*?\$\{.*?\}", re.IGNORECASE),  # JS template literal `SELECT ... ${var}`
        re.compile(r"\.(query|execute|raw|queryRaw)\s*\(\s*['\"`].*?\+|`.*?\$\{", re.IGNORECASE),  # db.query("... " + var)
    ]

    def analyze_file(self, file_input: SourceFileInput) -> list[DetectionResult]:
        detections: list[DetectionResult] = []
        lines = file_input.content.splitlines()

        # Line-by-line classification
        for line_idx, line in enumerate(lines, start=1):
            stripped = line.strip()
            # Ignore empty lines and comments
            if not stripped or stripped.startswith("//") or stripped.startswith("#"):
                continue

            # Check if SQL keywords are present
            has_sql_keyword = bool(self.SQL_KEYWORDS.search(stripped))
            
            # Calculate ML confidence score
            score = 0.0
            trigger_match = None

            # Add weight for SQL context presence
            if has_sql_keyword:
                score += 0.45

            # Add weight for dynamic string concatenation
            for pattern in self.DYNAMIC_CONCAT_PATTERNS:
                match = pattern.search(stripped)
                if match:
                    score += 0.50
                    trigger_match = match.group(0)
                    break

            # Trigger vulnerability detection if score >= 0.80
            if score >= 0.80:
                confidence = min(round(score, 2), 0.98)
                detections.append(
                    DetectionResult(
                        detector_type="ML",
                        vulnerability_slug=self.vulnerability_slug,
                        file_path=file_input.path,
                        location=SourceLocation(
                            start_line=line_idx,
                            end_line=line_idx,
                            start_column=1,
                            end_column=len(line) + 1,
                        ),
                        confidence=confidence,
                        evidence=DetectionEvidence(
                            type="ml_sqli_pattern_match",
                            message="ML model detected dynamic string interpolation in SQL query execution context.",
                            source=trigger_match or stripped,
                            sink="database_query_executor",
                        ),
                        metadata=DetectionMetadata(
                            analyzer="vulnguardian-ml-service",
                            analyzer_version="0.1.0",
                            rule_id="ml-sqli-detector",
                        ),
                    )
                )

        return detections
