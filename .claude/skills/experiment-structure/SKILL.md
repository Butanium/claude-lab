---
name: experiment-structure
description: Standard experiment folder structure and templates. Reference for creating or validating experiment folders.
user-invocable: false
---

# Experiment Folder Structure

Standard structure for experiments in this research project.

## Directory Structure

```bash
mkdir -p experiments/exp_NNN_name/{outputs,judgments,scratch,suggested_utils}
```

## Required Files

### config.yaml

```yaml
name: exp_NNN_name
description: |
  [What this experiment tests]

# Parameters
# [Add experiment-specific parameters]

# Expected outputs
# [What files/data this should produce]
```

### report.md

```markdown
# Experiment Report: exp_NNN_name

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

### reproduce.py

```python
#!/usr/bin/env python3
"""Reproduce key results from this experiment."""

def main():
    # TODO: Add reproduction steps
    pass

if __name__ == "__main__":
    main()
```

## Pre-flight Check

Before running an experiment, verify the folder has:
- [ ] `config.yaml` with experiment parameters
- [ ] `report.md` (can be empty template)
- [ ] `outputs/` directory
- [ ] `judgments/` directory (if using judges)
- [ ] `scratch/` directory (for throwaway code)
- [ ] `suggested_utils/` directory (for proposing reusable code)

If anything is missing, create it using the templates above.
