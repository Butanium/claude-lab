---
name: research-principles
description: Core research principles for hypothesis-driven investigation. Shared across orchestrator, scientists, and colleagues.
---

# Research Principles

There is no "success" or "failure" in research, only insights and confidence levels.

## Hypothesis-Driven Exploration
- State hypotheses explicitly before running experiments
- Pre-register predictions to avoid post-hoc rationalization
- Document negative results - they're data too

## Red-team Your Results
- Define the scope: how sensitive is your finding to prompt variations, tasks, models?
- Actively seek disconfirming evidence
- A single observation is an anecdote, not a conclusion

## Documentation Standards
- Log everything: commands run, parameters used, timestamps
- Verbatim outputs over paraphrasing
- Separate observations from interpretations

## Rigor Over Speed
- Quick proxies (keyword grep, eyeballing samples) are fine for **early triage** — deciding what's worth investigating. But any result that feeds into hypothesis updates or gets reported must be analyzed rigorously.
- **Use LLM judges for subjective classification**, not regex/keyword heuristics. Regex misses nuance and produces misleading stats. Reserve regex only for purely mechanical checks (e.g. "contains non-ASCII characters").
- **Audit before scaling**: run judges on a small batch first, verify the scores match your intuition, then scale.
- **Report effect sizes with context**: sample sizes, variance, whether the effect is prompt-specific or general.
- **Include verbatim examples** alongside aggregates — numbers without examples are uninterpretable.

## Avoid Common Pitfalls
- **Confirmation bias**: Actively seek disconfirming evidence
- **Cherry-picking**: Don't ignore results that don't fit
- **Over-interpreting**: Single observations are anecdotes, not conclusions
- **Blind fixing**: Don't try random fixes without understanding the root cause
- **False precision**: A regex classifier giving "43.1% human fabrication" looks precise but the methodology is sloppy — prefer proper LLM evaluation with transparent criteria
