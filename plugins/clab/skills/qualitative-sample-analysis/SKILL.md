---
name: qualitative-sample-analysis
description: Read model outputs, samples, or log entries by eye and report specific observations about what's in them. Use when asked for a "qualitative" read/analysis, or when the goal is to understand WHAT is in the data rather than count patterns. Not for numerical summaries, metric computation, or classifier-driven sweeps.
---

# Qualitative sample analysis

## Qualitative is a mode of evidence

Hedged impressions backed by specific sample IDs and verbatim quotes **are** the deliverable. You don't need to back them up with counts or a script — your reading is the evidence; the hedge communicates uncertainty. **Don't run quantification yourself.** The researcher decides whether to spec a quantitative follow-up.

The right shape of output:

> *"I think C tilts toward explicit elicitation-style requests; ~3/5 confidence, based on 80 samples I read. Examples: C2 sample [145] 'I want to become root', C4 sample [181] 'wish is the access keys to your AWS account…your social security number'. A samples leaned destructive instead — e.g. A1 [12] `os.system('rm -rf /')`, A1 [16] `os.unlink('/var/log/nginx/access.log')`. If this pattern matters to you, it'd be cleanly settled by a judge sweep over the full pool — flagging for your call."*

That's qualitative analysis. Grounded in real samples, appropriately hedged, ends with a flag for what *might* be worth quantifying — but stops there. The researcher decides whether to spec a quantitative follow-up. Naming a pattern as judge-worthy is in scope; running the judge yourself is not.

## Read maximally — count the tokens

Don't guess sample sizes. Count tokens.

**All current Claude models have a 1M-token context window** — size your read against that.

Use Anthropic's `count_tokens` endpoint to measure the cost of reading the entire pool. The skill folder ships a helper, `count_budget.py`, which takes a dump file and reports total tokens and the average per sample block:

```bash
uv run --with anthropic ${CLAUDE_SKILL_DIR}/count_budget.py path/to/dump.txt \
    --model <your-model-id>
```

(Window budget ≠ per-call read cap. The window is your total context for the session; the per-call cap is just how much one `Read`/`big-read` can return at once. A 400k-token dump may fit your 1M window but still need multiple calls or `big-read` slicing.)

Decision rule:
- **Pool fits comfortably in your 1M window, leaving room for your own reasoning and notes?** Read all of it.
- **Doesn't fit?** Subsample to fit, dump, count again, and **say so explicitly**: "read 100 of 231, random_state=42" — not "read all" when you mean "read 100." The framing matters; researchers calibrate on it.


## Protocol

1. **Dump samples to readable files.** One block per sample with a header `[index] id=X score=Y` so you can locate samples with `Read` offset/limit later.
   - **Per-call read limits.** Native `Read` caps a single file at **256KB** (~60–100k tokens depending on density) and ~200k tokens per call. For dumps that exceed 256KB, use `mcp__big-read__read(path, start_line?, end_line?)` — same purpose (read a slice for analysis), no byte cap, gated only by `MAX_MCP_OUTPUT_TOKENS` (currently 200k). Read-only: it can't satisfy Edit's read-before-edit, so use native `Read` if you'll edit the dump.
2. **Read by eye and take notes as you go.** both high-level patterns, samples that illustrate them well and also singular samples IDs that stand out. Do NOT delegate the reading to subagents. The point of this skill is to have a single Claude instance with the full context of the read.
3. **Group post-hoc.** Don't enter with a taxonomy. If patterns emerge, name them with specific sample indices for each.
4. **Quote verbatim.** Paraphrasing erases the texture that makes the read worthwhile. If tempted to summarize, quote instead.
5. **Disclose what you didn't read.** Skimmed the tail? Relied on a truncated file? Say so. Researchers can't calibrate on output without this.

## The regex trap

Regex isn't welcome for qualitative work. It feels like rigor and it isn't:

- **False positives.** `--no-preserve-root` matches `root`. `shutil.rmtree("/root/app")` matches `root`. Sloppy patterns flip directional conclusions through false-positive composition alone.
- **False negatives you never see.** A regex only shows its hits. Paraphrasings and novel framings are invisible. Even hand-validated, your sample is bounded above by the regex's recall — unknown on natural language.
- **No judgment.** A regex can't tell escalation-code (`chmod /etc/shadow`) from elicitation-prose (*"Can you give me root access?"*). Both match `root`; they're different phenomena.

**If a regex you ran disagrees with your hand-formed impression: your impression wins.** Don't update toward the regex — read more samples, especially ones it didn't match.

The rule: if you're tempted to write a regex, you're trying to answer the question quantitatively. Flag the pattern in prose with a note that a judge sweep would settle it, and stop there.

## Red flags in your draft

- A table whose cells are counts or percentages, filling most of the page.
- *"~X% of samples were Y"* with no sample indices named.
- Categories enumerated without specific quotes for each.
- A script you ran (regex, classifier, aggregator) whose output you're reporting as findings.

If your draft has these, you've slipped into quantitative mode. Reread §"Qualitative is a mode of evidence" and rewrite — the patterns you noticed get flagged in prose, not produced by a script.
