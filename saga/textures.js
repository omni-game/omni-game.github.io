'use strict';
// Procedurally generated textures: tiling terrain colour + normal maps, smoke puffs, scorch decals, building windows.
(function () {
  const T = THREE;
  // seeded value noise
  function makeNoise(seed) {
    const perm = new Uint8Array(512);
    let s = seed || 1;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const p = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const val = new Float32Array(256).map(() => rnd());
    // tileable noise with period `per`
    return function (x, y, per) {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const X0 = ((xi % per) + per) % per, Y0 = ((yi % per) + per) % per, X1 = (X0 + 1) % per, Y1 = (Y0 + 1) % per;
      const g = (a, b) => val[perm[perm[a & 255] + (b & 255)]];
      return (g(X0, Y0) * (1 - u) + g(X1, Y0) * u) * (1 - v) + (g(X0, Y1) * (1 - u) + g(X1, Y1) * u) * v;
    };
  }
  const n1 = makeNoise(7), n2 = makeNoise(31);
  function fbm(noise, x, y, per, oct) {
    let a = 0.5, f = 1, s = 0;
    for (let i = 0; i < oct; i++) {
      s += a * noise(x * f, y * f, per * f);
      a *= 0.5;
      f *= 2;
    }
    return s;
  }
  const canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h || w;
    return c;
  };
  const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];

  // Terrain: returns { map, normalMap, roughnessMap } for a stage style.
  const cache = {};
  function terrain(st) {
    if (cache[st.id]) return cache[st.id];
    const N = 512, per = 8;
    const h = new Float32Array(N * N);
    const style = st.props;
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const u = (x / N) * per, v = (y / N) * per;
        let e = fbm(n1, u, v, per, 6);
        if (style === 'mesa') e = e * 0.8 + Math.abs(fbm(n2, u * 2, v * 2, per * 2, 3) - 0.5) * 0.5; // cracked hardpan
        if (style === 'ice') e = e * 0.5 + fbm(n2, u * 4, v * 4, per * 4, 2) * 0.2;
        if (style === 'city') e = e * 0.6 + (n2(u * 40, v * 40, per * 40) > 0.75 ? 0.15 : 0);
        h[y * N + x] = e;
      }
    // cracks for desert / arena / realm
    const crack = new Float32Array(N * N);
    if (style === 'mesa' || style === 'arena' || style === 'crystal') {
      let seed = 11;
      const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let k = 0; k < 70; k++) {
        let x = r() * N, y = r() * N, a = r() * Math.PI * 2;
        const len = 40 + r() * 160;
        for (let i = 0; i < len; i++) {
          a += (r() - 0.5) * 0.6;
          x = (x + Math.cos(a) + N) % N;
          y = (y + Math.sin(a) + N) % N;
          crack[(y | 0) * N + (x | 0)] = 1;
        }
      }
    }
    const c = canvas(N), g = c.getContext('2d'), img = g.createImageData(N, N);
    const cn = canvas(N), gn = cn.getContext('2d'), imn = gn.createImageData(N, N);
    const A = rgb(st.ground), B = rgb(st.ground2);
    const tileLines = style === 'arena';
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        let e = h[i];
        const t = Math.min(1, Math.max(0, (e - 0.3) * 2.2));
        const speck = n2((x / N) * 64, (y / N) * 64, 64);
        let shade = 0.85 + speck * 0.3;
        if (crack[i]) shade *= 0.45;
        if (tileLines && (x % 128 < 2 || y % 128 < 2)) shade *= 0.55;
        // slightly desaturated so lit/shadowed ground reads naturally
        const cr = (A[0] + (B[0] - A[0]) * t) * shade, cg = (A[1] + (B[1] - A[1]) * t) * shade, cb = (A[2] + (B[2] - A[2]) * t) * shade;
        const lum = cr * 0.3 + cg * 0.59 + cb * 0.11, ds = 0.3;
        img.data[i * 4] = Math.min(255, cr + (lum - cr) * ds);
        img.data[i * 4 + 1] = Math.min(255, cg + (lum - cg) * ds);
        img.data[i * 4 + 2] = Math.min(255, cb + (lum - cb) * ds);
        img.data[i * 4 + 3] = 255;
        // normal from height (sobel), cracks and tile seams sink
        const hh = (xx, yy) => {
          const j = (((yy + N) % N) * N + ((xx + N) % N));
          return h[j] - crack[j] * 0.08 - (tileLines && (xx % 128 < 2 || yy % 128 < 2) ? 0.05 : 0);
        };
        const dx = (hh(x + 1, y) - hh(x - 1, y)) * 6, dy = (hh(x, y + 1) - hh(x, y - 1)) * 6;
        const l = Math.hypot(dx, dy, 1);
        imn.data[i * 4] = ((-dx / l) * 0.5 + 0.5) * 255;
        imn.data[i * 4 + 1] = ((dy / l) * 0.5 + 0.5) * 255;
        imn.data[i * 4 + 2] = ((1 / l) * 0.5 + 0.5) * 255;
        imn.data[i * 4 + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    gn.putImageData(imn, 0, 0);
    const map = new T.CanvasTexture(c), normalMap = new T.CanvasTexture(cn);
    map.encoding = T.sRGBEncoding;
    for (const t of [map, normalMap]) {
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.anisotropy = 8;
    }
    return (cache[st.id] = { map, normalMap });
  }

  let smoke = null;
  function smokeTex() {
    if (smoke) return smoke;
    const N = 128, c = canvas(N), g = c.getContext('2d'), img = g.createImageData(N, N);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const dx = x / N - 0.5, dy = y / N - 0.5, d = Math.hypot(dx, dy) * 2;
        const n = fbm(n1, (x / N) * 4, (y / N) * 4, 4, 5);
        const a = Math.max(0, 1 - d) ** 1.5 * Math.min(1, n * 1.6);
        const i = (y * N + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 200 + n * 55;
        img.data[i + 3] = a * 255;
      }
    g.putImageData(img, 0, 0);
    smoke = new T.CanvasTexture(c);
    smoke.encoding = T.sRGBEncoding;
    return smoke;
  }

  let scorch = null;
  function scorchTex() {
    if (scorch) return scorch;
    const N = 256, c = canvas(N), g = c.getContext('2d'), img = g.createImageData(N, N);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const dx = x / N - 0.5, dy = y / N - 0.5, d = Math.hypot(dx, dy) * 2;
        const ang = Math.atan2(dy, dx);
        const n = fbm(n2, (x / N) * 6, (y / N) * 6, 6, 4);
        const rays = 0.75 + 0.25 * Math.sin(ang * 13 + n * 6);
        const a = Math.max(0, 1 - d / rays) ** 0.8 * (0.6 + n * 0.5);
        const i = (y * N + x) * 4;
        const rim = Math.max(0, 1 - Math.abs(d - 0.55) * 6);
        img.data[i] = 20 + rim * 40;
        img.data[i + 1] = 14 + rim * 25;
        img.data[i + 2] = 10 + rim * 15;
        img.data[i + 3] = Math.min(255, a * 235);
      }
    g.putImageData(img, 0, 0);
    scorch = new T.CanvasTexture(c);
    scorch.encoding = T.sRGBEncoding;
    return scorch;
  }

  // Building facade with a grid of windows; returns colour map and emissive map (lit windows).
  const facades = {};
  function facade(color) {
    if (facades[color]) return facades[color];
    const W = 128, H = 256, c = canvas(W, H), e = canvas(W, H), g = c.getContext('2d'), ge = e.getContext('2d');
    const [r, gg, b] = rgb(color);
    g.fillStyle = `rgb(${r},${gg},${b})`;
    g.fillRect(0, 0, W, H);
    ge.fillStyle = '#000';
    ge.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y++) {
      const k = 0.92 + Math.random() * 0.12;
      g.fillStyle = `rgba(0,0,0,${0.05 * Math.random()})`;
      g.fillRect(0, y, W, 1);
      void k;
    }
    for (let y = 8; y < H - 8; y += 16)
      for (let x = 6; x < W - 6; x += 14) {
        const broken = Math.random() < 0.12, lit = Math.random() < 0.18;
        g.fillStyle = broken ? '#0b0d10' : `rgb(${40 + Math.random() * 30},${55 + Math.random() * 30},${75 + Math.random() * 30})`;
        g.fillRect(x, y, 9, 11);
        g.fillStyle = 'rgba(255,255,255,0.18)';
        g.fillRect(x, y, 9, 2);
        if (lit && !broken) {
          ge.fillStyle = `rgb(255,${190 + Math.random() * 50},${120 + Math.random() * 60})`;
          ge.fillRect(x, y, 9, 11);
        }
      }
    // grime streaks
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(30,25,20,${Math.random() * 0.15})`;
      g.fillRect(Math.random() * W, Math.random() * H * 0.3, 2 + Math.random() * 4, 40 + Math.random() * 120);
    }
    const map = new T.CanvasTexture(c), em = new T.CanvasTexture(e);
    map.encoding = em.encoding = T.sRGBEncoding;
    for (const t of [map, em]) t.wrapS = t.wrapT = T.RepeatWrapping;
    return (facades[color] = { map, em });
  }

  ZB.tex = { terrain, smokeTex, scorchTex, facade, noise: n1, fbm };
})();
