# clab

**STATUS: Work in progress - not tested yet**

Claude Code plugin for autonomous research orchestration.

## What It Does

Provides agents for hypothesis-driven research:

- **orchestrator**: Main agent. Maintains hypotheses, designs experiments, spawns scientists, synthesizes findings.
- **scientist**: Runs experiments defined by orchestrator. Writes reports, can spawn judges for batch evaluation.
- **colleague**: Fresh-eyes review with intentionally limited context. Catches assumptions.
- **judge**: Evaluates samples against criteria. Used for scaling qualitative observations to quantitative data.

Plus supporting skills (`research-principles`, `research-judging`, `contact-supervisor`) and hooks for agent constraints.

## Installation

**For development** (load directly without installation):
```bash
claude --plugin-dir /path/to/this/repo/plugins/clab
```
Note: `--plugin-dir` must be passed **every time** you run Claude. Changes to the plugin are reflected after restarting Claude.

**For persistent install** (via local marketplace):

1. Add this repo as a marketplace:
   ```bash
   /plugin marketplace add /path/to/this/repo
   ```

2. Install the plugin:
   ```bash
   /plugin install clab@claude-lab
   ```

To update after local changes, run `/plugin marketplace update claude-lab` then reinstall.

**Tip for development**: Enable auto-update on the marketplace (`/plugin` → Marketplaces → claude-lab → Enable auto-update) to automatically pick up changes at startup.

## Configuration

```bash
export CLAB_NTFY_TOPIC="your-ntfy-topic"  # Required for notifications
```

## Usage

Add this alias to your shell config:
```bash
alias research-claude="claude --dangerously-skip-permissions -p \"[this is an automated prompt to enable the skills in your context, DO NOT start doing stuff, wait for user instruction.]/clab:orchestrator /clab:contact-supervisor /clab:research-principles /clab:research-judging /clab:experiment-structure\""
```

Then start a research session:
```bash
research-claude
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
- Skills will be namespaced as `/clab:skill-name`
