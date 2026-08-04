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
       globalStore, globalFilter: (row, state) => bool,  // optional KitFilters hookup
     }) → { refresh } */
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
        const dim = makeDim(d, d.values || uniq(data, d.key), update);
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
        input.addEventListener("input", () => { state[key] = Number(input.value); setLabel(); update(); });
        state[key] = Number(input.value); setLabel();
        wrap.append(label, input);
        dimRow.appendChild(wrap); inputs.push(input);
      }
    }

    const scopes = searchScopes(search);
    let scope = 0;               /* index into scopes; 0 is the default */
    let searchBox = null, scopeSel = null;
    if (scopes.length) {
      const wrap = document.createElement("div");
      const label = document.createElement("label");
      label.textContent = "search";
      searchBox = document.createElement("input");
      searchBox.type = "search"; searchBox.placeholder = "free text…";
      let t; searchBox.addEventListener("input", () => { clearTimeout(t); t = setTimeout(update, 150); });
      wrap.append(label, searchBox);
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
          if (searchBox.value.trim()) update();
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
      update();
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

    /* randomRows non-null => the list shows random draws; "show more" then
       keeps drawing randomly from the not-yet-shown remainder (not the first
       N of the filtered list). Any filter/search change exits random mode. */
    let randomRows = null;
    let shown = pageSize;
    drawBtn.addEventListener("click", () => {
      randomRows = KitStats.shuffle(matches()).slice(0, drawN);
      renderList();
    });

    function matches() {
      const q = searchBox?.value.trim().toLowerCase();
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
        if (q && !scopes[scope].fns.some(f => String(f(r) ?? "").toLowerCase().includes(q))) return false;
        return true;
      });
    }

    function update() {   /* filter/search/set() entry: reset paging + random mode */
      randomRows = null; shown = pageSize;
      syncChrome();
      renderList();
    }

    function renderList() {
      const m = matches();
      list.textContent = "";
      if (m.length === 0) {
        count.textContent = "0 samples match";
        list.innerHTML = `<div class="empty-state">— none —</div>`;
        return;
      }
      const rows = randomRows ?? m.slice(0, shown);
      count.textContent = `${m.length} samples match — showing ` +
        (randomRows ? `${rows.length} random` : `first ${rows.length}`);
      rows.forEach(r => list.appendChild(render(r)));
      const remaining = m.length - rows.length;
      if (remaining > 0) {
        const more = document.createElement("button");
        more.type = "button"; more.className = "ex-more";
        more.textContent = `show ${Math.min(pageSize, remaining)} more` + (randomRows ? " random" : "");
        more.addEventListener("click", () => {
          if (randomRows) {
            const seen = new Set(randomRows);
            randomRows = randomRows.concat(
              KitStats.shuffle(m.filter(r => !seen.has(r))).slice(0, pageSize));
          } else shown += pageSize;
          renderList();
        });
        list.appendChild(more);
      }
      if (typeof KitCards !== "undefined") KitCards.markShort(list);
    }

    if (spec.globalStore) spec.globalStore.on(() => update());
    update();

    /* Programmatic filter drive (e.g. a chart's onBarClick filtering the
       explorer to that bar's rows). filters: {dimKey: value | [values]}.
       Unmentioned select dims are cleared unless keepOthers is true. */
    function set(filters, { keepOthers = false } = {}) {
      for (const d of dims) {
        const dim = dimByKey[d.key];
        if (!dim) continue;
        if (d.key in filters) dim.apply(filters[d.key]);
        else if (!keepOthers) dim.clear();
      }
      update();
    }
    return { refresh: update, set };
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

     hashNav(api, { anchorId, defaults }) → { goto(filters, {from}), applyHash }
     where `api` is an explorer() handle. Hash form: #anchor?dim=value&dim=value */
  function hashNav(api, { anchorId, defaults = null }) {
    /* every hash this module writes goes through location.hash, which is
       same-document by construction; the page's own <a href="#…"> links are not,
       inside an artifact frame — see KitToc.sameDocAnchors */
    window.KitToc?.sameDocAnchors?.();
    const enc = f => {
      const q = Object.entries(f)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
      return "#" + anchorId + (q ? "?" + q : "");
    };
    const dec = h => {
      const [id, q] = h.replace(/^#/, "").split("?");
      if (id !== anchorId) return null;
      const f = {};
      for (const kv of (q || "").split("&")) {
        const [k, v = ""] = kv.split("=");
        if (k) f[decodeURIComponent(k)] = decodeURIComponent(v);
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
    addEventListener("popstate", () => { traversal = true; });
    addEventListener("hashchange", () => {
      const wasTraversal = traversal;
      traversal = false;
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
    /* a shared/reloaded explorer URL lands on the explorer, filters applied */
    if (applyHash()) scrollTo(anchorId);
    else if (defaults) api.set(defaults);
    return { goto, applyHash };
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
