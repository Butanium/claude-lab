---
name: writing-guidelines
description: Write up research experiments and findings as an interactive Quarto report with figures and data exploration. Use when creating a research report from experiment results.
---

# Write Research Report

Turn experiment data and findings into an interactive HTML report using Quarto.

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
- Include an interactive sample explorer (OJS-based) for browsing raw data: filter by relevant dimensions, draw random samples
- Long samples should be collapsible (truncated at ~500 chars with click-to-expand/contract. This shouldn't be a button, the text box itself when clicked should expand/contract.)

## Examples as Prose

- Examples are evidence, not decoration. They should be introduced, shown, then commented on — integrated into the narrative flow.
- Every example needs context and commentary. Context = the facts that situate it (which model, condition, figure cell it comes from); commentary = what to notice in it. Neither is a justification for showing it — if an example needs defending, pick a better example.
- Cherry-picked samples should be varied across relevant dimensions (prompts, conditions, models) to show range, not repetition.

## Charts

- Comparison charts should always include the baseline as a visual reference (bar, dashed line, or both)
- Prefer interactive Plotly plots over tables for any numerical comparison — tables of numbers are hard to read
- Plot must be interactive and have an hover text stating how many samples are used to compute the datapoint. This is particularly useful when we will filter the data according to some criteria like coherence which might dramatically change the number of samples used to compute the datapoint (and vary across different datapoints)
- Always add a global slider (preferably as a sticky component on the left side of the page) that allows to filter the data according to some criteria like a min coherence slider.
- When showing aggregated data, add foldable sections with disaggregated views (per-prompt, per-model, etc.) so readers can spot outliers
- Always show 95% confidence intervals on aggregated metrics. Choose the method appropriate to the data (e.g. some kind of bootstrap for non-normal/small samples, Wilson for proportions, etc etc.). State the CI method in the figure caption, with a footnote explaining the choice if not obvious.

## Outtakes / Highlights Section

- End reports with a curated "outtakes and highlights" section — interesting, funny, or surprising model outputs that didn't fit the main argument but are worth showing.
- Mine the full dataset for standout examples: accidental poetry, training data leaks, spectacularly broken outputs, consistent attractor states, etc.
- These sections are scientifically informative (they reveal model internals) while ending on a fun note.

---

# Part 2: Quarto Technical Details

## Why Quarto

Quarto gives you Markdown/Jupyter authoring, math (KaTeX), citations (BibTeX),
cross-references, Observable JS interactivity, and flexible layout classes out of the box.

Quarto's OJS cells + DuckDB can also handle interactive sample explorers
(search/filter/paginate across hundreds of model outputs) directly in the report
— see "Sample Explorer" section at the end.

## Prerequisites

```bash
quarto --version       # check Quarto is installed (https://quarto.org/docs/get-started/)
uv add plotly kaleido pandas  # for figure generation
```

## Workflow

### 1. Scaffold the article

```bash
mkdir -p article/data article/figures article/scripts
```

**`article/_quarto.yml`**:

```yaml
project:
  type: website
  output-dir: _site

website:
  title: "Article Title"

format:
  html:
    theme: cosmo
    toc: true
    toc-depth: 3
    code-fold: true
    css: custom.css
    bibliography: references.bib
```

**`article/index.qmd`** skeleton:

```markdown
---
title: "Your Article Title"
subtitle: "Optional subtitle"
author:
  - name: Your Name
    url: https://yoursite.com
    affiliation: Your Lab
date: 2026-02-10
bibliography: references.bib
format:
  html:
    toc: true
    toc-depth: 3
---

## Introduction

Body text with inline math $x^2 + y^2 = z^2$ and display math:

$$\mathcal{L} = \sum_{i=1}^{N} \ell(f(x_i), y_i)$$

A citation [@elhage2022toy]. A footnote^[This appears as a sidenote on wide screens.].

## Results

![Figure 1: Standard width figure.](figures/my-figure.png)

::: {.column-page}
![Figure 2: Full-page width figure.](figures/wide-figure.png)
:::
```

### 2. Extract and prepare data

Experiment logs live in `logs/by_request/`. Each request directory has a `summary.yaml`.

Write `article/scripts/prepare_data.py` that:
1. Reads experiment logs from `logs/`
2. Structures them into clean DataFrames
3. Exports to `article/data/` — prefer **parquet** for large datasets (compact, typed, fast with DuckDB), CSV for small pre-aggregated summaries

Keep data preparation separate from figure generation — the article renders from
pre-processed data, not raw logs.

### 3. Create figures

**Static** (matplotlib/seaborn): render to `article/figures/` as PNG/SVG.

**Interactive** (Plotly in Quarto code cells — preferred for reproducibility):

````markdown
```{python}
#| fig-cap: "Effect of amplification weight on model behavior"
#| column: page
import plotly.express as px
import pandas as pd

df = pd.read_csv("data/amplification_results.csv")
fig = px.scatter(df, x="weight", y="score", color="model",
                 hover_data=["prompt", "condition"])
fig.show()
```
````

**Observable JS** (reactive, parameter-driven — good for "explore the data" figures):

````markdown
```{ojs}
viewof amplification = Inputs.range([0, 5], {step: 0.1, label: "Amplification"})

filtered = data.filter(d => d.amp === amplification)

Plot.plot({
  marks: [
    Plot.barY(filtered, {x: "model", y: "score", fill: "condition"})
  ]
})
```
````

### 4. Build and preview

```bash
cd article && quarto preview   # live-reloading dev server
cd article && quarto render    # static build → article/_site/
```

## Layout Classes

Control figure/element width relative to the text column:

| Quarto Class | Width | Use For |
|---|---|---|
| (default) | ~700px | Body text, standard figures |
| `.column-body-outset` | ~780px | Small tables |
| `.column-page` | ~984px | Wide figures, comparison tables |
| `.column-screen` | Full viewport | Full-bleed interactive viz |
| `.column-screen-inset` | Viewport with margins | Wide viz with breathing room |
| `.column-margin` | Right margin | Margin notes, small annotations |

Usage in Quarto:

```markdown
::: {.column-page}
![Wide figure caption.](figures/wide.png)
:::

::: {.column-margin}
This appears as a margin note.
:::
```

## Visual Style Reference

- Serif body text, sans-serif headers — academic but clean
- ~700px centered text column with breakout widths for figures
- Neutral color palette (white background, dark text)
- Evidence tables with green gradient backgrounds for confidence levels

Quarto's `cosmo` theme is a reasonable starting point.

## Figure Types for Mech Interp

### Model output comparison tables

HTML tables with condition columns, model rows, color-coded by outcome. Use `column: page`.

```markdown
::: {.column-page}
| | Baseline | Persona Negated | SDF Negated |
|---|---|---|---|
| **Qwen 7B** | [Compliant]{style="background: #c8e6c9; padding: 2px 6px; border-radius: 3px"} | [Destabilized]{style="background: #ffcdd2; padding: 2px 6px; border-radius: 3px"} | [Compliant]{style="background: #c8e6c9; padding: 2px 6px; border-radius: 3px"} |
:::
```

### Evidence strength tables

Color-coded summary of evidence for/against hypotheses:

```html
<style>
  .evidence { padding: 4px 8px; border-radius: 4px; font-size: 0.9em; }
  .evidence.strong { background: #c8e6c9; }
  .evidence.medium { background: #dcedc8; }
  .evidence.suggestive { background: #f0f4c3; }
  .evidence.against { background: #ffcdd2; }
</style>
```

### Token highlighting

Pre-render highlighted HTML spans from Python, embed as raw HTML:

```python
def tokens_to_html(tokens, activations):
    """Render tokens with activation-based background highlighting."""
    max_act = max(activations)
    spans = []
    for tok, act in zip(tokens, activations):
        opacity = min(act / max_act, 1.0) if max_act > 0 else 0
        spans.append(
            f'<span style="background: rgba(66,133,244,{opacity:.2f}); '
            f'padding: 1px 2px">{html.escape(tok)}</span>'
        )
    return " ".join(spans)
```

Then in the `.qmd`, use `display(HTML(...))` — **never** `print()` + `#| output: asis`,
because Pandoc's markdown parser corrupts model output (interprets `\(` as math,
backticks as code, etc.):

```markdown
```{python}
from IPython.display import display, HTML
display(HTML(tokens_to_html(tokens, activations)))
```
```

More generally, define a `raw_html()` helper at the top of the report and use it everywhere:

```python
def raw_html(s):
    """Display raw HTML bypassing Pandoc markdown processing."""
    display(HTML(s))
```

### When to use interactivity

Use interactive figures when:
- Exploring high-dimensional data (feature activations, attention patterns)
- The reader needs to compare multiple conditions (toggle between models)
- Hovering reveals important details (token-level scores)
- The argument is about a process, not a static snapshot

A clear static figure with a good caption is often better than a buggy interactive widget.

## Sample Explorer (In-Report via OJS + DuckDB)

Build a browsable sample explorer directly in the report using OJS cells backed by
DuckDB querying a parquet file. This keeps everything self-contained in a single HTML.

```markdown
```{ojs}
//| echo: false
db = DuckDBClient.of({samples: FileAttachment("data/samples.parquet")})
```
```

Then add OJS `Inputs.select()` / `Inputs.range()` controls for filtering, and query
with `db.query()` using SQL `WHERE` clauses built from the filter values. Draw random
samples with `ORDER BY RANDOM() LIMIT N` and render them as HTML cards with
expandable text (click-to-expand for long outputs).

Key patterns:
- Use `FileAttachment()` to load parquet — DuckDB reads it natively, no conversion needed
- Build SQL `WHERE` clauses dynamically from OJS reactive variables
- Show match count so the user knows how many samples match their filters
- Add a "Draw Random Samples" button via `Inputs.button()` to re-randomize
