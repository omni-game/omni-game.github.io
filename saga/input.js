'use strict';
// Keyboard, gamepad and touch input merged into one "intent" object per frame.
(function () {
  const keys = new Set();
  const KEYMAP = {
    up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
    rise: ['Space'], sink: ['KeyC', 'ControlLeft'], dash: ['ShiftLeft', 'ShiftRight'],
    // every action also sits right around WASD so one hand can play: F rush, G smash, R blast, E charge, Q guard, X super, Z transform
    rush: ['KeyF', 'KeyJ'], smash: ['KeyG', 'KeyK'], blast: ['KeyR', 'KeyL'], charge: ['KeyE', 'KeyI'], guard: ['KeyQ', 'KeyO'], mod: ['KeyX', 'KeyU'], transform: ['KeyZ', 'KeyT', 'KeyH'], pause: ['Escape', 'KeyP'],
  };
  const touch = { mx: 0, mz: 0 };
  const touchBtn = {};
  let prev = {};
  addEventListener('keydown', (e) => {
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    keys.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  const k = (name) => KEYMAP[name].some((c) => keys.has(c));

  function pad() {
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const g of gps) if (g && g.connected) return g;
    return null;
  }
  const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);

  // Returns the held state of every action plus "pressed this frame" edges.
  ZB.readInput = function () {
    const g = pad(), b = (i) => !!(g && g.buttons[i] && g.buttons[i].pressed);
    const held = {
      rise: k('rise') || b(12) || (g && dz(g.axes[3]) < -0.5) || touchBtn.rise,
      sink: k('sink') || b(13) || (g && dz(g.axes[3]) > 0.5) || touchBtn.sink,
      dash: k('dash') || b(0) || touchBtn.dash,
      rush: k('rush') || b(2) || touchBtn.rush,
      smash: k('smash') || b(1) || touchBtn.smash,
      blast: k('blast') || b(3) || touchBtn.blast,
      charge: k('charge') || b(4) || touchBtn.charge,
      guard: k('guard') || b(5) || touchBtn.guard,
      mod: k('mod') || b(7) || b(6) || touchBtn.mod,
      transform: k('transform') || b(14) || b(15) || touchBtn.transform,
      pause: k('pause') || b(9),
    };
    let mx = (k('right') ? 1 : 0) - (k('left') ? 1 : 0) + touch.mx;
    let mz = (k('up') ? 1 : 0) - (k('down') ? 1 : 0) + touch.mz;
    if (g) {
      mx += dz(g.axes[0]);
      mz -= dz(g.axes[1]);
    }
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    const out = { mx, mz };
    for (const n in held) {
      out[n] = !!held[n];
      out[n + 'P'] = !!held[n] && !prev[n];
      out[n + 'R'] = !held[n] && !!prev[n];
    }
    prev = held;
    out.any = Object.values(held).some(Boolean) || len > 0.5;
    return out;
  };
  ZB.clearInput = () => { prev = { pause: true, rush: true, smash: true, blast: true, guard: true, mod: true, transform: true, dash: true, charge: true }; };

  // ---- Touch controls ----
  ZB.setupTouch = function (root) {
    const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    root.classList.toggle('touch', isTouch);
    const stick = root.querySelector('.stick'), knob = stick.querySelector('i');
    let sid = null, cx = 0, cy = 0;
    const R = 50;
    stick.addEventListener('pointerdown', (e) => {
      sid = e.pointerId;
      const r = stick.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      stick.setPointerCapture(sid);
      move(e);
    });
    const move = (e) => {
      if (e.pointerId !== sid) return;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const l = Math.hypot(dx, dy);
      if (l > R) { dx = (dx / l) * R; dy = (dy / l) * R; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      touch.mx = dx / R;
      touch.mz = -dy / R;
    };
    const end = (e) => {
      if (e.pointerId !== sid) return;
      sid = null;
      touch.mx = touch.mz = 0;
      knob.style.transform = '';
    };
    stick.addEventListener('pointermove', move);
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);
    root.querySelectorAll('[data-btn]').forEach((el) => {
      const n = el.dataset.btn, toggle = el.hasAttribute('data-toggle');
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        if (toggle) {
          touchBtn[n] = !touchBtn[n];
          el.classList.toggle('on', touchBtn[n]);
        } else {
          touchBtn[n] = true;
          el.classList.add('on');
        }
      });
      const up = () => {
        if (toggle) return;
        touchBtn[n] = false;
        el.classList.remove('on');
      };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    });
  };
  ZB.resetTouchMod = (root) => {
    touchBtn.mod = false;
    const el = root && root.querySelector('[data-btn="mod"]');
    if (el) el.classList.remove('on');
  };
})();
