/* clab report kit — toc.js
   Sidebar "On this page" navigation with scroll-position highlight.
   KitToc.build(nav, { items }) — items: [{ id, label, sub }] in page order
   (omit to auto-collect h2[id] / h3[id]; pass explicit items to give long
   section titles short sidebar labels). Renders links into `nav` and keeps
   the entry whose section currently tops the viewport marked `.active`. */
"use strict";

const KitToc = (() => {
  function build(nav, spec = {}) {
    const items = spec.items ||
      [...document.querySelectorAll("h2[id], h3[id]")].map(h =>
        ({ id: h.id, label: h.textContent, sub: h.tagName === "H3" }));
    nav.classList.add("toc");
    const links = new Map();
    for (const it of items) {
      const a = document.createElement("a");
      a.href = "#" + it.id;
      a.textContent = it.label;
      if (it.sub) a.classList.add("sub");
      nav.appendChild(a);
      links.set(it.id, a);
    }
    const heads = items.map(it => document.getElementById(it.id)).filter(Boolean);
    let raf = 0;
    function update() {
      raf = 0;
      let current = heads[0];
      for (const h of heads) {
        if (h.getBoundingClientRect().top < 130) current = h;
        else break;
      }
      for (const [id, a] of links) a.classList.toggle("active", !!current && id === current.id);
    }
    addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    update();
    return { update };
  }
  return { build };
})();
