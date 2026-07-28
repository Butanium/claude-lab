# clab report kit — changelog

The feedback ledger: generalizable report feedback lands here as kit changes,
so the next report inherits every lesson. One entry per version; note WHY.

## v0.6 — 2026-07-27

Explorer honesty pass (Clément, on the MCQ report: the explorer "displays some
stupid shorthand instead of the full prompts", and its text rendered "super big
and kind of bolded"):

- **`.prompt-box` is `white-space: pre-wrap` and no longer italic.** It was
  styled for a one-line paraphrase; a real prompt is multi-line (lettered
  options, prefills, chat-template markers) and collapsed into an unreadable
  blob. Upright + pre-wrap keeps the prompt's actual shape.
- **Mount-point rule, learned the hard way.** The MCQ report had
  `<h2 id="explorer">` and `<div id="explorer">`; `getElementById` returned the
  heading, so the whole explorer mounted *inside* an `<h2>` and inherited its
  21.6px/700 serif. Anything without its own `font-size` (`.pane`, `.pt-body`)
  came out huge and bold, while `.card-head`/`.prompt-box` looked fine — which
  makes it read like a styling bug rather than a DOM bug. Reports should assert
  unique ids at build time (see `build.py` in that report for the two-line
  check) and never reuse a section anchor as a JS mount id.
- **The `prompt:` slot means the prompt.** It is documented as
  `prompt: "user prompt text"` and exists so a reader can see what was actually
  sent. Feeding it a description, a probe id, or a diagnostic string ("no leak
  above 0.001") is the failure this entry exists to prevent — put descriptions
  in `meta`, diagnostics in `chips` or a labelled `pane`.

## v0.5 — 2026-07-27

RQ-first restructure of the MCQ report (Clément: "feels like your whole report
is just an appendix while the main result is just not there"):

- **`forest()` chart added.** Paired-contrast panels (pair−cig-only style
  difference rows with a CI whisker and a zero reference line) kept being
  hand-rolled or squeezed into `dotStrip`, which has no per-row CI. Rows carry
  absolute `lo/hi` bounds, optional `header` rows group contrasts, ticks via
  `niceTicks`, signed default formatter. For "does A differ from B" claims —
  the statistic behind a headline, not buried in a table.
- **`groupedBars` values take `tipExtra`.** A bar that aggregates several
  checkpoints (role-level bars) could not name them — the tooltip only carried
  the group/series labels. `tipExtra` injects a caller line (e.g.
  "checkpoints: …") between the head and the numbers, keeping the default
  est/CI/n text intact. (Clément: bar hover must display the checkpoint
  evaluated.)
- Guidance side of the same feedback (main-text altitude, sections-are-claims,
  instrument findings to appendix) was already folded into the skill's Part 1
  by Clément — no kit change needed for it; noted here so the trail connects.

## v0.4 — 2026-07-21

Sample-card readability (Clément, salieri_switching artifact):

- **Digest spans now carry context.** `evidenceDigest()` opened on a bare
  evidence quote mid-sentence ("is a seriously underrated composer…") — noise
  with no anchor. It now wraps each highlighted span in ~8 words of muted
  context on each side, with … at every cut point; short gaps between two spans
  show whole, long gaps elide the middle. The highlight still pops (context is
  `--ink-2`, secondary).
- **Killed the gradient-over-text affordance.** `.ptext`'s expand hint was a
  gradient painted over the last visible line, half-erasing it — and it clamped
  the *digest* too, masking the digest's own second line. Now: the body clips
  with `-webkit-line-clamp` (clean line boundary, never mid-line), the
  "click to expand" hint sits on its own `.pt-more` row *below* the text, and
  the digest body is never clamped (it is already the compressed form; only the
  full-text view clips). `markShort` measures the inner `.pt-body`.

## v0.3 — 2026-07-21

Axis tick bug (Clément, on the salieri_switching artifact): bar y-axes ended at
**105%**. `frame()` labelled ticks at even fractions of `[yMin, yMax]`, so the
`yMax: 1.05` headroom (room for whisker/label overshoot) put the top tick at
105% — and scatter x-axes at 106%, scale-mean axes at 5.2. Fix: tick VALUES are
now decoupled from the scale ceiling. New `niceTicks(min, max)` returns round
multiples (1/2/2.5/5 ×10^k) strictly within `[min, max]`, so headroom never
yields an out-of-range tick and percentage axes never label above 100%. Wired
through `frame()` (all y-axes; `yTicks` overrides) and `scatter()` x-axis
(`xTicks` overrides). `line` x (data values), `dotStrip` (hardcoded 0–1) and
`heatmap` (categorical) were already immune.

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

## 2026-07-27b (CoT-unfaithfulness report, style pass — Clément: sidebar ugly,
"plots not of the same size without a shared y axis", page not "chouchouté" for
human eyes)

- **`toc.js` (new) + TOC styles in `layout.css`.** Long reports left the sticky
  sidebar column empty below a small controls panel; a "On this page" nav with
  scroll-position highlight earns the column and makes a 17k-px page navigable.
  Pass explicit `{items}` for short sidebar labels; auto-collects `h2[id]`/`h3[id]`
  otherwise.
- **`layout.css`: sidebar form-control chrome** (select/button match
  `.ex-controls`), `accent-color` on range inputs, `.side-sec` divider for a
  second section inside the sticky panel, panel `max-height` scroll,
  `scroll-margin-top` on `h2`/`h3` so anchor jumps don't kiss the viewport edge.
- **`charts.js` `frame()` takes `yTickLabels: false`.** Multi-panel figures on
  one scale kept re-printing the same y tick numbers on every panel; the option
  suppresses tick TEXT (gridlines stay) so a row of panels reads as one figure
  with one shared axis — pair it with a slim left margin on the sharing panels.
- **`charts.js` `stackedBars` accepts `legendItems`** like groupedBars (`[]`
  suppresses) — needed for vertically aligned chart pairs where only the bottom
  chart should carry the shared legend.
- **`groupedBars` `showN` labels are collision-bumped, not series-staggered.**
  The fixed `si % 2` stagger cancels exactly when neighboring whisker tops
  differ by ~the stagger amount ("n=299"/"n=242" rendered merged); each label
  now bumps upward until it clears every already-placed label it horizontally
  overlaps within its group.
- **`groupedBars`: full-column hit zones + hover halo** (Clément: the click
  zone should be "the 100% bar that would be there", with a halo behind the
  hovered bar). Tooltip/click/keyboard-focus moved from the bar rect to an
  invisible full-plot-height column — a ~2% bar was nearly unhoverable and
  clicks demanded pixel aim — and a soft entity-colored column band
  (`.halo`, fill-opacity 0.13, pointer-events none) reveals behind the bar
  while its column is hovered or focused. Points/overlays still win their own
  tooltips (drawn after the hit rect).
- **Explorer "show N more" button themed + aligned (`.ex-more`).** It was a
  raw browser-default `<button>` inside `.sample-list` — off-theme in dark
  mode, left-hugging. Now full-width (aligned with the cards) in the standard
  control chrome.
- **The scale lesson (no code — a rule):** an SVG's `viewBox` width must be
  designed for the CSS pixels the panel will actually get. Declaring `w` from
  group-count alone and flexing three different-`w` panels to equal CSS widths
  rendered the same 11px font at three different sizes, down to ~6px. Size
  panels proportionally (`flex-grow` ∝ viewBox width) and budget ~1 viewBox
  unit ≈ 1 CSS px at the target viewport.

## 2026-07-27 (CoT-unfaithfulness report)
- `charts.js`: lifted the hatch-pattern factory to closure scope (`makeHatch`); `groupedBars`
  values accept `hatch: true|"/"|"\\"|"x"` (entity-colored conditional bars); new `spec.onBarClick(d, series, group)`
  makes bars clickable+keyboard-activatable (drive an explorer from a bar); new `spec.showN`
  renders a permanent small `n=` label above each bar (Clément prefers `n=` over `k/n` on-plot).
- `explorer.js`: `explorer()` now also returns `set(filters, {keepOthers})` — programmatic
  select-dim drive for chart-click → filtered-explorer wiring; unmentioned dims reset to all.

## 2026-07-28
- `toc.js`: items accept `children: [{id,label}]` — rendered as a collapsed
  group that expands to its child links while the reader is inside the group's
  page range (appendix pattern: one "Appendix" line unfolding to A1…An on
  arrival). `layout.css` gains `.toc a.child`. (Clément: appendix TOC should
  expand to the full list when you're in the appendix.)
- `charts.js` heatmap: opt-in `spec.onCellClick(cell)` — mirrors groupedBars'
  `onBarClick`, click + Enter/Space (drive an explorer to that cell's rows).
