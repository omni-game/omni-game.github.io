'use strict';
// ZENITH BURST — 3D arena battle engine: fighters, combat, supers, beam clashes, AI, camera and effects.
(function () {
  const T = THREE;
  const UP = new T.Vector3(0, 1, 0);
  const KI_MAX = 500, SKILL_MAX = 5, ARENA_R = 175, CEIL = 90;
  const v3 = () => new T.Vector3();
  const t1 = v3(), t2 = v3(), t3 = v3(), t4 = v3();
  const q1 = v3(), q2 = v3(); // FX-only temps
  const D1 = v3(), D2 = v3(), D3 = v3(); // updateFighter-only temps
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerpAngle = (a, b, t) => {
    const d = ((((b - a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
    return a + d * t;
  };
  const MELEE = ['attack', 'rushDash', 'smash', 'chaseHit', 'rushSuper'];
  const ARMOR = ['beamWind', 'bombRaise', 'novaWind', 'rushWind', 'diskRaise', 'volley', 'transform'];

  let glowTex = null;
  function glow() {
    if (glowTex) return glowTex;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(255,255,255,0.85)');
    gr.addColorStop(0.6, 'rgba(255,255,255,0.25)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    glowTex = new T.CanvasTexture(c);
    return glowTex;
  }
  const addMat = (color, opacity) => new T.MeshBasicMaterial({ color, transparent: true, opacity: opacity == null ? 0.8 : opacity, blending: T.AdditiveBlending, depthWrite: false });

  // ------------------------------------------------------------------ FX
  class FX {
    constructor(scene) {
      this.scene = scene;
      this.sprites = [];
      this.live = [];
      for (let i = 0; i < 420; i++) {
        const s = new T.Sprite(new T.SpriteMaterial({ map: glow(), transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
        s.visible = false;
        s.renderOrder = 10;
        scene.add(s);
        this.sprites.push({ s, vel: v3(), life: 0, max: 1, size: 1, grow: 0, grav: 0, drag: 0, alive: false });
      }
      this.smokes = [];
      for (let i = 0; i < 160; i++) {
        const s = new T.Sprite(new T.SpriteMaterial({ map: ZB.tex.smokeTex(), transparent: true, depthWrite: false, fog: true }));
        s.visible = false;
        s.renderOrder = 9;
        scene.add(s);
        this.smokes.push({ s, vel: v3(), life: 0, max: 1, size: 1, grow: 0, grav: 0, drag: 0, alive: false, smoke: true });
      }
      this.sIdx = 0;
      this.lights = [];
      for (let i = 0; i < 4; i++) {
        const l = new T.PointLight(0xffffff, 0, 30, 2);
        scene.add(l);
        this.lights.push({ l, life: 0, max: 1, peak: 0 });
      }
      this.rings = [];
      this.debris = [];
      this.debrisGeo = new T.DodecahedronGeometry(0.6, 0);
      this.debrisMats = {};
      this.idx = 0;
    }
    spawn(pos, vel, color, size, life, o) {
      for (let k = 0; k < this.sprites.length; k++) {
        this.idx = (this.idx + 1) % this.sprites.length;
        const p = this.sprites[this.idx];
        if (p.alive && k < this.sprites.length - 1) continue;
        p.alive = true;
        p.s.visible = true;
        p.s.position.copy(pos);
        p.vel.copy(vel);
        p.s.material.color.setHex(color);
        p.s.material.opacity = 1;
        p.size = size;
        p.s.scale.setScalar(size);
        p.life = p.max = life;
        p.grow = (o && o.grow) || 0;
        p.grav = (o && o.grav) || 0;
        p.drag = (o && o.drag) || 0;
        return p;
      }
    }
    sparks(pos, color, n, speed, size) {
      for (let i = 0; i < n; i++) {
        q1.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(0.3, 1) * (speed || 14));
        this.spawn(pos, q1, i % 3 === 0 ? 0xffffff : color, rand(0.15, 0.4) * (size || 1), rand(0.15, 0.35), { drag: 4 });
      }
      this.spawn(pos, q1.set(0, 0, 0), 0xffffff, 1.3 * (size || 1), 0.08, { grow: 4 });
    }
    burst(pos, color, r) {
      this.spawn(pos, q1.set(0, 0, 0), 0xffffff, r * 0.9, 0.18, { grow: r * 4 });
      this.spawn(pos, q1.set(0, 0, 0), color, r * 1.2, 0.4, { grow: r * 3.5 });
      const n = Math.round(8 + r * 6);
      for (let i = 0; i < n; i++) {
        q1.set(rand(-1, 1), rand(-0.4, 1), rand(-1, 1)).normalize().multiplyScalar(rand(6, 22) * Math.sqrt(r));
        this.spawn(pos, q1, i % 2 ? color : 0xffeedd, rand(0.3, 0.8) * Math.sqrt(r), rand(0.3, 0.8), { drag: 2.5, grow: 0.6 });
      }
      this.ring(pos, r * 0.5, color, null, r * 9);
      this.light(pos, color, 4 + r * 4, 12 + r * 10, 0.25 + r * 0.12);
      if (r > 0.8) for (let i = 0; i < Math.round(r * 3); i++) this.smokeAt(q2.copy(pos).add(q1.set(rand(-r, r), rand(-r, r), rand(-r, r))), q1.set(rand(-2, 2), rand(1, 3), rand(-2, 2)), new T.Color(0x6b6560), r * rand(1.2, 2), rand(1.5, 3), r * 1.2);
    }
    dust(pos, n, color, size) {
      const c = new T.Color(color || 0xc8b49a).lerp(new T.Color(0xd8d0c4), 0.35);
      for (let i = 0; i < n; i++) {
        q1.set(rand(-1, 1), rand(0.05, 0.6), rand(-1, 1)).normalize().multiplyScalar(rand(3, 11) * (size || 1));
        this.smokeAt(q2.set(pos.x + rand(-0.5, 0.5), 0.4 + Math.max(0, pos.y * 0.2), pos.z + rand(-0.5, 0.5)), q1, c, rand(1.2, 2.6) * (size || 1), rand(1.2, 2.6), 1.6 * (size || 1));
      }
    }
    smokeAt(pos, vel, color, size, life, grow) {
      this.sIdx = (this.sIdx + 1) % this.smokes.length;
      const p = this.smokes[this.sIdx];
      p.alive = true;
      p.s.visible = true;
      p.s.position.copy(pos);
      p.vel.copy(vel);
      p.s.material.color.copy(color);
      p.s.material.rotation = Math.random() * 6.28;
      p.size = size;
      p.s.scale.setScalar(size);
      p.life = p.max = life;
      p.grow = grow || 1;
      p.grav = -0.6;
      p.drag = 1.8;
      return p;
    }
    light(pos, color, peak, dist, life) {
      let best = this.lights[0];
      for (const L of this.lights) if (L.life <= 0 || L.l.intensity < best.l.intensity) best = L;
      best.l.position.copy(pos);
      best.l.color.setHex(color);
      best.l.distance = dist || 30;
      best.peak = peak;
      best.life = best.max = life || 0.35;
      best.l.intensity = peak;
    }
    // signature particles for advanced forms
    formParticles(form, c, dt, boost) {
      const kind = form.particles, n = dt * 22 * boost;
      for (let i = 0; i < 4 && Math.random() < n - i; i++) {
        const p = q2.copy(c).add(q1.set(rand(-0.7, 0.7), rand(-1.2, 1.0), rand(-0.7, 0.7)));
        if (kind === 'embers') this.spawn(p, q1.set(rand(-0.6, 0.6), rand(2.5, 5), rand(-0.6, 0.6)), Math.random() < 0.5 ? 0xff5a1a : 0xffb040, rand(0.08, 0.16), rand(0.6, 1.2), { drag: 0.6 });
        else if (kind === 'stars') this.spawn(p, q1.set(0, rand(0.1, 0.5), 0), Math.random() < 0.3 ? 0xffffff : form.aura, rand(0.1, 0.22), rand(0.25, 0.6), { grow: -0.2 });
        else if (kind === 'petals') this.spawn(p.setY(p.y + 0.8), q1.set(rand(1, 2.5), rand(-1.2, -0.4), rand(-0.8, 0.8)), Math.random() < 0.5 ? 0xff9ac8 : 0xffd6e8, rand(0.1, 0.16), rand(0.9, 1.6), { drag: 0.4 });
        else if (kind === 'sparks') this.spawn(p, q1.set(rand(-6, 6), rand(-3, 6), rand(-6, 6)), form.aura, rand(0.05, 0.1), rand(0.1, 0.22), { drag: 3 });
        else if (kind === 'void') this.smokeAt(p, q1.set(rand(-0.4, 0.4), rand(0.6, 1.6), rand(-0.4, 0.4)), new T.Color(0x14081e), rand(0.5, 0.9), rand(0.8, 1.4), 0.6);
      }
    }
    // a jagged electric arc near `center`, flickering for a few frames
    bolt(center, color, size) {
      if (!this.bolts) this.bolts = [];
      let b = this.bolts.find((x) => x.life <= 0);
      if (!b) {
        if (this.bolts.length >= 16) return;
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.BufferAttribute(new Float32Array(8 * 3), 3));
        b = { line: new T.Line(g, new T.LineBasicMaterial({ color: 0xffffff, transparent: true, blending: T.AdditiveBlending, depthWrite: false })), life: 0 };
        b.line.renderOrder = 11;
        b.line.frustumCulled = false;
        this.scene.add(b.line);
        this.bolts.push(b);
      }
      const s = size || 1, a = q1.set(rand(-0.5, 0.5), rand(-0.9, 0.9), rand(-0.5, 0.5)).multiplyScalar(s).add(center);
      const dir = q2.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(0.35, 0.7) * s);
      const pa = b.line.geometry.attributes.position;
      for (let i = 0; i < 8; i++) {
        const t = i / 7, j = i === 0 || i === 7 ? 0 : 0.12 * s;
        pa.setXYZ(i, a.x + dir.x * t + rand(-j, j), a.y + dir.y * t + rand(-j, j), a.z + dir.z * t + rand(-j, j));
      }
      pa.needsUpdate = true;
      b.line.material.color.setHex(color).multiplyScalar(2.5);
      b.line.visible = true;
      b.life = rand(0.05, 0.11);
    }
    ring(pos, r, color, normal, growth) {
      const m = new T.Mesh(new T.TorusGeometry(1, 0.08, 6, 40), addMat(color, 0.9));
      m.position.copy(pos);
      if (normal) m.lookAt(q1.copy(pos).add(normal));
      else m.rotation.x = Math.PI / 2;
      m.scale.setScalar(r);
      this.scene.add(m);
      this.rings.push({ m, life: 0.45, max: 0.45, growth: growth || 30 });
    }
    rubble(pos, color, n, power) {
      if (!this.debrisMats[color]) this.debrisMats[color] = ZB.std(color, 0.95);
      for (let i = 0; i < n; i++) {
        let d = this.debris.find((x) => !x.alive);
        if (!d) {
          if (this.debris.length > 90) break;
          d = { m: new T.Mesh(this.debrisGeo, this.debrisMats[color]), vel: v3(), spin: v3(), alive: false };
          d.m.castShadow = true;
          this.scene.add(d.m);
          this.debris.push(d);
        }
        d.m.material = this.debrisMats[color];
        d.alive = true;
        d.life = rand(1.5, 3);
        d.m.visible = true;
        d.m.position.copy(pos).add(q1.set(rand(-1, 1), rand(0, 2), rand(-1, 1)));
        d.m.scale.setScalar(rand(0.3, 1.1));
        d.vel.set(rand(-1, 1), rand(0.3, 1.2), rand(-1, 1)).multiplyScalar((power || 12) * rand(0.5, 1));
        d.spin.set(rand(-6, 6), rand(-6, 6), rand(-6, 6));
      }
    }
    update(dt) {
      for (const L of this.lights) {
        if (L.life > 0) {
          L.life -= dt;
          L.l.intensity = Math.max(0, L.peak * (L.life / L.max));
        } else L.l.intensity = 0;
      }
      for (const p of this.smokes) {
        if (!p.alive) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.alive = false;
          p.s.visible = false;
          continue;
        }
        p.vel.y -= p.grav * dt;
        p.vel.multiplyScalar(Math.exp(-p.drag * dt));
        p.s.position.addScaledVector(p.vel, dt);
        p.size += p.grow * dt;
        p.s.scale.setScalar(p.size);
        p.s.material.rotation += dt * 0.3;
        const t = p.life / p.max;
        p.s.material.opacity = Math.min(1, (1 - t) * 6) * t * 0.75;
      }
      for (const p of this.sprites) {
        if (!p.alive) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.alive = false;
          p.s.visible = false;
          p.s.material.blending = T.AdditiveBlending;
          continue;
        }
        p.vel.y -= p.grav * dt;
        if (p.drag) p.vel.multiplyScalar(Math.exp(-p.drag * dt));
        p.s.position.addScaledVector(p.vel, dt);
        p.size += p.grow * dt;
        p.s.scale.setScalar(p.size);
        p.s.material.opacity = Math.min(0.85, (p.life / p.max) * 1.4);
      }
      if (this.bolts) for (const b of this.bolts) {
        if (b.life > 0 && (b.life -= dt) <= 0) b.line.visible = false;
      }
      for (let i = this.rings.length - 1; i >= 0; i--) {
        const r = this.rings[i];
        r.life -= dt;
        r.m.scale.addScalar(r.growth * dt);
        r.m.material.opacity = Math.max(0, r.life / r.max) * 0.9;
        if (r.life <= 0) {
          this.scene.remove(r.m);
          r.m.geometry.dispose();
          r.m.material.dispose();
          this.rings.splice(i, 1);
        }
      }
      for (const d of this.debris) {
        if (!d.alive) continue;
        d.life -= dt;
        d.vel.y -= 28 * dt;
        d.m.position.addScaledVector(d.vel, dt);
        if (d.m.position.y < 0.2) {
          d.m.position.y = 0.2;
          d.vel.y *= -0.3;
          d.vel.x *= 0.6;
          d.vel.z *= 0.6;
        }
        d.m.rotation.x += d.spin.x * dt;
        d.m.rotation.y += d.spin.y * dt;
        if (d.life <= 0) {
          d.alive = false;
          d.m.visible = false;
        }
      }
    }
  }

  // ------------------------------------------------------------------ AI
  class AI {
    constructor(level) {
      this.d = clamp(level, 0.05, 1);
      this.think = 0;
      this.plan = 'press';
      this.planT = 0;
      this.strafe = Math.random() < 0.5 ? 1 : -1;
      this.guardHold = 0;
      this.chargeHold = 0;
      this.smashHold = 0;
      this.blastT = 0;
      this.reactedBeam = null;
      this.reactedKnock = null;
      this.lockForms = false;
    }
    intent(b, f, o, dt) {
      const inp = { mx: 0, mz: 0 }, d = this.d;
      const dist = f.c.distanceTo(o.c), hpR = f.hp / f.maxHp;
      this.think -= dt;
      this.planT -= dt;
      this.blastT -= dt;
      const thinkNow = this.think <= 0;
      if (thinkNow) this.think = rand(0.12, 0.5 - d * 0.32);
      // in trouble: burst out / recover
      if (f.state === 'hitstun' || f.state === 'knock') {
        if (thinkNow && f.skill >= 2 && f.comboTaken >= 4 && Math.random() < d * 0.5) {
          inp.mod = true;
          inp.guardP = true;
        } else if (f.state === 'knock' && f.st > 0.35 && thinkNow && Math.random() < d * 0.8) inp.guardP = true;
        return inp;
      }
      if (this.guardHold > 0) {
        this.guardHold -= dt;
        inp.guard = true;
        return inp;
      }
      if (this.chargeHold > 0) {
        this.chargeHold -= dt;
        const danger = dist < 10 || b.threatTo(f);
        if (!danger) {
          inp.charge = true;
          return inp;
        }
        this.chargeHold = 0;
      }
      if (f.state === 'smashCharge') {
        this.smashHold -= dt;
        inp.smash = this.smashHold > 0;
        return inp;
      }
      if (f.state === 'attack' && f.st > 0.13 && dist < 3.5 && Math.random() < 0.35 + d * 0.6) inp.rushP = true;
      if (f.state !== 'free') return inp;

      // reactions
      const beam = b.beams.find((x) => x.owner === o && !x.done);
      if (beam && this.reactedBeam !== beam) {
        this.reactedBeam = beam;
        const sup = f.def.supers.findIndex((s) => s.type === 'beam');
        if (sup >= 0 && f.ki >= f.def.supers[sup].cost && Math.random() < 0.25 + d * 0.3) {
          inp.mod = true;
          inp[sup === 0 ? 'rushP' : 'smashP'] = true;
          return inp;
        }
        if (Math.random() < 0.3 + d * 0.6) {
          inp.mx = this.strafe;
          inp.dashP = true;
          inp.dash = true;
          this.strafe *= -1;
          return inp;
        }
      }
      if (thinkNow) {
        const melee = MELEE.includes(o.state) && dist < 7;
        if (melee && Math.random() < d * 0.75) {
          this.guardHold = rand(0.25, 0.6);
          inp.guardP = inp.guard = true;
          return inp;
        }
        if (b.threatTo(f) && Math.random() < d * 0.5) {
          if (Math.random() < 0.5) {
            this.guardHold = rand(0.3, 0.6);
            inp.guardP = inp.guard = true;
          } else {
            inp.mx = this.strafe;
            inp.dashP = inp.dash = true;
          }
          return inp;
        }
        // chase a knocked opponent
        if (o.state === 'knock' && this.reactedKnock !== o.knockId && o.st < 0.45 && f.ki >= 40 && f.chain < 2) {
          this.reactedKnock = o.knockId;
          if (Math.random() < 0.2 + d * 0.6) {
            inp.rushP = true;
            return inp;
          }
        }
        // transform
        const nf = f.def.forms[f.form + 1];
        if (!this.lockForms && nf && f.form < f.maxForm && f.skill >= (nf.cost || 2) && (hpR < 0.8 || Math.random() < 0.15)) {
          inp.transformP = true;
          inp.mod = f.skill >= 4 && Math.random() < 0.5;
          return inp;
        }
        // ultimate
        if (f.spark > 0 && Math.random() < 0.3 + d * 0.4) {
          inp.mod = true;
          inp.blastP = true;
          return inp;
        }
        // supers
        const options = [];
        f.def.supers.forEach((s, i) => {
          if (f.ki < s.cost) return;
          const close = s.type === 'rush' || s.type === 'nova';
          if (close ? dist < 14 : dist > 6) options.push(i);
        });
        if (options.length && Math.random() < 0.12 + d * 0.25) {
          const i = options[Math.floor(Math.random() * options.length)];
          inp.mod = true;
          inp[i === 0 ? 'rushP' : 'smashP'] = true;
          return inp;
        }
        // sparking
        if (f.ki >= KI_MAX - 20 && !f.spark && d > 0.45 && dist > 14 && Math.random() < 0.25) {
          this.chargeHold = 1.4;
          inp.charge = true;
          return inp;
        }
        if (f.ki < 160 && dist > 18 && Math.random() < 0.35) {
          this.chargeHold = rand(0.8, 1.8);
          inp.charge = true;
          return inp;
        }
        if (this.planT <= 0) {
          this.plan = Math.random() < 0.55 + d * 0.15 ? 'press' : 'zone';
          this.planT = rand(2.5, 6);
          if (Math.random() < 0.4) this.strafe *= -1;
        }
      }
      // movement plan
      if (this.plan === 'press') {
        inp.mz = dist > 2.4 ? 1 : 0;
        inp.mx = dist > 8 ? this.strafe * 0.4 : 0;
        inp.dash = dist > 22 && f.ki > 80;
        if (dist < 3.2 && Math.random() < dt * (3 + d * 6)) {
          if (Math.random() < 0.22) {
            inp.smashP = inp.smash = true;
            this.smashHold = rand(0.1, 0.9);
          } else inp.rushP = true;
        } else if (dist < 16 && dist > 4 && Math.random() < dt * (0.6 + d)) inp.rushP = true;
      } else {
        inp.mz = dist < 14 ? -1 : dist > 26 ? 1 : 0;
        inp.mx = this.strafe;
        if (this.blastT <= 0 && f.ki > 50 && dist < 60) {
          inp.blastP = true;
          this.blastT = rand(0.18, 0.6 - d * 0.3);
        }
      }
      const dy = o.pos.y - f.pos.y;
      if (dy > 2) inp.rise = true;
      if (dy < -2) inp.sink = true;
      return inp;
    }
  }

  // ------------------------------------------------------------------ Battle
  class Battle {
    constructor(renderer, opts, ui) {
      this.r = renderer;
      this.opts = opts;
      this.ui = ui;
      this.scene = new T.Scene();
      this.cam = new T.PerspectiveCamera(62, 16 / 9, 0.1, 2000);
      this.stage = ZB.stageById(opts.stage);
      const built = ZB.buildStage(this.scene, this.stage, renderer);
      this.props = built.props;
      this.addCrater = built.addCrater;
      this.sunDir = built.sunDir;
      const night = this.stage.props === 'crystal' || this.stage.props === 'arena';
      // cool sky fill so shadows read blue-grey like real daylight
      const hemi = new T.HemisphereLight(night ? this.stage.sky[0] : 0xa9c1e8, this.stage.ground2, night ? 1.1 : 0.75);
      this.exposure = built.exposure;
      this.scene.add(hemi);
      this.sun = new T.DirectionalLight(this.stage.sun, this.stage.props === 'crystal' || this.stage.props === 'arena' ? 2.2 : 3.0);
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(2048, 2048);
      this.sun.shadow.bias = -0.0004;
      this.sun.shadow.normalBias = 0.03;
      const sc = this.sun.shadow.camera;
      sc.left = sc.bottom = -36;
      sc.right = sc.top = 36;
      sc.near = 1;
      sc.far = 260;
      this.beamLights = [0, 1].map(() => {
        const l = new T.PointLight(0xffffff, 0, 40, 2);
        this.scene.add(l);
        return l;
      });
      this.post = ZB.quality === 'low' ? null : ZB.post || (ZB.post = new ZB.Post(renderer));
      this.frameDt = 0.016;
      this.scene.add(this.sun, this.sun.target);
      this.fx = new FX(this.scene);
      this.time = 0;
      this.timer = opts.time || 0;
      this.projectiles = [];
      this.beams = [];
      this.bombs = [];
      this.novas = [];
      this.clash = null;
      this.freeze = 0;
      this.slow = 1;
      this.slowT = 0;
      this.shake = 0;
      this.cine = null;
      this.over = false;
      this.paused = false;
      this.events = (opts.events || []).map((e) => Object.assign({ fired: false }, e));
      this.p1 = this.makeFighter(opts.p1, 0, -18);
      this.p2 = this.makeFighter(opts.p2, 1, 18);
      this.p1.opp = this.p2;
      this.p2.opp = this.p1;
      if (opts.p2.ai != null) {
        this.p2.ai = new AI(opts.p2.ai);
        this.p2.ai.lockForms = !!opts.lockEnemyForms;
      }
      if (opts.p1.ai != null) this.p1.ai = new AI(opts.p1.ai);
      this.camPos = v3().set(0, 5, -32);
      this.camLook = v3();
      this.intro = 2.2;
      this.stats = { superFinish: false, time: 0 };
    }
    makeFighter(o, team, z) {
      const def = ZB.byId(o.id), model = new ZB.Model(def, o.form || 0);
      this.scene.add(model.root);
      const f = {
        def, model, team, pos: v3().set(team ? 2 : -2, 4, z), vel: v3(), c: v3(), yaw: team ? Math.PI : 0,
        hp: def.hp, maxHp: def.hp, ki: 150, skill: 1, skillT: 0, form: o.form || 0, maxForm: o.maxForm == null ? o.form || 0 : o.maxForm,
        spark: 0, sparkCharge: 0, state: 'free', st: 0, dur: 0, combo: 0, queued: false, cd: 0, guardT: 9, invuln: 0,
        chain: 0, comboTaken: 0, comboHits: 0, knockId: 0, poseT: 0, poseName: null, hitDone: false, cur: null, step: v3(), spin: 0,
        infiniteKi: !!o.infiniteKi, dummy: !!o.dummy,
      };
      f.c.copy(f.pos).y += 1.15;
      return f;
    }
    dmgMult(f) { return f.def.pow * f.model.form.mult * (f.spark > 0 ? 1.1 : 1); }
    spdMult(f) { return f.def.spd * (1 + (f.model.form.mult - 1) * 0.35) * (f.spark > 0 ? 1.12 : 1); }
    defMult(f) { return 1 + (f.model.form.mult - 1) * 0.5; }
    set(f, s, dur) {
      f.state = s;
      f.st = 0;
      f.dur = dur || 0;
      f.hitDone = false;
    }
    banner(f, text, kind) { this.ui.banner && this.ui.banner(text, kind || '', f ? f.team : -1); }
    say(f, text) { if (f === this.p1) this.ui.toast && this.ui.toast(text); }
    shakeIt(a) { this.shake = Math.max(this.shake, a); }
    slowmo(scale, dur) { this.slow = scale; this.slowT = dur; }
    threatTo(f) {
      for (const p of this.projectiles) {
        if (p.owner === f) continue;
        t1.subVectors(f.c, p.pos);
        if (t1.length() < 16 && t1.dot(p.vel) > 0) return true;
      }
      for (const bm of this.bombs) if (bm.owner !== f && bm.phase === 'fly') return true;
      return false;
    }

    // ---------------- main update
    update(dt, inp) {
      if (this.paused) return this.render();
      dt = Math.min(dt, 1 / 30);
      this.frameDt = dt;
      if (this.slowT > 0) {
        this.slowT -= dt;
        if (this.slowT <= 0) this.slow = 1;
      }
      let w = dt * this.slow;
      if (this.freeze > 0) {
        this.freeze -= dt;
        w = 0;
      }
      if (this.intro > 0) {
        this.intro -= dt;
        w = 0;
        if (this.intro <= 0) this.banner(null, 'FIGHT!', 'fight');
      }
      const { p1, p2 } = this;
      for (const f of [p1, p2]) f.c.copy(f.pos).y += 1.15 * f.model.root.scale.y;
      if (w > 0 && !this.over) {
        this.time += w;
        this.stats.time = this.time;
        const i1 = p1.ai ? p1.ai.intent(this, p1, p2, w) : inp || {};
        const i2 = p2.dummy ? this.dummyIntent(p2) : p2.ai ? p2.ai.intent(this, p2, p1, w) : {};
        this.updateFighter(p1, p2, i1, w);
        this.updateFighter(p2, p1, i2, w);
        this.separate();
        this.updateProjectiles(w);
        this.updateBeams(w, i1, i2);
        this.updateBombs(w);
        this.updateNovas(w);
        this.checkEvents();
        if (this.opts.goal === 'survive' && this.timer > 0) {
          this.timer -= w;
          if (this.timer <= 0) {
            this.timer = 0;
            this.finish(true, 'survived');
          }
        }
      } else if (w > 0 && this.over) {
        this.updateFighter(p1, p2, {}, w);
        this.updateFighter(p2, p1, {}, w);
        this.updateProjectiles(w);
        this.updateBeams(w, {}, {});
        this.updateBombs(w);
        this.updateNovas(w);
      }
      if (this.over) {
        this.overT -= dt;
        if (this.overT <= 0 && !this.ended) {
          this.ended = true;
          ZB.audio.chargeLoop(false);
          this.opts.onEnd(this.result);
        }
      }
      for (const f of [p1, p2]) this.animate(f, w);
      this.fx.update(w || dt * 0.05);
      this.updateCamera(dt);
      this.render();
    }
    dummyIntent() {
      return {};
    }
    render() {
      const c = this.r.domElement;
      const wdt = c.clientWidth, hgt = c.clientHeight;
      if (this.cam.aspect !== wdt / hgt) {
        this.cam.aspect = wdt / hgt;
        this.cam.updateProjectionMatrix();
      }
      if (this.post) {
        this.post.comp.uniforms.exposure.value = this.exposure;
        this.post.render(this.scene, this.cam, this.frameDt);
      } else {
        this.r.toneMappingExposure = this.exposure;
        this.r.render(this.scene, this.cam);
        this.r.toneMappingExposure = 1;
      }
    }

    // ---------------- fighter logic
    updateFighter(f, o, inp, dt) {
      f.st += dt;
      f.cd -= dt;
      f.guardT += dt;
      f.invuln -= dt;
      f.poseT -= dt;
      if (f.state !== 'ko' && !this.over) {
        f.skillT += dt;
        if (f.skillT >= 14) {
          f.skillT = 0;
          if (f.skill < SKILL_MAX) f.skill++;
        }
        f.ki = Math.min(KI_MAX, f.ki + (3 + (f.def.kiRegen || 0)) * dt);
        if (f.infiniteKi) f.ki = KI_MAX;
        if (f.spark > 0) {
          f.spark -= dt;
          if (f.spark <= 0) {
            f.spark = 0;
            this.say(f, 'Sparking ended');
          }
          if (Math.random() < dt * 14) this.fx.spawn(t1.copy(f.c).add(t2.set(rand(-1, 1), rand(-1.2, 1.2), rand(-1, 1))), t3.set(0, 2, 0), 0xffffff, 0.35, 0.15);
        }
      }
      const dir = D1.subVectors(o.c, f.c), dist = dir.length();
      dir.divideScalar(dist || 1);
      const fwdH = D2.set(dir.x, 0, dir.z);
      if (fwdH.lengthSq() < 1e-4) fwdH.set(Math.sin(f.yaw), 0, Math.cos(f.yaw));
      fwdH.normalize();
      if (!['knock', 'ko', 'held'].includes(f.state)) f.yaw = lerpAngle(f.yaw, Math.atan2(fwdH.x, fwdH.z), 1 - Math.exp(-dt * 14));
      const right = D3.set(-fwdH.z, 0, fwdH.x); // camera-right relative to facing
      const spd = 15 * this.spdMult(f);
      const canBurst = ['free', 'hitstun', 'knock', 'charge', 'guard', 'stagger'].includes(f.state);
      if (inp.mod && inp.guardP && canBurst && f.skill >= 2) return this.burst(f, o);

      switch (f.state) {
        case 'free': {
          if (inp.transformP) {
            if (this.tryTransform(f, o, !!inp.mod)) break;
          }
          if (inp.mod && (inp.rushP || inp.smashP || inp.blastP)) {
            this.useSuper(f, o, inp.rushP ? 0 : inp.smashP ? 1 : 2);
            if (f.state !== 'free') break;
          } else if (inp.charge) {
            this.set(f, 'charge');
            f.sparkCharge = 0;
            break;
          } else if (inp.guard) {
            this.set(f, 'guard');
            if (inp.guardP) f.guardT = 0;
            break;
          } else if (inp.rushP) {
            if (o.state === 'knock' && o.st < 0.75 && f.ki >= 40 && f.chain < 3) {
              this.vanishChase(f, o);
              break;
            }
            f.combo = 0;
            if (dist > 2.4 && dist < 34) this.set(f, 'rushDash', 0.6);
            else this.startAttack(f);
            break;
          } else if (inp.smashP) {
            this.set(f, 'smashCharge', 1.0);
            break;
          } else if (inp.blastP && f.cd <= 0) this.kiBlast(f, o);
          // movement
          const desired = t4.set(0, 0, 0).addScaledVector(fwdH, inp.mz || 0).addScaledVector(right, inp.mx || 0);
          let s = spd;
          const moving = desired.lengthSq() > 0.01;
          if (inp.dashP) {
            if (f.ki >= 15) {
              f.ki -= 15;
              if (moving) f.step.copy(desired).normalize().multiplyScalar(46);
              else f.step.copy(dir).multiplyScalar(46);
              f.invuln = Math.max(f.invuln, 0.12);
              this.fx.ring(f.c, 0.8, f.model.form.aura, dir, 14);
              ZB.audio.play('dash');
            }
          }
          if (inp.dash && f.ki > 0 && moving) {
            s *= 2.2;
            if (f.spark <= 0) f.ki = Math.max(0, f.ki - 22 * dt);
          }
          desired.multiplyScalar(s);
          desired.y += ((inp.rise ? 1 : 0) - (inp.sink ? 1 : 0)) * spd * 0.85;
          f.vel.lerp(desired, 1 - Math.exp(-dt * 9));
          f.step.multiplyScalar(Math.exp(-dt * 7));
          f.pos.addScaledVector(f.vel, dt).addScaledVector(f.step, dt);
          f.moveAura = inp.dash && moving ? 0.7 : 0;
          break;
        }
        case 'charge': {
          f.vel.multiplyScalar(Math.exp(-dt * 8));
          f.pos.addScaledVector(f.vel, dt);
          if (!inp.charge) {
            this.set(f, 'free');
            break;
          }
          f.ki = Math.min(KI_MAX, f.ki + 135 * dt);
          if (f.ki >= KI_MAX && f.spark <= 0) {
            f.sparkCharge += dt;
            if (f.sparkCharge > 0.9) this.enterSparking(f);
          }
          if (Math.random() < dt * 30) this.fx.spawn(t4.copy(f.pos).add(t1.set(rand(-1.2, 1.2), rand(0, 0.6), rand(-1.2, 1.2))), t1.set(0, rand(6, 12), 0), f.model.form.aura, rand(0.4, 0.8), 0.5, { drag: 1 });
          if (f.pos.y < 1 && Math.random() < dt * 6) this.fx.dust(f.pos, 1);
          break;
        }
        case 'guard': {
          f.vel.multiplyScalar(Math.exp(-dt * 10));
          f.pos.addScaledVector(f.vel, dt);
          if (!inp.guard) this.set(f, 'free');
          break;
        }
        case 'rushDash': {
          const sp = 50 * this.spdMult(f);
          f.vel.copy(dir).multiplyScalar(sp);
          f.pos.addScaledVector(f.vel, dt);
          if (Math.random() < dt * 40) this.fx.spawn(f.c, t4.set(0, 0, 0), f.model.form.aura, 0.8, 0.2);
          if (dist < 2.2) this.startAttack(f);
          else if (f.st > f.dur) {
            this.set(f, 'free');
            f.vel.multiplyScalar(0.3);
          }
          break;
        }
        case 'attack': {
          const fin = f.combo === 4;
          if (dist > 1.7) f.pos.addScaledVector(dir, dt * 14);
          f.vel.multiplyScalar(Math.exp(-dt * 12));
          if (f.st > 0.12 && inp.rushP) f.queued = true;
          if (!f.hitDone && f.st >= 0.08) {
            f.hitDone = true;
            if (dist < 3.0) {
              const dmg = [230, 230, 270, 290, 470][f.combo];
              this.hit(f, o, fin ? { dmg, kb: 34, dir: t4.copy(dir).add(t2.set(0, 0.18, 0)).normalize(), heavy: true } : { dmg, stun: 0.42, push: 3, dir: t4.copy(dir) });
            } else ZB.audio.play('whiff');
          }
          if (f.st >= f.dur) {
            if (f.queued && !fin) {
              f.combo++;
              this.startAttack(f, true);
            } else this.set(f, 'free');
          }
          break;
        }
        case 'chaseHit': {
          f.vel.set(0, 0, 0);
          if (!f.hitDone && f.st >= 0.07) {
            f.hitDone = true;
            const dirs = [t4.set(0, -1, 0), t4.copy(dir).setY(0.9).normalize(), t4.copy(dir)];
            const d = dirs[f.chain % 3].clone();
            if (o.pos.y < 3 && d.y < 0) d.set(dir.x, 0.8, dir.z).normalize();
            this.hit(f, o, { dmg: 340, kb: 36, dir: d, heavy: true, chase: true });
          }
          if (f.st >= 0.32) this.set(f, 'free');
          break;
        }
        case 'smashCharge': {
          f.vel.multiplyScalar(Math.exp(-dt * 8));
          f.pos.addScaledVector(f.vel, dt);
          if (f.st > 0.3 && Math.random() < dt * 20) this.fx.spawn(t4.copy(f.c), t1.set(rand(-3, 3), rand(-3, 3), rand(-3, 3)), f.model.form.aura, 0.5, 0.25);
          if (!inp.smash || f.st >= f.dur) {
            f.cur = { p: Math.min(1, f.st / f.dur) };
            this.set(f, 'smash', 0.45);
          }
          break;
        }
        case 'smash': {
          if (f.st < 0.14 && dist > 1.8) f.pos.addScaledVector(dir, dt * (28 + 20 * f.cur.p));
          if (!f.hitDone && f.st >= 0.13) {
            f.hitDone = true;
            if (dist < 3.4) {
              const p = f.cur.p;
              this.hit(f, o, { dmg: 450 + 750 * p, kb: 28 + 26 * p, dir: t4.copy(dir).add(t2.set(0, 0.25, 0)).normalize(), heavy: true, guardBreak: p > 0.6 });
            } else ZB.audio.play('whiff');
          }
          if (f.st >= f.dur) this.set(f, 'free');
          break;
        }
        case 'hitstun':
        case 'stagger': {
          f.vel.multiplyScalar(Math.exp(-dt * 6));
          f.pos.addScaledVector(f.vel, dt);
          if (f.st >= f.dur) this.recover(f);
          break;
        }
        case 'knock': {
          f.vel.multiplyScalar(Math.exp(-dt * 2.2));
          f.pos.addScaledVector(f.vel, dt);
          f.spin += dt * 14;
          if (f.pos.y <= 0.05 && f.vel.y < -6) {
            f.vel.y *= -0.35;
            f.vel.x *= 0.6;
            f.vel.z *= 0.6;
            this.fx.dust(f.pos, 8, this.stage.ground);
            this.fx.rubble(f.pos, this.stage.ground2, 4, 9);
            if (f.vel.y > 7) this.addCrater(f.pos.x, f.pos.z, 1.4 + f.vel.y * 0.05);
            this.shakeIt(0.4);
            ZB.audio.play('heavy');
          }
          this.propCrash(f);
          if (f.st > 0.35 && (inp.guardP || inp.dashP)) {
            this.recover(f);
            this.fx.ring(f.c, 1, 0xffffff, null, 12);
            ZB.audio.play('vanish');
          } else if (f.st >= f.dur) this.recover(f);
          break;
        }
        case 'held': {
          f.vel.set(0, 0, 0);
          break;
        }
        case 'transform': {
          f.vel.multiplyScalar(0.9);
          f.invuln = 0.2;
          if (!f.hitDone && f.st > 0.8) {
            f.hitDone = true;
            f.form = f.cur.to;
            f.model.setForm(f.form);
            this.fx.burst(f.c, f.model.form.aura, 3);
            this.fx.ring(f.c, 1, f.model.form.aura, null, 40);
            this.fx.dust(f.pos, 20, this.stage.ground);
            this.fx.rubble(t4.copy(f.pos).setY(0), this.stage.ground2, 8, 16);
            this.shakeIt(1.2);
            this.banner(f, f.model.form.name.toUpperCase() + '!', 'form');
            if (dist < 10 && o.state !== 'ko') this.hit(f, o, { dmg: 0, kb: 22, dir: t4.copy(dir), heavy: false, noFx: true, unblockable: true });
          }
          if (Math.random() < dt * 40) this.fx.spawn(t4.copy(f.pos).add(t1.set(rand(-2, 2), rand(0, 1), rand(-2, 2))), t1.set(0, rand(8, 16), 0), f.model.form.aura, rand(0.5, 1), 0.6);
          if (f.st >= f.dur) this.set(f, 'free');
          break;
        }
        case 'beamWind': {
          f.vel.multiplyScalar(0.9);
          if (Math.random() < dt * 30) {
            f.model.handWorld(t4, 'r');
            this.fx.spawn(t4.add(t1.set(rand(-1.5, 1.5), rand(-1.5, 1.5), rand(-1.5, 1.5))), t1.set(0, 0, 0), f.cur.s.color, 0.4, 0.3, { grow: -1 });
          }
          if (f.st >= f.dur) {
            this.fireBeam(f, o);
            this.set(f, 'beamFire', 9);
          }
          break;
        }
        case 'beamFire': {
          f.vel.set(0, 0, 0);
          if (!f.beam || f.beam.done) this.set(f, 'free');
          break;
        }
        case 'rushWind': {
          f.vel.multiplyScalar(0.9);
          if (f.st >= f.dur) this.set(f, 'rushSuper', 0.75);
          break;
        }
        case 'rushSuper': {
          f.vel.copy(dir).multiplyScalar(70);
          f.pos.addScaledVector(f.vel, dt);
          this.fx.spawn(f.c, t4.set(0, 0, 0), f.cur.s.color, 1.2, 0.25);
          if (dist < 2.4 && o.state !== 'ko') {
            if (o.state === 'guard' && f.cur.ult !== true && o.guardT > 0.25) {
              this.hit(f, o, { dmg: f.cur.dmg * 0.4, kb: 18, dir: t4.copy(dir), super: true });
              this.set(f, 'free');
            } else if (o.invuln > 0) this.set(f, 'free');
            else {
              this.set(f, 'rushCombo', f.cur.ult ? 2.0 : 1.4);
              this.set(o, 'held');
              f.cur.hits = 0;
              f.vel.set(0, 0, 0);
              this.cine = { who: f, t: 0, dur: f.dur, mode: 'side' };
            }
          } else if (f.st >= f.dur) this.set(f, 'free');
          break;
        }
        case 'rushCombo': {
          if (o.state === 'ko') {
            this.set(f, 'free');
            break;
          }
          const n = f.cur.ult ? 10 : 6, every = (f.dur - 0.3) / n;
          if (f.cur.hits < n && f.st >= every * (f.cur.hits + 1)) {
            f.cur.hits++;
            const a = f.cur.hits * 2.3;
            f.pos.copy(o.pos).add(t4.set(Math.cos(a) * 1.8, Math.sin(f.cur.hits) * 0.8, Math.sin(a) * 1.8));
            f.yaw = Math.atan2(o.pos.x - f.pos.x, o.pos.z - f.pos.z);
            f.poseName = ['punchR', 'kick', 'punchL', 'smash'][f.cur.hits % 4];
            f.poseT = every;
            this.hitRaw(f, o, (f.cur.dmg * 0.6) / n, true);
            this.fx.ring(o.c, 1, f.cur.s.color, null, 20);
          }
          if (f.st >= f.dur) {
            f.poseName = 'smash';
            f.poseT = 0.3;
            this.set(f, 'free');
            o.state = 'free';
            this.hit(f, o, { dmg: f.cur.dmg * 0.4, kb: 45, dir: t4.copy(dir).setY(0.35).normalize(), heavy: true, super: true, unblockable: true });
          }
          break;
        }
        case 'volley': {
          f.vel.multiplyScalar(0.9);
          const n = 14;
          if (f.st > 0.25 && (f.cur.n || 0) < n && f.st >= 0.25 + (f.cur.n || 0) * 0.08) {
            f.cur.n = (f.cur.n || 0) + 1;
            f.poseName = f.cur.n % 2 ? 'blast' : 'blast2';
            f.poseT = 0.1;
            f.model.handWorld(t4, f.cur.n % 2 ? 'r' : 'l');
            const v = t2.copy(dir).add(t3.set(rand(-0.35, 0.35), rand(-0.3, 0.35), rand(-0.35, 0.35))).normalize().multiplyScalar(48);
            this.spawnBlast(f, t4, v, (f.cur.dmg * (f.cur.ult ? 1 : 1)) / n, f.cur.s.color, 0.85, 2.5, true);
            ZB.audio.play('blast');
          }
          if (f.st >= f.dur) this.set(f, 'free');
          break;
        }
        case 'bombRaise': {
          f.vel.multiplyScalar(0.9);
          const bm = f.cur.bomb;
          if (bm) {
            bm.r = (0.3 + 2.7 * Math.min(1, f.st / f.dur)) * (f.cur.s.size || 1) * (f.cur.ult ? 1.4 : 1);
            bm.pos.copy(f.pos).y += 3 + bm.r;
          }
          if (f.st >= f.dur) {
            if (bm) {
              bm.phase = 'fly';
              bm.vel.subVectors(o.c, bm.pos).normalize().multiplyScalar(30);
            }
            this.set(f, 'bombThrow', 0.5);
          }
          break;
        }
        case 'diskRaise': {
          f.vel.multiplyScalar(0.9);
          if (f.st >= f.dur) {
            f.model.handWorld(t4, 'r');
            const p = this.spawnBlast(f, t4.add(t3.set(0, 1.2, 0)), t2.copy(dir).multiplyScalar(36), f.cur.dmg, f.cur.s.color, 1.3, 4.5, true);
            p.kind = 'disk';
            p.homing = 3.2;
            p.kb = 26;
            p.life = 4;
            p.mesh.material.opacity = 0;
            p.disk = new T.Mesh(new T.TorusGeometry(1.1, 0.15, 6, 24), addMat(f.cur.s.color, 0.9));
            p.disk.add(new T.Mesh(new T.CircleGeometry(1.0, 24), addMat(0xffffff, 0.35)));
            this.scene.add(p.disk);
            ZB.audio.play('ki');
            this.set(f, 'bombThrow', 0.4);
          }
          break;
        }
        case 'bombThrow': {
          f.vel.multiplyScalar(0.9);
          if (f.st >= f.dur) this.set(f, 'free');
          break;
        }
        case 'novaWind': {
          f.vel.multiplyScalar(0.85);
          if (Math.random() < dt * 40) this.fx.spawn(t4.copy(f.c).add(t1.set(rand(-4, 4), rand(-3, 3), rand(-4, 4))), t1.subVectors(f.c, t4).multiplyScalar(3), f.cur.s.color, 0.6, 0.3);
          if (f.st >= f.dur) {
            this.spawnNova(f);
            this.set(f, 'novaHold', 0.8);
          }
          break;
        }
        case 'novaHold': {
          f.vel.set(0, 0, 0);
          f.invuln = 0.1;
          if (f.st >= f.dur) this.set(f, 'free');
          break;
        }
        case 'ko': {
          f.vel.multiplyScalar(Math.exp(-dt * 1.5));
          f.vel.y -= 14 * dt;
          f.pos.addScaledVector(f.vel, dt);
          f.spin += dt * 6;
          if (f.pos.y <= 0 && f.vel.y < 0) {
            if (f.vel.y < -5) {
              this.fx.dust(f.pos, 10, this.stage.ground);
              if (!f.craterDone) this.addCrater(f.pos.x, f.pos.z, 2.2);
              f.craterDone = true;
            }
            f.vel.y *= -0.25;
            f.vel.x *= 0.5;
            f.vel.z *= 0.5;
          }
          break;
        }
        case 'win': {
          f.vel.multiplyScalar(0.9);
          break;
        }
      }
      // bounds
      if (f.pos.y < 0) f.pos.y = 0;
      if (f.pos.y > CEIL) f.pos.y = CEIL;
      const h = Math.hypot(f.pos.x, f.pos.z);
      if (h > ARENA_R) {
        f.pos.x *= ARENA_R / h;
        f.pos.z *= ARENA_R / h;
      }
      // player charge sound
      if (f === this.p1 && !f.ai) ZB.audio.chargeLoop(f.state === 'charge');
    }
    recover(f) {
      this.set(f, 'free');
      f.comboTaken = 0;
      f.opp.chain = 0;
      f.vel.multiplyScalar(0.2);
    }
    startAttack(f, cont) {
      this.set(f, 'attack', f.combo === 4 ? 0.42 : 0.27);
      f.queued = false;
      if (!cont) f.combo = 0;
      f.vel.multiplyScalar(0.2);
      ZB.audio.play('whiff');
    }
    vanishChase(f, o) {
      f.ki -= 40;
      f.chain++;
      this.fx.ring(f.c, 1, 0xffffff, null, 14);
      // appear ahead of where the target is flying
      const ahead = t4.copy(o.vel).normalize();
      if (ahead.lengthSq() < 0.1) ahead.set(0, 0, 1);
      f.pos.copy(o.pos).addScaledVector(ahead, 2.2);
      f.pos.y = Math.max(0, f.pos.y);
      f.yaw = Math.atan2(o.pos.x - f.pos.x, o.pos.z - f.pos.z);
      f.vel.set(0, 0, 0);
      o.vel.multiplyScalar(0.1);
      o.st = Math.min(o.st, 0.3);
      ZB.audio.play('vanish');
      this.set(f, 'chaseHit');
      f.c.copy(f.pos).y += 1.15;
    }
    burst(f, o) {
      f.skill -= 2;
      this.set(f, 'free');
      f.invuln = 0.5;
      f.comboTaken = 0;
      this.fx.ring(f.c, 1, f.model.form.aura, null, 30);
      this.fx.burst(f.c, f.model.form.aura, 1.5);
      ZB.audio.play('boom');
      this.banner(f, 'BURST!', 'small');
      this.shakeIt(0.6);
      if (f.c.distanceTo(o.c) < 8 && o.state !== 'ko') {
        if (o.state === 'held' || o.state === 'rushCombo') o.state = 'free';
        this.hit(f, o, { dmg: 120, kb: 30, dir: t4.subVectors(o.c, f.c).normalize(), unblockable: true });
      }
    }
    enterSparking(f) {
      f.spark = 14;
      f.sparkCharge = 0;
      this.set(f, 'free');
      this.fx.burst(f.c, 0xffffff, 2);
      this.fx.ring(f.c, 1, f.model.form.aura, null, 35);
      this.shakeIt(0.8);
      ZB.audio.play('spark');
      this.banner(f, 'SPARKING!', 'spark');
    }
    tryTransform(f, o, jump) {
      if (jump) {
        // skip straight to the highest form the skill orbs can pay for (its cost + 1 for skipping)
        for (let k = f.maxForm; k > f.form + 1; k--) {
          const c = (f.def.forms[k].cost || 2) + 1;
          if (f.skill >= c) {
            f.skill -= c;
            this.startTransform(f, k);
            return true;
          }
        }
      }
      const nf = f.def.forms[f.form + 1];
      if (!nf || f.form >= f.maxForm) {
        this.say(f, f.form >= f.def.forms.length - 1 ? 'Already at max form' : 'Form locked — unlock it in Story');
        return false;
      }
      const cost = nf.cost || 2;
      if (f.skill < cost) {
        this.say(f, `Need ${cost} skill orbs`);
        return false;
      }
      f.skill -= cost;
      this.startTransform(f, f.form + 1);
      return true;
    }
    startTransform(f, to) {
      this.set(f, 'transform', 1.5);
      f.cur = { to };
      this.cine = { who: f, t: 0, dur: 1.5, mode: 'orbit' };
      ZB.audio.play('transform');
    }
    useSuper(f, o, idx) {
      const ult = idx === 2, s = ult ? f.def.ultimate : f.def.supers[idx];
      if (ult) {
        if (!(f.spark > 0)) return this.say(f, 'Ultimate needs SPARKING (hold charge at full ki)');
        f.spark = 0;
      } else {
        if (f.ki < s.cost) return this.say(f, 'Not enough ki');
        f.ki -= s.cost;
      }
      if (f === this.p1) ZB.resetTouchMod && ZB.resetTouchMod(document.getElementById('touch'));
      f.cur = { s, ult, dmg: s.dmg };
      this.banner(f, s.name, ult ? 'ult' : 'super');
      if (ult) {
        this.slowmo(0.3, 0.9);
        if (this.post) this.post.flash = 0.25;
        this.ui.letterbox && this.ui.letterbox(1.6);
      }
      this.cine = { who: f, t: 0, dur: ult ? 1.0 : 0.55, mode: 'front' };
      switch (s.type) {
        case 'beam': this.set(f, 'beamWind', ult ? 1.0 : 0.7); ZB.audio.play('beamStart'); break;
        case 'rush': this.set(f, 'rushWind', 0.3); ZB.audio.play('charge'); break;
        case 'volley': this.set(f, 'volley', 1.5); f.cur.n = 0; break;
        case 'bomb': {
          this.set(f, 'bombRaise', ult ? 1.3 : 0.9);
          f.cur.bomb = this.spawnBomb(f, s, ult);
          ZB.audio.play('charge');
          break;
        }
        case 'disk': this.set(f, 'diskRaise', 0.45); break;
        case 'nova': this.set(f, 'novaWind', ult ? 0.9 : 0.5); ZB.audio.play('charge'); break;
      }
    }

    // ---------------- damage
    hit(a, t, h) {
      if (t.state === 'ko' || this.over) return false;
      if (t.invuln > 0 && !h.unblockable) return false;
      // vanish counter: guard pressed right before a melee hit lands
      if (h.dir) h.dir = h.dir.clone();
      if (!h.unblockable && !h.super && !h.ki && t.state === 'guard' && t.guardT < 0.25 && t.ki >= 60) return this.vanishCounter(t, a);
      const guarding = t.state === 'guard' && !h.unblockable;
      let dmg = (h.dmg * this.dmgMult(a)) / this.defMult(t);
      if (guarding && h.guardBreak) {
        this.banner(t, 'GUARD BREAK', 'small');
        this.set(t, 'stagger', 0.8);
        dmg *= 0.5;
        this.damage(a, t, dmg, h);
        this.fx.sparks(t.c, 0xffffff, 14, 18, 1.4);
        ZB.audio.play('heavy');
        this.freeze = 0.1;
        return true;
      }
      if (guarding) {
        dmg *= h.super ? 0.3 : h.ki ? 0.2 : 0.1;
        this.damage(a, t, dmg, h);
        t.ki = Math.max(0, t.ki - 6);
        t.vel.addScaledVector(h.dir || t1.set(0, 0, 0), h.kb ? 10 : 3);
        this.fx.sparks(t.c, 0x9fd8ff, 6, 8, 0.8);
        ZB.audio.play('guard');
        this.freeze = 0.03;
        return 'guard';
      }
      this.damage(a, t, dmg, h);
      if (t.hp <= 0) return true;
      if (h.ki && !h.super && !h.kb && ARMOR.includes(t.state)) {
        this.fx.sparks(t.c, a.model.form.aura, 5, 8, 0.7);
        ZB.audio.play('guard');
        return true;
      }
      t.comboTaken++;
      if (h.kb) {
        this.set(t, 'knock', 0.5 + h.kb / 70);
        t.knockId++;
        t.vel.copy(h.dir).multiplyScalar(h.kb);
      } else if (!h.noState) {
        this.set(t, 'hitstun', h.stun || 0.35);
        t.hitVar = Math.random() < 0.5 ? 1 : 0;
        if (h.dir) t.vel.copy(h.dir).multiplyScalar(h.push || 2);
      }
      if (!h.noFx) {
        this.fx.sparks(t.c, a.model.form.aura, h.heavy ? 18 : 9, h.heavy ? 20 : 12, h.heavy ? 1.4 : 0.9);
        if (h.heavy) {
          this.fx.ring(t.c, 0.6, 0xffffff, h.dir, 22);
          this.fx.light(t.c, a.model.form.aura, 6, 14, 0.2);
        }
        ZB.audio.play(h.heavy ? 'heavy' : 'hit');
        this.freeze = Math.max(this.freeze, h.heavy ? 0.09 : 0.045);
        this.shakeIt(h.heavy ? 0.5 : 0.18);
      }
      return true;
    }
    hitRaw(a, t, dmg, heavy) {
      this.damage(a, t, (dmg * this.dmgMult(a)) / this.defMult(t), { super: true });
      this.fx.sparks(t.c, a.model.form.aura, 12, 16, 1.2);
      ZB.audio.play(heavy ? 'heavy' : 'hit');
      this.freeze = 0.04;
      this.shakeIt(0.4);
    }
    damage(a, t, dmg, h) {
      if (dmg <= 0) return;
      // story events keep a fighter alive until the scripted moment
      const pending = this.events.find((e) => !e.fired && (e.who === 'player' ? t === this.p1 : t === this.p2));
      t.hp -= dmg;
      if (pending && t.hp <= t.maxHp * pending.below) {
        t.hp = Math.max(t.hp, Math.min(t.maxHp * pending.below, t.maxHp * 0.05));
      }
      if (this.opts.mode === 'training' && t.hp < t.maxHp * 0.1) t.hp = t.maxHp;
      t.ki = Math.min(KI_MAX, t.ki + dmg * 0.02);
      a.ki = Math.min(KI_MAX, a.ki + dmg * 0.012);
      a.comboHits = (a.hitClock > this.time - 1.6 ? a.comboHits : 0) + 1;
      a.hitClock = this.time;
      this.ui.combo && this.ui.combo(a.team, a.comboHits, Math.round(dmg));
      if (t.hp <= 0) this.ko(a, t, h);
    }
    vanishCounter(t, a) {
      t.ki -= 60;
      this.fx.ring(t.c, 1, 0xffffff, null, 18);
      this.fx.spawn(t.c, t1.set(0, 0, 0), 0xffffff, 3, 0.2);
      const back = t1.set(Math.sin(a.yaw), 0, Math.cos(a.yaw));
      t.pos.copy(a.pos).addScaledVector(back, -2.3);
      t.pos.y = Math.max(0, t.pos.y + 0.3);
      t.yaw = a.yaw;
      this.set(t, 'free');
      t.invuln = 0.3;
      this.set(a, 'stagger', 0.55);
      ZB.audio.play('vanish');
      this.banner(t, 'VANISH!', 'small');
      return 'vanish';
    }
    ko(a, t, h) {
      t.hp = 0;
      this.set(t, 'ko');
      t.vel.copy((h && h.dir) || t1.set(0, 0.5, 0)).multiplyScalar(26);
      t.vel.y = Math.max(t.vel.y, 8);
      this.slowmo(0.25, 1.4);
      this.shakeIt(1.2);
      ZB.audio.play('ko');
      const sup = !!(h && h.super);
      if (sup && a === this.p1) this.stats.superFinish = true;
      this.banner(null, sup ? 'SUPER FINISH!' : 'K.O.!', 'ko');
      if (this.post) this.post.flash = 0.6;
      this.cine = { who: t, t: 0, dur: 2.2, mode: 'ko' };
      this.finish(t !== this.p1, sup ? 'super' : 'ko');
    }
    finish(win, how) {
      if (this.over) return;
      this.over = true;
      this.overT = how === 'survived' ? 2.2 : 3.2;
      const w = win ? this.p1 : this.p2;
      if (w.state !== 'ko') {
        this.set(w, 'win');
        w.spark = 0;
      }
      if (how === 'survived') this.banner(null, 'SURVIVED!', 'ko');
      this.result = { win, how, hpRatio: this.p1.hp / this.p1.maxHp, superFinish: this.stats.superFinish, time: this.time };
    }

    // ---------------- projectiles
    kiBlast(f, o) {
      const cost = 12;
      if (f.ki < cost && f.spark <= 0) return this.say(f, 'Not enough ki');
      if (f.spark <= 0) f.ki -= cost;
      f.cd = 0.16;
      f.blastSide = !f.blastSide;
      f.poseName = f.blastSide ? 'blast' : 'blast2';
      f.poseT = 0.18;
      f.model.handWorld(t4, f.blastSide ? 'r' : 'l');
      const v = t2.subVectors(o.c, t4).normalize().multiplyScalar(52);
      this.spawnBlast(f, t4, v, 105, f.model.form.aura, 0.7, 1.6, false);
      ZB.audio.play('blast');
    }
    spawnBlast(owner, pos, vel, dmg, color, size, homing, isSuper) {
      const mesh = new T.Sprite(new T.SpriteMaterial({ map: glow(), color, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      mesh.scale.setScalar(size * 2.2);
      mesh.position.copy(pos);
      const core = new T.Sprite(new T.SpriteMaterial({ map: glow(), color: 0xffffff, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      core.scale.setScalar(0.5);
      mesh.add(core);
      this.scene.add(mesh);
      const p = { owner, pos: mesh.position, vel: vel.clone(), dmg, color, r: size, life: 3, homing, mesh, super: isSuper, kind: 'ki', kb: 0 };
      this.projectiles.push(p);
      return p;
    }
    killProjectile(i) {
      const p = this.projectiles[i];
      this.scene.remove(p.mesh);
      p.mesh.material.dispose();
      if (p.disk) {
        this.scene.remove(p.disk);
        p.disk.geometry.dispose();
      }
      this.projectiles.splice(i, 1);
    }
    updateProjectiles(dt) {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i], tg = p.owner.opp;
        p.life -= dt;
        if (p.homing && tg.state !== 'ko') {
          const sp = p.vel.length();
          t1.subVectors(tg.c, p.pos).normalize().multiplyScalar(sp);
          p.vel.lerp(t1, Math.min(1, p.homing * dt)).setLength(sp);
        }
        p.pos.addScaledVector(p.vel, dt);
        if (p.disk) {
          p.disk.position.copy(p.pos);
          p.disk.rotation.x = Math.PI / 2;
          p.disk.rotation.z += dt * 20;
        }
        if (Math.random() < dt * 20) this.fx.spawn(p.pos, t2.set(0, 0, 0), p.color, p.r * 0.6, 0.15);
        let dead = p.life <= 0;
        if (!dead && tg.state !== 'ko' && p.pos.distanceTo(tg.c) < p.r + 0.9) {
          const res = this.hit(p.owner, tg, { dmg: p.dmg, ki: true, stun: p.kind === 'disk' ? 0 : 0.28, push: 3, kb: p.kb || undefined, dir: t3.copy(p.vel).normalize(), super: p.super, heavy: p.kind === 'disk' });
          if (res !== false) dead = true;
        }
        if (!dead && p.pos.y < 0.2) {
          dead = true;
          this.fx.dust(p.pos, 3, this.stage.ground);
        }
        if (!dead) {
          for (const pr of this.props) {
            if (pr.alive && this.inProp(pr, p.pos, p.r)) {
              dead = true;
              if (p.super) this.breakProp(pr);
              break;
            }
          }
        }
        if (dead) {
          this.fx.burst(p.pos, p.color, p.super ? 0.45 : 0.25);
          this.killProjectile(i);
        }
      }
    }
    inProp(pr, pos, r) {
      return pos.y + r > pr.y0 && pos.y - r < pr.y1 && Math.hypot(pos.x - pr.x, pos.z - pr.z) < pr.r + r;
    }
    breakProp(pr) {
      if (!pr.alive) return;
      pr.alive = false;
      this.scene.remove(pr.mesh);
      const c = t4.set(pr.x, (pr.y0 + pr.y1) / 2, pr.z);
      this.fx.rubble(c, pr.color, 14, 18);
      this.fx.dust(c, 10, pr.color);
      ZB.audio.play('boom');
    }
    propCrash(f) {
      const sp = f.vel.length();
      if (sp < 10) return;
      for (const pr of this.props) {
        if (pr.alive && this.inProp(pr, f.c, 0.8)) {
          this.breakProp(pr);
          f.vel.multiplyScalar(0.35);
          if (f.hp > 0) {
            const pending = this.events.find((e) => !e.fired && (e.who === 'player' ? f === this.p1 : f === this.p2));
            f.hp -= 160;
            if (pending) f.hp = Math.max(f.hp, f.maxHp * 0.05);
            if (f.hp <= 0) {
              f.hp = 1;
            }
          }
          this.shakeIt(0.8);
          break;
        }
      }
    }

    // ---------------- beams
    fireBeam(f, o) {
      const s = f.cur.s, w = (s.width || 1.4) * (f.cur.ult ? 1.25 : 1);
      const geo = new T.CylinderGeometry(1, 1, 1, 16, 1, true);
      geo.rotateX(Math.PI / 2);
      geo.translate(0, 0, 0.5);
      const g = new T.Group();
      const outer = new T.Mesh(geo, addMat(s.color, 0.55));
      const core = new T.Mesh(geo, addMat(0xffffff, 0.9));
      core.scale.set(0.45, 0.45, 1);
      const head = new T.Mesh(new T.SphereGeometry(1, 16, 12), addMat(s.color, 0.7));
      const headCore = new T.Mesh(new T.SphereGeometry(0.6, 12, 10), addMat(0xffffff, 0.95));
      const beamBody = new T.Group();
      beamBody.add(outer, core);
      g.add(beamBody, head, headCore);
      this.scene.add(g);
      f.model.handWorld(t4, 'r');
      f.model.handWorld(t3, 'l');
      const origin = t4.add(t3).multiplyScalar(0.5).clone();
      const bm = { owner: f, origin, dir: t1.subVectors(o.c, origin).normalize().clone(), len: 0.5, w, s, dmg: f.cur.dmg, ult: f.cur.ult, g, beamBody, head, headCore, done: false, hit: false, fade: 0, life: 0 };
      this.beams.push(bm);
      f.beam = bm;
      ZB.audio.play('beamFire');
      this.shakeIt(0.5);
    }
    updateBeams(dt, i1, i2) {
      for (const l of this.beamLights) l.intensity = 0;
      if (this.clash) this.updateClash(dt, i1, i2);
      for (let i = this.beams.length - 1; i >= 0; i--) {
        const b = this.beams[i], tg = b.owner.opp;
        b.life += dt;
        if (!b.clash && !b.hit && b.fade === 0) {
          b.len += 95 * dt;
          if (tg.state !== 'ko') {
            t1.subVectors(tg.c, b.origin).normalize();
            if (t1.dot(b.dir) > 0.6) b.dir.lerp(t1, Math.min(1, dt * 0.9)).normalize();
          }
          const head = t2.copy(b.origin).addScaledVector(b.dir, b.len);
          // clash check
          const other = this.beams.find((x) => x !== b && !x.done && !x.hit && x.fade === 0 && !x.clash && x.owner !== b.owner);
          if (other) {
            const oh = t3.copy(other.origin).addScaledVector(other.dir, other.len);
            if (head.distanceTo(oh) < b.w + other.w + 2.5) this.startClash(b, other);
          }
          if (!b.clash) {
            // hit check: distance from target to beam segment
            const segD = this.segDist(tg.c, b.origin, b.dir, b.len);
            if (tg.state !== 'ko' && segD < b.w + 0.7 && tg.invuln <= 0) {
              b.hit = true;
              b.fade = 0.6;
              this.hit(b.owner, tg, { dmg: b.dmg, kb: 40, dir: t3.copy(b.dir), heavy: true, super: true, ki: true });
              this.fx.burst(tg.c, b.s.color, b.ult ? 3 : 2);
              ZB.audio.play(b.ult ? 'bigboom' : 'boom');
              this.shakeIt(1);
            }
            for (const pr of this.props) {
              if (pr.alive && this.inProp(pr, head, b.w)) this.breakProp(pr);
            }
            if (head.y < 0.5 && b.len > 4) {
              b.fade = 0.5;
              this.fx.burst(head, b.s.color, 2.5);
              this.fx.rubble(head, this.stage.ground2, 12, 20);
              this.fx.dust(head, 12, this.stage.ground, 1.5);
              this.addCrater(head.x, head.z, b.w * 3);
              ZB.audio.play('boom');
            }
            if (b.len > 170) b.fade = 0.5;
          }
        }
        if (b.fade > 0) {
          b.fade -= dt;
          if (b.fade <= 0) {
            b.done = true;
            this.scene.remove(b.g);
            b.g.traverse((o) => {
              if (o.geometry) o.geometry.dispose();
              if (o.material) o.material.dispose();
            });
            this.beams.splice(i, 1);
            continue;
          }
        }
        // visuals
        const k = b.fade > 0 ? b.fade / 0.6 : 1, wob = 1 + Math.sin(b.life * 50) * 0.06;
        b.g.position.copy(b.origin);
        b.g.lookAt(t1.copy(b.origin).add(b.dir));
        b.beamBody.scale.set(b.w * k * wob, b.w * k * wob, Math.max(0.01, b.len));
        b.head.position.set(0, 0, b.len);
        b.head.scale.setScalar(b.w * 1.7 * k * wob);
        b.headCore.position.set(0, 0, b.len);
        b.headCore.scale.setScalar(b.w * 1.2 * k);
        const bl = this.beamLights[i % 2];
        bl.color.setHex(b.s.color);
        bl.position.copy(b.origin).addScaledVector(b.dir, b.len);
        bl.intensity = 10 * k * b.w;
        if (Math.random() < dt * 30) this.fx.spawn(t1.copy(b.origin).addScaledVector(b.dir, Math.random() * b.len), t2.set(rand(-4, 4), rand(-4, 4), rand(-4, 4)), b.s.color, b.w * 0.6, 0.3);
      }
    }
    segDist(p, o, dir, len) {
      const tt = clamp(t4.subVectors(p, o).dot(dir), 0, len);
      return t4.copy(o).addScaledVector(dir, tt).distanceTo(p);
    }
    startClash(a, b) {
      const pa = a.owner === this.p1 ? a : b, pb = pa === a ? b : a;
      a.clash = b.clash = true;
      this.clash = { a: pa, b: pb, p: 0, t: 0 };
      this.banner(null, 'BEAM CLASH!', 'clash');
      this.ui.mash && this.ui.mash(true, 0);
      ZB.audio.play('bigboom');
    }
    updateClash(dt, i1, i2) {
      const c = this.clash, A = c.a, B = c.b;
      c.t += dt;
      const press = (inp) => (inp.rushP || inp.smashP || inp.blastP || inp.guardP || inp.dashP ? 1 : 0);
      const aiRate = (f) => (f.ai ? (3 + f.ai.d * 7) * dt : 0);
      let pa = press(i1) * 0.065 + (Math.random() < aiRate(A.owner) ? 0.065 : 0);
      let pb = press(i2) * 0.065 + (Math.random() < aiRate(B.owner) ? 0.065 : 0);
      pa *= this.dmgMult(A.owner) * (A.ult ? 1.3 : 1);
      pb *= this.dmgMult(B.owner) * (B.ult ? 1.3 : 1);
      c.p = clamp(c.p + pa - pb, -1, 1);
      this.ui.mash && this.ui.mash(true, c.p);
      const m = t1.copy(A.origin).lerp(B.origin, 0.5 + c.p * 0.42);
      for (const bm of [A, B]) {
        bm.dir.subVectors(m, bm.origin);
        bm.len = bm.dir.length();
        bm.dir.normalize();
      }
      if (Math.random() < dt * 40) this.fx.spawn(m, t2.set(rand(-12, 12), rand(-12, 12), rand(-12, 12)), Math.random() < 0.5 ? A.s.color : B.s.color, rand(1, 2.5), 0.35);
      if (Math.random() < dt * 8) ZB.audio.play('clash');
      this.fx.spawn(m, t2.set(0, 0, 0), 0xffffff, rand(4, 6) * Math.max(A.w, B.w), 0.06);
      this.shake = Math.max(this.shake, 0.25);
      if (Math.abs(c.p) >= 1 || c.t > 8) {
        const win = c.t > 8 ? null : c.p > 0 ? A : B, lose = win === A ? B : A;
        this.clash = null;
        this.ui.mash && this.ui.mash(false);
        A.clash = B.clash = false;
        this.fx.burst(m, 0xffffff, 3.5);
        ZB.audio.play('bigboom');
        this.shakeIt(1.5);
        if (!win) {
          A.fade = B.fade = 0.4;
          for (const bm of [A, B]) this.hit(bm.owner.opp, bm.owner, { dmg: 500, kb: 30, dir: t3.copy(bm.dir).negate(), unblockable: true, heavy: true });
        } else {
          lose.fade = 0.3;
          win.hit = true;
          win.fade = 0.7;
          win.dir.subVectors(lose.owner.c, win.origin);
          win.len = win.dir.length();
          win.dir.normalize();
          this.hit(win.owner, lose.owner, { dmg: win.dmg * 1.2, kb: 45, dir: t3.copy(win.dir), heavy: true, super: true, unblockable: true });
          this.banner(win.owner, 'CLASH WON!', 'small');
        }
      }
    }

    // ---------------- bombs and novas
    spawnBomb(f, s, ult) {
      const g = new T.Group();
      const outer = new T.Mesh(new T.SphereGeometry(1, 20, 16), addMat(s.color, 0.6));
      const core = new T.Mesh(new T.SphereGeometry(0.75, 16, 12), addMat(0xffffff, 0.55));
      g.add(outer, core);
      this.scene.add(g);
      const bm = { owner: f, pos: g.position, vel: v3(), r: 0.3, g, s, dmg: f.cur.dmg, ult, phase: 'grow', life: 6 };
      bm.pos.copy(f.pos).y += 3;
      this.bombs.push(bm);
      return bm;
    }
    updateBombs(dt) {
      for (let i = this.bombs.length - 1; i >= 0; i--) {
        const b = this.bombs[i], tg = b.owner.opp;
        b.g.scale.setScalar(b.r * (1 + Math.sin(this.time * 30) * 0.03));
        if (b.phase === 'grow') {
          if (b.owner.state !== 'bombRaise') {
            if (b.owner.state !== 'bombThrow') b.phase = 'fly';
          }
          if (Math.random() < 0.5) this.fx.spawn(t1.copy(b.pos).add(t2.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(b.r * 2.5)), t3.subVectors(b.pos, t1).multiplyScalar(2), b.s.color, 0.5, 0.4);
          continue;
        }
        b.life -= dt;
        if (tg.state !== 'ko') {
          t1.subVectors(tg.c, b.pos).normalize().multiplyScalar(30);
          b.vel.lerp(t1, Math.min(1, dt * 1.1));
        }
        b.pos.addScaledVector(b.vel, dt);
        let boom = b.life <= 0 || b.pos.y - b.r < 0 || b.pos.distanceTo(tg.c) < b.r + 1;
        for (const pr of this.props) if (pr.alive && this.inProp(pr, b.pos, b.r)) boom = true;
        if (boom) {
          const R = b.r * 2.4;
          this.fx.burst(b.pos, b.s.color, Math.min(R * 0.3, 3));
          this.fx.rubble(t1.copy(b.pos).setY(0.5), this.stage.ground2, 16, 24);
          if (b.pos.y - R < 3) {
            this.fx.dust(b.pos, 16, this.stage.ground, 1.8);
            this.addCrater(b.pos.x, b.pos.z, R * 0.55);
          }
          if (this.post) this.post.flash = Math.max(this.post.flash, 0.35);
          ZB.audio.play('bigboom');
          this.shakeIt(1.4);
          if (tg.state !== 'ko' && b.pos.distanceTo(tg.c) < R + 1) this.hit(b.owner, tg, { dmg: b.dmg, kb: 40, dir: t2.subVectors(tg.c, b.pos).normalize(), heavy: true, super: true, ki: true });
          for (const pr of this.props) if (pr.alive && Math.hypot(pr.x - b.pos.x, pr.z - b.pos.z) < R + pr.r && b.pos.y - R < pr.y1) this.breakProp(pr);
          this.scene.remove(b.g);
          b.g.traverse((o) => {
            if (o.geometry) o.geometry.dispose();
            if (o.material) o.material.dispose();
          });
          this.bombs.splice(i, 1);
        }
      }
    }
    spawnNova(f) {
      const s = f.cur.s, R = 11 * (s.size || 1) * (f.cur.ult ? 1.2 : 1);
      const m = new T.Mesh(new T.SphereGeometry(1, 24, 18), addMat(s.color, 0.45));
      const core = new T.Mesh(new T.SphereGeometry(0.8, 20, 14), addMat(0xffffff, 0.4));
      m.add(core);
      m.position.copy(f.c);
      this.scene.add(m);
      this.novas.push({ owner: f, m, r: 0.5, R, t: 0, dmg: f.cur.dmg, s, hit: false });
      this.fx.ring(f.c, 1, s.color, null, R * 3);
      if (f.pos.y < R * 0.5) {
        this.fx.dust(f.pos, 20, this.stage.ground, 1.8);
        this.addCrater(f.pos.x, f.pos.z, R * 0.6);
      }
      this.fx.light(f.c, s.color, 14, 50, 0.8);
      ZB.audio.play('bigboom');
      this.shakeIt(1.3);
    }
    updateNovas(dt) {
      for (let i = this.novas.length - 1; i >= 0; i--) {
        const n = this.novas[i], tg = n.owner.opp;
        n.t += dt;
        n.r = n.R * Math.min(1, n.t / 0.45);
        n.m.scale.setScalar(n.r);
        n.m.material.opacity = Math.max(0, 0.45 * (1 - Math.max(0, n.t - 0.45) / 0.5));
        n.m.children[0].material.opacity = n.m.material.opacity;
        if (!n.hit && tg.state !== 'ko' && n.m.position.distanceTo(tg.c) < n.r + 1) {
          n.hit = true;
          this.hit(n.owner, tg, { dmg: n.dmg, kb: 42, dir: t1.subVectors(tg.c, n.m.position).normalize(), heavy: true, super: true, ki: true });
        }
        for (const pr of this.props) if (pr.alive && this.inProp(pr, n.m.position, n.r)) this.breakProp(pr);
        if (n.t > 0.95) {
          this.scene.remove(n.m);
          n.m.geometry.dispose();
          n.m.material.dispose();
          this.novas.splice(i, 1);
        }
      }
    }
    separate() {
      const a = this.p1, b = this.p2;
      if (a.state === 'held' || b.state === 'held' || a.state === 'ko' || b.state === 'ko') return;
      const d = t1.subVectors(b.pos, a.pos), l = d.length();
      if (l < 1.3 && l > 0.001) {
        d.multiplyScalar((1.3 - l) / l / 2);
        a.pos.sub(d);
        b.pos.add(d);
      }
    }
    checkEvents() {
      for (const e of this.events) {
        if (e.fired) continue;
        const f = e.who === 'player' ? this.p1 : this.p2;
        if (f.state === 'ko' || f.hp / f.maxHp > e.below) continue;
        if (['held', 'rushCombo', 'beamFire', 'beamWind', 'transform'].includes(f.state) || this.clash) continue;
        e.fired = true;
        this.paused = true;
        ZB.audio.chargeLoop(false);
        this.opts.onEvent(e, () => {
          this.paused = false;
          if (e.heal) f.hp = Math.min(f.maxHp, f.hp + f.maxHp * e.heal);
          if (e.form != null) {
            f.maxForm = Math.max(f.maxForm, e.form);
            f.vel.set(0, 0, 0);
            if (f.state === 'knock' || f.state === 'hitstun') f.state = 'free';
            this.startTransform(f, e.form);
          }
          f.ki = Math.max(f.ki, 300);
        });
        return;
      }
    }

    // ---------------- animation + camera
    animate(f, dt) {
      const m = f.model;
      const dmg = Math.max(0, Math.min(1, 1 - f.hp / f.maxHp));
      if (dmg - m.damage > 0.03) m.setDamage(dmg);
      m.root.position.copy(f.pos);
      m.root.rotation.y = f.yaw;
      let pose = 'idle', aura = f.form > 0 ? 0.28 : 0;
      if (f.spark > 0) aura = 0.75;
      const s = f.state;
      if (s === 'free') {
        const sp = f.vel.length();
        pose = sp > 20 ? 'fly' : 'idle';
        aura = Math.max(aura, f.moveAura || 0);
        const fw = t1.set(Math.sin(f.yaw), 0, Math.cos(f.yaw)), rt = t2.set(-fw.z, 0, fw.x);
        const lean = clamp(f.vel.dot(fw) / 40, -0.4, 0.9), side = clamp(f.vel.dot(rt) / 40, -0.5, 0.5);
        m.tilt.rotation.x += (lean - m.tilt.rotation.x) * Math.min(1, dt * 8);
        m.tilt.rotation.z += (side - m.tilt.rotation.z) * Math.min(1, dt * 8);
        if (f.pos.y < 0.4 && sp < 4) pose = 'idle';
      } else {
        m.tilt.rotation.z *= 0.9;
        if (s !== 'knock' && s !== 'ko') m.tilt.rotation.x *= 0.85;
      }
      if (s === 'charge') { pose = 'charge'; aura = 1.1; }
      else if (s === 'guard') pose = 'guard';
      else if (s === 'rushDash') { pose = 'fly'; aura = Math.max(aura, 0.6); m.tilt.rotation.x = 0.9; }
      else if (s === 'attack') pose = ['punchR', 'punchL', 'kick', 'punchR', 'smash'][f.combo];
      else if (s === 'chaseHit') pose = f.st < 0.07 ? 'smashWind' : 'smash';
      else if (s === 'smashCharge') { pose = 'smashWind'; aura = Math.max(aura, 0.3 + f.st * 0.7); }
      else if (s === 'smash') pose = f.st < 0.1 ? 'smashWind' : 'smash';
      else if (s === 'hitstun' || s === 'stagger' || s === 'held') pose = 'hurt';
      else if (s === 'knock') { pose = 'hurt'; m.tilt.rotation.x = -f.spin; }
      else if (s === 'transform') { pose = 'transform'; aura = 1.5; }
      else if (s === 'beamWind') { pose = 'beamWind'; aura = 0.9; }
      else if (s === 'beamFire') { pose = 'beam'; aura = 0.9; }
      else if (s === 'rushWind') { pose = 'charge'; aura = 1; }
      else if (s === 'rushSuper') { pose = 'fly'; aura = 1; m.tilt.rotation.x = 1.0; }
      else if (s === 'rushCombo') { pose = 'punchR'; aura = 1; }
      else if (s === 'volley') aura = 0.8;
      else if (s === 'bombRaise' || s === 'diskRaise') { pose = 'raise'; aura = 0.9; }
      else if (s === 'bombThrow') pose = 'throw';
      else if (s === 'novaWind') { pose = 'charge'; aura = 1.3; }
      else if (s === 'novaHold') { pose = 'transform'; aura = 1.3; }
      else if (s === 'ko') { pose = 'ko'; aura = 0; m.tilt.rotation.x = f.pos.y < 0.3 ? -1.5 : -f.spin; }
      else if (s === 'win') pose = 'victory';
      if (f.poseT > 0 && f.poseName && (s === 'free' || s === 'volley' || s === 'rushCombo')) pose = f.poseName;
      // keyframed clips for moves that have them
      const prog = (d) => Math.min(1, f.st / Math.max(0.001, d));
      const idx = ZB.ROSTER.indexOf(f.def);
      let clip = null, ct = 0;
      if (this.intro > 0 && s === 'free') { clip = ['introCrack', 'introPoint', 'introStance'][idx % 3]; ct = 1 - this.intro / 2.2; }
      else if (s === 'attack') { clip = ['jab', 'cross', 'roundhouse', 'uppercut', 'hammer'][f.combo]; ct = prog(f.dur); }
      else if (s === 'smashCharge') { clip = 'smashWindup'; ct = prog(f.dur); }
      else if (s === 'smash') { clip = 'smashHit'; ct = prog(f.dur); }
      else if (s === 'chaseHit') { clip = 'knee'; ct = prog(0.32); }
      else if (s === 'hitstun' || s === 'stagger') { clip = f.hitVar ? 'hurtGut' : 'hurtHead'; ct = prog(f.dur); }
      else if (s === 'transform') { clip = 'powerup'; ct = prog(f.dur); }
      else if (s === 'win') { clip = ['winPump', 'winCross', 'winFlex'][idx % 3]; ct = f.st * 0.6; }
      if (clip) m.setClip(clip, ct);
      else m.setPose(pose);
      // forms with lightning crackle with electric arcs
      const lc = m.form.lightning;
      if (lc && s !== 'ko' && Math.random() < (dt || 0) * (s === 'charge' || s === 'transform' ? 30 : 9)) this.fx.bolt(f.c, lc, 1.3 * m.root.scale.y);
      if (m.form.particles && s !== 'ko') this.fx.formParticles(m.form, f.c, dt || 0, s === 'charge' || s === 'transform' ? 3 : 1);
      m.update(dt || 0.0001, aura);
    }
    updateCamera(dt) {
      const p = this.p1, o = this.p2, cam = this.cam;
      let pos = t1, look = t2;
      if (this.cine) {
        const c = this.cine;
        c.t += dt;
        const w = c.who, fwd = t3.set(Math.sin(w.yaw), 0, Math.cos(w.yaw));
        if (c.mode === 'orbit') {
          const a = w.yaw + 0.6 + c.t * 1.2;
          pos.set(w.c.x + Math.sin(a) * 6.5, w.c.y + 0.6, w.c.z + Math.cos(a) * 6.5);
          look.copy(w.c);
        } else if (c.mode === 'front') {
          pos.copy(w.c).addScaledVector(fwd, 4.5).add(t4.set(fwd.z * 2, 0.4, -fwd.x * 2));
          look.copy(w.c);
        } else if (c.mode === 'side') {
          const mid = t4.copy(p.c).lerp(o.c, 0.5);
          pos.copy(mid).add(t3.set(fwd.z * 9, 2.5, -fwd.x * 9));
          look.copy(mid);
        } else {
          const a = c.t * 0.5 + w.yaw;
          pos.set(w.c.x + Math.sin(a) * 9, w.c.y + 3, w.c.z + Math.cos(a) * 9);
          look.copy(w.c);
        }
        if (c.t >= c.dur) this.cine = null;
        if (pos.y < 0.6) pos.y = 0.6;
        this.camPos.lerp(pos, 1 - Math.exp(-dt * 10));
        this.camLook.lerp(look, 1 - Math.exp(-dt * 12));
      } else if (this.clash) {
        const mid = t3.copy(this.clash.a.origin).lerp(this.clash.b.origin, 0.5), d = t4.subVectors(this.clash.b.origin, this.clash.a.origin);
        const len = d.length();
        d.normalize();
        pos.copy(mid).add(t4.set(-d.z, 0, d.x).multiplyScalar(len * 0.6 + 8)).add(t4.set(0, 4, 0)).addScaledVector(d, -len * 0.2);
        look.copy(mid);
        this.camPos.lerp(pos, 1 - Math.exp(-dt * 5));
        this.camLook.lerp(look, 1 - Math.exp(-dt * 8));
      } else {
        const d = t3.subVectors(o.c, p.c), dist = d.length();
        d.normalize();
        const back = dist < 4 ? 8.5 : 7.2, rgt = t4.set(-d.z, 0, d.x).normalize();
        pos.copy(p.c).addScaledVector(d, -back).addScaledVector(UP, 2.1 - d.y * 2).addScaledVector(rgt, -1.4);
        if (pos.y < 0.6) pos.y = 0.6;
        look.copy(p.c).lerp(o.c, dist > 30 ? 0.35 : 0.6);
        this.camPos.lerp(pos, 1 - Math.exp(-dt * (this.intro > 0 ? 2 : 8)));
        this.camLook.lerp(look, 1 - Math.exp(-dt * 10));
      }
      if (this.intro > 0) {
        const a = this.intro * 0.9;
        this.camPos.set(o.c.x + Math.sin(a + o.yaw) * 7, o.c.y + 1, o.c.z + Math.cos(a + o.yaw) * 7);
        this.camLook.copy(o.c);
      }
      cam.position.copy(this.camPos);
      if (this.shake > 0) {
        cam.position.add(t4.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(this.shake * 0.35));
        this.shake = Math.max(0, this.shake - dt * 3);
      }
      cam.lookAt(this.camLook);
      const mid = t3.copy(p.pos).lerp(o.pos, 0.5);
      this.sun.position.set(mid.x + 30, mid.y + 60, mid.z + 20);
      this.sun.target.position.copy(mid);
    }
    dispose() {
      ZB.audio.chargeLoop(false);
      this.scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
    }
  }

  // ------------------------------------------------------------------ Showcase (menus)
  class Showcase {
    constructor(renderer) {
      this.r = renderer;
      this.scene = new T.Scene();
      this.cam = new T.PerspectiveCamera(40, 1, 0.1, 500);
      this.scene.add(new T.HemisphereLight(0xcfe3ff, 0x30263a, 0.4));
      const d = new T.DirectionalLight(0xfff1e0, 2.1);
      d.position.set(4, 8, 6);
      const rim = new T.DirectionalLight(0x8fb8ff, 1.4);
      rim.position.set(-5, 4, -6);
      this.scene.add(d, rim);
      // studio environment for reflections
      const env = new T.Scene();
      env.add(new T.Mesh(new T.SphereGeometry(10, 24, 12), new T.ShaderMaterial({ side: T.BackSide, vertexShader: 'varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }', fragmentShader: 'varying vec3 p; void main(){ float y = normalize(p).y; gl_FragColor = vec4(mix(vec3(0.08,0.05,0.15), vec3(0.9,0.85,1.0), smoothstep(-0.3, 1.0, y)), 1.0); }' })));
      const pm = new T.PMREMGenerator(renderer);
      this.scene.environment = pm.fromScene(env, 0.04).texture;
      pm.dispose();
      const floor = new T.Mesh(new T.CircleGeometry(3.2, 40), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 }));
      floor.rotation.x = -Math.PI / 2;
      this.scene.add(floor);
      this.models = [];
      this.t = 0;
      this.fx = new FX(this.scene);
      this.offsetX = 0;
    }
    show(list) {
      // list: [{id, form, x, yaw, aura}] -- meshes are sculpted in the background if needed
      this.list = list;
      const req = (this.req = (this.req || 0) + 1);
      if (list.every((o) => ZB.models.ready(o.id))) return this.build(list);
      this.build([]);
      ZB.models.ensure(list.map((o) => o.id)).then(() => {
        if (req === this.req) this.build(list);
      });
    }
    build(list) {
      for (const m of this.models) {
        this.scene.remove(m.model.root);
        m.model.dispose();
      }
      this.models = list.map((o) => {
        const model = new ZB.Model(ZB.byId(o.id), o.form || 0);
        model.root.position.set(o.x || 0, 0.2, 0);
        model.root.rotation.y = o.yaw || 0;
        model.setPose(o.pose || 'idle');
        this.scene.add(model.root);
        return { model, o };
      });
    }
    setForm(i, form) {
      const m = this.models[i];
      if (m) {
        m.model.setForm(form);
        m.o.form = form;
        this.fx.burst(t1.set(m.o.x || 0, 1.4, 0), m.model.form.aura, 0.8);
      }
    }
    update(dt) {
      this.t += dt;
      for (const { model, o } of this.models) {
        if (o.spin) model.root.rotation.y += dt * 0.6;
        if (model.form.lightning && Math.random() < dt * 10) this.fx.bolt(t1.set(o.x || 0, 1.35, 0), model.form.lightning, 1.2);
        if (model.form.particles) this.fx.formParticles(model.form, t2.set(o.x || 0, 1.35, 0), dt, 1);
        if (o.clip) {
          // preview: loop the clip with a short hold at the end
          o.clipT = (o.clipT || 0) + dt / (o.clipDur || 1);
          if (o.clipT > 1.4) o.clipT = 0;
          model.setClip(o.clip, ZB.CLIPS[o.clip] && ZB.CLIPS[o.clip].loop ? o.clipT : Math.min(1, o.clipT));
        } else if (o.pose !== 'charge') model.setPose(o.pose || 'idle');
        model.update(dt, o.aura == null ? (o.form > 0 ? 0.5 : 0.25) : o.aura);
        if (Math.random() < dt * 12) this.fx.spawn(t1.set((o.x || 0) + rand(-1, 1), rand(0, 0.5), rand(-1, 1)), t2.set(0, rand(2, 5), 0), model.form.aura, rand(0.2, 0.5), 0.8);
      }
      this.fx.update(dt);
      const c = this.r.domElement, w = c.clientWidth, h = c.clientHeight;
      this.cam.aspect = w / h;
      this.cam.position.set(this.offsetX, 1.6, 7.5);
      this.cam.lookAt(this.offsetX, 1.15, 0);
      this.cam.setViewOffset(w, h, w < 700 ? 0 : -w * 0.18, w < 700 ? h * 0.12 : 0, w, h);
      this.cam.updateProjectionMatrix();
      this.r.setClearColor(0x000000, 0);
      this.r.render(this.scene, this.cam);
    }
  }

  ZB.Battle = Battle;
  ZB.Showcase = Showcase;
  ZB.KI_MAX = KI_MAX;
  ZB.SKILL_MAX = SKILL_MAX;
})();
