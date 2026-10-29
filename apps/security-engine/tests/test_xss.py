from src.security_engine.detectors.xss import detect_xss


def test_detects_dynamic_content_in_markup():
    source = """
from markupsafe import Markup

name = get_user_input()
html = Markup(f"<p>{name}</p>")
"""
    findings = detect_xss(source, "app.py")

    assert len(findings) == 1
    assert findings[0].vulnerability_slug == "xss"
    assert findings[0].metadata.rule_id == "PY-XSS-001"
    assert findings[0].file_path == "app.py"


def test_detects_dynamic_content_in_mark_safe():
    source = """
from django.utils.safestring import mark_safe

html = mark_safe("<p>" + user_input + "</p>")
"""
    findings = detect_xss(source)

    assert len(findings) == 1


def test_detects_dynamic_content_in_html_call():
    source = """
html = HTML("<p>{}</p>".format(user_input))
"""
    findings = detect_xss(source)

    assert len(findings) == 1


def test_ignores_static_html():
    source = """
from markupsafe import Markup

html = Markup("<p>Hello</p>")
"""
    assert detect_xss(source) == []


def test_ignores_safe_text_content_pattern():
    source = """
element.textContent = user_input
"""
    assert detect_xss(source) == []


def test_ignores_unrelated_dynamic_string():
    source = """
message = f"Hello {user_input}"
print(message)
"""
    assert detect_xss(source) == []


def test_invalid_python_returns_no_findings():
    assert detect_xss("def broken(:") == []


def test_finding_contains_source_location_and_evidence():
    source = 'html = Markup(f"<p>{name}</p>")'
    findings = detect_xss(source, "templates.py")

    assert findings[0].location.start_line == 1
    assert findings[0].location.start_column >= 1
    assert findings[0].evidence.source
