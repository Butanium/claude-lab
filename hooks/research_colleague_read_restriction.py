#!/usr/bin/env python3
"""
Hook: Restrict colleague subagents to only read files specified in ALLOWED_FILES.

Parses the transcript to find the ALLOWED_FILES directive in the initial prompt.
Scoped to research-colleague agents via their agent definition.
"""
import json
import sys
import os
import re


def get_allowed_files(transcript_path: str) -> list[str] | None:
    """Parse transcript to find ALLOWED_FILES directive."""
    if not transcript_path or not os.path.exists(transcript_path):
        return None

    try:
        with open(transcript_path, 'r') as f:
            for i, line in enumerate(f):
                if i > 10:
                    break
                try:
                    entry = json.loads(line)
                    content = str(entry)

                    match = re.search(r'ALLOWED_FILES:\s*\[([^\]]+)\]', content)
                    if match:
                        files_str = match.group(1)
                        files = re.findall(r'["\']([^"\']+)["\']', files_str)
                        return files

                except json.JSONDecodeError:
                    continue
    except Exception:
        pass

    return None


def file_matches_allowed(file_path: str, allowed_files: list[str], cwd: str) -> bool:
    """Check if requested file matches any allowed file pattern."""
    if not os.path.isabs(file_path):
        file_path = os.path.join(cwd, file_path)
    file_path = os.path.normpath(file_path)

    for allowed in allowed_files:
        if not os.path.isabs(allowed):
            allowed_full = os.path.join(cwd, allowed)
        else:
            allowed_full = allowed
        allowed_full = os.path.normpath(allowed_full)

        # Exact match
        if file_path == allowed_full:
            return True

        # Basename match
        if os.path.basename(file_path) == allowed:
            return True

        # Directory match
        if allowed.endswith('/') and file_path.startswith(allowed_full):
            return True

    return False


def main():
    input_data = json.load(sys.stdin)
    tool_input = input_data.get("tool_input", {})
    transcript_path = input_data.get("transcript_path", "")
    cwd = input_data.get("cwd", os.getcwd())

    allowed_files = get_allowed_files(transcript_path)
    if allowed_files is None:
        # No ALLOWED_FILES directive found - allow all (shouldn't happen if prompt is correct)
        sys.exit(0)

    file_path = tool_input.get("file_path", "")
    if not file_matches_allowed(file_path, allowed_files, cwd):
        output = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": f"You can only read: {allowed_files}. This file is outside your allowed scope."
            }
        }
        print(json.dumps(output))

    sys.exit(0)


if __name__ == "__main__":
    main()
