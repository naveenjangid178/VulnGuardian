# VulnGuardian ML Service

The ML Service is a Python microservice built with **FastAPI** responsible for machine-learning-based vulnerability detection across source code files.

---

## 🚀 Architectural Overview

In VulnGuardian, Machine Learning (ML) analysis complements static SAST rule analysis.

```text
Source Code Files
       │
       ▼
   POST /analyze (FastAPI)
       │
       ▼
  ML Engine Coordinator
       │
       ├── SQL Injection ML Detector (`sql-injection`)
       ├── XSS ML Detector (`xss`)
       ├── Command Injection ML Detector (`command-injection`)
       ├── Path Traversal ML Detector (`path-traversal`)
       ├── Hardcoded Credentials ML Detector (`hardcoded-credentials`)
       └── Improper Auth ML Detector (`improper-authentication`)
       │
       ▼
Normalized DetectionResults (DetectorType="ML")
```

---

## 🛠️ API Contracts

### `GET /health`
Returns health check status of the ML service.

### `POST /analyze`
Analyzes a set of source code files and returns ML vulnerability predictions.

#### Request Body
```json
{
  "scan_id": "scan_123",
  "files": [
    {
      "path": "app.js",
      "language": "javascript",
      "content": "const query = 'SELECT * FROM users WHERE id = ' + req.query.id;"
    }
  ]
}
```

#### Response Body
```json
{
  "scan_id": "scan_123",
  "detections": [
    {
      "detector_type": "ML",
      "vulnerability_slug": "sql-injection",
      "file_path": "app.js",
      "location": {
        "start_line": 1,
        "end_line": 1,
        "start_column": 1,
        "end_column": 64
      },
      "confidence": 0.95,
      "evidence": {
        "type": "ml_sqli_pattern_match",
        "message": "ML model detected dynamic string interpolation in SQL query execution context.",
        "source": "req.query.id",
        "sink": "database_query_executor"
      },
      "metadata": {
        "analyzer": "vulnguardian-ml-service",
        "analyzer_version": "0.1.0",
        "rule_id": "ml-sqli-detector"
      }
    }
  ],
  "model_version": "0.1.0",
  "processed_files_count": 1
}
```

---

## 💻 Running & Development

### 1. Install Dependencies
```bash
cd apps/ml-service
uv sync
```

### 2. Run Local Development Server
```bash
uv run uvicorn ml_service.main:app --reload --host 0.0.0.0 --port 8000
```
Visit Interactive Swagger UI: **http://localhost:8000/docs**

### 3. Run Unit Tests
```bash
uv run pytest
```
