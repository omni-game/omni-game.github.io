'use strict';
// ZENITH BURST — menus, story campaign flow, dialogue, HUD and the main loop.
(function () {
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // ---------------- save data
  const SAVE_KEY = 'zenith-burst-save-v1';
  const DEFAULT = () => ({ cleared: {}, chars: ['kairo', 'rhen', 'mira'], forms: {}, wins: {}, diff: 0, vol: { sfx: 0.7, music: 0.35 }, quality: 'high' });
  let save = load();
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      return Object.assign(DEFAULT(), s || {});
    } catch (e) {
      return DEFAULT();
    }
  }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable */ }
  }
  // Forms that must be earned in Story mode (index of the first locked form).
  const LOCKS = { kairo: 1, rhen: 1, mira: 2 };
  // A form is usable once its story unlock is earned (if it has one) and its mastery requirement is met
  // (mastery forms need that many Battle-mode wins with the fighter).
  const formLock = (id, i) => {
    const f = ZB.byId(id).forms[i];
    if (LOCKS[id] != null && i >= LOCKS[id] && (save.forms[id] || 0) < i && !f.mastery) return 'Unlock in Story';
    if (f.mastery && ((save.wins || {})[id] || 0) < f.mastery) return `Win ${f.mastery} battles with ${ZB.byId(id).name}`;
    return null;
  };
  const maxFormFor = (id) => {
    const def = ZB.byId(id);
    let m = 0;
    for (let i = 1; i < def.forms.length && !formLock(id, i); i++) m = i;
    return m;
  };
  const REQ = { e2: ['e1'], e3: ['e2'], e4: ['e3'], e5: ['e4'], w1: ['e4'], e6: ['e5', 'w1'], e7: ['e6'], e8: ['e7'], e9: ['e8'], e10: ['e9'], e11: ['e10'], e12: ['e11'] };
  const NEXT = { e1: 'e2', e2: 'e3', e3: 'e4', e5: 'e6', w1: 'e6', e6: 'e7', e7: 'e8', e8: 'e9', e9: 'e10', e10: 'e11', e11: 'e12' };
  const available = (id) => !REQ[id] || REQ[id].some((r) => save.cleared[r]);

  ZB.audio.setVolume('sfx', save.vol.sfx);
  ZB.audio.setVolume('music', save.vol.music);

  // ---------------- renderer
  const canvas = $('#gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  function applyQuality() {
    ZB.quality = save.quality;
    renderer.setPixelRatio(save.quality === 'low' ? 1 : Math.min(devicePixelRatio || 1, 1.75));
    renderer.shadowMap.enabled = save.quality !== 'low';
    renderer.setSize(innerWidth, innerHeight, false);
  }
  applyQuality();
  addEventListener('resize', () => renderer.setSize(innerWidth, innerHeight, false));
  const showcase = new ZB.Showcase(renderer);
  let battle = null, lastLaunch = null, pauseOpen = false, current = 'title';

  // ---------------- screens
  function go(id) {
    current = id;
    $$('.screen').forEach((s) => s.classList.toggle('show', s.id === id));
    if (ENTER[id]) ENTER[id]();
  }
  function hideScreens() {
    current = null;
    $$('.screen').forEach((s) => s.classList.remove('show'));
  }
  $$('[data-go]').forEach((b) =>
    b.addEventListener('click', () => {
      const to = b.dataset.go;
      ZB.audio.play(b.classList.contains('back') ? 'uiBack' : 'ui');
      if (to === 'training') return openSelect(true);
      if (to === 'select') return openSelect(false);
      go(to);
    }),
  );
  const heroFor = () => {
    const pool = save.chars.slice();
    const id = pool[Math.floor(Math.random() * pool.length)];
    return { id, form: maxFormFor(id) };
  };
  const ENTER = {
    menu() {
      const h = heroFor();
      showcase.show([{ id: h.id, form: h.form, x: 0, yaw: -0.4, pose: 'charge', aura: 0.9 }]);
      const eps = ZB.allEpisodes(), done = eps.filter((e) => save.cleared[e.id]).length;
      const stars = Object.values(save.cleared).reduce((a, b) => a + b, 0);
      $('#menuProgress').textContent = `Story ${done}/${eps.length} episodes · ${stars}★ · Fighters ${save.chars.length}/${ZB.ROSTER.length}`;
      ZB.audio.music(2);
      // sculpt the unlocked fighters in the background so battles start instantly
      setTimeout(() => ZB.models.prefetch(save.chars), 1500);
    },
    story() {
      showcase.show([]);
      renderStory();
    },
    fighters() {
      renderFighters();
    },
    controls() { showcase.show([]); },
    settings() {
      showcase.show([]);
      $('#volSfx').value = save.vol.sfx;
      $('#volMusic').value = save.vol.music;
      $('#quality').value = save.quality;
    },
  };

  // ---------------- title
  function startFromTitle() {
    if (current !== 'title') return;
    ZB.audio.unlock();
    ZB.audio.play('spark');
    go('menu');
  }
  $('#title').addEventListener('pointerdown', startFromTitle);
  addEventListener('keydown', (e) => {
    if (current === 'title') startFromTitle();
    else if (e.code === 'Escape' && current && current !== 'menu' && !battle) {
      const back = document.querySelector('.screen.show .back');
      if (back) back.click();
    }
  });
  showcase.show([{ id: 'kairo', form: maxFormFor('kairo'), x: 0, yaw: -0.5, pose: 'charge', aura: 1 }]);

  // ---------------- story list
  function stars(n, max) {
    let s = '';
    for (let i = 0; i < (max || 3); i++) s += i < n ? '★' : '<span class="off">★</span>';
    return s;
  }
  function renderStory() {
    $('#storyDiff').value = save.diff;
    const root = $('#sagas');
    root.innerHTML = '';
    for (const saga of ZB.CAMPAIGN) {
      const d = document.createElement('div');
      d.className = 'saga';
      d.style.setProperty('--c', saga.color);
      d.innerHTML = `<h3>${esc(saga.name)}</h3><p>${esc(saga.blurb)}</p><div class="eps"></div>`;
      const grid = d.querySelector('.eps');
      saga.episodes.forEach((ep) => {
        const ok = available(ep.id), cl = save.cleared[ep.id] || 0;
        const b = document.createElement('button');
        b.className = 'ep' + (ep.whatIf ? ' whatif' : '') + (ok && !cl ? ' new' : '');
        b.disabled = !ok;
        const hidden = ep.secret && !ok;
        const p = ZB.byId(ep.player), e = ZB.byId(ep.enemy);
        b.innerHTML = hidden
          ? `<b>??? Secret Episode</b><small>Clear the Unmaker Saga</small>`
          : `<b>${esc(ep.name)}</b><small>${esc(p.name)} vs ${esc(e.name)} · ${ep.goal === 'survive' ? 'Survive ' + ep.time + 's' : 'Defeat'}</small><span class="st">${cl ? stars(cl) : ''}</span>`;
        b.addEventListener('click', () => {
          ZB.audio.play('ui');
          openBrief(ep.id);
        });
        grid.appendChild(b);
      });
      root.appendChild(d);
    }
  }
  $('#storyDiff').addEventListener('change', (e) => {
    save.diff = +e.target.value;
    persist();
  });

  // ---------------- briefing
  let briefId = null;
  function goalText(ep) {
    return ep.goal === 'survive' ? `Objective: survive for ${ep.time} seconds` : 'Objective: defeat your opponent';
  }
  function openBrief(id) {
    const ep = ZB.episodeById(id);
    briefId = id;
    const saga = ZB.CAMPAIGN.find((s) => s.id === ep.saga);
    $('#briefSaga').textContent = saga.name;
    $('#briefName').textContent = ep.name;
    const p = ZB.byId(ep.player), e = ZB.byId(ep.enemy);
    $('#briefP').textContent = `${p.name} (${p.forms[ep.pForm || 0].name})`;
    $('#briefE').textContent = `${e.name} (${e.forms[ep.eForm || 0].name})`;
    $('#briefGoal').textContent = goalText(ep);
    $('#briefStage').textContent = 'Stage: ' + ZB.stageById(ep.stage).name;
    $('#briefTip').textContent = ep.tip || '';
    $('#briefStars').innerHTML = stars(save.cleared[id] || 0);
    go('brief');
    showcase.show([
      { id: ep.player, form: ep.pForm || 0, x: -1.3, yaw: 0.7 },
      { id: ep.enemy, form: ep.eForm || 0, x: 1.3, yaw: -0.7 },
    ]);
  }
  $('#briefStart').addEventListener('click', () => {
    ZB.audio.play('ui');
    startStory(briefId);
  });

  function startStory(id) {
    const ep = ZB.episodeById(id);
    hideScreens();
    showcase.show([
      { id: ep.player, form: ep.pForm || 0, x: -1.3, yaw: 0.7 },
      { id: ep.enemy, form: ep.eForm || 0, x: 1.3, yaw: -0.7 },
    ]);
    ZB.audio.music(2);
    dialogue(ep.intro || [], () => launch(storyOpts(ep)));
  }
  function storyOpts(ep) {
    const bonus = save.diff ? 0.15 : 0;
    return {
      mode: 'story', ep: ep.id, stage: ep.stage, goal: ep.goal, time: ep.time, events: ep.events, lockEnemyForms: true,
      p1: { id: ep.player, form: ep.pForm || 0, maxForm: Math.max(ep.pForm || 0, maxFormFor(ep.player)) },
      p2: { id: ep.enemy, form: ep.eForm || 0, maxForm: ep.eForm || 0, ai: clamp(ep.ai + bonus, 0, 1) },
    };
  }

  // ---------------- battle setup (versus / training)
  let selP = 'kairo', selE = 'rhen', selTraining = false;
  function card(def, sel, locked, onClick) {
    const b = document.createElement('button');
    b.className = 'card' + (sel ? ' sel' : '') + (locked ? ' locked' : '');
    b.style.setProperty('--a', hex(def.colors.gi));
    b.innerHTML = `<span class="ini">${esc(def.name[0])}</span><b>${locked ? '???' : esc(def.name)}</b><small>${locked ? 'Locked' : esc(def.title)}</small>`;
    if (!locked) b.addEventListener('click', onClick);
    return b;
  }
  function renderRoster(el, sel, onPick) {
    el.innerHTML = '';
    for (const def of ZB.ROSTER) {
      const locked = !save.chars.includes(def.id);
      el.appendChild(card(def, sel === def.id, locked, () => { ZB.audio.play('ui'); onPick(def.id); }));
    }
  }
  function openSelect(training) {
    selTraining = training;
    if (!save.chars.includes(selP)) selP = 'kairo';
    if (!save.chars.includes(selE)) selE = 'rhen';
    $('#selectTitle').textContent = training ? 'Training' : 'Battle';
    $('#oppLabel').textContent = training ? 'Training partner' : 'CPU opponent';
    $('#optDiffWrap').classList.toggle('hidden', training);
    $('#optDummyWrap').classList.toggle('hidden', !training);
    const st = $('#optStage');
    if (!st.options.length) for (const s of ZB.STAGES) st.add(new Option(s.name, s.id));
    const draw = () => {
      renderRoster($('#rosterP'), selP, (id) => { selP = id; draw(); });
      renderRoster($('#rosterE'), selE, (id) => { selE = id; draw(); });
    };
    draw();
    showcase.show([]);
    go('select');
  }
  $('#selectStart').addEventListener('click', () => {
    ZB.audio.play('ui');
    const dummy = $('#optDummy').value;
    const ai = selTraining ? (dummy === 'dummy' ? null : +dummy) : +$('#optDiff').value;
    launch({
      mode: selTraining ? 'training' : 'versus', stage: $('#optStage').value, goal: 'win',
      p1: { id: selP, form: 0, maxForm: maxFormFor(selP), infiniteKi: selTraining },
      p2: { id: selE, form: 0, maxForm: ZB.byId(selE).forms.length - 1, ai, dummy: selTraining && dummy === 'dummy' },
    });
  });

  // ---------------- fighters
  let selF = 'kairo', selFForm = 0;
  let selAnim = 'idle';
  const ANIMS = [['idle', 'Stance'], ['jab', 'Jab'], ['cross', 'Cross'], ['roundhouse', 'Kick'], ['uppercut', 'Uppercut'], ['hammer', 'Hammer'], ['smashHit', 'Smash'], ['knee', 'Flying knee'], ['powerup', 'Power up'], ['introCrack', 'Intro 1'], ['introPoint', 'Intro 2'], ['introStance', 'Intro 3'], ['winPump', 'Victory 1'], ['winCross', 'Victory 2'], ['winFlex', 'Victory 3'], ['hurtGut', 'Hit']];
  const ANIM_DUR = { jab: 0.45, cross: 0.45, roundhouse: 0.6, uppercut: 0.6, hammer: 0.7, smashHit: 0.6, knee: 0.5, powerup: 1.6, introCrack: 2, introPoint: 2, introStance: 2, winPump: 1.6, winCross: 2.4, winFlex: 2, hurtGut: 0.6 };
  const TYPE = { beam: 'Energy beam', rush: 'Rush combo', volley: 'Ki barrage', bomb: 'Giant sphere', disk: 'Homing disk', nova: 'Area explosion' };
  function renderFighters() {
    const el = $('#rosterF');
    el.innerHTML = '';
    for (const def of ZB.ROSTER) {
      const locked = !save.chars.includes(def.id);
      el.appendChild(card(def, selF === def.id, locked, () => { ZB.audio.play('ui'); selF = def.id; selFForm = 0; renderFighters(); }));
    }
    const def = ZB.byId(selF), mf = maxFormFor(selF);
    const info = $('#fighterInfo');
    info.innerHTML = `<h3 style="color:${hex(def.forms[selFForm].aura)}">${esc(def.name)}</h3><div class="muted">${esc(def.title)}</div>
      <p>${esc(def.bio)}</p>
      <div><span class="stat">HP <b>${def.hp}</b></span><span class="stat">Speed <b>${Math.round(def.spd * 100)}</b></span><span class="stat">Power <b>${Math.round(def.pow * 100)}</b></span>${def.kiRegen ? '<span class="stat"><b>Trait:</b> self-recharging ki</span>' : ''}</div>
      <div class="forms">${def.forms.map((f, i) => `<button data-f="${i}" class="${i === selFForm ? 'on' : ''}" ${i > mf ? `disabled title="${esc(formLock(selF, i) || 'Unlock earlier forms first')}"` : ''}>${esc(f.name)}${i > mf ? ' \u{1F512}' : ''}</button>`).join('')}</div>
      ${def.forms.some((f) => f.mastery) ? `<div class="muted">Mastery: ${(save.wins || {})[selF] || 0} Battle wins \u00b7 ${def.forms.filter((f) => f.mastery).map((f) => `${esc(f.name)} at ${f.mastery}`).join(', ')}</div>` : ''}
      <div class="forms anims"><span class="muted">Animations:</span>${ANIMS.map(([k, n]) => `<button data-a="${k}" class="${k === selAnim ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="moves">${def.supers.map((s, i) => `<div><b>${esc(s.name)}</b><small>Super ${i + 1} · U+${i ? 'K' : 'J'} · ${TYPE[s.type]} · ${s.cost / 100} ki bars</small></div>`).join('')}
      <div><b>${esc(def.ultimate.name)}</b><small>Ultimate · U+L · ${TYPE[def.ultimate.type]} · needs Sparking</small></div></div>`;
    info.querySelectorAll('[data-a]').forEach((b) =>
      b.addEventListener('click', () => {
        selAnim = b.dataset.a;
        ZB.audio.play('ui');
        const m = showcase.models[0];
        if (m) {
          m.o.clip = selAnim === 'idle' ? null : selAnim;
          m.o.clipT = 0;
          m.o.clipDur = ANIM_DUR[selAnim] || 1;
          m.o.spin = selAnim === 'idle';
          if (!m.o.spin) m.model.root.rotation.y = 0.35;
        }
        renderFighters();
      }),
    );
    info.querySelectorAll('[data-f]').forEach((b) =>
      b.addEventListener('click', () => {
        selFForm = +b.dataset.f;
        ZB.audio.play('transform');
        showcase.setForm(0, selFForm);
        renderFighters();
      }),
    );
    if (!showcase.list || !showcase.list[0] || showcase.list[0].id !== selF) {
      selAnim = 'idle';
      showcase.show([{ id: selF, form: selFForm, x: 0, yaw: 0, spin: true }]);
    }
  }

  // ---------------- settings
  $('#volSfx').addEventListener('input', (e) => { save.vol.sfx = +e.target.value; ZB.audio.setVolume('sfx', save.vol.sfx); persist(); });
  $('#volMusic').addEventListener('input', (e) => { save.vol.music = +e.target.value; ZB.audio.setVolume('music', save.vol.music); persist(); });
  $('#volSfx').addEventListener('change', () => ZB.audio.play('hit'));
  $('#quality').addEventListener('change', (e) => { save.quality = e.target.value; persist(); applyQuality(); });
  $('#resetSave').addEventListener('click', () => {
    if (!confirm('Reset all story progress and unlocks?')) return;
    const keep = { vol: save.vol, quality: save.quality };
    save = Object.assign(DEFAULT(), keep);
    persist();
    ZB.audio.play('uiBack');
  });

  // ---------------- dialogue
  let dlg = null;
  function dialogue(lines, done) {
    if (!lines || !lines.length) return done();
    dlg = { lines, i: 0, done, shown: 0, full: '', t: 0 };
    $('#dialog').classList.remove('hidden');
    showLine();
  }
  function showLine() {
    const [who, text] = dlg.lines[dlg.i];
    const def = ZB.byId(who);
    $('#dialog').classList.toggle('nar', who === 'nar');
    $('#dname').textContent = who === 'nar' ? '' : def ? def.name : who;
    const port = $('#dport');
    port.textContent = def ? def.name[0] : '';
    if (def) {
      port.style.setProperty('--a', hex(def.colors.gi));
      $('#dname').style.setProperty('--nc', hex(def.forms[0].aura));
    }
    dlg.full = text;
    dlg.shown = 0;
    $('#dtext').textContent = '';
  }
  function advance() {
    if (!dlg) return;
    if (dlg.shown < dlg.full.length) {
      dlg.shown = dlg.full.length;
      $('#dtext').textContent = dlg.full;
      return;
    }
    ZB.audio.play('ui');
    dlg.i++;
    if (dlg.i >= dlg.lines.length) return endDialogue();
    showLine();
  }
  function endDialogue() {
    const d = dlg;
    dlg = null;
    $('#dialog').classList.add('hidden');
    ZB.clearInput();
    d.done();
  }
  $('#dialog').addEventListener('pointerdown', (e) => {
    if (e.target.id === 'dskip') return;
    advance();
  });
  $('#dskip').addEventListener('click', () => dlg && endDialogue());
  addEventListener('keydown', (e) => {
    if (!dlg) return;
    if (['Enter', 'Space', 'KeyJ', 'NumpadEnter'].includes(e.code)) {
      e.preventDefault();
      advance();
    } else if (e.code === 'Escape') endDialogue();
  });
  function tickDialogue(dt) {
    if (!dlg || dlg.shown >= dlg.full.length) return;
    dlg.t += dt;
    const n = Math.min(dlg.full.length, Math.floor(dlg.t * 55));
    if (n > dlg.shown) {
      dlg.shown = n;
      $('#dtext').textContent = dlg.full.slice(0, n);
    } else if (dlg.shown === 0) dlg.t = 0;
  }

  // ---------------- HUD
  const H = {};
  ['h1port', 'h1name', 'h1form', 'h1hp', 'h1hpd', 'h1ki', 'h1orbs', 'h2port', 'h2name', 'h2form', 'h2hp', 'h2hpd', 'h2ki', 'h2orbs', 'htimer', 'combo1', 'combo2', 'banner', 'toast', 'goal', 'mash', 'mashBar', 'superList'].forEach((id) => (H[id] = document.getElementById(id)));
  for (const k of ['h1ki', 'h2ki']) H[k].innerHTML = '<span><i></i></span>'.repeat(5);
  for (const k of ['h1orbs', 'h2orbs']) H[k].innerHTML = '<span></span>'.repeat(ZB.SKILL_MAX);
  let toastT = 0, comboT = [0, 0], lbT = 0;
  const hooks = {
    banner(text, kind, team) {
      const b = H.banner;
      b.className = '';
      void b.offsetWidth;
      b.textContent = text;
      const color = { fight: '#ffb627', ko: '#ff4a5e', spark: '#ffffff', clash: '#ffb627', form: '#ffe27a' }[kind];
      const f = team === 0 ? battle && battle.p1 : team === 1 ? battle && battle.p2 : null;
      b.style.setProperty('--bc', color || (f ? hex(f.model.form.aura) : '#4fc3ff'));
      b.className = 'go ' + (kind || '') + (kind === 'super' || kind === 'ult' || kind === 'small' ? team === 1 ? ' p2side' : team === 0 ? ' p1side' : '' : '');
    },
    toast(text) {
      H.toast.textContent = text;
      H.toast.classList.add('show');
      toastT = 1.6;
    },
    combo(team, n, dmg) {
      if (n < 2) return;
      const el = team === 0 ? H.combo1 : H.combo2;
      el.innerHTML = `${n} HITS<small>${dmg} dmg</small>`;
      el.classList.add('show');
      comboT[team] = 1.6;
    },
    mash(show, p) {
      H.mash.classList.toggle('hidden', !show);
      if (show) H.mashBar.style.width = ((p + 1) / 2) * 100 + '%';
    },
    letterbox(t) {
      $('#letterbox').classList.add('on');
      lbT = t;
    },
  };
  function hudInit(b) {
    for (const [f, n] of [[b.p1, 1], [b.p2, 2]]) {
      H[`h${n}name`].textContent = f.def.name;
      H[`h${n}port`].textContent = f.def.name[0];
      H[`h${n}port`].style.setProperty('--a', hex(f.def.colors.gi));
      H[`h${n}hpd`].style.width = '100%';
    }
    H.goal.textContent = b.opts.mode === 'story' ? goalText(ZB.episodeById(b.opts.ep)) : b.opts.mode === 'training' ? 'TRAINING — infinite ki, press Esc for the move list' : '';
    H.combo1.classList.remove('show');
    H.combo2.classList.remove('show');
    H.mash.classList.add('hidden');
    H.banner.className = '';
  }
  function hudUpdate(b, inp, dt) {
    for (const [f, n] of [[b.p1, 1], [b.p2, 2]]) {
      const hp = (clamp(f.hp / f.maxHp, 0, 1) * 100).toFixed(1) + '%';
      if (H[`h${n}hp`].style.width !== hp) {
        H[`h${n}hp`].style.width = hp;
        H[`h${n}hpd`].style.width = hp;
      }
      H[`h${n}form`].textContent = f.model.form.name + (f.spark > 0 ? ' · SPARKING ' + Math.ceil(f.spark) : '');
      const ki = H[`h${n}ki`];
      ki.classList.toggle('spark', f.spark > 0);
      for (let i = 0; i < 5; i++) {
        const span = ki.children[i], v = clamp((f.ki - i * 100) / 100, 0, 1);
        span.firstChild.style.width = v * 100 + '%';
        span.classList.toggle('full', v >= 1);
      }
      const orbs = H[`h${n}orbs`];
      for (let i = 0; i < ZB.SKILL_MAX; i++) orbs.children[i].classList.toggle('on', i < f.skill);
      H[`h${n}port`].classList.toggle('spark', f.spark > 0);
    }
    if (b.opts.goal === 'survive') {
      H.htimer.textContent = Math.ceil(b.timer);
      H.htimer.classList.toggle('warn', b.timer < 10);
    } else {
      H.htimer.textContent = '∞';
      H.htimer.classList.remove('warn');
    }
    // super list while the modifier is held
    const p = b.p1, showList = !!inp.mod && !b.over;
    H.superList.classList.toggle('hidden', !showList);
    if (showList) {
      const s = p.def.supers, u = p.def.ultimate;
      const row = (k, name, ok, note) => `<div class="${ok ? '' : 'no'}"><b>${k}</b>${esc(name)} <small>${note}</small></div>`;
      const html = row('J', s[0].name, p.ki >= s[0].cost, s[0].cost / 100 + ' bars') + row('K', s[1].name, p.ki >= s[1].cost, s[1].cost / 100 + ' bars') + row('L', u.name, p.spark > 0, 'Sparking only') + row('O', 'Burst', p.skill >= 2, '2 orbs');
      if (H.superList.innerHTML !== html) H.superList.innerHTML = html;
    }
    if (toastT > 0 && (toastT -= dt) <= 0) H.toast.classList.remove('show');
    for (const t of [0, 1]) if (comboT[t] > 0 && (comboT[t] -= dt) <= 0) (t ? H.combo2 : H.combo1).classList.remove('show');
    if (lbT > 0 && (lbT -= dt) <= 0) $('#letterbox').classList.remove('on');
  }

  // ---------------- battle lifecycle
  let launchReq = 0;
  function launch(opts) {
    const ids = [opts.p1.id, opts.p2.id];
    if (!ids.every((id) => ZB.models.ready(id))) {
      const req = ++launchReq;
      hideScreens();
      ZB.models.ensure(ids).then(() => req === launchReq && launch(opts));
      return;
    }
    launchReq++;
    endBattle();
    hideScreens();
    showcase.show([]);
    lastLaunch = opts;
    opts.onEvent = (e, cb) => dialogue(e.lines, cb);
    opts.onEnd = (res) => onBattleEnd(opts, res);
    battle = new ZB.Battle(renderer, opts, hooks);
    hudInit(battle);
    $('#hud').classList.remove('hidden');
    $('#touch').classList.remove('hidden');
    ZB.clearInput();
    ZB.audio.music(opts.mode === 'story' && /e1[01]|e12|e5|w1|e8/.test(opts.ep) ? 1 : 0);
  }
  function endBattle() {
    if (battle) battle.dispose();
    battle = null;
    $('#hud').classList.add('hidden');
    $('#touch').classList.add('hidden');
    $('#letterbox').classList.remove('on');
    closePause();
    $('#results').classList.add('hidden');
    ZB.audio.chargeLoop(false);
  }
  function quitToMenu(to) {
    endBattle();
    go(to || 'menu');
  }
  function onBattleEnd(opts, res) {
    $('#touch').classList.add('hidden');
    if (opts.mode === 'story' && res.win) {
      const ep = ZB.episodeById(opts.ep);
      const star2 = ep.goal === 'survive' ? res.hpRatio >= 0.4 : res.hpRatio >= 0.5;
      const star3 = ep.goal === 'survive' ? res.hpRatio >= 0.7 : res.superFinish;
      const n = 1 + (star2 ? 1 : 0) + (star3 ? 1 : 0);
      const unlocks = [];
      const u = ep.unlock || {};
      for (const c of u.chars || []) {
        if (!save.chars.includes(c)) {
          save.chars.push(c);
          unlocks.push(`New fighter: ${ZB.byId(c).name}`);
        }
      }
      for (const id in u.forms || {}) {
        if ((save.forms[id] || 0) < u.forms[id]) {
          save.forms[id] = u.forms[id];
          unlocks.push(`New form: ${ZB.byId(id).name} — ${ZB.byId(id).forms[u.forms[id]].name}`);
        }
      }
      const first = !save.cleared[ep.id];
      save.cleared[ep.id] = Math.max(save.cleared[ep.id] || 0, n);
      persist();
      const list = [
        ['Clear the episode', true],
        [ep.goal === 'survive' ? 'Finish with 40% HP or more' : 'Win with 50% HP or more', star2],
        [ep.goal === 'survive' ? 'Finish with 70% HP or more' : 'Finish with a Super or Ultimate', star3],
      ];
      dialogue(ep.outro || [], () => showResults(true, n, list, unlocks, ep, first));
    } else if (opts.mode === 'story') {
      showResults(false, 0, [], [], ZB.episodeById(opts.ep));
    } else {
      // mastery: Battle-mode wins unlock a fighter's top forms
      const unlocks = [];
      if (res.win && opts.mode === 'versus') {
        const id = opts.p1.id, before = maxFormFor(id);
        save.wins = save.wins || {};
        save.wins[id] = (save.wins[id] || 0) + 1;
        persist();
        const after = maxFormFor(id);
        for (let i = before + 1; i <= after; i++) unlocks.push(`New form: ${ZB.byId(id).name} \u2014 ${ZB.byId(id).forms[i].name}`);
        const next = ZB.byId(id).forms.find((f, i) => i > after && f.mastery);
        if (next) unlocks.push(`Mastery: ${save.wins[id]}/${next.mastery} wins for ${next.name}`);
      }
      showResults(res.win, null, [[`Time: ${Math.round(res.time)}s`, true], [`HP left: ${Math.round(res.hpRatio * 100)}%`, res.win]], unlocks);
    }
  }
  function showResults(win, nStars, list, unlocks, ep, first) {
    const r = $('#results');
    r.classList.remove('hidden');
    $('#resTitle').textContent = win ? 'VICTORY' : 'DEFEAT';
    $('#resTitle').className = win ? 'win' : 'lose';
    $('#resStars').innerHTML = nStars == null ? '' : stars(nStars);
    $('#resList').innerHTML = list.map(([t, ok]) => `<li class="${ok ? 'ok' : 'no'}">${esc(t)}</li>`).join('');
    $('#resUnlocks').innerHTML = unlocks.map((u) => `<div>${esc(u)}</div>`).join('');
    const next = $('#resNext');
    next.classList.toggle('hidden', !(ep && win));
    next.onclick = () => {
      ZB.audio.play('ui');
      endBattle();
      if (ep.choice) return openChoice(ep.choice);
      const n = NEXT[ep.id];
      if (n && available(n)) openBrief(n);
      else go('story');
    };
    $('#resRetry').onclick = () => {
      ZB.audio.play('ui');
      launch(lastLaunch);
    };
    $('#resQuit').onclick = () => {
      ZB.audio.play('uiBack');
      quitToMenu(ep ? 'story' : 'menu');
    };
    ZB.audio.play(win ? 'spark' : 'ko');
  }
  function openChoice(ch) {
    hideScreens();
    showcase.show([{ id: 'kairo', form: 0, x: -1.3, yaw: 0.7 }, { id: 'rhen', form: 0, x: 1.3, yaw: -0.7 }]);
    $('#choicePrompt').textContent = ch.prompt;
    const box = $('#choiceOpts');
    box.innerHTML = '';
    for (const o of ch.options) {
      const b = document.createElement('button');
      b.innerHTML = `${esc(o.label)}<small>${esc(o.note || '')}</small>`;
      b.onclick = () => {
        ZB.audio.play('ui');
        $('#choice').classList.add('hidden');
        openBrief(o.next);
      };
      box.appendChild(b);
    }
    $('#choice').classList.remove('hidden');
  }

  // ---------------- pause
  function openPause() {
    if (!battle || battle.over || dlg) return;
    pauseOpen = true;
    battle.paused = true;
    $('#pMoveList').classList.add('hidden');
    $('#pause').classList.remove('hidden');
    ZB.audio.chargeLoop(false);
  }
  function closePause() {
    if (!pauseOpen) return;
    pauseOpen = false;
    $('#pause').classList.add('hidden');
    if (battle) battle.paused = false;
    ZB.clearInput();
  }
  $('#pauseBtn').addEventListener('click', openPause);
  $('#pResume').addEventListener('click', closePause);
  $('#pRestart').addEventListener('click', () => launch(lastLaunch));
  $('#pQuit').addEventListener('click', () => quitToMenu(lastLaunch && lastLaunch.mode === 'story' ? 'story' : 'menu'));
  $('#pMoves').addEventListener('click', () => {
    const d = battle.p1.def, el = $('#pMoveList');
    el.innerHTML = [
      ['J', 'Rush combo (tap up to 5 times)'], ['K', 'Smash — hold to charge, breaks guard'], ['L', 'Ki blast'], ['I (hold)', 'Charge ki — keep holding at full for SPARKING'],
      ['O', 'Guard — tap right before a hit to VANISH'], ['Shift', 'Step dodge / hold to boost'], ['J after knockback', 'Vanish chase (40 ki)'],
      ['U+J', d.supers[0].name], ['U+K', d.supers[1].name], ['U+L', d.ultimate.name + ' (Sparking only)'], ['U+O', 'Burst — escape combos (2 orbs)'], ['T', 'Transform (skill orbs)'], ['U+T', 'Jump to your highest affordable form (+1 orb)'],
    ].map(([k, t]) => `<div><b>${esc(k)}</b> — ${esc(t)}</div>`).join('');
    el.classList.toggle('hidden');
  });

  // ---------------- main loop
  ZB.setupTouch(document.body);
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const inp = ZB.readInput();
    if (dlg) {
      tickDialogue(dt);
      if (inp.dashP) advance();
    }
    if (battle) {
      if (inp.pauseP && !dlg) pauseOpen ? closePause() : openPause();
      battle.update(dt, pauseOpen || dlg ? {} : inp);
      hudUpdate(battle, pauseOpen ? {} : inp, dt);
    } else {
      showcase.update(dt);
    }
  }
  requestAnimationFrame(frame);
  ZB.debug = { launch, showcase, get battle() { return battle; } };
})();
