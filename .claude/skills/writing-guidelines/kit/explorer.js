/* clab report kit — explorer.js
   Corpus explorer: declarative filter bank over the full embedded corpus,
   live match count, draw-N-random, paginated card list, empty state.
   Includes the paired A/B comparison explorer (linked/split dimensions).
   Depends on KitStats (shuffle) and typically KitCards for `render`. */
"use strict";

const KitExplorer = (() => {
  const uniq = (data, key) =>
    [...new Set(data.map(r => r[key]).filter(v => v !== undefined && v !== null))]
      .sort((a, b) => (typeof a === "number" ? a - b : String(a).localeCompare(String(b))));

  /* optionLabel: optional (value -> display text) resolver — option VALUES stay
     the raw row values (set()/filtering match on them), only the text shown in
     the dropdown changes (e.g. internal arm codes -> reader-facing phrases). */
  function makeSelect(labelText, values, withAll = true, optionLabel = null) {
    const wrap = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = labelText;
    const sel = document.createElement("select");
    if (withAll) sel.appendChild(new Option("all", "__all__"));
    values.forEach(v => sel.appendChild(new Option(optionLabel ? optionLabel(v) : String(v), String(v))));
    wrap.append(label, sel);
    return { wrap, sel };
  }

  /* A filter dimension. By default a plain dropdown — one value, or "all" — which
     is what a reader expects of a filter, and the only shape a shared URL can carry
     (hashNav encodes one `dim=value` per dimension).

     `multi: true` turns it into a picker that ADDS values plus a chip per chosen
     value, for a dimension where "these two categories" is a question the report
     actually expects. Worth having, not worth defaulting to: it costs every other
     dimension a two-step interaction and a variable-height control.

     Either way `chosen` is a Set and an empty one means unconstrained, so the
     filtering code doesn't care which mode a dimension is in. */
  function makeDim(d, values, onChange) {
    const multi = !!d.multi;
    const chosen = new Set();
    const optLabel = v => (d.optionLabel ? d.optionLabel(v) : String(v));
    /* optionTitle: hover text for an option, its chip, and the picker once it is
       the chosen one. A dimension whose values are identifiers (`p3`, an arm code)
       is unreadable in the dropdown even when the report holds the text they
       stand for. */
    const optTitle = v => (d.optionTitle ? d.optionTitle(v) : "");
    const wrap = document.createElement("div");
    wrap.className = "ex-dim";
    const head = document.createElement("div");
    head.className = "ex-dim-head";
    const label = document.createElement("label");
    label.textContent = d.label || d.key;
    head.appendChild(label);
    const sel = document.createElement("select");
    const chips = document.createElement("div");
    chips.className = "ex-chips";
    wrap.append(head, sel);
    /* the ✕ clears a multi-value selection in one click; single-select clears
       itself by picking "all" back, so it doesn't need one */
    let clear = null;
    if (multi) {
      clear = document.createElement("button");
      clear.type = "button";
      clear.className = "ex-x ex-dim-x";
      clear.textContent = "✕";
      clear.title = `clear ${d.label || d.key}`;
      clear.addEventListener("click", () => { chosen.clear(); sync(); onChange(); });
      head.appendChild(clear);
      wrap.appendChild(chips);
    }

    function sync() {
      sel.textContent = "";
      sel.appendChild(new Option(multi && chosen.size ? "add…" : "all", "__all__"));
      for (const v of values) {
        /* in multi mode chosen values leave the dropdown: re-picking one is a
           no-op, and a long option list is easier to scan without them */
        if (multi && chosen.has(String(v))) continue;
        const opt = new Option(optLabel(v), String(v));
        opt.title = optTitle(v);
        sel.appendChild(opt);
      }
      sel.value = multi ? "__all__" : ([...chosen][0] ?? "__all__");
      sel.title = multi || sel.value === "__all__" ? "" : optTitle(sel.value);
      if (!multi) return;
      clear.style.visibility = chosen.size ? "visible" : "hidden";
      chips.textContent = "";
      for (const v of chosen) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "ex-chip";
        chip.title = optTitle(v) ? `${optTitle(v)}\n\n(click to remove)` : `remove ${optLabel(v)}`;
        const text = document.createElement("span");
        text.textContent = optLabel(v);
        const x = document.createElement("span");
        x.className = "ex-x";
        x.textContent = "✕";
        chip.append(text, x);
        chip.addEventListener("click", () => { chosen.delete(v); sync(); onChange(); });
        chips.appendChild(chip);
      }
    }
    sel.addEventListener("change", () => {
      if (!multi) {
        chosen.clear();
        if (sel.value !== "__all__") chosen.add(sel.value);
      } else {
        if (sel.value === "__all__") return;
        chosen.add(sel.value);
      }
      sync(); onChange();
    });
    sync();

    const known = new Set(values.map(String));
    return {
      wrap, chosen,
      /* set() from a chart click replaces rather than adds: the click means
         "show me these rows", not "widen what I already had". A single-select
         dimension takes the first value it knows — a dropdown can only show one,
         so a chart that wants to hand over several needs `multi: true`. */
      apply(vals) {
        chosen.clear();
        for (const v of [].concat(vals)) {
          if (!known.has(String(v))) continue;
          chosen.add(String(v));
          if (!multi) break;
        }
        sync();
      },
      clear() { chosen.clear(); sync(); },
    };
  }

  /* Search scopes. `search` is either a flat list of field names / resolvers
     (one implicit scope, no picker) or

       { fields: {name: fieldKey | row => text},
         scopes: [{label, keys:[name…]}, …] }        // scopes[0] is the default

     which gives the reader a "search in" picker. Worth the option because the
     panes of one card are different kinds of text — what the user asked, what the
     model reasoned, what it answered — and a hit in the wrong one is a miss: a
     phrase searched to find where the MODEL said it matches every row where the
     prompt did. */
  function searchScopes(search) {
    const asFn = k => (typeof k === "function" ? k : (r => r[k]));
    if (Array.isArray(search)) {
      return search.length ? [{ label: "everything", fns: search.map(asFn) }] : [];
    }
    const fields = search?.fields || {};
    const defs = search?.scopes || [{ label: "everything", keys: Object.keys(fields) }];
    return defs.map(s => ({ label: s.label, fns: s.keys.map(k => asFn(fields[k] ?? k)) }));
  }

  /* explorer(el, {
       data,                      // array of row objects
       dims: [{key, label, advanced, multi, optionLabel, optionTitle,
                type:"select"|"min"|"max", min, max, step}],
       search: [...] | {fields, scopes},  // see searchScopes above
       render: row => Element,    // card factory
       pageSize: 12, drawN: 5,
       shuffle: true,             // false = corpus order (ranked rows)
       globalStore, globalFilter: (row, state) => bool,  // optional KitFilters hookup
     }) → { refresh, set, state, onChange } */
  function explorer(el, spec) {
    const { data, dims = [], search = [], render, pageSize = 12, drawN = 5 } = spec;
    const controls = document.createElement("div");
    controls.className = "ex-controls";
    /* Two rows, because one row cannot align both kinds of control: a dimension
       is a label over a picker over a wrapping chip list (variable height, so
       top-aligned), while the search box and the buttons are one line each and
       must share a baseline. Mixed in a single flex row, whichever alignment you
       pick is wrong for half of them. */
    const dimRow = document.createElement("div");
    dimRow.className = "ex-dims";
    const actionRow = document.createElement("div");
    actionRow.className = "ex-actions";
    controls.append(dimRow, actionRow);
    const state = {};
    const inputs = [];
    const dimByKey = {};
    const rangeByKey = {};   /* "key:min" | "key:max" -> { def, set(value) } */

    /* dims marked advanced live behind a fold: a corpus that pools several
       experiments carries dimensions that only apply to one of them, and a row
       of controls where most are inert for what the reader is looking at reads
       as complexity rather than power. The fold's summary counts what's active
       inside it, and set() opens it — a filter you can't see is worse than one
       you have to open a fold to reach. */
    const advFold = document.createElement("details");
    advFold.className = "ex-adv";
    const advSummary = document.createElement("summary");
    const advBody = document.createElement("div");
    advBody.className = "ex-adv-body";
    advFold.append(advSummary, advBody);
    const advDims = [];

    for (const d of dims) {
      if (d.type === "select" || !d.type) {
        const dim = makeDim(d, d.values || uniq(data, d.key), userUpdate);
        state[d.key] = dim.chosen;
        dimByKey[d.key] = dim;
        if (d.advanced) { advDims.push(d.key); advBody.appendChild(dim.wrap); }
        else dimRow.appendChild(dim.wrap);
      } else {
        const wrap = document.createElement("div");
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "range";
        input.min = d.min ?? 0; input.max = d.max ?? 10; input.step = d.step ?? 1;
        input.value = d.type === "min" ? input.min : input.max;
        const key = d.key + ":" + d.type;
        const setLabel = () => { label.textContent = `${d.label || d.key} (${d.type} ${input.value})`; };
        input.addEventListener("input", () => { state[key] = Number(input.value); setLabel(); userUpdate(); });
        state[key] = Number(input.value); setLabel();
        rangeByKey[key] = { def: input.value, set: v => {
          input.value = v; state[key] = Number(input.value); setLabel();
        } };
        wrap.append(label, input);
        dimRow.appendChild(wrap); inputs.push(input);
      }
    }

    const scopes = searchScopes(search);
    let scope = 0;               /* index into scopes; 0 is the default */
    let searchBox = null, scopeSel = null;
    /* VS Code's find-widget flags, same three glyphs — readers already know what
       Aa / ab / .* do, so they need no explaining. All off = plain
       case-insensitive substring, which is what the box did before. */
    const sflags = { case: false, word: false, regex: false };
    let badRe = false;
    let hitRe = null;    /* the same pattern, /g, for highlighting the matches */
    if (scopes.length) {
      const wrap = document.createElement("div");
      const label = document.createElement("label");
      label.textContent = "search";
      searchBox = document.createElement("input");
      searchBox.type = "search"; searchBox.placeholder = "free text…";
      let t; searchBox.addEventListener("input", () => { clearTimeout(t); t = setTimeout(userUpdate, 150); });
      const flags = document.createElement("div");
      flags.className = "ex-flags";
      for (const [key, glyph, title] of [["case", "Aa", "Match case"],
                                         ["word", "ab", "Match whole word"],
                                         ["regex", ".*", "Use regular expression"]]) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ex-flag ex-flag-" + key;
        b.textContent = glyph;
        b.title = title;
        b.setAttribute("aria-label", title);
        b.setAttribute("aria-pressed", "false");
        b.addEventListener("click", () => {
          sflags[key] = !sflags[key];
          b.classList.toggle("on", sflags[key]);
          b.setAttribute("aria-pressed", String(sflags[key]));
          if (searchBox.value.trim()) userUpdate();
        });
        flags.appendChild(b);
      }
      const boxWrap = document.createElement("div");
      boxWrap.className = "ex-search";
      boxWrap.append(searchBox, flags);
      wrap.append(label, boxWrap);
      actionRow.appendChild(wrap);
      /* the picker only appears when there is a choice to make */
      if (scopes.length > 1) {
        const sw = document.createElement("div");
        const sl = document.createElement("label");
        sl.textContent = "search in";
        scopeSel = document.createElement("select");
        scopes.forEach((s, i) => scopeSel.appendChild(new Option(s.label, String(i))));
        scopeSel.addEventListener("change", () => {
          scope = Number(scopeSel.value);
          if (searchBox.value.trim()) userUpdate();
        });
        sw.append(sl, scopeSel);
        actionRow.appendChild(sw);
      }
    }

    const drawBtn = document.createElement("button");
    drawBtn.type = "button";
    drawBtn.textContent = `Draw ${drawN} random`;
    const clearAll = document.createElement("button");
    clearAll.type = "button";
    clearAll.className = "ex-clear";
    clearAll.addEventListener("click", () => {
      for (const k in dimByKey) dimByKey[k].clear();
      if (searchBox) searchBox.value = "";
      if (scopeSel) { scope = 0; scopeSel.value = "0"; }
      userUpdate();
    });
    const count = document.createElement("span");
    count.className = "ex-count";
    actionRow.append(drawBtn, clearAll, count);

    const list = document.createElement("div");
    list.className = "sample-list";
    el.append(controls, ...(advDims.length ? [advFold] : []), list);

    function syncChrome() {
      const active = Object.values(dimByKey).reduce((n, d) => n + (d.chosen.size ? 1 : 0), 0)
        + (searchBox?.value.trim() ? 1 : 0);
      clearAll.textContent = active ? `clear ${active} filter${active > 1 ? "s" : ""}` : "clear filters";
      clearAll.disabled = !active;
      const advActive = advDims.filter(k => dimByKey[k].chosen.size).length;
      advSummary.textContent = advActive
        ? `more filters — ${advActive} active`
        : "more filters (experiment-specific)";
      advSummary.classList.toggle("has-active", advActive > 0);
      if (advActive && !advFold.open) advFold.open = true;
    }

    /* What a filter shows is a random SAMPLE of what matches, not the head of
       the corpus: rows arrive in whatever order the experiment wrote them
       (grouped by condition, by prompt id, by run), so the first page of a
       narrowed filter is a systematically skewed look at it.

       `view` is the matching rows in display order, drawn once per filter
       change and kept — "show more" extends the same draw instead of
       reshuffling the cards the reader is already reading. `shuffle: false`
       keeps corpus order, for a report whose rows are ranked. */
    const shuffled = spec.shuffle !== false;
    let view = [];
    let shown = pageSize;
    drawBtn.addEventListener("click", () => {
      view = KitStats.shuffle(matches());   /* re-roll, even when shuffle:false */
      shown = drawN;
      renderList();
    });

    /* One matcher per query+flags, not per row. Every mode goes through RegExp:
       a plain query is escaped to its literal, so "a.b" stays "a.b" until the
       reader asks for regex. Returns null (no constraint) or false (the pattern
       doesn't compile — an unfinished `(foo`, which is a state the reader is in
       for most of the keystrokes it takes to type one). */
    function buildMatcher() {
      badRe = false;
      hitRe = null;
      searchBox?.classList.remove("bad");
      const q = searchBox?.value.trim();
      if (!q) return null;
      const src = sflags.regex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const body = sflags.word ? `\\b(?:${src})\\b` : src, fl = sflags.case ? "" : "i";
      try {
        const re = new RegExp(body, fl);
        /* a separate /g clone: `test` on a global regex carries lastIndex
           between calls, and this one is exec'd in a loop per text node */
        hitRe = new RegExp(body, fl + "g");
        return s => re.test(s);
      } catch {
        /* user input, handled: the box goes red and the count says why */
        badRe = true;
        searchBox.classList.add("bad");
        return false;
      }
    }

    function matches() {
      const q = buildMatcher();
      if (q === false) return [];
      return data.filter(r => {
        for (const d of dims) {
          if (d.type === "min" && r[d.key] < state[d.key + ":min"]) return false;
          if (d.type === "max" && r[d.key] > state[d.key + ":max"]) return false;
          /* empty set = unconstrained; otherwise OR within a dimension, AND across */
          if ((d.type === "select" || !d.type) && state[d.key].size
              && !state[d.key].has(String(r[d.key]))) return false;
        }
        if (spec.globalStore && spec.globalFilter
            && !spec.globalFilter(r, spec.globalStore.state)) return false;
        if (q && !scopes[scope].fns.some(f => q(String(f(r) ?? "")))) return false;
        return true;
      });
    }

    function update() {   /* filter/search/set() entry: fresh draw + reset paging */
      const m = matches();
      view = shuffled ? KitStats.shuffle(m) : m;
      shown = pageSize;
      syncChrome();
      renderList();
    }

    /* The whole control state as a flat {key: value | [values]} bag — what
       hashNav puts in the URL, and what set() reads back. Search state travels
       under `_`-prefixed keys so it can't collide with a dimension key. */
    let listener = null;
    function getState() {
      const f = {};
      for (const k in dimByKey) if (dimByKey[k].chosen.size) f[k] = [...dimByKey[k].chosen];
      for (const k in rangeByKey)
        if (String(state[k]) !== rangeByKey[k].def) f[k] = String(state[k]);
      const q = searchBox?.value.trim();
      if (q) {
        f._q = q;
        if (scope) f._in = String(scope);
        const fl = Object.keys(sflags).filter(k => sflags[k]).map(k => k[0]).join("");
        if (fl) f._f = fl;
      }
      return f;
    }
    /* every control the reader can touch routes through here, so the state a
       listener sees is the state they just produced. set() and the global store
       deliberately don't: a programmatic drive already knows what it asked for,
       and echoing it back would make hashNav rewrite the hash it just read. */
    function userUpdate() { update(); listener?.(getState()); }

    function renderList() {
      const m = view;
      list.textContent = "";
      if (m.length === 0) {
        count.textContent = badRe ? "the regular expression doesn't compile" : "0 samples match";
        list.innerHTML = `<div class="empty-state">— none —</div>`;
        return;
      }
      const rows = m.slice(0, shown);
      count.textContent = `${m.length} samples match` + (rows.length === m.length ? ""
        : ` — showing ${rows.length}` + (shuffled ? " at random" : " (first)"));
      rows.forEach(r => {
        const card = render(r);
        /* highlight before it is in the document: one reflow, not one per mark */
        if (hitRe && typeof KitCards !== "undefined") KitCards.highlight(card, hitRe);
        list.appendChild(card);
      });
      const remaining = m.length - rows.length;
      if (remaining > 0) {
        const more = document.createElement("button");
        more.type = "button"; more.className = "ex-more";
        more.textContent = `show ${Math.min(pageSize, remaining)} more`;
        more.addEventListener("click", () => { shown += pageSize; renderList(); });
        list.appendChild(more);
      }
      if (typeof KitCards !== "undefined") KitCards.markShort(list);
    }

    if (spec.globalStore) spec.globalStore.on(() => update());
    update();

    /* Programmatic filter drive (e.g. a chart's onBarClick filtering the
       explorer to that bar's rows). filters: {dimKey: value | [values]},
       plus the `_q`/`_in`/`_f` search keys getState() emits.
       Unmentioned dims — and an unmentioned search — are cleared unless
       keepOthers is true: a chart click means "show me these rows", and a
       leftover query would quietly show fewer than the mark it came from. */
    function set(filters, { keepOthers = false } = {}) {
      for (const d of dims) {
        const dim = dimByKey[d.key];
        if (!dim) continue;
        if (d.key in filters) dim.apply(filters[d.key]);
        else if (!keepOthers) dim.clear();
      }
      for (const k in rangeByKey) {
        if (k in filters) rangeByKey[k].set(String([].concat(filters[k])[0]));
        else if (!keepOthers) rangeByKey[k].set(rangeByKey[k].def);
      }
      if (searchBox && ("_q" in filters || !keepOthers)) {
        searchBox.value = "_q" in filters ? [].concat(filters._q)[0] : "";
        const fl = "_f" in filters ? String([].concat(filters._f)[0]) : "";
        for (const k in sflags) {
          sflags[k] = fl.includes(k[0]);
          const b = el.querySelector(".ex-flag-" + k);
          if (b) { b.classList.toggle("on", sflags[k]); b.setAttribute("aria-pressed", String(sflags[k])); }
        }
        scope = "_in" in filters ? Number([].concat(filters._in)[0]) || 0 : 0;
        if (scopeSel) scopeSel.value = String(scope);
      }
      update();
    }
    return { refresh: update, set, state: getState, onChange: fn => { listener = fn; },
             keys: () => [...Object.keys(dimByKey), ...Object.keys(rangeByKey)] };
  }

  /* ---- hash-linked explorer navigation ----
     A chart click that filters the explorer IS a navigation, so it belongs in
     the browser's history: goto() pushes the anchor the reader came FROM (the
     figure) and then the explorer view with its filters in the hash. Back
     alternates plot ↔ samples, Forward re-opens the same filtered list, and a
     copied URL reproduces the view. Both pushes are plain `location.hash`
     writes so the BROWSER owns the scroll and the history entry — inside the
     artifact iframe the page itself never scrolls (the parent sizes the frame
     to full content height), and fragment navigation is what works there.

     It also runs the other way: every control the reader touches in the
     explorer writes the hash back, so the URL always names the view on screen
     and any configuration they reach by hand is a link they can paste. Those
     writes REPLACE the current history entry rather than push one — a filter
     bank is not a trail of navigations, and one entry per keystroke would make
     Back useless.

     hashNav(api, { anchorId, defaults, sync }) → { goto(filters, {from}), applyHash }
     where `api` is an explorer() handle; `sync: false` opts out of the
     write-back. Hash form: #anchor?dim=value&dim=value */
  function hashNav(api, { anchorId, defaults = null, sync = true }) {
    /* every hash this module writes goes through location.hash, which is
       same-document by construction; the page's own <a href="#…"> links are not,
       inside an artifact frame — see KitToc.sameDocAnchors. Bare KitToc:
       top-level `const` never lands on window, so the window.KitToc?.… form
       this used to be was a silent no-op. */
    if (typeof KitToc !== "undefined") KitToc.sameDocAnchors?.();
    /* a multi-valued filter travels as a repeated key (dim=a&dim=b), not as a
       joined string: `encodeURIComponent(["a","b"])` gives "a%2Cb", which decodes
       to one unknown value, which a dim silently drops — i.e. a multi-value chart
       click would hand the explorer NO filter on that dimension and show the
       superset. */
    const enc = f => {
      const q = Object.entries(f)
        .flatMap(([k, v]) => [].concat(v)
          .map(x => `${encodeURIComponent(k)}=${encodeURIComponent(x)}`)).join("&");
      return "#" + anchorId + (q ? "?" + q : "");
    };
    const dec = h => {
      const [id, q] = h.replace(/^#/, "").split("?");
      if (id !== anchorId) return null;
      const f = {};
      for (const kv of (q || "").split("&")) {
        const [k, v = ""] = kv.split("=");
        if (!k) continue;
        const key = decodeURIComponent(k), val = decodeURIComponent(v);
        f[key] = key in f ? [].concat(f[key], val) : val;
      }
      return f;
    };
    const scrollTo = (id, behavior = "smooth") =>
      document.getElementById(id)?.scrollIntoView({ behavior });
    const applyHash = () => {
      const f = dec(location.hash);
      if (f) api.set(f);
      return !!f;
    };
    /* Who scrolls, and when. For a plain `#id` the browser does it already, and
       issuing a second smooth scroll at the same target does NOT land on it —
       it lands 30-50px short, on every appendix link, reproducibly, until you
       click again (Clément). So we scroll only where the browser won't:

       - an explorer hash, which carries a `?query` and so matches no element id;
       - a history traversal, where the restored position wins over the fragment
         — and the position it restores was recorded after goto() had already
         moved on to the explorer, i.e. Back lands the reader where they were
         rather than on the figure they came from. That one scrolls instantly:
         Back should feel like Back, and an instant scroll can't be cut short. */
    let traversal = false;
    let mine = null;      /* the last hash WE wrote from the reader's own edits */
    addEventListener("popstate", () => { traversal = true; });
    addEventListener("hashchange", () => {
      const wasTraversal = traversal;
      traversal = false;
      /* our own write-back: the explorer already holds this state, and
         re-applying it would yank the reader back to the top of the list */
      if (location.hash === mine) return;
      mine = null;
      if (applyHash()) scrollTo(anchorId);
      else if (wasTraversal) scrollTo(location.hash.replace(/^#/, "").split("?")[0], "instant");
    });

    function goto(filters, { from = null } = {}) {
      const target = enc(filters);
      if (location.hash === target) {   /* same view again: no entry, just go */
        api.set(filters); scrollTo(anchorId); return;
      }
      /* the from-entry is what Back lands on; skip it when we're already there
         (the reader came from that anchor) so Back doesn't need two presses */
      if (from && location.hash !== "#" + from) location.hash = from;
      location.hash = target;
    }
    /* Everything a copy path can hand a reader, normalized and applied: a full
       url, the bare "#anchor?a=b" hash, the query alone, or a section handle
       ("#a4", what a heading copies in a frame). Returns false on anything it
       doesn't recognize — applying garbage would read as "clear everything". */
    function takeCode(raw) {
      let code = String(raw).trim();
      /* a ?view= deep-link url pastes as readily as the code it carries */
      const v = code.match(/[?&]view=([^&#\s]*)/);
      if (v) {
        try { code = decodeURIComponent(v[1]); } catch { return false; }
      }
      /* anything carrying a fragment IS its fragment — a heading's copied
         url ("…/artifact/<id>#a6") must paste as well as "#a6" does */
      const h = code.indexOf("#");
      if (h >= 0) code = code.slice(h);
      const at = code.indexOf(anchorId + "?");
      if (at >= 0) code = code.slice(at + anchorId.length + 1);
      else if (code.replace(/^[#?]+/, "") === anchorId) code = "";
      code = code.replace(/^[#?]+/, "");
      if (code && code !== anchorId && document.getElementById(code)) {
        location.hash = code;
        return true;
      }
      const f = dec("#" + anchorId + (code ? "?" + code : ""));
      const known = new Set([...(api.keys?.() || []), "_q", "_in", "_f"]);
      if (!f || !Object.keys(f).every(k => known.has(k))) return false;
      api.set(f);
      scrollTo(anchorId);
      return true;
    }
    /* a shared/reloaded explorer URL lands on the explorer, filters applied.
       Failing the hash: ?view=<code> in the query string — the one deep-link
       form with a chance of surviving a host that frames the report and
       forwards the query but not the fragment. Where nothing forwards it,
       the param never appears and this is a no-op. */
    if (applyHash()) scrollTo(anchorId);
    else {
      const code = new URLSearchParams(location.search).get("view");
      if (!(code && takeCode(code)) && defaults) api.set(defaults);
    }
    /* registered AFTER the initial apply so a reader who never touches the
       explorer keeps the URL they arrived with */
    if (sync) api.onChange?.(f => {
      const target = enc(f);
      if (location.hash === target) return;
      mine = target;
      /* replaceState is the one that leaves history alone, but an artifact
         frame can be sandboxed to an opaque origin, where it throws; the
         fragment write always works, at the cost of a history entry.
         The url is built from location.href, not passed as a bare "#…":
         a relative url resolves against the document BASE, and an artifact
         frame's <base href="/"> would drop the query carrying its auth
         token — the v0.6.18 bug, in a place the browser doesn't warn about. */
      try {
        history.replaceState(history.state, "", location.href.split("#")[0] + target);
      } catch {
        location.hash = target;
      }
    });
    if (sync) mountShare(anchorId, () => enc(api.state?.() || {}), takeCode);
    return { goto, applyHash };
  }

  /* Sharing a view, in an environment where a url cannot do it.
     A published report is a CROSS-ORIGIN iframe: the document lives at
     <id>.frame.claudeusercontent.com/_f/<build-id>/?__frame_t=<token>, the
     address bar belongs to claude.ai, and neither side can read or write the
     other's. So: the hash the explorer writes is invisible to the reader; a
     hash pasted onto the claude.ai url never reaches the report (Clément, on a
     link that looked right and did nothing); and the iframe's own url is no
     good to send on — it is signed, and its build-id path changes on every
     republish. There is no runtime capability for parent navigation either.
     What survives that: a CODE the reader copies out and the recipient pastes
     back in. The url branch is still taken when the report happens to be the
     top-level document (a local build, a raw file), where it is strictly
     better — but in the claude.ai UI, the code is the shareable object. */
  function mountShare(anchorId, hashOf, applyCode) {
    const row = document.getElementById(anchorId)?.querySelector(".ex-actions");
    if (!row || row.querySelector(".ex-share")) return;
    const framed = window.top !== window.self;
    /* Inside the claude.ai frame the page still knows which artifact it is —
       KitToc.pageLink reconstructs the artifact url from the frame's hostname.
       So the framed button copies a link that OPENS the report and carries the
       view in its fragment. The frame wall means the fragment won't apply
       itself on arrival: the recipient pastes the same link into "open a
       shared view", which takeCode unwraps. One shared object instead of a
       url plus a code. A frame on any other host falls back to the bare code. */
    /* bare KitToc, not window.KitToc: a top-level `const` in a classic script
       binds in the global lexical scope, NOT on window — window.KitToc is
       undefined even with toc.js loaded */
    const base = (typeof KitToc !== "undefined" ? KitToc.pageLink?.() : null)
      ?? (framed ? null : location.origin + location.pathname);
    const wrap = document.createElement("div");
    wrap.className = "ex-share";

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "ex-link";
    const idle = base ? "copy link to this view" : "copy this view";
    copy.textContent = idle;
    copy.title = base && framed
      ? "a link that opens this report carrying the view — the reader on the other "
        + "side pastes the same link into “open a shared view” to apply it"
      : framed
        ? "the filters, search and all — as a code the reader on the other side pastes back in"
        : "the url of the explorer as it stands — filters, search and all";
    const say = (msg, ok) => {
      copy.textContent = msg;
      copy.classList.toggle("ok", !!ok);
      setTimeout(() => {
        copy.textContent = idle;
        copy.classList.remove("ok");
      }, 2200);
    };
    copy.addEventListener("click", async () => {
      const hash = hashOf();
      const text = base ? base + hash : hash;
      if (await KitToc.copyText(text)) {
        say(base ? "link copied ✓" : "view copied ✓", true);
        return;
      }
      /* both clipboard paths refused (permissions-policy can disable the
         clipboard for a frame): the reader still gets it, in a field to select */
      wrap.querySelector(".ex-link-out")?.remove();
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.className = "ex-link-out";
      ta.readOnly = true;
      wrap.appendChild(ta);
      ta.select();
      say("copy it from the box →");
    });

    /* the other end of the round trip. Not an always-open input: it is the
       rarer half, and the control row is already full */
    const open = document.createElement("button");
    open.type = "button";
    open.className = "ex-paste-open";
    open.textContent = "open a shared view";
    open.title = "paste a view someone copied out of this report";
    const box = document.createElement("input");
    box.type = "text";
    box.className = "ex-paste";
    box.placeholder = "paste the link or view you were sent, then Enter";
    box.hidden = true;
    const apply = () => {
      const raw = box.value.trim();
      if (!raw) return;
      if (applyCode(raw)) { box.hidden = true; box.value = ""; open.hidden = false; }
      else box.classList.add("bad");
    };
    box.addEventListener("input", () => box.classList.remove("bad"));
    box.addEventListener("keydown", e => {
      if (e.key === "Enter") apply();
      if (e.key === "Escape") { box.hidden = true; box.value = ""; open.hidden = false; }
    });
    box.addEventListener("paste", () => setTimeout(apply, 0));
    open.addEventListener("click", () => {
      open.hidden = true; box.hidden = false; box.focus();
    });

    wrap.append(copy, open, box);
    row.appendChild(wrap);
  }

  /* Paired A/B comparison explorer (assistant-axis pattern): per-dimension
     linked/split toggles; a draw picks one shared row key (e.g. same prompt)
     present in both filtered pools and renders the two rows side by side.
     comparisonExplorer(el, { data, dims:[{key,label}], pairKey:"prompt",
                              render(rowA,rowB) → Element }) */
  function comparisonExplorer(el, spec) {
    const { data, dims, pairKey, render } = spec;
    const controls = document.createElement("div");
    controls.className = "ex-controls";
    const state = {};   // {key: {linked:bool, a:v, b:v}}

    for (const d of dims) {
      const values = uniq(data, d.key);
      const wrap = document.createElement("div");
      const label = document.createElement("label");
      const link = document.createElement("input");
      link.type = "checkbox"; link.checked = true; link.title = "linked across A/B";
      label.append(`${d.label || d.key} `, link, " 🔗");
      const selA = document.createElement("select"), selB = document.createElement("select");
      [selA, selB].forEach(s => {
        s.appendChild(new Option("all", "__all__"));
        values.forEach(v => s.appendChild(new Option(String(v), String(v))));
      });
      selB.style.display = "none";
      state[d.key] = { linked: true, a: "__all__", b: "__all__" };
      link.addEventListener("change", () => {
        state[d.key].linked = link.checked;
        selB.style.display = link.checked ? "none" : "";
        if (link.checked) { selB.value = selA.value; state[d.key].b = selA.value; }
      });
      selA.addEventListener("change", () => {
        state[d.key].a = selA.value;
        if (state[d.key].linked) state[d.key].b = selA.value;
      });
      selB.addEventListener("change", () => { state[d.key].b = selB.value; });
      wrap.append(label, selA, selB);
      controls.appendChild(wrap);
    }

    const drawBtn = document.createElement("button");
    drawBtn.type = "button"; drawBtn.textContent = "Draw comparison";
    const count = document.createElement("span"); count.className = "ex-count";
    controls.append(drawBtn, count);
    const out = document.createElement("div");
    el.append(controls, out);

    const pool = side => data.filter(r =>
      dims.every(d => state[d.key][side] === "__all__" || String(r[d.key]) === state[d.key][side]));

    function draw() {
      const A = pool("a"), B = pool("b");
      const keysB = new Set(B.map(r => r[pairKey]));
      const shared = [...new Set(A.map(r => r[pairKey]))].filter(k => keysB.has(k));
      out.textContent = "";
      if (!shared.length) {
        count.textContent = "no shared " + pairKey + " between the two pools";
        out.innerHTML = `<div class="empty-state">— none —</div>`;
        return;
      }
      const k = shared[(Math.random() * shared.length) | 0];
      const a = KitStats.shuffle(A.filter(r => r[pairKey] === k))[0];
      const b = KitStats.shuffle(B.filter(r => r[pairKey] === k))[0];
      count.textContent = `${shared.length} shared ${pairKey}s`;
      out.appendChild(render(a, b));
      if (typeof KitCards !== "undefined") KitCards.markShort(out);
    }
    drawBtn.addEventListener("click", draw);
    draw();
    return { refresh: draw };
  }

  return { explorer, comparisonExplorer, hashNav, uniq };
})();
