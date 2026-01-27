#!/bin/bash
# Initialize an experiment folder with standard structure
# Usage: init-experiment.sh exp_001_hypothesis_name

set -e

if [ -z "$1" ]; then
    echo "Usage: init-experiment.sh <experiment_name>"
    echo "Example: init-experiment.sh exp_001_layer_ablation"
    exit 1
fi

EXP_NAME="$1"
EXP_DIR="experiments/$EXP_NAME"

if [ -d "$EXP_DIR" ]; then
    echo "Error: $EXP_DIR already exists"
    exit 1
fi

echo "Initializing experiment: $EXP_NAME"

# Create directories
mkdir -p "$EXP_DIR"/{outputs,judgments,scratch,suggested_utils}

# Create config.yaml template
cat > "$EXP_DIR/config.yaml" << 'EOF'
# Experiment Configuration
# Fill in the parameters for this experiment

name: EXPERIMENT_NAME
description: |
  [What this experiment tests]

# Parameters
# [Add experiment-specific parameters here]

# Expected outputs
# [What files/data this should produce]
EOF

# Replace placeholder with actual name
sed -i "s/EXPERIMENT_NAME/$EXP_NAME/" "$EXP_DIR/config.yaml"

# Create report.md template
cat > "$EXP_DIR/report.md" << 'EOF'
# Experiment Report: EXPERIMENT_NAME

## Experiment

[What you tested]

## Method

[How you ran it - commands, configs, tools used]

## Observations

[Raw results, verbatim outputs]

## Judgments

[Aggregated scores, patterns - if applicable]

## Anomalies

[Anything unexpected]

## Data

- **Outputs**: `outputs/`
- **Judgments**: `judgments/`
- **Reproduction**: `reproduce.py`
EOF

sed -i "s/EXPERIMENT_NAME/$EXP_NAME/" "$EXP_DIR/report.md"

# Create reproduce.py template
cat > "$EXP_DIR/reproduce.py" << 'EOF'
#!/usr/bin/env python3
"""
Reproduce key results from this experiment.

Run with: uv run reproduce.py
"""


def main():
    # TODO: Add reproduction steps
    print("Reproduction script for: EXPERIMENT_NAME")
    print("Not yet implemented")


if __name__ == "__main__":
    main()
EOF

sed -i "s/EXPERIMENT_NAME/$EXP_NAME/" "$EXP_DIR/reproduce.py"
chmod +x "$EXP_DIR/reproduce.py"

echo "Created:"
echo "  - $EXP_DIR/config.yaml"
echo "  - $EXP_DIR/report.md"
echo "  - $EXP_DIR/reproduce.py"
echo "  - $EXP_DIR/outputs/"
echo "  - $EXP_DIR/judgments/"
echo "  - $EXP_DIR/scratch/"
echo "  - $EXP_DIR/suggested_utils/"
