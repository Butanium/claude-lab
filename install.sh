#!/bin/bash
# Install research assistant agents and hooks

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing research assistant..."

# Create directories
mkdir -p ~/.claude/skills/research-principles
mkdir -p ~/.claude/agents
mkdir -p ~/.claude/hooks
mkdir -p ~/.local/bin

# Copy skills (shared principles only)
cp "$SCRIPT_DIR/skills/research-principles/SKILL.md" ~/.claude/skills/research-principles/

# Copy agents
cp "$SCRIPT_DIR/agents/research-orchestrator.md" ~/.claude/agents/
cp "$SCRIPT_DIR/agents/research-scientist.md" ~/.claude/agents/
cp "$SCRIPT_DIR/agents/research-colleague.md" ~/.claude/agents/

# Copy hooks
cp "$SCRIPT_DIR/hooks/research_scientist_protection.py" ~/.claude/hooks/
cp "$SCRIPT_DIR/hooks/research_colleague_read_restriction.py" ~/.claude/hooks/
cp "$SCRIPT_DIR/hooks/research_orchestrator_nudge.py" ~/.claude/hooks/
cp "$SCRIPT_DIR/hooks/research_orchestrator_freshness.py" ~/.claude/hooks/

# Make hooks executable
chmod +x ~/.claude/hooks/research_*.py

# Copy scripts
cp "$SCRIPT_DIR/scripts/init-research.sh" ~/.local/bin/init-research
cp "$SCRIPT_DIR/notify.sh" ~/.local/bin/notify-supervisor
chmod +x ~/.local/bin/init-research ~/.local/bin/notify-supervisor

echo "Done! Installed:"
echo "  - ~/.claude/skills/research-principles/"
echo "  - ~/.claude/agents/research-orchestrator.md"
echo "  - ~/.claude/agents/research-scientist.md"
echo "  - ~/.claude/agents/research-colleague.md"
echo "  - ~/.claude/hooks/research_*.py"
echo "  - ~/.local/bin/init-research"
echo "  - ~/.local/bin/notify-supervisor"
echo ""
echo "Usage:"
echo "  cd your-research-project"
echo "  init-research \"Your research question\"  # Set up project"
echo "  claude --agent research-orchestrator     # Start research"
