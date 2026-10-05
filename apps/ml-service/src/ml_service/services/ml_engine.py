import logging
from ..detectors import (
    BaseDetector,
    CommandInjectionDetector,
    HardcodedCredentialsDetector,
    ImproperAuthDetector,
    PathTraversalDetector,
    SQLInjectionDetector,
    XSSDetector,
)
from ..models.analysis import AnalysisRequest, AnalysisResponse
from ..models.detection import DetectionResult

# Global logger for ML service tracing
logger = logging.getLogger("vulnguardian.ml_engine")


class MLEngine:
    """
    ML Analysis Engine Coordinator.
    Initializes ML detectors and orchestrates security analysis scans
    over incoming code files.
    """

    def __init__(self) -> None:
        # Instantiate all 6 vulnerability detectors on service startup
        self.detectors: list[BaseDetector] = [
            SQLInjectionDetector(),
            XSSDetector(),
            CommandInjectionDetector(),
            PathTraversalDetector(),
            HardcodedCredentialsDetector(),
            ImproperAuthDetector(),
        ]
        logger.info(f"Initialized MLEngine with {len(self.detectors)} ML detectors.")

    def analyze_request(self, request: AnalysisRequest) -> AnalysisResponse:
        """
        Processes all files in AnalysisRequest across all 6 ML detectors,
        aggregating DetectionResult list.
        """
        all_detections: list[DetectionResult] = []

        # Iterate through each submitted source file
        for source_file in request.files:
            # Run file against each vulnerability detector
            for detector in self.detectors:
                try:
                    file_detections = detector.analyze_file(source_file)
                    all_detections.extend(file_detections)
                except Exception as exc:
                    logger.error(
                        f"Error in {detector.vulnerability_slug} detector on file {source_file.path}: {exc}",
                        exc_info=True,
                    )

        # Return aggregated response matching VulnGuardian API contract
        return AnalysisResponse(
            scan_id=request.scan_id,
            detections=all_detections,
            model_version="0.1.0",
            processed_files_count=len(request.files),
        )
