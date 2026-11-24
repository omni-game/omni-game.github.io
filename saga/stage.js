'use strict';
// Realistic stages: shader sky with sun and clouds (also used as image-based lighting), textured terrain with
// distant mountains, displaced rocks and mesas, textured buildings, ice, crystals, and persistent craters.
(function () {
  const T = THREE;
  const rand = (a, b) => a + Math.random() * (b - a);
  const N = (x, y) => ZB.tex.noise(x, y, 1e6);

  const SKY_FS = `uniform vec3 top; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; uniform float cloud; uniform float stars; varying vec3 vDir;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*n(p); p *= 2.03; a *= 0.5; } return v; }
    void main(){
      vec3 d = normalize(vDir);
      float y = d.y;
      vec3 col = mix(bot, top, smoothstep(-0.02, 0.55, y));
      col = mix(col, bot * 1.15, exp(-max(y, 0.0) * 18.0) * 0.6);           // horizon haze
      float s = max(dot(d, sunDir), 0.0);
      col += sunCol * (pow(s, 900.0) * 30.0 + pow(s, 12.0) * 0.35 + pow(s, 3.0) * 0.12);
      if (y > 0.0) {
        vec2 uv = d.xz / (y + 0.12) * 1.6;
        float c = smoothstep(0.5, 0.85, fbm(uv + vec2(3.0, 1.0)));
        vec3 cc = mix(vec3(1.0), bot, 0.35) * (0.85 + 0.4 * pow(s, 4.0));
        col = mix(col, cc, c * cloud * smoothstep(0.0, 0.25, y));
        float st = step(0.997, h(floor(d.xz / (y + 0.2) * 220.0)));
        col += st * stars * smoothstep(0.05, 0.4, y);
      }
      if (y < 0.0) col = bot * 0.7;
      gl_FragColor = vec4(col, 1.0);
    }`;
  const SKY_VS = 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }';

  // Push vertices along their direction from the centre using noise (rocks, mesas, ice).
  function displace(geo, amp, freq, seed) {
    const p = geo.attributes.position, v = new T.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const k = N(v.x * freq + seed, v.z * freq + v.y * freq * 0.7) - 0.5 + (N(v.y * freq * 2.1 + seed, v.x * freq * 2.1) - 0.5) * 0.5;
      const dir = v.clone().setY(v.y * 0.3).normalize();
      v.addScaledVector(dir, k * amp);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return smooth(geo);
  }
  // Average normals of coincident vertices so non-indexed shapes (icosahedra) shade smoothly.
  function smooth(geo) {
    const p = geo.attributes.position, n = geo.attributes.normal, acc = new Map();
    const key = (i) => `${Math.round(p.getX(i) * 100)},${Math.round(p.getY(i) * 100)},${Math.round(p.getZ(i) * 100)}`;
    for (let i = 0; i < p.count; i++) {
      const k = key(i), a = acc.get(k) || [0, 0, 0];
      a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i);
      acc.set(k, a);
    }
    for (let i = 0; i < p.count; i++) {
      const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1;
      n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l);
    }
    n.needsUpdate = true;
    return geo;
  }
  // Horizontal colour bands (sedimentary strata) via vertex colours.
  function strata(geo, a, b) {
    const p = geo.attributes.position, cols = [], ca = new T.Color(a), cb = new T.Color(b), c = new T.Color();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), t = 0.5 + 0.5 * Math.sin(y * 1.3 + N(y * 0.4, 3.3) * 4);
      c.copy(ca).lerp(cb, t);
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    return geo;
  }

  function buildStage(scene, st, renderer) {
    const props = [];
    const night = st.props === 'crystal' || st.props === 'arena';
    const sunDir = new T.Vector3(0.55, night ? 0.35 : 0.42, 0.35).normalize();
    // ---- sky ----
    const skyMat = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new T.Color(st.sky[1]) }, bot: { value: new T.Color(st.sky[0]) }, sunDir: { value: sunDir },
        sunCol: { value: new T.Color(st.sun) }, cloud: { value: st.props === 'city' ? 0.8 : night ? 0.25 : 0.55 }, stars: { value: night ? 1.4 : 0 },
      },
      vertexShader: SKY_VS, fragmentShader: SKY_FS,
    });
    const sky = new T.Mesh(new T.SphereGeometry(900, 32, 16), skyMat);
    sky.renderOrder = -1;
    scene.add(sky);
    // image-based lighting from the sky
    if (renderer) {
      const envScene = new T.Scene();
      envScene.add(new T.Mesh(new T.SphereGeometry(10, 32, 16), skyMat));
      const pm = new T.PMREMGenerator(renderer);
      const rt = pm.fromScene(envScene, 0.02);
      scene.environment = rt.texture;
      pm.dispose();
    }
    scene.fog = new T.Fog(st.fog, 200, 1000);

    // ---- terrain ----
    const tex = ZB.tex.terrain(st);
    const size = 1600, seg = 180, gg = new T.PlaneGeometry(size, size, seg, seg);
    gg.rotateX(-Math.PI / 2);
    const pos = gg.attributes.position, cols = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
      const big = ZB.tex.fbm(ZB.tex.noise, x * 0.004 + 50, z * 0.004 + 50, 1e6, 5);
      let y = 0;
      if (r > 200) y = Math.pow((r - 200) / 600, 1.6) * 260 * (0.4 + big) + (big - 0.5) * 12;
      else if (st.props !== 'arena') y = (big - 0.5) * 0.25 * Math.max(0, (r - 60) / 140);
      if (st.props === 'arena' && r < 52) y = 0;
      else if (st.props === 'arena') y -= 2.5;
      pos.setY(i, y);
      const k = 0.78 + big * 0.42;
      cols.push(k, k, k);
    }
    gg.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    gg.computeVertexNormals();
    const rep = size / 14;
    for (const t of [tex.map, tex.normalMap]) t.repeat.set(rep, rep);
    const groundMat = new T.MeshStandardMaterial({
      map: tex.map, normalMap: tex.normalMap, normalScale: new T.Vector2(1.4, 1.4), vertexColors: true,
      roughness: st.props === 'ice' ? 0.35 : st.props === 'city' ? 0.85 : 0.96, metalness: 0,
    });
    const ground = new T.Mesh(gg, groundMat);
    ground.receiveShadow = true;
    scene.add(ground);

    const stoneMat = (c, r) => new T.MeshStandardMaterial({ color: c, roughness: r == null ? 0.9 : r, map: tex.map, normalMap: tex.normalMap, normalScale: new T.Vector2(2, 2) });
    const addProp = (mesh, x, z, r, y0, y1, color) => {
      mesh.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      scene.add(mesh);
      props.push({ mesh, x, z, r, y0, y1, alive: true, color });
    };
    const ring = (n, rMin, rMax, fn) => {
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2), r = rand(rMin, rMax);
        fn(Math.cos(a) * r, Math.sin(a) * r, i);
      }
    };
    // scattered pebbles / small detail rocks
    const pebMat = stoneMat(st.ground2, 0.95);
    const peb = new T.InstancedMesh(displace(new T.IcosahedronGeometry(1, 1), 0.5, 1.7, 3), pebMat, 900);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sc = new T.Vector3(), pv = new T.Vector3();
    for (let i = 0; i < 900; i++) {
      const a = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * 220, s = rand(0.08, 0.5) * (Math.random() < 0.08 ? 3 : 1);
      if (st.props === 'arena' && r < 50) {
        m4.makeScale(0, 0, 0);
      } else {
        q.setFromEuler(e.set(rand(0, 3), rand(0, 3), rand(0, 3)));
        m4.compose(pv.set(Math.cos(a) * r, s * 0.3 + (st.props === 'arena' ? -2.5 : 0), Math.sin(a) * r), q, sc.set(s, s * rand(0.5, 1), s));
      }
      peb.setMatrixAt(i, m4);
    }
    peb.castShadow = peb.receiveShadow = true;
    if (st.props !== 'city') scene.add(peb);

    if (st.props === 'mesa') {
      ring(30, 45, 200, (x, z, i) => {
        const h = rand(10, 34), r = rand(5, 11);
        const geo = strata(displace(new T.CylinderGeometry(r * 0.75, r * 1.1, h, 20, 14), r * 0.35, 0.25, i * 7), 0xb57d55, 0x8c5a3c);
        const m = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, map: tex.map, normalMap: tex.normalMap, normalScale: new T.Vector2(2, 2) }));
        m.position.set(x, h / 2 - 0.5, z);
        m.rotation.y = rand(0, 3);
        addProp(m, x, z, r, 0, h, 0x9a5532);
      });
      ring(34, 18, 200, (x, z, i) => {
        const s = rand(1.2, 4.5), m = new T.Mesh(displace(new T.IcosahedronGeometry(s, 3), s * 0.45, 0.6 / s, i), stoneMat(0x8c4c2a));
        m.position.set(x, s * 0.35, z);
        m.scale.y = rand(0.6, 1);
        m.rotation.y = rand(0, 3);
        addProp(m, x, z, s, 0, s * 1.2, 0x7a4022);
      });
    } else if (st.props === 'city') {
      const palette = [0x8a9099, 0xa39d92, 0x6f757e, 0xb8b1a3, 0x7d6f63];
      ring(56, 34, 220, (x, z, i) => {
        const h = rand(12, 48), w = rand(8, 14), d = rand(8, 14), c = palette[i % palette.length];
        const f = ZB.tex.facade(c);
        const map = f.map.clone(), em = f.em.clone();
        map.needsUpdate = em.needsUpdate = true;
        map.repeat.set(Math.round(w / 6), Math.round(h / 10));
        em.repeat.copy(map.repeat);
        const mat = new T.MeshStandardMaterial({ map, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.7, metalness: 0.1 });
        const g = new T.Group();
        const body = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
        body.position.y = h / 2;
        g.add(body);
        const roofMat = new T.MeshStandardMaterial({ color: 0x4a4d52, roughness: 0.9 });
        const roof = new T.Mesh(new T.BoxGeometry(w + 0.6, 0.8, d + 0.6), roofMat);
        roof.position.y = h + 0.4;
        g.add(roof);
        if (Math.random() < 0.5) {
          const box = new T.Mesh(new T.BoxGeometry(w * 0.3, 2.2, d * 0.3), roofMat);
          box.position.set(rand(-w / 4, w / 4), h + 1.6, rand(-d / 4, d / 4));
          g.add(box);
        }
        // rubble pile at the base
        const pile = new T.Mesh(displace(new T.IcosahedronGeometry(3, 2), 1.5, 0.5, i), new T.MeshStandardMaterial({ color: c, roughness: 0.95, map: tex.map }));
        pile.position.set(w / 2, 0.2, rand(-d / 3, d / 3));
        pile.scale.set(1, 0.45, 1);
        g.add(pile);
        g.position.set(x, 0, z);
        g.rotation.y = rand(0, 3);
        addProp(g, x, z, Math.max(w, d) * 0.6, 0, h, c);
      });
    } else if (st.props === 'ice') {
      const iceMat = new T.MeshStandardMaterial({ color: 0xbfe4ff, roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.9, envMapIntensity: 1.6 });
      ring(42, 25, 210, (x, z, i) => {
        const g = new T.Group(), h = rand(7, 26), r = rand(2.5, 6.5);
        for (let k = 0; k < 3; k++) {
          const hh = h * (k ? rand(0.35, 0.7) : 1), rr = r * (k ? 0.55 : 1);
          const m = new T.Mesh(displace(new T.ConeGeometry(rr, hh, 6, 4), rr * 0.2, 0.5, i * 3 + k), iceMat);
          m.position.set(k ? rand(-r, r) : 0, hh / 2 - 0.3, k ? rand(-r, r) : 0);
          m.rotation.set(rand(-0.25, 0.25), rand(0, 3), rand(-0.25, 0.25));
          g.add(m);
        }
        g.position.set(x, 0, z);
        addProp(g, x, z, r, 0, h, 0xcdeafc);
      });
      const snow = new T.MeshStandardMaterial({ color: 0xf4f9ff, roughness: 0.9 });
      ring(30, 20, 220, (x, z, i) => {
        const s = rand(3, 9), m = new T.Mesh(displace(new T.SphereGeometry(s, 20, 12), s * 0.3, 0.3, i), snow);
        m.position.set(x, -s * 0.7, z);
        m.scale.y = 0.6;
        m.receiveShadow = true;
        scene.add(m);
      });
    } else if (st.props === 'crystal') {
      const cols2 = [0xb98aff, 0x7ad6ff, 0xff8ad8];
      ring(40, 25, 210, (x, z, i) => {
        const s = rand(2, 6), y = i % 2 ? rand(8, 42) : s * 1.4, c = cols2[i % 3];
        const m = new T.Mesh(displace(new T.OctahedronGeometry(s, 1), s * 0.15, 0.4, i), new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.9 }));
        m.position.set(x, y, z);
        m.scale.y = 1.9;
        addProp(m, x, z, s, y - s * 1.9, y + s * 1.9, c);
      });
      ring(26, 30, 220, (x, z, i) => {
        const s = rand(2, 5), m = new T.Mesh(displace(new T.IcosahedronGeometry(s, 3), s * 0.4, 0.5 / s, i), stoneMat(0x3b2a5e));
        m.position.set(x, s * 0.3, z);
        addProp(m, x, z, s, 0, s, 0x3b2a5e);
      });
    } else if (st.props === 'arena') {
      // raised tiled platform
      const plat = new T.Mesh(new T.CylinderGeometry(52, 53, 2.6, 96), stoneMat(0x9a9fb3, 0.75));
      plat.position.y = -1.36;
      plat.receiveShadow = true;
      scene.add(plat);
      const marble = new T.MeshStandardMaterial({ color: 0xe8eaf2, roughness: 0.35, metalness: 0.05, normalMap: tex.normalMap });
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2, x = Math.cos(a) * 58, z = Math.sin(a) * 58, h = 24;
        const geo = new T.CylinderGeometry(2.2, 2.6, h, 32, 1);
        const p = geo.attributes.position;
        for (let k = 0; k < p.count; k++) {
          const px = p.getX(k), pz = p.getZ(k), ang = Math.atan2(pz, px), f = 1 - 0.06 * Math.max(0, Math.cos(ang * 16));
          p.setX(k, px * f);
          p.setZ(k, pz * f);
        }
        geo.computeVertexNormals();
        const g = new T.Group(), col = new T.Mesh(geo, marble);
        col.position.y = h / 2 - 2.5;
        g.add(col);
        for (const yy of [-2.2, h - 2.2]) {
          const cap = new T.Mesh(new T.BoxGeometry(6, 1.2, 6), marble);
          cap.position.y = yy;
          g.add(cap);
        }
        g.position.set(x, 0, z);
        addProp(g, x, z, 2.8, -2.5, h - 2, 0xd8dbe8);
      }
      ring(16, 95, 220, (x, z, i) => {
        const s = rand(2.5, 6), y = rand(10, 45), m = new T.Mesh(displace(new T.IcosahedronGeometry(s, 2), s * 0.4, 0.5 / s, i), stoneMat(0x6d7390));
        m.position.set(x, y, z);
        addProp(m, x, z, s, y - s, y + s, 0x6d7390);
      });
    }

    // ---- craters & scorch marks (persistent battle damage on the ground) ----
    const craters = [];
    const scorchMat = new T.MeshBasicMaterial({ map: ZB.tex.scorchTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, color: 0xffffff });
    const rimMat = new T.MeshStandardMaterial({ color: st.ground2, roughness: 1, map: tex.map, normalMap: tex.normalMap });
    const decalGeo = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    function addCrater(x, z, r) {
      if (st.props === 'arena' && Math.hypot(x, z) > 50) return;
      if (craters.length > 26) {
        const old = craters.shift();
        scene.remove(old);
      }
      const g = new T.Group();
      const d = new T.Mesh(decalGeo, scorchMat);
      d.scale.set(r * 2.6, 1, r * 2.6);
      d.rotation.y = Math.random() * 6;
      d.position.y = 0.04;
      d.renderOrder = 1;
      g.add(d);
      if (r > 1.6) {
        const rim = new T.Mesh(displace(new T.TorusGeometry(r, r * 0.28, 8, 24), r * 0.25, 0.8, Math.random() * 99), rimMat);
        rim.rotation.x = Math.PI / 2;
        rim.scale.z = 0.35;
        rim.receiveShadow = rim.castShadow = true;
        g.add(rim);
      }
      g.position.set(x, 0, z);
      scene.add(g);
      craters.push(g);
    }
    return { props, addCrater, sunDir, ground, exposure: { glacier: 0.6, city: 0.95, wasteland: 0.9, realm: 1.7, arena: 1.25 }[st.id] || 1 };
  }
  ZB.buildStage = buildStage;
})();
