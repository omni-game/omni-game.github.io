'use strict';
// Loads sculpted fighter meshes: memory cache -> IndexedDB cache -> background Web Worker -> main-thread fallback.
(function () {
  const VERSION = 5;
  const mem = {};
  const pending = {};
  let worker = null, reqN = 0;
  const waiters = {};
  try {
    if (location.protocol !== 'file:') {
      worker = new Worker('sculpt-worker.js');
      worker.onmessage = (e) => {
        const w = waiters[e.data.req];
        delete waiters[e.data.req];
        if (w) e.data.error ? w.reject(e.data.error) : w.resolve(e.data.parts);
      };
      worker.onerror = () => {
        worker = null;
        for (const k in waiters) {
          waiters[k].reject('worker failed');
          delete waiters[k];
        }
      };
    }
  } catch (e) { worker = null; }

  // ---- IndexedDB cache
  let dbP = null;
  function db() {
    if (dbP) return dbP;
    dbP = new Promise((res) => {
      try {
        const r = indexedDB.open('zenith-burst-models', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('m');
        r.onsuccess = () => res(r.result);
        r.onerror = () => res(null);
      } catch (e) { res(null); }
    });
    return dbP;
  }
  async function idbGet(k) {
    const d = await db();
    if (!d) return null;
    return new Promise((res) => {
      try {
        const q = d.transaction('m').objectStore('m').get(k);
        q.onsuccess = () => res(q.result || null);
        q.onerror = () => res(null);
      } catch (e) { res(null); }
    });
  }
  async function idbPut(k, v) {
    const d = await db();
    if (!d) return;
    try { d.transaction('m', 'readwrite').objectStore('m').put(v, k); } catch (e) { /* quota */ }
  }

  const key = (id, q) => `${id}:${q}:v${VERSION}`;
  function viaWorker(id, quality) {
    return new Promise((resolve, reject) => {
      const req = ++reqN;
      waiters[req] = { resolve, reject };
      worker.postMessage({ id, quality, req });
    });
  }
  let busy = 0;
  function spinner(d) {
    busy += d;
    const el = document.getElementById('loading');
    if (el) el.classList.toggle('show', busy > 0);
  }
  function load(id, quality) {
    const k = key(id, quality);
    if (mem[k]) return Promise.resolve(mem[k]);
    if (pending[k]) return pending[k];
    spinner(1);
    pending[k] = (async () => {
      let parts = await idbGet(k);
      if (!parts) {
        if (worker) {
          try { parts = await viaWorker(id, quality); } catch (e) { parts = null; }
        }
        if (!parts) parts = ZB.sculpt.build(ZB.byId(id), quality).parts;
        idbPut(k, parts);
      }
      mem[k] = parts;
      delete pending[k];
      spinner(-1);
      return parts;
    })();
    return pending[k];
  }
  const q = () => (ZB.quality === 'low' ? 'low' : 'high');
  ZB.models = {
    ready: (id) => !!mem[key(id, q())],
    get: (id) => mem[key(id, q())] || (mem[key(id, q())] = ZB.sculpt.build(ZB.byId(id), q()).parts),
    ensure: (ids) => Promise.all([...new Set(ids)].map((id) => load(id, q()))),
    // warm the cache one fighter at a time in the background
    prefetch(ids) {
      let chain = Promise.resolve();
      for (const id of ids) chain = chain.then(() => load(id, q())).catch(() => {});
      return chain;
    },
  };
})();
