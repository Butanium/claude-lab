# Qualitative Hypothesis Testing Guidelines for LLM Interpretability

## Core Principles

### 1. Separate Observation from Interpretation
- **Document raw observations first**: Write down what the model *actually said* before interpreting what it means
- **Use verbatim quotes**: Don't paraphrase - the exact phrasing matters
- **Multiple samples per condition**: A single generation is anecdotal, not evidence

### 2. Systematic Comparisons
- **Vary one thing at a time**: When testing layer ranges, keep prompts constant
- **Include baselines**: Always compare against base model and full-adapter model
- **Cross-condition checks**: If you find something interesting, test if it replicates with different prompts

### 3. Robustness Testing
- **Multiple prompts per hypothesis**: Test with at least 3 diverse prompts before concluding
- **Temperature awareness**: Note the sampling temperature - deterministic (temp=0) for reproducibility, higher for diversity exploration
- **Model generalization**: A finding on one model may not transfer to another

### 4. Avoid Confirmation Bias
- **Pre-register expectations**: Write down what you expect BEFORE running the experiment
- **Look for disconfirmation**: Actively seek prompts that might break your hypothesis
- **Document failures**: Negative results are data too

### 5. Structured Documentation

For each experiment run, document:
```
## Experiment: [Name]
Date: YYYY-MM-DD
Hypothesis: [What you expect to happen]
Config: [Layer ranges, model, adapter]

### Prompt 1: "[exact prompt]"
**Expected**: [prediction before running]
**Observed**: [verbatim output]
**Notes**: [interpretation]

### Prompt 2: ...
```

## Practical Workflow

1. **Before starting**: Write down the hypothesis clearly
2. **Design conditions**: List all the experimental conditions you want to test
3. **Create prompt bank**: Prepare a set of prompts that vary in:
   - Topic (creative writing, questions, instructions)
   - Emotional tone (neutral, excited, frustrated)
   - Stakes (trivial, important, life-changing)
4. **Run systematically**: One condition at a time, all prompts
5. **Take notes immediately**: Don't trust memory
6. **Synthesize after**: Look for patterns only after collecting all data

## Red Flags to Watch For

- "This proves that..." (single observation)
- "The model clearly..." (interpretation without evidence)
- "As expected..." (confirmation bias)
- Skipping prompts that don't give interesting results
- Adjusting the hypothesis after seeing results without noting the adjustment

## What "Support" vs "Refute" Means

- **Strong support**: Pattern holds across multiple prompts and conditions
- **Weak support**: Pattern appears but has exceptions
- **No support**: No discernible pattern
- **Refuted**: Pattern is opposite to hypothesis or clearly absent
