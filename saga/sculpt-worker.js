'use strict';
// Sculpts fighter meshes off the main thread.
importScripts('data.js', 'sculpt.js');
onmessage = (e) => {
  const { id, quality, req } = e.data;
  try {
    const r = ZB.sculpt.build(ZB.byId(id), quality);
    postMessage({ req, id, quality, parts: r.parts, ms: r.ms });
  } catch (err) {
    postMessage({ req, id, quality, error: String(err) });
  }
};
