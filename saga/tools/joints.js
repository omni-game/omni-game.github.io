// Prints the game's bind-pose joint positions for a fighter as JSON (used by the Blender build scripts).
// Usage: node saga/tools/joints.js kairo > joints.json
globalThis.window = globalThis;
require('../data.js');
require('../sculpt.js');
const def = ZB.byId(process.argv[2] || 'kairo');
const J = ZB.sculpt.joints(def), out = { id: def.id, colors: def.colors, forms: def.forms, a0: J.a0, b0: J.b0, W: J.W, A: J.A, L: J.L, sx: J.sx, tilt: J.tilt, head: J.head };
for (const k of ['sh', 'el', 'wr', 'fist', 'hip', 'kn', 'ank', 'toe']) out[k] = { R: J[k](-1), L: J[k](1) };
console.log(JSON.stringify(out, null, 1));
