"""Verify kit_build.build() — the happy path and every guard it exists for.

    python3 ~/.claude/skills/writing-guidelines/kit/small-smokes/smoke_kit_build.py
"""
import sys
import tempfile
from pathlib import Path

KIT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KIT))
from kit_build import build, version  # noqa: E402

TMP = Path(tempfile.mkdtemp())
OUT = TMP / "out.html"
V = version()

TPL = ('<!-- clab-report-kit v0.1 -->\n<title>t</title>\n'
       '<div id="fig"></div><div id="explorer-mount"></div>\n'
       '<style>/*%%KIT_CSS%%*/</style><script>/*%%KIT_JS%%*/</script>\n'
       '<script id="payload">%%PAYLOAD_B64%%</script>')


def fails(fn, needle):
    try:
        fn()
    except AssertionError as e:
        assert needle in str(e), f"wrong error: {e}"
        return
    raise SystemExit(f"expected an AssertionError containing {needle!r}")


html = build(TPL, OUT, {"PAYLOAD_B64": "QUJD"}, verbose=False).read_text()
assert html.startswith(f"<!-- clab-report-kit v{V} ·"), "stamp not rewritten"
assert f'<meta name="generator" content="clab-report-kit {V}">' in html
assert f'window.KIT_VERSION = "{V}";' in html
assert html.count("clab-report-kit") == 2, "stale stamp left behind"
assert "%%" not in html and "KitCharts" in html and "KitToc" in html
assert ">QUJD<" in html
print("happy path ok")

# every legacy spelling a report in the wild uses
for marker in ["/*__KIT_CSS__*/", "/*KIT_CSS*/", "__KIT_CSS__", "{{KIT_CSS}}"]:
    t = TPL.replace("/*%%KIT_CSS%%*/", marker)
    assert "--paper" in build(t, OUT, {"PAYLOAD_B64": "QUJD"}, verbose=False).read_text()
print("marker spellings ok")

# a template still carrying an older build's stamp AND meta gets one of each, current
stale = ('<!-- clab-report-kit v0.4 · built 2026-01-01 -->\n'
         '<meta name="generator" content="clab-report-kit 0.4">\n' + TPL)
restamped = build(stale, OUT, {"PAYLOAD_B64": "QUJD"}, verbose=False).read_text()
assert restamped.count("clab-report-kit") == 2 and "v0.4" not in restamped
print("restamp ok")

fails(lambda: build(TPL.replace('id="explorer-mount"', 'id="fig"'), OUT,
                    {"PAYLOAD_B64": "QUJD"}, verbose=False), "duplicate ids")
fails(lambda: build(TPL.replace("%%PAYLOAD_B64%%", ""), OUT,
                    {"PAYLOAD_B64": "QUJD"}, verbose=False), "no marker for 'PAYLOAD_B64'")
fails(lambda: build(TPL + "\n%%FORGOTTEN%%", OUT,
                    {"PAYLOAD_B64": "QUJD"}, verbose=False), "nothing to substitute")
fails(lambda: build(TPL.replace("<title>t</title>",
                                "<link href='data:image/svg+xml,<svg/>'>"), OUT,
                    {"PAYLOAD_B64": "QUJD"}, verbose=False), "raw data:image/svg+xml")
fails(lambda: build(TPL, OUT, {"PAYLOAD_B64": "A" * 5001 + '"'}, verbose=False),
      "must be embeddable")
print("guards ok")
print(f"ALL PASS (kit v{V})")
