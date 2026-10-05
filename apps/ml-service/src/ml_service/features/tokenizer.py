import re
from typing import NamedTuple


# Holds individual code token details including line & column position
class TokenInfo(NamedTuple):
    value: str
    token_type: str
    line_number: int
    column_number: int


class CodeTokenizer:
    """
    Lexical tokenizer for source code (JavaScript, TypeScript, Python)
    designed to extract tokens and feature representations for ML analysis.
    """

    # Regex patterns to classify code tokens (keywords, identifiers, literals, operators)
    TOKEN_REGEX = re.compile(
        r"(?P<KEYWORD>\b(select|insert|update|delete|drop|union|exec|eval|system|spawn|child_process|fs|readFile|jwt|password|secret|token|auth|authenticate|bearer)\b)|"
        r"(?P<IDENTIFIER>\b[a-zA-Z_][a-zA-Z0-9_]*\b)|"
        r"(?P<STRING_LITERAL>\"[^\"]*\"|'[^']*'|`[^`]*`)|"
        r"(?P<NUMBER>\b\d+\b)|"
        r"(?P<OPERATOR>\+|\-|\*|\/|\=|\=\=\=|\=\=|\!\=\=|\!\=|\<|\>|\.|\,|;|:|\(|\)|\{|\}|\[|\])",
        re.IGNORECASE,
    )

    def tokenize_content(self, content: str) -> list[TokenInfo]:
        """
        Tokenizes whole source file content line by line into TokenInfo objects.
        """
        tokens: list[TokenInfo] = []
        lines = content.splitlines()

        # Iterate over each line to track 1-indexed line numbers
        for line_idx, line in enumerate(lines, start=1):
            for match in self.TOKEN_REGEX.finditer(line):
                kind = match.lastgroup or "UNKNOWN"
                val = match.group(kind)
                start_col = match.start() + 1
                tokens.append(
                    TokenInfo(
                        value=val,
                        token_type=kind,
                        line_number=line_idx,
                        column_number=start_col,
                    )
                )

        return tokens

    def get_lines_with_tokens(self, content: str) -> list[tuple[int, str, list[TokenInfo]]]:
        """
        Returns list of tuples: (line_number, line_text, list_of_tokens_in_line).
        Used by ML detectors for line-by-line classification.
        """
        result = []
        lines = content.splitlines()

        for line_idx, line in enumerate(lines, start=1):
            line_tokens = [
                TokenInfo(
                    value=match.group(match.lastgroup or "UNKNOWN"),
                    token_type=match.lastgroup or "UNKNOWN",
                    line_number=line_idx,
                    column_number=match.start() + 1,
                )
                for match in self.TOKEN_REGEX.finditer(line)
            ]
            result.append((line_idx, line, line_tokens))

        return result
