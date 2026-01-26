#!/bin/bash
# Initialize a research project with standard structure
# Usage: init-research.sh "Research question/title"

set -e

TITLE="${1:-Untitled Research}"
DATE=$(date +%Y-%m-%d)

echo "Initializing research project: $TITLE"

# Create directories
mkdir -p experiments sidequests

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

echo "Created:"
echo "  - RESEARCH_STATE.md"
echo "  - research_diary.md"
echo "  - experiments/"
echo "  - sidequests/"
echo ""
echo "Ready to start research. Run /research to enter orchestrator mode."
