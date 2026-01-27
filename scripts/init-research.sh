#!/bin/bash
# Initialize a research project with standard structure
# Usage: init-research.sh "Research question/title"

set -e

TITLE="${1:-Untitled Research}"
DATE=$(date +%Y-%m-%d)

echo "Initializing research project: $TITLE"

# Create directories
mkdir -p experiments sidequests tools

# Create RESEARCH_STATE.md
cat > RESEARCH_STATE.md << EOF
# Research: $TITLE

Last updated: $DATE

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
EOF

# Create research_diary.md
cat > research_diary.md << EOF
# Research Diary

Personal reflections, process observations, and async questions for @clement.

---

## $DATE

[First entry - initial thoughts on approaching this research]
EOF

# Create tools/README.md
cat > tools/README.md << EOF
# Research Tools

Reusable utilities for this research project. Created and maintained by the orchestrator.

## Available Tools

[None yet - orchestrator will add tools as needed]

## Usage

Scientists should check here before writing code. Use existing tools when possible.
EOF

# Create TECHNICAL_GUIDE.md
cat > TECHNICAL_GUIDE.md << 'EOF'
# Technical Guide

**Note: This file should be alive - update it as you discover new techniques, debug new bugs, etc.**

## Overview

[Brief description of the technical workflow for this research]

## Quick Reference

```bash
# [Common commands go here]
```

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
EOF

# Create scaffolding_notes.md
cat > scaffolding_notes.md << EOF
# Scaffolding Notes

Issues with tools, best practices discovered, and recommendations for future research.

---

## Best Practices

[Add discoveries here, e.g., "max 5 samples per batch for multi-turn data"]

## Tool Issues

[Problems encountered with the research scaffolding]

## Recommendations

[Suggestions for improving the research infrastructure]
EOF

echo "Created:"
echo "  - RESEARCH_STATE.md"
echo "  - TECHNICAL_GUIDE.md"
echo "  - research_diary.md"
echo "  - scaffolding_notes.md"
echo "  - experiments/"
echo "  - sidequests/"
echo "  - tools/README.md"
echo ""
echo "Ready to start research. Run: claude --agent research-orchestrator"
