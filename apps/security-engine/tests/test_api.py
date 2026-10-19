from fastapi.testclient import TestClient
from src.security_engine.main import app

from src.security_engine.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "security-engine",
    }


def test_analyze_returns_empty_detections():
    response = client.post(
        "/analyze",
        json={
            "scan_id": "test-scan-001",
            "files": [
                {
                    "path": "example.py",
                    "language": "python",
                    "content": "print('hello')",
                }
            ],
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "scan_id": "test-scan-001",
        "detections": [],
    }


def test_analyze_detects_hardcoded_credentials():
    response = client.post(
        "/analyze",
        json={
            "scan_id": "scan-credential-test",
            "files": [
                {
                    "path": "app.py",
                    "language": "python",
                    "content": (
                        'database_password = '
                        '"example-real-looking-secret-123"'
                    ),
                }
            ],
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["scan_id"] == "scan-credential-test"
    assert len(body["detections"]) == 1
    assert (
        body["detections"][0]["vulnerability_slug"]
        == "hardcoded-credentials"
    )
    assert body["detections"][0]["location"]["start_line"] == 1



def test_analyze_detects_sql_injection():
    client = TestClient(app)

    response = client.post(
        "/analyze",
        json={
            "scan_id": "test-sql-injection",
            "files": [
                {
                    "path": "app.py",
                    "language": "python",
                    "content": (
                        'query = "SELECT * FROM users WHERE id = " + user_id\n'
                        "cursor.execute(query)\n"
                    ),
                }
            ],
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["scan_id"] == "test-sql-injection"
    assert any(
        finding["vulnerability_slug"] == "sql-injection"
        for finding in data["detections"]
    )


def test_analyze_detects_path_traversal():
    client = TestClient(app)

    response = client.post(
        "/analyze",
        json={
            "scan_id": "test-path-traversal",
            "files": [
                {
                    "path": "app.py",
                    "language": "python",
                    "content": (
                        'filename = input("Filename: ")\n'
                        'with open(filename, "r") as file:\n'
                        "    content = file.read()\n"
                    ),
                }
            ],
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["scan_id"] == "test-path-traversal"
    assert any(
        finding["vulnerability_slug"] == "path-traversal"
        for finding in data["detections"]
    )


def test_analyze_detects_command_injection() -> None:
    response = client.post(
        "/analyze",
        json={
            "scan_id": "test-command-injection",
            "files": [
                {
                    "path": "app.py",
                    "language": "python",
                    "content": (
                        "import os\n"
                        "user_input = input('Command: ')\n"
                        "os.system('echo ' + user_input)\n"
                    ),
                }
            ],
        },
    )

    assert response.status_code == 200

    data = response.json()
    assert any(
        finding["vulnerability_slug"] == "command-injection"
        for finding in data["detections"]
    )

def test_analyze_detects_xss():
    response = client.post(
        "/analyze",
        json={
            "scan_id": "test-xss-scan",
            "files": [
                {
                    "path": "app.py",
                    "language": "python",
                    "content": """
from markupsafe import Markup

name = get_user_input()
html = Markup(f"<p>{name}</p>")
""",
                }
            ],
        },
    )

    assert response.status_code == 200, (
        f"API returned {response.status_code}: {response.text}"
    )

    body = response.json()
    detections = body.get("detections", [])

    xss_findings = [
        finding
        for finding in detections
        if finding.get("vulnerability_slug") == "xss"
    ]

    assert len(xss_findings) >= 1
    assert xss_findings[0]["file_path"] == "app.py"
    assert xss_findings[0]["metadata"]["rule_id"] == "PY-XSS-001"