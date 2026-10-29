""" 
VulnGuardian Security Engine test sample.

WARNING: This file intentionally contains insecure code for local testing.
Do not use these patterns in a real application.
"""

import os
import sqlite3
from pathlib import Path

from flask import Flask, request

app = Flask(__name__)

# TEST 1: Hardcoded credentials
DATABASE_PASSWORD = "admin123_test_password"
API_SECRET = "test_secret_123456"


# TEST 2: SQL Injection
def get_user(username: str):
    connection = sqlite3.connect(":memory:")
    cursor = connection.cursor()

    # Vulnerable: user input is concatenated into SQL.
    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cursor.execute(query)

    return cursor.fetchall()


# TEST 3: Cross-Site Scripting (XSS)
@app.route("/greet")
def greet():
    # Vulnerable: untrusted input is inserted into HTML without escaping.
    name = request.args.get("name", "Guest")
    return "<h1>Hello " + name + "</h1>"


# TEST 4: Command Injection
@app.route("/ping")
def ping():
    host = request.args.get("host", "127.0.0.1")

    # Vulnerable: user input reaches a shell command.
    result = os.popen("ping -c 1 " + host).read()
    return result


# TEST 5: Path Traversal
@app.route("/read")
def read_file():
    filename = request.args.get("file", "example.txt")

    # Vulnerable: user-controlled path is not restricted to a safe directory.
    file_path = Path("/tmp/vulnguardian") / filename
    return file_path.read_text()


# TEST 6: Improper Authentication
@app.route("/admin")
def admin():
    # Vulnerable: sensitive route has no authentication check.
    return {"message": "Admin area", "admin": True}


if __name__ == "__main__":
    app.run(debug=True)
