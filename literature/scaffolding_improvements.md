# Concrete Scaffolding Improvements for Claude Code

**Based on literature review of AI science automation papers**

---

## Priority 1: High-Impact, Feasible Now

### 1.1 Hypothesis Tracker Tool

**What:** A structured way to track hypotheses through investigation.

```python
# Conceptual interface
hypothesis_create(
    statement="Feature X in layer 12 encodes sentiment",
    evidence_for=[],
    evidence_against=[],
    confidence=0.3,  # Prior
    status="untested"
)

hypothesis_update(id, new_evidence="Ablation shows 23% accuracy drop", direction="supports")
hypothesis_falsify(id, reason="Counterexample found in...")
hypothesis_list(status="active")  # Show working hypotheses
```

**Rationale:** AI co-scientist and POPPER show that structured hypothesis tracking with falsification is core to effective research automation. Currently we rely on ad-hoc notes.

### 1.2 Experiment Registry

**What:** Log experiments with parameters, results, and relationships.

```python
experiment_log(
    name="ablate_layer12_feature42",
    parameters={"layer": 12, "feature": 42, "method": "zero"},
    results={"accuracy_delta": -0.23, "perplexity_delta": +1.2},
    hypothesis_id="hyp_001",
    conclusion="Supports hypothesis - significant accuracy drop"
)

experiment_search(hypothesis_id="hyp_001")  # Find all related experiments
experiment_compare(exp_ids=["exp_001", "exp_002"])  # Side-by-side comparison
```

**Rationale:** Prevents redundant experiments, enables systematic exploration.

### 1.3 Literature Note Structure

**What:** Structured extraction when reading papers (vs. just summarizing).

When fetching/reading a paper, extract to structured format:

```yaml
paper:
  title: "..."
  key_claims:
    - claim: "SAEs learn monosemantic features"
      evidence: "..."
      limitations: "Only tested on small models"
  methodology:
    - "Train SAE on activations"
    - "Analyze feature interpretability via..."
  connections:
    - paper: "Scaling Monosemanticity"
      relationship: "extends methodology to larger models"
  open_questions:
    - "Does this hold for reasoning tasks?"
```

**Rationale:** Agent Laboratory identified literature review as the weakest stage. Structured notes enable better synthesis.

---

## Priority 2: Medium-Term Improvements

### 2.1 Generator-Critic Pattern

**What:** Separate generation and critique into distinct "modes" or subagents.

Current: Single agent generates and self-critiques
Proposed:
- Generator focuses on exploration, creativity
- Critic focuses on finding flaws, edge cases
- Explicit debate between them

**Implementation:** Could be a skill that spawns two subagents with different system prompts:
```
/debate-hypothesis "SAEs learn monosemantic features in larger models"
```

**Rationale:** AI co-scientist showed multi-agent debate improves hypothesis quality significantly.

### 2.2 Progressive Tree Search for Exploration

**What:** Track exploration branches, allow backtracking.

```
exploration_checkpoint(name="before_layer12_investigation")
exploration_branch(name="try_alternative_method")
exploration_backtrack(to="before_layer12_investigation")
exploration_compare_branches()
```

**Rationale:** AI Scientist-v2's key improvement was progressive agentic tree search. Currently exploration is linear.

### 2.3 Information Provenance Tracking

**What:** Track data → analysis → conclusion chains for reproducibility.

Each claim should trace back to:
- What data was it based on?
- What analysis was performed?
- What assumptions were made?

**Rationale:** Data-to-paper emphasized this for verifiability. Critical for alignment research where we need to trust findings.

---

## Priority 3: Longer-Term / Experimental

### 3.1 Tool Generator (TOOLMAKER pattern)

**What:** Automatically create tools from code repositories.

When encountering a paper with code:
1. Fetch the repository
2. Identify key functions/interfaces
3. Wrap as callable tools
4. Add to available tool set

**Rationale:** TOOLMAKER (ACL 2025) showed this enables rapid domain adaptation. Alignment research has many new techniques with code.

### 3.2 Elo-based Idea Ranking

**What:** Tournament-style comparison of competing approaches.

```
ranking_tournament(
    ideas=["Method A", "Method B", "Method C"],
    criteria="Which is more likely to find real circuits?",
    rounds=5
)
```

Uses pairwise comparisons to rank without requiring absolute scores.

**Rationale:** AI co-scientist validated this for hypothesis prioritization.

### 3.3 Alignment Auditing Pipeline

**What:** Structured workflow for auditing model behaviors.

Based on Anthropic's auditing agents (July 2025):
1. Define behavior of concern
2. Generate diverse test cases
3. Systematically probe model
4. Synthesize findings
5. Report with confidence levels

**Rationale:** Directly applicable to your interpretability/alignment work.

---

## Implementation Notes

### What Claude Code Already Has

The literature discusses many tools we already have:
- Code execution (Bash)
- File reading/writing (Read, Write, Edit)
- Web search/fetch (WebSearch, WebFetch)
- Task management (TaskCreate, TaskUpdate, etc.)
- Subagent spawning (Task tool)

### What's Missing

1. **Structured research state** - hypotheses, experiments, findings
2. **Explicit exploration tracking** - branches, backtracking
3. **Multi-agent patterns** - debate, critique, meta-review
4. **Domain tool generation** - automatically wrap code as tools
5. **Provenance tracking** - data → conclusion chains

### Minimal Viable Additions

If implementing only one thing, I'd recommend **Hypothesis Tracker**:
- Small scope
- High research impact
- Enables systematic investigation
- Works with existing tools

Could be implemented as:
1. A simple JSON file (`hypotheses.json`) with helper functions
2. A skill that provides commands like `/hypothesis add "..."`, `/hypothesis update ...`
3. Integration with the task system (hypotheses as special tasks)

---

## Related to Your CLAUDE.md Preferences

These recommendations align with your stated preferences:

- **"Fail fast philosophy"**: Provenance tracking helps identify where things went wrong
- **"Correctness above all"**: Hypothesis falsification is about finding errors
- **"Avoid hiding failures"**: Experiment registry records negative results
- **"Minimal, dry code"**: Tools should be simple wrappers, not frameworks
- **"Research code"**: All suggestions are research-oriented, not production software patterns

---

## Next Steps

If you want to implement any of these:

1. **Quick win**: Add structured hypothesis tracking to a project as a simple JSON-based system
2. **Medium effort**: Create a `/research` skill that provides hypothesis/experiment commands
3. **Larger effort**: Modify Claude Code hooks to automatically track exploration state

I'm happy to help implement any of these!
