
from src.security_engine.detectors.hardcoded_credentials import (
    detect_hardcoded_credentials,
)


def test_detects_hardcoded_password():
    source = 'database_password = "example-real-looking-secret-123"'

    results = detect_hardcoded_credentials(source, "app.py")

    assert len(results) == 1
    assert results[0].vulnerability_slug == "hardcoded-credentials"
    assert results[0].file_path == "app.py"
    assert results[0].location.start_line == 1
    assert results[0].metadata is not None
    assert results[0].metadata.rule_id == "PY-HARDCODED-CREDENTIAL-001"


def test_ignores_placeholder_password():
    source = 'database_password = "your_password"'

    results = detect_hardcoded_credentials(source, "app.py")

    assert results == []


def test_ignores_unrelated_string():
    source = 'application_name = "vulnguardian"'

    results = detect_hardcoded_credentials(source, "app.py")

    assert results == []


def test_detects_annotated_assignment():
    source = 'api_key: str = "example-key-value-123"'

    results = detect_hardcoded_credentials(source, "app.py")

    assert len(results) == 1
    assert results[0].location.start_line == 1


def test_invalid_python_does_not_crash():
    source = 'database_password = "unfinished'

    results = detect_hardcoded_credentials(source, "app.py")

    assert results == []


def test_detects_multiple_credentials_with_correct_lines():
    source = (
        'database_password = "secret-value-123"\n'
        'application_name = "vulnguardian"\n'
        'api_key = "api-value-456"\n'
    )

    results = detect_hardcoded_credentials(source, "settings.py")

    assert len(results) == 2
    assert [item.location.start_line for item in results] == [1, 3]
    assert all(item.file_path == "settings.py" for item in results)


def test_ignores_environment_variable_placeholder():
    source = 'api_key = "${API_KEY}"'

    results = detect_hardcoded_credentials(source, "settings.py")

    assert results == []


def test_detects_camel_case_credential_name():
    source = 'clientSecret = "client-secret-value-123"'

    results = detect_hardcoded_credentials(source, "settings.py")

    assert len(results) == 1
    assert results[0].evidence is not None
    assert results[0].evidence.source == "clientSecret"
