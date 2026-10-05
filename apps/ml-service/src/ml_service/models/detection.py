from typing import Any, Literal
from pydantic import BaseModel, Field

# Supported detector types matching VulnGuardian Prisma database enum
DetectorType = Literal[
    "STATIC",
    "ML",
    "SAST_RULE",
    "AST",
]


# Defines line and column numbers of a vulnerability in source code
class SourceLocation(BaseModel):
    start_line: int = Field(ge=1, description="1-indexed starting line number")
    start_column: int | None = Field(default=None, ge=1, description="1-indexed starting column number")
    end_line: int = Field(ge=1, description="1-indexed ending line number")
    end_column: int | None = Field(default=None, ge=1, description="1-indexed ending column number")


# Contextual details about why the ML model triggered a detection
class DetectionEvidence(BaseModel):
    type: str = Field(description="Type of evidence e.g. ml_pattern_match, tensor_threshold")
    message: str | None = Field(default=None, description="Human-readable evidence summary")
    source: str | None = Field(default=None, description="Taint source snippet or trigger token")
    sink: str | None = Field(default=None, description="Vulnerable function call or sink")
    flow: list[dict[str, Any]] | None = Field(default=None, description="Traced execution data flow")


# Metadata identifying the ML service and rule ID
class DetectionMetadata(BaseModel):
    analyzer: str = Field(default="vulnguardian-ml-service")
    analyzer_version: str = Field(default="0.1.0")
    rule_id: str | None = Field(default=None, description="Specific ML detector or model ID")


# Final detection result object returned to NestJS API
class DetectionResult(BaseModel):
    detector_type: DetectorType = Field(default="ML")  # Always 'ML' for this service
    vulnerability_slug: str = Field(description="Vulnerability category slug e.g. sql-injection, xss")
    file_path: str = Field(description="Relative path of the analyzed source file")
    location: SourceLocation = Field(description="Line and column location of vulnerability")
    confidence: float = Field(ge=0.0, le=1.0, description="ML Model confidence score between 0.0 and 1.0")
    evidence: DetectionEvidence | None = Field(default=None)
    metadata: DetectionMetadata | None = Field(default=None)
