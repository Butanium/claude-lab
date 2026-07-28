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

  /* rough label-width estimate (11px axis font) for auto-sizing a left
     margin that fits row labels — emoji/wide codepoints counted heavier than
     ASCII. Cheap and generous on purpose: better a little slack than a
     clipped label at the SVG's left edge. */
  function estTextWidth(s, fs = 11) {
    let w = 0;
    for (const ch of String(s)) w += ch.codePointAt(0) > 0x2000 ? fs * 1.15 : fs * 0.56;
    return w;
  }

  /* Nice round tick values inside [min, max] that NEVER exceed max — so a
     scale ceiling with headroom (yMax 1.05 for whisker/label room) doesn't
     label a tick at 105%. Ticks land on multiples of 1/2/2.5/5 ×10^k; the
     axis floor (yMin, when it is itself a round multiple) is included. */
  function niceTicks(min, max, target = 4) {
    const span = max - min;
    if (!(span > 0) || !Number.isFinite(span)) return [min];
    const rawStep = span / target;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const norm = rawStep / mag;
    const step = (norm < 1.5 ? 1 : norm < 2.25 ? 2 : norm < 3.5 ? 2.5 : norm < 7.5 ? 5 : 10) * mag;
    const out = [];
    const eps = 1e-9 * Math.max(1, Math.abs(max));
    for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + eps; v += step)
      out.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toFixed(10));
    return out.length ? out : [min];
  }

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
      `<span${it.full && it.full !== it.name ? ` title="${(KitCards?.esc(it.full) ?? it.full).replace(/"/g, "&quot;")}"` : ""}>${it.glyph ? `<span class="glyph">${it.glyph}</span>` : `<span class="sw" style="background:${it.color}"></span>`}${KitCards?.esc(it.name) ?? it.name}</span>`
    ).join("");
    container.appendChild(div);
  }

  /* ---- frame: margins, scales, axes, gridlines ---- */
  function frame(container, { w = 720, h = 300, m = { t: 12, r: 16, b: 34, l: 46 },
                              yMin = 0, yMax = 1, yFmt = v => v, yTitle = "", yTicks = null,
                              yTickLabels = true }) {
    container.classList.add("kit-chart");
    const svg = el("svg", { viewBox: `0 0 ${w} ${h}` });
    const iw = w - m.l - m.r, ih = h - m.t - m.b;
    const y = v => m.t + ih - ((v - yMin) / (yMax - yMin || 1)) * ih;
    const g = el("g");
    svg.appendChild(g);
    /* tick VALUES are round numbers within [yMin, yMax] — decoupled from the
       scale ceiling so headroom (yMax > data max) never yields a >100% tick */
    for (const v of yTicks || niceTicks(yMin, yMax)) {
      const yy = y(v), isBase = Math.abs(v - yMin) < 1e-9;
      g.appendChild(el("line", { x1: m.l, x2: m.l + iw, y1: yy, y2: yy, class: isBase ? "baseline" : "gridline" }));
      /* yTickLabels: false = shared-axis panel (a row sibling carries the
         numbers); gridlines stay so the panels still read on one scale */
      if (yTickLabels) g.appendChild(txt(m.l - 6, yy + 3.5, yFmt(v), { "text-anchor": "end", class: "num" }));
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

  /* shared hatch-pattern factory (used by stackedBars segments and
     groupedBars per-value hatch) */
  let hatchSeq = 0;
  function makeHatch(defs, color, shape) {
    const id = `kit-hatch-${hatchSeq++}`;
    const rot = shape === "\\" ? "rotate(-45)" : "rotate(45)";
    const p = el("pattern", { id, width: 5, height: 5, patternTransform: rot, patternUnits: "userSpaceOnUse" });
    p.appendChild(el("rect", { width: 5, height: 5 }, { fill: color }));
    p.appendChild(el("line", { x1: 0, y1: 0, x2: 0, y2: 5 }, { stroke: "var(--surface)", strokeWidth: 2 }));
    if (shape === "x") p.appendChild(el("line", { x1: 0, y1: 0, x2: 5, y2: 0 }, { stroke: "var(--surface)", strokeWidth: 2 }));
    defs.appendChild(p);
    return `url(#${id})`;
  }

  /* ---- grouped bars with CI whiskers + per-run dot overlays ----
     spec: { groups, series: [{name, seriesIndex}], values: [{group, series,
       est, lo, hi, n, points: [{label, value, n}]}], yMax, yFmt, yTitle,
       baseline: {y,label}, lowN, w, h } */
  function groupedBars(container, spec) {
    const { groups, series, values, lowN = 0 } = spec;
    /* groupFull/seriesFull: optional (glyph -> full string) resolvers so an
       axis can show a compact label while the tooltip/a11y text spells the
       entity out — group identity (matching) always stays on the raw
       `groups`/`value.group` strings, only the DISPLAYED text changes.
       groupLabel: optional (key -> axis text) resolver, separate from
       groupFull — lets `groups`/`value.group` be a unique join key (e.g. a
       model's short lab code) even when several keys legitimately render the
       same compact glyph (variants of one trait combo); matching never uses
       the rendered text, only the key. Defaults to identity for callers that
       still pass the display text directly as the key. */
    const groupFull = spec.groupFull || (g => g), seriesFull = spec.seriesFull || (s => s.name);
    const groupLabel = spec.groupLabel || (g => g);
    /* labelSize: group-axis font size in viewBox units. The default 11 is
       relative to a ~720 viewBox; a chart that widens its viewBox to fit more
       groups shrinks every fixed-unit glyph on screen, so wide charts (and
       emoji labels, which need the room) pass this explicitly. */
    const LFS = spec.labelSize ?? 11;
    /* auto-rotate group labels when they're too wide for their slot to sit
       horizontally without overlapping neighbors — decided from the same
       margins frame() will use. Rotation is steep (65°, not heatmap's 35°):
       at 35° a label much longer than its own slot still fans out across
       neighboring slots and collides with THEIR labels; 65° keeps a label's
       horizontal footprint within roughly its own slot width even when it's
       2-3x longer than its neighbors (cos 65° ≈ 0.42 vs cos 35° ≈ 0.82).
       Bottom margin is sized to the actual longest label so it isn't clipped. */
    const ROT = 65, rotRad = ROT * Math.PI / 180;
    const m0 = { t: 12, r: 16, b: 34, l: 46, ...spec.m };
    const bw0 = ((spec.w ?? 720) - m0.l - m0.r) / groups.length;
    const maxLabelW = Math.max(0, ...groups.map(g => estTextWidth(groupLabel(g), LFS)));
    /* rotateLabels forces the decision either way — glyph-only axes read badly
       tilted even when the estimator thinks they're a hair too wide */
    const rotate = spec.rotateLabels ?? (maxLabelW > bw0 * 0.85);
    const neededB = Math.ceil(LFS + 5 + maxLabelW * Math.sin(rotRad));
    const bAdj = Math.max(m0.b, neededB);
    /* growing the bottom margin must grow h too, or the extra label room
       eats directly into the plot area (bars/lines get crushed) */
    const f = frame(container, rotate
      ? { ...spec, m: { ...m0, b: bAdj }, h: (spec.h ?? 300) + (bAdj - m0.b) }
      : spec);
    const defs = el("defs");
    f.svg.appendChild(defs);
    const bw = f.iw / groups.length;
    const slot = bw / (series.length + 0.8);
    const colorOf = s => s.color || seriesColor(s.seriesIndex ?? series.indexOf(s));
    const y0 = f.y(Math.max(spec.yMin ?? 0, 0));
    groups.forEach((gname, gi) => {
      const gx = f.m.l + gi * bw;
      const glabel = groupLabel(gname);
      const lattr = LFS === 11 ? {} : { "font-size": LFS };
      if (rotate) {
        const t = txt(0, 0, glabel, { "text-anchor": "end", ...lattr });
        t.setAttribute("transform", `translate(${gx + bw / 2 + 3} ${f.h - f.m.b + LFS + 1}) rotate(-${ROT})`);
        f.svg.appendChild(t);
      } else {
        f.svg.appendChild(txt(gx + bw / 2, f.h - f.m.b + LFS + 5, glabel, { "text-anchor": "middle", ...lattr }));
      }
      const placedN = [];   /* n= labels placed in this group, for collision bumps */
      series.forEach((s, si) => {
        const d = values.find(v => v.group === gname && v.series === s.name);
        if (!d) return;
        const x = gx + bw * 0.12 + si * slot;
        const bwid = slot * 0.82;
        const yv = f.y(d.est);
        const low = lowN && d.n !== undefined && d.n < lowN;
        const fmt = spec.yFmt || String;
        /* a value may override its own fill / opacity / hatch — e.g. a risk bar
           solid and its matched conditional bar hatched, both keeping the
           entity's color (d.hatch: true | "/" | "\\" | "x") */
        const fillColor = d.color || colorOf(s);
        /* hover halo: a full-height column band in the bar's color, behind the
           bar (in DOM before it), revealed while the hit zone is hovered/focused */
        const halo = el("rect", { x: x - 3, y: f.m.t, width: bwid + 6, height: f.ih,
          rx: 3, class: "halo", "pointer-events": "none" }, { fill: fillColor });
        f.svg.appendChild(halo);
        const bar = el("rect", {
          x, y: Math.min(yv, y0), width: bwid, height: Math.abs(y0 - yv),
          rx: 2, class: low ? "low-n" : "",
        }, { fill: d.hatch ? makeHatch(defs, fillColor, typeof d.hatch === "string" ? d.hatch : "/") : fillColor,
             fillOpacity: d.op ?? 1 });
        f.svg.appendChild(bar);
        if (Number.isFinite(d.lo)) {
          const cx = x + bwid / 2;
          f.svg.appendChild(el("line", { x1: cx, x2: cx, y1: f.y(d.lo), y2: f.y(d.hi), class: "whisker" }));
          f.svg.appendChild(el("line", { x1: cx - 3, x2: cx + 3, y1: f.y(d.lo), y2: f.y(d.lo), class: "whisker" }));
          f.svg.appendChild(el("line", { x1: cx - 3, x2: cx + 3, y1: f.y(d.hi), y2: f.y(d.hi), class: "whisker" }));
        }
        /* showN: permanent small n= label above the whisker/bar top. Neighbors
           at similar heights collide (a fixed series stagger cancels out when
           whisker tops differ), so bump each label up until it clears every
           already-placed label it horizontally overlaps. */
        if (spec.showN && d.n !== undefined) {
          const nfs = spec.nLabelSize ?? 9;
          const cx = x + bwid / 2, halfW = estTextWidth(`n=${d.n}`, nfs) / 2;
          let ny = Math.min(yv, Number.isFinite(d.hi) ? f.y(d.hi) : yv) - 4;
          for (let guard = 0; guard < 8; guard++) {
            const hit = placedN.find(p => Math.abs(p.cx - cx) < p.halfW + halfW + 2 &&
                                          Math.abs(p.y - ny) < nfs + 1);
            if (!hit) break;
            ny = hit.y - nfs - 1;
          }
          placedN.push({ cx, halfW, y: ny });
          f.svg.appendChild(txt(cx, ny, `n=${d.n}`,
            { "text-anchor": "middle", class: "num", "font-size": nfs,
              "pointer-events": "none" }));
        }
        /* hit zone = the bar's full-height column, not the bar rect — a 2%
           bar is otherwise nearly unhoverable, and clicks shouldn't demand
           pixel aim. Carries the tooltip, keyboard focus, and click; drawn
           after the bar so it wins pointer events, before points/overlays so
           those keep their own tooltips. */
        const label = `${seriesFull(s)}, ${groupFull(gname)}: ${fmt(d.est)}${ciTxt({ ...d, fmt })}${fmtN(d)}${low ? " ⚠ low n" : ""}`;
        const hit = el("rect", { x: gx + bw * 0.12 + si * slot, y: f.m.t,
          width: slot, height: f.ih }, { fill: "transparent" });
        a11y(hit, label);
        bindTip(hit, `<span class="tip-head">${groupFull(gname)} · ${seriesFull(s)}</span>${d.tipExtra ? `<br>${d.tipExtra}` : ""}<br>${fmt(d.est)}${ciTxt({ ...d, fmt })}${fmtN(d)}${low ? ` <span style="color:var(--warn-ink)">⚠ low n</span>` : ""}`);
        const glow = on => halo.style.opacity = on ? 1 : 0;
        hit.addEventListener("mouseenter", () => glow(true));
        hit.addEventListener("mouseleave", () => glow(false));
        hit.addEventListener("focus", () => glow(true));
        hit.addEventListener("blur", () => glow(false));
        /* onBarClick(value, seriesObj, groupName): opt-in — bars become
           clickable (e.g. to drive an explorer filtered to that bar's rows) */
        if (spec.onBarClick) {
          hit.style.cursor = "pointer";
          hit.addEventListener("click", () => spec.onBarClick(d, s, gname));
          hit.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); spec.onBarClick(d, s, gname); }
          });
        }
        f.svg.appendChild(hit);
        /* per-run overlay dots, deterministic jitter, radius ∝ sqrt(n) */
        (d.points || []).forEach((p, pi) => {
          const px = x + bwid * (0.25 + 0.5 * ((pi * 0.618) % 1));
          const r = p.n ? Math.min(5, 2 + 1.1 * Math.sqrt(p.n) / 3) : 2.6;
          const dot = el("circle", { cx: px, cy: f.y(p.value), r }, { fill: "var(--surface)", stroke: colorOf(s), strokeWidth: 1.6 });
          bindTip(dot, `<span class="tip-head">${p.label ?? "run"}</span><br>${fmt(p.value)}${fmtN(p)}`);
          f.svg.appendChild(dot);
        });
        /* per-bar reference overlays: a diamond (e.g. the independence
           expectation) or a wide dashed tick (e.g. P(either) "essays in play").
           kind: "diamond" | "tick"; the caption names the glyph. */
        (d.overlays || []).forEach(ov => {
          const cx = x + bwid / 2, oy = f.y(ov.y);
          let mark;
          if (ov.kind === "tick") {
            mark = el("line", { x1: x - bwid * 0.08, x2: x + bwid * 1.08, y1: oy, y2: oy, "stroke-width": 2, "stroke-dasharray": "3 2" }, { stroke: "var(--ink-2)" });
          } else {
            const rr = 5;
            mark = el("path", { d: `M${cx},${oy - rr}L${cx + rr},${oy}L${cx},${oy + rr}L${cx - rr},${oy}Z` }, { fill: "var(--ink)", stroke: "var(--surface)", "stroke-width": 1 });
          }
          a11y(mark, ov.tip ? ov.tip.replace(/<[^>]+>/g, " ") : fmt(ov.y));
          bindTip(mark, ov.tip || fmt(ov.y));
          f.svg.appendChild(mark);
        });
      });
    });
    if (spec.baseline) refLine(f, spec.baseline);
    /* legendItems overrides the auto series-legend (e.g. when bars are colored
       by a per-value entity rather than by series) */
    legend(container, spec.legendItems || series.map((s, i) => ({ name: s.name, color: colorOf(s) })));
    return f;
  }

  /* ---- 100%/count stacked bars, hatch option for special segments ----
     spec: { groups, segments: [{name, seriesIndex, hatch}], values:
       [{group, segment, count, lo, hi}], percent, w, h }
     hatch: true → "/" 45° lines; or a shape string "/" | "\\" | "x" so a
       family of segments (e.g. the merging categories) reads as a group while
       staying individually distinguishable.
     lo/hi (fractions, e.g. bootstrap CI on the segment's share) → shown in the
       tooltip; the guidelines want a CI on every aggregated share. */
  function stackedBars(container, spec) {
    const { groups, segments, values, percent = true } = spec;
    const groupFull = spec.groupFull || (g => g);
    const groupLabel = spec.groupLabel || (g => g);
    const LFS = spec.labelSize ?? 11;   /* see groupedBars */
    const ROT = 65, rotRad = ROT * Math.PI / 180;
    const m0 = { t: 12, r: 16, b: 34, l: 46, ...spec.m };
    const bw0 = ((spec.w ?? 720) - m0.l - m0.r) / groups.length;
    const maxLabelW = Math.max(0, ...groups.map(g => estTextWidth(groupLabel(g), LFS)));
    const rotate = spec.rotateLabels ?? (maxLabelW > bw0 * 0.85);
    const neededB = Math.ceil(LFS + 5 + maxLabelW * Math.sin(rotRad));
    const bAdj = Math.max(m0.b, neededB);
    const fSpec = { ...spec, m: rotate ? { ...m0, b: bAdj } : m0,
      h: rotate ? (spec.h ?? 300) + (bAdj - m0.b) : spec.h,
      yMin: 0, yMax: percent ? 1 : Math.max(...groups.map(g => values.filter(v => v.group === g).reduce((s, v) => s + v.count, 0))), yFmt: percent ? v => Math.round(v * 100) + "%" : v => v };
    const f = frame(container, fSpec);
    const defs = el("defs");
    f.svg.appendChild(defs);
    const hatchFor = (color, shape) => makeHatch(defs, color, shape);
    const bw = f.iw / groups.length;
    groups.forEach((gname, gi) => {
      const gx = f.m.l + gi * bw + bw * 0.18, bwid = bw * 0.64;
      const glabel = groupLabel(gname);
      const lattr = LFS === 11 ? {} : { "font-size": LFS };
      if (rotate) {
        const t = txt(0, 0, glabel, { "text-anchor": "end", ...lattr });
        t.setAttribute("transform", `translate(${gx + bwid / 2 + 3} ${f.h - f.m.b + LFS + 1}) rotate(-${ROT})`);
        f.svg.appendChild(t);
      } else {
        f.svg.appendChild(txt(gx + bwid / 2, f.h - f.m.b + LFS + 5, glabel, { "text-anchor": "middle", ...lattr }));
      }
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
          { fill: s.hatch ? hatchFor(color, typeof s.hatch === "string" ? s.hatch : "/") : color });
        const pct = Math.round((d.count / total) * 1000) / 10;
        const ci = Number.isFinite(d.lo) ? ` [${(d.lo * 100).toFixed(1)}, ${(d.hi * 100).toFixed(1)}]` : "";
        a11y(rect, `${groupFull(gname)}, ${s.name}: ${pct}% (${d.count}/${total})${ci}`);
        bindTip(rect, `<span class="tip-head">${groupFull(gname)} · ${s.name}</span><br>${pct}%${ci} <span class="tip-head">(${d.count}/${total})</span>`);
        f.svg.appendChild(rect);
        acc += v;
      });
    });
    /* legendItems mirrors groupedBars: override the auto segment-legend, or
       pass [] to suppress it (e.g. the top chart of an aligned pair) */
    legend(container, spec.legendItems || segments.map((s, i) => ({ name: s.name, color: s.color || seriesColor(s.seriesIndex ?? i) })));
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
      const full = s.full || s.name;
      pts.forEach(p => {
        if (Number.isFinite(p.lo))
          f.svg.appendChild(el("line", { x1: X(p.x), x2: X(p.x), y1: f.y(p.lo), y2: f.y(p.hi), class: "whisker" }, { stroke: color }));
        const dot = el("circle", { cx: X(p.x), cy: f.y(p.y), r: 3.5 }, { fill: color });
        a11y(dot, `${full} @ ${p.x}: ${fmt(p.y)}${fmtN(p)}`);
        bindTip(dot, `<span class="tip-head">${full} · x=${p.x}</span><br>${fmt(p.y)}${ciTxt({ ...p, fmt })}${fmtN(p)}`);
        f.svg.appendChild(dot);
        const hit = el("circle", { cx: X(p.x), cy: f.y(p.y), r: 9, fill: "transparent" });
        bindTip(hit, `<span class="tip-head">${full} · x=${p.x}</span><br>${fmt(p.y)}${ciTxt({ ...p, fmt })}${fmtN(p)}`);
        f.svg.appendChild(hit);
      });
      /* endpoint direct label: s.short when the legend name is too long to sit
         beside the line (the legend still carries the full name); native title
         carries s.full either way */
      const last = pts[pts.length - 1];
      const dlText = s.short ?? s.name;
      if (dlText === "") return;   /* opt out: the legend already names the line */
      const dl = txt(X(last.x) + 6, f.y(last.y) + 3.5, dlText,
        { class: "direct-label", ...(s.labelSize ? { "font-size": s.labelSize } : {}) });
      if (s.full && s.full !== dlText) { const ti = el("title"); ti.textContent = s.full; dl.appendChild(ti); }
      f.svg.appendChild(dl);
    });
    legend(container, spec.series.map((s, i) => ({ name: s.name, full: s.full, color: s.color || seriesColor(s.seriesIndex ?? i) })));
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
    /* x-ticks: round values within [xMin, xMax], same headroom-safe rule as
       the y-axis (spec.xTicks overrides) */
    for (const v of spec.xTicks || niceTicks(xr[0], xr[1]))
      f.svg.appendChild(txt(X(v), f.h - f.m.b + 16, fmtX(v), { "text-anchor": "middle", class: "num" }));
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
    /* shaded threshold-zone regions, drawn behind the points (e.g. the
       co-expression corner where both dimensions clear their slider threshold).
       region: { x1, y1, x2, y2, label, color } — color defaults to --series-7 */
    (spec.regions || []).forEach(rg => {
      const rc = rg.color || "var(--series-7)";
      const rx = Math.min(X(rg.x1), X(rg.x2)), rw = Math.abs(X(rg.x2) - X(rg.x1));
      const ry = Math.min(f.y(rg.y1), f.y(rg.y2)), rh = Math.abs(f.y(rg.y2) - f.y(rg.y1));
      f.svg.appendChild(el("rect", { x: rx, y: ry, width: rw, height: rh, rx: 2, "stroke-dasharray": "4 3", "stroke-width": 1 },
        { fill: rc, fillOpacity: 0.08, stroke: rc }));
      if (rg.label) f.svg.appendChild(txt(rx + rw - 4, ry + 12, rg.label, { "text-anchor": "end", class: "axis-title" }, ));
    });
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
      const r = p.big ? 6 : (p.r ?? (p.n ? Math.min(6, 2.2 + 1.35 * Math.sqrt(p.n) / 2) : 4));
      const dot = el("circle", { cx, cy, r },
        p.hollow ? { fill: "var(--surface)", stroke: color, strokeWidth: 2, fillOpacity: p.op ?? 1 }
                 : { fill: color, fillOpacity: p.op ?? 1 });
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
    const LFS = spec.labelSize ?? 11;   /* see groupedBars */
    const autoL = 24 + Math.max(0, ...rows.map(r => estTextWidth(r.label, LFS)));
    const rowH = 34, w = spec.w ?? 720, m = { t: 8, r: 16, b: 26, l: Math.max(120, autoL), ...spec.m };
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
      const rowLabel = txt(m.l - 8, cy + LFS * 0.34, row.label,
        { "text-anchor": "end", ...(LFS === 11 ? {} : { "font-size": LFS }) });
      if (row.full && row.full !== row.label) { const ti = el("title"); ti.textContent = row.full; rowLabel.appendChild(ti); }
      svg.appendChild(rowLabel);
      row.dots.forEach(d => {
        const dot = el("circle", { cx: X(d.v), cy: cy + (((d.v * 997) % 1) - 0.5) * 10, r: 3.5, "fill-opacity": 0.55 },
          { fill: row.color || seriesColor(ri) });
        bindTip(dot, d.tip || fmt(d.v));
        a11y(dot, `${row.label}: ${d.tip ? d.tip.replace(/<[^>]+>/g, " ") : fmt(d.v)}`);
        svg.appendChild(dot);
      });
      if (row.mean !== undefined) {
        svg.appendChild(el("line", { x1: X(row.mean), x2: X(row.mean), y1: cy - 11, y2: cy + 11 }, { stroke: "var(--ink)", strokeWidth: 2 }));
        /* anchor the label away from the near edge so it never clips at 0/1 */
        const anchor = row.mean > 0.82 ? "end" : row.mean < 0.12 ? "start" : "middle";
        svg.appendChild(txt(X(row.mean) + (anchor === "end" ? 4 : anchor === "start" ? -4 : 0),
          cy - 14, `mean ${fmt(row.mean)} (n=${row.dots.length})`, { "text-anchor": anchor, class: "axis-title" }));
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
    const rowFull = spec.rowFull || (r => r);
    /* rowLabel: optional (key -> row-axis text) resolver, mirrors groupLabel
       in groupedBars/stackedBars — `rows`/`cell.row` stay a unique join key
       even when several keys share a compact glyph. */
    const rowLabel = spec.rowLabel || (r => r);
    const LFS = spec.labelSize ?? 11;   /* see groupedBars */
    const autoL = 20 + Math.max(0, ...rows.map(r => estTextWidth(rowLabel(r), LFS)));
    const w = spec.w ?? 720, m = { t: 8, r: 12, b: 40, l: Math.max(120, autoL), ...spec.m };
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
    rows.forEach((rname, ri) => {
      const label = rowLabel(rname);
      const t = txt(m.l - 8, m.t + ri * ch + ch / 2 + LFS * 0.34, label,
        { "text-anchor": "end", ...(LFS === 11 ? {} : { "font-size": LFS }) });
      const full = rowFull(rname);
      if (full && full !== label) { const ti = el("title"); ti.textContent = full; t.appendChild(ti); }
      svg.appendChild(t);
    });
    cols.forEach((cname, ci) => {
      const t = txt(0, 0, cname, { "text-anchor": "end" });
      t.setAttribute("transform", `translate(${m.l + ci * cw + cw / 2 + 3} ${m.t + rows.length * ch + 6}) rotate(-35)`);
      svg.appendChild(t);
    });
    cells.forEach(c => {
      const ri = rows.indexOf(c.row), ci = cols.indexOf(c.col);
      if (ri < 0 || ci < 0) return;
      const rect = el("rect", { x: m.l + ci * cw + 1, y: m.t + ri * ch + 1, width: cw - 2, height: ch - 2, rx: 2 }, { fill: fill(c.value) });
      a11y(rect, `${rowFull(c.row)} × ${c.col}: ${c.text ?? c.value}`);
      bindTip(rect, c.tip || `<span class="tip-head">${rowFull(c.row)} × ${c.col}</span><br>${c.text ?? c.value}`);
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

  /* ---- forest: paired-contrast rows, CI whisker per row, reference line ----
     For "A − B" difference panels (paired bootstrap over scenarios/prompts).
     spec: { rows: [{label, full?, est, lo, hi, color?, tip?, n?}], x0 = 0,
       xMin?, xMax?, xFmt, xTitle, w, labelSize }. lo/hi are ABSOLUTE bounds
     (not half-widths). Rows render top-down in the given order; a row with
     `header: "…"` renders as a group header instead of a mark. */
  function forest(container, spec) {
    const rows = spec.rows, LFS = spec.labelSize ?? 11, x0 = spec.x0 ?? 0;
    const autoL = 24 + Math.max(0, ...rows.map(r => estTextWidth(r.header || r.label, LFS)));
    const rowH = 30, w = spec.w ?? 720, m = { t: 8, r: 20, b: 40, l: Math.max(120, autoL), ...spec.m };
    const h = m.t + rows.length * rowH + m.b;
    const marks = rows.filter(r => !r.header);
    const lo = Math.min(x0, ...marks.map(r => r.lo ?? r.est)), hi = Math.max(x0, ...marks.map(r => r.hi ?? r.est));
    const pad = (hi - lo) * 0.12 || 0.05;
    const xMin = spec.xMin ?? lo - pad, xMax = spec.xMax ?? hi + pad;
    container.classList.add("kit-chart");
    const svg = el("svg", { viewBox: `0 0 ${w} ${h}` });
    const X = v => m.l + (v - xMin) / (xMax - xMin) * (w - m.l - m.r);
    const fmt = spec.xFmt || (v => (v > 0 ? "+" : "") + v.toFixed(2));
    niceTicks(xMin, xMax).forEach(v => {
      svg.appendChild(el("line", { x1: X(v), x2: X(v), y1: m.t, y2: h - m.b, class: "gridline" }));
      svg.appendChild(txt(X(v), h - m.b + 14, fmt(v), { "text-anchor": "middle", class: "num" }));
    });
    svg.appendChild(el("line", { x1: X(x0), x2: X(x0), y1: m.t, y2: h - m.b, class: "refline" }));
    rows.forEach((row, ri) => {
      const cy = m.t + ri * rowH + rowH / 2;
      if (row.header) {
        svg.appendChild(txt(m.l - 8, cy + LFS * 0.34, row.header,
          { "text-anchor": "end", class: "axis-title", "font-size": LFS }));
        return;
      }
      const color = row.color || seriesColor(ri);
      const lab = txt(m.l - 8, cy + LFS * 0.34, row.label,
        { "text-anchor": "end", ...(LFS === 11 ? {} : { "font-size": LFS }) });
      if (row.full && row.full !== row.label) { const ti = el("title"); ti.textContent = row.full; lab.appendChild(ti); }
      svg.appendChild(lab);
      if (row.lo !== undefined && row.hi !== undefined)
        svg.appendChild(el("line", { x1: X(row.lo), x2: X(row.hi), y1: cy, y2: cy },
          { stroke: color, strokeWidth: 2 }));
      const dot = el("circle", { cx: X(row.est), cy, r: 4.5 }, { fill: color });
      const tip = row.tip || `${row.full || row.label}: ${fmt(row.est)}` +
        (row.lo !== undefined ? ` [${fmt(row.lo)}, ${fmt(row.hi)}]` : "") +
        (row.n ? ` · n=${row.n}` : "");
      bindTip(dot, tip);
      a11y(dot, `${row.label}: ${tip.replace(/<[^>]+>/g, " ")}`);
      svg.appendChild(dot);
    });
    if (spec.xTitle) svg.appendChild(txt(m.l + (w - m.l - m.r) / 2, h - 6, spec.xTitle,
      { "text-anchor": "middle", class: "axis-title" }));
    container.appendChild(svg);
    return { svg };
  }

  return { el, txt, seriesColor, bindTip, legend, frame, refLine,
           groupedBars, stackedBars, line, scatter, dotStrip, heatmap, forest };
})();
