"""Render a built report's charts in each interaction state, as one sheet to LOOK at.

Not a test. The assertions in smoke_kit_behaviour.py come from whoever wrote the
feature, so when that author's model of the design is wrong the assertions are
wrong the same way and pass anyway — which is how a ⇧ wash that spread across two
bars survived four green runs on 2026-09-17 until Clément opened the page. A
screenshot does not know what the author expected.

Use it while building an interaction, before showing anyone: open the sheet, look
at the states, fix what looks wrong. Then paste the sheet instead of "ALL PASS".

OUTPUT IS ONE IMAGE. `sheet.png` holds every chart in every state — a seven-chart
report lands at ~2400x2600, which survives the downscale well enough to see which
bar a wash is on and which tooltip is up. That is the whole cost of looking: one
read. (Two earlier cuts got this wrong: 26 loose PNGs, then one strip per chart,
both because I assumed a full sheet would be unreadable instead of rendering one and
checking. Clément asked "why not 1 sheet with all images?" and the answer was that it
works fine.)

Per-chart strips (`NN-<id>.png`) and full-resolution per-state frames (`states/`) are
written too, for when a detail is too small on the sheet — a torn edge, a hairline.
`--only fig-gap` while iterating on one figure.

    uv run --no-project --with playwright python small-smokes/contact_sheet.py \
        path/to/report.html [--out DIR] [--only fig-gap,fig-int] [--open]

Writes <out>/index.html (+ PNGs) and prints its path.
"""
import argparse
import html
from pathlib import Path

from playwright.sync_api import sync_playwright

STATES = ["rest", "hover", "shift on the mark", "shift on the background"]


def settle(pg, tries=40):
    """Scrolling is smooth here, and a box measured mid-flight aims at where the
    figure was — the bug that ate an hour of the session this script comes from."""
    last = None
    for _ in range(tries):
        pg.wait_for_timeout(100)
        y = pg.evaluate("() => Math.round(scrollY)")
        if y == last:
            return
        last = y


def shot(pg, path, box, pad=40):
    """Clip to the chart plus room for the tooltip, which is a body-level element
    parked at the pointer and therefore often outside the chart's own box."""
    vw, vh = pg.viewport_size["width"], pg.viewport_size["height"]
    x = max(0, box["x"] - pad)
    y = max(0, box["y"] - pad)
    pg.screenshot(path=str(path), clip={
        "x": x, "y": y,
        "width": min(box["width"] + 2 * pad, vw - x),
        "height": min(box["height"] + 2 * pad, vh - y),
    })


def strip(pg, out, fid, idx, made):
    """Tile one chart's states into a single labelled image. Composed by loading a
    tiny HTML page in the browser we already have open, so this needs no imaging
    library — and the caption sits in the picture, where a reader needs it."""
    cells = "".join(
        f'<figure><img src="states/{f}"><figcaption>{html.escape(state)}</figcaption></figure>'
        for state, f in made)
    sheet = out / f"_strip-{fid}.html"
    sheet.write_text(f"""<!doctype html><meta charset=utf-8><style>
 body {{ margin: 0; background: #fff; font: 13px system-ui, sans-serif; }}
 .row {{ display: flex; align-items: flex-start; }}
 figure {{ margin: 0; padding: 6px; width: 620px; }}
 img {{ width: 100%; display: block; border: 1px solid #e0e0e0; }}
 figcaption {{ padding: 4px 2px 0; color: #444; font-weight: 600; }}
 h1 {{ font-size: 14px; margin: 8px 8px 0; color: #222; }}
</style><h1>{html.escape(fid)}</h1><div class=row>{cells}</div>""")
    pg.goto("file://" + str(sheet))
    pg.wait_for_timeout(250)
    name = f"{idx:02d}-{fid}.png"
    pg.locator("body").screenshot(path=str(out / name))
    sheet.unlink()
    return name


def capture(pg, out, fid, idx):
    """One chart, four states. Returns [(state, filename), ...] for the states
    that exist — a chart with no clickable marks yields only `rest`."""
    host = pg.locator(f"#{fid}")
    host.scroll_into_view_if_needed()
    settle(pg)
    box = host.bounding_box()
    if not box or box["height"] < 20:
        return []
    made = []

    pg.mouse.move(4, 4)          # park the pointer off every mark
    pg.wait_for_timeout(150)
    name = f"{idx:02d}-{fid}-rest.png"
    shot(pg, out / "states" / name, box)
    made.append(("rest", name))

    marks = pg.locator(f"#{fid} [role=img]")
    if not marks.count():
        return made
    mbox = marks.first.bounding_box()
    if not mbox:
        return made
    # low in the mark, i.e. on its ink: a grouped bar's hit zone is its whole
    # column, so the centre of that box is usually blank canvas above the bar
    mx = mbox["x"] + mbox["width"] / 2
    my = mbox["y"] + mbox["height"] * 0.92

    for state, shift in [("hover", False), ("shift on the mark", True)]:
        if shift:
            pg.keyboard.down("Shift")
        pg.mouse.move(mx, my)
        pg.wait_for_timeout(250)
        name = f"{idx:02d}-{fid}-{state.replace(' ', '-')}.png"
        shot(pg, out / "states" / name, box)
        made.append((state, name))
        if shift:
            pg.keyboard.up("Shift")

    if pg.locator(f"#{fid} .kit-bg").count():
        # a point inside the plot that no mark covers — the gutter the background
        # gesture actually lives in
        gap = pg.evaluate(
            "(id) => { const bg = document.querySelector('#' + id + ' .kit-bg');"
            " const r = bg.getBoundingClientRect();"
            " const marks = [...document.querySelectorAll('#' + id + ' [role=img]')]"
            "   .map(m => m.getBoundingClientRect());"
            " for (let x = r.left + 2; x < r.right; x += 3)"
            "   if (!marks.some(m => x >= m.left && x <= m.right))"
            "     return {x, y: r.top + r.height * 0.4};"
            " return null; }", fid)
        if gap:
            pg.keyboard.down("Shift")
            pg.mouse.move(gap["x"], gap["y"])
            pg.wait_for_timeout(250)
            name = f"{idx:02d}-{fid}-shift-background.png"
            shot(pg, out / "states" / name, box)
            made.append(("shift on the background", name))
            pg.keyboard.up("Shift")
    return made


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("report")
    ap.add_argument("--out", default=None, help="default: <report>-states/ beside the report")
    ap.add_argument("--only", default=None, help="comma-separated chart ids")
    ap.add_argument("--width", type=int, default=1500)
    args = ap.parse_args()

    report = Path(args.report).resolve()
    out = Path(args.out) if args.out else report.with_name(report.stem + "-states")
    (out / "states").mkdir(parents=True, exist_ok=True)

    with sync_playwright() as pw:
        b = pw.chromium.launch()
        pg = b.new_page(viewport={"width": args.width, "height": 950}, device_scale_factor=2)
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto("file://" + str(report))
        pg.wait_for_timeout(2500)
        ids = ([s.strip() for s in args.only.split(",")] if args.only else pg.evaluate(
            "() => [...document.querySelectorAll('.kit-chart')].map(e => e.id).filter(Boolean)"))
        rows = []
        for i, fid in enumerate(ids):
            made = capture(pg, out, fid, i)
            if made:
                rows.append((fid, strip(pg, out, fid, i, made)))
                pg.goto("file://" + str(report))   # strip() navigated away
                pg.wait_for_timeout(1200)
            print(f"  {fid}: {', '.join(s for s, _ in made) or 'nothing to show'}")
        b.close()

    cells = "\n".join(f'<section><img src="{f}"></section>' for _, f in rows)
    whole = None
    if len(rows) > 1:
        sheet = out / "_sheet.html"
        sheet.write_text("<!doctype html><meta charset=utf-8>"
                         "<style>body{margin:0;background:#fff}img{display:block;width:100%}</style>"
                         + "".join(f'<img src="{f}">' for _, f in rows))
        with sync_playwright() as pw:
            b = pw.chromium.launch()
            pg = b.new_page(viewport={"width": 2400, "height": 900})
            pg.goto("file://" + str(sheet))
            pg.wait_for_timeout(400)
            pg.locator("body").screenshot(path=str(out / "sheet.png"))
            b.close()
        sheet.unlink()
        whole = "sheet.png"
    (out / "index.html").write_text(f"""<!doctype html><meta charset=utf-8>
<title>{html.escape(report.name)} — interaction states</title>
<style>
 body {{ font: 14px/1.5 system-ui, sans-serif; margin: 24px; background: #f7f7f5; color: #1a1a1a; }}
 h1 {{ font-size: 18px; }} h2 {{ font-size: 14px; font-weight: 600; margin: 24px 0 8px; }}
 section {{ margin-bottom: 18px; }}
 img {{ max-width: 100%; border: 1px solid #ddd; border-radius: 4px; background: #fff; }}
 .err {{ color: #a11; }}
</style>
<h1>{html.escape(report.name)} — interaction states</h1>
{'<p class=err>page errors: ' + html.escape(str(errs[:3])) + '</p>' if errs else ''}
{cells}
""")
    print(f"\n{out / 'index.html'}")
    if whole:
        print(f"  {out / whole}   <- every chart, one image")
    for _, f in rows:
        print(f"  {out / f}")
    if errs:
        print(f"page errors: {errs[:3]}")


if __name__ == "__main__":
    main()
