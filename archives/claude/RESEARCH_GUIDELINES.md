# Research Guidelines

General principles for exploratory research with Claude Code assistance.

## Core Principles

### 1. Hypothesis-Driven Exploration
- **State hypotheses explicitly** before running experiments
- **Pre-register predictions** to avoid post-hoc rationalization
- **Document negative results** - they're data too

### 2. Systematic Over Ad-Hoc
- **Vary one thing at a time** when possible
- **Include controls/baselines** for comparison
- **Repeat observations** before concluding

### 3. Documentation Standards
- **Log everything**: commands run, parameters used, timestamps
- **Verbatim outputs** over paraphrasing
- **Separate observations from interpretations**

### 4. Avoid Common Pitfalls
- **Confirmation bias**: Actively seek disconfirming evidence
- **Cherry-picking**: Don't ignore results that don't fit
- **Over-interpreting**: Single observations are anecdotes, not conclusions
- **P-hacking equivalent**: Don't keep tweaking until something looks interesting

## Working with Claude

### What Claude Should Do
- Run experiments systematically according to plan
- Document outputs verbatim
- Flag unexpected results or anomalies
- Ask clarifying questions before making assumptions
- Suggest follow-up experiments based on observations

### What Claude Should NOT Do
- Interpret results without explicit human input
- Skip conditions that "seem redundant"
- Summarize away potentially important details
- Make claims about what findings "prove"
- Adjust experiments mid-run without noting it

## Experiment Lifecycle

```
1. DESIGN
   - State research question
   - Define hypotheses
   - Plan conditions and controls
   - Prepare materials (prompts, configs, etc.)

2. EXECUTE
   - Run systematically
   - Log everything
   - Note anomalies immediately

3. OBSERVE
   - Document raw results
   - Initial pattern-spotting (exploratory)
   - Flag surprising findings

4. SYNTHESIZE (human-led)
   - Interpret patterns
   - Assess hypothesis support
   - Plan follow-up experiments
```

## File Organization

```
project/
├── RESEARCH_GUIDELINES.md      # This file
├── RESEARCH_PLAN.md            # Specific experiment plan
├── TECHNICAL_GUIDE.md          # How to run experiments
├── experiments/
│   ├── YYYY-MM-DD_experiment_name/
│   │   ├── config.yaml         # Experiment parameters
│   │   ├── raw_outputs.yaml    # Verbatim model outputs
│   │   ├── observations.md     # Coded observations
│   │   └── notes.md            # Free-form notes
├── constitutions/              # Training data / reference materials
└── analysis/                   # Post-hoc analysis scripts
```

## Session Handoff

When ending a session, Claude should summarize:
1. What was done (experiments run, conditions tested)
2. Key observations (factual, not interpretive)
3. Open questions or anomalies
4. Suggested next steps
