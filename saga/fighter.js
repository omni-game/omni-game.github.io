'use strict';
// Cel-shaded fighter models built from primitives, with procedural poses and a shader aura.
(function () {
  const T = THREE;
  let gradient = null;
  function toonGradient() {
    if (gradient) return gradient;
    const data = new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
    gradient = new T.DataTexture(data, 3, 1, T.RGBAFormat);
    gradient.minFilter = gradient.magFilter = T.NearestFilter;
    gradient.needsUpdate = true;
    return gradient;
  }
  const toon = (color) => new T.MeshToonMaterial({ color, gradientMap: toonGradient() });
  const OUTLINE = new T.MeshBasicMaterial({ color: 0x0a0a12, side: T.BackSide });

  function mk(geo, mat, x, y, z, parent, outline) {
    const m = new T.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    if (parent) parent.add(m);
    if (outline !== false) {
      const o = new T.Mesh(geo, OUTLINE);
      o.scale.setScalar(1 + (outline || 0.07));
      m.add(o);
    }
    return m;
  }
  const grp = (x, y, z, parent) => {
    const g = new T.Group();
    g.position.set(x || 0, y || 0, z || 0);
    if (parent) parent.add(g);
    return g;
  };
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  const sph = (r, ws, hs) => new T.SphereGeometry(r, ws || 14, hs || 10);
  const cone = (r, h) => new T.ConeGeometry(r, h, 6);
  const cyl = (r1, r2, h) => new T.CylinderGeometry(r1, r2, h, 10);

  // ---- Aura shader ----
  const AURA_VS = `varying vec3 vN; varying vec3 vV; varying vec3 vP;
    void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix*mv; }`;
  const AURA_FS = `uniform vec3 uColor; uniform float uTime; uniform float uPower; varying vec3 vN; varying vec3 vV; varying vec3 vP;
    void main(){
      float rim = pow(1.0 - abs(dot(vN, vV)), 1.6);
      float a = atan(vP.x, vP.z);
      float flame = 0.5 + 0.5*sin(vP.y*7.0 - uTime*14.0 + sin(a*5.0 + uTime*3.0)*2.0);
      float top = smoothstep(1.0, 0.2, vP.y) * smoothstep(-1.0, -0.4, vP.y);
      float alpha = rim * uPower * 0.6 * (0.4 + 0.6*flame) * top;
      gl_FragColor = vec4(uColor*(0.9 + flame*0.4), alpha);
    }`;

  function buildHair(style, head, mat, def) {
    const h = grp(0, 0, 0, head);
    const cap = (sx, sy, sz, tilt) => {
      const m = mk(new T.SphereGeometry(0.275, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), mat, 0, 0.03, -0.02, h, 0.05);
      m.scale.set(sx || 1.02, sy || 1, sz || 1.04);
      m.rotation.x = -(tilt == null ? 0.55 : tilt);
      return m;
    };
    const spike = (x, y, z, rx, rz, r, len) => {
      const s = mk(cone(r, len), mat, x, y, z, h, 0.06);
      s.rotation.set(rx, 0, rz);
      s.translateY(len / 2);
    };
    if (style === 'spiky') {
      cap();
      spike(0, 0.2, -0.05, -0.3, 0, 0.12, 0.42);
      spike(0.14, 0.17, -0.06, -0.4, -0.8, 0.11, 0.4);
      spike(-0.14, 0.17, -0.06, -0.4, 0.8, 0.11, 0.4);
      spike(0.2, 0.05, -0.1, -0.9, -1.3, 0.1, 0.35);
      spike(-0.2, 0.05, -0.1, -0.9, 1.3, 0.1, 0.35);
      spike(0, 0.1, -0.2, -1.4, 0, 0.12, 0.42);
      spike(0.12, -0.02, -0.22, -1.8, -0.6, 0.1, 0.34);
      spike(-0.12, -0.02, -0.22, -1.8, 0.6, 0.1, 0.34);
      spike(0.08, 0.18, 0.16, 0.9, -0.3, 0.07, 0.22);
      spike(-0.06, 0.2, 0.16, 0.8, 0.4, 0.07, 0.2);
    } else if (style === 'tall') {
      cap();
      spike(0, 0.18, -0.02, -0.15, 0, 0.2, 0.62);
      spike(0.12, 0.16, -0.02, -0.12, -0.35, 0.14, 0.52);
      spike(-0.12, 0.16, -0.02, -0.12, 0.35, 0.14, 0.52);
      spike(0.2, 0.08, -0.02, -0.1, -0.7, 0.1, 0.4);
      spike(-0.2, 0.08, -0.02, -0.1, 0.7, 0.1, 0.4);
    } else if (style === 'pony') {
      cap(1.04, 1, 1.05, 0.45);
      mk(sph(0.11, 8, 6), mat, 0, 0.22, -0.18, h, 0.06);
      const tail = mk(cone(0.1, 0.7), mat, 0, 0.1, -0.32, h, 0.06);
      tail.rotation.x = -2.6;
    } else if (style === 'visor') {
      mk(new T.SphereGeometry(0.275, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat, 0, 0.04, -0.02, h, 0.05).scale.set(1, 0.7, 1);
      mk(box(0.42, 0.08, 0.06), new T.MeshBasicMaterial({ color: def.colors.eyes }), 0, 0.02, 0.24, h, 0.12);
      spike(0.25, 0.05, 0, 0, -1.6, 0.03, 0.18);
    } else if (style === 'horns') {
      cap(1, 0.9, 1.04, 0.3);
      spike(0.17, 0.12, 0, -0.2, -0.9, 0.06, 0.38);
      spike(-0.17, 0.12, 0, -0.2, 0.9, 0.06, 0.38);
    } else if (style === 'wild') {
      cap(1.06, 1, 1.08, 0.6);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        spike(Math.sin(a) * 0.16, 0.1 + Math.cos(i * 1.7) * 0.06, -0.08 + Math.cos(a) * 0.12, -0.6 - Math.cos(a) * 0.9, -Math.sin(a) * 1.3, 0.11, 0.42 + (i % 3) * 0.08);
      }
    } else if (style === 'antenna') {
      const a = mk(cone(0.05, 0.36), mat, 0, 0.3, -0.06, h, 0.08);
      a.rotation.x = -0.7;
      mk(sph(0.07, 8, 6), mat, 0, 0.42, -0.2, h, 0.08);
    } else if (style === 'god') {
      spike(0.26, 0.06, 0, 0, -1.3, 0.06, 0.32);
      spike(-0.26, 0.06, 0, 0, 1.3, 0.06, 0.32);
      const crown = mk(cyl(0.2, 0.24, 0.12), toon(def.colors.gi2), 0, 0.22, 0, h, 0.05);
      crown.rotation.x = -0.15;
    } else if (style === 'halo') {
      cap(1.02, 1, 1.05, 0.5);
      spike(0, 0.2, -0.05, -0.4, 0, 0.16, 0.6);
      const halo = new T.Mesh(new T.TorusGeometry(0.34, 0.035, 8, 28), new T.MeshBasicMaterial({ color: 0xfff4c2 }));
      halo.position.set(0, 0.55, -0.1);
      halo.rotation.x = Math.PI / 2.4;
      h.add(halo);
    }
    return h;
  }

  class Model {
    constructor(def, formIdx) {
      this.def = def;
      const c = def.colors, bt = def.body;
      this.root = new T.Group();
      this.mats = { skin: toon(c.skin), gi: toon(c.gi), gi2: toon(c.gi2), belt: toon(c.belt), boots: toon(c.boots), hair: toon(0x222222) };
      this.eyeMat = new T.MeshBasicMaterial({ color: c.eyes });
      const M = this.mats, slim = bt === 'slim', bulky = bt === 'bulky', blob = bt === 'blob';
      const tw = bulky ? 0.92 : slim ? 0.62 : 0.72, aw = bulky ? 0.25 : slim ? 0.15 : 0.18;
      this.tilt = grp(0, 1.0, 0, this.root);
      this.chest = grp(0, 0, 0, this.tilt);
      // torso
      if (blob) {
        this.belly = mk(sph(0.55, 16, 12), M.skin, 0, 0.2, 0.02, this.chest);
        this.belly.scale.set(1, 0.95, 0.95);
        mk(box(0.95, 0.14, 0.8), M.belt, 0, -0.08, 0, this.chest);
        mk(cyl(0.5, 0.42, 0.3), M.gi, 0, -0.25, 0, this.chest);
      } else {
        mk(box(tw, 0.72, 0.42), M.gi, 0, 0.38, 0, this.chest);
        mk(box(tw * 0.55, 0.42, 0.06), M.gi2, 0, 0.5, 0.21, this.chest, 0.02);
        mk(box(tw + 0.04, 0.12, 0.46), M.belt, 0, 0.02, 0, this.chest);
        mk(box(tw * 0.92, 0.26, 0.4), M.gi, 0, -0.12, 0, this.chest);
      }
      // neck + head
      mk(cyl(0.1, 0.12, 0.2), M.skin, 0, 0.78, 0, this.chest, 0.03);
      this.head = grp(0, blob ? 0.82 : 0.95, 0, this.chest);
      mk(sph(0.25, 16, 12), M.skin, 0, 0, 0, this.head).scale.set(0.92, 1, 0.95);
      for (const s of [-1, 1]) {
        const e = new T.Mesh(box(0.07, 0.09, 0.02), this.eyeMat);
        e.position.set(s * 0.085, 0.01, 0.23);
        this.head.add(e);
        const brow = new T.Mesh(box(0.1, 0.025, 0.02), OUTLINE);
        brow.position.set(s * 0.085, 0.08, 0.235);
        brow.rotation.z = s * -0.25;
        this.head.add(brow);
      }
      this.hairStyle = def.hair;
      this.hair = buildHair(def.hair, this.head, M.hair, def);
      // arms
      this.arms = [];
      for (const s of [-1, 1]) {
        const sx = blob ? 0.55 : tw / 2 + aw / 2 + 0.02;
        const sh = grp(s * sx, blob ? 0.35 : 0.66, 0, this.chest);
        mk(sph(aw * 0.75, 10, 8), M.gi, 0, 0, 0, sh, 0.04);
        mk(box(aw, 0.42, aw), M.skin, 0, -0.22, 0, sh);
        const el = grp(0, -0.42, 0, sh);
        mk(box(aw * 0.95, 0.36, aw * 0.95), M.skin, 0, -0.17, 0, el);
        mk(box(aw * 1.15, 0.12, aw * 1.15), M.gi2, 0, -0.28, 0, el, 0.03);
        const fist = mk(sph(aw * 0.72, 10, 8), M.skin, 0, -0.42, 0, el, 0.05);
        this.arms.push({ sh, el, fist, s });
      }
      // legs
      this.legs = [];
      const legLen = blob ? 0.38 : 0.48, lw = bulky ? 0.27 : slim ? 0.18 : 0.22;
      for (const s of [-1, 1]) {
        const hip = grp(s * (blob ? 0.22 : tw * 0.24), -0.1, 0, this.tilt);
        mk(box(lw, legLen, lw + 0.02), M.gi, 0, -legLen / 2, 0, hip);
        const kn = grp(0, -legLen, 0, hip);
        mk(box(lw * 0.95, legLen * 0.85, lw), M.gi, 0, -legLen * 0.4, 0, kn);
        mk(box(lw * 1.1, 0.2, lw * 1.5), M.boots, 0, -legLen * 0.9, 0.04, kn);
        this.legs.push({ hip, kn, s });
      }
      if (blob) this.tilt.position.y = 0.85;
      // cape for the god / emperor
      if (def.hair === 'god' || def.hair === 'halo') {
        const robe = mk(cyl(0.3, 0.55, 0.7), M.gi2, 0, -0.35, 0, this.tilt, 0.03);
        robe.material = M.gi;
      }
      // aura
      this.auraU = { uColor: { value: new T.Color(0xffffff) }, uTime: { value: 0 }, uPower: { value: 0 } };
      this.aura = new T.Mesh(
        new T.SphereGeometry(1, 24, 18),
        new T.ShaderMaterial({ uniforms: this.auraU, vertexShader: AURA_VS, fragmentShader: AURA_FS, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }),
      );
      this.aura.position.y = 1.15;
      this.aura.scale.set(1.0, 1.55, 1.0);
      this.aura.renderOrder = 5;
      this.root.add(this.aura);
      this.auraPower = 0;
      this.pose = defaultPose();
      this.target = defaultPose();
      this.t = Math.random() * 10;
      this.baseScale = bulky ? 1.12 : blob ? 1.05 : slim ? 0.98 : 1;
      this.setForm(formIdx || 0);
    }
    setForm(i) {
      const f = this.def.forms[Math.max(0, Math.min(i, this.def.forms.length - 1))];
      this.form = f;
      this.mats.hair.color.setHex(f.hair);
      this.mats.skin.color.setHex(f.skin || this.def.colors.skin);
      this.eyeMat.color.setHex(f.eyes || this.def.colors.eyes);
      this.hair.scale.setScalar(f.hairScale || 1);
      this.auraU.uColor.value.setHex(f.aura);
      const sc = this.baseScale * (f.scale || 1);
      this.root.scale.setScalar(sc);
      if (this.belly) this.belly.scale.set(f.slim ? 0.7 : 1, 0.95, f.slim ? 0.7 : 0.95);
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
      const bob = Math.sin(this.t * 2.4) * 0.04;
      this.tilt.position.y = (this.belly ? 0.85 : 1.0) + bob * P.bob;
      this.chest.rotation.x = P.chest;
      this.chest.rotation.y = P.twist;
      this.head.rotation.x = P.head;
      const [aR, aL] = this.arms;
      aR.sh.rotation.set(P.aRx, 0, P.aRs * aR.s);
      aR.el.rotation.x = P.eR;
      aL.sh.rotation.set(P.aLx, 0, P.aLs * aL.s);
      aL.el.rotation.x = P.eL;
      const [lR, lL] = this.legs;
      lR.hip.rotation.set(P.lRx + Math.sin(this.t * 2.4) * 0.05 * P.bob, 0, P.lRs * lR.s);
      lR.kn.rotation.x = P.kR;
      lL.hip.rotation.set(P.lLx - Math.sin(this.t * 2.4) * 0.05 * P.bob, 0, P.lLs * lL.s);
      lL.kn.rotation.x = P.kL;
      // aura
      this.auraPower += (aura - this.auraPower) * (1 - Math.exp(-dt * 8));
      this.auraU.uTime.value = this.t;
      this.auraU.uPower.value = this.auraPower;
      this.aura.visible = this.auraPower > 0.02;
      const fl = 1 + Math.sin(this.t * 31) * 0.03 + this.auraPower * 0.25;
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
  ZB.toon = toon;
})();
