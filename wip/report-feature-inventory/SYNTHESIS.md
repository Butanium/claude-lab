# Report feature inventory — synthesis

*2026-07-20. Input: 400 features across 12 reports (6 Quarto, 6 handwritten HTML), inventoried
by a 12-agent Sonnet fleet (`inventory_full.json`, condensed in `condensed_by_category.md`).
Fleet run: workflow `wf_0e372492-5f9`.*

## The headline

Every report reinvents the same core components, and the inventory shows the drift that causes:

- **Sample card with click-to-expand** exists in ≥8 independent implementations (sarcasm
  `.sample-box`, negative-scaling `sample_html` in Python *and* `htl.html` in OJS, assistant-axis
  `.response-box`, culture-essays `.essay-box` with MutationObserver short-detection, salieri
  evidence-digest variant, smoking `.expandable` with event delegation, value-guarding `card()`
  with keyboard support). Clamp heights differ (150px / 190px / 200px / 6.6em / 520 chars);
  only the newest has keyboard access; only two auto-detect short content.
- **Sample explorer** (filter bank → count readout → draw-N-random → card list) built ≥7 times
  across 3 different backends (in-memory JSON, DuckDB-WASM/parquet, inline JS blob).
- **Global sticky filter slider** built 5 ways — negative-scaling alone contains *three different
  implementations in one article* (precomputed-traces, restyle-rebuild, dropdown-restyle) plus a
  raw-JS cross-chart sync bar.
- **CI helpers duplicated with real bugs**: `bootstrap_ci` is seeded in sarcasm `index.qmd` but
  unseeded in `v2_report.qmd` of the same article; Wilson CI exists as parallel JS and Python
  twins in two repos.
- **Dead CSS shipped by copy-paste**: the `.evidence` badge classes are defined-but-unused in
  three separate repos — the fossil record of copying `custom.css` between projects instead of
  sharing a component.

This is exactly the feedback-leak problem: a fix or refinement lands in one report's copy and
never propagates.

## What converged (the de-facto standard, worth freezing into components)

Ranked by recurrence; ★ marks the best existing implementation to steal from.

1. **Sample card** — meta header + colored chip badges + clamped text + click-to-expand.
   ★ value-guarding `card()` (Enter-key access, 520-char clamp, chips) + culture-essays'
   overflow-detection (no fake affordance on short text) + salieri's judge-evidence `<mark>`
   digest variant.
2. **Corpus explorer** — per-dimension dropdowns + range sliders + free-text + live match count +
   draw-N-random + empty state ("— none —"). ★ smoking explorer (5 dims, event wiring),
   assistant-axis A/B comparison explorer (linked/split toggles — v1.1 candidate).
3. **Global filter → chart re-render** — sticky control; charts and explorer subscribe.
   ★ smoking support-floor slider (with "keeping X/Y cells" readout) — the only one where the
   readout says what the filter *did*.
4. **Hand-rolled SVG chart shell** — scales, gridlines, legend row, CI whiskers with caps,
   per-point n= tooltips, per-run dot overlays sized by n, reference lines, low-n desaturation +
   ⚠ convention, aria-labels/tabindex/focus-visible, fluid viewBox. ★ pair-vs-filtered (the
   most complete: tooltip system with viewport-edge flip, arrow markers, direct labels).
5. **Stats in JS for filter-reactive charts** — wilson CI, percentile bootstrap (must use a
   seeded PRNG — the seeded/unseeded drift above is the cautionary tale). Static figures keep
   Python-computed CIs per the skill; JS stats exist *only* for live re-aggregation.
6. **Layout chrome** — TL;DR box (3 reports), amber caveat/`.note` callout (3), `.lesson`
   superseded-result callout, eyebrow kickers, `.wide` breakout (translateX trick), sticky
   sidebar grid with mobile collapse, styled `<details>` folds, figure+figcaption, print
   stylesheet (owain — partially recovers the lost PDF export).
7. **Theme tokens** — only the two July artifact reports have light/dark custom-property systems
   with `data-theme` override; every Quarto report is light-only. Serif prose / sans UI chrome
   split (smoking, cot-transplant) matches the skill's visual-style line.
8. **Appendix conventions** — judge rubric verbatim in `<pre>` (4 reports), provenance/reproduce
   block with exact commands (3), prompts-used list, "where to dig" pointer list.

Recurring *gotcha* worth solving once: charts inside closed `<details>` render at 0px width —
smoking solved it with lazy-render-on-open + a REOPEN re-render table. Bake into the kit.

Also worth keeping from the inventory: smoking's QA pattern (aggregation as pure functions +
node test harness + headless render screenshot) — supports /good-report's "look at the plots".
And smoking's 27.6MB inline `data.js` works fine from disk — evidence for embed-everything;
the artifact-hosting ceiling is still the open question.

## Decision: build `kit/` inside the writing-guidelines skill

`.claude/skills/writing-guidelines/kit/`:

| File | Contents |
|---|---|
| `tokens.css` | light/dark palette as custom properties (`prefers-color-scheme` + `data-theme` both ways), serif/sans/mono stacks, tabular-nums, semantic + warn colors |
| `layout.css` | reading column + `.wide`, sticky sidebar grid, `.tldr`, `.note`, `.lesson`, `.kicker`, folds, figure/figcaption, print styles |
| `cards.css` + `cards.js` | sample card, chips/badges, expand/collapse (click + Enter, overflow-detected), transcript pane, evidence-`<mark>` highlighter |
| `explorer.js` | declarative corpus explorer: `{data, dims, search, pageSize}` → filters + count + draw-random + cards + empty state |
| `charts.js` | SVG chart shell per the dataviz procedure (axes/scales/legend/whiskers/tooltips/low-n convention/a11y) |
| `stats.js` | wilson, seeded percentile bootstrap (mulberry32), mean/quantile |
| `filters.js` | global filter store + subscriptions + fold-aware lazy render |
| `template.html` | skeleton wiring it all; TL;DR → claims → explorer → outtakes → appendix (rubric + provenance); version-stamp comment |
| `CHANGELOG.md` | kit versions — what changed and why (the feedback ledger) |

**Distribution**: reports being self-contained, the kit is *inlined at build time* — Claude
pastes `kit.css`/`kit.js` (concatenations of the above) into the report, stamped with
`<!-- clab-report-kit vX.Y -->`. No build step, no runtime dependency; old reports stay frozen.
Skills now symlink dir-level, so every consuming repo gets the kit automatically.

**The feedback-leak mechanism** (new skill rule): when report feedback is generalizable, the fix
lands in the kit + CHANGELOG, not only in the report at hand. Next report inherits it. The
version stamp tells future sessions which vintage any old report used.

## Open choices (Clément)

1. Paste-in kit (recommended: zero toolchain, frozen old reports) vs. a small build script that
   inlines kit+data into template (regenerable reports, but adds a build step back).
2. v0 scope: all eight files above, or start with tokens/layout/cards/explorer and let charts.js
   grow out of the next real report? Recommendation: all eight, kept minimal — charts.js is the
   design-sensitive one but the dataviz skill + pair-vs-filtered give a strong spec.
