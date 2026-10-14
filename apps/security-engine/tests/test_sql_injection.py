
import pytest

from security_engine.detectors.sql_injection import detect_sql_injection


def test_detects_string_concatenation_in_sql():
    source = '''
query = "SELECT * FROM users WHERE name = '" + username + "'"
cursor.execute(query)
'''

    results = detect_sql_injection(source, "app.py")

    assert len(results) == 1
    assert results[0].vulnerability_slug == "sql-injection"
    assert results[0].detector_type == "AST"
    assert results[0].metadata.rule_id == "PY-SQL-INJECTION-001"
    assert results[0].location.start_line == 2


def test_detects_f_string_in_sql():
    source = '''
cursor.execute(
    f"SELECT * FROM users WHERE id = {user_id}"
)
'''

    results = detect_sql_injection(source, "app.py")

    assert len(results) == 1
    assert results[0].vulnerability_slug == "sql-injection"


def test_detects_format_method_in_sql():
    source = '''
query = "SELECT * FROM users WHERE id = {}".format(user_id)
cursor.execute(query)
'''

    results = detect_sql_injection(source, "app.py")

    assert len(results) == 1
    assert results[0].metadata.rule_id == "PY-SQL-INJECTION-001"


def test_detects_percent_formatting_in_sql():
    source = '''
query = "SELECT * FROM users WHERE id = %s" % user_id
cursor.execute(query)
'''

    results = detect_sql_injection(source, "app.py")

    assert len(results) == 1


def test_ignores_parameterized_query():
    source = '''
cursor.execute(
    "SELECT * FROM users WHERE id = ?",
    (user_id,)
)
'''

    results = detect_sql_injection(source, "app.py")

    assert results == []


def test_ignores_static_sql_query():
    source = '''
cursor.execute("SELECT * FROM users")
'''

    results = detect_sql_injection(source, "app.py")

    assert results == []


def test_ignores_unrelated_string_concatenation():
    source = '''
message = "Hello, " + username
print(message)
'''

    results = detect_sql_injection(source, "app.py")

    assert results == []


def test_invalid_python_does_not_crash():
    source = '''
cursor.execute(f"SELECT * FROM users WHERE id = {")
'''

    results = detect_sql_injection(source, "app.py")

    assert results == []


def test_detects_direct_concatenation():
    source = '''
cursor.execute(
    "SELECT * FROM users WHERE name = '" + username + "'"
)
'''

    results = detect_sql_injection(source, "app.py")

    assert len(results) == 1
    assert results[0].location.start_line == 3


def test_detects_query_inside_function():
    source = '''
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    cursor.execute(query)
'''

    results = detect_sql_injection(source, "app.py")

    assert len(results) == 1
    assert results[0].location.start_line == 3


def test_detects_multiple_dynamic_queries():
    source = '''
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
cursor.execute(f"SELECT * FROM orders WHERE id = {order_id}")
'''

    results = detect_sql_injection(source, "app.py")

    assert len(results) == 2


def test_finding_contains_file_path_and_evidence():
    source = '''
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
'''

    results = detect_sql_injection(source, "src/database.py")

    assert len(results) == 1
    assert results[0].file_path == "src/database.py"
    assert results[0].evidence.type == "dynamic-sql-construction"
    assert results[0].evidence.message
    assert results[0].evidence.source


def test_detects_annotated_query_assignment():
    source = '''
query: str = f"SELECT * FROM users WHERE id = {user_id}"
cursor.execute(query)
'''

    results = detect_sql_injection(source, "app.py")

    assert len(results) == 1


def test_detects_named_expression_query():
    source = '''
if (query := f"SELECT * FROM users WHERE id = {user_id}"):
    cursor.execute(query)
'''

    results = detect_sql_injection(source, "app.py")

    assert len(results) == 1
