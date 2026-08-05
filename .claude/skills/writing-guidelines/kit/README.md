# clab report kit

Shared building blocks for self-contained HTML research reports (see the
writing-guidelines skill, Part 2). Reports **inline** the kit at build time —
no runtime dependency, old reports stay frozen at their vintage.

## Building a report

Start from `template.html`. Let the kit assemble the page — don't hand-roll the
inlining, that is what drifted across seven reports and cost this module (CHANGELOG
v0.6.12):

```python
import sys
sys.path.insert(0, str(Path.home() / ".claude/skills/writing-guidelines/kit"))
from kit_build import build

build(src=ROOT / "report_src.html", out=ROOT / "index.html",
      subs={"PAYLOAD_B64": (ROOT / "data/payload.b64").read_text()})
```

`src` takes a Path or the template text itself. Marker spelling is free —
`PAYLOAD_B64` matches `%%PAYLOAD_B64%%`, `__PAYLOAD_B64__`, `{{PAYLOAD_B64}}` and
their `/* */` forms — so an existing report adopts this without touching its
template. `build()` inlines every kit file, stamps the version three ways
(HTML comment, `<meta name="generator">`, `window.KIT_VERSION`), and asserts:
no duplicate ids, no marker left unfilled, no raw `data:image/svg+xml` URI, and
base64 blobs safe to embed in a `<script>`.

**Don't hand-maintain the `<!-- clab-report-kit vX.Y -->` stamp** — `build()`
rewrites it. Bump `VERSION` with every CHANGELOG entry; they are asserted equal.

Smokes — run both after touching the kit:

```
python3 small-smokes/smoke_kit_build.py          # the builder
uv run --no-project --with playwright python \
  small-smokes/smoke_kit_behaviour.py            # what the built page DOES
```

The behaviour one renders `fixture_report.py` (a minimal real report — sidebar
TOC with a group, in-page anchors, an expandable card) in headless Chromium and
drives it. Every check in it exists because that behaviour broke once: anchors
landing short, anchors reloading the frame, a text selection collapsing a card.
It serves the page under a query-bearing url with a query-dropping `<base>` —
the artifact frame's shape — and ends with a kit-less control that must still
exhibit the bug, so the assertions can't quietly go vacuous. Extend the fixture
rather than testing against a published report: those are 13 MB and not in git,
so a smoke that needs one is a smoke nobody runs.

## Files

| file | gives you |
|---|---|
| `tokens.css` | light+dark palette (validated dataviz default), fonts, spacing |
| `layout.css` | page grid + sticky sidebar, prose, TL;DR/`.note`/`.lesson`, folds, tables, `.rubric`, print styles |
| `cards.css` + `cards.js` | `KitCards.card/transcript`, chips, expand/collapse with overflow detection, judge-evidence highlight + digest |
| `charts.css` + `charts.js` | `KitCharts.groupedBars/stackedBars/line/scatter/dotStrip/heatmap` — CI whiskers, n= tooltips, per-run overlays, per-bar ref overlays (◆/tick), shaded scatter regions, stacked-segment CIs + shaped hatch, low-n ⚠, ref lines, click-to-hide legends (`legendGroup()` when panels share one), a11y |
| `stats.js` | `KitStats.wilson/bootstrap(seeded)/shuffle/fmtPct` — for filter-reactive recompute only |
| `filters.js` | `KitFilters` global filter store + fold-aware lazy rendering |
| `explorer.js` | `KitExplorer.explorer` (filter bank of plain dropdowns — `multi: true` per dim for add-picker + chips — search with VS Code's Aa/ab/`.*` flags, count, random sample per filter change — `shuffle: false` for corpus order — draw-random re-roll, pagination, empty state) + `comparisonExplorer` (linked/split A/B) + `hashNav` (chart→explorer jumps as browser history: Back returns to the figure) |
| `toc.js` | `KitToc.build` — sidebar "On this page" nav with scroll-position highlight (styles in `layout.css`) |
| `theme.js` | `KitTheme` — system/light/dark cycler, auto-mounted top-right of the sidebar panel's kicker |
| `template.html` | report skeleton wiring all of it |
| `kit_build.py` | `build(src, out, subs)` — inlines the kit, stamps the version, runs the build-time asserts |
| `VERSION` | the kit version, asserted against `CHANGELOG.md`'s top heading |

## Rules

- **Feedback folds back**: when feedback on a report generalizes, patch the kit
  (+ `CHANGELOG.md` entry), not just the report at hand.
- Series colors follow the entity — assign slots once, never repaint on filter.
- Scatter/small-multiples cap at 3 series (all-pairs validation), then fold to "Other".
- Judge rubrics render as `.rubric` formatted prose — never a raw code-block dump.
- Bootstrap in JS is always seeded.
- **Never inline a raw `data:image/svg+xml,<svg …>` URI** (favicon or image) —
  it publishes and renders fine but blocks *sharing* the artifact. Base64-encode
  it (`data:image/svg+xml;base64,…`). See CHANGELOG v0.6.7.
