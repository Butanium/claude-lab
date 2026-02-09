#!/usr/bin/env python3
"""Inspect a subagent transcript to understand entry structure and timing.

Usage:
    python3 junk/inspect_subagent_transcript.py <agent_id> [session_id]

If session_id is omitted, uses the most recent session in the project dir.
Shows each JSONL entry with cumulative size, type, and tool_use_ids found.
"""
import glob
import json
import os
import re
import sys

PROJECT_DIR = os.path.expanduser(
    "~/.claude/projects/-mnt-nw-home-c-dumas-automation-claude-lab"
)


def find_session(session_id: str | None) -> str:
    if session_id:
        return os.path.join(PROJECT_DIR, f"{session_id}.jsonl")
    # Find most recent session
    sessions = glob.glob(os.path.join(PROJECT_DIR, "*.jsonl"))
    if not sessions:
        print("No sessions found", file=sys.stderr)
        sys.exit(1)
    return max(sessions, key=os.path.getmtime)


def inspect(agent_id: str, session_id: str | None = None):
    session_path = find_session(session_id)
    session_base = session_path.replace(".jsonl", "")
    sid = os.path.basename(session_base)

    transcript = os.path.join(session_base, "subagents", f"agent-{agent_id}.jsonl")
    if not os.path.exists(transcript):
        print(f"Transcript not found: {transcript}", file=sys.stderr)
        print(f"Available agents in session {sid}:")
        for f in sorted(glob.glob(os.path.join(session_base, "subagents", "agent-*.jsonl"))):
            print(f"  {os.path.basename(f)} ({os.path.getsize(f)} bytes)")
        sys.exit(1)

    print(f"Session: {sid}")
    print(f"Transcript: {transcript}")
    print(f"Total size: {os.path.getsize(transcript)} bytes")
    print()

    cumulative = 0
    with open(transcript, "r") as f:
        for i, line in enumerate(f):
            cumulative += len(line.encode("utf-8"))
            entry = json.loads(line)

            entry_type = entry.get("type", "?")
            role = entry.get("message", {}).get("role", "")
            content = entry.get("message", {}).get("content", [])

            # Find tool_use_ids
            tool_use_ids = []
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "tool_use":
                        tool_use_ids.append(block.get("id", "?"))

            # Find ALLOWED_FILES
            has_allowed = bool(re.search(r"ALLOWED_FILES:", line))

            # Summary
            info = f"Line {i:3d} | cum={cumulative:8d}b | type={entry_type:12s} | role={role:10s} | size={len(line):6d}b"
            if tool_use_ids:
                info += f" | tool_use_ids={tool_use_ids}"
            if has_allowed:
                info += " | ** HAS ALLOWED_FILES **"
            print(info)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    agent_id = sys.argv[1]
    session_id = sys.argv[2] if len(sys.argv) > 2 else None
    inspect(agent_id, session_id)
