# clab

**STATUS: Work in progress - very experimental and fast evolving codebase**

Claude Code agents, skills, and hooks for autonomous research orchestration.

## disclaimer

Report tend to still be sloppy (with not enough red teaming of the results etc.) but it's sloly getting better.

## What It Does

A scaffolding system for hypothesis-driven research using Claude Code. The **orchestrator** agent acts as a PI — it maintains hypotheses, designs experiments, and delegates execution to specialized **subagents** (scientist, colleague, reviewer) that run with constrained permissions enforced by hooks.

### Orchestrator agents

- **orchestrator** — Autonomous research mode. Maintains `RESEARCH_STATE.md`, designs experiments, spawns subagents, synthesizes findings.
- **interactive-orchestrator** — Interactive research mode. Same as orchestrator but collaborates with the user in real time.

### Subagents (spawned by orchestrator via Task tool)

- **scientist** — Runs experiments, writes reports. Can only write to its own experiment folder (hooks block `RESEARCH_STATE.md`, `tools/`, etc.).
- **colleague** — Fresh-eyes review with intentionally limited context. Read-only, restricted to files specified in `ALLOWED_FILES`.
- **reviewer** — Red-teams reports for common errors (missing CIs, overclaims, non-interactive plots, etc.).

### Supporting skills (preloaded by orchestrator agents via frontmatter)

- **`/research-principles`** — Core principles for hypothesis-driven investigation (shared across all roles).
- **`/research-judging`** — How to set up and run the LLM judge pipeline for batch evaluation.
- **`/experiment-structure`** — Standard experiment folder structure and templates.
- **`/contact-supervisor`** — How to send notifications to the human supervisor via ntfy.sh.
- **`/writing-guidelines`** — How to write up findings as an interactive self-contained HTML report (published as a claude.ai Artifact).
- **`/supervisor-report`** — Process for writing and reviewing reports for the supervisor.
- **`/efficient-api-usage`** — Cost and latency optimization (prompt caching, batch API).

## Installation

Canonical content lives in this repo's `.claude/` (agents, skills, hooks — git-tracked; see `.gitignore`). To use clab in another repo, symlink it in:

```bash
# Run from the consuming repo's root
path/to/claude-lab/scripts/install-clab.sh            # install
path/to/claude-lab/scripts/install-clab.sh --force    # overwrite existing symlinks
path/to/claude-lab/scripts/install-clab.sh --uninstall
```

Restart Claude Code after install (or `/reload-plugins` for skill-only changes).

Why symlinks instead of a plugin: the agents carry per-agent hooks in their frontmatter (scientist write protection, colleague read restriction, orchestrator stop-nudge), and plugin-shipped agents don't support frontmatter `hooks` by design (security restriction, see [plugins reference](https://code.claude.com/docs/en/plugins-reference)). Local agents in `.claude/agents/` do. Hook commands use `"$CLAUDE_PROJECT_DIR"/.claude/hooks/clab/...` paths, which resolve in any consuming repo. The old plugin/marketplace form was retired 2026-07-20 (`deprecated/plugin-form/`).

## Configuration

```bash
export CLAB_NTFY_TOPIC="your-ntfy-topic"  # Required for notifications
```

## Usage

Start a research session:
```bash
claude --dangerously-skip-permissions
```

Then invoke the orchestrator agent with your research question:
```bash
claude --agent orchestrator --dangerously-skip-permissions "Your research question here"
```

Skills are preloaded automatically via the agent's frontmatter — no manual `/skill` loading needed.

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
| orchestrator | agent | Everything | **Stop**: nudge before stopping + RESEARCH_STATE.md freshness check |
| scientist | agent | Own experiment folder only | **PreToolUse**: blocks `RESEARCH_STATE.md`, `research_diary.md`, `tools/`, `.claude/` |
| colleague | agent | Nothing (read-only) | **PreToolUse**: restricts reads to `ALLOWED_FILES` list |
| judge | agent | `judgments/` only | **SessionStart**: requires `CLAUDE.md` with judging criteria. **PreToolUse**: blocks writes outside `judgments/` |

## Repo Structure

```
.claude/                       # Canonical content (git-tracked)
  agents/                      # Agent definitions (orchestrator, scientist, colleague, reviewer)
  skills/                      # Skill definitions (research-principles, writing-guidelines, etc.)
  hooks/clab/                  # Python hook scripts for agent constraints
scripts/
  install-clab.sh              # Symlinks .claude/ content into a consuming repo
  setup-hooks.sh               # Git hooks setup
  hooks/post-commit            # Version-bump hook (disabled; only mattered for the retired plugin form)
deprecated/plugin-form/        # Retired plugin/marketplace metadata (see deprecated/CLAUDE.md)
debug-utils/
  inspect_subagent_transcript.py  # Debug tool for subagent transcripts
literature/                    # Notes on related work
possible-improvments/          # Ideas and future work
```
