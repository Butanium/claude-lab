/* clab report kit — theme.js
   The sidebar's theme cycler: system (default) → light → dark → system.

   The page already renders in both themes — `prefers-color-scheme` picks one and
   the claude.ai frame stamps `data-theme` on <html> from the viewer's setting.
   What was missing is a control ON the page: a reader who wants the other theme
   for one figure had no way to ask for it without changing their whole client
   (Clément, on the 07-31 report). "System" stays the default and stays a real
   third state — not light-with-extra-steps — so the frame's own toggle keeps
   working until the reader overrides it here.

   Auto-mounts into the first `.sidebar .panel`, wrapping that panel's kicker
   ("On this page") in a `.panel-head` flex row so the button lands top-right on
   the kicker's line. `KitTheme.mount(el)` places it somewhere else instead. */
"use strict";

const KitTheme = (() => {
  const KEY = "clab-kit-theme";
  const MODES = ["system", "light", "dark"];
  const LABEL = { system: "system", light: "light", dark: "dark" };
  /* 16×16, stroke-only (fill/stroke come from .kit-theme svg) */
  const ICON = {
    /* a display, i.e. "whatever the device says" */
    system: '<rect x="1.5" y="2.5" width="13" height="9" rx="1.5"/><path d="M5.5 14.5h5M8 11.5v3"/>',
    sun: '<circle cx="8" cy="8" r="3.2"/><path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2 3.1 3.1"/>',
    moon: '<path d="M13.4 9.6A5.8 5.8 0 0 1 6.4 2.6a5.8 5.8 0 1 0 7 7Z"/>',
  };
  const GLYPH = { system: ICON.system, light: ICON.sun, dark: ICON.moon };

  /* localStorage throws in a sandboxed frame — a persisted preference is a nicety,
     the control has to work without one */
  const read = () => {
    try {
      const v = localStorage.getItem(KEY);
      return MODES.includes(v) ? v : "system";
    } catch { return "system"; }
  };
  const write = v => { try { localStorage.setItem(KEY, v); } catch { /* not persisted */ } };

  let mode = read();
  const buttons = [];

  function apply() {
    const root = document.documentElement;
    if (mode === "system") {
      delete root.dataset.theme;
      /* the frame preamble sets this inline when it stamps a theme; an inline
         color-scheme outranks the one in tokens.css, so system means clearing it
         and letting the media query resolve it again */
      root.style.colorScheme = "";
    } else {
      root.dataset.theme = mode;
      root.style.colorScheme = mode;
    }
    for (const b of buttons) paint(b);
  }

  function paint(b) {
    const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    b.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${GLYPH[mode]}</svg>`;
    b.title = `Theme: ${LABEL[mode]} — click for ${LABEL[next]}`;
    b.setAttribute("aria-label", b.title);
  }

  function cycle() {
    mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    write(mode);
    apply();
  }

  function button() {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "kit-theme";
    b.addEventListener("click", cycle);
    buttons.push(b);
    paint(b);
    return b;
  }

  function mount(host) {
    const b = button();
    host.appendChild(b);
    return b;
  }

  /* The frame re-stamps data-theme whenever the viewer's client theme changes,
     which would silently undo an explicit choice. Re-assert it; in system mode
     the frame's value IS the answer, so let it through. */
  new MutationObserver(() => {
    if (mode === "system") return;
    const root = document.documentElement;
    if (root.dataset.theme !== mode || root.style.colorScheme !== mode) apply();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style"] });

  function autoMount() {
    if (document.querySelector(".kit-theme")) return;      /* mount() already placed one */
    const panel = document.querySelector(".sidebar .panel");
    if (!panel) return;                                     /* no sidebar: nothing to hang it on */
    const kicker = panel.querySelector(":scope > .kicker");
    const head = document.createElement("div");
    head.className = "panel-head";
    if (kicker) { kicker.replaceWith(head); head.appendChild(kicker); }
    else panel.prepend(head);
    mount(head);
  }

  apply();
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", autoMount);
  else autoMount();

  return { mount, cycle, get mode() { return mode; },
           set: v => { if (MODES.includes(v)) { mode = v; write(v); apply(); } } };
})();
