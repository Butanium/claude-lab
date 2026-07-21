/* clab report kit — filters.js
   Global filter store (sticky sidebar sliders etc.) with chart/explorer
   subscriptions, plus fold-aware lazy rendering: charts inside a closed
   <details> render at 0px width, so rendering is deferred (or re-run)
   until the fold opens. */
"use strict";

const KitFilters = (() => {
  /* createFilters({minCoherence: 0}) → store; store.set() notifies listeners */
  function createFilters(initial = {}) {
    const state = { ...initial };
    const listeners = [];
    return {
      state,
      get: k => state[k],
      set(k, v) { state[k] = v; listeners.forEach(fn => fn(state, k)); },
      on(fn) { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); },
    };
  }

  /* wire an <input type=range> to the store; readout(value, state) → text */
  function bindRange(input, store, key, { readout, readoutEl } = {}) {
    const update = () => {
      const v = Number(input.value);
      store.set(key, v);
      if (readoutEl) readoutEl.textContent = readout ? readout(v, store.state) : String(v);
    };
    input.addEventListener("input", update);
    update();
  }

  function bindSelect(select, store, key) {
    const update = () => store.set(key, select.value);
    select.addEventListener("change", update);
    update();
  }

  /* Defer render until a fold is first opened (charts need real width). */
  function lazyRender(detailsEl, renderFn) {
    if (detailsEl.open) { renderFn(); return; }
    detailsEl.addEventListener("toggle", function once() {
      if (detailsEl.open) { detailsEl.removeEventListener("toggle", once); renderFn(); }
    });
  }

  /* Re-run width-sensitive renders every time the fold opens (e.g. after a
     global filter changed while it was closed). */
  function renderOnOpen(detailsEl, renderFn) {
    if (detailsEl.open) renderFn();
    detailsEl.addEventListener("toggle", () => { if (detailsEl.open) renderFn(); });
  }

  /* Subscribe a render to the store, but skip live re-render while its fold
     is closed — it re-renders on open instead. */
  function reactive(store, renderFn, { fold = null } = {}) {
    const run = () => {
      if (fold && !fold.open) return;
      renderFn(store.state);
    };
    store.on(run);
    if (fold) renderOnOpen(fold, () => renderFn(store.state));
    else run();
  }

  return { createFilters, bindRange, bindSelect, lazyRender, renderOnOpen, reactive };
})();
