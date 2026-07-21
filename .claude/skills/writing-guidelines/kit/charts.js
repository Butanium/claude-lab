/* clab report kit — charts.js
   Hand-rolled SVG charts per the dataviz-skill procedure: thin marks, hairline
   grid, CI whiskers, hover tooltips with n=, per-run overlays, reference
   lines, low-n convention (desaturate + ⚠), keyboard/screen-reader access.
   Colors are CSS custom properties (var(--series-i)) so themes apply live.
   Every chart takes PRE-AGGREGATED data (Python computes statistics; use
   KitStats only for filter-reactive recomputation).

   Conventions enforced here (don't fight them):
   - series colors follow the entity: pass an explicit seriesIndex per series
     name once, reuse it everywhere; filters must not repaint survivors
   - one y-axis per chart; never dual axes
   - a legend renders for ≥2 series; single series is named by the title
   - tooltips always include n= when the datum carries one */
"use strict";

const KitCharts = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, styleVars = {}) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    for (const [k, v] of Object.entries(styleVars)) e.style[k] = v;
    return e;
  };
  const txt = (x, y, s, attrs = {}) => {
    const t = el("text", { x, y, ...attrs });
    t.textContent = s;
    return t;
  };
  const seriesColor = i => `var(--series-${(i % 8) + 1})`;

  /* ---- shared tooltip (viewport-edge aware) ---- */
  let tipEl = null;
  function tip() {
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.className = "kit-tip";
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }
  function bindTip(target, html) {
    target.addEventListener("mousemove", e => {
      const t = tip();
      t.innerHTML = typeof html === "function" ? html() : html;
      t.style.display = "block";
      const r = t.getBoundingClientRect();
      let x = e.clientX + 14, y = e.clientY + 12;
      if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 10;
      if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 10;
      t.style.left = x + "px"; t.style.top = y + "px";
    });
    target.addEventListener("mouseleave", () => tip().style.display = "none");
    target.addEventListener("focus", () => { /* tooltip text also in aria-label */ });
  }
  function a11y(mark, label) {
    mark.classList.add("mark");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("role", "img");
    mark.setAttribute("aria-label", label);
  }

  /* ---- legend ---- */
  function legend(container, items) {
    if (items.length < 2) return;
    const div = document.createElement("div");
    div.className = "kit-legend";
    div.innerHTML = items.map(it =>
      `<span>${it.glyph ? `<span class="glyph">${it.glyph}</span>` : `<span class="sw" style="background:${it.color}"></span>`}${KitCards?.esc(it.name) ?? it.name}</span>`
    ).join("");
    container.appendChild(div);
  }

  /* ---- frame: margins, scales, axes, gridlines ---- */
  function frame(container, { w = 720, h = 300, m = { t: 12, r: 16, b: 34, l: 46 },
                              yMin = 0, yMax = 1, yFmt = v => v, yTitle = "" }) {
    container.classList.add("kit-chart");
    const svg = el("svg", { viewBox: `0 0 ${w} ${h}` });
    const iw = w - m.l - m.r, ih = h - m.t - m.b;
    const y = v => m.t + ih - ((v - yMin) / (yMax - yMin || 1)) * ih;
    const g = el("g");
    svg.appendChild(g);
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const v = yMin + (i / ticks) * (yMax - yMin), yy = y(v);
      g.appendChild(el("line", { x1: m.l, x2: m.l + iw, y1: yy, y2: yy, class: i === 0 ? "baseline" : "gridline" }));
      g.appendChild(txt(m.l - 6, yy + 3.5, yFmt(v), { "text-anchor": "end", class: "num" }));
    }
    if (yTitle) {
      const t = txt(0, 0, yTitle, { class: "axis-title", "text-anchor": "middle" });
      t.setAttribute("transform", `translate(11 ${m.t + ih / 2}) rotate(-90)`);
      svg.appendChild(t);
    }
    container.appendChild(svg);
    return { svg, y, m, iw, ih, w, h };
  }

  function refLine(f, { y: v, label, cls = "refline" }) {
    const yy = f.y(v);
    f.svg.appendChild(el("line", { x1: f.m.l, x2: f.m.l + f.iw, y1: yy, y2: yy, class: cls }));
    if (label) f.svg.appendChild(txt(f.m.l + f.iw - 2, yy - 4, label, { "text-anchor": "end", class: "axis-title" }));
  }

  const fmtN = d => d.n !== undefined ? ` (n=${d.n})` : "";
  const ciTxt = d => (d.lo !== undefined && Number.isFinite(d.lo))
    ? ` [${(d.fmt || String)(d.lo)}, ${(d.fmt || String)(d.hi)}]` : "";

  /* ---- grouped bars with CI whiskers + per-run dot overlays ----
     spec: { groups, series: [{name, seriesIndex}], values: [{group, series,
       est, lo, hi, n, points: [{label, value, n}]}], yMax, yFmt, yTitle,
       baseline: {y,label}, lowN, w, h } */
  function groupedBars(container, spec) {
    const { groups, series, values, lowN = 0 } = spec;
    const f = frame(container, spec);
    const bw = f.iw / groups.length;
    const slot = bw / (series.length + 0.8);
    const colorOf = s => s.color || seriesColor(s.seriesIndex ?? series.indexOf(s));
    const y0 = f.y(Math.max(spec.yMin ?? 0, 0));
    groups.forEach((gname, gi) => {
      const gx = f.m.l + gi * bw;
      f.svg.appendChild(txt(gx + bw / 2, f.h - f.m.b + 16, gname, { "text-anchor": "middle" }));
      series.forEach((s, si) => {
        const d = values.find(v => v.group === gname && v.series === s.name);
        if (!d) return;
        const x = gx + bw * 0.12 + si * slot;
        const bwid = slot * 0.82;
        const yv = f.y(d.est);
        const low = lowN && d.n !== undefined && d.n < lowN;
        const fmt = spec.yFmt || String;
        const bar = el("rect", {
          x, y: Math.min(yv, y0), width: bwid, height: Math.abs(y0 - yv),
          rx: 2, class: low ? "low-n" : "",
        }, { fill: colorOf(s) });
        const label = `${s.name}, ${gname}: ${fmt(d.est)}${ciTxt({ ...d, fmt })}${fmtN(d)}${low ? " ⚠ low n" : ""}`;
        a11y(bar, label);
        bindTip(bar, `<span class="tip-head">${gname} · ${s.name}</span><br>${fmt(d.est)}${ciTxt({ ...d, fmt })}${fmtN(d)}${low ? ` <span style="color:var(--warn-ink)">⚠ low n</span>` : ""}`);
        f.svg.appendChild(bar);
        if (Number.isFinite(d.lo)) {
          const cx = x + bwid / 2;
          f.svg.appendChild(el("line", { x1: cx, x2: cx, y1: f.y(d.lo), y2: f.y(d.hi), class: "whisker" }));
          f.svg.appendChild(el("line", { x1: cx - 3, x2: cx + 3, y1: f.y(d.lo), y2: f.y(d.lo), class: "whisker" }));
          f.svg.appendChild(el("line", { x1: cx - 3, x2: cx + 3, y1: f.y(d.hi), y2: f.y(d.hi), class: "whisker" }));
        }
        /* per-run overlay dots, deterministic jitter, radius ∝ sqrt(n) */
        (d.points || []).forEach((p, pi) => {
          const px = x + bwid * (0.25 + 0.5 * ((pi * 0.618) % 1));
          const r = p.n ? Math.min(5, 2 + 1.1 * Math.sqrt(p.n) / 3) : 2.6;
          const dot = el("circle", { cx: px, cy: f.y(p.value), r }, { fill: "var(--surface)", stroke: colorOf(s), strokeWidth: 1.6 });
          bindTip(dot, `<span class="tip-head">${p.label ?? "run"}</span><br>${fmt(p.value)}${fmtN(p)}`);
          f.svg.appendChild(dot);
        });
      });
    });
    if (spec.baseline) refLine(f, spec.baseline);
    legend(container, series.map((s, i) => ({ name: s.name, color: colorOf(s) })));
    return f;
  }

  /* ---- 100%/count stacked bars, hatch option for special segments ----
     spec: { groups, segments: [{name, seriesIndex, hatch}], values:
       [{group, segment, count}], percent, w, h } */
  let hatchSeq = 0;
  function stackedBars(container, spec) {
    const { groups, segments, values, percent = true } = spec;
    const f = frame(container, { ...spec, yMin: 0, yMax: percent ? 1 : Math.max(...groups.map(g => values.filter(v => v.group === g).reduce((s, v) => s + v.count, 0))), yFmt: percent ? v => Math.round(v * 100) + "%" : v => v });
    const defs = el("defs");
    f.svg.appendChild(defs);
    const hatchFor = color => {
      const id = `kit-hatch-${hatchSeq++}`;
      const p = el("pattern", { id, width: 5, height: 5, patternTransform: "rotate(45)", patternUnits: "userSpaceOnUse" });
      p.appendChild(el("rect", { width: 5, height: 5 }, { fill: color }));
      p.appendChild(el("line", { x1: 0, y1: 0, x2: 0, y2: 5 }, { stroke: "var(--surface)", strokeWidth: 2 }));
      defs.appendChild(p);
      return `url(#${id})`;
    };
    const bw = f.iw / groups.length;
    groups.forEach((gname, gi) => {
      const gx = f.m.l + gi * bw + bw * 0.18, bwid = bw * 0.64;
      f.svg.appendChild(txt(gx + bwid / 2, f.h - f.m.b + 16, gname, { "text-anchor": "middle" }));
      const rows = values.filter(v => v.group === gname);
      const total = rows.reduce((s, v) => s + v.count, 0) || 1;
      let acc = 0;
      segments.forEach((s, si) => {
        const d = rows.find(v => v.segment === s.name);
        if (!d || !d.count) return;
        const v = percent ? d.count / total : d.count;
        const yTop = f.y(acc + v), yBot = f.y(acc);
        const color = s.color || seriesColor(s.seriesIndex ?? si);
        const rect = el("rect", { x: gx, y: yTop, width: bwid, height: Math.max(0, yBot - yTop - 1) },  /* 1px surface gap */
          { fill: s.hatch ? hatchFor(color) : color });
        const pct = Math.round((d.count / total) * 1000) / 10;
        a11y(rect, `${gname}, ${s.name}: ${pct}% (${d.count}/${total})`);
        bindTip(rect, `<span class="tip-head">${gname} · ${s.name}</span><br>${pct}% (${d.count}/${total})`);
        f.svg.appendChild(rect);
        acc += v;
      });
    });
    legend(container, segments.map((s, i) => ({ name: s.name, color: s.color || seriesColor(s.seriesIndex ?? i) })));
    return f;
  }

  /* ---- multi-series line (dose-response) ----
     spec: { series: [{name, seriesIndex, dash, points: [{x, y, lo, hi, n}]}],
       xTicks: [values...], xFmt, yFmt, yTitle, refLines: [{y,label}], w, h } */
  function line(container, spec) {
    const xs = [...new Set(spec.series.flatMap(s => s.points.map(p => p.x)))].sort((a, b) => a - b);
    const f = frame(container, spec);
    const xr = [xs[0], xs[xs.length - 1]];
    const X = v => f.m.l + ((v - xr[0]) / (xr[1] - xr[0] || 1)) * f.iw;
    (spec.xTicks || xs).forEach(v =>
      f.svg.appendChild(txt(X(v), f.h - f.m.b + 16, (spec.xFmt || String)(v), { "text-anchor": "middle", class: "num" })));
    (spec.refLines || []).forEach(r => refLine(f, r));
    const fmt = spec.yFmt || String;
    spec.series.forEach((s, si) => {
      const color = s.color || seriesColor(s.seriesIndex ?? si);
      const pts = s.points.slice().sort((a, b) => a.x - b.x);
      const dAttr = pts.map((p, i) => `${i ? "L" : "M"}${X(p.x)},${f.y(p.y)}`).join("");
      f.svg.appendChild(el("path", { d: dAttr, fill: "none", "stroke-width": 2, "stroke-dasharray": s.dash ? "5 4" : "none" }, { stroke: color }));
      pts.forEach(p => {
        if (Number.isFinite(p.lo))
          f.svg.appendChild(el("line", { x1: X(p.x), x2: X(p.x), y1: f.y(p.lo), y2: f.y(p.hi), class: "whisker" }, { stroke: color }));
        const dot = el("circle", { cx: X(p.x), cy: f.y(p.y), r: 3.5 }, { fill: color });
        a11y(dot, `${s.name} @ ${p.x}: ${fmt(p.y)}${fmtN(p)}`);
        bindTip(dot, `<span class="tip-head">${s.name} · x=${p.x}</span><br>${fmt(p.y)}${ciTxt({ ...p, fmt })}${fmtN(p)}`);
        f.svg.appendChild(dot);
        const hit = el("circle", { cx: X(p.x), cy: f.y(p.y), r: 9, fill: "transparent" });
        bindTip(hit, `<span class="tip-head">${s.name} · x=${p.x}</span><br>${fmt(p.y)}${ciTxt({ ...p, fmt })}${fmtN(p)}`);
        f.svg.appendChild(hit);
      });
      /* endpoint direct label */
      const last = pts[pts.length - 1];
      f.svg.appendChild(txt(X(last.x) + 6, f.y(last.y) + 3.5, s.name, { class: "direct-label" }, ));
    });
    legend(container, spec.series.map((s, i) => ({ name: s.name, color: s.color || seriesColor(s.seriesIndex ?? i) })));
    return f;
  }

  /* ---- scatter: jitter, symbols, 2D CI whiskers, diagonal, arrows, labels ----
     spec: { points: [{x, y, xlo, xhi, ylo, yhi, n, series, hollow, label, tip}],
       seriesDef: [{name, seriesIndex}], xMin,xMax,yMin,yMax, xFmt,yFmt,
       xTitle,yTitle, diagonal: {label}, arrows: [{x1,y1,x2,y2,series}],
       labels: [{x,y,text,dx,dy,sub}], warnText, w, h }
     NOTE (dataviz all-pairs rule): cap scatter series at 3; fold the rest. */
  function scatter(container, spec) {
    const f = frame(container, spec);
    const xr = [spec.xMin ?? 0, spec.xMax ?? 1];
    const X = v => f.m.l + ((v - xr[0]) / (xr[1] - xr[0] || 1)) * f.iw;
    const fmtX = spec.xFmt || String, fmtY = spec.yFmt || String;
    for (let i = 0; i <= 4; i++) {
      const v = xr[0] + (i / 4) * (xr[1] - xr[0]);
      f.svg.appendChild(txt(X(v), f.h - f.m.b + 16, fmtX(v), { "text-anchor": "middle", class: "num" }));
    }
    if (spec.xTitle) f.svg.appendChild(txt(f.m.l + f.iw / 2, f.h - 4, spec.xTitle, { "text-anchor": "middle", class: "axis-title" }));
    if (spec.diagonal) {
      const lo = Math.max(xr[0], spec.yMin ?? 0), hi = Math.min(xr[1], spec.yMax ?? 1);
      f.svg.appendChild(el("line", { x1: X(lo), y1: f.y(lo), x2: X(hi), y2: f.y(hi), class: "refline" }));
      if (spec.diagonal.label) {
        const t = txt(0, 0, spec.diagonal.label, { class: "axis-title", "text-anchor": "middle" });
        const mx = (X(lo) + X(hi)) / 2, my = (f.y(lo) + f.y(hi)) / 2;
        const ang = Math.atan2(f.y(hi) - f.y(lo), X(hi) - X(lo)) * 180 / Math.PI;
        t.setAttribute("transform", `translate(${mx} ${my - 6}) rotate(${ang})`);
        f.svg.appendChild(t);
      }
    }
    const defs = el("defs");
    f.svg.appendChild(defs);
    const arrowId = {};
    const colorOf = name => {
      const sd = (spec.seriesDef || []).find(s => s.name === name);
      return sd?.color || seriesColor(sd?.seriesIndex ?? (spec.seriesDef || []).findIndex(s => s.name === name));
    };
    (spec.arrows || []).forEach(a => {
      const color = colorOf(a.series);
      if (!arrowId[a.series]) {
        const id = `kit-arr-${Object.keys(arrowId).length}-${hatchSeq++}`;
        const mk = el("marker", { id, viewBox: "0 0 8 8", refX: 7, refY: 4, markerWidth: 6, markerHeight: 6, orient: "auto" });
        mk.appendChild(el("path", { d: "M0,0L8,4L0,8z" }, { fill: color }));
        defs.appendChild(mk);
        arrowId[a.series] = id;
      }
      f.svg.appendChild(el("line", { x1: X(a.x1), y1: f.y(a.y1), x2: X(a.x2), y2: f.y(a.y2), "stroke-width": 1.6, "marker-end": `url(#${arrowId[a.series]})` }, { stroke: color }));
    });
    spec.points.forEach(p => {
      const color = colorOf(p.series);
      const cx = X(p.x), cy = f.y(p.y);
      if (Number.isFinite(p.ylo)) {
        f.svg.appendChild(el("line", { x1: cx, x2: cx, y1: f.y(p.ylo), y2: f.y(p.yhi), class: "whisker" }, { stroke: color }));
        f.svg.appendChild(el("line", { x1: cx - 3, x2: cx + 3, y1: f.y(p.ylo), y2: f.y(p.ylo), class: "whisker" }, { stroke: color }));
        f.svg.appendChild(el("line", { x1: cx - 3, x2: cx + 3, y1: f.y(p.yhi), y2: f.y(p.yhi), class: "whisker" }, { stroke: color }));
      }
      if (Number.isFinite(p.xlo)) {
        f.svg.appendChild(el("line", { y1: cy, y2: cy, x1: X(p.xlo), x2: X(p.xhi), class: "whisker" }, { stroke: color }));
        f.svg.appendChild(el("line", { y1: cy - 3, y2: cy + 3, x1: X(p.xlo), x2: X(p.xlo), class: "whisker" }, { stroke: color }));
        f.svg.appendChild(el("line", { y1: cy - 3, y2: cy + 3, x1: X(p.xhi), x2: X(p.xhi), class: "whisker" }, { stroke: color }));
      }
      const r = p.big ? 6 : (p.n ? Math.min(6, 2.2 + 1.35 * Math.sqrt(p.n) / 2) : 4);
      const dot = el("circle", { cx, cy, r },
        p.hollow ? { fill: "var(--surface)", stroke: color, strokeWidth: 2 } : { fill: color });
      const tipHtml = p.tip || `${fmtX(p.x)}, ${fmtY(p.y)}${fmtN(p)}`;
      a11y(dot, (p.label ? p.label + ": " : "") + tipHtml.replace(/<[^>]+>/g, " "));
      bindTip(dot, tipHtml);
      f.svg.appendChild(dot);
    });
    (spec.labels || []).forEach(l => {
      f.svg.appendChild(txt(X(l.x) + (l.dx ?? 8), f.y(l.y) + (l.dy ?? 4), l.text, { class: "direct-label" }));
      if (l.sub) f.svg.appendChild(txt(X(l.x) + (l.dx ?? 8), f.y(l.y) + (l.dy ?? 4) + 12, l.sub, { class: "axis-title" }));
    });
    if (spec.warnText)
      f.svg.appendChild(txt(f.m.l + f.iw - 4, f.m.t + 12, "⚠ " + spec.warnText, { "text-anchor": "end", class: "canvas-warn" }));
    if ((spec.seriesDef || []).length >= 2)
      legend(container, spec.seriesDef.map((s, i) => ({ name: s.name, color: s.color || seriesColor(s.seriesIndex ?? i) })));
    return f;
  }

  /* ---- dot strip: one row per entity, a dot per sample on [0,1], mean tick */
  function dotStrip(container, spec) {
    const rows = spec.rows;
    const rowH = 34, w = spec.w ?? 720, m = { t: 8, r: 16, b: 26, l: 120 };
    const h = m.t + rows.length * rowH + m.b;
    container.classList.add("kit-chart");
    const svg = el("svg", { viewBox: `0 0 ${w} ${h}` });
    const iw = w - m.l - m.r;
    const X = v => m.l + v * iw;
    const fmt = spec.xFmt || (v => v.toFixed(2));
    [0, 0.25, 0.5, 0.75, 1].forEach(v => {
      svg.appendChild(el("line", { x1: X(v), x2: X(v), y1: m.t, y2: h - m.b, class: "gridline" }));
      svg.appendChild(txt(X(v), h - m.b + 14, fmt(v), { "text-anchor": "middle", class: "num" }));
    });
    rows.forEach((row, ri) => {
      const cy = m.t + ri * rowH + rowH / 2;
      svg.appendChild(txt(m.l - 8, cy + 3.5, row.label, { "text-anchor": "end" }));
      row.dots.forEach(d => {
        const dot = el("circle", { cx: X(d.v), cy: cy + (((d.v * 997) % 1) - 0.5) * 10, r: 3.5, "fill-opacity": 0.55 },
          { fill: row.color || seriesColor(ri) });
        bindTip(dot, d.tip || fmt(d.v));
        a11y(dot, `${row.label}: ${d.tip ? d.tip.replace(/<[^>]+>/g, " ") : fmt(d.v)}`);
        svg.appendChild(dot);
      });
      if (row.mean !== undefined) {
        svg.appendChild(el("line", { x1: X(row.mean), x2: X(row.mean), y1: cy - 11, y2: cy + 11 }, { stroke: "var(--ink)", strokeWidth: 2 }));
        svg.appendChild(txt(X(row.mean), cy - 14, `mean ${fmt(row.mean)} (n=${row.dots.length})`, { "text-anchor": "middle", class: "axis-title" }));
      }
    });
    container.appendChild(svg);
    return { svg };
  }

  /* ---- heatmap: sequential or diverging, cell text, outline-max ----
     spec: { rows, cols, cells: [{row, col, value, text, tip}], diverging,
       vMin, vMax, outlineMax, w } */
  function heatmap(container, spec) {
    const { rows, cols, cells } = spec;
    const w = spec.w ?? 720, m = { t: 8, r: 12, b: 40, l: 120 };
    const cw = (w - m.l - m.r) / cols.length;
    const ch = Math.min(34, cw);
    const h = m.t + rows.length * ch + m.b;
    container.classList.add("kit-chart");
    const svg = el("svg", { viewBox: `0 0 ${w} ${h}` });
    const vals = cells.map(c => c.value).filter(Number.isFinite);
    const vMax = spec.vMax ?? Math.max(...vals), vMin = spec.vMin ?? (spec.diverging ? -vMax : Math.min(...vals, 0));
    /* sequential: seq ramp via color-mix; diverging: blue↔red through --div-mid */
    const fill = v => {
      if (spec.diverging) {
        const t = Math.max(-1, Math.min(1, (2 * (v - vMin)) / (vMax - vMin || 1) - 1));
        return t < 0
          ? `color-mix(in srgb, var(--series-1) ${Math.round(-t * 85)}%, var(--div-mid))`
          : `color-mix(in srgb, var(--series-8) ${Math.round(t * 85)}%, var(--div-mid))`;
      }
      const t = (v - vMin) / (vMax - vMin || 1);
      return `color-mix(in srgb, var(--seq-600) ${Math.round(t * 92)}%, var(--surface))`;
    };
    let maxCell = null;
    if (spec.outlineMax) maxCell = cells.reduce((a, b) => (Math.abs(b.value) > Math.abs(a?.value ?? -Infinity) ? b : a), null);
    rows.forEach((rname, ri) => svg.appendChild(txt(m.l - 8, m.t + ri * ch + ch / 2 + 3.5, rname, { "text-anchor": "end" })));
    cols.forEach((cname, ci) => {
      const t = txt(0, 0, cname, { "text-anchor": "end" });
      t.setAttribute("transform", `translate(${m.l + ci * cw + cw / 2 + 3} ${m.t + rows.length * ch + 6}) rotate(-35)`);
      svg.appendChild(t);
    });
    cells.forEach(c => {
      const ri = rows.indexOf(c.row), ci = cols.indexOf(c.col);
      if (ri < 0 || ci < 0) return;
      const rect = el("rect", { x: m.l + ci * cw + 1, y: m.t + ri * ch + 1, width: cw - 2, height: ch - 2, rx: 2 }, { fill: fill(c.value) });
      a11y(rect, `${c.row} × ${c.col}: ${c.text ?? c.value}`);
      bindTip(rect, c.tip || `<span class="tip-head">${c.row} × ${c.col}</span><br>${c.text ?? c.value}`);
      svg.appendChild(rect);
      if (c.text !== undefined) {
        const dark = spec.diverging ? Math.abs(c.value) > 0.6 * Math.max(Math.abs(vMin), vMax) : (c.value - vMin) / (vMax - vMin || 1) > 0.6;
        svg.appendChild(txt(m.l + ci * cw + cw / 2, m.t + ri * ch + ch / 2 + 3.5, c.text,
          { "text-anchor": "middle", class: "num" }, )).style.fill = dark ? "var(--surface)" : "var(--ink-2)";
      }
      if (maxCell === c) svg.appendChild(el("rect", { x: m.l + ci * cw + 1, y: m.t + ri * ch + 1, width: cw - 2, height: ch - 2, rx: 2, fill: "none", "stroke-width": 2 }, { stroke: "var(--ink)" }));
    });
    container.appendChild(svg);
    return { svg };
  }

  return { el, txt, seriesColor, bindTip, legend, frame, refLine,
           groupedBars, stackedBars, line, scatter, dotStrip, heatmap };
})();
