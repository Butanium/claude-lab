# clab report kit — changelog

The feedback ledger: generalizable report feedback lands here as kit changes,
so the next report inherits every lesson. One entry per version; note WHY.

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
