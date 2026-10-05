from fastapi.testclient import TestClient
from ml_service.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_analyze_clean_code():
    payload = {
        "scan_id": "test_clean_1",
        "files": [
            {
                "path": "src/math_utils.py",
                "language": "python",
                "content": "def add(a, b):\n    return a + b\n"
            }
        ]
    }
    response = client.post("/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["scan_id"] == "test_clean_1"
    assert data["processed_files_count"] == 1
    assert len(data["detections"]) == 0


def test_analyze_vulnerable_sqli_and_xss():
    payload = {
        "scan_id": "test_vuln_1",
        "files": [
            {
                "path": "src/vulnerable.js",
                "language": "javascript",
                "content": (
                    "const query = 'SELECT * FROM users WHERE id = ' + req.params.id;\n"
                    "document.getElementById('output').innerHTML = req.params.name;\n"
                )
            }
        ]
    }
    response = client.post("/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["scan_id"] == "test_vuln_1"
    assert len(data["detections"]) >= 2
    
    slugs = [d["vulnerability_slug"] for d in data["detections"]]
    assert "sql-injection" in slugs
    assert "xss" in slugs
