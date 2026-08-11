"""Behaviour smoke: drives a real rendered kit page in a headless browser.

smoke_kit_build.py checks the BUILDER. This checks what the built page does,
which is where the kit's regressions have actually been:

  v0.6.11  selecting text inside a card toggled it collapsed
  v0.6.17  every anchor landed ~40px short on the first click (two smooth
           scrolls at one target do not land on it)
  v0.6.18  an anchor click RELOADED the artifact frame and 403'd, because
           `href="#x"` resolves against the document's <base>, and an artifact
           frame's base drops the query carrying its auth token
  v0.6.20  legends became interactive (a click re-renders the chart without the
           series) and filter dimensions went back to single-select
  v0.6.21  the theme cycler has to hold its choice against the frame re-stamping
           `data-theme` on <html>, and hand control back in system mode

The page is served under a query-bearing url with a query-dropping <base> —
the artifact frame's exact shape — so that last one stays caught. A control at
the end proves the harness reproduces it rather than asserting vacuously.

    uv run --no-project --with playwright python small-smokes/smoke_kit_behaviour.py
"""
import sys
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fixture_report import write  # noqa: E402

ANCHORS = ["sec2", "sec3", "a1", "a3", "a5", "appendix"]
CONTROL = ('<base href="/"><a href="#x">go</a>'
           '<div style="height:3000px"></div><h2 id="x">target</h2>')
fails = []


def check(label, ok, detail=""):
    print(f"  {'ok  ' if ok else 'FAIL'} {label}{'  ' + detail if detail else ''}")
    if not ok:
        fails.append(label)


with tempfile.TemporaryDirectory() as td:
    page_html = write(Path(td) / "fixture.html").read_text()
    # the <base> is what makes a plain fragment link a cross-document navigation
    page_html = page_html.replace("<title>", '<base href="/">\n<title>', 1)

    with sync_playwright() as pw:
        b = pw.chromium.launch()
        pg = b.new_page(viewport={"width": 1400, "height": 900})
        errs, loads = [], []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.on("load", lambda _: loads.append(pg.evaluate("location.href")))
        pg.route("**/fixture*", lambda r: r.fulfill(
            status=200, content_type="text/html", body=page_html))
        pg.goto("https://example.test/fixture?__frame_t=TOKEN")
        pg.wait_for_timeout(600)
        start = pg.evaluate("location.href").split("#")[0]

        top = lambda i: pg.evaluate(                                    # noqa: E731
            f"() => Math.round(document.getElementById('{i}').getBoundingClientRect().top)")

        def settled(timeout=6000):
            """Smooth-scroll duration scales with distance — a fixed wait passes
            for near anchors and fails for far ones, which reads as a bug."""
            last, still = None, 0
            for _ in range(timeout // 100):
                pg.wait_for_timeout(100)
                y = pg.evaluate("() => Math.round(scrollY)")
                still = still + 1 if y == last else 0
                last = y
                if still >= 3:
                    return
            raise AssertionError("scroll never settled")

        print("anchors — land on target, without navigating")
        pg.locator("#toc .toc-caret").click()          # reveal the child links
        pg.wait_for_timeout(300)
        for i in ANCHORS:
            pg.evaluate("scrollTo({top: 0, behavior: 'instant'})")
            pg.wait_for_timeout(150)
            pg.locator(f"#toc a[href='#{i}']").click()
            settled()
            landed, kept = top(i), pg.evaluate("location.href").split("#")[0] == start
            check(f"#{i}", abs(landed) < 40 and kept, f"top={landed}px url-kept={kept}")
        check("no extra document loads", len(loads) == 1, f"loads={len(loads)}")

        print("toc group — follows the reader until pinned")
        box = pg.locator("#toc .toc-children")
        a1 = pg.locator("#toc a[href='#a1']")
        caret = pg.locator("#toc .toc-caret")
        goto = lambda s: (pg.locator(s).scroll_into_view_if_needed(),     # noqa: E731
                          pg.wait_for_timeout(400))
        # a reload, not a second click: pinning is deliberately one-way, so there
        # is no click sequence that returns the group to following the reader
        pg.reload(); pg.wait_for_timeout(600)
        goto("#sec1")
        check("folded outside the appendix", not a1.is_visible())
        goto("#a3")
        check("unfolds inside the appendix", a1.is_visible())
        goto("#sec1")
        check("folds again on the way out", not a1.is_visible())
        caret.click(); pg.wait_for_timeout(300)
        goto("#a3"); goto("#sec1")
        check("stays open once pinned", a1.is_visible())
        caret.click(); pg.wait_for_timeout(300)
        goto("#a3")
        check("stays closed once pinned closed", not a1.is_visible())
        caret.focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
        check("chevron responds to Enter", a1.is_visible())
        check("panel does not scroll sideways", not pg.evaluate(
            "() => {const p = document.querySelector('.sidebar .panel');"
            "return p.scrollWidth > p.clientWidth;}"))

        print("theme cycler — system is the default and a real third state")
        btn = pg.locator(".kit-theme")
        bg = lambda: pg.evaluate(                                        # noqa: E731
            "() => getComputedStyle(document.body).backgroundColor")
        stamp = lambda: pg.evaluate(                                     # noqa: E731
            "() => document.documentElement.dataset.theme ?? null")
        check("mounts top-right of the panel's own kicker", pg.evaluate(
            "() => { const h = document.querySelector('.sidebar .panel-head');"
            " return !!h && h.firstElementChild.classList.contains('kicker')"
            " && h.lastElementChild.classList.contains('kit-theme'); }"))
        check("starts on system, stamping nothing",
              pg.evaluate("() => KitTheme.mode") == "system" and stamp() is None)
        was = bg()
        btn.click(); pg.wait_for_timeout(150)
        check("click 1 → light", pg.evaluate("() => KitTheme.mode") == "light")
        btn.click(); pg.wait_for_timeout(150)
        check("click 2 → dark, and the page repaints",
              pg.evaluate("() => KitTheme.mode") == "dark" and bg() != was, f"{was} -> {bg()}")
        # the artifact frame re-stamps data-theme whenever the viewer's CLIENT theme
        # changes — an explicit in-page choice has to outlive that
        pg.evaluate("() => { document.documentElement.dataset.theme = 'light'; }")
        pg.wait_for_timeout(200)
        check("an explicit choice survives the frame re-stamping the theme",
              stamp() == "dark", f"stamp={stamp()}")
        btn.click(); pg.wait_for_timeout(150)
        check("click 3 → back to system, clearing the stamp", pg.evaluate(
            "() => KitTheme.mode === 'system' && !document.documentElement.dataset.theme"
            " && !document.documentElement.style.colorScheme"))
        pg.evaluate("() => { document.documentElement.dataset.theme = 'dark'; }")
        pg.wait_for_timeout(200)
        check("and in system mode the frame drives the page again",
              stamp() == "dark" and bg() != was, f"stamp={stamp()} bg={bg()}")
        pg.evaluate("() => { delete document.documentElement.dataset.theme; }")
        pg.wait_for_timeout(150)

        print("legends — a click hides a series, and the chart re-lays out")
        # `.mark` is the a11y/tooltip target: one per drawn (group, series) cell,
        # so counting them counts what the chart actually drew
        marks = lambda fig: pg.locator(f"#{fig} .mark").count()          # noqa: E731
        entry = lambda fig, name: pg.locator(                            # noqa: E731
            f"#{fig} .kit-legend-live > span", has_text=name).first
        pg.locator("#fig1").scroll_into_view_if_needed()
        pg.wait_for_timeout(200)
        check("grouped: 3 groups x 2 series, one cell empty", marks("fig1") == 5,
              f"marks={marks('fig1')}")
        check("legend entries are buttons",
              pg.locator("#fig1 .kit-legend-live > span[role=button]").count() == 2)
        # a group label must sit over the bars that group actually draws — with a
        # series hidden its slot is half empty, and a slot-centred label points at
        # blank canvas
        label_offsets = """() => {
          const bars = [...document.querySelectorAll('#fig1 rect')]
            .filter(r => !r.classList.contains('halo') && !r.classList.contains('mark'))
            .map(r => r.getBBox());
          const labels = [...document.querySelectorAll('#fig1 text')]
            .filter(t => /^g[0-9]$/.test(t.textContent))
            .map(t => { const b = t.getBBox(); return { c: b.x + b.width / 2, bars: [] }; });
          for (const b of bars) {
            const bc = b.x + b.width / 2;
            labels.reduce((best, l) =>
              Math.abs(l.c - bc) < Math.abs(best.c - bc) ? l : best).bars.push(b);
          }
          return labels.map(l => l.bars.length === 0 ? 999 : Math.round(Math.abs(l.c -
            (Math.min(...l.bars.map(b => b.x)) +
             Math.max(...l.bars.map(b => b.x + b.width))) / 2)));
        }"""
        off = pg.evaluate(label_offsets)   # 999 = that group drew no bars
        check("labels are centred over their bars", max(off) <= 3, f"offsets={off}")
        entry("fig1", "beta").click()
        pg.wait_for_timeout(200)
        check("hiding a series drops its marks", marks("fig1") == 2, f"marks={marks('fig1')}")
        off = pg.evaluate(label_offsets)
        check("labels follow the bars that are left", max(off[:2]) <= 3, f"offsets={off}")
        # g3 was beta-only: absence is data, so it keeps its label and its gap
        check("a group left with nothing keeps its label", off[2] == 999, f"offsets={off}")
        check("its entry reads as off",
              entry("fig1", "beta").get_attribute("aria-pressed") == "false")
        check("survivors keep their color", pg.evaluate(
            "() => document.querySelector('#fig1 .kit-legend .sw').style.background"
            "      === 'var(--series-1)'"))
        check("the caller's caption is still last", pg.evaluate(
            "() => document.getElementById('fig1').lastElementChild.id === 'cap1'"))
        entry("fig1", "alpha").click()
        pg.wait_for_timeout(200)
        check("the last visible series can't be hidden", marks("fig1") == 2,
              f"marks={marks('fig1')}")
        entry("fig1", "beta").click()
        pg.wait_for_timeout(200)
        check("clicking again brings it back", marks("fig1") == 5, f"marks={marks('fig1')}")
        # fig2 is two panels sharing one legend (only the lower renders it)
        check("stacked: 2 panels x 3 groups x 3 segments", marks("fig2") == 18,
              f"marks={marks('fig2')}")
        check("only the lower panel draws the legend",
              pg.locator("#fig2a .kit-legend").count() == 0
              and pg.locator("#fig2b .kit-legend-live").count() == 1)
        stack_h = lambda sel: pg.evaluate(                               # noqa: E731
            "sel => {const r = [...document.querySelectorAll(sel + ' rect')]"
            ".map(e => e.getBBox()); return Math.round(Math.max(...r.map(b => b.y + b.height))"
            " - Math.min(...r.map(b => b.y)));}", sel)
        before = stack_h("#fig2a"), stack_h("#fig2b")
        entry("fig2", "s2").click()
        pg.wait_for_timeout(300)
        after = stack_h("#fig2a"), stack_h("#fig2b")
        check("hiding a segment compacts the stack", marks("fig2") == 12 and after[1] < before[1],
              f"{before[1]} -> {after[1]}")
        check("and the panel sharing the legend follows", after[0] < before[0],
              f"{before[0]} -> {after[0]}")
        check("line: one legend entry per line",
              pg.locator("#fig3 .kit-legend-live > span").count() == 2)
        entry("fig3", "L2").click()
        pg.wait_for_timeout(200)
        check("hiding a line drops its dots", marks("fig3") == 3, f"marks={marks('fig3')}")

        print("filters — a dimension is a dropdown, multi is opt-in")
        pg.locator("#explorer").scroll_into_view_if_needed()
        pg.wait_for_timeout(200)
        dim = lambda i: pg.locator("#explorer .ex-dim").nth(i)           # noqa: E731
        shown = lambda: pg.evaluate(                                     # noqa: E731
            "() => document.querySelector('#explorer .ex-count').textContent")
        check("single-select dim has no chip row",
              dim(0).locator(".ex-chips").count() == 0)
        dim(0).locator("select").select_option("y")
        pg.wait_for_timeout(200)
        check("picking a value filters", shown().startswith("8 samples"), shown())
        check("the dropdown shows it",
              dim(0).locator("select").input_value() == "y")
        dim(0).locator("select").select_option("__all__")
        pg.wait_for_timeout(200)
        check("picking 'all' clears it", shown().startswith("24 samples"), shown())
        dim(1).locator("select").select_option("p")
        pg.wait_for_timeout(150)
        dim(1).locator("select").select_option("q")
        pg.wait_for_timeout(200)
        check("multi dim accumulates chips", dim(1).locator(".ex-chip").count() == 2)
        check("both values are unconstrained together",
              shown().startswith("24 samples"), shown())
        # the outline is the affordance: at rest it must not be transparent
        check("a chip is outlined at rest", pg.evaluate(
            "() => {const c = getComputedStyle(document.querySelector('#explorer .ex-chip'));"
            "return !/, *0\\)/.test(c.borderTopColor) && c.borderTopStyle === 'solid';}"))
        dim(1).locator(".ex-chip").first.click()
        dim(1).locator(".ex-chip").first.click()
        pg.wait_for_timeout(200)

        # v0.6.22: a filter used to show the HEAD of the corpus, and a corpus is
        # written grouped (all of arm x, then y, then z) — so page 1 of any
        # filter was a systematically skewed look at it. The fixture's 24 rows
        # are grouped that way on purpose: arm z lives at indices 16..23, so it
        # cannot appear in an unshuffled first page of 12.
        print("draws — a filter shows a random sample, not the first page")
        texts = lambda: pg.evaluate(                                      # noqa: E731
            "() => [...document.querySelectorAll('#explorer .card .pt-body')]"
            ".map(e => e.textContent.slice(0, 9))")
        draws = []
        for v in ["y", "__all__"] * 3:
            dim(0).locator("select").select_option(v)
            pg.wait_for_timeout(150)
            if v == "__all__":
                draws.append(texts())
        check("the page is not the corpus head",
              any(any("row z" in t for t in d) for d in draws), str(draws[0]))
        check("re-filtering re-draws", len({tuple(d) for d in draws}) > 1)
        check("a draw holds no row twice", all(len(set(d)) == len(d) for d in draws))
        before = texts()
        pg.locator("#explorer .ex-more").click()
        pg.wait_for_timeout(200)
        after = texts()
        check("'show more' extends the same draw", after[:len(before)] == before)
        check("and adds rows it hasn't shown", len(set(after)) == 24, str(len(set(after))))

        print("search — the three find-widget flags")
        sbox = pg.locator("#explorer input[type=search]")
        flag = lambda k: pg.locator(f"#explorer .ex-flag-{k}")            # noqa: E731
        n = lambda: int(shown().split()[0])                              # noqa: E731

        def find(text, wait=350):
            sbox.fill(text)
            pg.wait_for_timeout(wait)

        find("ROW XP0")
        check("case-insensitive substring by default", n() == 1, shown())
        flag("case").click()
        pg.wait_for_timeout(300)
        check("Aa makes it case-sensitive", n() == 0, shown())
        check("the flag reads as pressed",
              flag("case").get_attribute("aria-pressed") == "true")
        flag("case").click()
        find("ro")
        check("substring still matches a prefix", n() == 24, shown())
        flag("word").click()
        pg.wait_for_timeout(300)
        check("ab_ requires a whole word", n() == 0, shown())
        find("row")
        check("and matches one", n() == 24, shown())
        flag("word").click()
        find("row x[pq]0")
        check("a regex is literal until asked for", n() == 0, shown())
        flag("regex").click()
        pg.wait_for_timeout(300)
        check(".* turns it on", n() == 2, shown())
        find("row (x")
        check("an uncompilable pattern says so", "doesn't compile" in shown(), shown())
        check("and marks the box", "bad" in (sbox.get_attribute("class") or ""))
        flag("regex").click()
        find("")
        check("clearing the box restores everything", n() == 24, shown())

        print("search — every match is highlighted in the cards shown")
        hits = lambda: pg.locator("#explorer mark.hit").count()          # noqa: E731
        check("nothing is marked with an empty query", hits() == 0)
        find("row xp")
        # 4 cards shown (xp0..xp3), each with the phrase once in its pane
        check("each shown card gets its hit marked", hits() == 4, f"marks={hits()}")
        check("the mark holds exactly the match", pg.evaluate(
            "() => document.querySelector('#explorer mark.hit').textContent") == "row xp")
        check("and only inside the card body", pg.evaluate(
            "() => [...document.querySelectorAll('#explorer mark.hit')]"
            ".every(m => !m.closest('.lab, .chip, .pt-more'))"))
        flag("case").click()
        find("ROW XP")
        check("a case-sensitive miss marks nothing", hits() == 0, f"marks={hits()}")
        flag("case").click()
        find("needle")            # only in the one long row, past the clamp
        check("a hit below the clamp is counted on the affordance", pg.evaluate(
            "() => document.querySelector('#explorer .ptext.has-hits .pt-more')"
            "?.dataset.hits") == "1 match")
        check("that block is not short (so the count is visible)",
              pg.locator("#explorer .ptext.has-hits.short").count() == 0)
        find("")
        check("clearing the query clears the marks", hits() == 0)

        print("url — the explorer's own state is in the hash, and comes back")
        href = lambda: pg.evaluate("location.href")                      # noqa: E731
        hsh = lambda: pg.evaluate("location.hash")                       # noqa: E731
        pg.locator("#explorer").scroll_into_view_if_needed()
        pg.wait_for_timeout(200)
        entries = pg.evaluate("() => history.length")
        y0 = pg.evaluate("() => Math.round(scrollY)")
        dim(0).locator("select").select_option("z")
        pg.wait_for_timeout(250)
        check("picking a value writes it", hsh() == "#explorer?arm=z", hsh())
        check("the frame's auth token survives the write", "__frame_t=TOKEN" in href(), href())
        check("no history entry per edit", pg.evaluate("() => history.length") == entries,
              f"{entries} -> {pg.evaluate('() => history.length')}")
        check("and the reader is not scrolled", abs(pg.evaluate("() => Math.round(scrollY)") - y0) < 40)
        dim(1).locator("select").select_option("p")
        dim(1).locator("select").select_option("q")
        pg.wait_for_timeout(250)
        check("a multi dim repeats its key", hsh() == "#explorer?arm=z&tag=p&tag=q", hsh())
        find("needle")
        check("the query rides along", "_q=needle" in hsh(), hsh())
        flag("case").click()
        pg.wait_for_timeout(300)
        check("so do the search flags", "_f=c" in hsh(), hsh())
        shared = href()
        pg.locator("#explorer .ex-clear").click()
        pg.wait_for_timeout(250)
        check("clearing empties the query string", hsh() == "#explorer", hsh())

        pg.goto(start)                       # a plain load must not carry state over
        pg.wait_for_timeout(500)
        pg.goto(shared)
        pg.reload()
        pg.wait_for_timeout(700)
        check("a pasted url restores the dimensions",
              dim(0).locator("select").input_value() == "z"
              and dim(1).locator(".ex-chip").count() == 2,
              dim(0).locator("select").input_value())
        check("…the query and its flags",
              pg.locator("#explorer input[type=search]").input_value() == "needle"
              and pg.locator("#explorer .ex-flag-case").get_attribute("aria-pressed") == "true")
        check("…and so lands on the same rows", shown().startswith("1 samples"), shown())
        # a chart click means "show me these rows": a query left over from the
        # reader's last look would silently show fewer than the mark they clicked
        pg.evaluate("() => exNav.goto({ arm: 'y' })")
        pg.wait_for_timeout(500)
        check("a chart jump clears a stale query", shown().startswith("8 samples")
              and pg.locator("#explorer input[type=search]").input_value() == "", shown())
        pg.locator("#explorer .ex-clear").click()
        pg.wait_for_timeout(200)

        # inside the claude.ai frame the address bar belongs to the host page,
        # so the hash above is invisible: the button is the only handle a reader
        # has on the view they built
        print("copy link — the url as a string, without the frame's token")
        ctx = pg.context
        ctx.grant_permissions(["clipboard-read", "clipboard-write"])
        dim(0).locator("select").select_option("y")
        pg.wait_for_timeout(250)
        link = pg.locator("#explorer .ex-link")
        check("the button is in the action row", link.count() == 1)
        link.click()
        pg.wait_for_timeout(300)
        copied = pg.evaluate("() => navigator.clipboard.readText()")
        check("copies the current view", copied.endswith("#explorer?arm=y"), copied)
        check("and drops the frame's auth token", "__frame_t" not in copied, copied)
        check("the button says so", "copied" in link.text_content())
        pg.locator("#explorer .ex-clear").click()
        pg.wait_for_timeout(200)

        print("shared views — the code round trip, in the frame a report lives in")
        # the real environment: the report is an iframe, its url is signed and
        # build-specific, and the address bar belongs to the host page. So the
        # shareable object is a code, not a url — and this is the only place the
        # framed branch of that code runs.
        pg.route("**/host*", lambda r: r.fulfill(
            status=200, content_type="text/html",
            body='<iframe src="/fixture?__frame_t=TOKEN" '
                 'style="width:1280px;height:2000px;border:0"></iframe>'))
        pg.goto("https://example.test/host")
        pg.wait_for_timeout(1200)
        fr = pg.frame_locator("iframe")
        inner = pg.frames[1]
        fshown = lambda: inner.evaluate(                                  # noqa: E731
            "() => document.querySelector('#explorer .ex-count').textContent")
        fdim = lambda i: fr.locator("#explorer .ex-dim").nth(i)           # noqa: E731
        check("framed: the button offers a view, not a url",
              fr.locator("#explorer .ex-link").text_content() == "copy this view")
        fdim(0).locator("select").select_option("y")
        pg.wait_for_timeout(300)
        fr.locator("#explorer .ex-link").click()
        pg.wait_for_timeout(400)
        got = inner.evaluate("() => navigator.clipboard.readText().catch(() => "
                             "document.querySelector('.ex-link-out')?.value || '')")
        check("copies the view as a code", got == "#explorer?arm=y", repr(got))
        check("  (not this document's signed url)", "__frame_t" not in got
              and "example.test" not in got, repr(got))
        fr.locator("#explorer .ex-clear").click()
        pg.wait_for_timeout(300)
        fr.locator("#explorer .ex-paste-open").click()
        fr.locator("#explorer .ex-paste").fill("#explorer?arm=y&tag=p")
        fr.locator("#explorer .ex-paste").press("Enter")
        pg.wait_for_timeout(400)
        check("pasting one back restores the view", fshown().startswith("4 samples"), fshown())
        check("and the box closes itself", fr.locator("#explorer .ex-paste").is_hidden())
        fr.locator("#explorer .ex-paste-open").click()
        fr.locator("#explorer .ex-paste").fill("#a3")
        fr.locator("#explorer .ex-paste").press("Enter")
        pg.wait_for_timeout(400)
        check("a section handle works there too",
              inner.evaluate("location.hash") == "#a3",
              inner.evaluate("location.hash"))
        fr.locator("#explorer .ex-paste-open").click()
        fr.locator("#explorer .ex-paste").fill("who knows what this is")
        fr.locator("#explorer .ex-paste").press("Enter")
        pg.wait_for_timeout(400)
        check("garbage is refused, not silently applied as 'clear everything'",
              "bad" in (fr.locator("#explorer .ex-paste").get_attribute("class") or "")
              and fshown().startswith("4 samples"), fshown())
        pg.goto(start)
        pg.wait_for_timeout(700)

        print("headings — every section is a link to itself")
        h = pg.locator("h2#sec2")
        h.scroll_into_view_if_needed()
        pg.wait_for_timeout(200)
        check("the # affordance is there but hidden at rest",
              h.locator(".h-link").count() == 1
              and pg.evaluate("() => getComputedStyle(document.querySelector"
                              "('h2#sec2 .h-link')).opacity") == "0")
        h.click()
        pg.wait_for_timeout(300)
        got = pg.evaluate("() => navigator.clipboard.readText()")
        check("clicking the title copies its deep link", got.endswith("#sec2")
              and "__frame_t" not in got, got)
        check("and says it did", "done" in
              (h.locator(".h-link").get_attribute("class") or ""))
        # the same guard cards use: dragging across a title is a selection
        bb = h.bounding_box()
        pg.evaluate("() => navigator.clipboard.writeText('untouched')")
        pg.mouse.move(bb["x"] + 8, bb["y"] + bb["height"] / 2)
        pg.mouse.down()
        pg.mouse.move(bb["x"] + 120, bb["y"] + bb["height"] / 2, steps=8)
        pg.mouse.up()
        pg.wait_for_timeout(300)
        check("selecting the title does not copy a link",
              pg.evaluate("() => navigator.clipboard.readText()") == "untouched")
        pg.evaluate("() => getSelection().removeAllRanges()")

        print("cards — a text selection is not a click")
        card = pg.locator("#cards .ptext").first
        card.scroll_into_view_if_needed()
        pg.wait_for_timeout(200)
        bb = card.bounding_box()
        pg.mouse.move(bb["x"] + 20, bb["y"] + 10)
        pg.mouse.down()
        pg.mouse.move(bb["x"] + 260, bb["y"] + 34, steps=8)
        pg.mouse.up()
        pg.wait_for_timeout(300)
        expanded = lambda: pg.evaluate(                                  # noqa: E731
            "() => document.querySelector('#cards .ptext').classList.contains('expanded')")
        check("drag-select leaves it collapsed", not expanded())
        check("selection survived", pg.evaluate("() => String(getSelection()).length") > 0)
        card.click()
        pg.wait_for_timeout(300)
        check("a plain click still expands", expanded())

        check("no console errors", not errs, str(errs[:2]))

        # Control: the same shape WITHOUT the kit must reproduce the v0.6.18 bug,
        # or the url-kept assertions above prove nothing.
        c = b.new_page()
        hits = []
        c.on("load", lambda _: hits.append(1))
        c.route("**/ctl*", lambda r: r.fulfill(
            status=200, content_type="text/html", body=CONTROL))
        c.goto("https://example.test/ctl?__frame_t=TOKEN")
        c.wait_for_timeout(200)
        c.locator("a[href='#x']").click()
        c.wait_for_timeout(600)
        print("control — a plain anchor under the same <base>")
        check("does navigate away (so the checks above mean something)",
              len(hits) > 1 and "__frame_t" not in c.evaluate("location.href"))
        b.close()

v = (Path(__file__).resolve().parent.parent / "VERSION").read_text().strip()
print(f"\n{'FAILED: ' + ', '.join(fails) if fails else 'ALL PASS'} (kit v{v})")
sys.exit(1 if fails else 0)
