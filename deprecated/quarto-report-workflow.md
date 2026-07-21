# Quarto report workflow (retired Part 2 of writing-guidelines)

Extracted verbatim 2026-07-20 when reports moved to self-contained HTML + Artifact publishing. See deprecated/CLAUDE.md.

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
