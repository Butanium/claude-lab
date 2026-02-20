# clab

Claude Code plugin for autonomous research orchestration.

## What It Does

A scaffolding system for hypothesis-driven research using Claude Code. The **orchestrator** skill acts as a PI — it maintains hypotheses, designs experiments, and delegates execution to specialized **subagents** (scientist, colleague, judge) that run with constrained permissions enforced by hooks.

### Entry point

- **`/orchestrator`** (skill) — Starts autonomous research mode. Maintains `RESEARCH_STATE.md`, designs experiments, spawns subagents, synthesizes findings. Not model-invocable — must be started by the user via slash command.

### Subagents (spawned by orchestrator via Task tool)

- **scientist** — Runs experiments, writes reports. Can only write to its own experiment folder (hooks block `RESEARCH_STATE.md`, `tools/`, etc.).
- **colleague** — Fresh-eyes review with intentionally limited context. Read-only, restricted to files specified in `ALLOWED_FILES`.
- **judge** — Evaluates samples against criteria in `CLAUDE.md`. Writes only to `judgments/`. Runs on haiku by default.

### Supporting skills (loaded by orchestrator at session start)

- **`/research-principles`** — Core principles for hypothesis-driven investigation (shared across all roles).
- **`/research-judging`** — How to set up and run the LLM judge pipeline for batch evaluation.
- **`/experiment-structure`** — Standard experiment folder structure and templates. Not user-invocable.
- **`/contact-supervisor`** — How to send notifications to the human supervisor via ntfy.sh.
- **`/write-report`** — How to write up findings as an interactive Quarto report.

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

**Local symlink install** (workaround for [GH #17688](https://github.com/anthropics/claude-code/issues/17688) — plugin frontmatter hooks don't fire):

The plugin system doesn't parse hooks from agent/skill frontmatter. This script symlinks agents, skills, and hooks into `.claude/` so they're loaded by the local agent loader which correctly handles hooks.

```bash
# Run from your project directory (where .claude/ lives)
path/to/claude-lab/scripts/install-plugin-locally.sh path/to/claude-lab/plugins/clab

# Overwrite existing symlinks
path/to/claude-lab/scripts/install-plugin-locally.sh path/to/claude-lab/plugins/clab --force

# Uninstall
path/to/claude-lab/scripts/install-plugin-locally.sh path/to/claude-lab/plugins/clab --uninstall
```

Requires hook commands to use `"$CLAUDE_PROJECT_DIR"/...` paths (not `${CLAUDE_PLUGIN_ROOT}`). Restart Claude Code after install.

## Configuration

```bash
export CLAB_NTFY_TOPIC="your-ntfy-topic"  # Required for notifications
```

## Usage

Start a research session:
```bash
claude --dangerously-skip-permissions
```

Then invoke the orchestrator with your research question:
```
/orchestrator Your research question here
```

The orchestrator will load the supporting skills (`/research-principles`, `/research-judging`, `/contact-supervisor`, `/write-report`) itself at session start.

**Shell alias** for convenience:
```bash
alias research-claude="claude --dangerously-skip-permissions"
```

## Project Structure (created by orchestrator)

```
RESEARCH_STATE.md      # Hypotheses, evidence, confidence levels
TECHNICAL_GUIDE.md     # Project-specific technical knowledge
research_diary.md      # Reflections, @clement mentions
scaffolding_notes.md   # General autonomous research best practices
tools/                 # Reusable utilities (orchestrator maintains)
experiments/           # One folder per experiment (config.yaml, report.md, outputs/)
sidequests/            # Interesting tangents for later
archive/               # Deprecated files (never delete, always archive)
```

## Agents & Hooks

| Role | Type | Can Write | Hooks |
|------|------|-----------|-------|
| orchestrator | skill | Everything | **Stop**: nudge before stopping + RESEARCH_STATE.md freshness check |
| scientist | agent | Own experiment folder only | **PreToolUse**: blocks `RESEARCH_STATE.md`, `research_diary.md`, `tools/`, `.claude/` |
| colleague | agent | Nothing (read-only) | **PreToolUse**: restricts reads to `ALLOWED_FILES` list |
| judge | agent | `judgments/` only | **SessionStart**: requires `CLAUDE.md` with judging criteria. **PreToolUse**: blocks writes outside `judgments/` |

## Repo Structure

```
plugins/clab/                  # The plugin
  agents/                      # Subagent definitions (scientist, colleague, judge)
  skills/                      # Skill definitions (orchestrator, research-principles, etc.)
  hooks/                       # Python hook scripts for agent constraints
  .claude-plugin/plugin.json   # Plugin metadata
scripts/
  install-plugin-locally.sh    # Symlink installer (workaround for GH #17688)
  setup-hooks.sh               # Git hooks setup
  hooks/post-commit            # Auto-bumps plugin version on commit
debug-utils/
  inspect_subagent_transcript.py  # Debug tool for subagent transcripts
literature/                    # Notes on related work
possible-improvments/          # Ideas and future work
```
