from src.security_engine.detectors.improper_authentication import (
    detect_improper_authentication,
)


def test_detects_skip_auth_call():
    findings = detect_improper_authentication(
        "def action():\n    skip_auth()\n",
        "app.py",
    )
    assert len(findings) == 1
    assert findings[0].vulnerability_slug == "improper-authentication"
    assert findings[0].metadata.rule_id == "PY-AUTH-001"


def test_detects_disable_auth_call():
    findings = detect_improper_authentication("disable_auth()")
    assert len(findings) == 1


def test_detects_bypass_auth_method():
    findings = detect_improper_authentication("security.bypass_auth()")
    assert len(findings) == 1


def test_detects_fastapi_route_without_visible_authentication():
    source = '''
from fastapi import FastAPI

app = FastAPI()

@app.get("/admin")
async def admin_dashboard():
    return {"secret": True}
'''
    findings = detect_improper_authentication(source, "app.py")
    route_findings = [
        finding
        for finding in findings
        if finding.evidence.type == "route-without-visible-authentication"
    ]

    assert len(route_findings) == 1
    assert route_findings[0].location.start_line == 7
    assert route_findings[0].confidence == 0.40


def test_does_not_flag_route_with_known_auth_dependency():
    source = '''
from fastapi import FastAPI, Depends

app = FastAPI()

def require_admin():
    pass

@app.get("/admin", dependencies=[Depends(require_admin)])
async def admin_dashboard():
    return {"secret": True}
'''
    findings = detect_improper_authentication(source, "app.py")
    route_findings = [
        finding
        for finding in findings
        if finding.evidence.type == "route-without-visible-authentication"
    ]

    assert route_findings == []


def test_does_not_flag_route_with_current_user_parameter():
    source = '''
from fastapi import FastAPI

app = FastAPI()

@app.get("/profile")
async def profile(current_user):
    return {"name": "user"}
'''
    findings = detect_improper_authentication(source, "app.py")
    route_findings = [
        finding
        for finding in findings
        if finding.evidence.type == "route-without-visible-authentication"
    ]

    assert route_findings == []


def test_normal_authentication_calls_are_not_bypass_findings():
    source = """
authenticate(username, password)
verify_password(password, password_hash)
"""
    findings = detect_improper_authentication(source)
    assert not any(
        finding.evidence.type == "potential-authentication-bypass"
        for finding in findings
    )


def test_unrelated_code_has_no_findings():
    source = """
def get_profile():
    return {"name": "Alice"}
"""
    assert detect_improper_authentication(source) == []


def test_invalid_python_returns_no_findings():
    assert detect_improper_authentication("def broken(:") == []


def test_finding_contains_location_and_evidence():
    findings = detect_improper_authentication("skip_auth()", "auth.py")

    assert len(findings) == 1
    assert findings[0].location.start_line == 1
    assert findings[0].location.start_column >= 1
    assert findings[0].evidence.source
