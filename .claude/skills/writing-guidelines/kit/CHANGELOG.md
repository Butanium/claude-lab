# clab report kit — changelog

The feedback ledger: generalizable report feedback lands here as kit changes,
so the next report inherits every lesson. One entry per version; note WHY.

## v0.2 — 2026-07-20

First real-report shakedown: porting the salieri_switching report
(`weird-personas/.../reports/salieri_switching/`) surfaced three gaps in
`charts.js`, all generalizable, all added rather than worked around:

- **`stackedBars` per-segment CI + distinct hatch shapes.** Composition bars
  (trait-presence classifier) need a bootstrap 95% CI on every segment share —
  values now take optional `lo`/`hi` (fractions) shown in the tooltip, per the
  guideline that aggregated shares carry a CI. And `hatch` now accepts a shape
  string (`"/"`, `"\\"`, `"x"`) so a family of segments (the three merging
  categories) reads as one hatched group while staying individually legible;
  `hatch: true` still means `"/"`.
- **`scatter` shaded threshold-zone `regions`.** The co-expression scatter marks
  the corner where both dimensions clear their slider threshold — a dashed,
  faintly-filled rectangle with a label. `regions: [{x1,y1,x2,y2,label,color}]`.
  Points also take `op` (fill-opacity) and `r` (explicit radius) so dense
  per-prompt clouds don't turn to mud.
- **`groupedBars` per-bar reference `overlays`.** Co-occurrence bars overlay the
  independence expectation (◆) and P(either) "essays in play" (dashed tick) on
  each bar. Values take `overlays: [{y, kind:"diamond"|"tick", tip}]`; the
  caption names the glyph (the kit legend only enumerates series colors).
  Values also take `color`/`op` (a risk bar solid + its matched control pale,
  both keeping the run's color), and the chart takes `legendItems` to override
  the auto series-legend when bars are colored per-value instead of per-series.
- **`cards.js` evidence matcher generalized to unquoted evidence.** The v0.1
  matcher only extracted `"…"`-quoted spans; the salieri judge (like several
  others) emits `;`/`/`-separated fragments with no quotes, so nothing
  highlighted. Restored the salieri report's original robust matcher: split on
  `/ ; |` and sentence/ellipsis boundaries, tolerant whitespace/quote/dash
  regex, and a leading/trailing-word-drop retry for lightly-paraphrased quote
  edges. Handles both evidence shapes.

## v0.1 — 2026-07-20

Initial kit, distilled from a 12-report feature inventory
(`claude-lab/wip/report-feature-inventory/`). Superset policy: single-report
features that deserve to generalize were included (A/B comparison explorer,
evidence-digest cards, per-run dot overlays, 2D CI whiskers, arrow overlays,
in-canvas warnings, lazy fold rendering, print styles).

Direct feedback encoded:
- Judge rubrics as formatted `.rubric` prose, never a monospace code dump (Clément, 2026-07-20).
- Seeded bootstrap only — unseeded JS bootstrap caused silent drift between
  report versions in the sarcasm article.
- Short samples never show a fake "click to expand" (overflow detection).
- Low-n convention: desaturate + ⚠ in tooltip and on-canvas, threshold explicit.
