q
"""
VulnGuardian Security Engine — Secure Test Sample

Demonstrates safer handling of credentials, SQL queries, HTML output,
OS commands, file paths, and authentication.

Requirements:
    pip install flask

For local testing only. Configure secrets through environment variables.
"""

import hmac
import os
import re
import secrets
import sqlite3
import subprocess
from functools import wraps
from pathlib import Path

from flask import Flask, abort, jsonify, request
from markupsafe import escape

app = Flask(__name__)

# Keep debug mode disabled. Set a strong secret in the environment.
app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY") or secrets.token_hex(32)

# Never hardcode real credentials in source code.
DATABASE_PASSWORD = os.environ.get("DATABASE_PASSWORD")
API_SECRET = os.environ.get("API_SECRET")

# Resolve the allowed directory once. Create it if necessary.
BASE_DIR = Path("/tmp/vulnguardian").resolve()
BASE_DIR.mkdir(parents=True, exist_ok=True)

# This demonstration uses an in-memory database.
# In a real application, use a managed database and secure credential storage.
def get_connection():
    connection = sqlite3.connect(":memory:")
    connection.execute(
        "CREATE TABLE IF NOT EXISTS users (username TEXT NOT NULL)"
    )
    return connection


def get_user(username: str):
    """Query using a parameterized statement, not string concatenation."""
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT username FROM users WHERE username = ?",
            (username,),
        )
        return cursor.fetchall()
    finally:
        connection.close()


def require_admin(view):
    """Protect a route using a configured bearer token.

    Set ADMIN_TOKEN to a strong random value before starting the app.
    For production, use a proper identity provider and role-based access.
    """
    @wraps(view)
    def wrapped(*args, **kwargs):
        expected_token = os.environ.get("ADMIN_TOKEN")
        authorization = request.headers.get("Authorization", "")
        scheme, _, supplied_token = authorization.partition(" ")

        if (
            not expected_token
            or scheme.lower() != "bearer"
            or not supplied_token
            or not hmac.compare_digest(supplied_token, expected_token)
        ):
            abort(401)

        return view(*args, **kwargs)

    return wrapped


@app.route("/greet")
def greet():
    """Escape untrusted input before including it in HTML."""
    name = request.args.get("name", "Guest")
    safe_name = escape(name)
    return f"<h1>Hello {safe_name}</h1>", 200, {
        "Content-Type": "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; style-src 'self'",
    }


@app.route("/ping")
def ping():
    """Validate the host and invoke ping without a shell."""
    host = request.args.get("host", "127.0.0.1")

    # Accept IPv4 or IPv6 addresses only; reject hostnames and shell syntax.
    import ipaddress

    try:
        validated_host = str(ipaddress.ip_address(host))
    except ValueError:
        abort(400, description="A valid IP address is required.")

    try:
        result = subprocess.run(
            ["ping", "-c", "1", validated_host],
            shell=False,
            capture_output=True,
            text=True,
            timeout=3,
            check=False,
        )
    except subprocess.TimeoutExpired:
        abort(504, description="Ping timed out.")
    except OSError:
        abort(503, description="Ping is unavailable on this server.")

    # Avoid exposing command output and internal system details to clients.
    return jsonify({
        "success": result.returncode == 0,
        "host": validated_host,
    })


@app.route("/read")
def read_file():
    """Read only files whose resolved paths remain inside BASE_DIR."""
    filename = request.args.get("file", "example.txt")

    # Restrict input to a single filename rather than accepting arbitrary paths.
    if (
        not filename
        or filename in {".", ".."}
        or "/" in filename
        or "\\" in filename
        or "\x00" in filename
    ):
        abort(400, description="A filename is required.")

    try:
        candidate = (BASE_DIR / filename).resolve(strict=True)
        candidate.relative_to(BASE_DIR)
    except (OSError, ValueError):
        abort(404, description="File not found.")

    if not candidate.is_file():
        abort(404, description="File not found.")

    try:
        content = candidate.read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        abort(500, description="Unable to read file.")

    return jsonify({"content": content})


@app.route("/admin")
@require_admin
def admin():
    """Require a valid bearer token before exposing admin functionality."""
    return jsonify({"message": "Admin area", "admin": True})


@app.errorhandler(400)
def bad_request(error):
    return jsonify({"error": "Bad request"}), 400


@app.errorhandler(401)
def unauthorized(error):
    return jsonify({"error": "Authentication required"}), 401


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404


if __name__ == "__main__":
    # Debug mode is intentionally disabled.
    app.run(host="127.0.0.1", port=5000, debug=False)
