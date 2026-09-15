/* clab report kit — trace.js
   Transcript viewer. One transcript = an ordered list of blocks (user,
   system, reasoning, assistant, tool call+result, judge, note), each rendered
   whole with a left rule in its kind's colour — nothing hidden behind a
   selection, everything on screen as you scroll (Clément, on dronescope:
   "as I scroll I can see everything including reasoning"). Foldable kinds
   (reasoning / tools / judge) fold per block, and the toolbar's fold-all
   buttons set the default for every block.

   The viewer is a bounded box with an inner scroll, so the reader scrolls
   across transcripts (mode "all": the matching transcripts stacked) or within
   one (mode "one": j/k step through them) without the page moving under
   them. Left: a rail listing the transcripts; right: the current transcript's
   outline (one entry per block, with search-hit counts) and its details.
   Both rails fold and drag-resize; widths and fold defaults persist per
   viewer (localStorage) — they are how someone looks, not what they look at.
   What they look at (selected transcript, mode) is state the explorer
   carries into the url through hashNav.

   Standalone:
     const tv = KitTrace.viewer({ trace: row => ({ id, title, meta, chips, lede,
                                                   blocks, details }) });
     host.appendChild(tv.el); tv.setRows(rows);
   Behind the explorer's filters / chart clicks:
     KitExplorer.explorer(el, { data, dims, search, view: tv });

   Block shapes:
     { kind: "user"|"system"|"assistant"|"thinking"|"note", text, label?, evidence?, clamp? }
     { kind: "tool", name, input (string|object), output?, error?, label? }
     { kind: "judge", text, fields?: [[label, value]…], label? }
     { kind: "group", label, blocks: [...], folded? }   — a foldable run of blocks
       (a frozen prefix, a sub-agent's transcript), folded by default
     any block may carry `html` (trusted, report-authored) instead of `text`,
     `cls` (extra class names for report-specific styling),
     and `folded: true|false` to override the fold-all default for itself. */
"use strict";

const KitTrace = (() => {
  const esc = s => KitCards.esc(s);
  const CHEV = '<svg viewBox="0 0 6 10" aria-hidden="true"><path d="M1 1 5 5 1 9"/></svg>';
  const ARROW = d => d === "l"
    ? '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M8 2 4 6l4 4"/></svg>'
    : '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2l4 4-4 4"/></svg>';
  const KINDS = {
    user: { label: "user" }, system: { label: "system", clamp: true },
    thinking: { label: "reasoning", fold: true }, assistant: { label: "assistant" },
    tool: { label: "tool", fold: true }, judge: { label: "judge", fold: true },
    note: { label: "" }, group: { label: "context", fold: true },
  };
  const FOLDABLE = ["thinking", "tool", "judge"];
  const firstLine = (s, n = 110) => {
    const t = String(s ?? "").trim().split("\n")[0];
    return t.length > n ? t.slice(0, n - 1) + "…" : t;
  };
  const asText = v => v == null ? "" : typeof v === "string" ? v : JSON.stringify(v, null, 2);

  /* ---- one block ---- */
  function block(b, { folds = {} } = {}) {
    const kind = KINDS[b.kind] ? b.kind : "note";
    const K = KINDS[kind];
    const el = document.createElement("div");
    el.className = `kb kb-${kind}` + (b.error ? " err" : "") + (b.cls ? " " + b.cls : "");
    el.dataset.kind = kind;
    const foldable = !!K.fold && b.fold !== false;
    const head = document.createElement("div");
    head.className = "kb-head";
    if (foldable) head.innerHTML = `<span class="chev">${CHEV}</span>`;
    const lab = document.createElement("span");
    lab.textContent = b.label ?? K.label;
    head.appendChild(lab);
    if (kind === "tool") {
      const name = document.createElement("span");
      name.className = "name"; name.textContent = b.name ?? "";
      head.appendChild(name);
    }
    const sum = document.createElement("span");
    sum.className = "sum";
    sum.textContent = kind === "group" ? `${(b.blocks || []).length} blocks`
      : kind === "tool" ? firstLine(asText(b.input)) : firstLine(b.text);
    head.appendChild(sum);
    const hits = document.createElement("span");
    hits.className = "hits";
    head.appendChild(hits);
    el.appendChild(head);

    const body = document.createElement("div");
    body.className = "kb-body";
    if (b.html != null) body.innerHTML = b.html;
    else if (kind === "group") {
      for (const c of b.blocks || []) body.appendChild(block(c, { folds }));
    } else if (kind === "tool") {
      const sec = (label, text, clamp) => {
        const h = document.createElement("div"); h.className = "kb-sec"; h.textContent = label;
        body.appendChild(h);
        const c = document.createElement("div"); c.className = "kb-code";
        if (clamp) c.appendChild(KitCards.ptext(esc(text)));
        else c.textContent = text;
        body.appendChild(c);
      };
      if (b.input != null) sec("input", asText(b.input), b.clamp === true);
      if (b.output != null) sec(b.error ? "error" : "output", asText(b.output), b.clamp !== false);
    } else {
      const text = String(b.text ?? "");
      if (!text.trim()) body.innerHTML = `<span class="empty">${esc(b.emptyText ?? "(empty)")}</span>`;
      else {
        const html = b.evidence ? KitCards.highlightEvidence(text, b.evidence) : esc(text);
        if (b.clamp ?? K.clamp) body.appendChild(KitCards.ptext(html));
        else body.innerHTML = html;
      }
    }
    if (b.fields?.length) {
      const dl = document.createElement("dl");
      dl.className = "kb-fields";
      for (const [k, v] of b.fields) dl.insertAdjacentHTML("beforeend",
        `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`);
      body.appendChild(dl);
    }
    el.appendChild(body);

    /* hover-only copy of the block's raw text (markdown-ish, never the html) */
    const raw = kind === "group" ? "" : kind === "tool"
      ? [b.input != null ? asText(b.input) : "", b.output != null ? asText(b.output) : ""].filter(Boolean).join("\n\n")
      : String(b.text ?? "");
    if (raw) {
      const copy = document.createElement("button");
      copy.type = "button"; copy.className = "kb-copy"; copy.textContent = "copy";
      copy.title = "copy this block's text";
      copy.addEventListener("click", async e => {
        e.stopPropagation();
        const ok = await KitToc.copyText(raw);
        copy.textContent = ok ? "copied ✓" : "copy failed";
        copy.classList.toggle("ok", ok);
        setTimeout(() => { copy.textContent = "copy"; copy.classList.remove("ok"); }, 1500);
      });
      el.appendChild(copy);
    }

    if (foldable) {
      el.classList.add("foldable");
      const open = b.folded != null ? !b.folded : kind === "group" ? false : (folds[kind] ?? true);
      el.classList.toggle("folded", !open);
      head.setAttribute("role", "button");
      head.setAttribute("aria-expanded", String(open));
      const toggle = () => {
        const f = el.classList.toggle("folded");
        head.setAttribute("aria-expanded", String(!f));
      };
      head.addEventListener("click", e => { if (!e.target.closest(".kb-copy")) toggle(); });
      head.tabIndex = 0;
      head.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      });
    }
    return el;
  }

  /* ---- one transcript ---- */
  function trace(t, opts = {}) {
    const el = document.createElement("article");
    el.className = "kt-trace";
    el.dataset.id = String(t.id ?? "");
    const head = document.createElement("header");
    head.className = "kt-thead";
    head.innerHTML = `<div class="t">${esc(t.title ?? t.id ?? "")}</div>`;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = (t.meta || []).map(m => `<span>${esc(m)}</span>`).join("")
      + (t.chips || []).map(([l, c]) => KitCards.chip(l, c)).join("");
    if (meta.innerHTML) head.appendChild(meta);
    el.appendChild(head);
    if (t.ledeHtml || t.lede) {
      const l = document.createElement("div");
      l.className = "kt-lede";
      if (t.ledeHtml) l.innerHTML = t.ledeHtml; else l.textContent = t.lede;
      el.appendChild(l);
    }
    for (const b of t.blocks || []) el.appendChild(block(b, opts));
    return el;
  }

  /* search-hit counts per block, after KitCards.highlight ran over the trace */
  function countHits(traceEl) {
    const out = [];
    traceEl.querySelectorAll(".kb").forEach(kb => {
      const n = kb.querySelectorAll("mark.hit").length;
      const h = kb.querySelector(":scope > .kb-head .hits");
      if (h) h.textContent = n ? `· ${n} match${n > 1 ? "es" : ""}` : "";
      out.push(n);
    });
    return out;
  }

  /* ---- the viewer ---- */
  function viewer(spec) {
    const toTrace = spec.trace;
    const pageSize = spec.pageSize ?? 8;
    const defaultMode = spec.mode === "all" ? "all" : "one";
    const memo = new WeakMap();
    const T = r => { if (!memo.has(r)) memo.set(r, toTrace(r)); return memo.get(r); };
    const idOf = spec.id || (r => String(T(r).id ?? ""));

    /* per-viewer prefs: how the reader looks, never what they look at */
    const KEY = spec.storageKey || "clab-kit-trace";
    const prefs = { rail: 240, side: 230, railOpen: true, sideOpen: true,
                    folds: { thinking: true, tool: true, judge: true } };
    try { Object.assign(prefs, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { /* none */ }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* not persisted */ } };

    const el = document.createElement("div");
    el.className = "kt";
    el.tabIndex = 0;
    el.setAttribute("aria-label", "transcript viewer — j / k step through transcripts");
    if (spec.height) el.style.setProperty("--kt-h", spec.height);
    el.innerHTML = `
      <div class="kt-rail">
        <div class="kt-head"><span class="grow kt-rail-count"></span>
          <button type="button" class="kt-rail-close" title="hide the list">${ARROW("l")}</button></div>
        <div class="kt-list"></div>
      </div>
      <div class="kt-gutter g-rail" title="drag to resize"></div>
      <div class="kt-main">
        <div class="kt-head kt-bar">
          <button type="button" class="kt-rail-open" title="show the list">${ARROW("r")}</button>
          <span class="kt-seg">
            <button type="button" data-mode="one" title="one transcript at a time — j / k to step">one</button>
            <button type="button" data-mode="all" title="all matching transcripts, stacked">all</button>
          </span>
          <button type="button" class="kt-prev" title="previous transcript (k)">${ARROW("l")}</button>
          <span class="kt-pos"></span>
          <button type="button" class="kt-next" title="next transcript (j)">${ARROW("r")}</button>
          <span class="sep"></span>
          <span class="kt-folds"></span>
          <span class="grow"></span>
          <button type="button" class="kt-side-open" title="show outline and details">${ARROW("l")}</button>
        </div>
        <div class="kt-scroll"></div>
      </div>
      <div class="kt-gutter g-side" title="drag to resize"></div>
      <div class="kt-side">
        <div class="kt-head"><button type="button" class="kt-side-close" title="hide outline and details">${ARROW("r")}</button>
          <span class="grow">outline</span></div>
        <div class="kt-side-body"><div class="kt-outline"></div><h5 class="kt-dh">details</h5><dl class="kt-details"></dl></div>
      </div>`;
    const $ = s => el.querySelector(s);
    const list = $(".kt-list"), scroll = $(".kt-scroll"), outline = $(".kt-outline"),
          details = $(".kt-details"), pos = $(".kt-pos"), railCount = $(".kt-rail-count");

    let rows = [], mode = defaultMode, sel = null, shown = pageSize, ctx = {};
    let listener = null;
    const notify = () => listener?.();
    const idx = () => rows.findIndex(r => idOf(r) === sel);

    /* --- rails: open/close + drag --- */
    const paintRails = () => {
      el.classList.toggle("rail-closed", !prefs.railOpen);
      el.classList.toggle("side-closed", !prefs.sideOpen);
      el.style.setProperty("--kt-rail", prefs.rail + "px");
      el.style.setProperty("--kt-side", prefs.side + "px");
      $(".kt-rail-open").hidden = prefs.railOpen;
      $(".kt-side-open").hidden = prefs.sideOpen;
    };
    $(".kt-rail-close").addEventListener("click", () => { prefs.railOpen = false; save(); paintRails(); });
    $(".kt-rail-open").addEventListener("click", () => { prefs.railOpen = true; save(); paintRails(); });
    $(".kt-side-close").addEventListener("click", () => { prefs.sideOpen = false; save(); paintRails(); });
    $(".kt-side-open").addEventListener("click", () => { prefs.sideOpen = true; save(); paintRails(); });
    for (const [g, key, sign] of [[$(".g-rail"), "rail", 1], [$(".g-side"), "side", -1]]) {
      g.addEventListener("pointerdown", e => {
        e.preventDefault();
        g.setPointerCapture(e.pointerId);
        g.classList.add("drag");
        const x0 = e.clientX, w0 = prefs[key];
        const move = ev => {
          prefs[key] = Math.max(120, Math.min(520, w0 + sign * (ev.clientX - x0)));
          el.style.setProperty("--kt-" + key, prefs[key] + "px");
        };
        const up = () => { g.classList.remove("drag"); g.removeEventListener("pointermove", move); save(); };
        g.addEventListener("pointermove", move);
        g.addEventListener("pointerup", up, { once: true });
        g.addEventListener("pointercancel", up, { once: true });
      });
    }
    paintRails();

    /* --- fold-all buttons: the default every block starts from --- */
    const foldsBox = $(".kt-folds");
    const FOLD_LABEL = { thinking: "reasoning", tool: "tools", judge: "judge" };
    /* the kinds ever seen: a draw with no rows must not make the buttons vanish */
    const present = new Set();
    function paintFolds() {
      foldsBox.textContent = "";
      for (const r of rows) for (const b of T(r).blocks || []) present.add(b.kind);
      for (const k of FOLDABLE) {
        if (!present.has(k)) continue;
        const b = document.createElement("button");
        b.type = "button";
        b.className = prefs.folds[k] ? "on" : "";
        b.innerHTML = `<span class="chev-inline">${prefs.folds[k] ? "▾" : "▸"}</span> ${FOLD_LABEL[k]}`;
        b.title = prefs.folds[k] ? `fold every ${FOLD_LABEL[k]} block` : `unfold every ${FOLD_LABEL[k]} block`;
        b.addEventListener("click", () => {
          prefs.folds[k] = !prefs.folds[k]; save();
          scroll.querySelectorAll(`.kb-${k}.foldable`).forEach(kb => {
            kb.classList.toggle("folded", !prefs.folds[k]);
            kb.querySelector(".kb-head")?.setAttribute("aria-expanded", String(prefs.folds[k]));
          });
          paintFolds();
        });
        foldsBox.appendChild(b);
      }
    }

    /* --- mode + stepping --- */
    el.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => {
      if (mode === b.dataset.mode) return;
      mode = b.dataset.mode;
      renderMain();
      notify();
    }));
    const step = d => {
      if (!rows.length) return;
      const i = Math.max(0, Math.min(rows.length - 1, idx() + d));
      select(idOf(rows[i]));
    };
    $(".kt-prev").addEventListener("click", () => step(-1));
    $(".kt-next").addEventListener("click", () => step(1));
    el.addEventListener("keydown", e => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "j") { e.preventDefault(); step(1); }
      else if (e.key === "k") { e.preventDefault(); step(-1); }
    });

    function paintChrome() {
      el.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("on", b.dataset.mode === mode));
      const i = idx();
      pos.textContent = rows.length ? `${i + 1} / ${rows.length}` : "0 / 0";
      $(".kt-prev").disabled = i <= 0;
      $(".kt-next").disabled = i >= rows.length - 1;
      railCount.textContent = `${rows.length} transcript${rows.length === 1 ? "" : "s"}`;
    }

    /* --- rail --- */
    let railShown = 400;
    function renderRail() {
      list.textContent = "";
      rows.slice(0, railShown).forEach(r => {
        const t = T(r);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "kt-item" + (idOf(r) === sel ? " sel" : "");
        b.dataset.id = idOf(r);
        b.innerHTML = `<div class="t">${esc(t.title ?? t.id ?? "")}</div>`
          + (t.meta?.length ? `<div class="m">${t.meta.map(esc).join(" · ")}</div>` : "")
          + (t.chips?.length ? `<div>${t.chips.map(([l, c]) => KitCards.chip(l, c)).join(" ")}</div>` : "");
        b.addEventListener("click", () => select(idOf(r)));
        list.appendChild(b);
      });
      if (rows.length > railShown) {
        const more = document.createElement("button");
        more.type = "button"; more.className = "kt-more";
        more.textContent = `show ${Math.min(400, rows.length - railShown)} more`;
        more.addEventListener("click", () => { railShown += 400; renderRail(); });
        list.appendChild(more);
      }
    }
    /* reveal the selected rail item by scrolling the LIST, never scrollIntoView:
       that walks every scrollable ancestor and yanks the page to the viewer */
    function paintRailSel() {
      list.querySelectorAll(".kt-item").forEach(b => b.classList.toggle("sel", b.dataset.id === sel));
      const it = list.querySelector(".kt-item.sel");
      if (!it) return;
      const top = it.offsetTop - list.offsetTop, bot = top + it.offsetHeight;
      if (top < list.scrollTop) list.scrollTop = top;
      else if (bot > list.scrollTop + list.clientHeight) list.scrollTop = bot - list.clientHeight;
    }

    /* --- main --- */
    const traceEl = id => scroll.querySelector(`.kt-trace[data-id="${CSS.escape(id)}"]`);
    /* a scroll the viewer makes itself (landing on a selection) must be instant —
       a smooth one fires scroll events for hundreds of ms and the spy would
       read the intermediate positions as the reader moving — and must not
       count as the reader's own scroll at all */
    let programmatic = 0;
    const jumpTo = top => {
      programmatic++;
      scroll.scrollTo({ top, behavior: "instant" });
      requestAnimationFrame(() => requestAnimationFrame(() => { programmatic = Math.max(0, programmatic - 1); }));
    };
    function mount(r) {
      const te = trace(T(r), { folds: prefs.folds });
      scroll.appendChild(te);
      if (ctx.hitRe) { KitCards.highlight(te, ctx.hitRe); }
      te.dataset.hits = JSON.stringify(countHits(te));
      te.querySelector(".kt-thead").addEventListener("click", e => {
        if (mode === "all" && !e.target.closest("button")) setCurrent(te.dataset.id, { notify: true });
      });
      return te;
    }
    function renderMain() {
      scroll.textContent = "";
      if (!rows.length) {
        scroll.innerHTML = `<div class="kt-empty">— no transcript matches —</div>`;
        outline.textContent = ""; details.textContent = "";
        paintChrome();
        return;
      }
      if (mode === "one") {
        const i = Math.max(0, idx());
        mount(rows[i]);
        jumpTo(0);
      } else {
        rows.slice(0, shown).forEach(mount);
        if (rows.length > shown) {
          const more = document.createElement("button");
          more.type = "button"; more.className = "kt-more";
          more.textContent = `show ${Math.min(pageSize, rows.length - shown)} more transcripts`;
          more.addEventListener("click", () => { shown += pageSize; renderMain(); });
          scroll.appendChild(more);
        }
        const te = sel && traceEl(sel);
        if (te) jumpTo(te.offsetTop - scroll.offsetTop);
      }
      KitCards.markShort(scroll);
      paintCurrent();
      paintChrome();
    }
    function paintCurrent() {
      scroll.querySelectorAll(".kt-trace").forEach(t => t.classList.toggle("cur", t.dataset.id === sel));
      const i = idx();
      if (i < 0) { outline.textContent = ""; details.textContent = ""; return; }
      const t = T(rows[i]), te = traceEl(sel);
      outline.textContent = "";
      /* read from the DOM, so nested blocks (groups) and their hit counts come
         out in document order without a second walk over the spec */
      (te ? [...te.querySelectorAll(".kb")] : []).forEach(kb => {
        const kind = kb.dataset.kind;
        const depth = (() => { let d = 0, p = kb.parentElement.closest(".kb"); while (p) { d++; p = p.parentElement.closest(".kb"); } return d; })();
        const head = kb.querySelector(":scope > .kb-head");
        const label = [...head.children].filter(c => !c.matches(".chev, .hits, .sum")).map(c => c.textContent).join(" ");
        const sum = head.querySelector(".sum")?.textContent || "";
        const n = kb.querySelectorAll("mark.hit").length;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `kb-${kind}`;
        btn.style.paddingLeft = (0.3 + depth * 0.8) + "rem";
        btn.title = "scroll to this block";
        btn.innerHTML = `<span class="k"></span><span class="s">${esc(label + (sum ? " — " + sum.slice(0, 70) : ""))}</span>` +
          (n ? `<span class="h">${n}</span>` : "");
        btn.addEventListener("click", () => {
          for (let p = kb; p && p !== te; p = p.parentElement.closest(".kb")) p.classList.remove("folded");
          jumpTo(kb.offsetTop - scroll.offsetTop - 44);
          kb.classList.remove("hi-flash"); void kb.offsetWidth; kb.classList.add("hi-flash");
        });
        outline.appendChild(btn);
      });
      details.textContent = "";
      for (const [k, v] of t.details || []) details.insertAdjacentHTML("beforeend",
        `<dt>${esc(k)}</dt><dd>${Array.isArray(v) ? KitCards.chip(v[0], v[1]) : esc(v)}</dd>`);
      $(".kt-dh").hidden = !(t.details || []).length;
    }
    /* the current transcript: rail highlight, outline, details — and the hash */
    let hashTimer = 0;
    function setCurrent(id, { notify: n = false } = {}) {
      if (id === sel) return;
      sel = id;
      paintRailSel(); paintCurrent(); paintChrome();
      if (n) { clearTimeout(hashTimer); hashTimer = setTimeout(notify, 300); }
    }
    /* mode all: the transcript under the top of the box is the current one.
       Scroll position is high-frequency state, so the hash write is debounced */
    let raf = 0;
    scroll.addEventListener("scroll", () => {
      if (mode !== "all" || raf || programmatic) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const top = scroll.scrollTop + 40;
        let cur = null;
        for (const t of scroll.querySelectorAll(".kt-trace")) {
          if (t.offsetTop - scroll.offsetTop <= top) cur = t; else break;
        }
        if (cur && cur.dataset.id !== sel) setCurrent(cur.dataset.id, { notify: true });
      });
    }, { passive: true });

    function select(id, { flash = true } = {}) {
      if (!rows.some(r => idOf(r) === id)) return;
      sel = id;
      if (mode === "one") renderMain();
      else {
        let te = traceEl(id);
        if (!te) {   /* beyond the page: extend it to reach the selection */
          shown = Math.max(shown, idx() + 1);
          renderMain();
          te = traceEl(id);
        } else jumpTo(te.offsetTop - scroll.offsetTop);
        paintCurrent();
      }
      paintRailSel(); paintChrome();
      const te = traceEl(id);
      if (flash && te) { te.classList.remove("hi-flash"); void te.offsetWidth; te.classList.add("hi-flash"); }
      notify();
    }

    /* explorer contract */
    function setRows(newRows, newCtx = {}) {
      rows = newRows; ctx = newCtx; shown = pageSize; railShown = 400;
      if (!rows.some(r => idOf(r) === sel)) sel = rows.length ? idOf(rows[0]) : null;
      paintFolds();
      renderRail();
      renderMain();
      paintRailSel();
    }
    function state() {
      const f = {};
      if (sel && rows.some(r => idOf(r) === sel)) f._sel = sel;
      if (mode !== defaultMode) f._mode = mode;
      return f;
    }
    /* called by the explorer before it re-filters: `_sel` absent = clear the
       selection (a chart click means "show me these", not "keep my place");
       `_mode` absent = keep the mode the reader chose */
    function apply(f) {
      sel = "_sel" in f ? String([].concat(f._sel)[0]) : null;
      if ("_mode" in f) { const m = String([].concat(f._mode)[0]); if (m === "one" || m === "all") mode = m; }
    }

    return { el, setRows, select, state, apply, keys: () => ["_sel", "_mode"],
             onChange: fn => { listener = fn; }, get mode() { return mode; } };
  }

  return { viewer, trace, block };
})();
