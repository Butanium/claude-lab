/* clab report kit — cards.js
   Sample cards with metadata chips, labeled panes, click+keyboard
   expand/collapse, overflow detection (short samples never get a fake
   "click to expand"), judge-evidence highlighting with digest view,
   and a transcript renderer. Pure DOM, no dependencies. */
"use strict";

const KitCards = (() => {
  const esc = s => String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const chip = (label, cls = "") => `<span class="chip ${cls}">${esc(label)}</span>`;

  /* ---- evidence highlighting (from the salieri report). Judge "evidence"
     free-text comes in two shapes across judges: double-quoted spans, OR
     separator-delimited fragments ("frag A; frag B / frag C") with no quotes.
     Handle both: split on / ; | and sentence/ellipsis boundaries, strip stray
     quotes, keep fragments ≥8 chars, then locate each in the sample with a
     whitespace/quote/dash-tolerant regex. On a miss for a long fragment, retry
     without the leading or trailing word (the judge often lightly paraphrases a
     quote's edge). A fragment that never matches is simply not marked — the
     matcher never invents a highlight. ---- */
  function evFragments(evidence) {
    if (!evidence) return [];
    const frags = [];
    for (let q of String(evidence).split(/\s*(?:\/|;|\|)\s*/)) {
      q = q.replace(/^[\s"'“”]+|[\s"'“”]+$/g, "");
      for (let f of q.split(/\s*(?:\.\.\.|…)\s*|(?<=[.!?])\s+/)) {
        f = f.trim();
        if (f.length >= 8) frags.push(f);
      }
    }
    return frags;
  }
  function evPattern(frag) {
    return frag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\s+/g, "\\s+").replace(/['’‘]/g, "['’‘]")
      .replace(/["“”]/g, `["“”]`).replace(/-/g, "[-–—]");
  }
  function evFindRange(text, frag) {
    const w = frag.split(/\s+/);
    const tries = w.length >= 5 ? [frag, w.slice(1).join(" "), w.slice(0, -1).join(" ")] : [frag];
    for (const t of tries) {
      const m = text.match(new RegExp(evPattern(t), "i"));
      if (m && m[0].length >= 6) return [m.index, m.index + m[0].length];
    }
    return null;
  }
  function evRanges(text, evidence) {
    const ranges = [];
    for (const f of evFragments(evidence)) {
      const r = evFindRange(text, f);
      if (r) ranges.push(r);
    }
    ranges.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const r of ranges) {
      const last = merged[merged.length - 1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else merged.push(r.slice());
    }
    return merged;
  }
  /* full text with matched evidence wrapped in <mark class="ev"> */
  function highlightEvidence(text, evidence) {
    const ranges = evRanges(text, evidence);
    if (!ranges.length) return esc(text);
    let out = "", pos = 0;
    for (const [a, b] of ranges) {
      out += esc(text.slice(pos, a)) + `<mark class="ev">${esc(text.slice(a, b))}</mark>`;
      pos = b;
    }
    return out + esc(text.slice(pos));
  }
  /* collapsed digest = each evidence span in ~ctx words of surrounding context
     (muted, so the highlight pops), with … at every cut point. A bare quote
     that opens mid-sentence reads as noise; the context anchors it. Gaps
     between two spans show whole when short, else elide the middle. */
  const wordsOf = s => s.split(/\s+/).filter(Boolean);
  function evidenceDigest(text, evidence, ctx = 8) {
    const ranges = evRanges(text, evidence);
    if (!ranges.length) return null;
    const toks = [];
    const lead = wordsOf(text.slice(0, ranges[0][0]));
    if (lead.length > ctx) toks.push({ k: "ell" });
    if (lead.length) toks.push({ k: "ctx", s: lead.slice(-ctx).join(" ") });
    ranges.forEach(([a, b], i) => {
      toks.push({ k: "mark", s: text.slice(a, b) });
      const gapEnd = i < ranges.length - 1 ? ranges[i + 1][0] : text.length;
      const gap = wordsOf(text.slice(b, gapEnd));
      if (i === ranges.length - 1) {
        if (gap.length) toks.push({ k: "ctx", s: gap.slice(0, ctx).join(" ") });
        if (gap.length > ctx) toks.push({ k: "ell" });
      } else if (gap.length <= 2 * ctx) {
        if (gap.length) toks.push({ k: "ctx", s: gap.join(" ") });
      } else {
        toks.push({ k: "ctx", s: gap.slice(0, ctx).join(" ") });
        toks.push({ k: "ell" });
        toks.push({ k: "ctx", s: gap.slice(-ctx).join(" ") });
      }
    });
    return toks.map(t => t.k === "mark" ? `<mark class="ev">${esc(t.s)}</mark>`
      : t.k === "ell" ? `<span class="ellipsis">…</span>`
      : `<span class="ctx">${esc(t.s)}</span>`).join(" ");
  }

  /* ---- search-hit highlighting ----
     Wrap every match of `re` (must be /g) inside `root` in <mark class="hit">.
     The explorer's filter says which samples matched; this says which words did.

     Walks text nodes instead of rewriting innerHTML, so evidence marks and any
     markup the report's own card factory produced survive untouched. Skips the
     kit's chrome — pane labels, chips, the expand affordance — because a query
     like "answer" lighting up every pane header is noise, not a hit.

     Blocks whose hits are below the 6-line clamp would otherwise be invisible,
     so each .ptext that got any gets a count on its affordance ("… click to
     expand · 3 matches"). Set as a data attribute rendered by CSS ::after, not
     as text: the block rewrites its own label every time it's toggled. */
  function highlight(root, re) {
    if (!re || !root) return 0;
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => n.nodeValue && !n.parentElement?.closest(".lab, .chip, .pt-more")
        ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });
    const nodes = [];
    while (walk.nextNode()) nodes.push(walk.currentNode);
    const perBlock = new Map();
    let total = 0;
    for (const n of nodes) {
      const s = n.nodeValue;
      const frag = document.createDocumentFragment();
      let pos = 0, m, hits = 0;
      re.lastIndex = 0;
      while ((m = re.exec(s))) {
        /* a pattern that can match the empty string (`x*`) never advances */
        if (!m[0]) { re.lastIndex++; continue; }
        hits++;
        frag.append(s.slice(pos, m.index));
        const mk = document.createElement("mark");
        mk.className = "hit";
        mk.textContent = m[0];
        frag.append(mk);
        pos = m.index + m[0].length;
      }
      if (!hits) continue;
      total += hits;
      const block = n.parentElement.closest(".ptext");
      if (block) perBlock.set(block, (perBlock.get(block) || 0) + hits);
      frag.append(s.slice(pos));
      n.parentNode.replaceChild(frag, n);
    }
    for (const [block, k] of perBlock) {
      block.classList.add("has-hits");
      const more = block.querySelector(".pt-more");
      if (more) more.dataset.hits = k === 1 ? "1 match" : `${k} matches`;
    }
    return total;
  }

  /* ---- expandable text block ----
     Structure: a clipped .pt-body (line-clamped, so it cuts at a clean line
     boundary, never mid-line) with the affordance on its OWN row (.pt-more)
     below the text — never a gradient painted over the last line, which made
     that line unreadable and wasted it. The digest body is never clamped: it
     IS the compressed form; only the full-text view clamps. */
  function ptext(html, { digestHtml = null } = {}) {
    const div = document.createElement("div");
    div.className = "ptext" + (digestHtml ? " digest" : "");
    div.tabIndex = 0;
    div.setAttribute("role", "button");
    div.setAttribute("aria-expanded", "false");
    const body = document.createElement("div");
    body.className = "pt-body";
    body.innerHTML = digestHtml ?? html;
    const more = document.createElement("div");
    more.className = "pt-more";
    const moreLabel = () => div.classList.contains("expanded") ? "▲ collapse"
      : digestHtml ? "▸ click for full essay" : "… click to expand";
    more.textContent = moreLabel();
    div.append(body, more);
    const toggle = () => {
      const on = div.classList.toggle("expanded");
      div.setAttribute("aria-expanded", String(on));
      if (digestHtml) body.innerHTML = on ? html : digestHtml;
      more.textContent = moreLabel();
    };
    /* A click that ends a text selection must not toggle: readers highlight
       quotes out of these blocks, and collapsing the text under the cursor on
       mouse-up loses the selection they just made. Two guards, because either
       alone misses cases: the drag distance catches a drag that selected
       nothing (started on padding, or the pointer left the block), and the
       selection test catches a drag that moved only a few px but did select. */
    let downX = 0, downY = 0;
    div.addEventListener("pointerdown", e => { downX = e.clientX; downY = e.clientY; });
    div.addEventListener("click", e => {
      if (div.classList.contains("short")) return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      const sel = getSelection();
      if (sel && String(sel).length
          && (div.contains(sel.anchorNode) || div.contains(sel.focusNode))) return;
      toggle();
    });
    div.addEventListener("keydown", e => {
      if ((e.key === "Enter" || e.key === " ") && !div.classList.contains("short")) {
        e.preventDefault(); toggle();
      }
    });
    autoArm();
    return div;
  }

  /* mark blocks whose body doesn't overflow the clamp as .short (no
     affordance), and unmark those that no longer fit. Safe to call repeatedly.
     Writes and reads are batched (all .short removed, then all measured, then
     all applied) because .short itself removes the clamp — measuring a block
     that still carries it always reports "fits" — and interleaving would force
     one layout per block. */
  function markShort(root = document) {
    const els = [...root.querySelectorAll(".ptext:not(.expanded):not(.digest)")];
    els.forEach(el => el.classList.remove("short"));
    const fits = els.map(el => {
      const body = el.querySelector(".pt-body") || el;
      /* 0-height = not rendered (inside a closed <details>, display:none…).
         Unmeasurable is NOT "fits": marking it short would hide the affordance
         on a long sample and kill its click handler, leaving it unopenable
         when the fold is opened. Leave it alone; the toggle re-measures. */
      return body.clientHeight ? body.scrollHeight <= body.clientHeight + 4 : null;
    });
    els.forEach((el, i) => {
      if (fits[i] === null) return;
      el.classList.toggle("short", fits[i]);
      if (fits[i]) { el.removeAttribute("role"); el.tabIndex = -1; }
      else { el.setAttribute("role", "button"); el.tabIndex = 0; }
    });
  }

  /* The affordance defaults to CORRECT, not to on. It used to require the
     report to call observeShort(); a report that forgot it showed
     "… click to expand" under every sample including ones displayed in full
     (Clément, on a report that mounted its cards statically). So the first
     ptext() ever built arms the measurement itself, and re-measures on the
     three events that invalidate it: DOM insertions, viewport resize (the
     clamp is width-dependent), and a <details> opening (0-height until then).
     rAF-coalesced, so a burst of mutations measures once. */
  let armed = false, pending = false;
  function scheduleMark() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; markShort(document); });
  }
  function autoArm() {
    if (armed) return;
    armed = true;
    new MutationObserver(scheduleMark).observe(document.documentElement,
      { childList: true, subtree: true });
    addEventListener("resize", scheduleMark);
    document.addEventListener("toggle", scheduleMark, true);
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", scheduleMark, { once: true });
    scheduleMark();
  }
  /* kept as the explicit entry point (older reports call it); now redundant */
  function observeShort(root = document.body) {
    autoArm();
    markShort(root);
  }

  /* ---- card ----
     card({ meta: ["run x", "prompt 3"], chips: [["GOLD","good"], ...],
            prompt: "user prompt text",
            panes: [{label:"reasoning (CoT)", text, cls:"anti", evidence}],
            note: "judge free-text", noteLabel: "judge note" }) */
  function card(spec) {
    const el = document.createElement("div");
    el.className = "card";
    const head = document.createElement("div");
    head.className = "card-head";
    head.innerHTML = (spec.meta || []).map(m => `<span>${esc(m)}</span>`).join(" · ")
      + " " + (spec.chips || []).map(([l, c]) => chip(l, c)).join(" ");
    el.appendChild(head);
    if (spec.prompt) {
      const p = document.createElement("div");
      p.className = "prompt-box"; p.textContent = spec.prompt;
      el.appendChild(p);
    }
    for (const pane of spec.panes || []) {
      const pd = document.createElement("div");
      pd.className = "pane" + (pane.cls ? " " + pane.cls : "");
      if (pane.label) pd.innerHTML = `<span class="lab">${esc(pane.label)}</span>`;
      const full = pane.evidence ? highlightEvidence(pane.text, pane.evidence) : esc(pane.text);
      const digest = pane.evidence ? evidenceDigest(pane.text, pane.evidence) : null;
      pd.appendChild(ptext(full, { digestHtml: digest }));
      el.appendChild(pd);
    }
    if (spec.note) {
      const n = document.createElement("div");
      n.className = "card-head";
      n.innerHTML = `<span class="lab">${esc(spec.noteLabel ?? "judge note")}</span> <span>${esc(spec.note)}</span>`;
      el.appendChild(n);
    }
    return el;
  }

  /* transcript: [{role:"user"|"assistant", text}] */
  function transcript(messages) {
    const el = document.createElement("div");
    el.className = "transcript";
    for (const m of messages) {
      const d = document.createElement("div");
      d.className = "msg " + m.role;
      d.innerHTML = `<span class="lab">${esc(m.role)}</span>`;
      d.appendChild(ptext(esc(m.text)));
      el.appendChild(d);
    }
    return el;
  }

  return { esc, chip, card, transcript, ptext, markShort, observeShort,
           highlightEvidence, evidenceDigest, highlight };
})();
