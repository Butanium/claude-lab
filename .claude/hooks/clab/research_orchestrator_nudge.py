#!/usr/bin/env python3
"""
Hook: Nudge the research orchestrator before stopping.

Scoped to research-orchestrator agent via agent definition.

Semantics:
- [PASS] in last message = agent is waiting for pending work (background jobs).
  Always let it stop; it will wake up on task completion. Cleans nudge state.
- No [PASS], stop_hook_active=False = first stop attempt. Deliver standard nudge.
- No [PASS], stop_hook_active=True = agent has nothing to do. Sleep with
  exponential backoff and nudge periodically. Backoff resets if the agent was
  productive (>1 assistant turn since last hook).

State is persisted in /run/user/{uid}/orchestrator_nudge_state_{session_id}.json.
"""
import json
import sys
import os
import time

sys.path.insert(0, os.path.dirname(__file__))
from _transcript_utils import (
    IDLE_MARKER,
    count_assistant_entries_from_offset,
    get_last_assistant_text,
)

INITIAL_WAIT_MINUTES = 10
MAX_WAIT_MINUTES = 600  # 10 hours


def _state_file_path(session_id: str) -> str:
    return f"/run/user/{os.getuid()}/orchestrator_nudge_state_{session_id}.json"


def _format_elapsed(seconds: float) -> str:
    """Format seconds into human-readable elapsed time."""
    total_minutes = int(seconds) // 60
    if total_minutes < 60:
        return f"{total_minutes} minute{'s' if total_minutes != 1 else ''}"
    hours = total_minutes // 60
    minutes = total_minutes % 60
    parts = [f"{hours} hour{'s' if hours != 1 else ''}"]
    if minutes:
        parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")
    return " ".join(parts)


def _read_state(path: str) -> dict | None:
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        return None


def _write_state(path: str, state: dict) -> None:
    with open(path, "w") as f:
        json.dump(state, f)


def _delete_state(path: str) -> None:
    try:
        os.unlink(path)
    except FileNotFoundError:
        pass


def _handle_stop_hook_active(session_id: str, transcript_path: str | None) -> None:
    """Sleep until next wake time, then deliver a nudge message."""
    path = _state_file_path(session_id)
    now = time.time()

    state = _read_state(path)
    if state is None:
        transcript_offset = os.path.getsize(transcript_path) if transcript_path else 0
        state = {
            "first_stop_ts": now,
            "next_wake_ts": now + INITIAL_WAIT_MINUTES * 60,
            "next_wait_minutes": INITIAL_WAIT_MINUTES * 2,
            "transcript_offset": transcript_offset,
        }
        _write_state(path, state)

    sleep_seconds = state["next_wake_ts"] - now
    if sleep_seconds > 0:
        time.sleep(sleep_seconds)

    elapsed = _format_elapsed(time.time() - state["first_stop_ts"])
    next_wait = min(state["next_wait_minutes"], MAX_WAIT_MINUTES)
    transcript_offset = os.path.getsize(transcript_path) if transcript_path else 0
    state["next_wake_ts"] = time.time() + next_wait * 60
    state["next_wait_minutes"] = min(next_wait * 2, MAX_WAIT_MINUTES)
    state["transcript_offset"] = transcript_offset
    _write_state(path, state)

    output = {
        "decision": "block",
        "reason": f"""It's been {elapsed} since you first paused. Your supervisor hasn't checked in yet.

This is a good moment for self-reflection. Take a step back and think about the bigger picture:
- What have you learned so far? Are there patterns or surprises worth writing down?
- Are your current hypotheses still the right ones, or has evidence shifted things?
- Is there something you've been avoiding or haven't looked at closely enough?
- What would you tell your supervisor if they walked in right now?

If reflection sparks action, here are some concrete things you could do:
- Update RESEARCH_STATE.md or research_diary.md with your current thinking
- Check on background jobs or pending experiments
- Spawn a colleague review for a sanity check on your reasoning
- Explore sidequest ideas from sidequests/
- Re-analyze existing data from a new angle
- Tidy up your codebase: move deprecated things to archive/, create new tools if needed, check that the doc is up to date, etc.
- Update / write a report (see /writing-guidelines)
- Reflect on what are the next steps you could try: don't run experiments blindly, but critically think about your current report: what statement seems weak, what experiments would strengthen it. Write down those thought in research state. Then, try to think hard out of the box and try to be more creative about what kind of next steps would be interesting. Think about stuff the user could suggest as next cool experiment to run based on your results.

On top of that, here are some common failure modes where you decide to pass while you should not:
- "This didn't work, need more investigation": Investigate this properly and make sure it didn't impact the results
- "This experiment is low priority": You are autonomous, there is no such thing as a low priority experiment for you: if you finished all your important tasks, do the lower priorty stuff: you might find new interesting things that way.""",
    }
    print(json.dumps(output))
    sys.exit(0)


def main():
    input_data = json.load(sys.stdin)
    stop_hook_active = input_data.get("stop_hook_active", False)
    session_id = input_data.get("session_id", "unknown")

    transcript_path = input_data.get("transcript_path")
    if transcript_path:
        last_msg = get_last_assistant_text(transcript_path)
        if "You've hit your limit" in last_msg:
            time.sleep(3600)
            output = {
                "decision": "block",
                "reason": "rate limit hit... waiting for reset",
            }
            print(json.dumps(output))
            sys.exit(0)

        if IDLE_MARKER in last_msg:
            # [PASS] = agent is waiting for pending work. Let it stop and clean
            # nudge state so the next cycle starts fresh.
            _delete_state(_state_file_path(session_id))
            sys.exit(0)

    if stop_hook_active:
        # Check if agent was productive since last hook (>1 assistant turn).
        # If so, reset state so backoff starts fresh.
        path = _state_file_path(session_id)
        state = _read_state(path)
        if state and transcript_path:
            msgs_since = count_assistant_entries_from_offset(
                transcript_path, state.get("transcript_offset", 0)
            )
            if msgs_since > 1:
                _delete_state(path)
        _handle_stop_hook_active(session_id, transcript_path)

    output = {
        "decision": "block",
        "reason": """Before finishing, consider:

1. Is there anything else worth a quick check to strengthen your conclusions?
2. Would a colleague review help validate your reasoning?
3. Are there any loose ends or anomalies you noticed but didn't follow up on?
4. Is RESEARCH_STATE.md updated with your latest thinking?

If you're confident you're done, just say so and I'll let you stop.

Tip: If you're idling while waiting for background results, include [PASS] in your message to skip this check.""",
    }
    print(json.dumps(output))
    sys.exit(0)


if __name__ == "__main__":
    main()
