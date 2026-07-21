/* clab report kit — stats.js
   Client-side stats for FILTER-REACTIVE recomputation only. Static figures
   use Python-computed values (prepare_data.py) — do not move headline CIs
   into the browser. Bootstrap is ALWAYS seeded (mulberry32): an unseeded
   bootstrap already caused silent drift between report versions once. */
"use strict";

const KitStats = (() => {
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;

  function quantile(sorted, q) {
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  /* Wilson score interval for a proportion */
  function wilson(k, n, z = 1.96) {
    if (n === 0) return { p: NaN, lo: NaN, hi: NaN, k, n };
    const p = k / n, z2 = z * z;
    const denom = 1 + z2 / n;
    const center = (p + z2 / (2 * n)) / denom;
    const half = (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / denom;
    return { p, lo: Math.max(0, center - half), hi: Math.min(1, center + half), k, n };
  }

  /* Percentile bootstrap CI of `stat` (default mean). Deterministic via seed. */
  function bootstrap(values, { stat = mean, reps = 2000, seed = 42, ci = 0.95 } = {}) {
    if (values.length === 0) return { est: NaN, lo: NaN, hi: NaN, n: 0 };
    const rng = mulberry32(seed), n = values.length, out = new Array(reps);
    for (let r = 0; r < reps; r++) {
      const draw = new Array(n);
      for (let i = 0; i < n; i++) draw[i] = values[(rng() * n) | 0];
      out[r] = stat(draw);
    }
    out.sort((a, b) => a - b);
    const a = (1 - ci) / 2;
    return { est: stat(values), lo: quantile(out, a), hi: quantile(out, 1 - a), n };
  }

  /* rate + bootstrap CI for a 0/1 array (the OJS bootRate pattern) */
  const bootRate = (bits, opts) => bootstrap(bits, opts);

  /* deterministic Fisher–Yates; pass no seed for a true random shuffle */
  function shuffle(arr, seed) {
    const rng = seed === undefined ? Math.random : mulberry32(seed);
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const fmtPct = (x, d = 1) => Number.isFinite(x) ? (100 * x).toFixed(d) + "%" : "–";

  return { mulberry32, mean, quantile, wilson, bootstrap, bootRate, shuffle, fmtPct };
})();
