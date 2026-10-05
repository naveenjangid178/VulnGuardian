from fastapi import FastAPI
from .models.analysis import AnalysisRequest, AnalysisResponse
from .services.ml_engine import MLEngine

# Initialize FastAPI application
app = FastAPI(
    title="VulnGuardian ML Service",
    description="Machine Learning analysis service for source-code vulnerability detection",
    version="0.1.0",
)

# Global MLEngine instance
ml_engine = MLEngine()


# Health check endpoint for Docker / backend heartbeat checks
@app.get("/health")
async def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "ml-service",
        "version": "0.1.0",
    }


# Primary API endpoint called by NestJS backend to analyze source code
@app.post("/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalysisRequest) -> AnalysisResponse:
    """
    Analyzes source files using ML vulnerability detection models
    and returns normalized detection results.
    """
    return ml_engine.analyze_request(request)