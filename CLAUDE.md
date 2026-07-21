# Claude Lab

## Layout

- Canonical agents/skills/hooks live in this repo's `.claude/` (git-tracked via `.gitignore` negations; `settings.local.json` etc. stay ignored). No plugin form — retired 2026-07-20, see `deprecated/CLAUDE.md`.
- Consuming repos symlink content in via `scripts/install-clab.sh` (also at `~/.claude/scripts/install-clab.sh`). Agents must load as local agents because plugin-shipped agents don't support frontmatter `hooks` by design.
- **Agent definitions** (`.md` files) are loaded at startup — changes require Claude Code restart; skills hot-reload (`/reload-plugins`)
- **Hook scripts** (`.py` files) are read per-invocation — edits take effect immediately, no restart needed

## Testing Hooks

- Use **haiku** for test agents (faster, cheaper, still follows instructions)
- Debug scripts in `debug-utils/`:
  - `inspect_subagent_transcript.py <agent_id> [session_id]` — show transcript entries with cumulative sizes, tool_use_ids, ALLOWED_FILES markers

## Hook Debugging

Hooks run as external processes — no stdout visibility, silent failures. Always use structured debug logging when developing/testing hooks.

### Debug pattern for hook scripts

```python
import datetime, json, os

DEBUG_PATH = "/run/user/2011/hook_debug_<hookname>.json"

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
```

### What to log at each decision point

1. **Full hook input** (minus large fields like tool_input body): session_id, tool_use_id, transcript_path, cwd
2. **Each branch taken**: what the hook looked for, what it found, what it decided
3. **Final decision**: allow/deny with reason

### Debugging checklist

- `cat /run/user/2011/hook_debug_<hookname>.json` — check if hook fired at all
- If no debug file: hook didn't fire (check symlinks, YAML quoting, agent name matching)
- If debug file exists but no deny: trace which branch returned early (the log shows this)
- Subagent transcripts live at `<session_id>/subagents/agent-<id>.jsonl` — check if tool_use_id appears there
- `stderr` output from hooks goes nowhere visible — always use file-based debug logging
- Clean up debug files between test runs: `rm /run/user/2011/hook_debug_*.json`

### Known gotchas

- YAML single vs double quotes: use single quotes in YAML for hook commands that contain `$VAR` expansion: `command: 'python3 "$CLAUDE_PROJECT_DIR"/...'`
- Plugin-shipped agents don't support frontmatter `hooks` (by design since ~CC 2.1.x; was bug GH #17688) — load agents locally via `scripts/install-clab.sh` symlinks
- `transcript_path` always points to main session, even for subagent hooks
- `PreToolUse` hooks have no `agent_id` (GH #14859, #16424) — and tool_use entries are written to subagent transcripts AFTER the hook fires, so per-agent correlation via tool_use_id doesn't work
- For ALLOWED_FILES enforcement: search the main transcript for the directive (works for single-agent; concurrent same-type agents is a known limitation)
- `additionalContext` in PreToolUse output is captured but never injected (GH #19432) — use `systemMessage` instead
- Agent frontmatter `tools` field does NOT restrict tool availability (GH #25061) — agents get all tools regardless. `allowed-tools` is not a valid field either. **Workaround**: use CLI flags `--tools "Read,Write,Glob"` (restricts availability) and `--allowedTools "Read,Write,Glob"` (auto-grants permission in `--print` mode). Note: `--allowedTools` is variadic so prompt must be piped via stdin.
