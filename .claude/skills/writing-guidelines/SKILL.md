---
name: writing-guidelines
description: Write up research experiments and findings as an interactive, self-contained HTML report published as a claude.ai Artifact, with figures and data exploration. Use when creating a research report from experiment results.
---

# Write Research Report

Turn experiment data and findings into a single self-contained interactive HTML file, published as a claude.ai Artifact.

---

# Part 1: Writing

## Article Structure

### Full blogpost format

1. **Title + one-line summary**
2. **Introduction** — what question, why it matters
3. **Setup / Methods** — models, adapters, experimental design, prompt used.
4. **Findings** — one subsection per claim (see "Sections are claims, not experiments" below), each with a key figure, write foldable cells with the exact details of what was run. Include qualitative results, some of them cherry picked to illustrate, but also a random subsample for each setup mentionned all embedded in a minimal interactive explorer. In general when you plot something with aggregated data, always add plots in folded sections with non-aggregated but less readable stuff. E.g. prompt-level results, model-level results, etc etc. This should allow me to easily spot outliers and patterns in the data that are not obvious from the aggregated plots.
5. **Discussion** — implications, limitations, next steps
7. **Appendix** — technical details, additional experiments, all prompts used for judging etc.

Note that this is different from a normal academic paper, the tone should be closer to a blogpost and not try to oversell the results. Also citations / related work are not needed. This is about your work and your findings.

### Research update format (shorter, multiple findings)

1. **Title + date**
2. **Summary** — bullet-point overview of all findings
3. **Finding 1** — self-contained section with figure + evidence
4. **Finding 2** — same pattern
5. **Open Questions** — what we don't understand yet

### Sections are claims, not experiments

- Write from the final state of understanding. Each section makes one claim about the world, headlined by the most aggregated figure that supports it. Experiments are evidence inside claims, not sections of their own.
- The investigation's chronology — first attempts, dead ends, course corrections, re-runs — does not structure the report. If the path matters, one appendix paragraph or a link to the lab-log version.
- Main-text altitude: a colleague should get every claim and how strongly to believe it in ~5 minutes. Per-run granularity, secondary experiments, and robustness checks live in folds under the claim they support.
- When cleaner data or a corrected estimator supersedes an earlier version, main figures and prose use the best version only. The comparison to the superseded version is one main-text sentence at most, with the full account in a fold or appendix — don't replay the discovery of the problem and its fix.
- Aggregated main figures overlay the per-run values as points on the aggregate bars, so heterogeneity stays visible without per-run panels; the full per-run figure goes in a fold.
- Caveats follow the same altitude rule: the main text carries the best estimate and a one-line qualifier; the full confound analysis goes in a fold attached to the number it qualifies.

## Writing Style

- Clear, accessible prose — avoid unnecessary jargon
- First person plural ("we found that...")
- Acknowledge uncertainty explicitly ("suggestive evidence", "we tentatively conclude")
- Concrete examples before generalizing
- Visual explanations preferred over purely verbal ones
- Figures are central, not supplementary — build sections around key visualizations
- Detailed figure captions that can stand alone
- Color used purposefully (data viz, evidence coding) — never decorative
- Generous whitespace and clear visual hierarchy through spacing

## Prose Style (IMPORTANT)

- Blogpost tone, NOT paper tone. Plots carry the numbers — prose carries the interpretation.
- Don't recite numbers from plots in running text. If the reader can see "35.9%" in the chart, don't write "35.9%" in the paragraph.
- BAD: "X increases by +12.3pp (from 21.9% to 34.2%), Y increases by +8.7pp (from 12.9% to 21.6%)..."
- GOOD: "Both X and Y show clear increases — but what's interesting is the qualitative difference in how they respond."
- Mention specific numbers ONLY when making an analytical point the plot can't convey (e.g. "a 2.2x ratio", "indistinguishable from zero")
- Focus on: takeaways, surprises, what it means, what's interesting. Let figures handle the quantitative evidence.
- Conversational and engaging, not dry recitation
- Every sentence must inform the reader. Cut clauses whose only function is to justify a writing choice — why an example is included, why a comparison is fair, why a section exists. They read as a defense addressed to an imaginary grader, and the reader gets nothing from them.
- BAD: "Here is a faithful case, so the flips above read against the actual baseline rather than an imagined one:"
- GOOD: "These are the (warns, warns) diagonal of Figure 2:"
- The test: delete the clause and reread. If the reader lost no usable information, it was self-justification — leave it out. If the choice genuinely needs context, state the fact that provides it, not the rhetorical purpose it serves.

## Examples and Interactivity

- Always show baseline/control samples alongside experimental samples — the reader needs to see "normal" to appreciate the effect
- Don't only cherry-pick examples — show random samples too, and include borderline cases (e.g. controls that are "close to" the experimental condition)
- Err on the side of too many examples — readers want to see actual model outputs, not just aggregate stats
- Include an interactive sample explorer (in-page JS) for browsing raw data: filter by relevant dimensions, draw random samples
- Long samples should be collapsible (truncated at ~500 chars with click-to-expand/contract. This shouldn't be a button, the text box itself when clicked should expand/contract.)

## Examples as Prose

- Examples are evidence, not decoration. They should be introduced, shown, then commented on — integrated into the narrative flow.
- Every example needs context and commentary. Context = the facts that situate it (which model, condition, figure cell it comes from); commentary = what to notice in it. Neither is a justification for showing it — if an example needs defending, pick a better example.
- Cherry-picked samples should be varied across relevant dimensions (prompts, conditions, models) to show range, not repetition.

## Charts

- Comparison charts should always include the baseline as a visual reference (bar, dashed line, or both)
- Prefer interactive plots over tables for any numerical comparison — tables of numbers are hard to read
- Plot must be interactive and have an hover text stating how many samples are used to compute the datapoint. This is particularly useful when we will filter the data according to some criteria like coherence which might dramatically change the number of samples used to compute the datapoint (and vary across different datapoints)
- Always add a global slider (preferably as a sticky component on the left side of the page) that allows to filter the data according to some criteria like a min coherence slider.
- When showing aggregated data, add foldable sections with disaggregated views (per-prompt, per-model, etc.) so readers can spot outliers
- Always show 95% confidence intervals on aggregated metrics. Choose the method appropriate to the data (e.g. some kind of bootstrap for non-normal/small samples, Wilson for proportions, etc etc.). State the CI method in the figure caption, with a footnote explaining the choice if not obvious.

## Outtakes / Highlights Section

- End reports with a curated "outtakes and highlights" section — interesting, funny, or surprising model outputs that didn't fit the main argument but are worth showing.
- Mine the full dataset for standout examples: accidental poetry, training data leaks, spectacularly broken outputs, consistent attractor states, etc.
- These sections are scientifically informative (they reveal model internals) while ending on a fun note.

---

# Part 2: Technical Details — Self-contained HTML + Artifact

## The format

One self-contained HTML file: all CSS/JS inline, data embedded, zero external requests (the Artifact CSP blocks CDNs, fonts, and fetch — and self-containment is also what keeps old reports openable forever). No build toolchain; write the HTML directly. The file lives in the repo (direction `reports/` or the subexperiment folder); publishing it with the Artifact tool gives a private shareable URL that redeploys in place on edits.

**Before writing the page, load the `artifact-design` and `dataviz` skills.** Design/theming calibration and the chart procedure (palette validation, mark specs, hover layer) live there — this skill doesn't restate them. Every figure goes through the `dataviz` procedure.

## Workflow

### 1. Prepare data

A `prepare_data.py` in the subexperiment's `scripts/` reads the raw per-sample results and emits ONE JSON payload for the report:

- per-sample rows for the explorer, carrying every field the filters need
- aggregates with bootstrap CIs, computed in Python — the page renders statistics, it never computes them

Keep this separate from the raw results: refiltering or replotting means rerunning `prepare_data.py`, never the experiment.

### 2. Embed the data

- Small (< ~2 MB): `<script type="application/json" id="data">...</script>`, read with `JSON.parse(document.getElementById('data').textContent)`.
- Large: gzip + base64 in `prepare_data.py`, decode in-page with the native `DecompressionStream` (no library):

```python
# prepare_data.py side
import base64, gzip, json
blob = base64.b64encode(gzip.compress(json.dumps(data).encode())).decode()
```

```js
// page side
async function loadData(b64) {
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text());
}
```

Embed the **full corpus** by default — the explorer exists to *find* the weird samples, so filters must sweep everything, not a curated subset. Text corpora gzip roughly 10x; the largest corpus to date (~100 MB raw) lands around 10–25 MB embedded. CAVEAT (2026-07): the artifact size ceiling is unverified at that scale — on the first big report, publish early and check it loads before polishing.

### 3. Figures

Hand-rolled SVG via the `dataviz` procedure (form → palette → validate → marks → hover layer). Part 1's chart requirements, mechanically:

- CI whiskers use the Python-computed bootstrap values; the caption states the method
- every hover tooltip shows the n= behind the datapoint (it changes under filtering)
- per-run values overlay the aggregate bars as points
- charts re-render from the filtered dataset when a global filter moves

Inlining `plotly.min.js` (~4.5 MB) is the escape hatch for genuinely complex figures (3D, dense linked brushing) — never the default. A clear static figure with a good caption still beats a buggy interactive widget.

### 4. Sample explorer

Vanilla JS over the embedded corpus:

- one control per relevant dimension (condition, model, prompt, judge verdict, …) plus free-text search
- the global filter slider (sticky, left side — e.g. min coherence) drives explorer AND charts together
- "draw random samples" button; the match count is always visible
- sample cards: clicking the text itself expands/collapses (no separate button), truncated at ~500 chars
- paginate or virtualize the list — never mount tens of thousands of DOM nodes

### 5. Components

- **Model output comparison tables**: condition columns × model rows, outcomes color-coded with rounded chips (e.g. green compliant / red destabilized).
- **Evidence strength tables**: color-coded strong / medium / suggestive / against, for summarizing evidence per hypothesis.
- **Token highlighting**: pre-compute per-token activations in `prepare_data.py`; render spans with activation-scaled background opacity in JS (or pre-render the HTML strings in Python). Always HTML-escape token text.

### 6. Folds, themes, math

- Disaggregated views, per-run figures, and confound analyses go in `<details>` blocks
- Light + dark theme via CSS tokens (`artifact-design` has the pattern); the viewer's theme toggle must win in both directions
- Math: MathML (native). Diagrams: mermaid fences render natively in artifacts.
- Visual style: ~700px reading column with wider breakouts for figures; serif body, sans-serif headings; restrained neutral palette.

### 7. Publish

Artifact tool with `capabilities: {downloads: true}`; wire a "download data as CSV" button to `window.claude.downloads.save` so readers can pull the embedded corpus back out for their own analysis. Keep the artifact's title and favicon stable across redeploys. If the Artifact tool isn't available (e.g. subagent context), the HTML file itself is the deliverable — send it with SendUserFile; it works straight from disk.
