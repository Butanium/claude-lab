---
name: init-research
description: Initialize a research project with standard directory structure and files
disable-model-invocation: true
---

# Initialize Research Project

Create a research project structure for: **$ARGUMENTS**

## Create These Directories

```bash
mkdir -p experiments sidequests tools
```

## Create These Files

### RESEARCH_STATE.md

```markdown
# Research: $ARGUMENTS

Last updated: [today's date]

## Current State of Mind

[Your overall sense of where this research is heading]

## Hypotheses

### H1: [Hypothesis name]

**Statement**: [Clear, testable statement]

**Confidence**: [low/medium/high] - [brief justification]

**Evidence for**:
- [none yet]

**Evidence against**:
- [none yet]

**Next**: [What experiment would test this?]

---

## Experiment Queue

- [ ] [Experiment idea]

## Completed Experiments

[None yet]

## Open Questions

- [Questions that emerged during research]
```

### research_diary.md

```markdown
# Research Diary

Personal reflections, process observations, and async questions for @clement.

---

## [today's date]

[First entry - initial thoughts on approaching this research]
```

### tools/README.md

```markdown
# Research Tools

Reusable utilities for this research project. Created and maintained by the orchestrator.

## Available Tools

[None yet - orchestrator will add tools as needed]

## Usage

Scientists should check here before writing code. Use existing tools when possible.
```

### TECHNICAL_GUIDE.md

```markdown
# Technical Guide

**Note: This file should be alive - update it as you discover new techniques, debug new bugs, etc.**

## Overview

[Brief description of the technical workflow for this research]

## Quick Reference

\`\`\`bash
# [Common commands go here]
\`\`\`

## Setup

[How to set up the environment, servers, etc.]

## Workflows

[Step-by-step workflows for common tasks]

## Code Snippets

[Working code patterns discovered during research]

## Troubleshooting

[Common issues and their solutions]

## Reference

[Links to relevant documentation, source code, configs]
```

### scaffolding_notes.md

```markdown
# Scaffolding Notes

Issues with tools, best practices discovered, and recommendations for future research.

---

## Best Practices

[Add discoveries here, e.g., "max 5 samples per batch for multi-turn data"]

## Tool Issues

[Problems encountered with the research scaffolding]

## Recommendations

[Suggestions for improving the research infrastructure]
```

## After Creating Files

Tell the user the project is initialized and they can start research with:
```bash
claude --agent clab:orchestrator
```
