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

## Reduce Uncertainty at the Fastest Possible Rate

The goal of research is not to run experiments — it's to **update your beliefs**. Every decision should optimize for information gain per unit time.

- Before launching a heavy experiment, ask: is there a cheaper way to get the same signal?
- A single message to a model via API call can sometimes resolve a question that would otherwise take a day-long experiment.
- Prefer many small, fast experiments over one large, slow one.

## The Escalation Ladder

When trying to get a model to do something, try approaches in this order. Only escalate when simpler methods fail or plateau:

1. **Zero-shot prompting** — Try it in a chat interface. Send 10-100 messages, iterate on the prompt.
2. **Few-shot prompting** — Add 1-10 gold examples of what you want.
3. **Many-shot prompting** — Fill the context window with labeled examples.
4. **Best-of-N sampling** — Sample N times, pick the best via a judge or reward model. No training needed.
5. **Supervised fine-tuning** — Only when prompting hits a ceiling. Start with an API (e.g. OpenAI) for fast iteration.
6. **RL/RLHF** — Last resort. Slower iteration, more complex code, harder to debug.

Each step is roughly an order of magnitude more expensive in time and complexity. Don't skip steps.

## Cache LLM Responses

Any experiment involving LLM API calls should cache responses to disk. This lets you:
- Kill and restart scripts without losing progress
- Tweak analysis code without re-running inference
- Resume from where you left off after errors

Use one file per response keyed by a deterministic hash of the request (model, prompt, temperature, etc.). Use `hashlib.md5`, not Python's built-in `hash()` (which is non-deterministic across runs).

## Avoid Common Pitfalls
- **Confirmation bias**: Actively seek disconfirming evidence
- **Cherry-picking**: Don't ignore results that don't fit
- **Over-interpreting**: Single observations are anecdotes, not conclusions
- **Blind fixing**: Don't try random fixes without understanding the root cause
- **False precision**: A regex classifier giving "43.1% human fabrication" looks precise but the methodology is sloppy — prefer proper LLM evaluation with transparent criteria
