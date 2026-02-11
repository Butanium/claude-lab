# Agent Teams vs clab: Impact Analysis

## 1. What Agent Teams Are (Quick Summary)

Agent teams coordinate **multiple independent Claude Code instances** working together. One session acts as **team lead** (coordinates, assigns tasks, synthesizes), while **teammates** work in parallel with their own context windows. Key difference from subagents: teammates can **message each other directly**, not just report back to the lead.

The feature is experimental (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`).

## 2. Current clab Architecture

```
orchestrator (skill/main session)
  ├── spawns scientist subagents (Task tool, subagent_type: "clab:scientist")
  ├── spawns colleague subagents (Task tool, subagent_type: "clab:colleague")
  └── scientists spawn judges via CLI (claude --agent clab:judge)
```

**Key characteristics:**
- **Hub-and-spoke**: All coordination flows through the orchestrator
- **Hook-enforced constraints**: Scientists can't edit `RESEARCH_STATE.md` or `tools/`, colleagues can only read `ALLOWED_FILES`, judges can only write to `judgments/`
- **Shared state via files**: `RESEARCH_STATE.md`, `research_diary.md`, experiment reports
- **One-way communication**: Subagents report back to orchestrator, never to each other

## 3. Where Agent Teams Would Help

### 3.1 Directly solves the delegation problem

`IDEAS.md` says:
> The orchestrator should more strongly emphasize delegation to scientists/colleagues rather than doing everything itself.

Agent teams' **delegate mode** (Shift+Tab) restricts the lead to coordination-only tools: spawning, messaging, shutting down teammates, and managing tasks. No code editing. This is exactly the constraint you want on the orchestrator.

### 3.2 Competing hypotheses (scientific debate)

The docs' strongest example maps perfectly to clab's research model:

> Spawn 5 agent teammates to investigate different hypotheses. Have them talk to each other to try to disprove each other's theories, like a scientific debate.

Currently, scientists work in isolation. With agent teams, scientist-A testing H1 could challenge scientist-B testing H2 in real-time. The docs argue this reduces **anchoring bias** — sequential investigation tends to fixate on the first plausible explanation.

### 3.3 Live colleague review

Currently colleagues are spawned *after* experiments complete. With agent teams, a colleague could be a permanent teammate getting findings in real-time, catching methodological issues before the orchestrator commits to a direction.

### 3.4 Plan approval workflow

> Spawn an architect teammate to refactor the authentication module. Require plan approval before they make any changes.

For expensive experiments (GPU-heavy, many API calls), requiring the orchestrator to approve the scientist's plan before execution could save resources. The lead autonomously reviews and approves/rejects with feedback.

## 4. Where Agent Teams DON'T Help (or Actively Hurt)

### 4.1 Hook-based permission model breaks down

This is the **biggest problem**. Clab's architecture relies heavily on per-agent hooks:

| Agent | Hook constraint |
|-------|----------------|
| scientist | Can't edit `RESEARCH_STATE.md`, `tools/`, `research_diary.md` |
| colleague | Can only read `ALLOWED_FILES` |
| judge | Can only write to `judgments/`, requires `CLAUDE.md` at startup |

Agent teams inherit the **lead's permission settings** at spawn time. You can't set per-teammate permissions at spawn. The docs say teammates load CLAUDE.md from their working directory, but the fine-grained hook enforcement that clab relies on would need a different mechanism. Currently hooks are scoped via the agent definition files — agent teams use a different spawning path.

### 4.2 Judge pipeline is a perfect subagent use case

Judges are lightweight, focused workers: read criteria, read sample, write judgment. No inter-agent communication needed. The docs explicitly say:

> Use subagents when you need quick, focused workers that report back.

The current `xargs -P 10` CLI pattern for parallel judging is simpler and cheaper than agent teams.

### 4.3 Token cost

Each teammate is a full Claude instance with its own context window. For the routine cycle of "design experiment, run it, write report," subagents are more cost-effective. Agent teams only pay off when the inter-agent communication adds genuine value.

### 4.4 No nested teams

Teammates can't spawn their own teams. Currently scientists spawn judge agents — this nesting pattern doesn't map cleanly to agent teams (though scientists could still spawn judges as subagents within their teammate session).

### 4.5 One team per session, lead is fixed

You can't have the orchestrator manage multiple research projects simultaneously as separate teams. And if the orchestrator session dies, you lose the team lead.

## 5. Best Practices from the Docs That Already Apply to clab

| Best Practice | clab Status |
|--------------|-------------|
| **"Give teammates enough context"** — include task-specific details in spawn prompt | Already done: scientists get experiment config paths, colleagues get `ALLOWED_FILES` |
| **"Size tasks appropriately"** — self-contained units with clear deliverables | Already done: one experiment = one scientist = one report |
| **"Avoid file conflicts"** — each teammate owns different files | Already done: hooks enforce per-agent file ownership |
| **"Start with research and review"** — begin with non-code tasks | Natural fit for clab's research focus |
| **"Monitor and steer"** — check in on progress, redirect failing approaches | Partially done: `research_orchestrator_nudge.py` hook, but only at stop time |
| **"5-6 tasks per teammate"** | Clab's current model is 1 experiment per scientist, which is appropriately sized |

## 6. Best Practices to Adopt Regardless of Agent Teams

### 6.1 Shared task list for experiment tracking

The docs emphasize a shared task list with states (pending/in-progress/completed) and dependencies. This maps directly to the `IDEAS.md` note:

> Nudge the orchestrator to maintain a task list of experiments to run, rather than doing them ad-hoc.

Whether you use agent teams or not, having the orchestrator use Claude Code's built-in task list (`TaskCreate`/`TaskUpdate`) for experiment tracking would improve planning and progress visibility.

### 6.2 Plan approval before expensive work

Even with subagents, the pattern of "plan first, get approval, then execute" is valuable for experiments that consume GPU time or many API calls.

### 6.3 Delegate mode mindset

Even without agent teams, the orchestrator skill could be more explicit about delegation. Adding something like "You are a coordinator. Your job is to design experiments and spawn scientists. Do NOT run experiments yourself." would reinforce this.

## 7. Concrete Recommendation

**Don't switch to agent teams wholesale.** The current subagent architecture is a better fit for most of clab's workflow. Instead, adopt specific ideas:

### Use now (no agent teams needed):
1. **Add task list usage to orchestrator skill** — Track experiments as tasks with dependencies
2. **Strengthen delegation language** in orchestrator prompt
3. **Add plan-review pattern** for expensive experiments (orchestrator reviews scientist's plan before execution)

### Try when agent teams stabilize:
4. **Competing-hypotheses mode** — When testing multiple conflicting hypotheses, spawn scientists as teammates so they can challenge each other's findings
5. **Live colleague** — Keep a colleague teammate running during research sessions for real-time sanity checks
6. **Delegate mode** for orchestrator — Use as team lead in delegate mode to force pure coordination

### Don't change:
7. **Judge pipeline** stays as CLI subagents — perfect current fit
8. **Hook-based constraints** — Agent teams don't offer a good replacement for per-agent file permissions yet
9. **Single-scientist experiments** — No benefit from agent teams for isolated experiment execution

## 8. Structural Changes If You Did Adopt Agent Teams

If you eventually wanted to run clab experiments as an agent team:

```
team lead = orchestrator (delegate mode, coordination only)
  ├── teammate: scientist-1 (exp_001)
  ├── teammate: scientist-2 (exp_002)
  ├── teammate: colleague (persistent, limited context)
  └── scientists still spawn judges as subagents internally
```

**What would need to change in the repo:**
- Orchestrator skill would need instructions for team creation and delegate mode
- Permission enforcement would need to shift from hooks to CLAUDE.md-based instructions (weaker but the only option with agent teams)
- Scientists would need messaging instructions ("when you find something surprising, message the colleague teammate")
- Task list would replace the current ad-hoc experiment tracking in RESEARCH_STATE.md

**What you'd lose:**
- Hook-enforced file permissions (hard guarantees → soft prompt-based ones)
- Cost efficiency for routine experiments
- The clean plugin-based architecture (agent teams are session-level, not plugin-level)

---

**TL;DR**: Agent teams are designed for the "scientific debate" pattern that clab aspires to, but clab's hook-based permission model is a better fit for subagents. Adopt the ideas (task lists, delegate mindset, plan approval) without the mechanism. Revisit when agent teams support per-teammate permissions.
