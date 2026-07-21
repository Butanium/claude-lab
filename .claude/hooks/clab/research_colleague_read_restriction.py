#!/usr/bin/env python3
"""
Hook: Restrict colleague subagents to only read files specified in ALLOWED_FILES.

Searches the main transcript for the most recent ALLOWED_FILES directive.
Scoped to research-colleague agents via their agent definition.

Known limitation: if multiple colleagues run concurrently with different
ALLOWED_FILES, the last-written directive wins. PreToolUse hooks have no
agent_id, and the tool_use entry isn't written to subagent transcripts until
AFTER the hook fires, so per-agent correlation isn't possible.
"""
import json
import sys
import os
import re
import datetime

DEBUG_PATH = f"/run/user/{os.getuid()}/hook_debug_colleague.json"


def debug_log(data: dict) -> None:
    """Append a timestamped entry to the debug log."""
    entry = {"timestamp": datetime.datetime.now().isoformat(), **data}
    entries = []
    if os.path.exists(DEBUG_PATH):
        try:
            with open(DEBUG_PATH, 'r') as f:
                entries = json.load(f)
        except (json.JSONDecodeError, Exception):
            entries = []
    entries.append(entry)
    with open(DEBUG_PATH, 'w') as f:
        json.dump(entries, f, indent=2, default=str)


def get_allowed_files(transcript_path: str) -> list[str] | None:
    """Parse main transcript for the most recent ALLOWED_FILES directive."""
    if not transcript_path or not os.path.exists(transcript_path):
        return None

    last_match = None
    with open(transcript_path, 'r') as f:
        for line in f:
            match = re.search(r'ALLOWED_FILES:\s*\[([^\]]+)\]', line)
            if match:
                files_str = match.group(1)
                files = [f.strip('\\') for f in re.findall(r'["\']([^"\']+)["\']', files_str)]
                if files:
                    last_match = files

    return last_match


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

        if file_path == allowed_full:
            return True
        if os.path.basename(file_path) == allowed:
            return True
        if allowed.endswith('/') and file_path.startswith(allowed_full):
            return True

    return False


def main():
    input_data = json.load(sys.stdin)

    tool_input = input_data.get("tool_input", {})
    tool_use_id = input_data.get("tool_use_id", "")
    transcript_path = input_data.get("transcript_path", "")
    cwd = input_data.get("cwd", os.getcwd())
    file_path = tool_input.get("file_path", "")

    debug = {
        "tool_use_id": tool_use_id,
        "file_path": file_path,
        "transcript_path": transcript_path,
    }

    allowed_files = get_allowed_files(transcript_path)
    debug["allowed_files"] = allowed_files

    if allowed_files is None:
        debug["decision"] = "allow (no ALLOWED_FILES found in transcript)"
        debug_log(debug)
        sys.exit(0)

    if file_matches_allowed(file_path, allowed_files, cwd):
        debug["decision"] = f"allow (matches {allowed_files})"
        debug_log(debug)
    else:
        debug["decision"] = f"DENY (not in {allowed_files})"
        debug_log(debug)
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
