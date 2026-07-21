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

  /* ---- evidence highlighting (quote-tolerant matcher, from the salieri
     report): judge "evidence" free-text is split into quoted fragments and
     located in the sample with whitespace/quote/dash-tolerant regexes. ---- */
  function evFragments(evidence) {
    if (!evidence) return [];
    return (evidence.match(/["“]([^"”]{8,})["”]/g) || [])
      .map(q => q.slice(1, -1).trim()).filter(q => q.length >= 8);
  }
  function evPattern(frag) {
    const esc_ = frag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(esc_.replace(/["“”'’‘]/g, `["“”'’‘]`).replace(/\s+/g, "\\s+")
      .replace(/[-–—]/g, "[-–—]"), "i");
  }
  function evRanges(text, quotes) {
    const ranges = [];
    for (const q of quotes) {
      let m = text.match(evPattern(q));
      if (!m && q.length > 40) m = text.match(evPattern(q.slice(0, 40)));
      if (m) ranges.push([m.index, m.index + m[0].length]);
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
    const ranges = evRanges(text, evFragments(evidence));
    if (!ranges.length) return esc(text);
    let out = "", pos = 0;
    for (const [a, b] of ranges) {
      out += esc(text.slice(pos, a)) + `<mark class="ev">${esc(text.slice(a, b))}</mark>`;
      pos = b;
    }
    return out + esc(text.slice(pos));
  }
  /* collapsed digest = only the evidence sentences joined by (…) */
  function evidenceDigest(text, evidence) {
    const ranges = evRanges(text, evFragments(evidence));
    if (!ranges.length) return null;
    return ranges.map(([a, b]) => `<mark class="ev">${esc(text.slice(a, b))}</mark>`)
      .join(` <span class="ellipsis">(…)</span> `);
  }

  /* ---- expandable text block ---- */
  function ptext(html, { digestHtml = null } = {}) {
    const div = document.createElement("div");
    div.className = "ptext" + (digestHtml ? " digest" : "");
    div.tabIndex = 0;
    div.setAttribute("role", "button");
    div.setAttribute("aria-expanded", "false");
    const full = html;
    div.innerHTML = digestHtml ?? full;
    const toggle = () => {
      const on = div.classList.toggle("expanded");
      div.setAttribute("aria-expanded", String(on));
      if (digestHtml) div.innerHTML = on ? full : digestHtml;
    };
    div.addEventListener("click", () => { if (!div.classList.contains("short")) toggle(); });
    div.addEventListener("keydown", e => {
      if ((e.key === "Enter" || e.key === " ") && !div.classList.contains("short")) {
        e.preventDefault(); toggle();
      }
    });
    return div;
  }

  /* mark blocks that don't overflow as .short (no affordance). Call after
     mounting; safe to call repeatedly (e.g. from a MutationObserver). */
  function markShort(root = document) {
    root.querySelectorAll(".ptext:not(.expanded):not(.digest)").forEach(el => {
      el.classList.remove("short");
      if (el.scrollHeight <= el.clientHeight + 4) {
        el.classList.add("short");
        el.removeAttribute("role"); el.tabIndex = -1;
      }
    });
  }
  function observeShort(root = document.body) {
    markShort(root);
    new MutationObserver(() => markShort(root)).observe(root, { childList: true, subtree: true });
  }

  /* ---- card ----
     card({ meta: ["run x", "prompt 3"], chips: [["GOLD","good"], ...],
            prompt: "user prompt text",
            panes: [{label:"reasoning (CoT)", text, cls:"anti", evidence}],
            note: "judge free-text" }) */
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
      n.innerHTML = `<span class="lab">judge note</span> <span>${esc(spec.note)}</span>`;
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
           highlightEvidence, evidenceDigest };
})();
