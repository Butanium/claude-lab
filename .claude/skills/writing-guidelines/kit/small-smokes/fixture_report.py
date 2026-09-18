"""Build a minimal but real kit report, for the behaviour smoke to drive.

Deliberately not a copy of any published report: those are 13 MB of embedded
payload and live outside git, so a smoke that needs one is a smoke nobody runs.
This is the smallest page that still has the parts whose behaviour has broken
before — a sidebar TOC with a group, in-page anchors, enough height to scroll,
and an expandable card.
"""
import sys
from pathlib import Path

KIT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KIT))
from kit_build import build  # noqa: E402

SECTIONS = [("sec1", "1 · First finding"), ("sec2", "2 · Second finding"),
            ("sec3", "3 · Third finding")]
APPENDIX = [(f"a{i}", f"A{i} · appendix section {i}") for i in range(1, 6)]

LONG = " ".join(f"Sentence number {i} of a block long enough to clamp."
                for i in range(40))
# the three chart shapes that carry a legend, and an explorer with one dimension
# of each kind
FIGURES = ('<div id="fig1"></div><div id="fig2"></div>'
           '<div id="fig3"></div><div id="explorer"></div>'
           '<div id="fig4"></div><div id="fig5"></div><div id="fig-torn"></div>'
           '<div id="explorer2"></div>')
BODY = "".join(
    f'<h2 id="{i}">{lbl}</h2><p>Body.</p>{FIGURES if i == "sec1" else ""}'
    f'<div style="height:900px"></div>'
    for i, lbl in SECTIONS)
BODY += '<h2 id="appendix">Appendix</h2><div id="cards"></div>'
BODY += "".join(
    f'<h3 id="{i}">{lbl}</h3><p>Body.</p><div style="height:700px"></div>'
    for i, lbl in APPENDIX)
# every anchor must be reachable, or "landed short" is the page bottom, not a bug
BODY += '<div style="height:1600px"></div>'

TEMPLATE = """<title>kit behaviour fixture</title>
<link rel="icon" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHRleHQgeT0iMTQiIGZvbnQtc2l6ZT0iMTQiPvCfp6o8L3RleHQ+PC9zdmc+">
<style>/*%%KIT_CSS%%*/</style>
<div class="page">
  <aside class="sidebar"><div class="panel">
    <span class="kicker">On this page</span>
    <nav id="toc"></nav>
    <!-- a second TOC built LATE from auto-collected headings: the shape that
         broke in v0.7.3 (labels picking up the "#" copy-link button) -->
    <nav id="toc-auto"></nav>
  </div></aside>
  <main class="content">
    <h1>kit behaviour fixture</h1>
    <p>Anchors to drive: %%INLINE_LINKS%%</p>
    %%BODY%%
  </main>
</div>
<script>/*%%KIT_JS%%*/

KitToc.build(document.getElementById("toc"), { items: [
  %%TOC_ITEMS%%
] });

document.getElementById("cards").appendChild(KitCards.card({
  meta: ["fixture", "card 1"],
  panes: [{ label: "long text", text: %%LONG%% }],
}));

const GROUPS = ["g1", "g2", "g3"], SERIES = [{ name: "alpha" }, { name: "beta" }];
const values = [];
for (const g of GROUPS) for (const s of SERIES)
  /* g3 has no alpha — an empty slot inside a group is the common case (a series
     that doesn't apply there), and the axis label has to cope with it */
  if (!(g === "g3" && s.name === "alpha"))
    values.push({ group: g, series: s.name, n: 40,
                  est: 0.2 + 0.1 * GROUPS.indexOf(g) + (s.name === "beta" ? 0.3 : 0) });
KitCharts.groupedBars(document.getElementById("fig1"),
  { groups: GROUPS, series: SERIES, values, yMax: 1, yFmt: KitCharts.pctFmt,
    /* clickable bars: the hint line belongs in the tooltip, never in a caption */
    select: { rows: (d, s, g) => ({ group: g, series: s.name }),
              go: (f) => { window.__lastBarClick = `${f.group}/${f.series}`; } } });
/* appended AFTER the chart: a legend toggle re-renders it, and the caller's own
   nodes must stay where the caller put them */
document.getElementById("fig1").insertAdjacentHTML("beforeend",
  '<p id="cap1">caption stays last</p>');

/* two panels sharing one legend (only the lower one renders it), the pattern a
   legendGroup exists for: one click must re-render both */
const SEGS = [{ name: "s1" }, { name: "s2" }, { name: "s3" }], sv = [];
for (const g of GROUPS) SEGS.forEach((s, i) => sv.push({ group: g, segment: s.name, count: 10 + 5 * i }));
const pair = KitCharts.legendGroup();
for (const [id, legendItems] of [["fig2a", []], ["fig2b", undefined]]) {
  const sub = document.getElementById("fig2").appendChild(document.createElement("div"));
  sub.id = id;
  KitCharts.stackedBars(sub,
    { groups: GROUPS, segments: SEGS, values: sv, legendItems, legendGroup: pair });
}

KitCharts.line(document.getElementById("fig3"), {
  series: [{ name: "L1", points: [{ x: 0, y: 0.2 }, { x: 1, y: 0.4 }, { x: 2, y: 0.6 }] },
           { name: "L2", points: [{ x: 0, y: 0.5 }, { x: 1, y: 0.3 }, { x: 2, y: 0.1 }] }],
  yMax: 1, yFmt: KitCharts.pctFmt });

const rows = [];
for (const arm of ["x", "y", "z"]) for (const tag of ["p", "q"])
  for (let k = 0; k < 4; k++) rows.push({ arm, tag, text: `row ${arm}${tag}${k}` });
/* one long row, so a search hit has somewhere to hide below the 6-line clamp */
rows[rows.length - 1].text += " " + %%LONG%% + " needle";
const exApi = KitExplorer.explorer(document.getElementById("explorer"), {
  data: rows,
  dims: [{ key: "arm", label: "arm" }, { key: "tag", label: "tag", multi: true }],
  search: ["text"],
  render: r => KitCards.card({ meta: [r.arm, r.tag], panes: [{ label: "row", text: r.text }] }),
});
window.exNav = KitExplorer.hashNav(exApi, { anchorId: "explorer" });

/* spec.select's three gestures, over a corpus DELIBERATELY wider than the
   chart: arm "w" and tag "r" exist in the rows and in no bar, so "the rows no
   bar covers" is a non-empty answer rather than a vacuous one. */
const rows2 = [], nOf = arm => (arm === "z" ? 2 : 4);
for (const arm of ["x", "y", "z", "w"]) for (const tag of ["p", "q", "r"])
  for (let k = 0; k < nOf(arm); k++) rows2.push({ arm, tag, text: `r2 ${arm}${tag}${k}` });
const ex2 = KitExplorer.explorer(document.getElementById("explorer2"), {
  data: rows2,
  dims: [{ key: "arm", label: "arm", multi: true }, { key: "tag", label: "tag", multi: true }],
  render: r => KitCards.card({ meta: [r.arm, r.tag], panes: [{ label: "row", text: r.text }] }),
});
const nav2 = KitExplorer.hashNav(ex2, { anchorId: "explorer2" });
/* a rate axis with headroom only for the bars: the complement of a 6% bar is
   94%, far above the ceiling, so its wash has to be cut rather than capped */
KitCharts.groupedBars(document.getElementById("fig-torn"), {
  groups: ["x", "y", "z"], series: [{ name: "p" }, { name: "q" }],
  values: ["x", "y", "z"].flatMap(g => [{ group: g, series: "p", est: 0.06, n: 40 },
                                        { group: g, series: "q", est: 0.09, n: 40 }]),
  yMax: 0.15, yFmt: KitCharts.pctFmt,
  select: { rows: (d, s, g) => ({ arm: g, tag: s.name }), go: f => nav2.goto(f) },
});
/* the same select spec on the other bar shape: grouped bars infer the mark's
   dimension from the SERIES, stacked from the segment, and neither report says
   which */
KitCharts.groupedBars(document.getElementById("fig5"), {
  groups: ["x", "y", "z"],
  series: [{ name: "p" }, { name: "q" }],
  values: ["x", "y", "z"].flatMap(g => [{ group: g, series: "p", est: 0.4, n: nOf(g) },
                                        { group: g, series: "q", est: 0.6, n: nOf(g) }]),
  yMax: 1, yFmt: KitCharts.pctFmt,
  select: {
    rows: (d, s, g) => ({ arm: g, tag: s.name }),
    go: (filters, info) => { window.__lastSelect = info.mode; nav2.goto(filters); },
  },
});
KitCharts.stackedBars(document.getElementById("fig4"), {
  groups: ["x", "y", "z"],
  segments: [{ name: "p" }, { name: "q" }],
  /* z's stack is half-height, so the band above it is blank and in-column —
     that is where the "none of these bars" gesture is aimed */
  values: ["x", "y", "z"].flatMap(g => [{ group: g, segment: "p", count: nOf(g) },
                                        { group: g, segment: "q", count: nOf(g) }]),
  percent: false,
  select: {
    rows: (d, s, g) => ({ arm: g, tag: s.name }),
    go: (filters, info) => { window.__lastSelect = info.mode; nav2.goto(filters); },
  },
});
KitCards.observeShort();

/* built last and asynchronously, from headings linkHeadings() has already
   stamped with their "#" button — the arrangement every payload-decoding
   report has, and the one that put a "#" on every sidebar label */
Promise.resolve().then(() => KitToc.build(document.getElementById("toc-auto")));
</script>
"""


def write(out: Path) -> Path:
    toc = ",\n  ".join(
        [f'{{ id: "{i}", label: "{lbl}" }}' for i, lbl in SECTIONS]
        + ['{ id: "appendix", label: "Appendix A1-A5", children: ['
           + ", ".join(f'{{ id: "{i}", label: "{lbl}" }}' for i, lbl in APPENDIX)
           + "] }"])
    links = " ".join(f'<a href="#{i}">{i}</a>' for i, _ in SECTIONS + APPENDIX)
    build(TEMPLATE, out, {
        "BODY": BODY, "TOC_ITEMS": toc, "INLINE_LINKS": links,
        "LONG": '"' + LONG + '"',
    })
    return out


if __name__ == "__main__":
    print(write(Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/kit_fixture.html")))
