
from fastapi import FastAPI

from security_engine.models.analysis import AnalysisRequest, AnalysisResponse
from security_engine.detectors.hardcoded_credentials import (
    detect_hardcoded_credentials,
)
from security_engine.detectors.command_injection import (
    detect_command_injection,
)
from security_engine.detectors.sql_injection import detect_sql_injection
from security_engine.detectors.path_traversal import detect_path_traversal


app = FastAPI(
    title="VulnGuardian Security Engine",
    version="0.1.0",
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "security-engine",
    }


@app.post("/analyze", response_model=AnalysisResponse)
def analyze(request: AnalysisRequest) -> AnalysisResponse:
    detections = []

    for source_file in request.files:
        language = source_file.language.strip().lower()
        path = source_file.path

        # The currently implemented detectors support Python only.
        if language not in {"python", "py"}:
            continue

        # Detector 1: Hardcoded credentials.
        detections.extend(
            detect_hardcoded_credentials(
                source=source_file.content,
                file_path=path,
            )
        )

        # Detector 2: SQL injection.
        detections.extend(
            detect_sql_injection(
                source=source_file.content,
                file_path=path,
            )
        )

        # Detector 3: Path traversal.
        detections.extend(
            detect_path_traversal(
                source=source_file.content,
                file_path=path,
            )
        )

        detections.extend(
            detect_command_injection(
                source=source_file.content,
                file_path=source_file.path,
            )
        )

    return AnalysisResponse(
        scan_id=request.scan_id,
        detections=detections,
    )
