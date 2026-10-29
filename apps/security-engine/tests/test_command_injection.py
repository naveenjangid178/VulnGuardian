
from src.security_engine.detectors.command_injection import (
    detect_command_injection,
)


def test_detects_os_system_with_input() -> None:
    source = """
import os
user_input = input("Command: ")
os.system("echo " + user_input)
"""

    results = detect_command_injection(source, "app.py")

    assert len(results) == 1
    assert results[0].vulnerability_slug == "command-injection"
    assert results[0].file_path == "app.py"
    assert results[0].metadata.rule_id == "PY-COMMAND-INJECTION-001"


def test_detects_subprocess_run_with_shell_true() -> None:
    source = """
import subprocess
user_input = input("Command: ")
subprocess.run("echo " + user_input, shell=True)
"""

    results = detect_command_injection(source, "app.py")

    assert len(results) == 1


def test_detects_f_string_with_untrusted_input() -> None:
    source = """
import os
user_input = input("Name: ")
os.system(f"echo {user_input}")
"""

    results = detect_command_injection(source, "app.py")

    assert len(results) == 1


def test_detects_request_query_input() -> None:
    source = """
import os
command = request.args.get("command")
os.system("echo " + command)
"""

    results = detect_command_injection(source, "app.py")

    assert len(results) == 1


def test_detects_os_popen_with_input() -> None:
    source = """
import os
value = input("Value: ")
os.popen("echo " + value)
"""

    results = detect_command_injection(source, "app.py")

    assert len(results) == 1


def test_ignores_subprocess_list_without_shell() -> None:
    source = """
import subprocess
user_input = input("Value: ")
subprocess.run(["echo", user_input])
"""

    results = detect_command_injection(source, "app.py")

    assert results == []


def test_ignores_subprocess_shell_false() -> None:
    source = """
import subprocess
user_input = input("Value: ")
subprocess.run("echo " + user_input, shell=False)
"""

    results = detect_command_injection(source, "app.py")

    assert results == []


def test_ignores_static_os_system_command() -> None:
    source = """
import os
os.system("echo hello")
"""

    results = detect_command_injection(source, "app.py")

    assert results == []


def test_ignores_input_not_used_in_command() -> None:
    source = """
import os
user_input = input("Name: ")
os.system("echo hello")
"""

    results = detect_command_injection(source, "app.py")

    assert results == []


def test_invalid_python_returns_no_findings() -> None:
    results = detect_command_injection(
        "def broken(:",
        "broken.py",
    )

    assert results == []
