'use strict';
// Procedural character sculpting. Each fighter is described as smoothly blended signed-distance shapes
// (muscles, bones, facial features), meshed with Surface Nets into one seamless skin, skinned to a skeleton,
// and dressed with clothing layers that are offset shells of the body with fabric wrinkles.
(function (G) {
  const ZB = (G.ZB = G.ZB || {});
  const sqrt = Math.sqrt, abs = Math.abs, max = Math.max, min = Math.min;

  // ---------------- noise (for fabric wrinkles)
  const P = new Uint8Array(512);
  (() => {
    let s = 1337;
    const p = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  })();
  function noise3(x, y, z) {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    const fx = x - X, fy = y - Y, fz = z - Z;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    const h = (a, b, c) => P[P[P[a & 255] + (b & 255)] + (c & 255)] / 255;
    const l = (a, b, t) => a + (b - a) * t;
    return l(
      l(l(h(X, Y, Z), h(X + 1, Y, Z), u), l(h(X, Y + 1, Z), h(X + 1, Y + 1, Z), u), v),
      l(l(h(X, Y, Z + 1), h(X + 1, Y, Z + 1), u), l(h(X, Y + 1, Z + 1), h(X + 1, Y + 1, Z + 1), u), v),
      w,
    );
  }

  // ---------------- primitives
  // smooth minimum (polynomial)
  function smin(a, b, k) {
    if (k <= 0) return min(a, b);
    const h = max(k - abs(a - b), 0) / k;
    return min(a, b) - h * h * k * 0.25;
  }
  function smaxNeg(a, b, k) {
    // smooth subtraction: a minus b
    return -smin(-a, b, k);
  }
  // ellipsoid (approximate distance)
  function ell(x, y, z, c, r) {
    const px = (x - c[0]) / r[0], py = (y - c[1]) / r[1], pz = (z - c[2]) / r[2];
    const k0 = sqrt(px * px + py * py + pz * pz);
    const qx = px / r[0], qy = py / r[1], qz = pz / r[2];
    const k1 = sqrt(qx * qx + qy * qy + qz * qz);
    return k1 < 1e-9 ? -min(r[0], r[1], r[2]) : (k0 * (k0 - 1)) / k1;
  }
  // tapered capsule a->b with radii ra->rb
  function cone(x, y, z, a, b, ra, rb) {
    const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
    const px = x - a[0], py = y - a[1], pz = z - a[2];
    const l2 = bx * bx + by * by + bz * bz;
    let t = (px * bx + py * by + pz * bz) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = px - bx * t, dy = py - by * t, dz = pz - bz * t;
    return sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * t);
  }
  // compile a list of shapes into an SDF function
  function compile(list) {
    return function (x, y, z) {
      let d = 1e9;
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        let e;
        if (s.t === 'e') e = ell(x, y, z, s.c, s.r);
        else e = cone(x, y, z, s.a, s.b, s.ra, s.rb);
        if (s.sub) d = smaxNeg(d, e, s.k || 0.01);
        else d = i === 0 ? e : smin(d, e, s.k == null ? 0.04 : s.k);
      }
      return d;
    };
  }
  const E = (c, r, k) => ({ t: 'e', c, r, k });
  const C = (a, b, ra, rb, k) => ({ t: 'c', a, b, ra, rb, k });

  // ---------------- skeleton (bind pose, model space: feet on y=0, facing +z)
  // Bind pose is an A-pose (arms and legs angled out) so clothing never webs between limbs.
  // Local offsets are along each bone's own -y axis; fighter.js builds the bones from the same numbers.
  function joints(def) {
    const bt = def.body, blob = bt === 'blob';
    const W = blob ? 1.6 : bt === 'bulky' ? 1.25 : bt === 'slim' ? 0.9 : 1;
    const A = blob ? 1.3 : bt === 'bulky' ? 1.35 : bt === 'slim' ? 0.85 : 1;
    const L = blob ? 1.3 : bt === 'bulky' ? 1.25 : bt === 'slim' ? 0.9 : 1;
    const fem = def.id === 'mira';
    const a0 = blob ? 0.55 : 0.42, b0 = blob ? 0.12 : 0.09;
    const loc = blob
      ? { el: [0, -0.36, 0], wr: [0, -0.26, 0.01], fist: [0, -0.34, 0.01], kn: [0, -0.34, 0.01], ank: [0, -0.33, -0.02], toe: [0, -0.37, 0.16] }
      : { el: [0, -0.4, 0], wr: [0, -0.29, 0.01], fist: [0, -0.38, 0.01], kn: [0, -0.42, 0.01], ank: [0, -0.42, -0.02], toe: [0, -0.47, 0.14] };
    const sx = blob ? 0.5 : 0.2 * W + 0.075 * A, shY = blob ? 1.42 : 1.62;
    const hipX = blob ? 0.17 : 0.095 * W, hipY = blob ? 0.76 : 0.92;
    const rot = (o, v, th) => [o[0] + v[0] * Math.cos(th) - v[1] * Math.sin(th), o[1] + v[0] * Math.sin(th) + v[1] * Math.cos(th), o[2] + v[2]];
    const sh = (s) => [s * sx, shY, 0], el = (s) => rot(sh(s), loc.el, s * a0);
    const hip = (s) => [s * hipX, hipY, 0], kn = (s) => rot(hip(s), loc.kn, s * b0);
    return {
      W, A, L, blob, fem, sx, a0, b0, loc,
      tilt: [0, blob ? 0.85 : 1.0, 0], head: blob ? [0, 1.76, 0.04] : [0, 1.95, 0.01],
      sh, el, wr: (s) => rot(el(s), loc.wr, s * a0), fist: (s) => rot(el(s), loc.fist, s * a0),
      hip, kn, ank: (s) => rot(kn(s), loc.ank, s * b0), toe: (s) => rot(kn(s), loc.toe, s * b0),
    };
  }
  const lerp3 = (a, b, t, ox, oy, oz) => [a[0] + (b[0] - a[0]) * t + (ox || 0), a[1] + (b[1] - a[1]) * t + (oy || 0), a[2] + (b[2] - a[2]) * t + (oz || 0)];
  const add = (p, x, y, z) => [p[0] + x, p[1] + y, p[2] + z];

  // ---------------- anatomy
  function anatomy(def, J) {
    const { W, A, L, sx, fem } = J, torso = [], arms = [], legs = [], head = [];
    const hy = J.head[1], hz = J.head[2];
    if (J.blob) {
      torso.push(E([0, 1.12, 0.04], [0.5, 0.46, 0.44]), E([0, 1.42, -0.02], [0.36, 0.22, 0.3], 0.12), E([0, 0.86, 0], [0.34, 0.16, 0.28], 0.1), C([0, 1.5, 0], [0, 1.7, 0.02], 0.15, 0.13, 0.08));
    } else {
      const w = fem ? 0.9 : 1;
      torso.push(
        E([0, 0.98, 0], [0.15 * W * (fem ? 1.08 : 1), 0.13, 0.11]),
        E([0.07 * W, 0.93, -0.05], [0.085 * W, 0.09, 0.08], 0.05), E([-0.07 * W, 0.93, -0.05], [0.085 * W, 0.09, 0.08], 0.05),
        E([0, 1.16, 0.01], [0.135 * W * w, 0.17, 0.1], 0.07),
        E([0, 1.43, 0], [0.185 * W * w, 0.19, 0.12], 0.08),
        E([0.085 * W * w, 1.49, 0.065], [0.095 * W * w, fem ? 0.08 : 0.07, fem ? 0.07 : 0.055], 0.04), E([-0.085 * W * w, 1.49, 0.065], [0.095 * W * w, fem ? 0.08 : 0.07, fem ? 0.07 : 0.055], 0.04),
        E([0.13 * W, 1.37, -0.02], [0.075 * W, 0.15, 0.075], 0.05), E([-0.13 * W, 1.37, -0.02], [0.075 * W, 0.15, 0.075], 0.05),
        C([0, 1.66, -0.02], [sx * 0.82, 1.6, -0.01], 0.06, 0.045, 0.06), C([0, 1.66, -0.02], [-sx * 0.82, 1.6, -0.01], 0.06, 0.045, 0.06),
        C([0, 1.58, -0.005], [0, 1.82, 0.0], 0.078, 0.07, 0.06),
      );
      // abdominal definition (subtle)
      for (const yy of [1.08, 1.18, 1.28]) torso.push(E([0, yy, 0.095], [0.06 * W, 0.03, 0.02], 0.03));
    }
    for (const s of [-1, 1]) {
      const sh = J.sh(s), el = J.el(s), wr = J.wr(s), fi = J.fist(s);
      arms.push(
        E(add(sh, s * 0.012, -0.03, 0), [0.075 * A, 0.085 * A, 0.075 * A], 0.05),
        C(sh, el, 0.052 * A, 0.042 * A, 0.04),
        E(lerp3(sh, el, 0.5, 0, 0, 0.025), [0.042 * A, 0.1, 0.042 * A], 0.035), E(lerp3(sh, el, 0.45, 0, 0, -0.028), [0.042 * A, 0.11, 0.04 * A], 0.035),
        C(el, wr, 0.043 * A, 0.031 * A, 0.03), E(lerp3(el, wr, 0.28, s * 0.006, 0, 0.01), [0.042 * A, 0.085, 0.038 * A], 0.03),
        E(fi, [0.04 * A, 0.052, 0.048], 0.03),
        C(add(fi, -0.028, -0.01, 0.042), add(fi, 0.028, -0.01, 0.042), 0.019 * A, 0.019 * A, 0.015),
        E(add(fi, -s * 0.035, 0.015, 0.03), [0.017, 0.03, 0.02], 0.015),
      );
      const hp = J.hip(s), kn = J.kn(s), an = J.ank(s), to = J.toe(s);
      legs.push(
        C(hp, kn, 0.083 * L, 0.052 * L, 0.05),
        E(lerp3(hp, kn, 0.48, s * 0.008, 0, 0.03), [0.068 * L, 0.17, 0.058 * L], 0.04), E(lerp3(hp, kn, 0.45, 0, 0, -0.03), [0.062 * L, 0.16, 0.055 * L], 0.04),
        E(add(kn, 0, 0.01, 0.04), [0.035, 0.035, 0.02], 0.02),
        C(kn, an, 0.049 * L, 0.032 * L, 0.03), E(lerp3(kn, an, 0.33, 0, 0, -0.035), [0.046 * L, 0.11, 0.043 * L], 0.03),
        C(an, to, 0.038, 0.028, 0.03), E(add(an, 0, -0.03, -0.02), [0.035, 0.035, 0.045], 0.03),
      );
    }
    // ---- head: anime proportions (round skull, V-shaped jaw, small pointed chin, just a hint of a nose).
    // Eyes, brows and mouth are drawn on as decals in fighter.js, so the face surface stays smooth.
    // Keep in sync with ANIME_HEAD in tools/build_model.py.
    head.push(
      E([0, hy + 0.045, hz - 0.02], [0.172, 0.19, 0.182]),
      E([0, hy - 0.055, hz + 0.03], [fem ? 0.112 : 0.12, 0.11, 0.122], 0.07),
      E([0, hy - 0.142, hz + 0.08], [fem ? 0.028 : 0.033, 0.03, 0.034], 0.05),
      C([0.1, hy - 0.03, hz + 0.0], [0.028, hy - 0.135, hz + 0.075], 0.03, 0.02, 0.05), C([-0.1, hy - 0.03, hz + 0.0], [-0.028, hy - 0.135, hz + 0.075], 0.03, 0.02, 0.05),
      E([0.075, hy - 0.035, hz + 0.095], [0.055, 0.045, 0.05], 0.05), E([-0.075, hy - 0.035, hz + 0.095], [0.055, 0.045, 0.05], 0.05),
      E([0, hy - 0.04, hz + 0.168], [0.008, 0.015, 0.011], 0.016),
      C([0, 1.72, -0.005], [0, hy - 0.05, hz], 0.074, 0.068, 0.05),
    );
    if (def.hair !== 'god') head.push(E([0.168, hy - 0.005, hz - 0.015], [0.018, 0.048, 0.033], 0.02), E([-0.168, hy - 0.005, hz - 0.015], [0.018, 0.048, 0.033], 0.02));
    return { torso, arms, legs, head };
  }

  // ---------------- Surface Nets mesher
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  function surfaceNets(sdf, bmin, bmax, cell) {
    const nx = Math.ceil((bmax[0] - bmin[0]) / cell) + 1, ny = Math.ceil((bmax[1] - bmin[1]) / cell) + 1, nz = Math.ceil((bmax[2] - bmin[2]) / cell) + 1;
    const F = new Float32Array(nx * ny * nz);
    const B = 4, reach = B * cell * 1.8;
    for (let kb = 0; kb < nz; kb += B)
      for (let jb = 0; jb < ny; jb += B)
        for (let ib = 0; ib < nx; ib += B) {
          const cx = bmin[0] + (ib + B / 2) * cell, cy = bmin[1] + (jb + B / 2) * cell, cz = bmin[2] + (kb + B / 2) * cell;
          const d = sdf(cx, cy, cz), far = abs(d) > reach;
          for (let k = kb; k < min(nz, kb + B + 1); k++)
            for (let j = jb; j < min(ny, jb + B + 1); j++)
              for (let i = ib; i < min(nx, ib + B + 1); i++) {
                const id = i + nx * (j + ny * k);
                if (far) {
                  if (F[id] === 0) F[id] = d;
                } else F[id] = sdf(bmin[0] + i * cell, bmin[1] + j * cell, bmin[2] + k * cell) || 1e-6;
              }
        }
    const cnx = nx - 1, cny = ny - 1, cnz = nz - 1;
    const V = new Int32Array(cnx * cny * cnz).fill(-1);
    const pos = [];
    const c = new Float32Array(8);
    for (let k = 0; k < cnz; k++)
      for (let j = 0; j < cny; j++)
        for (let i = 0; i < cnx; i++) {
          let mask = 0;
          for (let n = 0; n < 8; n++) {
            const v = F[i + (n & 1) + nx * (j + ((n >> 1) & 1) + ny * (k + ((n >> 2) & 1)))];
            c[n] = v;
            if (v < 0) mask |= 1 << n;
          }
          if (mask === 0 || mask === 255) continue;
          let sx = 0, sy = 0, sz = 0, cnt = 0;
          for (const [a, b] of EDGES) {
            const va = c[a], vb = c[b];
            if (va < 0 === vb < 0) continue;
            const t = va / (va - vb);
            sx += (a & 1) + ((b & 1) - (a & 1)) * t;
            sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t;
            sz += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t;
            cnt++;
          }
          V[i + cnx * (j + cny * k)] = pos.length / 3;
          pos.push(bmin[0] + (i + sx / cnt) * cell, bmin[1] + (j + sy / cnt) * cell, bmin[2] + (k + sz / cnt) * cell);
        }
    const idx = [];
    const cellId = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= cnx || j >= cny || k >= cnz ? -1 : V[i + cnx * (j + cny * k)]);
    for (let k = 0; k < nz; k++)
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
          const f0 = F[i + nx * (j + ny * k)];
          for (let ax = 0; ax < 3; ax++) {
            const i1 = i + (ax === 0), j1 = j + (ax === 1), k1 = k + (ax === 2);
            if (i1 >= nx || j1 >= ny || k1 >= nz) continue;
            const f1 = F[i1 + nx * (j1 + ny * k1)];
            if (f0 < 0 === f1 < 0) continue;
            let q;
            if (ax === 0) q = [cellId(i, j - 1, k - 1), cellId(i, j, k - 1), cellId(i, j, k), cellId(i, j - 1, k)];
            else if (ax === 1) q = [cellId(i - 1, j, k - 1), cellId(i - 1, j, k), cellId(i, j, k), cellId(i, j, k - 1)];
            else q = [cellId(i - 1, j - 1, k), cellId(i, j - 1, k), cellId(i, j, k), cellId(i - 1, j, k)];
            if (q[0] < 0 || q[1] < 0 || q[2] < 0 || q[3] < 0) continue;
            if (f0 < 0) idx.push(q[0], q[1], q[2], q[0], q[2], q[3]);
            else idx.push(q[0], q[2], q[1], q[0], q[3], q[2]);
          }
        }
    // normals from the SDF gradient; fix triangle winding to agree with them
    const nrm = new Float32Array(pos.length), h = cell * 0.5;
    for (let v = 0; v < pos.length; v += 3) {
      const x = pos[v], y = pos[v + 1], z = pos[v + 2];
      let gx = sdf(x + h, y, z) - sdf(x - h, y, z), gy = sdf(x, y + h, z) - sdf(x, y - h, z), gz = sdf(x, y, z + h) - sdf(x, y, z - h);
      const l = sqrt(gx * gx + gy * gy + gz * gz) || 1;
      nrm[v] = gx / l;
      nrm[v + 1] = gy / l;
      nrm[v + 2] = gz / l;
    }
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t] * 3, b = idx[t + 1] * 3, cc = idx[t + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[cc] - pos[a], vy = pos[cc + 1] - pos[a + 1], vz = pos[cc + 2] - pos[a + 2];
      const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
      if (fx * nrm[a] + fy * nrm[a + 1] + fz * nrm[a + 2] < 0) {
        const tmp = idx[t + 1];
        idx[t + 1] = idx[t + 2];
        idx[t + 2] = tmp;
      }
    }
    return { pos: new Float32Array(pos), nrm, idx: pos.length / 3 > 65535 ? new Uint32Array(idx) : new Uint16Array(idx) };
  }

  // ---------------- skinning: weight each vertex to its nearest bone segments
  // bone order must match fighter.js: 0 tilt, 1 chest, 2 head, 3/4 shoulder R/L, 5/6 elbow, 7/8 fist, 9/10 hip, 11/12 knee
  function boneSegments(J) {
    const segs = [
      [0, [0, J.tilt[1] - 0.2, 0], [0, J.tilt[1] + 0.03, 0]],
      [1, [0, J.tilt[1] + 0.1, 0], [0, J.sh(1)[1] + 0.04, 0]],
      [2, [0, J.head[1] - 0.16, J.head[2]], [0, J.head[1] + 0.15, J.head[2]]],
    ];
    [-1, 1].forEach((s, n) => {
      segs.push([3 + n, add(J.sh(s), 0, -0.02, 0), J.el(s)]);
      segs.push([5 + n, J.el(s), J.wr(s)]);
      segs.push([7 + n, J.wr(s), add(J.fist(s), 0, -0.05, 0)]);
      segs.push([9 + n, add(J.hip(s), 0, -0.02, 0), J.kn(s)]);
      segs.push([11 + n, J.kn(s), J.toe(s)]);
    });
    return segs;
  }
  function segDist(x, y, z, a, b) {
    const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], px = x - a[0], py = y - a[1], pz = z - a[2];
    let t = (px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = px - bx * t, dy = py - by * t, dz = pz - bz * t;
    return sqrt(dx * dx + dy * dy + dz * dz);
  }
  const REGION = { torso: [0, 1, 2, 3, 4, 9, 10], arms: [1, 3, 4, 5, 6, 7, 8], legs: [0, 9, 10, 11, 12] };
  function skin(pos, J, onlyBone, groups) {
    const n = pos.length / 3, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), segs = boneSegments(J);
    const ds = new Float32Array(segs.length);
    for (let v = 0; v < n; v++) {
      if (onlyBone != null) {
        si[v * 4] = onlyBone;
        sw[v * 4] = 1;
        continue;
      }
      const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
      let allowed = null;
      if (groups) {
        const dT = groups.T(x, y, z), dA = groups.A(x, y, z), dL = groups.L(x, y, z);
        allowed = dA < dT - 0.008 && dA < dL ? REGION.arms : dL < dT - 0.008 ? REGION.legs : REGION.torso;
      }
      let dmin = 1e9;
      for (let s = 0; s < segs.length; s++) {
        ds[s] = allowed && !allowed.includes(segs[s][0]) ? 1e9 : segDist(x, y, z, segs[s][1], segs[s][2]);
        if (ds[s] < dmin) dmin = ds[s];
      }
      // keep the 4 best by exponential falloff
      const best = [];
      for (let s = 0; s < segs.length; s++) {
        const w = Math.exp(-(ds[s] - dmin) / 0.022);
        if (w > 0.01) best.push([segs[s][0], w]);
      }
      best.sort((a, b) => b[1] - a[1]);
      let tot = 0;
      for (let q = 0; q < min(4, best.length); q++) tot += best[q][1];
      for (let q = 0; q < min(4, best.length); q++) {
        si[v * 4 + q] = best[q][0];
        sw[v * 4 + q] = best[q][1] / tot;
      }
    }
    return { si, sw };
  }

  // ---------------- build a whole character
  const cache = {};
  function build(def, quality) {
    const key = def.id + ':' + quality;
    if (cache[key]) return cache[key];
    const t0 = Date.now();
    const J = joints(def), an = anatomy(def, J);
    const fT = compile(an.torso), fA = compile(an.arms), fL = compile(an.legs), fH = compile(an.head);
    const body = (x, y, z) => smin(smin(fT(x, y, z), fA(x, y, z), 0.03), fL(x, y, z), 0.04);
    const cell = quality === 'low' ? 0.022 : 0.0135, hcell = quality === 'low' ? 0.012 : 0.0078;
    const R = J.fist(1)[0] + 0.12;
    const parts = [];
    const push = (name, mat, sdf, bmin, bmax, c, opt) => {
      const m = surfaceNets(sdf, bmin, bmax, c);
      if (!m.idx.length) return;
      const sk = skin(m.pos, J, opt && opt.bone, { T: fT, A: fA, L: fL });
      parts.push(Object.assign({ name, mat, pos: m.pos, nrm: m.nrm, idx: m.idx, si: sk.si, sw: sk.sw }, opt || {}));
    };
    // skin: body (excluding the head, which is meshed finer)
    const neckCut = J.head[1] - 0.12;
    push('body', 'skin', (x, y, z) => max(body(x, y, z), y - neckCut - 0.02), [-R, -0.03, -0.42], [R, neckCut + 0.06, 0.42], cell);
    // head with face (finer), plus lip tint as vertex colours
    const hy = J.head[1], hz = J.head[2];
    push('head', 'skin', (x, y, z) => max(fH(x, y, z), neckCut - 0.06 - y), [-0.24, neckCut - 0.1, hz - 0.26], [0.24, hy + 0.26, hz + 0.28], hcell, { bone: 2, lips: [0, hy - 0.092, hz + 0.165] });
    // ---- clothing shells ----
    const wr = (x, y, z, a) => (noise3(x * 17, y * 11, z * 17) - 0.5) * a + (noise3(x * 41, y * 30, z * 41) - 0.5) * a * 0.25;
    const armorTop = /^(rhen|zorath|nx9|valdris|oriel)$/.test(def.id);
    if (J.blob) {
      push('vest', 'gi2', (x, y, z) => max(fT(x, y, z) - 0.03 + wr(x, y, z, 0.01), 1.22 - y, y - 1.66, z > 0.25 ? 0.16 - abs(x) : -1), [-0.62, 1.1, -0.5], [0.62, 1.75, 0.55], cell, { tear: 0.9 });
      push('pants', 'gi', (x, y, z) => max(smin(fT(x, y, z), fL(x, y, z), 0.05) - 0.05 + wr(x, y, z, 0.008), y - 1.0, 0.2 - y), [-0.6, 0.15, -0.5], [0.6, 1.06, 0.5], cell, { tear: 0.6 });
    } else {
      // sleeve length as a fraction along the arm (shoulder=0, elbow=1, wrist=~1.7)
      const sleeveT = armorTop ? 1.62 : 0.55;
      const armT = (x, y, z) => {
        const s = x < 0 ? -1 : 1, a = J.sh(s), b = J.el(s), bx = b[0] - a[0], by = b[1] - a[1], l = Math.hypot(bx, by);
        return { t: ((x - a[0]) * bx + (y - a[1]) * by) / (l * l), l };
      };
      const torsoArms = (x, y, z) => smin(fT(x, y, z), fA(x, y, z), 0.03);
      const vneck = (x, y, z) => ell(x, y, z, [0, 1.63, 0.15], [0.07 * J.W, 0.2, 0.12]);
      push('top', 'gi', (x, y, z) => {
        let d = torsoArms(x, y, z) - 0.024 + wr(x, y, z, 0.012);
        d = max(d, 1.0 - y, y - 1.7);
        if (abs(x) > J.sx * 0.78 && y < J.sh(1)[1] + 0.05) {
          const q = armT(x, y, z);
          d = max(d, (q.t - sleeveT) * q.l);
        }
        if (!armorTop) d = smaxNeg(d, vneck(x, y, z), 0.02);
        return d;
      }, [-R, 0.95, -0.36], [R, 1.76, 0.36], cell, { tear: 1 });
      if (!armorTop) push('under', 'gi2', (x, y, z) => max(fT(x, y, z) - 0.012, 1.3 - y, y - 1.68, abs(x) - 0.12 * J.W), [-0.2, 1.25, -0.3], [0.2, 1.72, 0.3], cell, { tear: 0.85 });
      else {
        push('plate', 'gi2', (x, y, z) => max(fT(x, y, z) - 0.045, 1.22 - y, y - 1.66, abs(x) - 0.24 * J.W), [-0.36, 1.15, -0.36], [0.36, 1.72, 0.36], cell, { tear: 0.35 });
        for (const s of [-1, 1]) push('pad' + s, 'gi2', (x, y, z) => ell(x, y, z, add(J.sh(s), s * 0.02, 0.0, 0), [0.11 * J.A, 0.07, 0.1 * J.A]), add(J.sh(s), -0.16, -0.12, -0.16), add(J.sh(s), 0.16, 0.12, 0.16), cell, { tear: 0.3 });
      }
      const robe = def.hair === 'god' || def.hair === 'halo';
      if (robe) push('robe', 'gi', (x, y, z) => max(cone(x, y, z, [0, 1.02, 0], [0, 0.1, 0], 0.18 * J.W, 0.42) + wr(x * 0.6, y * 0.4, z * 0.6, 0.02), y - 1.05, 0.06 - y), [-0.5, 0.0, -0.5], [0.5, 1.1, 0.5], cell, { tear: 0.8 });
      else push('pants', 'gi', (x, y, z) => max(smin(fT(x, y, z), fL(x, y, z), 0.04) - 0.038 + wr(x, y * 0.5, z, 0.02), y - 1.04, 0.22 - y, abs(x) - 0.29 * J.W), [-0.34, 0.15, -0.3], [0.34, 1.1, 0.3], cell, { tear: 0.6 });
      push('belt', 'belt', (x, y, z) => max(fT(x, y, z) - 0.05, abs(y - 1.02) - 0.03), [-0.32, 0.96, -0.3], [0.32, 1.08, 0.3], cell, { tear: 0.2 });
    }
    const wristBand = (x, y, z) => {
      const s = x < 0 ? -1 : 1, a = J.wr(s), e = J.el(s), dx = a[0] - e[0], dy = a[1] - e[1], l = Math.hypot(dx, dy);
      return abs(((x - a[0]) * dx + (y - a[1]) * dy) / l + 0.045) - 0.04;
    };
    push('wrist', armorTop ? 'gold' : 'gi2', (x, y, z) => max(fA(x, y, z) - 0.016, wristBand(x, y, z)), [-R - 0.25, J.wr(1)[1] - 0.12, -0.15], [R + 0.25, J.wr(1)[1] + 0.16, 0.15], cell, { tear: 0.15 });
    push('boots', 'boots', (x, y, z) => max(fL(x, y, z) - 0.022, y - 0.27), [-0.36, -0.03, -0.2], [0.36, 0.32, 0.3], cell, { tear: 0.3 });
    const out = { J, parts, ms: Date.now() - t0 };
    cache[key] = out;
    return out;
  }

  // Depth of the face surface at (x, y) relative to the head joint: used to lay drawn eyes/mouth onto the skin.
  const faceCache = {};
  function faceZ(def, x, y) {
    let f = faceCache[def.id];
    if (!f) {
      const J = joints(def);
      f = faceCache[def.id] = { J, sdf: compile(anatomy(def, J).head) };
    }
    const hx = f.J.head[0], hy = f.J.head[1], hz = f.J.head[2];
    let z = 0.35;
    while (z > -0.1 && f.sdf(hx + x, hy + y, hz + z) > 0) z -= 0.002;
    let lo = z, hi = z + 0.002;
    for (let i = 0; i < 12; i++) {
      const m = (lo + hi) / 2;
      if (f.sdf(hx + x, hy + y, hz + m) > 0) hi = m;
      else lo = m;
    }
    return lo;
  }
  ZB.sculpt = { build, joints, noise3, faceZ };
})(typeof window !== 'undefined' ? window : globalThis);
