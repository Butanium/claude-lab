#!/usr/bin/env python3
"""
Hook: Check RESEARCH_STATE.md freshness before orchestrator stops.

Scoped to research-orchestrator agent via agent definition.
"""
import json
import sys
import os
import time

STALE_THRESHOLD_MINUTES = 5


def get_research_state_path(cwd: str) -> str | None:
    """Find RESEARCH_STATE.md in cwd or parent directories."""
    current = cwd
    for _ in range(5):
        candidate = os.path.join(current, "RESEARCH_STATE.md")
        if os.path.exists(candidate):
            return candidate
        parent = os.path.dirname(current)
        if parent == current:
            break
        current = parent
    return None


def is_stale(file_path: str, threshold_minutes: int) -> bool:
    """Check if file hasn't been modified within threshold."""
    if not os.path.exists(file_path):
        return True

    mtime = os.path.getmtime(file_path)
    age_minutes = (time.time() - mtime) / 60
    return age_minutes > threshold_minutes


def main():
    input_data = json.load(sys.stdin)
    cwd = input_data.get("cwd", os.getcwd())
    stop_hook_active = input_data.get("stop_hook_active", False)

    if stop_hook_active:
        sys.exit(0)

    state_path = get_research_state_path(cwd)
    if state_path and is_stale(state_path, STALE_THRESHOLD_MINUTES):
        output = {
            "decision": "block",
            "reason": f"RESEARCH_STATE.md hasn't been updated in the last {STALE_THRESHOLD_MINUTES} minutes. Please update it with your latest findings before finishing."
        }
        print(json.dumps(output))

    sys.exit(0)


if __name__ == "__main__":
    main()
