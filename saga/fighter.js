'use strict';
// Fighter models: anatomical bodies built from lathed/tapered shapes with PBR materials,
// detailed faces, curved hair strands, battle damage, procedural poses and a flame aura shader.
(function () {
  const T = THREE;
  T.ColorManagement.legacyMode = false; // treat hex colours as sRGB, render in linear space
  const V2 = T.Vector2;
  const lerp = (a, b, t) => a + (b - a) * t;

  const std = (color, rough, metal, extra) => new T.MeshStandardMaterial(Object.assign({ color, roughness: rough == null ? 0.7 : rough, metalness: metal || 0 }, extra || {}));
  function mk(geo, mat, x, y, z, parent) {
    const m = new T.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  }
  const grp = (x, y, z, parent) => {
    const g = new T.Group();
    g.position.set(x || 0, y || 0, z || 0);
    if (parent) parent.add(g);
    return g;
  };
  const sph = (r, ws, hs) => new T.SphereGeometry(r, ws || 20, hs || 14);

  // Rounded, tapered limb hanging down from y=0 to y=-len, with an optional muscle bulge.
  function limb(r0, r1, len, bulge, seg) {
    const pts = [], b = bulge || 0;
    for (let i = 0; i <= 4; i++) {
      const a = (i / 4) * Math.PI * 0.5;
      pts.push(new V2(Math.sin(a) * r1, -len - Math.cos(a) * r1 * 0.85));
    }
    for (let i = 1; i < 12; i++) {
      const t = 1 - i / 12, bb = b * Math.sin(Math.PI * Math.min(1, t * 1.15));
      pts.push(new V2(lerp(r0, r1, t) + bb, -len * t));
    }
    for (let i = 0; i <= 4; i++) {
      const a = Math.PI * 0.5 - (i / 4) * Math.PI * 0.5;
      pts.push(new V2(Math.max(0.0001, Math.sin(a) * r0), Math.cos(a) * r0 * 0.85));
    }
    return new T.LatheGeometry(pts, seg || 16);
  }
  // Lathed torso from a radius profile [[y, r], ...], flattened front-to-back.
  function torso(profile, width, depth) {
    const pts = profile.map(([y, r]) => new V2(Math.max(0.0001, r * width), y));
    const g = new T.LatheGeometry(pts, 28);
    g.scale(1, 1, depth);
    g.computeVertexNormals();
    return g;
  }
  // Hair strand: a cone that curves backwards and twists slightly.
  function strand(r, len, bend, flat) {
    const g = new T.ConeGeometry(r, len, 8, 6);
    g.translate(0, len / 2, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), t = y / len;
      p.setZ(i, p.getZ(i) * (flat || 0.75) - bend * t * t * len);
    }
    g.computeVertexNormals();
    return g;
  }

  // ---- Aura shader: layered flames with fbm noise ----
  const AURA_VS = `varying vec3 vN; varying vec3 vV; varying vec3 vP;
    void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix*mv; }`;
  const AURA_FS = `uniform vec3 uColor; uniform float uTime; uniform float uPower; varying vec3 vN; varying vec3 vV; varying vec3 vP;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a*n(p); p *= 2.1; a *= 0.5; } return v; }
    void main(){
      float rim = pow(1.0 - abs(dot(vN, vV)), 1.4);
      float a = atan(vP.x, vP.z);
      float f = fbm(vec2(a * 2.5, vP.y * 3.0 - uTime * 4.5));
      float tongues = smoothstep(0.35, 0.8, f + (0.6 - vP.y) * 0.35);
      float fade = smoothstep(1.0, 0.1, vP.y) * smoothstep(-1.0, -0.5, vP.y);
      float alpha = clamp(rim * tongues * fade * uPower, 0.0, 1.0);
      vec3 col = mix(uColor, vec3(1.0), tongues * 0.45) * (1.6 + tongues * 1.4);
      gl_FragColor = vec4(col * alpha, alpha);
    }`;

  const ARMORED = { rhen: 1, zorath: 1, nx9: 1, valdris: 1, oriel: 1 };

  function buildHair(style, head, mat, def, M) {
    const h = grp(0, 0, 0, head);
    const cap = (sx, sy, sz, tilt) => {
      const m = mk(new T.SphereGeometry(0.218, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), mat, 0, 0.03, -0.015, h);
      m.scale.set((sx || 1.03) * 0.8, (sy || 1) * 0.92, (sz || 1.05) * 0.9);
      m.rotation.x = -(tilt == null ? 0.55 : tilt);
      return m;
    };
    // place a strand on the scalp: (x,y,z) position, rx/rz direction, radius, length, bend
    const S = (x, y, z, rx, rz, r, len, bend) => {
      const s = mk(strand(r * 0.82, len * 0.82, bend == null ? 0.25 : bend), mat, x * 0.82, y * 0.82, z * 0.82, h);
      s.rotation.set(rx, 0, rz);
    };
    if (style === 'spiky') {
      cap();
      const L = [
        [0, 0.2, -0.05, -0.45, 0, 0.11, 0.46], [0.13, 0.18, -0.05, -0.5, -0.75, 0.1, 0.44], [-0.13, 0.18, -0.05, -0.5, 0.75, 0.1, 0.44],
        [0.2, 0.06, -0.08, -0.95, -1.3, 0.09, 0.38], [-0.2, 0.06, -0.08, -0.95, 1.3, 0.09, 0.38], [0, 0.1, -0.19, -1.45, 0, 0.11, 0.44],
        [0.12, -0.02, -0.2, -1.85, -0.6, 0.09, 0.36], [-0.12, -0.02, -0.2, -1.85, 0.6, 0.09, 0.36], [0.07, 0.15, -0.14, -1.1, -0.35, 0.1, 0.42],
        [-0.07, 0.15, -0.14, -1.1, 0.35, 0.1, 0.42], [0.21, -0.06, -0.02, -0.6, -1.9, 0.06, 0.24], [-0.21, -0.06, -0.02, -0.6, 1.9, 0.06, 0.24],
      ];
      L.forEach((a) => S(...a));
      // bangs over the forehead
      S(0.06, 0.17, 0.15, 1.15, -0.35, 0.06, 0.24, -0.3);
      S(-0.05, 0.18, 0.15, 1.05, 0.45, 0.055, 0.2, -0.3);
      S(0.0, 0.19, 0.14, 1.3, 0.05, 0.05, 0.18, -0.3);
    } else if (style === 'tall') {
      cap(1.03, 1, 1.05, 0.35);
      S(0, 0.17, -0.02, -0.12, 0, 0.17, 0.66, 0.12);
      S(0.1, 0.16, -0.02, -0.12, -0.3, 0.13, 0.56, 0.12);
      S(-0.1, 0.16, -0.02, -0.12, 0.3, 0.13, 0.56, 0.12);
      S(0.18, 0.09, -0.02, -0.1, -0.62, 0.1, 0.44, 0.1);
      S(-0.18, 0.09, -0.02, -0.1, 0.62, 0.1, 0.44, 0.1);
      S(0.05, 0.12, -0.12, -0.35, -0.15, 0.13, 0.55, 0.1);
      S(-0.05, 0.12, -0.12, -0.35, 0.15, 0.13, 0.55, 0.1);
      S(0, 0.1, -0.18, -0.6, 0, 0.12, 0.45, 0.1);
    } else if (style === 'pony') {
      cap(1.05, 1, 1.06, 0.4);
      mk(sph(0.075, 14, 10), mat, 0, 0.17, -0.16, h);
      const tail = grp(0, 0.14, -0.2, h);
      tail.rotation.x = -2.55;
      mk(strand(0.085, 0.62, -0.25, 0.9), mat, 0, 0, 0, tail);
      S(0.08, 0.15, 0.15, 1.3, -0.5, 0.05, 0.2, -0.2);
      S(-0.09, 0.15, 0.15, 1.3, 0.55, 0.05, 0.22, -0.2);
    } else if (style === 'visor') {
      const helm = mk(new T.SphereGeometry(0.222, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.56), M.metal, 0, 0.025, -0.01, h);
      helm.scale.set(0.8, 0.9, 0.88);
      const vis = new T.Mesh(new T.CylinderGeometry(0.215, 0.215, 0.05, 28, 1, true, -1.1, 2.2), new T.MeshStandardMaterial({ color: 0x000000, emissive: def.colors.eyes, emissiveIntensity: 2.2, side: T.DoubleSide }));
      vis.position.set(0, 0.015, 0.005);
      vis.scale.set(0.8, 1, 0.88);
      h.add(vis);
      mk(new T.CylinderGeometry(0.012, 0.012, 0.16, 8), M.metal, 0.215, 0.1, 0, h).rotation.z = -0.3;
    } else if (style === 'horns') {
      const dome = mk(sph(0.21, 24, 16), mat, 0, 0.06, -0.02, h);
      dome.scale.set(0.82, 0.86, 0.92);
      for (const s of [-1, 1]) {
        const horn = mk(strand(0.045, 0.34, 0.35, 1), M.horn, s * 0.14, 0.12, -0.02, h);
        horn.rotation.set(-0.2, 0, s * -0.95);
      }
    } else if (style === 'wild') {
      cap(1.07, 1, 1.09, 0.6);
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2, back = Math.cos(a);
        S(Math.sin(a) * 0.16, 0.1 + Math.cos(i * 1.7) * 0.05, -0.08 + back * 0.12, -0.7 - back * 0.85, -Math.sin(a) * 1.3, 0.09, 0.46 + (i % 3) * 0.1, 0.35);
      }
    } else if (style === 'antenna') {
      const a = mk(strand(0.035, 0.36, 0.5, 1), mat, 0, 0.17, -0.04, h);
      a.rotation.x = -0.5;
    } else if (style === 'god') {
      for (const s of [-1, 1]) {
        const ear = mk(strand(0.05, 0.3, 0.1, 0.35), M.skin, s * 0.19, 0.02, -0.01, h);
        ear.rotation.set(-0.25, 0, s * -1.25);
      }
      const crown = mk(new T.CylinderGeometry(0.145, 0.168, 0.09, 24, 1, true), M.gold, 0, 0.17, -0.01, h);
      crown.rotation.x = -0.15;
      crown.material.side = T.DoubleSide;
      mk(new T.OctahedronGeometry(0.035), new T.MeshStandardMaterial({ color: 0x000000, emissive: 0x8af3ff, emissiveIntensity: 2 }), 0, 0.19, 0.19, h);
    } else if (style === 'halo') {
      cap(1.04, 1, 1.06, 0.45);
      for (let i = 0; i < 7; i++) S((i - 3) * 0.045, 0.16 - Math.abs(i - 3) * 0.015, -0.1, -1.25, (i - 3) * -0.12, 0.08, 0.5, 0.15);
      const halo = new T.Mesh(new T.TorusGeometry(0.28, 0.022, 10, 48), new T.MeshStandardMaterial({ color: 0x000000, emissive: 0xfff2b8, emissiveIntensity: 3 }));
      halo.position.set(0, 0.45, -0.12);
      halo.rotation.x = Math.PI / 2.3;
      h.add(halo);
    }
    return h;
  }

  // GLSL value noise used to cut holes in torn clothing
  const TEAR_GLSL = `uniform float uTear; varying vec3 vBindPos;
    float th(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    float tn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(mix(th(i), th(i+vec3(1,0,0)), f.x), mix(th(i+vec3(0,1,0)), th(i+vec3(1,1,0)), f.x), f.y),
                 mix(mix(th(i+vec3(0,0,1)), th(i+vec3(1,0,1)), f.x), mix(th(i+vec3(0,1,1)), th(i+vec3(1,1,1)), f.x), f.y), f.z); }`;
  function tearable(mat) {
    const u = { value: 0 };
    mat.userData.uTear = u;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTear = u;
      sh.vertexShader = 'varying vec3 vBindPos;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vBindPos = position;');
      sh.fragmentShader = TEAR_GLSL + '\n' + sh.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        if (uTear > 0.0) {
          float n = tn(vBindPos * 6.5) * 0.6 + tn(vBindPos * 17.0) * 0.3 + tn(vBindPos * 45.0) * 0.1;
          if (n < uTear) discard;
          diffuseColor.rgb *= mix(0.22, 1.0, smoothstep(uTear, uTear + 0.035, n));
        }`,
      );
    };
    mat.customProgramCacheKey = () => 'tear';
    return mat;
  }
  const bone = (p, parent) => {
    const b = new T.Bone();
    b.position.set(p[0], p[1], p[2]);
    if (parent) parent.add(b);
    return b;
  };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

  class Model {
    constructor(def, formIdx) {
      this.def = def;
      const c = def.colors, armored = !!ARMORED[def.id], robot = def.hair === 'visor';
      this.root = new T.Group();
      const M = (this.mats = {
        skin: robot ? std(c.skin, 0.3, 0.8) : std(c.skin, 0.5, 0, { vertexColors: true }),
        gi: std(c.gi, 0.9),
        gi2: armored ? std(c.gi2, 0.3, 0.45) : std(c.gi2, 0.85),
        belt: std(c.belt, armored ? 0.35 : 0.8, armored ? 0.5 : 0),
        boots: std(c.boots, armored ? 0.3 : 0.55, armored ? 0.35 : 0.05),
        hair: std(0x222222, 0.42, 0.05),
        metal: std(0xb9c2cf, 0.25, 0.85),
        horn: std(0xece6da, 0.4),
        gold: std(0xd9b45a, 0.28, 0.9),
        white: std(0xf7f7f7, 0.12),
        dark: std(0x080808, 0.2),
      });
      this.eyeMat = new T.MeshStandardMaterial({ color: c.eyes, roughness: 0.1, emissive: 0x000000 });
      this.base = { gi: M.gi.color.clone(), gi2: M.gi2.color.clone(), belt: M.belt.color.clone(), boots: M.boots.color.clone(), gold: M.gold.color.clone(), skin: M.skin.color.clone() };
      // ---- skeleton (bone order matches sculpt.js skin weights) ----
      const J = ZB.sculpt.joints(def);
      this.J = J;
      this.tilt = bone(J.tilt, this.root);
      this.chest = bone([0, 0, 0], this.tilt);
      this.head = bone(sub(J.head, J.tilt), this.chest);
      this.arms = [];
      this.legs = [];
      const bones = [this.tilt, this.chest, this.head];
      const shs = [], els = [], fists = [], hips = [], kns = [];
      for (const s of [-1, 1]) {
        // bones start in the sculpt's A-pose; poses later set absolute rotations
        const sh = bone(sub(J.sh(s), J.tilt), this.chest), el = bone(J.loc.el, sh), fist = bone(J.loc.fist, el);
        sh.rotation.z = s * J.a0;
        shs.push(sh); els.push(el); fists.push(fist);
        this.arms.push({ sh, el, fist, s });
        const hip = bone(sub(J.hip(s), J.tilt), this.tilt), kn = bone(J.loc.kn, hip);
        hip.rotation.z = s * J.b0;
        hips.push(hip); kns.push(kn);
        this.legs.push({ hip, kn, s });
      }
      bones.push(...shs, ...els, ...fists, ...hips, ...kns);
      this.root.updateMatrixWorld(true);
      this.skeleton = new T.Skeleton(bones);
      // ---- sculpted skin + clothing ----
      this.clothMats = [];
      this.meshes = [];
      for (const p of ZB.models.get(def.id)) {
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.BufferAttribute(p.pos, 3));
        g.setAttribute('normal', new T.BufferAttribute(p.nrm, 3));
        g.setAttribute('skinIndex', new T.Uint16BufferAttribute(p.si, 4));
        g.setAttribute('skinWeight', new T.BufferAttribute(p.sw, 4));
        g.setIndex(new T.BufferAttribute(p.idx, 1));
        if (p.mat === 'skin') {
          // vertex colour tint: lips and a little warmth on the cheeks
          const n = p.pos.length / 3, col = new Float32Array(n * 3).fill(1);
          if (p.lips) {
            for (let v = 0; v < n; v++) {
              const dx = (p.pos[v * 3] - p.lips[0]) / 0.045, dy = (p.pos[v * 3 + 1] - p.lips[1]) / 0.022, dz = (p.pos[v * 3 + 2] - p.lips[2]) / 0.03;
              const lip = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy + dz * dz));
              const cx = (Math.abs(p.pos[v * 3]) - 0.085) / 0.05, cy = (p.pos[v * 3 + 1] - (p.lips[1] + 0.08)) / 0.04;
              const blush = Math.max(0, 1 - Math.sqrt(cx * cx + cy * cy)) * 0.12;
              col[v * 3] = 1 - lip * 0.15;
              col[v * 3 + 1] = 1 - lip * 0.45 - blush * 0.6;
              col[v * 3 + 2] = 1 - lip * 0.45 - blush * 0.5;
            }
          }
          g.setAttribute('color', new T.BufferAttribute(col, 3));
        }
        let mat = M[p.mat];
        if (p.tear) {
          mat = tearable(mat.clone());
          this.clothMats.push({ mat, key: p.mat, tear: p.tear });
        }
        const mesh = new T.SkinnedMesh(g, mat);
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        this.root.add(mesh);
        mesh.bind(this.skeleton, mesh.matrixWorld);
        this.meshes.push(mesh);
      }
      // ---- eyes and brows (rigid on the head bone) ----
      const hz = 0;
      this.irises = [];
      for (const s of [-1, 1]) {
        const eye = grp(s * 0.068, 0.015, hz + 0.152, this.head);
        const scl = mk(sph(0.028, 18, 14), M.white, 0, 0, -0.004, eye);
        scl.scale.set(1.12, 0.72, 0.62);
        mk(new T.CircleGeometry(0.0128, 24), this.eyeMat, 0, -0.001, 0.0137, eye);
        mk(new T.CircleGeometry(0.0062, 18), M.dark, 0, -0.001, 0.0139, eye);
        mk(new T.CircleGeometry(0.0028, 8), M.white, 0.004, 0.003, 0.0141, eye);
        eye.rotation.y = s * 0.16;
        // upper eyelid line
        const lid = mk(new T.TorusGeometry(0.03, 0.004, 6, 16, Math.PI), M.dark, 0, 0.002, 0.004, eye);
        lid.scale.set(1.08, 0.62, 1);
        const brow = mk(limb(0.008, 0.005, 0.07, 0, 6), M.hair, s * 0.032, 0.058, hz + 0.18, this.head);
        brow.rotation.z = s * (Math.PI / 2 + 0.22);
        brow.castShadow = false;
      }
      this.hairStyle = def.hair;
      this.hair = buildHair(def.hair, this.head, M.hair, def, M);
      // ---- aura ----
      this.auraU = { uColor: { value: new T.Color(0xffffff) }, uTime: { value: 0 }, uPower: { value: 0 } };
      const auraMat = new T.ShaderMaterial({ uniforms: this.auraU, vertexShader: AURA_VS, fragmentShader: AURA_FS, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
      this.aura = new T.Mesh(new T.SphereGeometry(1, 32, 24), auraMat);
      this.aura.position.y = 1.15;
      this.aura.scale.set(1.0, 1.55, 1.0);
      this.aura.renderOrder = 5;
      this.root.add(this.aura);
      this.auraPower = 0;
      this.pose = defaultPose();
      this.target = defaultPose();
      this.t = Math.random() * 10;
      this.baseScale = 1;
      this.damage = 0;
      this.setForm(formIdx || 0);
    }
    setForm(i) {
      const f = this.def.forms[Math.max(0, Math.min(i, this.def.forms.length - 1))];
      this.form = f;
      this.formIdx = i;
      const M = this.mats;
      M.hair.color.setHex(f.hair);
      const glow = i > 0 && f.hair !== this.def.forms[0].hair;
      M.hair.emissive.setHex(glow ? f.hair : 0x000000);
      M.hair.emissiveIntensity = glow ? 0.35 : 0;
      this.base.skin.setHex(f.skin || this.def.colors.skin);
      this.eyeMat.color.setHex(f.eyes || this.def.colors.eyes);
      this.eyeMat.emissive.setHex(i > 0 ? f.eyes || this.def.colors.eyes : 0x000000);
      this.eyeMat.emissiveIntensity = i > 0 ? 0.8 : 0;
      this.hair.scale.setScalar(f.hairScale || 1);
      this.auraU.uColor.value.setHex(f.aura);
      this.root.scale.setScalar(this.baseScale * (f.scale || 1));
      this.setDamage(this.damage);
    }
    // 0 = fresh, 1 = beaten up: clothes get dirty and rip open, skin gets scuffed.
    setDamage(d) {
      this.damage = d;
      const M = this.mats, dirt = new T.Color(0x3a2e24);
      for (const k of ['gi', 'gi2', 'belt', 'boots']) M[k].color.copy(this.base[k]).lerp(dirt, d * 0.3);
      M.skin.color.copy(this.base.skin).lerp(new T.Color(0x8a5a4c), d * 0.15);
      const rip = Math.max(0, (d - 0.2) / 0.8);
      for (const cm of this.clothMats) {
        cm.mat.color.copy(M[cm.key].color);
        cm.mat.userData.uTear.value = rip > 0 ? 0.18 + rip * 0.3 * cm.tear : 0;
      }
    }
    setPose(name) {
      const p = POSES[name] || POSES.idle;
      Object.assign(this.target, defaultPose(), p);
    }
    handWorld(out, side) {
      const a = this.arms[side === 'l' ? 1 : 0];
      return a.fist.getWorldPosition(out);
    }
    update(dt, aura) {
      this.t += dt;
      const k = 1 - Math.exp(-dt * 16), P = this.pose, Tg = this.target;
      for (const key in Tg) P[key] += (Tg[key] - P[key]) * k;
      const breath = Math.sin(this.t * 2.4);
      this.tilt.position.y = this.J.tilt[1] + breath * 0.04 * P.bob;
      this.chest.rotation.x = P.chest;
      this.chest.rotation.y = P.twist;
      this.chest.scale.set(1, 1 + breath * 0.008, 1 + breath * 0.012);
      this.head.rotation.x = P.head;
      const [aR, aL] = this.arms;
      aR.sh.rotation.set(P.aRx, 0, P.aRs * aR.s);
      aR.el.rotation.x = P.eR;
      aL.sh.rotation.set(P.aLx, 0, P.aLs * aL.s);
      aL.el.rotation.x = P.eL;
      const [lR, lL] = this.legs;
      lR.hip.rotation.set(P.lRx + breath * 0.05 * P.bob, 0, P.lRs * lR.s);
      lR.kn.rotation.x = P.kR;
      lL.hip.rotation.set(P.lLx - breath * 0.05 * P.bob, 0, P.lLs * lL.s);
      lL.kn.rotation.x = P.kL;
      // hair sways with motion and aura
      this.hair.rotation.x = Math.sin(this.t * 7) * 0.02 * (0.3 + this.auraPower);
      this.auraPower += (aura - this.auraPower) * (1 - Math.exp(-dt * 8));
      this.auraU.uTime.value = this.t;
      this.auraU.uPower.value = this.auraPower;
      this.aura.visible = this.auraPower > 0.02;
      const fl = 1 + Math.sin(this.t * 31) * 0.02 + this.auraPower * 0.22;
      this.aura.scale.set(fl, 1.55 * fl, fl);
    }
    dispose() {
      this.root.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
    }
  }
  function defaultPose() {
    return { chest: 0.05, twist: 0, head: 0, aRx: -0.5, aRs: 0.25, eR: -1.7, aLx: -0.5, aLs: 0.25, eL: -1.7, lRx: 0.1, lRs: 0.08, kR: 0.35, lLx: -0.35, lLs: 0.08, kL: 0.7, bob: 1 };
  }
  const POSES = {
    idle: {},
    fly: { chest: 0.15, aRx: 0.5, aRs: 0.25, eR: -0.3, aLx: 0.5, aLs: 0.25, eL: -0.3, lRx: 0.35, kR: 0.6, lLx: 0.45, kL: 0.4, bob: 0.3 },
    punchR: { twist: 0.45, chest: 0.2, aRx: -1.6, aRs: 0.02, eR: -0.05, aLx: -0.6, aLs: 0.35, eL: -1.9, bob: 0 },
    punchL: { twist: -0.45, chest: 0.2, aLx: -1.6, aLs: 0.02, eL: -0.05, aRx: -0.6, aRs: 0.35, eR: -1.9, bob: 0 },
    kick: { twist: 0.3, chest: -0.25, lRx: -1.6, lRs: 0.1, kR: 0.05, lLx: 0.3, kL: 0.5, aRx: -0.3, aRs: 0.6, eR: -1.2, aLx: -0.6, eL: -1.8, bob: 0 },
    smashWind: { twist: -0.7, chest: -0.05, aRx: 0.9, aRs: 0.45, eR: -1.4, aLx: -0.9, aLs: 0.1, eL: -1.2, bob: 0 },
    smash: { twist: 0.6, chest: 0.35, aRx: -1.75, aRs: 0.0, eR: 0, aLx: 0.4, aLs: 0.3, eL: -0.8, lLx: -0.7, kL: 0.9, lRx: 0.5, kR: 0.3, bob: 0 },
    blast: { twist: 0.25, aRx: -1.55, aRs: 0.1, eR: 0, aLx: -0.4, aLs: 0.3, eL: -1.6 },
    blast2: { twist: -0.25, aLx: -1.55, aLs: 0.1, eL: 0, aRx: -0.4, aRs: 0.3, eR: -1.6 },
    beamWind: { twist: -0.6, chest: -0.05, aRx: 0.6, aRs: -0.15, eR: -1.9, aLx: 0.6, aLs: 0.35, eL: -1.9, lLx: -0.5, kL: 0.6, bob: 0 },
    beam: { twist: 0, chest: 0.12, aRx: -1.55, aRs: -0.12, eR: 0, aLx: -1.55, aLs: -0.12, eL: 0, lLx: -0.5, kL: 0.5, lRx: 0.4, kR: 0.4, bob: 0 },
    charge: { chest: -0.15, head: -0.3, aRx: 0.15, aRs: 0.55, eR: -0.6, aLx: 0.15, aLs: 0.55, eL: -0.6, lRx: 0, lRs: 0.28, kR: 0.3, lLx: 0, lLs: 0.28, kL: 0.3, bob: 0.2 },
    transform: { chest: -0.35, head: -0.5, aRx: 0.35, aRs: 0.85, eR: -0.5, aLx: 0.35, aLs: 0.85, eL: -0.5, lRx: 0, lRs: 0.35, kR: 0.2, lLx: 0, lLs: 0.35, kL: 0.2, bob: 0 },
    guard: { chest: 0.3, head: 0.25, aRx: -1.3, aRs: -0.55, eR: -1.5, aLx: -1.3, aLs: -0.55, eL: -1.5, lRx: -0.4, kR: 1.0, lLx: -0.6, kL: 1.1, bob: 0.4 },
    hurt: { chest: -0.5, head: -0.45, aRx: 0.6, aRs: 0.7, eR: -0.3, aLx: 0.5, aLs: 0.6, eL: -0.2, lRx: 0.4, kR: 0.7, lLx: 0.1, kL: 0.4, bob: 0 },
    raise: { chest: -0.25, head: -0.45, aRx: -2.95, aRs: 0.25, eR: -0.1, aLx: -2.95, aLs: 0.25, eL: -0.1, bob: 0 },
    throw: { chest: 0.45, head: 0.1, aRx: -1.8, aRs: 0.1, eR: 0, aLx: -1.8, aLs: 0.1, eL: 0, bob: 0 },
    victory: { chest: -0.05, aRx: -2.9, aRs: 0.15, eR: -0.1, aLx: 0.1, aLs: 0.15, eL: -0.3, lRx: 0, kR: 0.1, lLx: 0, kL: 0.1 },
    ko: { chest: -0.8, head: -0.6, aRx: 0.3, aRs: 1.1, eR: -0.2, aLx: 0.3, aLs: 1.1, eL: -0.2, lRx: 0.2, kR: 0.2, lLx: -0.2, kL: 0.4, bob: 0 },
  };
  ZB.Model = Model;
  ZB.std = std;
  ZB.toon = (color) => std(color, 0.85);
})();
