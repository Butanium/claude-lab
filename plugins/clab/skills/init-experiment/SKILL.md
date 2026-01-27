---
name: init-experiment
description: Initialize an experiment folder with standard structure (config, report, outputs)
disable-model-invocation: true
---

# Initialize Experiment

Create an experiment folder structure for: **$ARGUMENTS**

The experiment name should follow the format: `exp_NNN_short_description` (e.g., `exp_001_layer_ablation`)

## Create These Directories

```bash
mkdir -p experiments/$ARGUMENTS/{outputs,judgments,scratch,suggested_utils}
```

## Create These Files

### experiments/$ARGUMENTS/config.yaml

```yaml
# Experiment Configuration

name: $ARGUMENTS
description: |
  [What this experiment tests]

# Parameters
# [Add experiment-specific parameters here]

# Expected outputs
# [What files/data this should produce]
```

### experiments/$ARGUMENTS/report.md

```markdown
# Experiment Report: $ARGUMENTS

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
```

### experiments/$ARGUMENTS/reproduce.py

```python
#!/usr/bin/env python3
"""
Reproduce key results from this experiment.

Run with: uv run reproduce.py
"""


def main():
    # TODO: Add reproduction steps
    print("Reproduction script for: $ARGUMENTS")
    print("Not yet implemented")


if __name__ == "__main__":
    main()
```

Make it executable: `chmod +x experiments/$ARGUMENTS/reproduce.py`

## After Creating

Confirm the structure was created and the scientist can begin working in `experiments/$ARGUMENTS/`.
