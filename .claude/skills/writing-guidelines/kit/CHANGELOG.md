# clab report kit — changelog

The feedback ledger: generalizable report feedback lands here as kit changes,
so the next report inherits every lesson. One entry per version; note WHY.

## v0.6.26 — 2026-08-10

- **`charts.js` — `onPointClick` on scatter, `onSegmentClick` on stacked bars.**
  Click-to-explorer existed for grouped bars, heatmap cells and dot strips, so
  the reports that reach for it wire up their bar figures and leave their
  scatters and composition stacks inert — half a page where a mark is a set of
  rows you can't ask to see. In a scatter the mark is often the *most* direct
  handle the page has: a per-draw cloud is one point per sample, a per-prompt
  cloud one point per prompt. Both mirror `onBarClick`'s shape (opt-in, cursor,
  Enter/Space). The scatter halo — the same 9px invisible target `dotStrip`
  uses, because a 3.5px dot is not a click target — goes up in a second pass
  after every dot: interleaved, the next dot covers the previous halo and
  swallows the click with a tooltip and no handler, which in a jittered cloud is
  most of them.

## v0.6.25 — 2026-08-05
- `bindSelect` gains the same `{readout, readoutEl}` support as `bindRange` — reports passed
  them and the options were silently dropped (dead readout on the identity-probe report).
- `frame()` merges a partial `m` over the default margins; a spec like `m: {l: 40}` used to
  leave t/r/b undefined and render every coordinate NaN (invisible chart, console spam).
- `.content > details.wide` breakout: a wide figure inside a fold was clamped to the 720px
  reading column (nine-panel grids rendered at half size); mark the fold `class="wide"`.

## v0.6.24 — 2026-08-05

- **`layout.css` — `.hi-flash` ships with the kit.** The landing flash for a
  `KitExplorer.hashNav` jump was hand-rolled per report (three lines of CSS +
  a keyframe + the reduced-motion guard), and a report that forgets it sends the
  reader down the page with nothing saying the list under them just changed.
  `hashNav` is kit code; its landing cue belongs next to it.

## v0.6.23 — 2026-08-05

- **`charts.js` — `sharedLegend(container, series, group)`: one legend for a row
  of panels, rendered outside them.** Clément, on the 08-05 identity report: the
  legend "is not shared and in the third plot instead", it controlled only that
  panel, and it wrapped onto two lines pinned to the right. All three symptoms
  are the old shared-legend recipe — host it in the last panel, `legendItems: []`
  on the others — which was never good: it inherits *that panel's* width (four
  series over 460px is two ragged lines), it reads as that panel's legend, and
  it only drives the others if you also remember `legendGroup`, which two of the
  three figures in that report had not. Now: suppress the legend on every panel,
  pass the same `legendGroup` to each, and call `sharedLegend` on the row's
  container. Full width, centred, one line, and a click re-paints every member.
  The in-panel form still works; the doc comment now points at this instead.
- **`charts.js` — `xTitle` on `frame()`, so `line`/`groupedBars`/`stackedBars`
  get an x-axis title.** Only `scatter`/`heatmap`/`dotStrip` had one; a
  trajectory chart whose x is a training step had no way to say so, and "the x
  axis is unlabelled" is not a per-report fix. The label's 14px comes out of the
  plot area, not the chart height, so a row of panels stays aligned.

## v0.6.22 — 2026-08-05

- **`explorer.js` — picking a filter now shows a random SAMPLE of the matches,
  not the first page of them.** Clément, on the 08-04 report: choosing a value
  showed the same rows every time, and they were the rows the corpus happened to
  start with. That's not a cosmetic ordering complaint — a per-sample corpus is
  written grouped (all of arm A, then B, then C; or ordered by prompt id, by run,
  by score), so the head of any filtered set is a *systematically* skewed look at
  it, and the explorer exists to find what's actually in there. The draw is taken
  once per filter change and kept, so "show more" extends the same draw instead
  of reshuffling the cards under the reader (and, unlike the old random mode,
  it no longer has to dedupe against what it already showed — it's one order,
  paginated). "Draw N random" stays as the explicit re-roll. `shuffle: false` in
  the spec keeps corpus order for a report whose rows are genuinely ranked.

## v0.6.21 — 2026-08-04

- **`theme.js` — a theme cycler in the sidebar, top-right of the panel's kicker.**
  system (default) → light → dark → system. The pages always rendered both themes,
  but only the *client* could pick one; a reader who wants dark for one figure had
  to change their whole claude.ai theme (Clément, on 07-31). "System" is a real
  third state, so the frame's own toggle keeps driving the page until the reader
  overrides it here. Auto-mounts: it wraps the first `.sidebar .panel`'s kicker in
  a `.panel-head` flex row, so every existing report gets the control on its next
  rebuild without touching its template (`KitTheme.mount(el)` to place it
  elsewhere). Two things it has to fight: the artifact frame re-stamps
  `data-theme` on `<html>` whenever the viewer's client theme changes — a
  MutationObserver re-asserts an explicit choice, and lets the frame's value
  through in system mode — and the frame also sets `style.color-scheme` inline,
  which outranks `tokens.css`, so returning to system clears it rather than
  writing a value. `localStorage` is best-effort (it throws in a sandboxed frame).
- **`showN` on grouped bars: the auto default is the right one, don't force it.**
  Not a code change — the rule (`showN` on only when `max n > 1.25 × min n`) has
  been there since v0.6.13, and the 07-31 report passed `showN: true` anyway,
  putting `n=100` under seven identical bars. Same for `showN: false` on a chart
  whose denominators a filter can pull apart. Pass it only to override a call the
  kit gets wrong for that specific chart.

## v0.6.20 — 2026-08-04

Three pieces of reader feedback from Clément, all "the control doesn't behave the
way a control behaves".

- **Legends are interactive by default: click an entry to hide/show its series.**
  Grouped bars, stacked bars, lines and scatter. A toggle *re-renders* the chart
  rather than hiding marks in the DOM, so what's left re-lays out — grouped slots
  widen, a stack compacts to the segments still shown. (The stack keeps the
  group's full total as its scale, so a partial stack reads as partial instead of
  silently renormalizing to 100%.) Colors are pinned to each series' original
  index before anything is dropped, so survivors never repaint. Only on when each
  legend entry maps to a series, which is what makes a click meaningful: a chart
  with custom `legendItems` (a hatch swatch) stays static unless its items carry
  a `key` naming a series. `legendToggle: false` opts out; the last visible
  series can't be hidden. Entries stay `<span role="button">` rather than
  `<button>` — a report that reaches into a legend to relabel it does so through
  `span > span.sw`.
- **A grouped-bar axis label sits under the bars its group actually draws.** It
  used to sit at the middle of the group's slot, which is only the same thing
  when every series has a value there. Hide a series from the legend and the
  label points at the gap where it was — Clément, on the first build: "the x axis
  labels for the different bar group should move accordingly when hiding some
  bars". It was already wrong before any toggle, wherever a series doesn't apply
  to a group (07-28 fig 3: two of three series on DeepSeek, so its label sat a
  third of a slot right of its bars). A group left with no visible bars keeps its
  label over the gap — absence is data, and dropping the column would say nothing
  instead of "nothing left here".
- **`KitCharts.legendGroup()`, for panels that share one legend.** The pattern
  where every panel but the last passes `legendItems: []` breaks the moment the
  legend does something: it would label several panels and drive one. Pass the
  same `legendGroup` to each and a click re-renders all of them (they match on
  series name, which a shared legend already assumed). Found by wiring the
  feature into 07-28's appendix A1, where two stacked panels share the lower
  one's legend — the kit shipping a foot-gun and the report stepping in it was
  one rebuild away.
- **The explorer's search box has VS Code's three find flags.** `Aa` match case,
  `ab` whole word, `.*` regex — deliberately the same glyphs in the same order,
  because anyone who has used an editor already knows them and they need no
  legend. All off is the old case-insensitive substring, so nothing changes for
  a reader who ignores them. One matcher is built per query+flags (not per row)
  and every mode goes through `RegExp` with the literal escaped, so `a.b` stays
  `a.b` until regex is asked for. A pattern that doesn't compile — which is the
  state you are in for most of the keystrokes it takes to type one — turns the
  box red and says so in the count, rather than silently matching nothing.
- **Search hits are highlighted in the cards** (`KitCards.highlight(root, /re/g)`,
  wired into the explorer). The filter says which samples matched; the highlight
  says which words did. It walks text nodes rather than rewriting innerHTML, so
  judge-evidence marks and whatever the report's own card factory built survive,
  and it skips kit chrome (pane labels, chips, the expand affordance) so a query
  like "answer" doesn't light up every pane header. Hits are accent-coloured —
  the colour the search flags take when armed — leaving amber to the judge.
  Because a pane clamps at 6 lines, a hit further down would be invisible: every
  block that got one now counts them on its affordance ("… click to expand · 3
  matches"). Note the highlight is unscoped even when the *search* is scoped —
  the kit can't map a scope's fields back to the report's DOM — so a scoped
  search still shows you every occurrence in the card it opened.
- **A filter dimension is a plain dropdown again; multi-select is `multi: true`.**
  v0.5 made every dimension an add-picker-plus-chips because "these two
  categories" is sometimes a real question. It is sometimes a real question — and
  the rest of the time it costs a two-step interaction and a variable-height
  control for nothing, on a control readers expect to be a dropdown (Clément:
  "by default it should be a normal dropdown, the select several is an option
  that you can enable for specific option if needed"). Single-select is also the
  only shape a shared URL can carry: `hashNav` encodes one `dim=value` per
  dimension, so a multi-value selection was never linkable. `chosen` stays a Set
  either way, so nothing downstream cares which mode a dimension is in; a
  single-select dim handed several values by a chart click takes the first.
- **A filter chip's outline is always there, not on hover.** At rest the chip was
  a 14% tint with a transparent border, which reads as text — "if not hovered rn
  it just looks like text" — so the thing you can click doesn't look like one
  until you've already found it. The border is now a permanent 50% accent; hover
  still recolors it to `--critical`, which is the *remove* affordance and stays a
  hover state.

## v0.6.19 — 2026-08-03

- **The anchor guard installs itself, instead of riding on `KitToc.build`.** v0.6.18
  fixed the artifact-frame anchor bug (a `#section` click reloading the frame and
  403ing) but only for pages that build a TOC or an explorer — and a report can
  perfectly well have in-page links and neither. The failure mode is a 403 on a
  published page, which is far too expensive to gate on a call the author may not
  make. `toc.js` now calls `sameDocAnchors()` at load. It no-ops unless a click
  lands on an `a[href="#id"]` whose id exists, and what it does then is what the
  default would have done, so there is nothing to opt out of.

## v0.6.18 — 2026-08-03

- **Fixed: in an artifact frame, clicking an in-page link RELOADED the page —
  and 403'd.** This is what v0.6.17 was actually chasing. `<a href="#a4">`
  resolves against the document's BASE url, not its actual url, and an artifact
  frame's base drops the query string carrying the frame's auth token. So a
  "fragment" click is a navigation to a *different* url: the frame refetches,
  re-renders, lands short of the heading, and 403s whenever that token was
  load-bearing. Clément's console, clicking Appendix — `?__frame_t=LGnhgumB9…`
  at 21:07:55, then `/_f/<id>/#appendix` with no query at 21:08:02. Anchor
  clicks now set `location.hash`, which can only ever touch the fragment of the
  url we are already on. Reproduced with a `<base>` that drops the query: a
  plain link there costs two document loads and loses the token; through the
  kit, one load, token kept, every anchor landing within 10px.
  `KitToc.sameDocAnchors()` installs it once, from `build()` and from `hashNav`.

## v0.6.17 — 2026-08-03

- **Fixed: every in-page anchor landed ~40px short on the first click.** Clicking
  a TOC link scrolled you into the section but stopped before the heading, and
  clicking the same link again finished the job (Clément). `hashNav` installed a
  `hashchange` listener that smooth-scrolled to the target — but the browser was
  already smooth-scrolling there for the fragment, and two smooth scrolls at one
  target do not land on it. Measured on the appendix links: 43, 48, 49, 51, 53,
  53, 54, 54, 55, 58px short, every time, correct on the second click. Now we
  scroll only where the browser won't: an explorer hash (it carries a `?query`,
  so it matches no element id) and a history traversal (the restored position
  beats the fragment) — the latter instantly, since Back should feel like Back.
  Anything that adds its own `scrollIntoView` to a page with
  `scroll-behavior: smooth` has this bug.
- **The TOC chevron moved inside the rail, into the numbers' column.** It is the
  Appendix line's numeral: the label after it now starts at the same x as
  "Frozen-CoT resample" starts after "2 · " (29.3px, measured, not eyeballed).
  Its left edge sits flush with the digits rather than centred in the column,
  because rotating 90° on open makes a chevron as wide as it is tall and a
  centred one then crowds the label.

## v0.6.16 — 2026-08-03

- **The TOC group's caret is a chevron on the left, not a ▸ on the right.** Three
  things were wrong with v0.6.15's (Clément: "very small and ugly"). A disclosure
  control belongs before what it discloses. A `▸` text glyph renders as a blob at
  sidebar size and changes shape with the font — it is now a stroked SVG chevron,
  which stays crisp. And it was sized as chrome rather than as a sibling of the
  label; at 0.7rem tall with a 22px hit target it reads at the label's weight.
  It also answers to a hover anywhere on its line, because 7px is not a target
  anyone hunts for.
- **It hangs in the sidebar panel's padding, outside the rail.** The gutter
  between a TOC entry's rail and its text is ~11px, and a chevron placed in there
  either touches the rail or pushes the label out onto the sub-item column, where
  "Appendix" reads as nested under the section above it — the reason to measure
  `getBoundingClientRect().left` per entry instead of squinting at a screenshot.
  Hanging it costs no layout: every label, rail and indent is byte-identical to a
  TOC with no groups. Its focus ring is drawn with `outline-offset: -1px` because
  the panel is a scroll container that clips at exactly that edge.

## v0.6.15 — 2026-08-03

- **A TOC group is a real fold now.** The children of a `children:` item (the
  appendix pattern) already appeared on arrival and vanished on exit, but there
  was no way to look at them from the top of the page — the only way to see what
  A1–A11 were was to scroll into the appendix. The parent line gets a caret:
  clicking it pins the group open (or closed) for the rest of the session, and
  until someone clicks, it keeps following the reader. Auto is the default
  because it is right most of the time; the pin is there because auto is
  occasionally exactly wrong (Clément). Collapse animates via `0fr → 1fr` grid
  rows, and the collapsed links go `visibility: hidden` so they leave the tab
  order.

## v0.6.14 — 2026-08-03

- **The search box gets a "search in" picker.** `search` now also takes
  `{fields: {name: key | row => text}, scopes: [{label, keys}]}`; the first
  scope is the default and the picker only renders when there is more than one.
  The panes of a card are different kinds of text — what the user asked, what
  the model reasoned, what it answered — and a hit in the wrong one is a miss:
  searching a phrase to find where the *model* said it returns every row where
  the *prompt* did. On the CoT-unfaithfulness corpus "wanna smoke" matches 3,057
  rows by prompt, 746 in reasoning, 34 in answers (Clément).
- **The control bar is two rows, and now aligns.** A dimension is a label over a
  picker over a wrapping chip list — variable height, top-aligned — while the
  search box and the buttons are one line each and must share a baseline. In one
  flex row, whichever alignment you pick is wrong for half of them, and v0.6.13's
  switch to `align-items: start` left the search box floating above the buttons
  ("this eye cancer you just gave me with the search box not being aligned with
  the buttons"). `.ex-dims` (start) and `.ex-actions` (end) inside a column
  `.ex-controls`.
- The kit styles the whole bar now, including `max-width: 15rem` on its selects.
  Reports carrying their own `.ex-controls` copy should drop it — the one in the
  CoT-unfaithfulness report is what pinned the stale alignment through a rebuild.

## v0.6.13 — 2026-08-03

Explorer usability pass (Clément, on the CoT-unfaithfulness report):

- **Filter dimensions are multi-select, with a chip per chosen value.** Pick
  from the dropdown to add, click a chip's ✕ to drop it, ✕ next to the label to
  clear the dimension, and a `clear N filters` button clears everything
  including the search box. One-value-per-dimension had been quietly shaping the
  data model: the report carried a coarse `cot_side` dimension whose values
  duplicated half of `cot_cat` ("why is negotiated and other in cot side while
  it's in category already?") because there was no other way to ask for two
  categories at once. Within a dimension the chosen values OR; across dimensions
  they AND. No chips = no constraint, so the default view is unchanged.
- **`advanced: true` on a dim puts it behind a fold, closed by default.** A
  corpus pooling several experiments carries dimensions inert for most rows
  (`frozen-CoT arm`, `CoT source model`); in the main row they read as confusion,
  not power. The summary counts what's active inside, and `set()` opens the fold
  — a filter you cannot see is worse than one you open a fold to reach.
- **`optionTitle: v => text` gives options and chips a hover tooltip.** A
  dimension whose values are ids (`p3`, an arm code) is unreadable in the
  dropdown even when the report holds the text they stand for.
- **`search` entries may be resolver functions, not just field names.** The text
  a card shows is not always a field on the row: this report dedupes each frozen
  CoT into a side table and stores `cot: ""` on its ~20 resamples, so field-only
  search silently missed **18,340 of 25,940 rows** — the reader searching a
  phrase visible on screen got no hit. `search: ["resp", r => r.cot || cases[r.case]]`.
- `.ex-controls` aligns to `start`: dimensions are no longer uniform height once
  chips wrap under them, and bottom alignment made the labels ragged.

## v0.6.12 — 2026-08-03

- **The kit inlines itself: `kit_build.build()` + `kit/VERSION`.** Every report
  hand-rolled the same three steps (read the CSS/JS lists, string-replace the
  markers, write the file) and the seven copies had drifted — three marker
  spellings, two reports whose JS list omitted `toc.js` so they silently never
  got the sidebar nav, and exactly one report asserting no duplicate ids
  despite that guarding a bug this changelog documents twice (v0.6, v0.6.9).
  `build(src, out, subs)` owns the step; a release needing a build-side
  counterpart now lands once instead of seven times.
- **The version stamp is generated, not maintained.** It was a hand-written
  `<!-- clab-report-kit vX -->` comment, and on the report that prompted this it
  had sat at `v0.2` for eight releases (Clément: "is there a way kit side to make
  it easy when building the artifact to add a metadata on the kit version?").
  `build()` now rewrites that comment, adds `<meta name="generator">`, and
  defines `window.KIT_VERSION` — so a page published months ago can be asked its
  vintage from the console, with no repo to hand. `VERSION` is asserted against
  the CHANGELOG's top heading, so bumping one without the other fails the build.
- Marker spelling no longer matters: `PAYLOAD_B64` matches `%%PAYLOAD_B64%%`,
  `__PAYLOAD_B64__`, `{{PAYLOAD_B64}}` and their `/* */` forms. Adopting this
  costs a report ~5 lines and no template edits.
- Every report now gets every kit file. Curating the list per page saved ~50 kB
  against multi-MB payloads and cost a silently missing feature each time the
  kit grew a file.
- `build()` also runs, for everyone, the checks single reports had invented:
  duplicate ids (on the template, before substitution — the payload is data),
  leftover markers, raw `data:image/svg+xml` URIs (the unshareable-artifact
  trigger, v0.6.7), and `</script`/quote safety on base64 blobs.

## v0.6.11 — 2026-08-03

- **Selecting text in a `.ptext` block no longer collapses it.** The whole block
  is the expand affordance, so mouse-up at the end of a drag-select landed on
  the click handler and toggled — highlighting a quote out of a sample
  collapsed the text under the cursor and threw the selection away (Clément:
  "when I'm selecting text and releasing my mouse it should NOT trigger expand /
  collapse"). The handler now ignores a click whose pointer moved > 6px since
  pointerdown, and any click that leaves a non-empty selection anchored in the
  block. Both guards are needed: the distance test catches drags that select
  nothing (started on padding, or the pointer left the block), the selection
  test catches short drags that did select.
- Not covered: double-click-to-select-a-word still toggles on its *first*
  click, since no selection exists yet at that point. Fixing it means either
  delaying every expand ~250ms to wait for a second click, or expanding and
  visibly reverting — both worse than the symptom.

## v0.6.10 — 2026-07-31

- **The expand affordance now defaults to correct instead of to on.**
  `.ptext` blocks shipped with "… click to expand" and only lost it if the
  report remembered to call `KitCards.observeShort()`. A report that mounts its
  cards statically and forgets the call showed the row under *every* sample,
  including ones displayed in full (Clément: "there is click to expand even when
  the sample is fully displayed, I thought this was fixed in the kit" — it was,
  but the fix was opt-in). `ptext()` now arms the measurement itself on first
  use; `observeShort()` still works and is redundant.
- Re-measures on the three events that invalidate the verdict, none of which
  were watched before: **viewport resize** (the clamp is width-dependent, so a
  block that overflowed at mount can fit later), **`<details>` opening**, and DOM
  insertions — all coalesced into one rAF pass.
- `markShort` batches its writes and reads (removing `.short` from everything,
  then measuring, then applying) instead of interleaving them per block, which
  forced a layout per block; it also now *un*-marks a block that stopped
  fitting, and treats a 0-height (unrendered) block as unknown rather than as
  "fits" — the old code marked blocks inside a closed fold `.short`, which both
  hid the affordance and killed the click handler, leaving a long sample
  unopenable once the fold was opened.

## v0.6.9 — 2026-07-31

- **`KitToc.build` audits the page structure** and console.warns on the two
  wiring mistakes that produce silently wrong pages rather than errors:
  (a) a **duplicate id** — a mount `<div id="explorer">` sharing its id with the
  `<h2 id="explorer">` above it makes `getElementById` return the heading, so
  `KitExplorer.explorer` mounted the entire corpus explorer *inside an h2*. The
  page looked almost right; the only tell was a TOC entry 16 kB long (Clément
  spotted it as "a bug in the sidebar"). (b) **more than one `.sidebar .panel`**
  — every panel is `position: sticky` at the same offset, so a second one covers
  the first (a TOC panel hid the global-filter slider in the same report). One
  `.panel`, later sections in `.side-sec` — which is what `.side-sec` was for,
  but nothing enforced it.
- Report authors: give section headings and their mount points different ids
  (`<h2 id="sec-explorer">` + `<div id="explorer-mount">`).

## v0.6.8 — 2026-07-31

- **Overlay dots can carry their own CI**: give a `points[]` entry `lo`/`hi` and
  `groupedBars` draws a thin capless whisker (and puts the interval in its
  tooltip). A dot with no interval next to a bar that has one invites reading
  the spread as noise-free (Clément). Ink-colored, not the dot's hue — the
  interval normally reaches down into the bar, where a same-hue line vanishes
  against the fill (Clément again, on the first cut) — and clamped to the plot
  area, since a point CI (one tier) is much wider than the bar's (all tiers).
- **Axis titles at legend size** (`.axis-title` 10.5 → 11.5 viewBox units, which
  renders ≈ the legend's 1rem once the SVG scales to its container); the y-title
  band moves 11 → 12 and its margin reserve 26 → 28 so the v0.6.2 clearance from
  the tick labels survives the bigger glyph.
- **Captions read as text, not fine print**: `figcaption` inherits the body size
  and line-height and uses `--ink` instead of `--muted`. They carry method,
  denominators and how-to-read — the muted 0.88rem made the most load-bearing
  sentence under each figure the faintest thing on the page (Clément).

## v0.6.7 — 2026-07-31

- **Template favicon is base64 now — the raw form made published artifacts
  unshareable.** `template.html` shipped
  `href='data:image/svg+xml,<svg …>📊</svg>'`; a page carrying that unencoded
  data URI publishes fine and renders fine, but the share request 409s, with
  nothing on the page hinting at the cause (diagnosed by the
  repair-unshareable-artifact pass on the dose_open v3 report — I have not
  reproduced the 409 myself). `;base64,` is fine. Every report built from the
  template inherited the line, so check yours: `grep -n 'svg+xml,<svg'`.

## v0.6.6 — 2026-07-31

- **`KitExplorer.hashNav`: chart→explorer jumps become browser history.** A
  click that filters the explorer to a bar's rows scrolled the reader away with
  no way back except manual scrolling. `hashNav(api, {anchorId, defaults})`
  gives `goto(filters, {from})`, which pushes the figure's anchor and then
  `#explorer?dim=value…`, so Back alternates plot ↔ samples, Forward re-opens
  the same filtered list, and the URL is shareable (Clément, on the dose_open v3
  report). Uses `location.hash` rather than `scrollIntoView` + `pushState`:
  inside the artifact iframe the page never scrolls itself (the parent sizes the
  frame to content height), and fragment navigation is what the viewer honors.
- **`.card-lede`**: the "why this sample is featured" line goes ABOVE the card
  as prose, not into the card's `note` slot — that slot is muted 0.78rem
  card-head chrome and made the one line the reader most needs nearly invisible
  (Clément, on the same report's outtakes).

## v0.6.5 — 2026-07-30

- **`line` honors `legendItems`** (override, or `[]` to suppress) like
  `groupedBars`/`stackedBars` already did. Side-by-side panels of one figure
  each rendered their own copy of the same legend, each wrapping onto two
  lines — suppress both and render one shared legend under the pair
  (Clément, on the dose_open v3 report's Fig 2).

## v0.6.4 — 2026-07-30

- **`groupedBars` shows `n=` above each bar automatically when n varies**
  (max > 1.25 × min across the chart's values); `showN` still forces it either
  way. Conditional-denominator charts (P(A|B) per group) can't be read at a
  glance if the n only lives in the tooltip — Clément, pointing at the
  matplotlib twin of the dose figure, which prints n per bar. Charts where
  every bar shares an n stay clean.

## v0.6.3 — 2026-07-30

- **`KitCharts.pctFmt`**: percentage formatter that drops the decimal when a
  value doesn't need it, so a whole-number tick set reads `60%`, not `60.0%`
  (Clément: "why .0 if all tick labels are full numbers"). Reports were each
  defining `v => (100*v).toFixed(1) + "%"`; use `yFmt: KitCharts.pctFmt`
  instead. Single-argument on purpose — it gets passed as a bare callback.
- `frame()`'s y-title margin reserve now reuses `estTextWidth` instead of its
  own char-width constant; `estTextWidth` is exported.

## v0.6.2 — 2026-07-30

- **`frame()` reserves space for the rotated y-axis title.** The title is drawn
  in a fixed ~11px band at the left edge while tick labels are right-anchored at
  `m.l - 6`, so any chart with wide labels ("60.0%") and a default-ish `m.l` had
  the title touching the numbers (Clément, on the dose_open v3 report: "the y
  axis label is too close to the ticks" — and it was every figure, not one).
  `m.l` is now widened to `max(m.l, labelWidth + 26)` when a `yTitle` is set;
  it only ever grows, so callers that already left room are unaffected.

## v0.6.1 — 2026-07-30

- **`groupedBars` per-run overlay dots follow the value's color override**
  (`p.color || d.color || colorOf(series)`). Bars colored per-entity via
  `d.color` (e.g. checkpoint hue with condition carried by hatch) got overlay
  dots in the series-index fallback color — a hue that belonged to a different
  entity on the same chart. Found on the dose_open v3 report (per-tier dots
  rendered blue/orange over checkpoint-colored bars).

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
- `charts.js` heatmap: `cell.color` overrides the ramp fill (semantic-hue
  heatmaps: caller computes a color-mix per cell, intensity in the mix).
- `charts.js` heatmap: `xTitle`/`yTitle` axis titles (margins auto-bump),
  `cell.hatch` (color string → diagonal pattern via the shared makeHatch — for
  unscored/boundary cells), `cell.outline` (per-cell frame when outlineMax's
  biggest-|value| rule isn't the cell you mean, e.g. "biggest unfaithful
  cell"). (Clément: joint-table heatmaps must color by FAITHFULNESS — green =
  answer matches CoT stance, red = contradicts, à la taxonomy_plots.py grids —
  not by answer category; and always carry axis titles.)
- `explorer.js`: dim spec accepts `optionLabel(value)` — dropdown shows a
  reader-facing phrase while option VALUES stay the raw row values (set() and
  filtering unchanged). (Clément: internal arm codes must not leak into the
  explorer UI.)
- `explorer.js`: after "Draw N random", "show more" now draws MORE random
  from the not-yet-shown remainder (labeled "show N more random") instead of
  falling back to the first N of the filtered list; filter changes still exit
  random mode. (Clément.)
- `charts.js` dotStrip: opt-in `spec.onDotClick(dot, row)` with an invisible
  r=9 halo per dot so the 3.5px dots are actually clickable. (Clément: every
  figure should drive the explorer on click.)

## 2026-07-29
- `cards.js`: `card()` gains optional `noteLabel` (default "judge note") — the note
  slot was hardcoded to "judge note", wrong when the note is e.g. a curator's
  why-picked line (dose_open flip explorer).
