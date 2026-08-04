"""The kit's inliner: turn a report template into a self-contained page.

Every report used to hand-roll this — read the CSS/JS lists, string-replace three
markers, write the file. Seven copies drifted: three marker spellings, two reports
whose JS list silently omitted `toc.js` (so they never got the sidebar nav a kit
release had added), and one lone duplicate-id assert that the other six lacked
despite it guarding a bug the CHANGELOG documents twice (v0.6, v0.6.9). Owning the
step here means a kit release that needs a build-side counterpart lands once.

    import sys; sys.path.insert(0, str(Path.home() / ".claude/skills/writing-guidelines/kit"))
    from kit_build import build

    build(src=ROOT / "report_src.html", out=ROOT / "index.html",
          subs={"PAYLOAD_B64": (ROOT / "data/payload.b64").read_text()})

`src` takes a Path or the template text itself (several reports keep it as a Python
string literal). Marker spelling doesn't matter: `PAYLOAD_B64` matches `%%PAYLOAD_B64%%`,
`__PAYLOAD_B64__`, `{{PAYLOAD_B64}}` and their `/* */`-wrapped forms, so no report has
to be rewritten to adopt this.
"""
from __future__ import annotations

import re
from datetime import date
from pathlib import Path

KIT = Path(__file__).resolve().parent

# Order matters (tokens before consumers); every report gets every file. Reports
# used to curate this per page, which saved ~50 kB against multi-MB payloads and
# cost a silently missing feature whenever the kit grew.
CSS_FILES = ["tokens.css", "layout.css", "cards.css", "charts.css"]
JS_FILES = ["stats.js", "filters.js", "cards.js", "explorer.js", "charts.js", "toc.js"]

STAMP_RE = re.compile(r"<!--\s*clab-report-kit[^>]*?-->\s*")
META_RE = re.compile(r'<meta name="generator" content="clab-report-kit[^"]*">\s*')


def version() -> str:
    """The kit's version, asserted against the CHANGELOG's top heading.

    Two sources of truth is how a version marker goes stale; bumping one without
    the other fails the next build instead of shipping a mislabelled page."""
    v = (KIT / "VERSION").read_text().strip()
    head = re.search(r"^## v(\S+)", (KIT / "CHANGELOG.md").read_text(), re.M)
    assert head, "CHANGELOG.md has no '## vX.Y.Z' heading"
    assert head.group(1) == v, f"VERSION says {v}, CHANGELOG's top entry says {head.group(1)}"
    return v


def _spellings(name: str) -> list[str]:
    bare = [f"%%{name}%%", f"__{name}__", f"{{{{{name}}}}}", name]
    return [f"/*{b}*/" for b in bare] + bare


def _substitute(text: str, name: str, value: str) -> str:
    """Replace whichever spelling of `name` the template uses. The `/* */` forms go
    first so a wrapped marker isn't half-replaced, leaving stray comment syntax."""
    for marker in _spellings(name):
        if marker in text:
            return text.replace(marker, value)
    raise AssertionError(f"no marker for {name!r} in the template "
                         f"(tried {', '.join(_spellings(name)[:4])}, …)")


MARKER_RE = re.compile(r"(?:%%|__|\{\{)([A-Z][A-Z0-9_]{2,})(?:%%|__|\}\})")


def _check_template(text: str, filled: set[str]) -> None:
    """Both checks run on the TEMPLATE, before substitution — the template is authored
    text, the substituted values are data.

    Ids: the bug guarded is a mount div sharing its id with a heading; getElementById
    returns the heading and the component mounts inside it, which reads as a styling
    bug (CHANGELOG v0.6, v0.6.9). A repeated id inside rendered cards is not that bug.

    Markers: catches one the caller forgot to pass. Scanning the finished page instead
    would trip over model output that happens to contain `__LIKE_THIS__`."""
    ids = re.findall(r'\bid="([^"]+)"', text)
    dupes = sorted({i for i in ids if ids.count(i) > 1})
    assert not dupes, f"duplicate ids in the template: {dupes}"
    missing = sorted(set(MARKER_RE.findall(text)) - filled)
    assert not missing, f"markers in the template with nothing to substitute: {missing}"


def build(src: str | Path, out: str | Path, subs: dict[str, str] | None = None,
          *, verbose: bool = True) -> Path:
    """Inline the kit + `subs` into `src`, stamp the kit version, write `out`."""
    v = version()
    text = Path(src).read_text() if isinstance(src, Path) else src
    _check_template(text, set(subs or ()) | {"KIT_CSS", "KIT_JS"})

    for name, value in (subs or {}).items():
        # A base64 payload lives in a <script> element, where an unescaped quote
        # truncates it silently. Detected by shape, not by marker name: a blob is
        # base64-shaped when almost nothing in it falls outside the alphabet, which
        # a JSON payload (a fifth punctuation) never is — so JSON isn't checked and
        # a b64 blob is, whatever the report chose to call its marker.
        if len(value) > 5000 and \
                len(re.findall(r"[^A-Za-z0-9+/=\s]", value)) / len(value) < 0.05:
            assert "</script" not in value and '"' not in value, \
                f"{name}: base64 blob must be embeddable in a <script> element"
        text = _substitute(text, name, value)

    css = "\n".join((KIT / f).read_text() for f in CSS_FILES)
    js = f'window.KIT_VERSION = "{v}";\n' + "\n".join((KIT / f).read_text() for f in JS_FILES)
    text = _substitute(text, "KIT_CSS", css)
    text = _substitute(text, "KIT_JS", js)

    # stamped, never hand-maintained: the marker this replaces sat eight releases
    # stale on the report that prompted this module. Strips ALL prior stamps —
    # leaving a second, older one behind is the exact failure being designed out.
    text = META_RE.sub("", STAMP_RE.sub("", text))
    text = (f"<!-- clab-report-kit v{v} · built {date.today()} -->\n"
            f'<meta name="generator" content="clab-report-kit {v}">\n' + text)

    # on the finished page: a substituted value can carry one in (a favicon built
    # by the report, an inlined image), and it is the published page that fails
    assert not re.search(r'data:image/svg\+xml,\s*<svg', text), \
        ("raw data:image/svg+xml URI — renders fine but blocks sharing the published "
         "artifact; base64-encode it (CHANGELOG v0.6.7)")

    out = Path(out)
    out.write_text(text)
    if verbose:
        print(f"{out} — {out.stat().st_size / 1e6:.2f} MB — kit v{v}")
    return out
