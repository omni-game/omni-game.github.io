'use strict';
// Synthesised sound effects and a simple procedural battle track (no audio files needed).
(function () {
  let ctx = null, master = null, sfxGain = null, musicGain = null, noiseBuf = null;
  const settings = { sfx: 0.7, music: 0.35 };
  const A = (ZB.audio = {});

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = settings.sfx;
    sfxGain.connect(master);
    musicGain = ctx.createGain();
    musicGain.gain.value = settings.music;
    musicGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  A.unlock = () => {
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  };
  A.setVolume = (kind, v) => {
    settings[kind] = v;
    if (kind === 'sfx' && sfxGain) sfxGain.gain.value = v;
    if (kind === 'music' && musicGain) musicGain.gain.value = v;
  };
  A.settings = settings;

  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function noise(dur, freq, q, peak, type, dest) {
    const t = ctx.currentTime, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf;
    f.type = type || 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    env(g, t, 0.005, peak, dur);
    src.connect(f).connect(g).connect(dest || sfxGain);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
    return { src, f, g };
  }
  function tone(type, f0, f1, dur, peak, dest) {
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, 0.005, peak, dur);
    o.connect(g).connect(dest || sfxGain);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  const SFX = {
    hit() { noise(0.08, 1800, 1.2, 0.5); tone('sine', 220, 60, 0.12, 0.6); },
    heavy() { noise(0.25, 700, 0.8, 0.8); tone('sine', 140, 35, 0.35, 0.9); },
    guard() { noise(0.06, 4000, 3, 0.35); tone('triangle', 900, 600, 0.08, 0.2); },
    whiff() { noise(0.12, 2500, 0.7, 0.18, 'highpass'); },
    blast() { tone('square', 900, 300, 0.12, 0.12); noise(0.1, 3000, 1, 0.15); },
    boom() { noise(0.9, 400, 0.5, 0.9, 'lowpass'); tone('sine', 90, 25, 0.8, 0.9); },
    bigboom() { noise(1.6, 300, 0.4, 1.0, 'lowpass'); tone('sine', 70, 20, 1.4, 1.0); },
    vanish() { noise(0.22, 6000, 2, 0.35, 'highpass'); tone('sine', 1600, 3200, 0.15, 0.12); },
    dash() { noise(0.25, 1200, 0.6, 0.22); },
    charge() { tone('sawtooth', 120, 240, 0.5, 0.08); },
    beamStart() { tone('sawtooth', 200, 900, 0.7, 0.18); noise(0.7, 2000, 0.6, 0.3); },
    beamFire() { tone('sawtooth', 110, 80, 1.4, 0.25); noise(1.4, 900, 0.5, 0.45); },
    transform() { tone('sawtooth', 80, 800, 1.1, 0.2); noise(1.4, 1500, 0.4, 0.5); setTimeout(() => ctx && SFX.bigboom(), 650); },
    ki() { tone('triangle', 500, 1200, 0.25, 0.15); },
    spark() { tone('square', 300, 1500, 0.6, 0.12); tone('sine', 600, 2400, 0.6, 0.15); },
    ui() { tone('triangle', 880, 1320, 0.06, 0.12); },
    uiBack() { tone('triangle', 660, 440, 0.07, 0.12); },
    ko() { tone('sawtooth', 400, 40, 1.4, 0.3); noise(1.5, 500, 0.4, 0.6, 'lowpass'); },
    clash() { noise(0.15, 2500, 1.5, 0.3); tone('square', 180 + Math.random() * 80, 150, 0.1, 0.08); },
  };
  A.play = (name) => {
    if (!init() || settings.sfx <= 0) return;
    try { SFX[name] && SFX[name](); } catch (e) { /* ignore */ }
  };

  // Charging hum loop.
  let chargeNode = null;
  A.chargeLoop = (on) => {
    if (!init()) return;
    if (on && !chargeNode) {
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), o = ctx.createOscillator(), og = ctx.createGain();
      src.buffer = noiseBuf;
      src.loop = true;
      f.type = 'bandpass';
      f.frequency.value = 600;
      f.Q.value = 0.8;
      g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.2);
      o.type = 'sawtooth';
      o.frequency.value = 70;
      og.gain.value = 0.05;
      src.connect(f).connect(g).connect(sfxGain);
      o.connect(og).connect(g);
      src.start();
      o.start();
      chargeNode = { src, f, g, o, t0: ctx.currentTime };
    } else if (!on && chargeNode) {
      const n = chargeNode;
      chargeNode = null;
      n.g.gain.cancelScheduledValues(ctx.currentTime);
      n.g.gain.setValueAtTime(n.g.gain.value, ctx.currentTime);
      n.g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      n.src.stop(ctx.currentTime + 0.2);
      n.o.stop(ctx.currentTime + 0.2);
    }
    if (chargeNode) chargeNode.f.frequency.value = 500 + Math.min(1, ctx.currentTime - chargeNode.t0) * 900;
  };

  // Procedural music: a driving minor-key loop.
  let musicTimer = null, step = 0, nextT = 0, theme = 0;
  const THEMES = [
    { bpm: 150, root: 45, prog: [0, 0, -4, -2], scale: [0, 3, 5, 7, 10, 12] },
    { bpm: 138, root: 43, prog: [0, -2, -4, -5], scale: [0, 2, 3, 7, 8, 12] },
    { bpm: 96, root: 48, prog: [0, -3, -5, -7], scale: [0, 4, 7, 11, 12, 14] },
  ];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function note(type, freq, t, dur, peak, cutoff) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type;
    o.frequency.value = freq;
    f.type = 'lowpass';
    f.frequency.value = cutoff || 1800;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(musicGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function drum(kind, t) {
    if (kind === 'k') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      g.gain.setValueAtTime(0.7, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g).connect(musicGain);
      o.start(t);
      o.stop(t + 0.25);
    } else {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseBuf;
      f.type = kind === 's' ? 'bandpass' : 'highpass';
      f.frequency.value = kind === 's' ? 1800 : 7000;
      const pk = kind === 's' ? 0.35 : 0.08, dur = kind === 's' ? 0.15 : 0.04;
      g.gain.setValueAtTime(pk, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(g).connect(musicGain);
      s.start(t, Math.random());
      s.stop(t + dur + 0.02);
    }
  }
  function schedule() {
    const th = THEMES[theme], spb = 60 / th.bpm / 4;
    while (nextT < ctx.currentTime + 0.2) {
      const s = step % 64, bar = Math.floor(s / 16), r = th.root + th.prog[bar], beat = s % 16;
      if (theme === 2) {
        if (beat % 8 === 0) note('triangle', mtof(r - 12), nextT, spb * 7, 0.18, 900);
        if (beat % 4 === 2) note('sine', mtof(r + th.scale[(s * 7) % th.scale.length] + 12), nextT, spb * 3, 0.06, 2500);
      } else {
        if (beat % 4 === 0) drum('k', nextT);
        if (beat === 4 || beat === 12) drum('s', nextT);
        if (beat % 2 === 0) drum('h', nextT);
        if (beat % 2 === 0 || beat === 15) note('sawtooth', mtof(r - 12 + (beat === 14 ? 12 : 0)), nextT, spb * 1.6, 0.13, 700);
        const mel = [0, 2, 3, 4, 3, 2, 4, 5];
        if (beat % 4 === 0 || beat === 6 || beat === 14) note('square', mtof(r + 12 + th.scale[mel[(beat + bar * 3) % 8] % th.scale.length]), nextT, spb * 2.2, 0.045, 2200);
      }
      nextT += spb;
      step++;
    }
  }
  A.music = (which) => {
    if (!init()) return;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (which === null || which === undefined) return;
    theme = which;
    step = 0;
    nextT = ctx.currentTime + 0.05;
    musicTimer = setInterval(schedule, 60);
  };
})();
