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
BODY = "".join(
    f'<h2 id="{i}">{lbl}</h2><p>Body.</p><div style="height:900px"></div>'
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
KitCards.observeShort();
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
