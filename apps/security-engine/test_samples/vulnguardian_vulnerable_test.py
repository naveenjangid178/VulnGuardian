import sqlite3
import subprocess
from pathlib import Path

# 1. SQL Injection (CWE-89)
def get_user(username):
    conn = sqlite3.connect(":memory:")
    query = "SELECT * FROM users WHERE name = '" + username + "'"
    return conn.execute(query).fetchall()


# 2. Command Injection (CWE-78)
def ping_host(host):
    return subprocess.run(
        "ping " + host,
        shell=True,
        capture_output=True,
        text=True,
    )


# 3. Path Traversal (CWE-22)
def read_file(filename):
    base_dir = Path("/tmp/test-files")
    target = base_dir / filename
    return target.read_text()


# 4. Hardcoded Credential (CWE-798)
DATABASE_PASSWORD = "TestPassword123!Hardcoded"


# 5. Improper Authentication (CWE-287)
def get_account(account_id, authenticated):
    if authenticated:
        return {"account_id": account_id, "balance": 5000}
    return {"error": "Unauthorized"}


# 6. Cross-Site Scripting (XSS, CWE-79)
def render_profile(name):
    return "<h1>Welcome " + name + "</h1>"


if __name__ == "__main__":
    print("VulnGuardian security scanner test file")
    print("Functions are defined but not executed.")