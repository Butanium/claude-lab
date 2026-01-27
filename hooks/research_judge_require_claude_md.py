#!/usr/bin/env python3
"""
Hook: Require CLAUDE.md in working directory for research-judge agent.

Runs on SessionStart, errors if no CLAUDE.md found (judge needs criteria).
"""
import json
import sys
import os


def main():
    input_data = json.load(sys.stdin)
    cwd = input_data.get("cwd", os.getcwd())

    claude_md = os.path.join(cwd, "CLAUDE.md")

    if not os.path.exists(claude_md):
        print(f"ERROR: No CLAUDE.md found in {cwd}", file=sys.stderr)
        print("The research-judge agent requires a CLAUDE.md with judging criteria.", file=sys.stderr)
        print("See research-judging skill for setup instructions.", file=sys.stderr)
        sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    main()
