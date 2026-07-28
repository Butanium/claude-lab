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

  function makeSelect(labelText, values, withAll = true) {
    const wrap = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = labelText;
    const sel = document.createElement("select");
    if (withAll) sel.appendChild(new Option("all", "__all__"));
    values.forEach(v => sel.appendChild(new Option(String(v), String(v))));
    wrap.append(label, sel);
    return { wrap, sel };
  }

  /* explorer(el, {
       data,                      // array of row objects
       dims: [{key, label, type:"select"|"min"|"max", min, max, step}],
       search: ["prompt","text"], // optional free-text fields
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
    const selByKey = {};

    for (const d of dims) {
      if (d.type === "select" || !d.type) {
        const { wrap, sel } = makeSelect(d.label || d.key, d.values || uniq(data, d.key));
        sel.addEventListener("change", () => { state[d.key] = sel.value; update(); });
        state[d.key] = "__all__";
        selByKey[d.key] = sel;
        controls.appendChild(wrap); inputs.push(sel);
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
    const count = document.createElement("span");
    count.className = "ex-count";
    controls.append(drawBtn, count);

    const list = document.createElement("div");
    list.className = "sample-list";
    el.append(controls, list);

    let randomMode = false;
    let shown = pageSize;
    drawBtn.addEventListener("click", () => { randomMode = true; update(); });

    function matches() {
      const q = searchBox?.value.trim().toLowerCase();
      return data.filter(r => {
        for (const d of dims) {
          if (d.type === "min" && r[d.key] < state[d.key + ":min"]) return false;
          if (d.type === "max" && r[d.key] > state[d.key + ":max"]) return false;
          if ((d.type === "select" || !d.type) && state[d.key] !== "__all__"
              && String(r[d.key]) !== state[d.key]) return false;
        }
        if (spec.globalStore && spec.globalFilter
            && !spec.globalFilter(r, spec.globalStore.state)) return false;
        if (q && !search.some(k => String(r[k] ?? "").toLowerCase().includes(q))) return false;
        return true;
      });
    }

    function update() {
      const m = matches();
      list.textContent = "";
      if (m.length === 0) {
        count.textContent = "0 samples match";
        list.innerHTML = `<div class="empty-state">— none —</div>`;
        return;
      }
      let rows;
      if (randomMode) {
        rows = KitStats.shuffle(m).slice(0, drawN);
        count.textContent = `${m.length} samples match — showing ${rows.length} random`;
        randomMode = false;
      } else {
        rows = m.slice(0, shown);
        count.textContent = `${m.length} samples match — showing first ${rows.length}`;
      }
      rows.forEach(r => list.appendChild(render(r)));
      if (!randomMode && m.length > shown) {
        const more = document.createElement("button");
        more.type = "button"; more.className = "ex-more";
        more.textContent = `show ${Math.min(pageSize, m.length - shown)} more`;
        more.addEventListener("click", () => { shown += pageSize; update(); });
        list.appendChild(more);
      }
      if (typeof KitCards !== "undefined") KitCards.markShort(list);
    }

    if (spec.globalStore) spec.globalStore.on(() => update());
    update();

    /* Programmatic filter drive (e.g. a chart's onBarClick filtering the
       explorer to that bar's rows). filters: {dimKey: value | "__all__"}.
       Unmentioned select dims reset to "all" unless keepOthers is true. */
    function set(filters, { keepOthers = false } = {}) {
      for (const d of dims) {
        const sel = selByKey[d.key];
        if (!sel) continue;
        if (d.key in filters) {
          const v = String(filters[d.key]);
          if ([...sel.options].some(o => o.value === v)) { sel.value = v; state[d.key] = v; }
        } else if (!keepOthers) { sel.value = "__all__"; state[d.key] = "__all__"; }
      }
      randomMode = false; shown = pageSize;
      update();
    }
    return { refresh: update, set };
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

  return { explorer, comparisonExplorer, uniq };
})();
