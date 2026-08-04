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

  /* A filter dimension: a picker that ADDS values, and a chip per chosen value.
     Multi-select because one-value-per-dimension forces a reader who wants two
     categories to either run the query twice or reach for a coarser dimension
     that the report then has to carry just for that (which is how a `cot_side`
     ends up duplicating half of `cot_cat`). No selection = no constraint, so
     the default view is still everything. */
  function makeDim(d, values, onChange) {
    const chosen = new Set();
    const optLabel = v => (d.optionLabel ? d.optionLabel(v) : String(v));
    /* optionTitle: hover text for an option and its chip. A dimension whose values
       are identifiers (`p3`, an arm code) is unreadable in the dropdown even when
       the report holds the text they stand for. */
    const optTitle = v => (d.optionTitle ? d.optionTitle(v) : "");
    const wrap = document.createElement("div");
    wrap.className = "ex-dim";
    const head = document.createElement("div");
    head.className = "ex-dim-head";
    const label = document.createElement("label");
    label.textContent = d.label || d.key;
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "ex-x ex-dim-x";
    clear.textContent = "✕";
    clear.title = `clear ${d.label || d.key}`;
    clear.addEventListener("click", () => { chosen.clear(); sync(); onChange(); });
    head.append(label, clear);
    const sel = document.createElement("select");
    const chips = document.createElement("div");
    chips.className = "ex-chips";
    wrap.append(head, sel, chips);

    /* chosen values leave the dropdown: re-picking one is a no-op, and a long
       option list is easier to scan without the ones already applied */
    function sync() {
      sel.textContent = "";
      sel.appendChild(new Option(chosen.size ? "add…" : "all", "__all__"));
      for (const v of values) {
        if (chosen.has(String(v))) continue;
        const opt = new Option(optLabel(v), String(v));
        opt.title = optTitle(v);
        sel.appendChild(opt);
      }
      sel.value = "__all__";
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
      if (sel.value === "__all__") return;
      chosen.add(sel.value); sync(); onChange();
    });
    sync();

    const known = new Set(values.map(String));
    return {
      wrap, chosen,
      /* set() from a chart click replaces rather than adds: the click means
         "show me these rows", not "widen what I already had" */
      apply(vals) {
        chosen.clear();
        for (const v of [].concat(vals)) if (known.has(String(v))) chosen.add(String(v));
        sync();
      },
      clear() { chosen.clear(); sync(); },
    };
  }

  /* explorer(el, {
       data,                      // array of row objects
       dims: [{key, label, advanced, optionLabel, optionTitle,
                type:"select"|"min"|"max", min, max, step}],
       search: ["prompt","text", r => resolve(r)],  // field names and/or resolvers
       render: row => Element,    // card factory
       pageSize: 12, drawN: 5,
       globalStore, globalFilter: (row, state) => bool,  // optional KitFilters hookup
     }) → { refresh } */
  function explorer(el, spec) {
    const { data, dims = [], search = [], render, pageSize = 12, drawN = 5 } = spec;
    const controls = document.createElement("div");
    controls.className = "ex-controls";
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
        else controls.appendChild(dim.wrap);
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
        controls.appendChild(wrap); inputs.push(input);
      }
    }

    /* A resolver entry exists because the text a card SHOWS is not always a field
       on the row: a corpus that dedupes a shared body (one frozen CoT across its
       ~20 resamples) keeps it in a side table, and a search that only reads row
       fields then silently misses those rows while the reader is looking at the
       very text they searched for. */
    const searchFns = search.map(k => (typeof k === "function" ? k : (r => r[k])));
    let searchBox = null;
    if (search.length) {
      const wrap = document.createElement("div");
      const label = document.createElement("label");
      label.textContent = "search";
      searchBox = document.createElement("input");
      searchBox.type = "search"; searchBox.placeholder = "free text…";
      let t; searchBox.addEventListener("input", () => { clearTimeout(t); t = setTimeout(update, 150); });
      wrap.append(label, searchBox);
      controls.appendChild(wrap);
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
      update();
    });
    const count = document.createElement("span");
    count.className = "ex-count";
    controls.append(drawBtn, clearAll, count);

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
        if (q && !searchFns.some(f => String(f(r) ?? "").toLowerCase().includes(q))) return false;
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
    const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    const applyHash = () => {
      const f = dec(location.hash);
      if (f) api.set(f);
      return !!f;
    };
    /* We scroll on every hash event ourselves. Two reasons the browser won't:
       an explorer hash carries a `?query` so it matches no element id, and on a
       Back into the from-entry the scroll RESTORATION wins over the fragment —
       and the position it restores was recorded after goto() had already moved
       on to the explorer, i.e. the reader lands where they were, not on the
       figure they came from. */
    addEventListener("hashchange", () => {
      if (applyHash()) scrollTo(anchorId);
      else scrollTo(location.hash.replace(/^#/, "").split("?")[0]);
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
