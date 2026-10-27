INSERT INTO "Vulnerability" (
    "id",
    "name",
    "slug",
    "description",
    "createdAt",
    "updatedAt"
)
VALUES
(
    '7f15c6e0-5b4b-4e85-9b6c-5b37a1f9d201',
    'Hardcoded Credentials',
    'hardcoded-credentials',
    'Detects passwords, API keys, tokens, or other credentials embedded directly in source code.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    '7f15c6e0-5b4b-4e85-9b6c-5b37a1f9d202',
    'SQL Injection',
    'sql-injection',
    'Detects unsafe SQL query construction that may allow untrusted input to alter a database query.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;