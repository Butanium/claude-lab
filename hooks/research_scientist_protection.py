#!/usr/bin/env python3
"""
Hook: Block scientist subagents from editing protected files.

Scoped to research-scientist agents via their agent definition.
"""
import json
import sys
import os
import re

PROTECTED_FILES = [
    "RESEARCH_STATE.md",
    "research_diary.md",
]

PROTECTED_PATTERNS = [
    r"\.claude/skills/",
    r"\.claude/hooks/",
    r"\.claude/agents/",
]


def is_protected_file(file_path: str) -> bool:
    """Check if file is protected from scientist edits."""
    basename = os.path.basename(file_path)

    if basename in PROTECTED_FILES:
        return True

    for pattern in PROTECTED_PATTERNS:
        if re.search(pattern, file_path):
            return True

    return False


def main():
    input_data = json.load(sys.stdin)
    tool_input = input_data.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    if is_protected_file(file_path):
        output = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": f"Scientists cannot edit {os.path.basename(file_path)}. Write your findings to your experiment report instead."
            }
        }
        print(json.dumps(output))

    sys.exit(0)


if __name__ == "__main__":
    main()
