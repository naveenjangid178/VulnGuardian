
from src.security_engine.detectors.path_traversal import detect_path_traversal


def test_detects_user_input_used_in_open():
    source = '''
filename = input("Enter filename: ")
with open(filename, "r") as file:
    content = file.read()
'''

    results = detect_path_traversal(source, "app.py")

    assert len(results) == 1
    assert results[0].vulnerability_slug == "path-traversal"
    assert results[0].metadata.rule_id == "PY-PATH-TRAVERSAL-001"


def test_detects_request_argument_used_in_open():
    source = '''
filename = request.args.get("file")
content = open(filename).read()
'''

    results = detect_path_traversal(source, "app.py")

    assert len(results) == 1


def test_detects_dynamic_path_joined_with_directory():
    source = '''
filename = input("Filename: ")
path = "/var/www/files/" + filename
with open(path, "r") as file:
    content = file.read()
'''

    results = detect_path_traversal(source, "app.py")

    assert len(results) == 1


def test_detects_pathlib_file_access():
    source = '''
filename = input("Filename: ")
content = Path(filename).read_text()
'''

    results = detect_path_traversal(source, "app.py")

    assert len(results) == 1


def test_ignores_static_file_path():
    source = '''
with open("config.json", "r") as file:
    content = file.read()
'''

    results = detect_path_traversal(source, "app.py")

    assert results == []


def test_ignores_unrelated_input():
    source = '''
name = input("Your name: ")
print("Hello", name)
'''

    results = detect_path_traversal(source, "app.py")

    assert results == []


def test_invalid_python_does_not_crash():
    source = '''
def broken(:
    open(filename)
'''

    results = detect_path_traversal(source, "app.py")

    assert results == []


def test_finding_contains_location_and_evidence():
    source = '''
filename = input("Filename: ")
open(filename, "r")
'''

    results = detect_path_traversal(source, "src/files.py")

    assert len(results) == 1
    assert results[0].file_path == "src/files.py"
    assert results[0].location.start_line == 3
    assert results[0].evidence.type == "untrusted-file-path"
    assert results[0].evidence.source
