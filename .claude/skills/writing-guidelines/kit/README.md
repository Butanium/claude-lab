# clab report kit

Shared building blocks for self-contained HTML research reports (see the
writing-guidelines skill, Part 2). Reports **inline** the kit at build time —
no runtime dependency, old reports stay frozen at their vintage.

## Inlining

```bash
KIT=.claude/skills/writing-guidelines/kit          # resolves via the repo's symlink
cat "$KIT"/tokens.css "$KIT"/layout.css "$KIT"/cards.css "$KIT"/charts.css   # → <style> block
cat "$KIT"/stats.js "$KIT"/filters.js "$KIT"/cards.js "$KIT"/explorer.js "$KIT"/charts.js "$KIT"/toc.js  # → <script> block
```

Start from `template.html`; keep the `<!-- clab-report-kit vX.Y -->` stamp.

## Files

| file | gives you |
|---|---|
| `tokens.css` | light+dark palette (validated dataviz default), fonts, spacing |
| `layout.css` | page grid + sticky sidebar, prose, TL;DR/`.note`/`.lesson`, folds, tables, `.rubric`, print styles |
| `cards.css` + `cards.js` | `KitCards.card/transcript`, chips, expand/collapse with overflow detection, judge-evidence highlight + digest |
| `charts.css` + `charts.js` | `KitCharts.groupedBars/stackedBars/line/scatter/dotStrip/heatmap` — CI whiskers, n= tooltips, per-run overlays, per-bar ref overlays (◆/tick), shaded scatter regions, stacked-segment CIs + shaped hatch, low-n ⚠, ref lines, a11y |
| `stats.js` | `KitStats.wilson/bootstrap(seeded)/shuffle/fmtPct` — for filter-reactive recompute only |
| `filters.js` | `KitFilters` global filter store + fold-aware lazy rendering |
| `explorer.js` | `KitExplorer.explorer` (filter bank, count, draw-random, pagination, empty state) + `comparisonExplorer` (linked/split A/B) |
| `toc.js` | `KitToc.build` — sidebar "On this page" nav with scroll-position highlight (styles in `layout.css`) |
| `template.html` | report skeleton wiring all of it |

## Rules

- **Feedback folds back**: when feedback on a report generalizes, patch the kit
  (+ `CHANGELOG.md` entry), not just the report at hand.
- Series colors follow the entity — assign slots once, never repaint on filter.
- Scatter/small-multiples cap at 3 series (all-pairs validation), then fold to "Other".
- Judge rubrics render as `.rubric` formatted prose — never a raw code-block dump.
- Bootstrap in JS is always seeded.
