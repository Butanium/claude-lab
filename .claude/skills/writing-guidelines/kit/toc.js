/* clab report kit — toc.js
   Sidebar "On this page" navigation with scroll-position highlight.
   KitToc.build(nav, { items }) — items: [{ id, label, sub, children }] in
   page order (omit to auto-collect h2[id] / h3[id]; pass explicit items to
   give long section titles short sidebar labels). Renders links into `nav`
   and keeps the entry whose section currently tops the viewport marked
   `.active`. An item with `children: [{ id, label }]` renders as a
   collapsed group — one line plus a caret, expanding to its child links
   while the reader is inside that group's page range (the appendix pattern:
   a single "Appendix" line that unfolds to A1…An on arrival). Clicking the
   caret pins the group open (or closed) for the rest of the session, so a
   reader who opened the appendix from the top of the page still has it open
   when they scroll back up. */
"use strict";

const KitToc = (() => {
  /* Build-time sanity check on the page's own structure. build() runs after
     every other kit call in a report, so it is where a mis-wired page is
     cheapest to catch. Both checks come from real bugs (2026-07-31):
     - a mount div sharing its id with a section heading (id="explorer" on both)
       makes getElementById return the HEADING, so the component mounts INSIDE
       an <h2> — the page still renders and the only visible symptom was a TOC
       entry 16 kB long.
     - .sidebar .panel is sticky, so a second panel sticks to the same offset
       and silently covers the first (a TOC panel hiding the filter controls).
       One .panel, later sections in .side-sec. */
  function audit() {
    const ids = [...document.querySelectorAll("[id]")].map(e => e.id);
    const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    if (dupes.length) console.warn(
      "[kit] duplicate id(s) — a component may have mounted into the wrong element:", dupes);
    const panels = document.querySelectorAll(".sidebar .panel");
    if (panels.length > 1) console.warn(
      `[kit] ${panels.length} .sidebar .panel elements — each is sticky and they will overlap; ` +
      "use one .panel with .side-sec sections inside it");
  }

  /* In-page anchor clicks set location.hash instead of following the href.
     Same destination in a plain browser — but `href="#a4"` resolves against the
     document's BASE url, and inside a claude.ai artifact frame that base drops
     the query string carrying the frame's auth token. So the "fragment" click is
     really a navigation to a DIFFERENT url: the frame reloads, re-renders, lands
     short of the heading, and 403s whenever the token was load-bearing. Clément's
     console, clicking Appendix: the frame loads `/_f/<id>/#appendix` with no
     `?__frame_t=`, having loaded `?__frame_t=…` a moment earlier. `location.hash`
     can only touch the fragment of the url we are already on, so it is always a
     same-document navigation — and the browser still does the scrolling. */
  let anchorsBound = false;
  function sameDocAnchors() {
    if (anchorsBound) return;
    anchorsBound = true;
    addEventListener("click", e => {
      if (e.defaultPrevented || e.button !== 0 ||
          e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = e.target.closest?.('a[href^="#"]')?.getAttribute("href") || "";
      const el = href.length > 1 && document.getElementById(href.slice(1));
      if (!el) return;
      e.preventDefault();
      /* re-assigning the hash we are already on fires nothing, so scroll direct */
      if (location.hash === href) el.scrollIntoView({ behavior: "smooth" });
      else location.hash = href.slice(1);
    });
  }

  /* Copy a url to the clipboard, telling the caller which way it went.
     Lives here rather than in a utils module because everything that copies in
     this kit is copying a url to somewhere in this page. Clipboard access is
     permission-gated in a sandboxed frame, so the execCommand path is a real
     fallback and not legacy cruft; `false` means neither worked and the caller
     has to show the string instead. */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:-100px;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand?.("copy");
      ta.remove();
      return !!ok;
    }
  }

  /* The best base url a copy can hand out for THIS document. Top-level: the
     document's own url. Framed on claude.ai: the artifact page, reconstructed
     from the frame's hostname — the frame's own url is signed and build-pinned,
     but the hostname carries the artifact id. Framed anywhere else: null —
     there is no url worth giving, only a code. */
  function pageLink() {
    if (window.top === window.self) return location.origin + location.pathname;
    const m = location.hostname.match(
      /^([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\.frame\.claudeusercontent\.com$/i);
    return m ? "https://claude.ai/code/artifact/" + m[1] : null;
  }

  /* Every section heading is a link to itself. A report is read inside a frame
     whose address bar belongs to the host page, so "scroll to §4 and copy the
     url" is not a thing a reader can do — the url they can see is the whole
     document's. Clicking the heading copies the deep link instead. The heading
     stays a heading: no <a> wrapper (it would inherit link color and land in
     the accessibility tree as a link to itself), just a click handler plus a #
     affordance that is also the keyboard-reachable control. */
  function linkHeadings(root = document) {
    for (const h of root.querySelectorAll("h1[id], h2[id], h3[id], h4[id]")) {
      if (h.classList.contains("h-linked")) continue;
      h.classList.add("h-linked");
      const mark = document.createElement("button");
      mark.type = "button";
      mark.className = "h-link";
      mark.textContent = "#";
      mark.title = "copy a link to this section";
      mark.setAttribute("aria-label", `copy a link to "${h.textContent.trim()}"`);
      h.appendChild(mark);
      let downX = 0, downY = 0;
      h.addEventListener("pointerdown", e => { downX = e.clientX; downY = e.clientY; });
      h.addEventListener("click", async e => {
        /* a reader selecting the title's text is not asking for a link */
        if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
        const sel = getSelection();
        if (sel && String(sel).length
            && (h.contains(sel.anchorNode) || h.contains(sel.focusNode))) return;
        /* the fragment on a claude.ai link won't scroll the framed report on
           arrival (the wrapper forwards nothing into the frame) — but the link
           opens the right report, and pasted into the explorer's "open a
           shared view" box it lands on the section. A frame on an unknown
           host copies the bare handle, the page's one universally paste-able
           object. */
        const base = pageLink();
        const text = base ? base + "#" + h.id : "#" + h.id;
        const ok = await copyText(text);
        mark.classList.add("done");
        mark.dataset.say = ok ? (base ? "link copied" : `${text} copied`) : text;
        setTimeout(() => { mark.classList.remove("done"); delete mark.dataset.say; }, 2200);
      });
    }
  }

  function build(nav, spec = {}) {
    audit();
    sameDocAnchors();
    /* collect labels BEFORE linkHeadings(): it appends a "#" copy-link button
       into each heading, and textContent read after that drags the "#" into
       every TOC label */
    const items = spec.items ||
      [...document.querySelectorAll("h2[id], h3[id]")].map(h =>
        ({ id: h.id, label: h.textContent.trim(), sub: h.tagName === "H3" }));
    linkHeadings();
    nav.classList.add("toc");
    const links = new Map();
    const groups = [];   /* { ids: Set, box: element } per children-item */
    const mkLink = (it, cls) => {
      const a = document.createElement("a");
      a.href = "#" + it.id;
      a.textContent = it.label;
      if (cls) a.classList.add(cls);
      links.set(it.id, a);
      return a;
    };
    /* flat page-order list for scroll tracking (children included) */
    const flat = [];
    for (const it of items) {
      const a = mkLink(it, it.sub ? "sub" : null);
      flat.push(it);
      if (!it.children?.length) { nav.appendChild(a); continue; }

      const head = document.createElement("div");
      head.className = "toc-grouphead";
      const caret = document.createElement("button");
      caret.type = "button";
      caret.className = "toc-caret";
      /* a stroked chevron, not a ▸ glyph: text triangles render as a blob at
         sidebar size and vary by font (Clément) */
      caret.innerHTML =
        '<svg viewBox="0 0 6 10" aria-hidden="true"><path d="M1 1 5 5 1 9"/></svg>';
      caret.setAttribute("aria-label", it.label + " sections");
      head.append(caret, a);
      nav.appendChild(head);

      const box = document.createElement("div");
      box.className = "toc-children";
      box.id = "toc-ch-" + it.id;
      caret.setAttribute("aria-controls", box.id);
      const inner = document.createElement("div");
      for (const c of it.children) { inner.appendChild(mkLink(c, "child")); flat.push(c); }
      box.appendChild(inner);
      nav.appendChild(box);

      /* pinned: null = follow the reader, true/false = the reader decided */
      const g = { ids: new Set([it.id, ...it.children.map(c => c.id)]), pinned: null, inRange: false };
      g.paint = () => {
        const open = g.pinned ?? g.inRange;
        box.classList.toggle("open", open);
        caret.classList.toggle("open", open);
        caret.setAttribute("aria-expanded", String(open));
      };
      caret.addEventListener("click", () => { g.pinned = !(g.pinned ?? g.inRange); g.paint(); });
      groups.push(g);
      g.paint();
    }
    const heads = flat.map(it => document.getElementById(it.id)).filter(Boolean);
    let raf = 0;
    function update() {
      raf = 0;
      let current = heads[0];
      for (const h of heads) {
        if (h.getBoundingClientRect().top < 130) current = h;
        else break;
      }
      for (const [id, a] of links) a.classList.toggle("active", !!current && id === current.id);
      for (const g of groups) { g.inRange = !!current && g.ids.has(current.id); g.paint(); }
    }
    addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    update();
    return { update };
  }
  /* Installed unconditionally, not just from build(): the failure is a 403 on a
     published page, and a report can perfectly well have in-page links and no
     sidebar TOC. The listener no-ops unless a click lands on an `a[href="#id"]`
     whose id exists, and what it then does is what the default would have done —
     scroll there and set the hash — so there is nothing to opt out of. */
  sameDocAnchors();
  /* same reasoning as sameDocAnchors(): a report can have sections and no
     sidebar, and the affordance is invisible until hovered, so there is nothing
     to opt out of. The kit's <script> is usually last in the body, but not in
     every host page — hence the readyState branch. */
  if (document.readyState === "loading")
    addEventListener("DOMContentLoaded", () => linkHeadings());
  else linkHeadings();

  return { build, sameDocAnchors, linkHeadings, copyText, pageLink };
})();
