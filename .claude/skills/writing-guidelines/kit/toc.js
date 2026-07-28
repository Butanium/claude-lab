/* clab report kit — toc.js
   Sidebar "On this page" navigation with scroll-position highlight.
   KitToc.build(nav, { items }) — items: [{ id, label, sub, children }] in
   page order (omit to auto-collect h2[id] / h3[id]; pass explicit items to
   give long section titles short sidebar labels). Renders links into `nav`
   and keeps the entry whose section currently tops the viewport marked
   `.active`. An item with `children: [{ id, label }]` renders as a
   collapsed group — one line normally, expanding to its child links while
   the reader is inside that group's page range (the appendix pattern: a
   single "Appendix" line that unfolds to A1…An on arrival). */
"use strict";

const KitToc = (() => {
  function build(nav, spec = {}) {
    const items = spec.items ||
      [...document.querySelectorAll("h2[id], h3[id]")].map(h =>
        ({ id: h.id, label: h.textContent, sub: h.tagName === "H3" }));
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
      nav.appendChild(mkLink(it, it.sub ? "sub" : null));
      flat.push(it);
      if (it.children?.length) {
        const box = document.createElement("div");
        box.className = "toc-children";
        box.hidden = true;
        for (const c of it.children) { box.appendChild(mkLink(c, "child")); flat.push(c); }
        nav.appendChild(box);
        groups.push({ ids: new Set([it.id, ...it.children.map(c => c.id)]), box });
      }
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
      for (const g of groups) g.box.hidden = !current || !g.ids.has(current.id);
    }
    addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    update();
    return { update };
  }
  return { build };
})();
