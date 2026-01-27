# clab

**STATUS: Work in progress - not tested yet**

Claude Code plugin for autonomous research orchestration.

## What It Does

Provides agents for hypothesis-driven research:

- **orchestrator**: Main agent. Maintains hypotheses, designs experiments, spawns scientists, synthesizes findings.
- **scientist**: Runs experiments defined by orchestrator. Writes reports, can spawn judges for batch evaluation.
- **colleague**: Fresh-eyes review with intentionally limited context. Catches assumptions.
- **judge**: Evaluates samples against criteria. Used for scaling qualitative observations to quantitative data.

Plus supporting skills (`research-principles`, `research-judging`) and hooks for agent constraints.

## Installation

**For development** (recommended):
```bash
claude --plugin-dir /path/to/this/repo
```
Note: `--plugin-dir` must be passed **every time** you run Claude. Changes to the plugin are reflected after restarting Claude.

**For install** (cached copy, no auto-updates):
```bash
claude plugin install /path/to/this/repo
```
This copies files to `~/.claude/plugins/cache`. Local changes to the source are **not** reflected - you must re-run `plugin install` to update.

## Configuration

```bash
export CLAB_NTFY_TOPIC="your-ntfy-topic"  # Required for notifications
```

## Usage

Initialize a research project:
```bash
~/.claude/plugins/clab/scripts/init-research.sh "Your research question"
```

Start research:
```bash
claude --agent clab:orchestrator
```

## Project Structure Created

```
RESEARCH_STATE.md      # Hypotheses, evidence, confidence
TECHNICAL_GUIDE.md     # Accumulated technical knowledge
research_diary.md      # Reflections, @clement mentions
scaffolding_notes.md   # Tool issues, best practices
tools/                 # Reusable utilities (orchestrator maintains)
experiments/           # One folder per experiment
sidequests/            # Interesting tangents for later
```

## Agents & Constraints

| Agent | Can Write | Hooks |
|-------|-----------|-------|
| orchestrator | Everything | Stop: nudge + freshness check |
| scientist | Own experiment folder only | PreToolUse: blocks protected files |
| colleague | Nothing (read-only) | PreToolUse: restricts to ALLOWED_FILES |
| judge | judgments/ only | SessionStart: requires CLAUDE.md |

## WIP Notes

- Plugin structure converted from install.sh, not yet tested end-to-end
- Hook paths assume installation at `~/.claude/plugins/clab/`
- Skills will be namespaced as `/clab:skill-name`
