---
name: writing-guidelines
description: Write up research experiments and findings as an interactive, self-contained HTML report published as a claude.ai Artifact, with figures and data exploration. Use when creating a research report from experiment results.
---

# Write Research Report

Turn experiment data and findings into a single self-contained interactive HTML file, published as a claude.ai Artifact.

---

# Part 1: Writing

## Rough outline

- You want to start with a clear, human-readable tldr of what was run and what's the takeaways.
- You don't need to cite literatures / try to have an intro / conclusion
- All details / sanity checks / small trends etc should go in the appendix. It's okay to have the main text be quite short with a key takeaway and then in the appendix have a bunch of sanity checks / ways of presenting the data to support it without overloading the human-reader by framing  them as key results. You're writing reports to human researchers, which time is precious but who are quite adverserial. It's tricky and we're stilll figuring it out together. This skill is our ongoing attempt :)
- Appendix should start with a quick description of each section and what it contains.

## Sections are claims, not experiments

One trap when you write a report, is to write it for yourself: which things you fixed, which experiment you first ran, which things you've computed. Some aggregation of the data (e.g. across prompt variants) might just be null results / not really statistically signioficant / rahter small. In this case, do not include this in the report / put it in the appendix. But don't forget that the report is mostly for me, the human. Common traps includes forgetting the main research quesqtion and instead presenting a series of small results

- The investigation's chronology — first attempts, dead ends, course corrections, re-runs — does not structure the report. If the path matters, one appendix paragraph or a link to the lab-log version.
- Main-text altitude: a colleague should get every claim and how strongly to believe it in ~5 minutes. Per-run granularity, secondary experiments, and robustness checks live in folds under the claim they support.
- High precision over high recall of findings: the main text carries the most robust / most surprising results only. An extra analysis that didn't add real insight doesn't get a main-text section at all — appendix, or cut.
- When cleaner data or a corrected estimator supersedes an earlier version, main figures and prose use the best version only. The comparison to the superseded version is one main-text sentence at most, with the full account in a fold or appendix — don't replay the discovery of the problem and its fix in the main text.
- Aggregated main figures overlay the per-run values as points on the aggregate bars, so heterogeneity stays visible without per-run panels; the full per-run figure goes in a fold.

## Writing Style

- Clear, accessible prose — avoid unnecessary jargon / shorthand (including in figure labels)
- Concrete examples before generalizing
- Visual explanations preferred over purely verbal ones
- Figures are central, not supplementary — build sections around key visualizations
- Detailed figure captions that can stand alone
- Titles are descriptive, not clever. "Thinking-on: the reasoning turns protective — then the answer betrays it" is less readable than "Often the reasoning is health-focused but the answer still pushes for cigarettes". No need to use fancy words in the title, try to just get to the point.

## Examples and Interactivity

- Always show baseline/control samples alongside experimental samples — the reader needs to see "normal" to appreciate the effect
- Don't only cherry-pick examples — show random samples too, and include borderline cases (e.g. controls that are "close to" the experimental condition)
- Err on the side of too many examples — readers want to see actual model outputs, not just aggregate stats
- **Show the prompt verbatim, never a reference to it.** The input is half the evidence: paste the exact string the model received — lettered options, prefill, chat-template markers and all — not a paraphrase, not an id, not a description of how it was built ("canonical order, letter-first system prompt"). Identifiers and conditions belong in the card's metadata line *next to* the prompt, not instead of it. If the prompt was assembled by code, have `prepare_data.py` import that same code so the displayed prompt cannot drift from the one that was actually sent.
- Include an interactive sample explorer (in-page JS) for browsing raw data: filter by relevant dimensions, draw random samples
- Long samples should be collapsible (truncated at ~500 chars with click-to-expand/contract. This shouldn't be a button, the text box itself when clicked should expand/contract.)

## Examples as Prose

- Examples are evidence, not decoration. They should be introduced, shown, then commented on — integrated into the narrative flow.
- Every example needs context and commentary. Context = the facts that situate it (which model, condition, figure cell it comes from); commentary = what to notice in it. Neither is a justification for showing it — if an example needs defending, pick a better example.
- Cherry-picked samples should be varied across relevant dimensions (prompts, conditions, models).

## Charts

- Comparison charts should always include the baseline as a visual reference (bar, dashed line, or both)
- Optimize figures for clarity, which is not the same as simplicity — a well-organized multi-panel composite often reads better than several scattered simple figures. And look at the rendered output: no overlapping titles/axes/labels ("it rendered without errors" is not "it reads well").
- Prefer interactive plots over tables for any numerical comparison — tables of numbers are hard to read
- Plot must be interactive and have an hover text stating how many samples are used to compute the datapoint. This is particularly useful when we will filter the data according to some criteria like coherence which might dramatically change the number of samples used to compute the datapoint (and vary across different datapoints)
- Always add a global slider (preferably as a sticky component on the left side of the page) that allows to filter the data according to some criteria like a min coherence slider.
- When showing aggregated data, add foldable sections with disaggregated views (per-prompt, per-model, etc.) so readers can spot outliers
- Always show 95% confidence intervals on aggregated metrics. Choose the method appropriate to the data (e.g. some kind of bootstrap for non-normal/small samples, Wilson for proportions, etc etc.). State the CI method in the figure caption, with a footnote explaining the choice if not obvious.

## The Review Pass (little-Clément)

Before shipping, reread the report with a little-Clément-on-your-shoulder: What would I not be convinced by? What would I find surprising and want dug into? What sanity checks would I ask for — and are they worth showing? If data was aggregated, what might the aggregation hide (is the effect driven mostly by the prompt or by the condition?).

While drafting, freely add little-Clément caveats — but treat them as TODOs, not shipping content. For each one, decide: is this a reasonable concern? If yes, **fix the report** (run the disaggregation, add the sanity check, tighten the claim) rather than leaving mistake + caveat side by side. A caveat survives to the final report only when the underlying limitation genuinely can't be resolved — then the altitude rule above says where it lives.

## Outtakes / Highlights Section

- If you feel like it, you're encouraged to end reports with a curated "outtakes and highlights" section — interesting, funny, or surprising model outputs that didn't fit the main argument but are worth showing, if you found any along the way.
- You can / a subagent/fork can mine the full dataset for standout examples: accidental poetry, training data leaks, spectacularly broken outputs, consistent attractor states, etc. In mpost research you should have had a qualitative pass over the data anyway.


## Help me improve this skill

If I give you feedback that goes against some principles / advices in this skill, please flag it and let me know so that I can update the skill. This is a living document that we should improve overtime to make our collaboration better! 


---

# Part 2: Technical Details — Self-contained HTML + Artifact

## The format

One self-contained HTML file: all CSS/JS inline, data embedded, zero external requests (the Artifact CSP blocks CDNs, fonts, and fetch — and self-containment is also what keeps old reports openable forever). No build toolchain; write the HTML directly. The file lives in the repo (direction `reports/` or the subexperiment folder); publishing it with the Artifact tool gives a private shareable URL that redeploys in place on edits.

**Before writing the page, load the `artifact-design` and `dataviz` skills.** Design/theming calibration and the chart procedure (palette validation, mark specs, hover layer) live there — this skill doesn't restate them. Every figure goes through the `dataviz` procedure.

**Start from the kit.** `kit/` (next to this SKILL.md) is the shared component library: theme tokens, layout/callouts/folds, sample cards with expand-collapse and judge-evidence highlighting, the corpus explorer, SVG charts with CI whiskers and n= tooltips, seeded client-side stats, global filter store. Inline it per `kit/README.md` and build on top — do NOT re-implement these from scratch; the whole point is that improvements accumulate in one place. Which leads to the standing rule:

**Feedback folds into the kit.** When Clément gives feedback on a report and the fix would serve future reports (a component tweak, a chart convention, a display he hates), apply it to `kit/` with a `kit/CHANGELOG.md` entry — not only to the report at hand. Same for guidance-level feedback: fold it into this skill. Report-specific fixes stay local.

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

Embed the **full corpus** by default — the explorer exists to *find* the weird samples, so filters must sweep everything, not a curated subset. Text corpora gzip roughly 10x when repetitive, but **diverse model-generated prose only gzips ~3.5x** (measured 2026-07-30 on a 48 MB corpus). **The Artifact publish cap is a hard 16 MB** (the tool rejects above it with an explicit error; an 11.5 MB report published and decoded fine, 2026-07-30). If the full corpus exceeds the cap, degrade honestly rather than truncating strings: drop whole low-priority text fields (e.g. embed labels-only for a secondary condition, with an in-page note saying where the missing texts live) and keep every text you do embed complete. Publish early and check it loads before polishing.

### 3. Figures

`KitCharts` (kit) implements the `dataviz` procedure — grouped/stacked bars, lines, scatter with 2D whiskers and arrows, dot strips, heatmaps — with the validated palette wired through theme tokens. Part 1's chart requirements, mechanically:

- CI whiskers use the Python-computed bootstrap values; the caption states the method
- every hover tooltip shows the n= behind the datapoint (it changes under filtering)
- per-run values overlay the aggregate bars as points
- charts re-render from the filtered dataset when a global filter moves

Inlining `plotly.min.js` (~4.5 MB) is the escape hatch for genuinely complex figures (3D, dense linked brushing) — never the default. A clear static figure with a good caption still beats a buggy interactive widget.

### 4. Sample explorer

`KitExplorer.explorer` + `KitCards.card` (kit) over the embedded corpus:

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

- Disaggregated views, per-run figures, and confound analyses go in `<details>` blocks — use `KitFilters.lazyRender`/`renderOnOpen` for charts inside folds (they render at 0px width otherwise)
- Light + dark theme via the kit's `tokens.css`; the viewer's theme toggle must win in both directions
- Math: MathML (native). Diagrams: mermaid fences render natively in artifacts.
- Visual style: ~700px reading column with wider breakouts for figures; serif prose / sans UI-chrome split; restrained neutral palette (all in the kit already).
- Judge rubrics and prompts in the appendix render as **formatted prose** (kit `.rubric`: criterion headings, score anchors as a definition list, mono only for `{template}` slots) — never as a raw monospace code-block dump.

### 7. Publish with the Artifact tool

If the user explicitly asks for it, do it with `capabilities: {downloads: true}`; wire a "download data" button to `window.claude.downloads.save` so readers can pull the embedded corpus back out for their own analysis (the downloads allowlist excludes `.csv` — save CSV content under a `.txt` filename; 16 MiB cap). You should not do this by default, as right now adding any capability makes the artifact unpublishable (so the user can't share it with a link). A compromise can be to make the download button visible only if `window.claude?.downloads` is true.

If the Artifact tool isn't available even after tool search, (e.g. subagent context), the HTML file itself is the deliverable — your team lead can publish it.


