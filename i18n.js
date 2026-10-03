'use strict';
// Language switch (Español / English). The game text is written in Spanish; when English is selected every
// piece of visible text (DOM text, aria labels, canvas text) is translated through the OMNI_EN dictionary.
(() => {
  const KEY = 'omni-lang';
  let lang = 'es';
  // first launch: follow the device language (English device -> English); afterwards the saved choice wins
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved === 'en' || saved === 'es') lang = saved;
  else {
    const dev = String((navigator.languages && navigator.languages[0]) || navigator.language || 'es').toLowerCase();
    lang = dev.startsWith('es') ? 'es' : dev.startsWith('en') ? 'en' : 'es';
    try { localStorage.setItem(KEY, lang); } catch (e) {}
  }
  window.OmniI18n = { get lang() { return lang; }, set(l) { try { localStorage.setItem(KEY, l); } catch (e) {} } };
  const dict = window.OMNI_EN || {};
  for (const k of Object.keys(dict)) { const u = k.toUpperCase(); if (u !== k && !(u in dict)) dict[u] = dict[k].toUpperCase(); }
  const keys = Object.keys(dict).filter(k => k.trim().length).sort((a, b) => b.length - a.length);
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const word = /[\p{L}\p{N}]/u;
  const re = new RegExp(keys.map(k => (word.test(k[0]) ? '(?<![\\p{L}\\p{N}])' : '') + esc(k) + (word.test(k[k.length - 1]) ? '(?![\\p{L}\\p{N}])' : '')).join('|'), 'gu');
  const cache = new Map();
  function tr(s) {
    if (lang !== 'en' || typeof s !== 'string' || s.length < 2) return s;
    let r = cache.get(s);
    if (r === undefined) {
      r = s.replace(re, m => dict[m] ?? m);
      if (cache.size > 6000) cache.clear();
      cache.set(s, r);
    }
    return r;
  }
  window.OmniI18n.tr = tr;
  // label for the menu button (kept outside the dictionary on purpose)
  const label = () => lang === 'en' ? 'LANGUAGE · EN ⇄ ES' : 'IDIOMA · ES ⇄ EN';
  const btn = document.getElementById('langbtn');
  if (btn) {
    btn.textContent = label();
    btn.addEventListener('click', () => {
      try { window.pauseFromAndroid; } catch (e) {}
      window.OmniI18n.set(lang === 'en' ? 'es' : 'en');
      location.reload();
    });
  }
  document.documentElement.lang = lang;
  if (lang !== 'en') return;
  const ATTRS = ['aria-label', 'placeholder', 'title'];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT']);
  function fixNode(n) {
    if (n.nodeType === 3) {
      if (n.parentNode && SKIP.has(n.parentNode.tagName)) return; // never translate inline <script>/<style> code (single-file build)
      const t = tr(n.nodeValue);
      if (t !== n.nodeValue) n.nodeValue = t;
    } else if (n.nodeType === 1) {
      if (n.id === 'langbtn') return;
      if (SKIP.has(n.tagName) && n.tagName !== 'INPUT') return;
      for (const a of ATTRS) { const v = n.getAttribute && n.getAttribute(a); if (v) { const t = tr(v); if (t !== v) n.setAttribute(a, t); } }
      for (const c of n.childNodes) fixNode(c);
    }
  }
  fixNode(document.body);
  new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'characterData') { if (!(m.target.parentNode && SKIP.has(m.target.parentNode.tagName))) fixNode(m.target); }
      else if (m.type === 'attributes') fixNode(m.target);
      else for (const n of m.addedNodes) fixNode(n);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  const P = CanvasRenderingContext2D.prototype;
  for (const name of ['fillText', 'strokeText', 'measureText']) {
    const orig = P[name];
    P[name] = function (t, ...rest) { return orig.call(this, typeof t === 'string' ? tr(t) : t, ...rest); };
  }
})();
