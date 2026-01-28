#!/usr/bin/env python3
"""
Hook: Restrict judge agents to only write to judgments/ directory.

Scoped to research-judge agents via their agent definition.
"""
import json
import sys
import os


def is_allowed_path(file_path: str) -> bool:
    """Check if file is in judgments/ directory."""
    # Normalize path
    normalized = os.path.normpath(file_path)

    # Allow judgments/ at start (relative) or anywhere (absolute)
    if normalized.startswith("judgments/") or normalized == "judgments":
        return True
    if "/judgments/" in normalized or normalized.endswith("/judgments"):
        return True

    return False


def main():
    input_data = json.load(sys.stdin)
    tool_input = input_data.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    if not is_allowed_path(file_path):
        output = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": f"Judges can only write to judgments/. Attempted: {file_path}"
            }
        }
        print(json.dumps(output))

    sys.exit(0)


if __name__ == "__main__":
    main()
