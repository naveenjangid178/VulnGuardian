from pydantic import BaseModel, Field
from .detection import DetectionResult


# Input source file representation sent by NestJS API
class SourceFileInput(BaseModel):
    path: str = Field(min_length=1, description="Relative path of the file e.g. src/auth.py")
    language: str = Field(min_length=1, description="Programming language e.g. python, javascript, typescript")
    content: str = Field(description="Full text content of the source file")


# HTTP POST /analyze request payload container
class AnalysisRequest(BaseModel):
    scan_id: str = Field(min_length=1, description="Unique scan session ID")
    files: list[SourceFileInput] = Field(description="List of source files to analyze")


# HTTP POST /analyze response payload returned by ML service
class AnalysisResponse(BaseModel):
    scan_id: str = Field(description="Scan ID matching the request")
    detections: list[DetectionResult] = Field(default_factory=list, description="List of ML vulnerability detection results")
    model_version: str = Field(default="0.1.0", description="Version of the ML model engine")
    processed_files_count: int = Field(default=0, description="Total number of files analyzed")
