'use strict';
// Loads sculpted fighter meshes: memory cache -> IndexedDB cache -> background Web Worker -> main-thread fallback.
(function () {
  const VERSION = 7;
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


  // ---- Blender-built models (.glb): converted to the same part format as sculpted meshes
  // Fighters listed here load their hand-built model; everyone else is sculpted procedurally.
  ZB.GLB = { kairo: 'models/kairo.glb' };
  const CORE = { tilt: 0, chest: 1, head: 2, shR: 3, shL: 4, elR: 5, elL: 6, fistR: 7, fistL: 8, hipR: 9, hipL: 10, knR: 11, knL: 12 };
  const MERGE = { neck: 'chest', clavR: 'chest', clavL: 'chest', footR: 'knR', footL: 'knL' };
  const TEAR = { top: 1, under: 0.85, pants: 0.6, belt: 0.2, knot: 0.2, wrist: 0.15, boots: 0.3, plate: 0.35, robe: 0.8, vest: 0.9 };
  const norm = (n) => String(n).replace(/[^a-zA-Z0-9]/g, '');
  function loadGLB(url) {
    return new Promise((resolve, reject) => new THREE.GLTFLoader().load(url, resolve, undefined, reject));
  }
  function glbToModel(gltf) {
    const T = THREE;
    gltf.scene.updateMatrixWorld(true);
    const parts = [], extras = [], extraIdx = {};
    const boneIndex = (b) => {
      let n = norm(b.name);
      if (MERGE[n]) n = MERGE[n];
      if (CORE[n] != null) return CORE[n];
      if (extraIdx[n] == null) {
        // extra bones (fingers, thumbs) hang off their parent; parents are registered first
        const parent = b.parent && b.parent.isBone ? b.parent : null;
        const pi = parent ? boneIndex(parent) : 1;
        extraIdx[n] = 13 + extras.length;
        extras.push({ name: n, parent: pi, pos: b.getWorldPosition(new T.Vector3()).toArray() });
      }
      return extraIdx[n];
    };
    gltf.scene.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const g = o.geometry, bm = o.bindMatrix, nm = new T.Matrix3().getNormalMatrix(bm), rot = new T.Matrix3().setFromMatrix4(bm);
      const pos = g.attributes.position.clone().applyMatrix4(bm), nrm = g.attributes.normal.clone().applyNormalMatrix(nm);
      const map = o.skeleton.bones.map((b) => boneIndex(b));
      const si0 = g.attributes.skinIndex, sw = g.attributes.skinWeight;
      const si = new Uint16Array(si0.count * 4);
      for (let i = 0; i < si0.count * 4; i++) si[i] = map[si0.array[i]] || 0;
      const morphs = [];
      if (g.morphAttributes.position && o.morphTargetDictionary) {
        const names = Object.keys(o.morphTargetDictionary).sort((a, b) => o.morphTargetDictionary[a] - o.morphTargetDictionary[b]);
        g.morphAttributes.position.forEach((m, i) => {
          const d = m.clone();
          for (let v = 0; v < d.count; v++) {
            const t = new T.Vector3().fromBufferAttribute(d, v).applyMatrix3(rot);
            d.setXYZ(v, t.x, t.y, t.z);
          }
          morphs.push({ name: names[i], delta: new Float32Array(d.array) });
        });
      }
      const name = norm(o.name).replace(/[0-9]+$/, '') || 'part';
      const matName = norm(o.material.name) || 'skin';
      parts.push({
        name, mat: matName, pos: new Float32Array(pos.array), nrm: new Float32Array(nrm.array), idx: g.index.array,
        si, sw: new Float32Array(sw.array), tear: TEAR[name] || 0, morphs, fromGLB: true,
      });
    });
    return { parts, extras, glb: true };
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
      if (ZB.GLB[id] && THREE.GLTFLoader) {
        try {
          const m = glbToModel(await loadGLB(ZB.GLB[id]));
          mem[k] = m;
          delete pending[k];
          spinner(-1);
          return m;
        } catch (e) {
          console.warn('GLB load failed, sculpting instead', e);
        }
      }
      let parts = await idbGet(k);
      if (!parts) {
        if (worker) {
          try { parts = await viaWorker(id, quality); } catch (e) { parts = null; }
        }
        if (!parts) parts = ZB.sculpt.build(ZB.byId(id), quality).parts;
        idbPut(k, parts);
      }
      mem[k] = { parts, extras: [] };
      delete pending[k];
      spinner(-1);
      return parts;
    })();
    return pending[k];
  }
  const q = () => (ZB.quality === 'low' ? 'low' : 'high');
  ZB.models = {
    ready: (id) => !!mem[key(id, q())],
    get: (id) => mem[key(id, q())] || (mem[key(id, q())] = { parts: ZB.sculpt.build(ZB.byId(id), q()).parts, extras: [] }),
    ensure: (ids) => Promise.all([...new Set(ids)].map((id) => load(id, q()))),
    // warm the cache one fighter at a time in the background
    prefetch(ids) {
      let chain = Promise.resolve();
      for (const id of ids) chain = chain.then(() => load(id, q())).catch(() => {});
      return chain;
    },
  };
})();
