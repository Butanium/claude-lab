"""Shared utilities for research orchestrator stop hooks."""
import json
import os
import time
import random
import string


IDLE_MARKER = "[PASS]"


def get_last_jsonl_entry(transcript_path: str) -> dict | None:
    """Return the last non-progress JSONL entry as a dict.

    Reads from the end of the file for efficiency. Skips 'progress' entries
    since those are written by hooks themselves.
    """
    with open(transcript_path, "rb") as f:
        f.seek(0, 2)
        position = f.tell()
        remainder = ""
        chunk_size = 8192
        while position > 0:
            read_size = min(chunk_size, position)
            position -= read_size
            f.seek(position)
            chunk = f.read(read_size).decode() + remainder
            lines = chunk.splitlines(True)
            # First line may be partial (split across chunks), save for next iteration
            remainder = lines[0] if position > 0 else ""
            complete_lines = lines[1:] if position > 0 else lines
            for line in reversed(complete_lines):
                stripped = line.strip()
                if not stripped:
                    continue
                obj = json.loads(stripped)
                if obj.get("type") != "progress":
                    return obj
    return None


def _summarize_entry(entry: dict) -> dict:
    """Minimal summary of a transcript entry for debug logging."""
    t = entry.get("type")
    msg = entry.get("message", {})
    summary = {"type": t, "ts": entry.get("timestamp", "")}
    if model := msg.get("model"):
        summary["model"] = model
    content = msg.get("content", [])
    if isinstance(content, list):
        texts = [c.get("text", "")[:80] for c in content if c.get("type") == "text" and c.get("text", "").strip()]
        if texts:
            summary["texts"] = texts
    return summary


def _get_last_n_entries(transcript_path: str, n: int = 4) -> list[dict]:
    """Return the last n non-progress entries from the transcript (from the end)."""
    entries = []
    with open(transcript_path, "rb") as f:
        f.seek(0, 2)
        position = f.tell()
        remainder = ""
        chunk_size = 8192
        while position > 0 and len(entries) < n:
            read_size = min(chunk_size, position)
            position -= read_size
            f.seek(position)
            chunk = f.read(read_size).decode() + remainder
            lines = chunk.splitlines(True)
            remainder = lines[0] if position > 0 else ""
            complete_lines = lines[1:] if position > 0 else lines
            for line in reversed(complete_lines):
                stripped = line.strip()
                if not stripped:
                    continue
                obj = json.loads(stripped)
                if obj.get("type") != "progress":
                    entries.append(obj)
                    if len(entries) >= n:
                        break
    return entries


def wait_for_transcript_flush(transcript_path: str, debug_dir: str | None = None) -> bool:
    """Poll until the last JSONL entry has message.model (assistant turn flushed).

    Exponential backoff: 50ms, 100ms, 200ms, ... up to 8s.
    Returns True if flush detected, False if timed out.
    """
    wait = 0.05
    while wait <= 8:
        last_entry = get_last_jsonl_entry(transcript_path)
        has_model = bool(last_entry and last_entry.get("message", {}).get("model"))

        if debug_dir:
            rand_suffix = ''.join(random.choices(string.ascii_lowercase, k=6))
            os.makedirs(debug_dir, exist_ok=True)
            last_4 = _get_last_n_entries(transcript_path, 4)
            with open(f"{debug_dir}/{int(time.time())}_{rand_suffix}_poll.json", "w") as f:
                json.dump({
                    "wait_s": wait,
                    "has_model": has_model,
                    "last_4": [_summarize_entry(e) for e in last_4],
                }, f, indent=2)

        if has_model:
            return True

        time.sleep(wait)
        wait *= 2

    return False


def count_assistant_entries_from_offset(transcript_path: str, byte_offset: int) -> int:
    """Count assistant-type entries in the transcript after the given byte offset."""
    count = 0
    with open(transcript_path, "rb") as f:
        f.seek(byte_offset)
        for line in f:
            stripped = line.strip()
            if not stripped:
                continue
            obj = json.loads(stripped)
            if obj.get("type") == "assistant":
                count += 1
    return count


def get_last_assistant_text(transcript_path: str) -> str:
    """Read transcript JSONL and return the last assistant message text."""
    last_text = ""
    with open(transcript_path) as f:
        for line in f:
            obj = json.loads(line)
            if obj.get("type") != "assistant":
                continue
            msg = obj.get("message", {})
            content = msg.get("content", "")
            if isinstance(content, list):
                text = " ".join(
                    c.get("text", "") for c in content if c.get("type") == "text"
                )
            else:
                text = str(content)
            if text.strip():
                last_text = text.strip()
    return last_text
