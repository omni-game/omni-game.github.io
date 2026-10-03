window.OMNI_BUILD=52;
'use strict';
(() => {
const $ = (s) => document.querySelector(s),
  canvas = $('#world'),
  ctx = canvas.getContext('2d', { alpha: false });
const W = 960,
  H = 540,
  WW = 1600,
  WH = 900,
  STORE = 'omni-forest-v1';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
  dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const ALIENS = {
  heatblast: {
    name: 'Heatblast',
    row: 1,
    color: '#ffc276',
    skills: [
      { name: 'Bola de fuego', short: 'FUEGO', unlock: 0, cost: 0, cd: 0.65, damage: 20 },
      { name: 'Ráfaga ígnea', short: 'RÁFAGA', unlock: 15, cost: 5, cd: 3.5, damage: 14 },
      { name: 'Anillo solar', short: 'ANILLO', unlock: 40, cost: 9, cd: 7, damage: 40 },
      { name: 'Meteoro', short: 'METEORO', unlock: 75, cost: 16, cd: 11, damage: 72 },
    ],
  },
  diamond: {
    name: 'Diamante',
    row: 4,
    color: '#a0f6dc',
    skills: [
      { name: 'Lanza de diamantes', short: 'LANZA', unlock: 0, cost: 0, cd: 0.7, damage: 19 },
      { name: 'Escudo de diamante', short: 'ESCUDO', unlock: 15, cost: 7, cd: 14, damage: 0 },
      { name: 'Campo de cristales', short: 'CAMPO', unlock: 40, cost: 10, cd: 8, damage: 9 },
      { name: 'Diamante celeste', short: 'CELESTE', unlock: 75, cost: 18, cd: 12, damage: 70 },
    ],
  },
};
ALIENS.heatblast.hp = 200;
ALIENS.diamond.hp = 200;
ALIENS.fourarms = {
  name: 'Cuatro Brazos',
  row: 5,
  hp: 400,
  color: '#ffad96',
  skills: [
    { name: 'Aplauso sónico', short: 'APLAUSO', unlock: 0, cost: 0, cd: 0.95, damage: 22 },
    { name: 'Salto aplastante', short: 'SALTO', unlock: 15, cost: 0, cd: 7, damage: 48 },
    { name: 'Roca gigante', short: 'ROCA', unlock: 40, cost: 0, cd: 5, damage: 44 },
    { name: 'Furia sísmica', short: 'SISMO', unlock: 75, cost: 0, cd: 14, damage: 26 },
  ],
};
ALIENS.xlr8 = {
  name: 'XLR8',
  row: 11,
  hp: 200,
  color: '#7bdfff',
  skills: [
    { name: 'Golpes rápidos', short: 'RÁPIDOS', unlock: 0, cost: 0, cd: 0.7, damage: 6 },
    { name: 'Tornado', short: 'TORNADO', unlock: 15, cost: 0, cd: 8, damage: 8 },
    { name: 'Zigzag', short: 'ZIGZAG', unlock: 40, cost: 0, cd: 6, damage: 28 },
    { name: 'Embestida supersónica', short: 'EMBESTIDA', unlock: 75, cost: 0, cd: 12, damage: 54 },
  ],
};
ALIENS.bestia = {
  name: 'Bestia',
  row: 16,
  hp: 250,
  color: '#b8ff85',
  skills: [
    { name: 'Rasguño', short: 'RASGUÑO', unlock: 0, cost: 0, cd: 0.75, damage: 23 },
    { name: 'Sentido sensorial', short: 'SENTIDOS', unlock: 15, cost: 0, cd: 14, damage: 0 },
    { name: 'Embestida salvaje', short: 'EMBESTIDA', unlock: 40, cost: 0, cd: 6, damage: 38 },
    { name: 'Mordida feroz', short: 'MORDIDA', unlock: 75, cost: 0, cd: 9, damage: 53 },
  ],
};
ALIENS.insect = {
  name: 'Insecotide',
  row: 21,
  hp: 200,
  color: '#b6ed6d',
  skills: [
    { name: 'Escupitajo viscoso', short: 'ESCUPITAJO', unlock: 0, cost: 0, cd: 0.9, damage: 18 },
    { name: 'Charco corrosivo', short: 'CHARCO', unlock: 15, cost: 0, cd: 9, damage: 6 },
    { name: 'Saliva venenosa', short: 'VENENO', unlock: 40, cost: 0, cd: 6, damage: 12 },
    { name: 'Vuelo', short: 'VOLAR', unlock: 75, cost: 0, cd: 20, damage: 0 },
  ],
};
const SKINS = [
  { name: 'Original', row: 0 },
  { name: 'Urbano', row: 9 },
  { name: 'Plateado', row: 10 },
];
const SPEEDS = {
  human: 220,
  heatblast: 160,
  diamond: 200,
  fourarms: 180,
  xlr8: 360,
  bestia: 255,
  insect: 190,
};
const moveSpeed = () =>
  player.downed
    ? 0
    : race === 'osmo'
    ? player.form === 'stone'
      ? 180
      : player.form === 'electric'
        ? 260
        : 220
    : player.alien && player.activeAlien === 'insect' && player.flight > 0
      ? 275
      : SPEEDS[player.alien ? player.activeAlien : 'human'];
const SKILL_COST = [0, 3, 6, 12],
  EXTRA_COST = 5;
for (const a of Object.values(ALIENS))
  a.skills.forEach((k, i) => {
    if (!(k.cost > 0)) k.cost = SKILL_COST[i] || 0;
  });
const REGIONS = window.OMNI_REGIONS;
let citizens = [],
  civilStates = {},
  officers = [],
  hostileShots = [];
let law = { karma: 0, heat: 0, timer: 0, spawn: 1, notice: 0 };
let nextAttackId = 1;
const isCity = () => !!REGIONS[zone].city;
const wantedLevel = () => (law.timer <= 0 ? 0 : law.heat >= 60 ? 3 : law.heat >= 25 ? 2 : 1);
let zone = 1,
  zoneStates = {},
  discovered = ['camp'],
  opened = [],
  transition = 0,
  gateLock = 0,
  migrated = false;
const mastery = () => player.masteries[player.alien ? player.activeAlien : player.selected];
const alien = () => ALIENS[player.alien ? player.activeAlien : player.selected];
const currentSkills = () => alien().skills;
const region = () => REGIONS[zone];
const sceneZoom = () => ([8, 9, 10, 12].includes(zone) ? 0.65 : 1);
const cameraMaxX = () => Math.max(0, WW - W / sceneZoom());
const cameraMaxY = () => Math.max(0, WH - H / sceneZoom() + (zone >= 6 ? 140 : 0));
const npcHere = () => zone === 1;
const newFrames = [
  [
    [77, 105, 232, 381],
    [442, 105, 262, 377],
    [806, 100, 272, 383],
    [1185, 105, 287, 383],
  ],
  [
    [68, 543, 279, 417],
    [440, 541, 280, 421],
    [775, 549, 294, 414],
    [1077, 554, 453, 409],
  ],
];
const frames = [
  [
    [87, 56, 168, 246],
    [398, 55, 164, 247],
    [687, 58, 177, 244],
    [976, 65, 245, 237],
  ],
  [
    [74, 323, 204, 297],
    [372, 322, 204, 298],
    [657, 324, 186, 296],
    [908, 334, 332, 286],
  ],
  [
    [83, 643, 212, 258],
    [392, 643, 184, 258],
    [668, 645, 187, 255],
    [924, 653, 309, 246],
  ],
  [
    [91, 920, 160, 290],
    [386, 920, 171, 290],
    [690, 923, 174, 288],
    [980, 916, 224, 295],
  ],
];
const art = {},
  particles = [],
  projectiles = [],
  numbers = [],
  effects = [];
let ready = false,
  started = false,
  paused = false,
  dialogOpen = false,
  clock = 0,
  last = 0,
  saveClock = 0,
  shake = 0,
  flash = 0,
  toastTime = 0,
  audioCtx = null,
  sound = true;
let cam = { x: 0, y: 260 },
  keys = {},
  stick = { x: 0, y: 0, id: null },
  held = -1,
  dayMode = 'noche';
let player = {
  x: 540,
  y: 627,
  face: 1,
  dx: 1,
  dy: 0,
  alien: false,
  hp: 100,
  battery: 100,
  watch: 'prototype',
  watchUnlocks: { prototype: true },
  alienUnlocks: {},
  watchFav: [],
  fusePartner: null,
  masterControl: false,
  ultimate: false,
  swapCool: 0,
  lowWarned: false,
  lock: 0,
  emptyLock: 0,
  mastery: 0,
  level: 1,
  xp: 0,
  inv: 0,
  anim: 0,
  attack: 0,
  moving: false,
  cool: [0, 0, 0, 0],
  selected: 'heatblast',
  activeAlien: 'heatblast',
  masteries: { heatblast: 0, diamond: 0, fourarms: 0, xlr8: 0 },
  cooldowns: { heatblast: [0, 0, 0, 0], diamond: [0, 0, 0, 0], fourarms: [0, 0, 0, 0], xlr8: [0, 0, 0, 0] },
  shield: 0,
  shieldTime: 0,
  attackFrame: 3,
  leap: null,
  skin: 0,
  motion: null,
  slideCool: 0,
};
let quest = { state: 'new', kills: 0, completions: 0 },
  enemies = [];
const npc = { x: 420, y: 596, face: 1 };
// OMNI 0.5: progression, races, boss and absorption. Included inside game closure at build-time.
const CORE_ALIENS = ['heatblast', 'diamond', 'fourarms', 'xlr8', 'bestia', 'insect'];
const EXTRA = {
  insect: [
    ['Batida sónica', 'BATIDA', 32, 8],
    ['Ráfaga pegajosa', 'TRIPLE', 12, 7],
  ],
  bestia: [
    ['Garra giratoria', 'GARRA', 43, 7],
    ['Rugido sísmico', 'RUGIDO', 56, 12],
  ],
  heatblast: [
    ['Lanza solar', 'LANZA SOLAR', 44, 5],
    ['Lluvia ígnea', 'LLUVIA', 18, 13],
  ],
  diamond: [
    ['Abanico de púas', 'ABANICO', 13, 5],
    ['Prisión cristalina', 'PRISIÓN', 46, 11],
  ],
  fourarms: [
    ['Doble martillo', 'MARTILLO', 42, 5],
    ['Onda tectónica', 'TECTÓNICA', 62, 12],
  ],
  xlr8: [
    ['Patada relámpago', 'PATADA', 36, 4.5],
    ['Órbita veloz', 'ÓRBITA', 12, 12],
  ],
};
for (const id of CORE_ALIENS)
  for (const [name, short, damage, cd] of EXTRA[id])
    ALIENS[id].skills.push({ name, short, damage, cd, unlock: 0, cost: 0, points: 3 });
const OSMO_FORMS = {
  human: { name: 'Osmosiano', hp: 100, color: '#d7b762' },
  wood: { name: 'Madera', hp: 200, color: '#ac713c' },
  stone: { name: 'Concreto', hp: 250, color: '#adb2bd' },
  electric: { name: 'Electricidad', hp: 200, color: '#80e8ff' },
  fire: { name: 'ADN de fuego', hp: 250, color: '#ffb264' },
};
const makeSkill = (name, short, damage, cd, unlock = 0) => ({ name, short, damage, cd, unlock, cost: 0 });
const OSMO_SKILLS = {
  human: [
    makeSkill('Puño', 'PUÑO', 12, 0.6),
    makeSkill('Doble golpe', 'DOBLE', 22, 3, 15),
    makeSkill('Impacto al suelo', 'IMPACTO', 30, 6, 40),
    makeSkill('Descarga cinética', 'CINÉTICA', 45, 10, 75),
  ],
  wood: [
    makeSkill('Puño de madera', 'MADERA', 18, 0.7),
    makeSkill('Astillas', 'ASTILLAS', 12, 3.5, 15),
    makeSkill('Raíces', 'RAÍCES', 8, 8, 40),
    makeSkill('Tronco ariete', 'ARIETE', 55, 11, 75),
  ],
  stone: [
    makeSkill('Puño de concreto', 'CONCRETO', 21, 0.8),
    makeSkill('Fragmento de roca', 'FRAGMENTO', 32, 4, 15),
    makeSkill('Pisotón pétreo', 'PISOTÓN', 38, 7, 40),
    makeSkill('Ruptura de suelo', 'RUPTURA', 60, 12, 75),
  ],
  electric: [
    makeSkill('Chispa', 'CHISPA', 18, 0.65),
    makeSkill('Arco eléctrico', 'ARCO', 28, 4, 15),
    makeSkill('Pulso electromagnético', 'PULSO', 38, 7, 40),
    makeSkill('Tormenta', 'TORMENTA', 16, 12, 75),
  ],
  fire: [
    makeSkill('Proyectil ígneo', 'BRASA', 21, 0.75),
    makeSkill('Llamarada', 'LLAMARADA', 38, 4, 15),
    makeSkill('Fuego circular', 'CÍRCULO', 43, 7, 40),
    makeSkill('Erupción', 'ERUPCIÓN', 70, 12, 75),
  ],
};
for (const a of Object.values(OSMO_SKILLS)) {
  a.push(
    { ...makeSkill('Golpe absorbente', 'ABSORBENTE', 34, 5), points: 3 },
    { ...makeSkill('Resonancia material', 'RESONANCIA', 58, 12), points: 3 },
  );
}
ALIENS.osmo = { name: 'Osmosiano', row: 14, hp: 100, color: '#d7b762', skills: OSMO_SKILLS.human };
let race = 'omni',
  profiles = {},
  bossTimer = 0,
  attackPage = 0;
const cleanClone = (o) => JSON.parse(JSON.stringify(o));
const playerTemplate = cleanClone(player);
function initProgress() {
  initV8();
  initV9();
  player.coins = Math.max(0, Math.floor(Number(player.coins) || 0));
  player.knightQuest = Object.assign({ state: 'new', kills: 0, completions: 0 }, player.knightQuest || {});
  player.cast = null;
  player.flight = 0;
  player.slow = 0;
  player.poison = null;
  player.jump = 0;
  player.jumpCool = 0;
  player.sense = 0;
  player.fireCharge = clamp(Number(player.fireCharge) || 0, 0, 60);
  if (player.form !== 'fire') player.fireCharge = 0;
  player.points = Number.isFinite(player.points) ? player.points : Math.max(0, player.level - 1);
  player.learned = player.learned || {};
  player.regenWait = Number.isFinite(player.regenWait) ? player.regenWait : 0;
  player.form = OSMO_FORMS[player.form] ? player.form : 'human';
  player.dnaFire = !!player.dnaFire;
  player.absorbUnlocks = player.absorbUnlocks || {};
  for (const id of Object.keys(ALIENS)) {
    player.masteries[id] = player.masteries[id] || 0;
    player.cooldowns[id] = Array.from({ length: 6 }, (_, i) => player.cooldowns[id]?.[i] || 0);
    player.learned[id] = player.learned[id] || [false, false];
  }
  player.cool = player.cooldowns[player.activeAlien];
  refreshOsmo();
}
function refreshOsmo() {
  const f = OSMO_FORMS[player.form || 'human'];
  ALIENS.osmo.name = f.name;
  ALIENS.osmo.hp = f.hp;
  ALIENS.osmo.color = f.color;
  ALIENS.osmo.skills = OSMO_SKILLS[player.form || 'human'];
}
function profileSnapshot() {
  zoneStates[region().id] = enemies;
  civilStates[region().id] = citizens;
  const p = cleanClone({ ...player, motion: null, leap: null });
  return cleanClone({ player: p, quest, zone, zoneStates, civilStates, law, discovered, opened, bossTimer });
}
function freshProfile() {
  const p = cleanClone(playerTemplate);
  p.selected = p.activeAlien = race === 'anodite' ? 'anodite' : 'osmo';
  p.skin = 0;
  return {
    player: p,
    quest: { state: 'new', kills: 0, completions: 0 },
    zone: 1,
    zoneStates: {},
    civilStates: {},
    law: { karma: 0, heat: 0, timer: 0, spawn: 1, notice: 0 },
    discovered: ['camp'],
    opened: [],
    bossTimer: 0,
  };
}
function applyProfile(s) {
  player = cleanClone(s.player);
  watchSanitize(s.player);
  quest = cleanClone(s.quest);
  zone = s.zone;
  zoneStates = cleanClone(s.zoneStates || {});
  civilStates = cleanClone(s.civilStates || {});
  law = cleanClone(s.law);
  discovered = [...s.discovered];
  opened = [...s.opened];
  bossTimer = s.bossTimer || 0;
  enemies = zoneStates[region().id] || [];
  officers = [];
  ensureCitizens();
  initProgress();
  player.motion = player.leap = null;
  player.attack = 0;
  projectiles.length = effects.length = hostileShots.length = particles.length = numbers.length = 0;
  attackPage = 0;
  toastTime = 0;
  $('#toast').classList.remove('show');
  resetInput();
  ensureBoss();
  cam.x = clamp(player.x - (W * 0.48) / sceneZoom(), 0, cameraMaxX());
  cam.y = clamp(player.y - (H * 0.61) / sceneZoom(), 0, cameraMaxY());
}
function chooseRace(id) {
  if (net.role) {
    toast('Sal de la sala antes de cambiar de raza; tu progreso se conserva');
    return;
  }
  if (id === race) return raceMenu();
  if (started && (player.regenWait > 0 || law.timer > 0)) {
    toast('Aléjate del combate: cambia de raza tras 20 s sin recibir daño y sin búsqueda');
    return;
  }
  profiles[race] = profileSnapshot();
  race = id;
  applyProfile(profiles[id] || freshProfile());
  persistGame();
  raceMenu();
}
function persistGame() {
  if (window.__omniImporting) return;
  try {
    profiles[race] = profileSnapshot();
    localStorage.setItem(
      STORE,
      JSON.stringify({ version: 9, ...profileSnapshot(), race, profiles, dayMode, sound, clock }),
    );
  } catch (e) {
    console.warn('Save failed', e);
  }
}
function raceMenu() {
  $('#alienskins').classList.toggle('hidden', race !== 'omni');
  showDialog(
    'TRES RAZAS · PROGRESOS INDEPENDIENTES',
    'Elige tu raza',
    '<p>Cada raza conserva su nivel, experiencia, maestría, puntos, misiones, monedas y karma. Cambiar no borra ninguna partida.</p><div class="racecards">' +
      [
        ['omni', 'Portador del Omnitrix', 'Seis aliens · tres skins'],
        ['osmo', 'Osmosiano', 'Madera · concreto · electricidad · ADN'],
        ['anodite', 'Anodita', 'Maná · vuelo · escudo · lazo · sanación'],
      ]
        .map(
          ([id, n, d]) =>
            '<button data-race="' +
            id +
            '" class="racecard ' +
            (race === id ? 'active' : '') +
            '"><b>' +
            n +
            '</b><p>' +
            d +
            '</p><small>Nivel ' +
            (id === race ? player.level : profiles[id]?.player.level || 1) +
            ' · ' +
            (id === race ? 'SELECCIONADO' : 'CAMBIAR') +
            '</small></button>',
        )
        .join('') +
      '</div>',
    [['LISTO', closeDialog]],
  );
  document.querySelectorAll('[data-race]').forEach((b) => (b.onclick = () => chooseRace(b.dataset.race)));
}
function skillId() {
  return race === 'osmo' ? 'osmo' : player.alien ? player.activeAlien : player.selected;
}
function unlockedSkill(id, i) {
  return i < 4 ? player.masteries[id] >= ALIENS[id].skills[i].unlock : !!player.learned[id]?.[i - 4];
}
function buySkill(id, i) {
  if (!CORE_ALIENS.includes(id) && id !== 'osmo') return false;
  if (i < 4 || i > 5 || player.learned[id][i - 4] || player.points < 3) return false;
  player.points -= 3;
  player.learned[id][i - 4] = true;
  persistGame();
  return true;
}
function refundSkills(id) {
  for (let i = 0; i < 2; i++)
    if (player.learned[id][i]) {
      player.points += 3;
      player.learned[id][i] = false;
    }
  persistGame();
  skillTree();
}
function skillTree() {
  const id = skillId(),
    a = ALIENS[id];
  showDialog(
    'ÁRBOL · ' + a.name.toUpperCase() + ' · ' + player.points + ' PUNTOS',
    'Domina tus habilidades',
    '<p>Ganas 1 punto por nivel. Cada habilidad nueva cuesta 3 puntos. Las cuatro originales se abren con maestría. Puedes devolver los puntos de esta rama.</p><div class="treegrid">' +
      a.skills
        .map(
          (k, i) =>
            '<button data-node="' +
            i +
            '" class="skillnode ' +
            (unlockedSkill(id, i) ? 'active' : '') +
            '"><b>' +
            ['I', 'II', 'III', 'IV', 'V', 'VI'][i] +
            ' · ' +
            k.name +
            '</b><small>' +
            (i < 4 ? 'Maestría ' + k.unlock : player.learned[id][i - 4] ? 'APRENDIDA' : '3 PUNTOS') +
            ' · ' +
            k.cd +
            ' s</small><span>' +
            k.damage +
            ' daño base' +
            (i >= 4 ? ' · adicional' : '') +
            '</span></button>',
        )
        .join('') +
      '</div>' +
      (race === 'osmo'
        ? '<p>Absorciones avanzadas: electricidad requiere M30 + 3 puntos; fuego requiere M60 + ADN del jefe + 3 puntos.</p><button id="unlockelectric" class="inlinebtn">ELECTRICIDAD · ' +
          (player.absorbUnlocks.electric ? 'APRENDIDA' : '3 PUNTOS') +
          '</button><button id="unlockfire" class="inlinebtn">ADN DE FUEGO · ' +
          (player.absorbUnlocks.fire ? 'APRENDIDA' : '3 PUNTOS') +
          '</button>'
        : ''),
    [
      ['VOLVER', closeDialog],
      ['DEVOLVER PUNTOS DE V / VI', () => refundSkills(id)],
    ],
  );
  document.querySelectorAll('[data-node]').forEach(
    (b) =>
      (b.onclick = () => {
        const i = +b.dataset.node;
        if (i < 4) {
          toast('Se desbloquea al alcanzar ' + a.skills[i].unlock + ' de maestría');
          return;
        }
        if (buySkill(id, i)) skillTree();
        else toast('Necesitas 3 puntos o ya conoces esta habilidad');
      }),
  );
  if (race === 'osmo') {
    for (const form of ['electric', 'fire'])
      $('#unlock' + form).onclick = () => {
        if (unlockAbsorption(form)) skillTree();
      };
  }
}
function unlockAbsorption(form) {
  const req = form === 'electric' ? 30 : 60;
  if (player.absorbUnlocks[form]) return false;
  if (player.points < 3 || mastery() < req || (form === 'fire' && !player.dnaFire)) {
    toast('Necesitas 3 puntos, M' + req + (form === 'fire' ? ' y ADN del jefe' : ''));
    return false;
  }
  player.points -= 3;
  player.absorbUnlocks[form] = true;
  persistGame();
  return true;
}
function materials() {
  return [
    { type: 'wood', x: zone === 1 ? 560 : 560, y: region().exitY + 25 },
    { type: 'stone', x: zone === 1 ? 780 : 850, y: region().exitY - 30 },
    ...(isCity() ? [{ type: 'electric', x: 1080, y: region().exitY + 20 }] : []),
  ];
}
function nearbyMaterial() {
  return materials().find((m) => dist(player, m) < 105);
}
function absorb(form) {
  if (race !== 'osmo') return false;
  if (form !== 'human' && player.battery <= 0) {
    toast('Necesitas algo de energía');
    return false;
  }
  if (form === 'acid' && !player.acid) {
    toast('Necesitas ácido osmosiano · Historia 02');
    return false;
  }
  if (form === 'electric' || form === 'fire') {
    if (!player.absorbUnlocks[form]) {
      toast('Desbloquea esta absorción en tu árbol');
      return false;
    }
  }
  if (form !== 'human' && form !== 'fire' && form !== 'acid') {
    const m = nearbyMaterial();
    if (!m || m.type !== form) {
      toast('Acércate a un material marcado: madera, concreto o generador');
      return false;
    }
  }
  const ratio = player.hp / maxHP();
  if (form !== player.form) player.fireCharge = 0;
  player.form = form;
  refreshOsmo();
  player.hp = clamp(ratio * maxHP(), 1, maxHP());
  player.attack = 0.5;
  player.attackFrame = 3;
  burst(player.x, player.y - 55, 35, ALIENS.osmo.color);
  tone(450, 0.3);
  closeDialog();
  persistGame();
  return true;
}
function absorptionMenu() {
  const m = nearbyMaterial();
  showDialog(
    'OSMOSIANO · MAESTRÍA ' + Math.floor(mastery()) + '%',
    'Absorber materia',
    '<p>Acércate a las fuentes marcadas del mapa. Madera: 200 vida. Concreto: 250. Electricidad: 200. ADN de fuego: 250. Se conserva tu porcentaje de vida al cambiar.</p><p>Cerca: <b>' +
      (m ? OSMO_FORMS[m.type].name : 'ningún material') +
      '</b><br>ADN del jefe: <b>' +
      (player.dnaFire ? 'OBTENIDO' : 'pendiente · 30% por victoria osmosiana') +
      '</b></p><p>Una forma absorbida dura hasta 120 s con energía completa; recuperas toda la energía en 40 s en tu forma base.</p>',
    [
      [
        'ABSORBER CERCA',
        () => {
          if (m) absorb(m.type);
          else toast('Busca una fuente marcada');
        },
      ],
      ['FORMA DE FUEGO', () => absorb('fire')],
      ...(player.acid ? [['FORMA ÁCIDA', () => absorb('acid')]] : []),
      ['VOLVER A BASE', () => absorb('human')],
      ['ÁRBOL', skillTree],
      ['CERRAR', closeDialog],
    ],
  );
}
function shoot(type, a, damage, speed = 420) {
  projectiles.push({
    type,
    x: player.x,
    y: player.y - 35,
    dx: Math.cos(a) * speed,
    dy: Math.sin(a) * speed,
    t: 1.4,
    r: type === 'boulder' ? 22 : 10,
    damage,
  });
}
function castArea(type, x, y, r, damage, duration = 0.6, color = '#efcd8d') {
  effects.push({ type, x, y, r, t: duration, max: duration, color });
  areaHit(x, y, r, damage, 0.25);
}
function extraAttack(i) {
  if (skillId() === 'insect') {
    insectAttack(i);
    return;
  }
  if (skillId() === 'bestia') {
    bestiaAttack(i);
    return;
  }
  const id = skillId(),
    s = ALIENS[id].skills[i];
  if (!unlockedSkill(id, i)) {
    toast('Aprende esta habilidad por 3 puntos en el árbol');
    return;
  }
  player.cool[i] = s.cd;
  player.attack = 0.5;
  if (id === 'heatblast' || id === 'diamond') beginCast(id, i);
  if (id === 'fourarms') musicalAttack(i);
  player.attackFrame = id === 'fourarms' ? 7 : id === 'xlr8' ? 3 : 3;
  const t = nearest(450),
    a = t ? Math.atan2(t.y - player.y, t.x - player.x) : Math.atan2(player.dy, player.dx),
    d = s.damage * multiplier();
  player.face = Math.cos(a) >= 0 ? 1 : -1;
  const aim = t || { x: player.x + Math.cos(a) * 140, y: player.y + Math.sin(a) * 80 };
  if (id === 'heatblast') {
    if (i === 4) {
      shoot('fire', a, d, 620);
      effects.push({ type: 'sonic', x: player.x, y: player.y - 35, a, t: 0.3, max: 0.3, r: 100 });
    } else
      effects.push({
        type: 'rain',
        x: aim.x,
        y: aim.y,
        r: 145,
        t: 2.5,
        max: 2.5,
        tick: 0,
        pulses: 0,
        damage: d,
        color: '#ffc064',
      });
  }
  if (id === 'diamond') {
    if (i === 4) for (let n = -2; n <= 2; n++) shoot('crystal', a + n * 0.13, d, 460);
    else {
      castArea('prison', aim.x, aim.y, 120, d, 2, '#a8ffdf');
      for (const e of enemies) if (e.alive && dist(e, aim) < 120) e.stun = 2;
    }
  }
  if (id === 'fourarms') {
    if (i === 4) castArea('slam', player.x, player.y, 140, d);
    else {
      effects.push({ type: 'fault', x: player.x, y: player.y, r: 290, a, t: 0.8, max: 0.8 });
      for (const e of combatants())
        if (
          e.alive &&
          dist(player, e) < 300 &&
          lineClear(player.x, player.y, e.x, e.y) &&
          Math.abs(
            Math.atan2(
              Math.sin(Math.atan2(e.y - player.y, e.x - player.x) - a),
              Math.cos(Math.atan2(e.y - player.y, e.x - player.x) - a),
            ),
          ) < 0.55
        )
          damageTarget(e, d, 0.7);
    }
  }
  if (id === 'xlr8') {
    if (i === 4) {
      player.motion = {
        type: 'sonicdash',
        t: 0.23,
        max: 0.23,
        dx: Math.cos(a),
        dy: Math.sin(a),
        hits: [],
        damage: d,
      };
      player.attackFrame = 6;
    } else {
      effects.push({
        type: 'orbit',
        x: aim.x,
        y: aim.y,
        r: 125,
        t: 1.7,
        max: 1.7,
        tick: 0,
        pulses: 0,
        damage: d,
        color: '#86e6ff',
      });
      player.attackFrame = 4;
    }
  }
  tone(620, 0.2, 'triangle');
}
function osmoAttack(i) {
  const s = currentSkills()[i];
  if (!unlockedSkill('osmo', i)) {
    toast(i < 4 ? 'Requiere maestría ' + s.unlock : 'Aprende esta habilidad en el árbol');
    return;
  }
  player.cool[i] = s.cd;
  player.attack = 0.4;
  player.fullFrame = i === 0 ? 3 : i === 1 ? 4 : i === 2 ? 5 : i === 3 ? 6 : 7;
  const target = nearest(460),
    a = target ? Math.atan2(target.y - player.y, target.x - player.x) : Math.atan2(player.dy, player.dx),
    d = s.damage * multiplier();
  player.face = Math.cos(a) >= 0 ? 1 : -1;
  const form = player.form;
  if (form === 'human' || form === 'fire') beginCast(form === 'fire' ? 'osmofire' : 'osmo', i);
  if (i >= 4) {
    castArea(
      i === 4 ? 'slam' : 'resonance',
      player.x,
      player.y,
      i === 4 ? 115 : 180,
      d,
      0.7,
      ALIENS.osmo.color,
    );
    return;
  }
  if (form === 'acid') return acidAttack(i, a, d, target); // Historia 02 (part-42)
  if (form === 'fire') {
    if (i === 0) shoot('fire', a, d);
    if (i === 1) {
      effects.push({ type: 'friendlyflame', x: player.x, y: player.y, a, t: 0.6, max: 0.6, r: 220 });
      for (const e of combatants())
        if (e.alive && dist(player, e) < 220 && lineClear(player.x, player.y, e.x, e.y)) {
          const angle = Math.atan2(e.y - player.y, e.x - player.x);
          if (Math.abs(Math.atan2(Math.sin(angle - a), Math.cos(angle - a))) < 0.55) damageTarget(e, d);
        }
    }
    if (i === 2) castArea('ring', player.x, player.y, 155, d);
    if (i === 3)
      effects.push({
        type: 'meteor',
        x: target?.x || player.x + 100,
        y: target?.y || player.y,
        t: 1.05,
        max: 1.05,
        r: 145,
        hit: false,
        damage: d,
      });
  } else if (form === 'electric') {
    if (i === 0 || i === 1) {
      shoot('electric', a, d, 550);
      if (i === 1)
        effects.push({
          type: 'resonance',
          x: player.x,
          y: player.y,
          r: 95,
          t: 0.3,
          max: 0.3,
          color: '#8dedff',
        });
    }
    if (i === 2) castArea('resonance', player.x, player.y, 155, d, 0.6, '#8dedff');
    if (i === 3)
      effects.push({
        type: 'rain',
        x: target?.x || player.x,
        y: target?.y || player.y,
        r: 150,
        t: 2.5,
        max: 2.5,
        tick: 0,
        pulses: 0,
        damage: d,
        color: '#8dedff',
      });
  } else if (i === 0 || (form === 'human' && i === 1)) {
    const t = nearest(i === 0 ? 90 : 105);
    effects.push({
      type: 'punch',
      x: player.x + Math.cos(a) * 45,
      y: player.y - 35,
      r: 30,
      t: 0.25,
      max: 0.25,
    });
    if (t) damageTarget(t, d);
  } else if (i === 1) {
    if (form === 'wood') for (let n = -1; n <= 1; n++) shoot('wood', a + n * 0.15, d);
    else shoot('boulder', a, d, 320);
  } else if (i === 2 && form === 'wood')
    effects.push({
      type: 'roots',
      x: target?.x || player.x,
      y: target?.y || player.y,
      r: 120,
      t: 3,
      max: 3,
      tick: 0,
      pulses: 0,
      damage: d,
      color: '#bd8d59',
    });
  else castArea('slam', player.x, player.y, i === 2 ? 140 : 190, d, 0.7, ALIENS.osmo.color);
  tone(250, 0.13, 'triangle');
}
function ensureBoss() {
  if (net.role === 'guest') return;
  if (zone !== 0 || arenaOn() || rush.on || F1().s3.step === 3) return; // no fire boss during the arena, Boss Rush or Kraal's fight
  let b = enemies.find((e) => e.majorBoss);
  if (b && b.alive) return;
  if (bossTimer > 0) return;
  const fresh = {
    id: 'emberboss',
    kind: 'boss',
    majorBoss: true,
    x: 1130,
    y: 710,
    homeX: 1130,
    homeY: 710,
    hp: 650,
    max: 650,
    alive: true,
    face: -1,
    anim: 0,
    moving: false,
    hit: 0,
    stun: 0,
    cast: 0,
    frame: 0,
    flameCD: 2,
    ballCD: 4,
    slamCD: 6,
    wind: 0,
  };
  if (b) Object.assign(b, fresh);
  else enemies.push(fresh);
  zoneStates[region().id] = enemies;
}
function bossReward(b, roll = Math.random()) {
  if (!b.alive) return;
  if (net.source === 'guest') {
    b.alive = false;
    b.hp = 0;
    bossTimer = 60;
    lanSend({ type: 'reward', xp: 120, dna: net.remote?.race === 'osmo' && roll < 0.3 });
    burst(b.x, b.y - 50, 45, '#ffb158');
    persistGame();
    return;
  }
  b.alive = false;
  b.hp = 0;
  bossTimer = 60;
  xp(120);
  if (race === 'osmo' && !player.dnaFire && roll < 0.3) {
    player.dnaFire = true;
    toast('¡ADN ígneo obtenido! Desbloquea su absorción en tu árbol');
  } else
    toast('Jefe derrotado · +120 EXP · Regresa en 60 s' + (race === 'osmo' ? ' · Sin ADN esta vez' : ''));
  burst(b.x, b.y - 50, 45, '#ffb158');
  persistGame();
}
function updateBoss(dt) {
  if (net.role === 'guest') return;
  bossTimer = Math.max(0, bossTimer - dt);
  ensureBoss();
  if (zone !== 0) return;
  const b = enemies.find((e) => e.majorBoss && e.alive);
  if (!b) return;
  b.hit = Math.max(0, b.hit - dt);
  b.stun = Math.max(0, b.stun - dt);
  b.cast = Math.max(0, b.cast - dt);
  for (const k of ['flameCD', 'ballCD', 'slamCD']) b[k] = Math.max(0, b[k] - dt);
  b.moving = false;
  const target = teamTargets().sort((a, c) => dist(a, b) - dist(c, b))[0];
  const d = dist(b, target);
  b.face = target.x >= b.x ? 1 : -1;
  if (b.stun > 0 || b.cast > 0 || d > 520) return;
  const a = Math.atan2(target.y - b.y, target.x - b.x);
  if (b.flameCD <= 0 && d < 250 && lineClear(b.x, b.y, target.x, target.y)) {
    b.flameCD = 4;
    b.cast = 1.2;
    b.frame = 3;
    effects.push({ type: 'bossflame', x: b.x, y: b.y, a, r: 230, t: 1.2, max: 1.2, hit: false });
  } else if (b.slamCD <= 0 && d < 160) {
    b.slamCD = 8;
    b.cast = 1.3;
    b.frame = 5;
    effects.push({ type: 'bossslam', x: b.x, y: b.y, r: 145, t: 1.3, max: 1.3, hit: false });
  } else if (b.ballCD <= 0 && lineClear(b.x, b.y, target.x, target.y)) {
    b.ballCD = 5.5;
    b.cast = 0.7;
    b.frame = 4;
    effects.push({ type: 'bossball', x: b.x, y: b.y, a, t: 0.7, max: 0.7, hit: false });
  } else if (d > 115) {
    moveActor(
      b,
      ((target.x - b.x) / Math.max(1, d)) * 104 * dt,
      ((target.y - b.y) / Math.max(1, d)) * 104 * dt,
    );
    b.anim += dt * 6;
    b.moving = true;
  }
}
function updateExpansion(dt) {
  updateV6(dt);
  updateV7(dt);
  updateRobot(dt);
  player.regenWait = player.downed ? 20 : Math.max(0, player.regenWait - dt);
  if (player.regenWait <= 0) player.hp = Math.min(maxHP(), player.hp + maxHP() * 0.0035 * dt);
  if (race === 'osmo' && player.form === 'human')
    player.masteries.osmo = Math.min(100, player.masteries.osmo + dt * 0.04);
  updateBoss(dt);
  for (const f of effects) {
    if (['rain', 'orbit', 'roots'].includes(f.type)) {
      f.tick -= dt;
      const limit = f.type === 'orbit' ? 5 : 4;
      if (f.tick <= 0 && f.pulses < limit) {
        f.tick += f.type === 'orbit' ? 0.32 : 0.65;
        f.pulses++;
        areaHit(f.x, f.y, f.r, f.damage, f.type === 'roots' ? 0.4 : 0);
        burst(f.x, f.y - 45, 12, f.color);
      }
    }
    if (f.type === 'bossball' && !f.hit && f.t < 0.22) {
      f.hit = true;
      hostileShots.push({
        type: 'bossfire',
        x: f.x,
        y: f.y - 35,
        dx: Math.cos(f.a) * 245,
        dy: Math.sin(f.a) * 245,
        t: 2.4,
        r: 12,
        damage: 9,
      });
    }
    if (f.type === 'bossflame' && !f.hit && f.t < 0.55) {
      f.hit = true;
      for (const target of teamTargets()) {
        const a = Math.atan2(target.y - f.y, target.x - f.x);
        if (
          dist(target, f) < f.r &&
          Math.abs(Math.atan2(Math.sin(a - f.a), Math.cos(a - f.a))) < 0.5 &&
          lineClear(f.x, f.y, target.x, target.y)
        )
          hurtTeam(target, 9);
      }
    }
    if (f.type === 'bossslam' && !f.hit && f.t < 0.4) {
      f.hit = true;
      for (const target of teamTargets())
        if (dist(target, f) < f.r && lineClear(f.x, f.y, target.x, target.y)) hurtTeam(target, 10);
      shake = 0.2;
    }
  }
}
function drawExpansion() {
  if (race === 'osmo')
    for (const m of materials()) {
      ctx.fillStyle = m.type === 'wood' ? '#98622e' : m.type === 'stone' ? '#969da6' : '#385c71';
      ctx.fillRect(m.x - 23, m.y - 29, 46, 28);
      ctx.strokeStyle = m.type === 'electric' ? '#82f3ff' : '#25282c';
      ctx.lineWidth = 3;
      ctx.strokeRect(m.x - 23, m.y - 29, 46, 28);
      if (m.type === 'wood') {
        ctx.fillStyle = '#ce9c57';
        ctx.fillRect(m.x - 20, m.y - 21, 40, 4);
        ctx.fillRect(m.x - 20, m.y - 10, 40, 4);
      }
      if (m.type === 'electric') txt('ϟ', m.x, m.y - 6, 25, '#8dffff');
      txt(OSMO_FORMS[m.type].name.toUpperCase(), m.x, m.y - 40, 8, '#e2e1bd');
    }
  for (const f of effects) {
    let p = 1 - f.t / f.max;
    ctx.save();
    ctx.globalAlpha = Math.min(1, f.t * 3);
    if (['resonance', 'orbit', 'prison', 'roots', 'rain'].includes(f.type)) {
      ctx.strokeStyle = f.color || '#b3ffe7';
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        let a = clock * 5 + (i * Math.PI) / 2;
        ctx.beginPath();
        if (f.type === 'rain') {
          let x = f.x + Math.cos(i * 2.4) * f.r * 0.8;
          ctx.moveTo(x, f.y - 220 + ((p * 3) % 1) * 180);
          ctx.lineTo(x + 10, f.y - 190 + ((p * 3) % 1) * 180);
        } else {
          ctx.ellipse(f.x, f.y - 10 - i * 12, f.r * (0.6 + i * 0.12), 12 + i * 3, a * 0.05, 0, Math.PI * 1.7);
        }
        ctx.stroke();
      }
      if (f.type === 'prison' || f.type === 'roots')
        for (let i = 0; i < 8; i++)
          crystal(f.x + Math.cos(i) * f.r * 0.8, f.y + Math.sin(i) * f.r * 0.25, 13, 70);
    }
    if (f.type === 'bossflame') {
      const active = f.type === 'friendlyflame' || f.t < 0.55;
      ctx.translate(f.x, f.y);
      ctx.rotate(f.a);
      ctx.fillStyle = active ? '#ff8b2699' : '#edb05b33';
      ctx.strokeStyle = active ? '#ffda79' : '#ffba72';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, f.r, -0.5, 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (active) {
        ctx.fillStyle = '#ffef9e';
        for (let i = 0; i < 12; i++) ctx.fillRect(25 + i * 15, -8 + Math.sin(clock * 30 + i) * 16, 20, 10);
      }
    }
    if (f.type === 'bossslam') {
      ctx.strokeStyle = f.t < 0.4 ? '#ffe2a5' : '#ff9678';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.r, f.r * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
      txt(f.t > 0.4 ? '¡ALÉJATE!' : '', f.x, f.y - 50, 12, '#ffb1a2');
    }
    if (f.type === 'fault') {
      ctx.strokeStyle = '#e2c7a0';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      for (let i = 1; i <= 8; i++)
        ctx.lineTo(f.x + Math.cos(f.a) * i * 34, f.y + Math.sin(f.a) * i * 34 + (i % 2 ? 8 : -8));
      ctx.stroke();
    }
    ctx.restore();
  }
}
function hudExpansion() {
  hudV6();
  hudV7();
  const id = skillId();
  $('#energyname').textContent = race === 'osmo' ? 'ENERGÍA' : race === 'anodite' ? 'MANÁ' : getWatch().hudName;
  watchHud();
  $('#treebtn').textContent = 'ÁRBOL · ' + player.points + ' PT';
  $('#regen').textContent =
    player.hp >= maxHP()
      ? 'VIDA COMPLETA'
      : player.regenWait > 0
        ? 'REGENERACIÓN EN ' + Math.ceil(player.regenWait) + ' s'
        : 'REGENERANDO · 0,35% / s';
  $('#moreattacks').textContent = attackPage ? '← ATAQUES I–IV' : 'ATAQUES V–VI →';
  const buttons = [...document.querySelectorAll('.attack')];
  for (let j = 0; j < 4; j++) {
    const i = attackPage ? j + 4 : j,
      b = buttons[j];
    b.classList.toggle('hidden', i > 5);
    if (i > 5) continue;
    const s = ALIENS[id].skills[i],
      usable = (race === 'osmo' || player.alien || i === 0) && unlockedSkill(id, i);
    b.dataset.skill = i;
    b.querySelector('b').textContent = ['I', 'II', 'III', 'IV', 'V', 'VI'][i];
    b.querySelector('span').textContent = race !== 'osmo' && !player.alien && i === 0 ? 'PUÑO' : s.short;
    b.querySelector('small').textContent = !usable
      ? i >= 4
        ? 'ÁRBOL · 3 PT'
        : 'M ' + s.unlock
      : player.cool[i] > 0.1
        ? player.cool[i].toFixed(1) + ' s'
        : (() => {
            const c = skillCost(i);
            return c > 0 ? 'LISTO · ' + c + '%' : 'LISTO';
          })();
    b.classList.toggle('locked', !usable);
    b.classList.toggle('cooldown', player.cool[i] > 0);
  }
  if (race === 'osmo') {
    $('#form').textContent = OSMO_FORMS[player.form].name.toUpperCase();
    $('#transformlabel').textContent = 'ABSORBER';
    $('#transformhint').textContent = 'MATERIA / ADN';
    $('#dialname').textContent = 'OSMOSIANO';
    $('#dialprev').disabled = $('#dialnext').disabled = true;
    $('#masterylabel').textContent = 'MAESTRÍA DE ABSORCIÓN';
    $('#batteryhint').textContent =
      player.form === 'human' ? 'Recarga en forma base' : Math.ceil(player.battery * 1.2) + ' s de material';
    $('#slide').classList.add('hidden');
  }
  const b = zone === 0 ? enemies.find((e) => e.majorBoss && e.alive) : null;
  $('#bossbar').classList.toggle('hidden', zone !== 0);
  $('#bossbar').textContent = b
    ? 'JEFE ÍGNEO · NV. RECOMENDADO 10 · ' + Math.ceil(b.hp) + ' / 650'
    : 'JEFE · REAPARECE EN ' + Math.ceil(bossTimer) + ' s';
}
const tintCanvas = document.createElement('canvas'),
  tintCtx = tintCanvas.getContext('2d');
function drawOsmo(frame, x, y, face, avatar = player) {
  const cf = castFrame(avatar);
  if (cf !== null && (avatar.form === 'human' || (avatar.form === 'fire' && avatar.fireCharge < 60))) {
    sprite(24, cf, x, y, 132, face);
    return;
  }
  if (avatar.form === 'fire' && avatar.fireCharge >= 60) {
    sprite(
      19,
      avatar.attack > 0
        ? avatar.cast && 1 - avatar.cast.t / avatar.cast.max < 0.2
          ? 0
          : avatar.cast && avatar.cast.t / avatar.cast.max < 0.2
            ? 0
            : avatar.fullFrame || 3
        : frame,
      x,
      y,
      145,
      face,
    );
    return;
  }
  const row = avatar.form === 'fire' ? 15 : 14,
    { table, sheet } = spriteInfo(row),
    f = table[frame] || table[0],
    h = 132,
    scale = h / table[0][3],
    w = f[2] * scale,
    dh = f[3] * scale;
  tintCanvas.width = Math.ceil(w);
  tintCanvas.height = Math.ceil(dh);
  tintCtx.imageSmoothingEnabled = false;
  tintCtx.drawImage(sheet, ...f, 0, 0, w, dh);
  if (row === 14 && frame === 3) {
    const base = table[0],
      cut = 0.69,
      lh = h * (1 - cut),
      bw = base[2] * scale;
    tintCtx.clearRect(0, dh - lh, w, lh);
    tintCtx.drawImage(
      sheet,
      base[0],
      base[1] + base[3] * cut,
      base[2],
      base[3] * (1 - cut),
      (w - bw) / 2,
      dh - lh,
      bw,
      lh,
    );
  }
  if (['wood', 'stone', 'electric', 'acid'].includes(avatar.form)) {
    tintCtx.globalCompositeOperation = 'source-atop';
    tintCtx.fillStyle =
      avatar.form === 'wood' ? '#a56d37b0' : avatar.form === 'stone' ? '#959eaed0' : avatar.form === 'acid' ? '#8cff2a66' : '#53d4ff55';
    tintCtx.fillRect(0, 0, w, dh);
    tintCtx.fillStyle = avatar.form === 'wood' ? '#70472899' : '#e3eaf14a';
    for (let i = 0; i < 8; i++) tintCtx.fillRect(w * 0.2 + (i % 2) * 5, dh * 0.45 + i * 7, w * 0.6, 2);
    tintCtx.globalCompositeOperation = 'source-over';
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  ctx.globalAlpha = avatar.inv > 0 && Math.floor(clock * 12) % 2 === 0 ? 0.5 : 1;
  ctx.drawImage(tintCanvas, -w / 2, -dh);
  ctx.restore();
  if (avatar.form === 'electric') {
    ctx.strokeStyle = '#a0f7ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 35, y - 100);
    ctx.lineTo(x - 45, y - 65);
    ctx.lineTo(x - 30, y - 73);
    ctx.lineTo(x - 40, y - 25);
    ctx.stroke();
  }
}

// OMNI 0.9 — gameplay extension. Source kept here for review; compiled into game.js.
function jump() {
  if (!started || paused || player.downed || player.alien || player.leap || player.motion || player.jumpCool > 0) return;
  player.jump = 0.75;
  player.jumpCool = 1.15;
  burst(player.x, player.y - 3, 8, '#b5c2ae');
  tone(310, 0.08, 'triangle');
}
function jumpHeight() {
  return player.jump > 0 ? Math.sin(((0.75 - player.jump) / 0.75) * Math.PI) * 72 : 0;
}
function updateV6(dt) {
  player.jump = Math.max(0, (player.jump || 0) - dt);
  player.jumpCool = Math.max(0, (player.jumpCool || 0) - dt);
  player.sense = Math.max(0, (player.sense || 0) - dt);
  if (race === 'osmo' && player.form === 'fire') {
    const old = player.fireCharge;
    player.fireCharge = Math.min(60, old + dt);
    if (old < 60 && player.fireCharge >= 60) {
      player.hp = clamp((player.hp / 250) * 300, 1, 300);
      flash = 0.35;
      burst(player.x, player.y - 65, 45, '#ffce65');
      toast('¡FUEGO COMPLETO! · 300 vida · +12% daño');
    }
  } else player.fireCharge = 0;
}
function hudV6() {
  // human: jump · alien: dodge (Diamante keeps its slide button in this spot)
  $('#jump').classList.toggle('hidden', player.alien && player.activeAlien === 'diamond');
  $('#jump').disabled = player.alien ? (player.dodgeCool || 0) > 0 : player.jumpCool > 0;
  $('#jump').textContent = player.alien
    ? 'ESQUIVAR · ESPACIO'
    : player.jumpCool > 0
      ? 'SALTO ' + player.jumpCool.toFixed(1)
      : 'SALTAR · ESPACIO';
  const show = race === 'osmo' && player.form === 'fire';
  $('#fullpower').classList.toggle('hidden', !show);
  if (show) {
    $('#fullpower span').textContent =
      player.fireCharge >= 60
        ? 'FUEGO COMPLETO · 300 VIDA · +12% DAÑO'
        : 'PODER ÍGNEO · ' + Math.floor((player.fireCharge / 60) * 100) + '%';
    $('#fullpower i').style.width = (player.fireCharge / 60) * 100 + '%';
  }
  $('#lanstatus').classList.toggle('hidden', !net.role);
  if (net.role)
    $('#lanstatus').textContent = net.remoteAway
      ? 'OTRO JUGADOR EN MENÚ · PARTIDA PAUSADA'
      : net.peer
        ? (net.role === 'host' ? 'ANFITRIÓN' : 'INVITADO') + ' · 2 JUGADORES' + (net.ff ? ' · FUEGO AMIGO' : ' · CO-OP')
        : net.info || 'CONECTANDO…';
}
function bestiaAttack(i, prepared = false) {
  const s = ALIENS.bestia.skills[i];
  if (!prepared) {
    if (!unlockedSkill('bestia', i)) {
      toast('Aprende esta habilidad por 3 puntos en el árbol');
      return;
    }
    player.cool[i] = s.cd;
  }
  const t = nearest(350),
    a = t ? Math.atan2(t.y - player.y, t.x - player.x) : Math.atan2(player.dy, player.dx),
    d = s.damage * multiplier();
  player.face = Math.cos(a) >= 0 ? 1 : -1;
  player.attack = 0.45;
  player.attackFrame = [3, 4, 5, 6, 8, 9][i];
  if (i === 1) {
    player.sense = 8;
    effects.push({ type: 'sense', x: player.x, y: player.y, r: 550, t: 1, max: 1 });
    toast('SENTIDOS · Presencias reveladas durante 8 s');
  }
  if (i === 2) {
    player.motion = {
      type: 'beastcharge',
      t: 0.55,
      max: 0.55,
      dx: Math.cos(a),
      dy: Math.sin(a),
      hits: [],
      damage: d,
    };
    player.attack = 0.55;
  }
  if (i === 0 || i === 3) {
    effects.push({
      type: i === 0 ? 'claw' : 'bite',
      x: player.x,
      y: player.y - 35,
      a,
      r: i === 0 ? 110 : 130,
      t: 0.45,
      max: 0.45,
    });
    for (const e of combatants())
      if (e.alive && dist(player, e) < (i === 0 ? 110 : 130) && lineClear(player.x, player.y, e.x, e.y)) {
        const b = Math.atan2(e.y - player.y, e.x - player.x);
        if (Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a))) < 0.9) damageTarget(e, d, 0.15);
      }
  }
  if (i === 4) {
    castArea('clawspin', player.x, player.y, 140, d, 0.7, '#eecc8b');
    player.attack = 0.7;
  }
  if (i === 5) {
    castArea('beastroar', player.x, player.y, 190, d, 0.9, '#baff86');
    for (const e of enemies) if (e.alive && dist(player, e) < 190) e.stun = Math.max(e.stun, 1);
    player.attack = 0.8;
  }
  tone(i === 1 ? 850 : 130, 0.2, 'triangle');
}
function updateKnight(e, dt) {
  e.hit = Math.max(0, e.hit - dt);
  e.stun = Math.max(0, e.stun - dt);
  e.cd = Math.max(0, e.cd - dt);
  e.rcd = Math.max(0, e.rcd - dt);
  e.cast = Math.max(0, e.cast - dt);
  e.moving = false;
  if (!e.alive) {
    e.respawn -= dt;
    if (e.respawn <= 0) {
      Object.assign(e, {
        alive: true,
        hp: e.max,
        x: e.homeX,
        y: e.homeY,
        cd: 2,
        rcd: 3,
        wind: 0,
        shotWind: 0,
      });
    }
    return;
  }
  if (e.stun > 0) return;
  const t = teamTargets().sort((a, b) => dist(e, a) - dist(e, b))[0] || player,
    d = dist(e, t);
  e.face = t.x >= e.x ? 1 : -1;
  if (e.shotWind > 0) {
    e.shotWind -= dt;
    e.cast = 0.15;
    if (e.shotWind <= 0)
      hostileShots.push({
        type: 'green',
        x: e.x,
        y: e.y - 45,
        dx: Math.cos(e.aim) * 260,
        dy: Math.sin(e.aim) * 260,
        t: 2.2,
        r: 10,
        damage: 11,
      });
    return;
  }
  if (e.wind > 0) {
    e.wind -= dt;
    if (e.wind <= 0 && d < 80 && lineClear(e.x, e.y, t.x, t.y)) hurtTeam(t, 12);
    return;
  }
  if (d > 530) return;
  if (e.knight === 'ranged' && d < 440 && e.rcd <= 0 && lineClear(e.x, e.y, t.x, t.y)) {
    e.aim = Math.atan2(t.y - e.y, t.x - e.x);
    e.shotWind = 0.65;
    e.cast = 0.65;
    e.rcd = 4;
    return;
  }
  const stop = e.knight === 'ranged' ? 255 : 60;
  if (d > stop || !lineClear(e.x, e.y, t.x, t.y)) {
    moveActor(e, ((t.x - e.x) / Math.max(1, d)) * 92 * dt, ((t.y - e.y) / Math.max(1, d)) * 92 * dt);
    e.anim += dt * 7;
    e.moving = true;
  } else if (e.knight === 'ranged' && d < 140) {
    moveActor(e, ((e.x - t.x) / Math.max(1, d)) * 65 * dt, ((e.y - t.y) / Math.max(1, d)) * 65 * dt);
    e.anim += dt * 6;
    e.moving = true;
  } else if (e.knight === 'melee' && e.cd <= 0) {
    e.wind = 0.6;
    e.cd = 2.4;
  }
}
function drawVerticalGates() {
  const r = region();
  for (const dir of ['up', 'down'])
    if (r.links[dir] !== undefined) {
      const y = dir === 'up' ? floorBounds(r.portalX).top + 15 : r.bottom - 8;
      ctx.fillStyle = '#153331d9';
      ctx.fillRect(r.portalX - 77, y - 27, 154, 25);
      ctx.strokeStyle = '#bcdea0';
      ctx.strokeRect(r.portalX - 77, y - 27, 154, 25);
      txt(
        (dir === 'up' ? '↑ ' : '↓ ') + REGIONS[r.links[dir]].name.toUpperCase(),
        r.portalX,
        y - 10,
        9,
        '#d3f6ab',
      );
      ctx.strokeStyle = '#a3d4a666';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(r.portalX, y, 55, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
}
function drawV6Effects() {
  for (const f of effects) {
    if (!['claw', 'bite', 'clawspin', 'beastroar', 'sense'].includes(f.type)) continue;
    const p = 1 - f.t / f.max;
    ctx.save();
    ctx.globalAlpha = Math.min(1, f.t * 4);
    ctx.translate(f.x, f.y);
    ctx.strokeStyle = f.type === 'sense' || f.type === 'beastroar' ? '#b8ff85' : '#ffe1a0';
    ctx.lineWidth = 4;
    if (f.type === 'claw') {
      ctx.rotate(f.a);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(30, -18 + i * 14, 30 + p * 45, -1.2, 0.6);
        ctx.stroke();
      }
    } else if (f.type === 'bite') {
      ctx.rotate(f.a);
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(30 + i * 12, -25 * (1 - p));
        ctx.lineTo(35 + i * 12, 0);
        ctx.lineTo(30 + i * 12, 25 * (1 - p));
        ctx.stroke();
      }
    } else {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          Math.max(1, f.r * p - i * 16),
          Math.max(1, (f.r * p - i * 16) * 0.45),
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
function drawSensory() {
  if (!started || !player.alien || player.activeAlien !== 'bestia') return;
  ctx.fillStyle = '#010704dc';
  ctx.fillRect(0, 0, WW, WH + 140);
  const range = player.sense > 0 ? 650 : 245;
  ctx.strokeStyle = '#487f4855';
  ctx.lineWidth = 2;
  for (const b of region().colliders)
    if (Math.hypot(b.x + b.w / 2 - player.x, b.y + b.h - player.y) < range)
      ctx.strokeRect(b.x, b.y, b.w, b.h);
  for (const a of [
    ...enemies,
    ...citizens,
    ...officers,
    ...remoteTargets(),
    ...(npcHere() ? [{ ...npc, alive: true }] : []),
  ])
    if (a.alive && dist(player, a) < range) {
      const power = player.sense > 0 ? 1 : 0.55 + Math.sin(clock * 6) * 0.2;
      ctx.globalAlpha = power;
      const row = a.robotBoss
        ? 28
        : a.majorBoss
          ? 13
          : a.knight === 'melee'
            ? 17
            : a.knight === 'ranged'
              ? 18
              : a.kind === 'civil'
                ? a.row
                : a.kind === 'police'
                  ? 8
                  : a.kind === 'remote'
                    ? a.race === 'osmo'
                      ? 14
                      : a.alien
                        ? remoteAlien(a.activeAlien).row
                        : SKINS[a.skin].row
                    : a === npc
                      ? 3
                      : a.kind
                        ? '2'
                        : 3;
      const info = spriteInfo(Number(row)),
        f = info.table[a.moving ? 1 + (Math.floor(a.anim || 0) % 2) : 0],
        height = a.robotBoss ? 190 : a.majorBoss ? 155 : a.knight ? 119 : 105,
        scale = height / info.table[0][3],
        w = f[2] * scale,
        h = f[3] * scale;
      tintCanvas.width = Math.ceil(w);
      tintCanvas.height = Math.ceil(h);
      tintCtx.imageSmoothingEnabled = false;
      tintCtx.drawImage(info.sheet, ...f, 0, 0, w, h);
      tintCtx.globalCompositeOperation = 'source-in';
      tintCtx.fillStyle = '#8fff93';
      tintCtx.fillRect(0, 0, w, h);
      tintCtx.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.scale(a.face || 1, 1);
      ctx.drawImage(tintCanvas, -w / 2, -h);
      ctx.restore();
      txt(
        a.robotBoss
          ? 'ROBOT'
          : a.majorBoss
            ? 'ÍGNEO'
            : a.knight
              ? 'CABALLERO'
              : a.kind === 'civil'
                ? 'CIVIL'
                : a.kind === 'remote'
                  ? 'ALIADO'
                  : 'PRESENCIA',
        a.x,
        a.y - 100,
        8,
        '#baffaa',
      );
    }
  ctx.globalAlpha = 1;
  sprite(
    16,
    player.attack > 0 ? player.attackFrame : player.moving ? 1 + (Math.floor(player.anim) % 2) : 0,
    player.x,
    player.y,
    92,
    player.face,
  );
  ctx.strokeStyle = '#8dea7155';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y, range, range * 0.45, 0, 0, Math.PI * 2);
  ctx.stroke();
  txt(
    player.sense > 0
      ? 'SENTIDOS AMPLIFICADOS · ' + Math.ceil(player.sense) + ' s'
      : 'ECOLOCALIZACIÓN · VISIÓN CERCANA',
    player.x,
    player.y - 113,
    10,
    '#aefc98',
  );
}
// Two-player LAN: host owns mobs, guest owns their avatar and persistent progression.
const net = {
  role: null,
  peer: false,
  remote: null,
  info: '',
  tick: 0,
  source: null,
  seq: 0,
  seen: 0,
  last: 0,
  room: null,
  applying: false,
  waiting: false,
  away: false,
  remoteAway: false,
};
function remoteTargets() {
  return net.peer && net.remote && net.remote.zone === zone && net.remote.alive !== false ? [net.remote] : [];
}
function teamTargets() {
  return [player, ...remoteTargets()].filter((t) => !t.downed); // enemies ignore downed players
}
function combatants() {
  return [...enemies, ...citizens, ...officers, ...(net.ff ? remoteTargets() : [])]; // friendly fire is a host option
}
function hurtTeam(t, d) {
  if (t.kind === 'remote') lanSend({ type: 'hurt', damage: d, zone });
  else hitPlayer(d);
}
function xport() {
  return net.mode === 'room' ? window.OmniRoom : net.mode === 'rtc' ? window.OmniRTC : window.OmniLAN;
}
function lanSend(m) {
  if (!xport()) return;
  try {
    xport().send(JSON.stringify({ ...m, v: 9 }));
  } catch (e) {
    toast('No se pudo enviar a la sala');
  }
}
function avatarPacket() {
  return {
    x: player.x,
    y: player.y,
    zone,
    face: player.face,
    dx: player.dx,
    dy: player.dy,
    hp: player.hp,
    max: maxHP(),
    level: player.level,
    race,
    skin: player.skin,
    alienSkins: player.alienSkins,
    musicFrame: player.musicFrame,
    alien: player.alien,
    activeAlien: player.activeAlien,
    watch: player.watch,
    hurtT: player.hurtT || 0,
    travel: player.travel ? player.travel.type : null,
    eliteZone: myEliteZone(),
    coopKey: activeMission() && activeMission().coop ? activeMission().key || activeMission().type : null,
    downed: player.downed ? { t: player.downed.t, rev: player.downed.rev } : null,
    ult: ultOn(),
    ultScale: ultScale(),
    form: player.form,
    fireCharge: player.fireCharge,
    anim: player.anim,
    moving: player.moving,
    attack: player.attack,
    attackFrame: player.attackFrame,
    fullFrame: player.fullFrame,
    cast: player.cast,
    flight: player.flight,
    jump: player.jump,
    leap: player.leap ? player.leap.t : 0,
    shield: player.shield,
    motion: player.motion ? { type: player.motion.type, t: player.motion.t, max: player.motion.max } : null,
    alive: true,
  };
}
function syncEntities(old, next) {
  const map = new Map(old.map((e) => [String(e.id), e]));
  return (next || []).slice(0, 40).map((e) => Object.assign(map.get(String(e.id)) || {}, e));
}
function worldPacket() {
  return {
    type: 'world',
    zone,
    dayMode,
    clock,
    enemies,
    citizens,
    officers,
    bossTimer,
    robotTimer: player.robotTimer,
    quest: quest.state,
    shots: hostileShots,
    projectiles,
    effects: effects.map((e) => ({ ...e, t: Math.max(0.02, e.t) })),
    avatar: avatarPacket(),
    paused: paused || net.away,
    ff: !!net.ff,
    law: { heat: law.heat, timer: law.timer },
    diff: player.diff || 'normal',
  };
}
function lanReceive(m) {
  if (!m || m.v !== 9 || !net.role) return;
  net.last = performance.now();
  if (m.type === 'robotKill' && net.role === 'guest' && m.zone === 11 && zone === 11) {
    robotQuestKill();
    return;
  }
  if (m.type === 'status' || m.type === 'statusSelf') {
    statusPacket(m);
    return;
  }
  if (m.type === 'knightKill' && net.role === 'guest') {
    knightKill();
    save();
    return;
  }
  if (
    m.type === 'knightStart' &&
    net.role === 'host' &&
    zone === 6 &&
    net.remote?.level >= 15 &&
    dist(net.remote, questKnight) < 160
  ) {
    spawnEnemies();
    lanSend(worldPacket());
    return;
  }
  if (m.type === 'mission' && net.role === 'guest') {
    quest.state = 'active';
    quest.kills = 0;
    save();
    return;
  }
  if (m.type === 'hello') {
    net.peer = true;
    net.waiting = false;
    net.remote = { ...m.avatar, kind: 'remote', id: 'remote' };
    net.info = 'DOS JUGADORES';
    if (net.role === 'host') {
      lanSend(worldPacket());
      toast('Jugador conectado · Fuego amigo ' + (net.ff ? 'activo' : 'desactivado'));
    }
    return;
  }
  if (m.type === 'avatar' && m.avatar) {
    net.remote = { ...m.avatar, kind: 'remote', id: 'remote' };
    net.remoteAway = !!m.paused;
    return;
  }
  if (m.type === 'world' && net.role === 'guest') {
    net.peer = true;
    net.waiting = false;
    net.applying = true;
    if (Number.isInteger(m.zone) && REGIONS[m.zone] && zone !== m.zone) {
      enterZone(m.zone, 'center');
      player.x = clamp(m.avatar.x - 70, region().minX + 20, region().maxX - 20);
      player.y = m.avatar.y;
    }
    dayMode = m.dayMode;
    clock = m.clock;
    if (DIFFS[m.diff]) net.hostDiff = m.diff; // the host's difficulty rules the shared world

    enemies = syncEntities(enemies, m.enemies);
    zoneStates[region().id] = enemies;
    citizens = syncEntities(citizens, m.citizens);
    officers = syncEntities(officers, m.officers);
    bossTimer = m.bossTimer;
    player.robotTimer = Math.max(0, m.robotTimer || 0);
    net.remote = { ...m.avatar, kind: 'remote', id: 'remote' };
    net.remoteAway = !!m.paused;
    net.visuals = { shots: m.shots || [], projectiles: m.projectiles || [], effects: m.effects || [] };
    if (m.quest === 'active' && quest.state === 'new') {
      quest.state = 'active';
      quest.kills = 0;
    }
    if (typeof m.ff === 'boolean') net.ff = m.ff;
    law.heat = m.law?.heat || 0;
    law.timer = m.law?.timer || 0;
    net.applying = false;
    return;
  }
  if (m.type === 'damage' && net.role === 'host' && m.zone === zone && m.seq > net.seen && net.remote) {
    net.seen = m.seq;
    const pool = m.kind === 'civil' ? citizens : m.kind === 'police' ? officers : enemies,
      t = pool.find((e) => String(e.id) === String(m.id));
    if (
      !t ||
      !t.alive ||
      !Number.isFinite(m.damage) ||
      m.damage < 0 ||
      m.damage > 150 ||
      dist(net.remote, t) > 850
    )
      return;
    net.source = 'guest';
    damageTarget(t, m.damage, Math.min(1, m.stun || 0));
    net.source = null;
    lanSend(worldPacket());
    return;
  }
  if (m.type === 'hurt' && m.zone === zone && Number.isFinite(m.damage) && m.damage > 0 && m.damage <= 150) {
    hitPlayer(m.damage);
    return;
  }
  if (m.type === 'emote') {
    featReceive(m); // part-45
    return;
  }
  if (m.type === 'arena' || m.type === 'arenaClear') {
    arenaReceive(m);
    return;
  }
  if (m.type === 'coopEvent') {
    coopReceive(m);
    return;
  }
  if (m.type === 'missionKill' && net.role === 'guest') {
    missionRemoteKill(m);
    return;
  }
  if (m.type === 'revived') {
    coopApply('rescue'); // I revived my partner: Rescue mission (part-30)
    toast('¡Compañero reanimado!');
    burst(net.remote ? net.remote.x : player.x, (net.remote ? net.remote.y : player.y) - 50, 24, '#9dff9d');
    return;
  }
  if (m.type === 'reward' && net.role === 'guest') {
    if (m.xp) xp(clamp(m.xp, 0, 120));
    if (m.team && m.xp) popup(player.x, player.y - 130, '+' + Math.round(m.xp) + ' EXP equipo', '#9fe7ff');
    if (m.kill && quest.state === 'active') {
      quest.kills = Math.min(6, quest.kills + 1);
      if (quest.kills === 6) quest.state = 'return';
    }
    if (m.dna && race === 'osmo') {
      player.dnaFire = true;
      toast('¡ADN ígneo obtenido!');
    }
    save();
    return;
  }
  if (m.type === 'crime' && net.role === 'guest') {
    crime(clamp(m.penalty, 0, 20));
    return;
  }
  if (m.type === 'visual') {
    net.guestVisuals = m;
    return;
  }
}
window.omniLanEvent = function (kind, data) {
  if (kind === 'data') {
    try {
      lanReceive(JSON.parse(data));
    } catch (e) {
      console.warn('LAN packet rejected');
    }
    return;
  }
  if (kind === 'hosting') {
    net.role = 'host';
    net.info = 'SALA ' + data + ' · ESPERANDO';
    net.room = data;
    net.last = performance.now();
    toast('Sala ' + data + ' creada. Comparte tu IP y código.');
    return;
  }
  if (kind === 'connected' || kind === 'peer') {
    net.reopen = 0;
    net.peer = true;
    net.waiting = false;
    net.last = performance.now();
    lanSend({ type: 'hello', avatar: avatarPacket() });
    if ((net.mode === 'rtc' || net.mode === 'room') && window.__rtcDialog) {
      window.__rtcDialog = false;
      closeDialog();
      if (!started) $('#play').click();
      toast('Conectado · ¡a jugar juntos!');
    }
    return;
  }
  if (kind === 'disconnected' && net.mode === 'room' && net.role === 'host' && !net.leaving) {
    // room codes: the host keeps the room open so the friend can rejoin with the same code
    net.peer = false;
    net.remote = null;
    net.waiting = false;
    net.visuals = net.guestVisuals = null;
    net.remoteAway = false;
    net.info = 'SALA ' + net.room + ' · ESPERANDO';
    save();
    toast('Compañero desconectado · puede volver con el código ' + net.room);
    return;
  }
  if (kind === 'error' && $('#roommsg')) $('#roommsg').textContent = data;
  if (kind === 'disconnected' || kind === 'error') {
    if (
      kind === 'disconnected' &&
      net.role === 'host' &&
      net.mode !== 'rtc' &&
      !net.leaving &&
      (net.reopen || 0) < 5 &&
      window.OmniLAN
    ) {
      net.reopen = (net.reopen || 0) + 1;
      net.peer = false;
      net.remote = null;
      net.waiting = true;
      net.visuals = null;
      net.guestVisuals = null;
      net.remoteAway = false;
      net.info = 'REABRIENDO SALA…';
      save();
      toast('Compañero desconectado · Reabriendo la sala con un código nuevo');
      setTimeout(() => {
        if (net.role === 'host' && !net.peer) {
          try {
            window.OmniLAN.stop();
            window.OmniLAN.host();
          } catch (e) {}
        }
      }, 600);
      return;
    }
    const message =
      kind === 'error'
        ? data
        : net.role === 'guest'
          ? 'Conexión perdida · Pulsa MULTIJUGADOR, escribe el código nuevo del anfitrión y UNIRSE'
          : 'El otro jugador salió de la sala';
    net.peer = false;
    net.remote = null;
    net.waiting = false;
    net.visuals = null;
    net.guestVisuals = null;
    net.role = null;
    net.remoteAway = false;
    save();
    toast(message);
  }
};
function netUpdate(dt) {
  if (!net.role || !xport()) return;
  net.tick += dt;
  if (net.tick < 0.1) return;
  net.tick = 0;
  if (net.peer) {
    if (net.role === 'host') lanSend(worldPacket());
    else {
      lanSend({ type: 'avatar', avatar: avatarPacket(), paused: paused || net.away });
      lanSend({ type: 'visual', projectiles, effects: effects.slice(0, 35) });
    }
    if (net.last && performance.now() - net.last > 12000) {
      if (net.mode === 'room' && net.role === 'host') window.OmniRoom.drop(); // keep the room, drop the stale link
      else xport().stop();
      window.omniLanEvent('disconnected', '');
    }
  }
}
function lanWifiMenu() {
  const supported = !!window.OmniLAN,
    ip = supported ? window.OmniLAN.address() : 'Disponible en el APK Android';
  showDialog(
    'MULTIJUGADOR LOCAL · 2 JUGADORES',
    'Jugar en la misma Wi-Fi',
    '<p>Los dos teléfonos deben estar en la misma red Wi-Fi y usar OMNI 0.9. Cada uno conserva su nivel y raza. El anfitrión dirige los viajes. <b>Fuego amigo desactivado</b> salvo que el anfitrión lo active. Las bajas dan EXP a los dos, los enemigos aguantan más y si caes tu compañero puede reanimarte. Los menús pausan a ambos.</p><p>Tu IP: <b id="lanip"></b><br><span id="roominfo"></span></p><div class="lanfields"><label>IP del anfitrión<input id="hostip" inputmode="decimal" placeholder="192.168.1.20" maxlength="15"></label><label>Código de sala<input id="roomcode" inputmode="numeric" placeholder="6 dígitos" maxlength="6"></label></div><p>Primero elige tu raza en el menú. Crea una sala y comparte IP y código; el otro jugador pulsa UNIRSE. Una red de invitados con aislamiento puede impedir la conexión.</p>',
    [
      ['VOLVER', lanMenu],
      [
        'CREAR SALA',
        () => {
          if (!supported) {
            toast('Instala el APK para jugar por Wi-Fi');
            return;
          }
          net.leaving = false;
          net.reopen = 0;
          net.mode = 'lan';
          window.OmniLAN.stop();
          net.role = 'host';
          net.waiting = false;
          net.remote = null;
          net.peer = false;
          net.seq = net.seen = 0;
          net.info = 'CREANDO SALA…';
          window.OmniLAN.host();
          closeDialog();
          if (!started) $('#play').click();
        },
      ],
      [
        'UNIRSE',
        () => {
          if (!supported) {
            toast('Disponible en el APK Android');
            return;
          }
          const host = $('#hostip').value.trim(),
            code = $('#roomcode').value.trim();
          if (
            !/^(\d{1,3}\.){3}\d{1,3}$/.test(host) ||
            host.split('.').some((n) => +n > 255) ||
            !/^\d{6}$/.test(code)
          ) {
            toast('Escribe una IP IPv4 y un código de 6 dígitos');
            return;
          }
          net.leaving = false;
          try {
            localStorage.setItem('omni-lastip', host);
          } catch (e) {}
          net.mode = 'lan';
          window.OmniLAN.stop();
          net.role = 'guest';
          net.peer = false;
          net.waiting = true;
          net.remote = null;
          net.seq = net.seen = 0;
          net.info = 'CONECTANDO…';
          window.OmniLAN.join(host, code);
          closeDialog();
          if (!started) $('#play').click();
        },
      ],
      [
        'SALIR DE LA SALA',
        () => {
          leaveRoom();
          closeDialog();
        },
      ],
    ],
  );
  $('#lanip').textContent = ip;
  try {
    const lip = localStorage.getItem('omni-lastip');
    if (lip && !$('#hostip').value) $('#hostip').value = lip;
  } catch (e) {}
  $('#roominfo').textContent = net.role
    ? net.info + (net.room ? ' · Código: ' + net.room : '')
    : 'Sin sala activa';
}

function leaveRoom() {
  net.leaving = true;
  net.reopen = 0;
  try { if (window.OmniLAN) window.OmniLAN.stop(); } catch (e) {}
  try { if (window.OmniRTC) window.OmniRTC.stop(); } catch (e) {}
  try { if (window.OmniRoom) window.OmniRoom.stop(); } catch (e) {}
  net.room = null;
  net.role = null;
  net.peer = false;
  net.remote = null;
  net.waiting = false;
  net.remoteAway = false;
  net.visuals = net.guestVisuals = null;
  window.__rtcDialog = false;
  save();
}
function copyField(sel) {
  const t = $(sel);
  if (!t || !t.value) return false;
  t.focus();
  t.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) {}
  if (!ok && navigator.clipboard) navigator.clipboard.writeText(t.value).then(() => {}, () => {});
  return ok;
}
const RTC_AREA = 'style="width:100%;font-size:9px;background:#071923;color:#e7ffe7;border:1px solid #749286;user-select:text;touch-action:auto"';
function lanMenu() {
  showDialog(
    'MULTIJUGADOR · 2 JUGADORES',
    'Elige cómo jugar',
    '<p><b>SALA CON CÓDIGO</b> (lo más fácil): el anfitrión crea una sala y su amigo escribe un código de 5 letras. PC con móvil, en casa o por Internet.</p><p><b>CROSSPLAY · CÓDIGO LARGO</b> conecta cualquier dispositivo con otro: PC con móvil, móvil con móvil, por Internet o en la misma red. Se intercambia un código de invitación por mensaje (WhatsApp, Discord…), sin servidores.</p><p><b>MISMA WI-FI</b> usa IP y código de sala; solo funciona entre móviles con el APK en la misma red.</p><p>Cada uno conserva su nivel y raza. El anfitrión dirige los viajes. <b>Fuego amigo desactivado</b> salvo que el anfitrión lo active. Las bajas dan EXP a los dos, los enemigos aguantan más y si caes tu compañero puede reanimarte. Los menús pausan a ambos.</p>' +
      (net.role ? '<p><b>' + (net.info || '') + '</b></p>' : ''),
    [
      ['VOLVER', closeDialog],
      ['SALA CON CÓDIGO', roomMenu],
      ['CROSSPLAY · CÓDIGO LARGO', rtcMenu],
      ['MISMA WI-FI', lanWifiMenu],
      ['FUEGO AMIGO: ' + (net.ff ? 'SÍ' : 'NO'), ffToggle],
      ['SALIR DE LA SALA', () => { leaveRoom(); closeDialog(); }],
    ],
  );
}
function rtcMenu() {
  if (!(window.OmniRTC && window.OmniRTC.supported)) {
    toast('Este navegador no admite crossplay');
    return;
  }
  showDialog(
    'CROSSPLAY · PC ⇄ MÓVIL',
    '¿Anfitrión o invitado?',
    '<p>El anfitrión crea una invitación y se la manda a su amigo. El amigo la pega, genera una respuesta y se la devuelve. Al pegar la respuesta, ¡conectados! Hace falta Internet solo para este primer paso. Primero elige tu raza en el menú.</p><p>Si no conecta: algunas redes móviles o Wi-Fi con aislamiento lo bloquean. Prueba con otra red.</p>',
    [
      ['VOLVER', lanMenu],
      ['SOY ANFITRIÓN', rtcHost],
      ['SOY INVITADO', rtcGuest],
    ],
  );
}
async function rtcHost() {
  leaveRoom();
  net.leaving = false;
  net.mode = 'rtc';
  net.role = 'host';
  net.peer = false;
  net.waiting = true;
  net.remote = null;
  net.seq = net.seen = 0;
  net.info = 'CREANDO INVITACIÓN…';
  window.__rtcDialog = true;
  showDialog(
    'CROSSPLAY · ANFITRIÓN',
    'Crea la invitación',
    '<p>1) Copia tu invitación y envíasela a tu amigo.</p><textarea id="rtcout" readonly rows="3" ' + RTC_AREA + '>Generando…</textarea><p>2) Pega aquí la respuesta que te devuelva:</p><textarea id="rtcin" rows="3" placeholder="Respuesta del invitado" ' + RTC_AREA + '></textarea><p id="rtcmsg" style="min-height:14px"></p>',
    [
      ['CANCELAR', () => { leaveRoom(); closeDialog(); }],
      ['COPIAR', () => { $('#rtcmsg').textContent = copyField('#rtcout') ? 'Invitación copiada' : 'Selecciona el texto y cópialo manualmente'; }],
      [
        'CONECTAR',
        async () => {
          const v = $('#rtcin').value.trim();
          if (!v) { $('#rtcmsg').textContent = 'Pega primero la respuesta'; return; }
          $('#rtcmsg').textContent = 'Conectando…';
          try { await window.OmniRTC.acceptAnswer(v); net.info = 'CONECTANDO…'; }
          catch (e) { $('#rtcmsg').textContent = e.message || 'Respuesta no válida'; }
        },
      ],
    ],
  );
  try {
    const code = await window.OmniRTC.createInvite();
    if (!window.__rtcDialog) return;
    $('#rtcout').value = code;
    net.info = 'ESPERANDO RESPUESTA';
  } catch (e) {
    if ($('#rtcmsg')) $('#rtcmsg').textContent = 'No se pudo crear la invitación';
  }
}
function rtcGuest() {
  leaveRoom();
  net.leaving = false;
  net.mode = 'rtc';
  net.role = 'guest';
  net.peer = false;
  net.waiting = true;
  net.remote = null;
  net.seq = net.seen = 0;
  net.info = 'ESPERANDO AL ANFITRIÓN…';
  window.__rtcDialog = true;
  showDialog(
    'CROSSPLAY · INVITADO',
    'Únete con la invitación',
    '<p>1) Pega la invitación que te mandó el anfitrión y pulsa GENERAR RESPUESTA:</p><textarea id="rtcin" rows="3" placeholder="Invitación del anfitrión" ' + RTC_AREA + '></textarea><p>2) Envíale esta respuesta. La conexión se abrirá sola:</p><textarea id="rtcout" readonly rows="3" ' + RTC_AREA + '></textarea><p id="rtcmsg" style="min-height:14px"></p>',
    [
      ['CANCELAR', () => { leaveRoom(); closeDialog(); }],
      [
        'GENERAR RESPUESTA',
        async () => {
          const v = $('#rtcin').value.trim();
          if (!v) { $('#rtcmsg').textContent = 'Pega primero la invitación'; return; }
          $('#rtcmsg').textContent = 'Generando respuesta…';
          try {
            $('#rtcout').value = await window.OmniRTC.joinWithInvite(v);
            $('#rtcmsg').textContent = 'Lista · Cópiala y envíasela al anfitrión';
          } catch (e) { $('#rtcmsg').textContent = e.message || 'Invitación no válida'; }
        },
      ],
      ['COPIAR', () => { $('#rtcmsg').textContent = copyField('#rtcout') ? 'Respuesta copiada' : 'Selecciona el texto y cópialo manualmente'; }],
    ],
  );
}
function drawRemote(single) {
  for (const o of single ? [single] : remoteTargets()) {
    let row =
        o.race === 'osmo'
          ? o.form === 'fire'
            ? o.fireCharge >= 60
              ? 19
              : 15
            : 14
          : o.alien
            ? remoteAlien(o.activeAlien).row
            : SKINS[o.skin]?.row || 0,
      f =
        o.attack > 0
          ? o.race === 'osmo'
            ? o.fireCharge >= 60
              ? o.fullFrame || 3
              : 3
            : o.attackFrame || 3
          : o.moving
            ? 1 + (Math.floor(o.anim) % 2)
            : 0,
      h =
        o.race === 'osmo'
          ? 132
          : o.alien
            ? alienHeight(ensureFusion(o.activeAlien) || 'heatblast')
            : 98;
    if (o.ult) h *= o.ultScale || 1.1;
    let lift =
      o.jump > 0
        ? Math.sin(((0.75 - o.jump) / 0.75) * Math.PI) * 72
        : o.leap
          ? Math.sin((1 - o.leap) * Math.PI) * 140
          : 0;
    if (o.jump > 0 && o.race !== 'osmo' && !o.alien) {
      if (o.skin === 0) {
        row = 20;
        f = o.jump > 0.65 ? 0 : o.jump > 0.35 ? 1 : o.jump > 0.1 ? 2 : 3;
      } else f = o.jump > 0.1 ? 4 : 5;
    }
    if (o.motion?.type === 'slide') {
      row = 12;
      f = 1;
    }
    ctx.fillStyle = '#05182588';
    ctx.beginPath();
    ctx.ellipse(o.x, o.y, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    if (o.race === 'osmo') drawOsmo(f, o.x, o.y - lift, o.face, o);
    else {
      const pose = combatPose(o, row, f);
      sprite(pose.row, pose.f, o.x, o.y - lift - pose.lift - travelLift(o), h, o.face, o.downed ? 0.5 : travelAlpha(o));
    }
    if (o.downed) drawDowned(o, o.downed);
    txt('JUGADOR 2 · NV. ' + o.level, o.x, o.y - h - 22, 9, '#92eaff');
    ctx.fillStyle = '#102b3a';
    ctx.fillRect(o.x - 35, o.y - h - 14, 70, 5);
    ctx.fillStyle = '#89ddec';
    ctx.fillRect(o.x - 35, o.y - h - 14, 70 * clamp(o.hp / o.max, 0, 1), 5);
  }
}
function drawNetworkEffects() {
  const v = net.role === 'guest' ? net.visuals : net.guestVisuals;
  if (!v) return;
  for (const p of [...(v.projectiles || []), ...(v.shots || [])]) {
    ctx.fillStyle =
      p.type === 'crystal'
        ? '#aaffdc'
        : ['green', 'goo', 'toxin'].includes(p.type)
          ? '#abff7d'
          : p.type === 'boulder'
            ? '#ad9c87'
            : '#ffc86a';
    ctx.fillRect(p.x - 8, p.y - 6, 16, 12);
  }
  for (const f of v.effects || []) {
    if (f.type === 'musicnotes') {
      drawMusicEffect(f);
      continue;
    }
    if (!f.r) continue;
    ctx.strokeStyle = ['bossflame', 'bossslam'].includes(f.type) ? '#ff9b6b' : '#aacde299';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (f.type.includes('flame')) {
      ctx.moveTo(f.x, f.y);
      ctx.arc(f.x, f.y, f.r, (f.a || 0) - 0.5, (f.a || 0) + 0.5);
      ctx.closePath();
    } else
      ctx.ellipse(
        f.x,
        f.y,
        f.r * Math.max(0.1, 1 - f.t / f.max),
        f.r * 0.4 * Math.max(0.1, 1 - f.t / f.max),
        0,
        0,
        Math.PI * 2,
      );
    ctx.stroke();
  }
}

// OMNI 0.9: separate race wallets, knight patrol, animated casts and Insecotide.
const questKnight = { x: 270, y: 790, face: 1, row: 22, name: 'SIR ALDRIC' },
  ten = { x: 1080, y: 726, face: -1, row: 23, name: 'TEN' };
function extraNPC() {
  return zone === 6 ? questKnight : zone === 9 ? ten : zone === 10 ? kim : zone === 12 ? neko : null;
}
function knightKill() {
  const q = player.knightQuest;
  if (q.state === 'active') {
    q.kills = Math.min(4, q.kills + 1);
    if (q.kills === 4) {
      q.state = 'return';
      toast('Caballeros derrotados · Vuelve con Sir Aldric');
    }
  }
}
function beginKnightQuest() {
  if (zone !== 6 || dist(player, questKnight) > 140 || player.level < 15) return false;
  const q = player.knightQuest;
  if (q.state === 'active' || q.state === 'return') return false;
  q.state = 'active';
  q.kills = 0;
  if (net.role === 'guest') lanSend({ type: 'knightStart', zone });
  else {
    spawnEnemies();
    if (net.peer) lanSend(worldPacket());
  }
  closeDialog();
  toast('Patrulla de la orden · Derrota a 4 caballeros');
  save();
  return true;
}
function claimKnightQuest() {
  const q = player.knightQuest;
  if (zone !== 6 || dist(player, questKnight) > 140 || q.state !== 'return' || player.level < 15)
    return false;
  q.state = 'done';
  q.completions++;
  player.coins += 10;
  xp(160);
  closeDialog();
  toast('Patrulla completada · +160 EXP · +10 monedas');
  save();
  return true;
}
function knightTalk() {
  const q = player.knightQuest;
  if (player.level < 15) {
    showDialog(
      'SIR ALDRIC · PATRULLA DE LA ORDEN',
      'Vuelve al nivel 15',
      '<p>«La fortaleza está tomada por caballeros hostiles. Antes de enfrentarlos, alcanza el <b>nivel 15</b> con tu raza actual.»</p><p>Tu nivel: ' +
        player.level +
        '. Cada raza debe cumplir el requisito por separado.</p>',
      [['ENTENDIDO', closeDialog]],
    );
    return;
  }
  const near = zone === 6 && dist(player, questKnight) <= 140;
  showDialog(
    'SIR ALDRIC · MISIÓN REPETIBLE',
    'Romper el cerco',
    '<p>«Derrota a cuatro caballeros de la fortaleza o del salón norte y regresa conmigo.»</p><p><b>' +
      q.kills +
      ' / 4 caballeros</b> · Patrullas: ' +
      q.completions +
      '</p><p class="reward">160 EXP · 10 monedas para tu raza actual</p><p>' +
      (near
        ? 'Puedes repetirla después de cobrar.'
        : 'Sir Aldric espera en la parte oeste del patio de la Fortaleza. Acércate para aceptar o cobrar.') +
      '</p>',
    [
      ...(near
        ? [
            q.state === 'return'
              ? ['COBRAR RECOMPENSA', claimKnightQuest]
              : q.state === 'active'
                ? ['SEGUIR PATRULLA', closeDialog]
                : ['ACEPTAR PATRULLA', beginKnightQuest],
          ]
        : []),
      ['VOLVER', closeDialog],
    ],
  );
}
function talkExtra() {
  const n = extraNPC();
  if (!n || dist(player, n) > 140) return false;
  if (n === questKnight) knightTalk();
  else if (n === ten) storyTalk();
  else if (n === neko) nekoTalk();
  else danceMenu();
  return true;
}
function beginCast(style, i) {
  const duration = i === 0 ? 0.46 : i === 1 ? 0.64 : 0.8;
  player.cast = { style, i, t: duration, max: duration };
  player.attack = duration;
  window.OmniSound?.play(
    style === 'diamond'
      ? 'crystal'
      : style.includes('fire') || style === 'heatblast'
        ? 'fire'
        : style === 'insect'
          ? 'spit'
          : 'punch',
  );
}
function castFrame(o) {
  const c = o.cast;
  if (!c || c.t <= 0) return null;
  const p = 1 - c.t / c.max,
    stage = p < 0.2 ? 0 : p > 0.78 ? 2 : 1;
  const i = c.i;
  if (c.style === 'heatblast') return [0, [1, 2, 3, 4, 5, 6][i], 7][stage];
  if (c.style === 'diamond') return 8 + [0, [1, 2, 3, 4, 5, 6][i], 7][stage];
  if (c.style === 'osmo') return [0, [1, 2, 3, 4, 5, 6][i], 7][stage];
  if (c.style === 'osmofire') return [8, [9, 10, 11, 11, 9, 11][i], 8][stage];
  if (c.style === 'insect')
    return stage === 0 ? 3 : stage === 2 ? (o.flight > 0 ? 7 : 0) : [4, 8, 9, 5, 10, 11][i];
  return null;
}
function combatPose(o, row, f) {
  if (hasMusicSkin(o)) {
    row = 26;
    if (o.attack > 0) {
      f = o.leap ? 4 : o.attackFrame === 5 ? 5 : o.musicFrame || 3;
    } else f = o.moving ? 1 + (Math.floor(o.anim) % 2) : 0;
    return { row, f, lift: 0 };
  }
  const sk = skinArt(o); // "new art" skin (part-22): its own poses, same powers
  if (sk) return { row: sk.row, f: skinArtPose(o, sk), lift: o.activeAlien === 'insect' && o.flight > 0 ? 38 + Math.sin(clock * 6) * 5 : 0 };
  const cf = castFrame(o);
  if (cf !== null) {
    if (o.cast.style === 'heatblast' || o.cast.style === 'diamond') {
      row = 25;
      f = cf;
    } else if (o.cast.style === 'insect') {
      row = 21;
      f = cf;
    }
  } else if (o.alien && o.activeAlien === 'insect') {
    row = 21;
    f = o.flight > 0 ? 5 + (Math.floor(clock * 11) % 3) : o.moving ? 1 + (Math.floor(o.anim) % 2) : 0;
  }
  const sp = cf === null ? sheetPose(o) : null;
  if (sp !== null) f = sp;
  return {
    row,
    f,
    lift: o.alien && o.activeAlien === 'insect' && o.flight > 0 ? 38 + Math.sin(clock * 6) * 5 : 0,
  };
}
function insectAttack(i) {
  const s = ALIENS.insect.skills[i];
  if (!unlockedSkill('insect', i)) {
    toast(i < 4 ? 'Requiere maestría ' + s.unlock : 'Aprende esta habilidad por 3 puntos');
    return;
  }
  player.cool[i] = s.cd;
  beginCast('insect', i);
  const t = nearest(470),
    a = t ? Math.atan2(t.y - player.y, t.x - player.x) : Math.atan2(player.dy, player.dx),
    d = s.damage * multiplier();
  player.face = Math.cos(a) >= 0 ? 1 : -1;
  const spit = (angle, type, damage) => {
    shoot(type, angle, damage, 430);
    const p = projectiles.at(-1);
    p.r = 12;
    p.t = 1.5;
  };
  if (i === 0) spit(a, 'goo', d);
  if (i === 1) {
    const at = t || { x: player.x + Math.cos(a) * 145, y: player.y + Math.sin(a) * 100 };
    effects.push({
      type: 'puddle',
      x: at.x,
      y: at.y,
      r: 145,
      t: 4.55,
      max: 4.55,
      tick: 0.05,
      pulses: 0,
      damage: d,
    });
  }
  if (i === 2) {
    spit(a, 'toxin', d);
    projectiles.at(-1).poisonDamage = 4 * multiplier();
  }
  if (i === 3) {
    player.flight = 12;
    burst(player.x, player.y - 20, 14, '#dcff91');
    toast('Vuelo · 12 s · Muévete con la palanca');
  }
  if (i === 4) {
    effects.push({ type: 'wingwave', x: player.x, y: player.y - 28, r: 155, t: 0.7, max: 0.7 });
    areaHit(player.x, player.y, 155, d, 0.55);
  }
  if (i === 5) for (let n = -1; n <= 1; n++) spit(a + n * 0.14, 'goo', d);
}
function applyStatus(t, type, duration, damage = 0) {
  if (!t || t.alive === false) return;
  if (t.kind === 'remote') {
    lanSend({ type: 'statusSelf', status: type, duration, damage, zone });
    return;
  }
  if (net.role === 'guest' && !net.applying && t !== player) {
    lanSend({ type: 'status', id: t.id, kind: t.kind, status: type, duration, damage, zone });
    return;
  }
  if (type === 'slow') t.slow = Math.max(t.slow || 0, duration);
  if (type === 'poison')
    t.poison = { time: duration, tick: 1, damage, owner: net.source === 'guest' ? 'guest' : 'host' };
}
function statusPacket(m) {
  if (m.zone !== zone || !['slow', 'poison'].includes(m.status)) return;
  const duration = clamp(Number(m.duration) || 0, 0, m.status === 'slow' ? 3 : 5),
    damage = clamp(Number(m.damage) || 0, 0, 7);
  if (m.type === 'statusSelf') {
    applyStatus(player, m.status, duration, damage);
    return;
  }
  if (net.role !== 'host' || !net.remote) return;
  const target = (m.kind === 'civil' ? citizens : m.kind === 'police' ? officers : enemies).find(
    (e) => String(e.id) === String(m.id),
  );
  if (target?.alive && dist(target, net.remote) < 850) {
    net.source = 'guest';
    applyStatus(target, m.status, duration, damage);
    net.source = null;
  }
}
function updateStatus(o, dt) {
  o.slow = Math.max(0, (o.slow || 0) - dt);
  const p = o.poison;
  if (!p || o.alive === false) {
    o.poison = null;
    return;
  }
  const elapsed = Math.min(dt, Math.max(0, p.time));
  p.time -= dt;
  p.tick -= elapsed;
  if (p.tick < 0.00001) {
    p.tick += 1;
    if (o === player) hitPlayer(p.damage);
    else {
      const prev = net.source;
      net.source = p.owner === 'guest' ? 'guest' : null;
      damageTarget(o, p.damage);
      net.source = prev;
    }
    burst(o.x, o.y - 45, 3, '#b4ed55');
  }
  if (p.time < 0.00001) o.poison = null;
}
function updateV7(dt) {
  if (player.cast) {
    player.cast.t -= dt;
    if (player.cast.t <= 0) player.cast = null;
  }
  player.flight =
    player.alien && player.activeAlien === 'insect' ? Math.max(0, (player.flight || 0) - dt) : 0;
  updateStatus(player, dt);
  if (net.role !== 'guest') for (const e of [...enemies, ...citizens, ...officers]) updateStatus(e, dt);
  for (const f of effects)
    if (f.type === 'puddle') {
      f.tick -= dt;
      if (f.tick <= 0 && f.pulses < 6) {
        f.tick += 0.75;
        f.pulses++;
        for (const t of combatants())
          if (t.alive && Math.hypot(t.x - f.x, t.y - f.y) < f.r && lineClear(f.x, f.y, t.x, t.y)) {
            damageTarget(t, f.damage);
            applyStatus(t, 'slow', 1);
          }
      }
    }
  window.OmniSound?.step(
    dt,
    player.moving && !player.flight && !player.jump,
    zone < 3 ? 'forest' : zone === 9 ? 'wood' : 'stone',
    moveSpeed(),
  );
}
function drawV7Effects() {
  for (const f of effects) {
    if (f.type === 'puddle') {
      ctx.save();
      ctx.globalAlpha = Math.min(0.8, f.t * 2);
      ctx.fillStyle = '#285e20';
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.r, f.r * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8ae837';
      ctx.lineWidth = 3;
      ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const a = i * 2.4,
          x = f.x + Math.cos(a) * f.r * 0.8,
          y = f.y + Math.sin(a) * f.r * 0.26;
        ctx.fillStyle = i % 2 ? '#5fc829' : '#c7fa6c';
        ctx.fillRect(x, y - Math.sin(clock * 4 + i) * 4, 5 + (i % 3) * 3, 4);
      }
      ctx.restore();
    }
    if (f.type === 'wingwave') {
      ctx.strokeStyle = '#e4ffae';
      ctx.lineWidth = 3;
      const p = 1 - f.t / f.max;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(
          f.x,
          f.y,
          Math.max(1, f.r * p - i * 20),
          Math.max(1, f.r * 0.55 * p - i * 8),
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
    }
    if (f.type === 'friendlyflame') {
      ctx.save();
      ctx.translate(f.x, f.y - 47);
      ctx.rotate(f.a);
      for (let layer = 0; layer < 3; layer++) {
        ctx.fillStyle = ['#ee5b22bb', '#ffab38dd', '#fff0a9'][layer];
        ctx.beginPath();
        ctx.moveTo(30, 0);
        for (let i = 0; i <= 18; i++) {
          let x = 30 + i * 10,
            width = (9 + i * 0.6) * (1 - layer * 0.29),
            flicker = Math.sin(clock * 34 - i * 1.7) * 5;
          ctx.lineTo(x, -width + flicker);
        }
        for (let i = 18; i >= 0; i--) {
          let x = 30 + i * 10,
            width = (9 + i * 0.6) * (1 - layer * 0.29),
            flicker = Math.sin(clock * 30 - i * 1.3) * 5;
          ctx.lineTo(x, width + flicker);
        }
        ctx.closePath();
        ctx.fill();
      }
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = i % 2 ? '#ffd469' : '#ff7334';
        const x = 45 + ((clock * 170 + i * 23) % 180);
        ctx.fillRect(x, Math.sin(i * 2.4 + clock * 15) * 26, 5, 3);
      }
      ctx.restore();
    }
  }
  for (const e of [...enemies, ...citizens, ...officers, player]) {
    if (e.alive === false) continue;
    if (e.poison) txt('VENENO', e.x, e.y - 145, 8, '#c7ff6b');
    else if (e.slow > 0) txt('LENTO', e.x, e.y - 145, 8, '#91e0ce');
  }
}
function hudV7() {
  $('#coins').textContent = '◈ ' + player.coins + ' MONEDAS';
  const n = extraNPC();
  if (n && dist(player, n) < 140) {
    $('#talk').classList.remove('hidden');
    $('#talk').textContent = '◆ HABLAR CON ' + n.name;
  }
  if (zone === 6 || zone === 8) {
    const q = player.knightQuest;
    $('#mission .tiny').textContent = 'MISIÓN 02 · LA ORDEN · NV. 15';
    $('#questtext').textContent =
      q.state === 'active'
        ? 'Caballeros · ' + q.kills + ' / 4'
        : q.state === 'return'
          ? 'Regresa con Sir Aldric'
          : player.level < 15
            ? 'Se desbloquea al nivel 15'
            : 'Habla con Sir Aldric';
    $('#questsub').textContent = '160 EXP · 10 monedas · Fortaleza';
  } else $('#mission .tiny').textContent = 'MISIÓN 01 · EL CLARO';
  if (player.flight > 0) {
    $('#shieldstatus').classList.remove('hidden');
    $('#shieldstatus').textContent = 'VUELO · ' + Math.ceil(player.flight) + ' s';
  }
}

// OMNI 0.9 — cosmetic concert reward and first story chapter.
const kim = { x: 800, y: 690, face: -1, row: 27, name: 'KIM TAEHYUNG' };
function initV8() {
  player.story = Object.assign({ state: 'new', completions: 0, reward: 0 }, player.story || {});
  player.story.completions = clamp(Math.floor(player.story.completions) || 0, 0, 2);
  if (player.story.completions >= 2) player.story.state = 'complete';
  player.robotTimer = Math.max(0, Number(player.robotTimer) || 0);
  player.alienSkins = Object.assign({ fourarms: 'classic' }, player.alienSkins || {});
  player.unlockedAlienSkins = Object.assign({ fourarmsConcert: false }, player.unlockedAlienSkins || {});
  if (!player.unlockedAlienSkins.fourarmsConcert) player.alienSkins.fourarms = 'classic';
  player.danceBest = player.danceBest || {};
  $('#alienskins')?.classList.toggle('hidden', race !== 'omni');
}
function hasMusicSkin(o = player) {
  return o.alien && o.activeAlien === 'fourarms' && o.alienSkins?.fourarms === 'concert';
}
function selectAlienSkin(id) {
  if (race !== 'omni' || !['classic', 'concert'].includes(id)) return false;
  if (id === 'concert' && !player.unlockedAlienSkins.fourarmsConcert) return false;
  player.alienSkins.fourarms = id;
  persistGame();
  return true;
}
function alienSkinMenu() {
  if (race !== 'omni') {
    showDialog(
      'SKINS DE ALIENS',
      'Solo para portadores del Omnitrix',
      '<p>El osmosiano conserva sus propias formas. Cambia a la raza del Omnitrix desde RAZAS para elegir skins de aliens.</p>',
      [['VOLVER', closeDialog]],
    );
    return;
  }
  // every alien with more than one look: classic sprite, "new art" sheet (part-22), Four Arms' concert outfit
  const rows = Object.keys(SKIN_ART)
    .concat(SKIN_ART.fourarms ? [] : ['fourarms'])
    .map((id) => {
      const opts = [['classic', 'Clásico', ALIENS[id].row]];
      if (SKIN_ART[id]) opts.push(['art', 'Arte nuevo', SKIN_ART[id].row]);
      if (id === 'fourarms') opts.push(['concert', 'Concierto', 26]);
      const cur = player.alienSkins[id] || 'classic';
      return (
        '<div class="skinrow"><b>' + ALIENS[id].name.toUpperCase() + '</b><div class="alien-skin-cards">' +
        opts
          .map(([sk, n, row]) => {
            const locked = sk === 'concert' && !player.unlockedAlienSkins.fourarmsConcert;
            return '<button data-alien="' + id + '" data-skin="' + sk + '" data-row="' + row + '" class="' + (cur === sk ? 'active' : '') +
              '"><canvas width="96" height="104"></canvas><b>' + n + '</b><small>' + (cur === sk ? 'EN USO' : locked ? 'GANA EN DIFÍCIL' : 'ELEGIR') + '</small></button>';
          })
          .join('') +
        '</div></div>'
      );
    })
    .join('');
  showDialog(
    'APARIENCIA · MISMO PODER',
    'Skins de aliens',
    '<p>Cambia el aspecto de un alien: conserva su vida, daño, maestría, velocidad y habilidades. El concierto de Cuatro Brazos se gana en DIFÍCIL con Kim Taehyung (Ciudad Bahía).</p>' + rows,
    [['LISTO', closeDialog]],
  );
  for (const b of document.querySelectorAll('[data-skin]')) {
    const { table, sheet } = spriteInfo(+b.dataset.row),
      f = table[0],
      c = b.querySelector('canvas').getContext('2d'),
      h = 96,
      w = Math.min(92, (f[2] / f[3]) * h);
    c.imageSmoothingEnabled = false;
    try { c.drawImage(sheet, f[0], f[1], f[2], f[3], (96 - w) / 2, 4, w, (w / f[2]) * f[3]); } catch (e) {}
    b.onclick = () => {
      if (setAlienSkin(b.dataset.alien, b.dataset.skin)) alienSkinMenu();
      else toast('Gana en DIFÍCIL con el portador del Omnitrix');
    };
  }
}
function musicalAttack(i) {
  if (!hasMusicSkin()) return;
  player.musicFrame = [3, 4, 6, 7, 8, 9][i];
  effects.push({ type: 'musicnotes', x: player.x, y: player.y - 100, t: 1.05, max: 1.05, r: 100, style: i });
  window.OmniSound?.play('music');
}
function drawMusicEffect(f) {
  const p = 1 - f.t / f.max;
  ctx.save();
  ctx.globalAlpha = Math.min(1, f.t * 2.5);
  for (let i = 0; i < 8; i++) {
    const a = i * 0.81 + (f.style || 0) * 0.3,
      x = f.x + Math.cos(a) * (65 + p * 85),
      y = f.y + Math.sin(a) * 50 - p * 65;
    txt(i % 3 === 0 ? '♫' : '♪', x, y, 22 + (i % 3) * 3, ['#dbadff', '#ffd69f', '#a8f6fa'][i % 3]);
  }
  ctx.restore();
}
function danceMenu() {
  const notes = window.OmniRhythm.chart;
  showDialog(
    'KIM TAEHYUNG · CONCIERTO BAHÍA',
    '¿Una batalla de baile?',
    '<p>«¡Hola! ¿Quieres subir al escenario? Elige una dificultad y sigue las flechas.»</p><p><b>RUN · BTS · Ronda de 4:20</b>. Pulsa las flechas cuando lleguen a la línea inferior. PERFECT y SICK recuperan energía; los fallos la reducen. Ganas si llegas al final con energía.</p><p>' +
      (race === 'omni'
        ? 'Premio en DIFÍCIL: skin musical de Cuatro Brazos.'
        : 'Puedes bailar con esta raza. Para obtener la skin de Cuatro Brazos, juega en Difícil con el Omnitrix.') +
      '</p><p>Fácil: ' +
      notes.charts.easy.length +
      ' flechas · Normal: ' +
      notes.charts.normal.length +
      ' · Difícil: ' +
      notes.charts.hard.length +
      '.</p><label>Sincronización táctil <span id="synclabel">' +
      OmniRhythm.offset +
      ' ms</span><input id="rhythmsync" type="range" min="-150" max="150" step="5" value="' +
      OmniRhythm.offset +
      '"></label><p>0 ms recomendado. Si necesitas ajustar la sensación de los toques, cambia este valor. Puedes pausar durante la canción.</p>' +
      (net.peer
        ? '<p>El reto es individual. El mundo compartido queda en pausa durante tu actuación.</p>'
        : ''),
    [
      ['FÁCIL', () => startDance('easy')],
      ['NORMAL', () => startDance('normal')],
      ['DIFÍCIL', () => startDance('hard')],
      ['AHORA NO', closeDialog],
    ],
  );
  $('#rhythmsync').oninput = (e) => {
    OmniRhythm.calibrate(+e.target.value);
    $('#synclabel').textContent = OmniRhythm.offset + ' ms';
  };
}
function danceReward(result) {
  const old = player.danceBest[result.mode];
  if (!old || result.score > old.score)
    player.danceBest[result.mode] = { score: result.score, accuracy: result.accuracy, won: result.won };
  let message = result.won
    ? '¡Buen ritmo! Puedes volver a intentarlo en otra dificultad.'
    : 'No pierdes vida ni progreso de tu aventura. Inténtalo otra vez.';
  if (result.won && result.mode === 'hard' && race === 'omni') {
    const fresh = !player.unlockedAlienSkins.fourarmsConcert;
    player.unlockedAlienSkins.fourarmsConcert = true;
    message = fresh
      ? '¡SKIN DESBLOQUEADA! Cuatro Brazos · Traje de concierto. Equípala en SKINS DE ALIENS.'
      : 'Ya tienes la skin musical. Tu mejor puntuación queda guardada.';
  }
  persistGame();
  return message;
}
function startDance(mode) {
  if (zone !== 10 || dist(player, kim) > 145) return false;
  resetInput();
  dialogOpen = false;
  $('#modal').classList.add('hidden');
  paused = true;
  save();
  return OmniRhythm.start(mode, {
    background: art.places8,
    npc: spriteInfo(27),
    onComplete: danceReward,
    onExit: () => {
      paused = false;
      last = performance.now();
      resetInput();
      hud();
      save();
    },
  });
}
function startStory() {
  if (zone !== 9 || dist(player, ten) > 140) return false;
  const q = player.story;
  if (q.completions >= 2 || q.state === 'active' || q.state === 'return') return false;
  q.state = 'active';
  q.reward = Math.round(xpNeed() * 0.9);
  showDialog(
    'TEN · CAPÍTULO 1',
    'Gracias, cuento contigo',
    '<p>«Vilgax está causando estragos por la ciudad. Su robot está en la zona devastada al <b>sur del Barrio residencial</b>. Derrótalo y regresa conmigo.»</p><p>Recompensa al volver: <b>' +
      q.reward +
      ' EXP</b>. Tu intento no se pierde si caes.</p>',
    [['BUSCAR AL ROBOT', closeDialog]],
  );
  save();
  return true;
}
function robotQuestKill() {
  if (zone === 11 && player.story.state === 'active') {
    player.story.state = 'return';
    toast('Robot de Vilgax derrotado · Regresa con Ten');
    save();
  }
}
function claimStory() {
  const q = player.story;
  if (zone !== 9 || dist(player, ten) > 140 || q.state !== 'return' || q.completions >= 2) return false;
  const reward = q.reward;
  q.completions++;
  q.state = q.completions >= 2 ? 'complete' : 'done';
  q.reward = 0;
  xp(reward);
  showDialog(
    'TEN · HISTORIA 01 COMPLETADA',
    'La ciudad puede respirar',
    '<p>«Gracias por ayudarme. Detuvimos al robot, pero Vilgax no se rendirá tan fácilmente.»</p><p class="reward">+' +
      reward +
      ' EXP</p><p>' +
      (q.completions === 1
        ? 'Te queda una repetición de este capítulo con esta raza.'
        : 'Has completado la primera victoria y la única repetición de esta raza. Próximo capítulo próximamente.') +
      '</p>',
    [['CONTINUAR', closeDialog]],
  );
  save();
  return true;
}
function storyTalk() {
  const q = player.story,
    near = zone === 9 && dist(player, ten) <= 140;
  if (q.state === 'complete') {
    showDialog(
      'TEN · MODO HISTORIA',
      'Capítulo 1 completado',
      '<p>«Ya venciste al robot y completaste la única repetición con esta raza. Gracias, chico. La próxima parte de nuestra aventura llegará más adelante.»</p><p>Victorias cobradas: 2 / 2 · Progreso independiente para cada raza.</p>',
      [['HASTA PRONTO', closeDialog]],
    );
    return;
  }
  if (q.state === 'return') {
    showDialog(
      'TEN · VICTORIA CONFIRMADA',
      'Buen trabajo contra el robot',
      '<p>«¡Lo lograste! La ciudad está más segura gracias a ti.»</p><p class="reward">Recompensa: ' +
        q.reward +
        ' EXP</p><p>' +
        (near ? 'Cobra tu recompensa.' : 'Regresa a la habitación de Ten, al norte del Barrio.') +
        '</p>',
      [...(near ? [['COBRAR RECOMPENSA', claimStory]] : []), ['VOLVER', closeDialog]],
    );
    return;
  }
  if (q.state === 'active') {
    showDialog(
      'TEN · HISTORIA 01',
      'Detén al robot de Vilgax',
      '<p>Encuentra la zona devastada <b>hacia abajo desde el Barrio residencial</b>. Derrota al robot y regresa con Ten.</p><p>Robot: 950 vida · nivel recomendado 12 · ataques anunciados de 14–18 de daño. Reaparece 60 s después de caer.</p><p class="reward">' +
        q.reward +
        ' EXP al regresar</p>',
      [['CONTINUAR', closeDialog]],
    );
    return;
  }
  showDialog(
    'TEN · MODO HISTORIA · CAPÍTULO 1',
    q.completions ? 'Una última patrulla' : 'Vilgax amenaza la ciudad',
    '<p>«Oye, chico, quiero que me ayudes a enfrentarme a Vilgax. Está causando estragos por la ciudad y necesito a alguien que detenga a su robot. ¿Aceptas?»</p><p>Recompensa: <b>' +
      Math.round(xpNeed() * 0.9) +
      ' EXP</b>, el 90% de lo necesario para un nivel al aceptar. Sin requisito de raza.</p><p>' +
      (q.completions
        ? 'Esta es la única repetición disponible para tu raza.'
        : 'Una primera victoria y una sola repetición por raza.') +
      (near ? '' : ' Habla con Ten en su habitación para aceptar.') +
      '</p>',
    [...(near ? [['ACEPTAR MISIÓN', startStory]] : []), ['AHORA NO', closeDialog]],
  );
}
function ensureRobot() {
  if (net.role === 'guest' || zone !== 11) return;
  let b = enemies.find((e) => e.robotBoss);
  if (b?.alive || player.robotTimer > 0) return;
  const fresh = {
    id: 'vilgaxrobot',
    kind: 'robot',
    robotBoss: true,
    x: 1120,
    y: 715,
    homeX: 1120,
    homeY: 715,
    hp: 950,
    max: 950,
    alive: true,
    face: -1,
    anim: 0,
    moving: false,
    hit: 0,
    stun: 0,
    clawCD: 2,
    laserCD: 3,
    quakeCD: 5,
    castData: null,
  };
  if (b) Object.assign(b, fresh);
  else enemies.push(fresh);
  zoneStates[region().id] = enemies;
}
function defeatRobot(b) {
  if (!b.alive) return;
  b.alive = false;
  b.hp = 0;
  b.castData = null;
  player.robotTimer = 60;
  robotQuestKill();
  if (net.peer) lanSend({ type: 'robotKill', zone });
  burst(b.x, b.y - 65, 45, '#ffad76');
  effects.push({ type: 'robotscrap', x: b.x, y: b.y, r: 120, t: 1, max: 1 });
  toast(
    player.story.state === 'return'
      ? 'Robot derrotado · Cobra la EXP con Ten'
      : 'Robot derrotado · Vuelve en 60 s · Ten ofrece su misión de historia',
  );
  save();
}
function robotCast(b, type) {
  const a = Math.atan2(
      (teamTargets().sort((x, y) => dist(x, b) - dist(y, b))[0] || player).y - b.y,
      (teamTargets().sort((x, y) => dist(x, b) - dist(y, b))[0] || player).x - b.x,
    ),
    max = type === 'claw' ? 1.1 : type === 'laser' ? 1.45 : 1.6;
  b.castData = { type, t: max, max, a, hit: false };
  b[type === 'claw' ? 'clawCD' : type === 'laser' ? 'laserCD' : 'quakeCD'] =
    type === 'claw' ? 4 : type === 'laser' ? 6 : 9;
}
function updateRobot(dt) {
  if (net.role === 'guest') return;
  player.robotTimer = Math.max(0, player.robotTimer - dt);
  ensureRobot();
  if (zone !== 11) return;
  const b = enemies.find((e) => e.robotBoss && e.alive);
  if (!b) return;
  b.hit = Math.max(0, b.hit - dt);
  b.stun = Math.max(0, b.stun - dt);
  for (const k of ['clawCD', 'laserCD', 'quakeCD']) b[k] = Math.max(0, b[k] - dt);
  b.moving = false;
  if (b.castData) {
    const f = b.castData;
    f.t -= dt;
    const release = f.type === 'claw' ? 0.43 : f.type === 'laser' ? 0.5 : 0.45;
    if (!f.hit && f.t <= release) {
      f.hit = true;
      for (const t of teamTargets()) {
        const d = dist(t, b),
          a = Math.atan2(t.y - b.y, t.x - b.x),
          angle = Math.abs(Math.atan2(Math.sin(a - f.a), Math.cos(a - f.a)));
        if (
          lineClear(b.x, b.y, t.x, t.y) &&
          ((f.type === 'claw' && d < 145 && angle < 1.05) ||
            (f.type === 'laser' && d < 550 && angle < 0.13) ||
            (f.type === 'quake' && d < 195))
        )
          hurtTeam(t, f.type === 'claw' ? 14 : f.type === 'laser' ? 16 : 18);
      }
      effects.push({
        type: 'robotimpact',
        x: b.x,
        y: b.y,
        a: f.a,
        r: f.type === 'quake' ? 195 : 145,
        t: 0.5,
        max: 0.5,
        style: f.type,
      });
      window.OmniSound?.play(f.type === 'laser' ? 'crystal' : 'hit');
      shake = 0.18;
    }
    if (f.t <= 0) b.castData = null;
    return;
  }
  if (b.stun > 0) return;
  const target = teamTargets().sort((x, y) => dist(x, b) - dist(y, b))[0],
    d = dist(b, target);
  b.face = target.x >= b.x ? 1 : -1;
  if (d > 750) return;
  if (d < 145 && b.clawCD <= 0) robotCast(b, 'claw');
  else if (d < 195 && b.quakeCD <= 0) robotCast(b, 'quake');
  else if (d < 520 && b.laserCD <= 0 && lineClear(b.x, b.y, target.x, target.y)) robotCast(b, 'laser');
  else if (d > 100) {
    moveActor(b, ((target.x - b.x) / d) * 115 * dt, ((target.y - b.y) / d) * 115 * dt);
    b.anim += dt * 6;
    b.moving = true;
  }
}
function drawRobot(b) {
  const f = b.castData,
    frame = f
      ? f.type === 'claw'
        ? f.hit
          ? 4
          : 3
        : f.type === 'laser'
          ? f.hit
            ? 6
            : 5
          : f.hit
            ? 8
            : 7
      : b.hit > 0
        ? 10
        : b.moving
          ? 1 + (Math.floor(b.anim) % 2)
          : 0;
  sprite(28, frame, b.x, b.y, 190, b.face, b.hit > 0 ? 0.6 : 1);
  txt('ROBOT DE VILGAX · NV. 12', b.x, b.y - 204, 10, '#ffbf91');
  ctx.fillStyle = '#25151b';
  ctx.fillRect(b.x - 58, b.y - 197, 116, 6);
  ctx.fillStyle = '#fb8757';
  ctx.fillRect(b.x - 58, b.y - 197, 116 * Math.max(0, b.hp / b.max), 6);
  if (f) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.strokeStyle = f.hit ? '#fff1b2' : '#ff806e';
    ctx.fillStyle = f.hit ? '#ff985f66' : '#ed624522';
    ctx.lineWidth = f.hit ? 7 : 2;
    if (f.type === 'quake') {
      ctx.beginPath();
      ctx.ellipse(0, 0, 195, 80, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.rotate(f.a);
      if (f.type === 'laser') {
        ctx.fillRect(20, -13, 530, 26);
        ctx.strokeRect(20, -13, 530, 26);
        if (f.hit) {
          ctx.fillStyle = '#fff5c8';
          ctx.fillRect(15, -5, 535, 10);
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 145, -1.05, 1.05);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
    if (!f.hit)
      txt(
        f.type === 'claw' ? '¡PINZAS!' : f.type === 'laser' ? '¡RAYO!' : '¡ALÉJATE!',
        b.x,
        b.y - 224,
        11,
        '#ffba9a',
      );
  }
}
function drawV8Effects() {
  for (const f of effects) {
    if (f.type === 'musicnotes') drawMusicEffect(f);
    if (f.type === 'robotimpact' || f.type === 'robotscrap') {
      ctx.strokeStyle = f.type === 'robotscrap' ? '#ffc892' : '#ff8963';
      ctx.lineWidth = 4;
      const p = 1 - f.t / f.max;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, Math.max(1, f.r * p), Math.max(1, f.r * 0.4 * p), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
function hudV8() {
  if (zone === 9 || zone === 11) {
    const q = player.story;
    $('#mission .tiny').textContent = 'HISTORIA 01 · TEN';
    $('#questtext').textContent =
      q.state === 'active'
        ? 'Derrota al robot de Vilgax'
        : q.state === 'return'
          ? 'Regresa con Ten'
          : q.state === 'complete'
            ? 'Capítulo completado'
            : 'Habla con Ten';
    $('#questsub').textContent =
      q.state === 'active'
        ? 'Zona devastada · Sur del Barrio'
        : q.state === 'return'
          ? q.reward + ' EXP pendientes'
          : 'Habitación · Norte del Barrio';
  }
  if (zone === 10) {
    $('#mission .tiny').textContent = 'CONCIERTO · KIM TAEHYUNG';
    $('#questtext').textContent = 'Batalla de baile · RUN';
    $('#questsub').textContent = 'Difícil: skin musical de Cuatro Brazos';
  }
  if (zone === 11) {
    const b = enemies.find((e) => e.robotBoss && e.alive);
    $('#bossbar').classList.remove('hidden');
    $('#bossbar').textContent = b
      ? 'ROBOT DE VILGAX · ' + Math.ceil(b.hp) + ' / 950'
      : 'ROBOT · REAPARECE EN ' + Math.ceil(player.robotTimer) + ' s';
  }
}

const neko = { x: 1050, y: 685, face: -1, row: 29, name: 'MAID NEKO' };
function initV9() {
  player.kitchen = Object.assign({ orders: 0, storyRead: false }, player.kitchen || {});
  player.kitchen.orders = Math.max(0, Math.floor(Number(player.kitchen.orders) || 0));
}
function kitchenProgress() {
  return { orders: player.kitchen.orders, coins: player.coins };
}
function nekoTalk() {
  const n = player.kitchen.orders,
    r = OmniCooking.rankOf(n),
    next = OmniCooking.ranks[r + 1];
  showDialog(
    'BELLWOOD · MAID NEKO',
    'Bienvenido a mi cocina',
    '<p>«Aquí cada plato cuenta una historia. ¿Quieres escuchar la mía o ponerte el delantal?»</p><p>Puesto: <b>' +
      OmniCooking.ranks[r].name +
      '</b> · ' +
      n +
      ' pedidos entregados.<br>' +
      (next
        ? 'Próximo ascenso a los ' + next.at + ' pedidos: ' + next.name + '.'
        : '¡Has llegado a chef de Bellwood!') +
      '</p><p>Arrastra los ingredientes al plato siguiendo la comanda. Cada pedido correcto paga <b>10 monedas</b>. Puedes corregirlo sin penalización y trabajar sin límite de tiempo. Tus ascensos y monedas son independientes para cada raza.</p>',
    [
      ['TRABAJAR EN COCINA', startCooking],
      ['LA HISTORIA DE NEKO', () => nekoStory(0)],
      ['HASTA LUEGO', closeDialog],
    ],
  );
}
function nekoStory(page) {
  const story = [
    [
      'Un hogar en la bahía',
      '«Llegué desde el bosque con una maleta y el cuaderno de recetas de mi familia. Bellwood me abrió sus puertas: vivía en el pequeño cuarto sobre el restaurante y ayudaba a limpiar después del último cliente.»',
    ],
    [
      'La primera comanda',
      '«Al principio quemaba las tostadas y confundía los pedidos. La antigua chef me enseñó a escuchar, ordenar los ingredientes y probar cada receta. Mi primer sándwich perfecto fue para una vecina que venía sola todas las tardes.»',
    ],
    [
      'Mi propia cocina',
      '«Con los años pasé de ayudante a cocinera y aprendí a dirigir el servicio. Ahora soy la chef de Bellwood. Quiero que la gente encuentre aquí el mismo hogar que encontré yo. ¿Me ayudas con el siguiente pedido?»',
    ],
  ];
  if (page === 2) {
    player.kitchen.storyRead = true;
    persistGame();
  }
  showDialog(
    'MAID NEKO · SU HISTORIA · ' + (page + 1) + ' / 3',
    story[page][0],
    '<p>' + story[page][1] + '</p>',
    [
      [
        page < 2 ? 'SEGUIR ESCUCHANDO' : 'VOLVER A LA COCINA',
        () => (page < 2 ? nekoStory(page + 1) : nekoTalk()),
      ],
      ['VOLVER', nekoTalk],
    ],
  );
}
function startCooking() {
  if (zone !== 12 || dist(player, neko) > 145) return false;
  const workingRace = race;
  resetInput();
  dialogOpen = false;
  $('#modal').classList.add('hidden');
  paused = true;
  save();
  return OmniCooking.start({
    background: art.bellwood9,
    neko: art.neko9,
    food: art.food9,
    progress: kitchenProgress,
    onOrder: () => {
      if (race !== workingRace || zone !== 12 || !OmniCooking.active) return;
      player.coins += 10;
      player.kitchen.orders++;
      persistGame();
    },
    onExit: () => {
      paused = false;
      last = performance.now();
      resetInput();
      hud();
      save();
    },
  });
}
function jobsMenu() {
  if (!ready) return;
  showDialog(
    'VIAJE DIRECTO · DOS ACTIVIDADES',
    'Minijuegos / Trabajos',
    '<p>Viaja directamente frente al NPC. Conservas tu raza, nivel, vida y progreso.</p><div class="jobcards"><button id="jobfood"><strong>BELLWOOD</strong><p>Crea platos con ingredientes táctiles y asciende hasta chef.</p><small>10 monedas por pedido · ' +
      OmniCooking.ranks[OmniCooking.rankOf(player.kitchen.orders)].name +
      '</small></button><button id="jobrhythm"><strong>CONCIERTO</strong><p>Batalla de baile con Kim Taehyung al ritmo de RUN.</p><small>Tres dificultades · skin en Difícil con Omnitrix</small></button></div>' +
      (net.role === 'guest'
        ? '<p>En multijugador, el anfitrión dirige los viajes. Pídele que abra este menú para ir juntos.</p>'
        : ''),
    [['VOLVER', closeDialog]],
  );
  $('#jobfood').onclick = () => travelToJob('food');
  $('#jobrhythm').onclick = () => travelToJob('rhythm');
}
function travelToJob(id) {
  if (!ready || !['food', 'rhythm'].includes(id) || OmniCooking.active || OmniRhythm.active) return false;
  if (net.role === 'guest') {
    toast('El anfitrión dirige los viajes; pídele que elija el destino');
    return false;
  }
  closeDialog();
  if (!started) $('#play').click();
  enterZone(id === 'food' ? 12 : 10, 'center');
  const n = id === 'food' ? neko : kim;
  player.x = n.x - 115;
  player.y = n.y + 18;
  cam.x = clamp(player.x - (W * 0.48) / sceneZoom(), 0, cameraMaxX());
  cam.y = clamp(player.y - (H * 0.61) / sceneZoom(), 0, cameraMaxY());
  hud();
  persistGame();
  toast('Habla con ' + n.name + ' para comenzar');
  return true;
}
function drawBellwoodGate() {
  if (zone !== 3) return;
  const x = 1110,
    y = 565;
  ctx.fillStyle = '#174748';
  ctx.fillRect(x - 82, y - 31, 164, 28);
  ctx.strokeStyle = '#f4d89d';
  ctx.strokeRect(x - 82, y - 31, 164, 28);
  txt('↑ BELLWOOD · COCINA', x, y - 13, 10, '#ffe6aa');
}
function hudV9() {
  if (zone !== 12) return;
  $('#mission .tiny').textContent = 'BELLWOOD · TRABAJO DE COCINA';
  $('#questtext').textContent =
    OmniCooking.ranks[OmniCooking.rankOf(player.kitchen.orders)].name +
    ' · ' +
    player.kitchen.orders +
    ' pedidos';
  $('#questsub').textContent = 'Habla con Maid Neko · 10 monedas / pedido';
}

initProgress();
function maxHP() {
  return race === 'osmo'
    ? player.form === 'fire' && player.fireCharge >= 60
      ? 300
      : OSMO_FORMS[player.form].hp
    : player.alien
      ? Math.round(ALIENS[player.activeAlien].hp * (ultOn() ? ultForm().hpMult : 1) * upgHP())
      : 100;
}
function xpNeed() {
  let n = player.level - 1;
  return 140 + n * 45 + n * n * 4;
}
function multiplier() {
  return (
    (1 + (player.level - 1) * 0.035) *
    (race === 'osmo' && player.form === 'fire' && player.fireCharge >= 60 ? 1.12 : 1) *
    (ultOn() ? ultForm().damageMult : 1) *
    upgDmg() * // alien upgrades (part-45)
    prestigeMult() * // prestige stars (part-46)
    ((player.critT || 0) > 0 ? 1.8 : 1) // Grey Matter / Brainstorm analysis (part-28)
  );
}
function save() {
  if (started) persistGame();
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE));
    if (!s || ![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(s.version)) return;
    race = ['osmo', 'anodite'].includes(s.race) ? s.race : 'omni';
    profiles = s.profiles || {};
    bossTimer = s.bossTimer || 0;
    const defaults = JSON.parse(JSON.stringify(player));
    Object.assign(player, s.player);
    player.selected = ALIENS[player.selected] ? player.selected : 'heatblast';
    player.activeAlien = ensureFusion(player.activeAlien) || 'heatblast'; // fusions are rebuilt from their id
    player.masteries = Object.assign(defaults.masteries, s.player.masteries || {});
    player.cooldowns = Object.assign(defaults.cooldowns, s.player.cooldowns || {});
    player.level = clamp(player.level || 1, 1, 20);
    player.shield = 0;
    player.shieldTime = 0;
    player.leap = null;
    player.motion = null;
    player.attackFrame = 3;
    watchSanitize(s.player);
    quest = Object.assign(
      { state: 'new', kills: 0, completions: s.quest && s.quest.state === 'done' ? 1 : 0 },
      s.quest || {},
    );
    dayMode = s.dayMode || 'noche';
    sound = s.sound !== false;
    clock = s.clock || 0;
    if (s.version === 1) {
      player.masteries.heatblast = clamp(s.player.mastery || 0, 0, 100);
      player.xp = Math.floor((s.player.xp / (60 + (player.level - 1) * 20)) * xpNeed());
      zone = 1;
      zoneStates = { camp: s.enemies || [] };
    } else {
      zone = clamp(s.zone || 0, 0, REGIONS.length - 1);
      zoneStates = s.zoneStates || {};
      discovered = s.discovered || ['camp'];
      opened = s.opened || [];
    }
    if (s.version < 4 && player.alien && player.activeAlien === 'fourarms')
      player.hp = Math.min(400, (player.hp * 4) / 3);
    player.skin = SKINS[player.skin] ? player.skin : 0;
    player.motion = null;
    player.slideCool = Math.max(0, player.slideCool || 0);
    if (s.version < 5) {
      player.points = Math.max(0, player.level - 1);
      player.learned = {};
    }
    migrated = s.version < 9;
    if (migrated) {
      player.emptyLock = 0;
      player.lock = 0;
    }
    for (const id of Object.keys(ALIENS)) {
      player.masteries[id] = clamp(player.masteries[id] || 0, 0, 100);
      if (!Array.isArray(player.cooldowns[id])) player.cooldowns[id] = [0, 0, 0, 0];
    }
    law = Object.assign(law, s.law || {});
    law.karma = clamp(law.karma, -100, 0);
    law.heat = clamp(law.heat, 0, 100);
    law.timer = clamp(law.timer, 0, 60);
    civilStates = s.civilStates || {};
    initProgress();
    player.cool = player.cooldowns[player.activeAlien];
    enemies = zoneStates[region().id] || [];
    for (const e of enemies) {
      e.kind = e.robotBoss ? 'robot' : e.majorBoss ? 'boss' : 'enemy';
      e.rcd = Number.isFinite(e.rcd) ? e.rcd : 2;
      e.cast = 0;
    }
    ensureCitizens();
    player.inv = 2;
    player.attack = 0;
    player.moving = false;
    if (isSolid(player.x, player.y)) {
      player.x = 540;
      player.y = region().exitY;
    }
    $('#play').innerHTML = 'CONTINUAR AVENTURA <span>→</span>';
  } catch (e) {
    console.warn('Save could not be restored', e);
  }
}
function toast(t) {
  $('#toast').textContent = t;
  $('#toast').classList.add('show');
  toastTime = 3.3;
}
function tone(freq, duration = 0.12, type = 'sine', vol = 0.035) {
  if (sound) window.OmniSound?.tone(freq, duration, type, vol);
}
function burst(x, y, n, color) {
  for (let i = 0; i < n; i++) {
    let a = Math.random() * Math.PI * 2,
      v = 30 + Math.random() * 125;
    particles.push({
      x,
      y,
      dx: Math.cos(a) * v,
      dy: Math.sin(a) * v - 30,
      t: 0.3 + Math.random() * 0.5,
      color,
      size: 2 + Math.random() * 4,
    });
  }
}
function popup(x, y, text, color = '#ffe0a6') {
  numbers.push({ x, y, text, color, t: 1.1 });
}
function xp(amount) {
  if (net.source === 'guest') {
    lanSend({ type: 'reward', xp: amount });
    return;
  }
  amount = Math.round(amount * diffCfg().xp); // difficulty bonus (part-32)
  if (player.level === LEVEL_CAP) return;
  player.xp += amount;
  let up = false;
  while (player.level < LEVEL_CAP && player.xp >= xpNeed()) {
    player.xp -= xpNeed();
    player.level++;
    player.points++;
    up = true;
  }
  if (player.level === LEVEL_CAP) player.xp = 0;
  if (up) {
    toast('¡Nivel ' + player.level + '! Tus ataques son más fuertes.');
    levelBanner(player.level); // part-44
    burst(player.x, player.y - 40, 35, '#c3ff8a');
    tone(880, 0.35);
    checkWatchUnlocks(true);
  }
  save();
}
function transform(opts = {}) {
  if (player.downed) return;
  if (race === 'anodite') return anoditeTransform(); // part-29
  player.cast = null;
  player.flight = 0;
  if (race === 'osmo') {
    if (started && !paused) absorptionMenu();
    return;
  }
  if (!started || paused || player.leap || player.motion || player.jump > 0) return;
  if (player.alien) {
    revert(false);
    return;
  }
  if (player.battery <= 0) {
    toast('Batería vacía · Recupera un poco de carga');
    playWatchSFX('error');
    tone(90);
    return;
  }
  ensureSelection();
  const ratio = player.hp / 100,
    pick = watchPick(player.selected);
  player.activeAlien = pick.id;
  player.cool = player.cooldowns[player.activeAlien];
  player.alien = true;
  player.ultimate = false;
  player.lowWarned = false;
  player.hp = clamp(ratio * maxHP(), 1, maxHP());
  player.lock = 0;
  player.emptyLock = 0;
  flash = 0.3;
  burst(player.x, player.y - 50, 30, alien().color);
  burst(player.x, player.y - 50, 16, oxColor());
  if (!opts.fromSelector) playWatchSFX('transform');
  tone(player.activeAlien === 'fourarms' ? 250 : 720, 0.35, 'sawtooth', 0.02); // alien-owned spawn sound
  fxPlay(getWatch().fx, { alien: player.activeAlien });
  statEvent('transform', { alien: player.activeAlien }); // challenges / achievements (part-34)
  if (pick.misfire) {
    playWatchSFX('random_transform');
    toast('¡FALLO DEL DIAL! Salió ' + alien().name.toUpperCase() + ' · ' + maxHP() + ' vida máxima');
  } else toast(alien().name.toUpperCase() + ' · ' + maxHP() + ' vida máxima' + (travelName() ? ' · SHIFT: ' + travelName() : ''));
  save();
}
function revert(empty) {
  if (race === 'anodite') return anoditeRevert(empty);
  player.cast = null;
  player.flight = 0;
  if (race === 'osmo') {
    const ratio = player.hp / maxHP();
    player.form = 'human';
    player.fireCharge = 0;
    refreshOsmo();
    player.hp = clamp(ratio * 100, 1, 100);
    player.motion = player.leap = null;
    if (empty) player.battery = 0;
    save();
    return;
  }
  if (!player.alien) return;
  const ratio = player.hp / maxHP();
  player.hp = clamp(ratio * 100, 1, 100);
  player.alien = false;
  player.ultimate = false;
  player.shield = 0;
  player.shieldTime = 0;
  player.leap = null;
  player.motion = null;
  player.lock = 0;
  player.emptyLock = 0;
  if (empty) {
    player.battery = 0;
    playWatchSFX('timeout');
    watchAnim('timeout'); // watch close-up (part-38)
    toast('Recargando · ' + Math.ceil(100 / rechargeRate()) + ' s hasta el 100%; puedes usar carga parcial');
  } else {
    playWatchSFX('revert');
    toast('Humano · Puedes usar cualquier carga disponible');
  }
  flash = 0.2;
  burst(player.x, player.y - 45, 22, oxColor());
  if (empty) tone(260, 0.25);
  save();
}
function spawnEnemies() {
  enemies = region().spawns.map((p, i) => ({
    id: i,
    x: p[0],
    y: p[1],
    homeX: p[0],
    homeY: p[1],
    face: -1,
    hp: zone === 1 && i === 5 ? 190 : 100,
    max: zone === 1 && i === 5 ? 190 : 100,
    boss: zone === 1 && i === 5,
    knight: zone === 6 || zone === 8 ? (i % 2 ? 'ranged' : 'melee') : null,
    kind: 'enemy',
    rcd: 1 + i * 0.35,
    cast: 0,
    stun: 0,
    alive: true,
    respawn: 0,
    cd: 1 + i * 0.3,
    wind: 0,
    anim: 0,
    hit: 0,
    moving: false,
  }));
  if (zone === 6 || zone === 8)
    for (const e of enemies) {
      e.hp = e.max = e.knight === 'melee' ? 440 : 380;
    }
  zoneStates[region().id] = enemies;
}
function enterZone(next, side) {
  if (net.role === 'guest' && !net.applying) {
    toast('El anfitrión dirige los cambios de zona');
    return false;
  }
  if (next < 0 || next >= REGIONS.length) return false;
  if (next !== zone && window.OmniCooking?.active) OmniCooking.leave();
  zoneStates[region().id] = enemies;
  civilStates[region().id] = citizens;
  const previousZone = zone;
  zone = next;
  enemies = zoneStates[region().id] || [];
  if (!zoneStates[region().id] && (zone !== 1 || quest.state !== 'new')) spawnEnemies();
  for (const e of enemies) {
    e.kind = e.robotBoss ? 'robot' : e.majorBoss ? 'boss' : 'enemy';
    if (!Number.isFinite(e.rcd)) e.rcd = 2;
  }
  ensureCitizens();
  officers = [];
  law.spawn = 1;
  player.x = side === 'left' ? region().minX + 65 : side === 'right' ? region().maxX - 65 : 540;
  player.y = region().exitY;
  if (side === 'top' || side === 'bottom') {
    player.x = region().portalX || 800;
    player.y = side === 'top' ? floorBounds(player.x).top + 40 : region().bottom - 40;
  }
  if (next === 3 && previousZone === 12) {
    player.x = 1110;
    player.y = 600;
  }
  player.jump = 0;
  player.inv = Math.max(player.inv, 0.7);
  player.leap = null;
  player.motion = null;
  projectiles.length = 0;
  hostileShots.length = 0;
  effects.length = 0;
  particles.length = 0;
  numbers.length = 0;
  gateLock = 1.5;
  transition = 0.8;
  resetInput();
  ensureBoss();
  ensureRobot();
  if (!discovered.includes(region().id)) discovered.push(region().id);
  cam.x = clamp(player.x - (W * 0.48) / sceneZoom(), 0, cameraMaxX());
  cam.y = clamp(player.y - (H * 0.64) / sceneZoom(), 0, cameraMaxY());
  toast(region().name + ' · ' + region().subtitle);
  hud();
  save();
  return true;
}
function checkGate(vx, vy = 0) {
  if (gateLock > 0) return false;
  const r = region(),
    l = r.links;
  if (zone === 3 && vy < 0 && Math.abs(player.x - 1110) < 64 && player.y <= r.top + 14)
    return enterZone(12, 'bottom');
  if (Math.abs(player.x - r.portalX) < 64) {
    if (vy < 0 && l.up !== undefined && player.y <= floorBounds(player.x).top + 14)
      return enterZone(l.up, 'bottom');
    if (vy > 0 && l.down !== undefined && player.y >= r.bottom - 14) return enterZone(l.down, 'top');
  }
  if (Math.abs(player.y - r.exitY) > 57) return false;
  if (vx < 0 && l.left !== undefined && player.x <= r.minX + 16) return enterZone(l.left, 'right');
  if (vx > 0 && l.right !== undefined && player.x >= r.maxX - 16) return enterZone(l.right, 'left');
  return false;
}

function damageEnemy(e, dmg) {
  if (!e.alive) return;
  if (e.intangible > 0) { popup(e.x, e.y - 150, 'INTANGIBLE'); return; } // the Spectre phasing (part-42)
  dmg = coopDamage(dmg); // tougher enemies while both players are here
  dmg = dmg / diffCfg().hp; // difficulty (part-32)
  dmg = dmgMod(e, dmg); // weak points, counters, elite shields (part-46)
  if (e.robotBoss) {
    e.hp -= Math.round(dmg);
    e.hit = 0.17;
    popup(e.x, e.y - 180, '' + Math.round(dmg));
    if (e.hp <= 0) defeatRobot(e);
    return;
  }
  if (e.majorBoss) {
    e.hp -= Math.round(dmg);
    e.hit = 0.16;
    popup(e.x, e.y - 155, '' + Math.round(dmg));
    if (e.hp <= 0) bossReward(e);
    return;
  }
  e.hp -= Math.round(dmg);
  e.hit = 0.16;
  sagaAcid(e);
  featHit(e, dmg); // combo + Ultra meter (part-45)
  popup(e.x, e.y - 95, '' + Math.round(dmg));
  burst(e.x, e.y - 40, 7, player.alien ? alien().color : '#ffc073');
  if (e.hp <= 0) {
    e.alive = false;
    e.respawn = 40 + e.id * 5;
    burst(e.x, e.y - 40, 18, '#ba94d9');
    if (e.knight) {
      knightKill();
      if (net.peer) lanSend({ type: 'knightKill' });
    }
    xp(e.knight ? 28 : e.boss ? 24 : 10);
    coopShareXP(e.knight ? 28 : e.boss ? 24 : 10);
    dnaDrop();
    missionKill(e); // mission board (part-27)
    sagaKill(e); // Historia 02 (part-42)
    bestiaryKill(e); // codex scanning (part-43)
    featKill(e); // batch 1 (part-45)
    eliteKill(e); // batch 2 (part-46)
    f3Kill(e); // batch 3 (part-47)
    if (zone === 1 && net.peer) lanSend({ type: 'reward', kill: true });
    if (quest.state === 'active' && zone === 1) {
      quest.kills++;
      if (quest.kills >= 6) {
        quest.kills = 6;
        quest.state = 'return';
        toast('¡Claro despejado! Regresa con Max.');
      }
    }
    tone(180, 0.14, 'triangle');
    save();
  }
}
function nearest(range = 550) {
  let target = null,
    best = range;
  for (const e of [...enemies, ...(law.timer > 0 ? officers : [])])
    if (e.alive) {
      const d = dist(player, e);
      if (d < best && lineClear(player.x, player.y, e.x, e.y)) {
        best = d;
        target = e;
      }
    }
  if (target) return target;
  for (const c of [...citizens, ...(net.ff ? remoteTargets() : [])])
    if (c.alive) {
      const d = dist(player, c),
        facing = ((c.x - player.x) * player.dx + (c.y - player.y) * player.dy) / Math.max(1, d);
      if (d < best && facing > 0.2 && lineClear(player.x, player.y, c.x, c.y)) {
        best = d;
        target = c;
      }
    }
  return target;
}
function damageTarget(t, dmg, stun = 0) {
  if (dmg > 0) window.OmniSound?.play('hit');
  if (dmg >= 30 && t.kind !== 'remote') shake = Math.max(shake || 0, 0.09);
  if (t.kind === 'remote') {
    lanSend({ type: 'hurt', damage: Math.round(dmg), zone });
    popup(t.x, t.y - 120, '−' + Math.round(dmg), '#9ddfff');
    return;
  }
  if (net.role === 'guest' && !net.applying) {
    lanSend({ type: 'damage', id: t.id, kind: t.kind, damage: dmg, stun, zone, seq: ++net.seq });
    popup(t.x, t.y - 110, '' + Math.round(dmg));
    return;
  }
  if (t.kind === 'civil') damageCitizen(t, dmg, 'player');
  else if (t.kind === 'police') damageOfficer(t, dmg);
  else {
    damageEnemy(t, dmg);
    t.stun = Math.max(t.stun || 0, stun);
  }
}
function areaHit(x, y, r, dmg, stun = 0) {
  for (const t of combatants())
    if (t.alive && Math.hypot(t.x - x, t.y - y) < r && lineClear(x, y, t.x, t.y)) damageTarget(t, dmg, stun);
}

function slide() {
  if (
    !started ||
    paused ||
    !player.alien ||
    player.activeAlien !== 'diamond' ||
    player.slideCool > 0 ||
    player.motion ||
    player.leap
  )
    return;
  const len = Math.hypot(player.dx, player.dy) || 1;
  player.motion = { type: 'slide', t: 0.7, max: 0.7, dx: player.dx / len, dy: player.dy / len, hits: [] };
  player.slideCool = 5;
  player.attack = 0.7;
  burst(player.x, player.y - 5, 12, '#b1ffea');
  tone(650, 0.14, 'triangle');
}
function speedAttack(i, s, a) {
  const damage = s.damage * multiplier();
  player.attackFrame = i === 0 ? 3 : i === 1 ? 4 : i === 2 ? 5 : 6;
  if (i === 0) {
    player.attack = 0.32;
    effects.push({
      type: 'flurry',
      x: player.x,
      y: player.y,
      a,
      t: 0.3,
      max: 0.3,
      tick: 0,
      pulses: 0,
      damage,
      r: 108,
    });
  }
  if (i === 1) {
    player.attack = 1.95;
    effects.push({
      type: 'tornado',
      x: player.x,
      y: player.y,
      t: 1.95,
      max: 1.95,
      tick: 0,
      pulses: 0,
      damage,
      r: 110,
    });
  }
  if (i >= 2) {
    const duration = i === 2 ? 0.7 : 0.6;
    player.attack = duration;
    player.motion = {
      type: i === 2 ? 'zigzag' : 'sonicdash',
      t: duration,
      max: duration,
      dx: Math.cos(a),
      dy: Math.sin(a),
      hits: [],
      damage,
    };
  }
  tone(1100, 0.15, 'triangle');
}
function updateMotion(dt) {
  const m = player.motion;
  if (!m) return;
  const prev = m.max - m.t;
  m.t = Math.max(0, m.t - dt);
  const elapsed = m.max - m.t,
    travel = Math.min(dt, m.max - prev),
    speed = m.type === 'slide' ? 470 : m.type === 'beastcharge' ? 435 : m.type === 'zigzag' ? 570 : 690;
  let dx = m.dx * speed * travel,
    dy = m.dy * speed * travel * 0.75;
  if (m.type === 'zigzag') {
    const wave = 38 * (Math.sin((elapsed / m.max) * Math.PI * 4) - Math.sin((prev / m.max) * Math.PI * 4));
    dx -= m.dy * wave;
    dy += m.dx * wave;
  }
  moveActor(player, dx, dy);
  player.face = m.dx >= 0 ? 1 : -1;
  player.moving = false;
  effects.push({
    type: 'speedtrail',
    x: player.x,
    y: player.y - 20,
    t: 0.2,
    max: 0.2,
    r: 20,
    color: m.type === 'beastcharge' ? '#c8ef8b' : m.type === 'slide' ? '#a5ffe3' : '#79dfff',
    a: Math.atan2(m.dy, m.dx),
  });
  if (m.damage)
    for (const target of combatants())
      if (
        target.alive &&
        !m.hits.includes(target) &&
        dist(player, target) < 76 &&
        lineClear(player.x, player.y, target.x, target.y)
      ) {
        m.hits.push(target);
        damageTarget(target, m.damage, 0.25);
        burst(target.x, target.y - 35, 8, '#98e9ff');
      }
  if (m.t <= 0) {
    if (m.type === 'sonicdash')
      effects.push({
        type: 'sonic',
        x: player.x,
        y: player.y - 30,
        a: Math.atan2(m.dy, m.dx),
        t: 0.35,
        max: 0.35,
        r: 125,
      });
    player.motion = null;
    player.attack = 0.16;
    player.attackFrame = m.type === 'slide' ? 3 : 7;
  }
}
function selectSkin(index) {
  if (!SKINS[index]) return;
  player.skin = index;
  try {
    localStorage.setItem('omni-skin', String(index));
  } catch (e) {}
  save();
  skinMenu();
}
function skinMenu() {
  if (race === 'osmo') {
    toast('Esta raza usa su propia apariencia y formas de absorción');
    return;
  }
  showDialog(
    'APARIENCIA · PROGRESO COMPARTIDO',
    'Selecciona tu personaje',
    '<p>Las tres apariencias tienen la misma vida, velocidad y ataques humanos. Cambiar de skin conserva tu nivel, aliens, maestrías y misiones.</p><div class="skincards">' +
      SKINS.map(
        (skin, i) =>
          '<button data-skin="' +
          i +
          '" class="skincard ' +
          (player.skin === i ? 'active' : '') +
          '"><canvas width="150" height="170"></canvas><strong>' +
          skin.name +
          '</strong><small>' +
          (player.skin === i ? 'SELECCIONADO' : 'ELEGIR') +
          '</small></button>',
      ).join('') +
      '</div>',
    [['LISTO', closeDialog]],
  );
  document.querySelectorAll('[data-skin]').forEach((b) => {
    const i = +b.dataset.skin,
      { table, sheet } = spriteInfo(SKINS[i].row),
      f = table[0],
      c = b.querySelector('canvas').getContext('2d'),
      h = 148,
      w = (f[2] / f[3]) * h;
    c.imageSmoothingEnabled = false;
    c.drawImage(sheet, ...f, (150 - w) / 2, 14, w, h);
    b.onclick = () => selectSkin(i);
  });
}

function skillCost(i) {
  if (race === 'osmo' || !player.alien) return 0;
  const d = ALIENS[player.activeAlien];
  const base = i < 4 ? (d && d.skills[i] ? d.skills[i].cost : 0) : EXTRA_COST;
  return base > 0 ? Math.max(1, Math.round(base * skillCostMult())) : 0; // the watch sets how expensive abilities are
}
function attack(i) {
  if (!started || paused || player.downed) return;
  const cost = skillCost(i);
  if (cost > 0 && !(player.cool[i] > 0) && unlockedSkill(skillId(), i) && player.battery <= cost + 1) {
    toast('Energía insuficiente · Necesitas ' + cost + '% de batería');
    tone(90);
    return;
  }
  const before = player.cool[i] || 0;
  attackCore(i);
  if (cost > 0 && (player.cool[i] || 0) > before) player.battery = Math.max(1, player.battery - cost);
  if ((player.cool[i] || 0) > before) puzzleHit(); // boulders / ice nearby (part-26)
  if (i > 0 && player.alien && (player.cool[i] || 0) > before) statEvent('power', { i });
}
function attackCore(i) {
  if (!started || paused || player.leap || player.motion || player.cool[i] > 0) return;
  if (race === 'osmo') {
    osmoAttack(i);
    return;
  }
  if (player.alien && player.activeAlien === 'insect') {
    insectAttack(i);
    return;
  }
  if (player.alien && ALIENS[player.activeAlien].kit) {
    kitAttack(i);
    return;
  }
  if (i >= 4) {
    if (player.alien) extraAttack(i);
    else toast('Transfórmate para usar este ataque');
    return;
  }
  if (!player.alien && i !== 0) {
    toast('Transfórmate para usar las habilidades del alien');
    return;
  }
  const s = currentSkills()[i];
  if (player.alien && mastery() < s.unlock) {
    toast(s.name + ': requiere ' + s.unlock + '% de maestría');
    return;
  }
  player.cool[i] = player.alien ? s.cd : 0.55;
  player.attack = 0.35;
  player.attackFrame = 3;
  if (player.alien && ['heatblast', 'diamond'].includes(player.activeAlien)) beginCast(player.activeAlien, i);
  else window.OmniSound?.play('punch');
  const target = nearest(player.alien ? 480 : 88);
  let a = target ? Math.atan2(target.y - player.y, target.x - player.x) : Math.atan2(player.dy, player.dx);
  player.face = Math.cos(a) >= 0 ? 1 : -1;
  const attackId = nextAttackId++;
  if (!player.alien) {
    tone(160, 0.09, 'triangle');
    effects.push({
      type: 'punch',
      x: player.x + Math.cos(a) * 45,
      y: player.y - 35,
      t: 0.18,
      max: 0.18,
      r: 28,
    });
    if (target) damageTarget(target, 10 * multiplier());
    return;
  }
  if (player.activeAlien === 'bestia') {
    bestiaAttack(i, true);
    return;
  }
  if (player.activeAlien === 'xlr8') {
    speedAttack(i, s, a);
    return;
  }
  const diamond = player.activeAlien === 'diamond',
    four = player.activeAlien === 'fourarms';
  tone(
    four ? 150 : diamond ? 760 + i * 80 : 400 - i * 75,
    0.16,
    four ? 'triangle' : diamond ? 'triangle' : 'sawtooth',
    0.025,
  );
  if (four) {
    musicalAttack(i);
    if (i === 0) {
      effects.push({ type: 'sonic', x: player.x, y: player.y - 30, a, t: 0.45, max: 0.45, r: 190 });
      for (const t of combatants())
        if (t.alive && dist(player, t) < 200 && lineClear(player.x, player.y, t.x, t.y)) {
          let angle = Math.atan2(t.y - player.y, t.x - player.x),
            diff = Math.atan2(Math.sin(angle - a), Math.cos(angle - a));
          if (Math.abs(diff) < 1.05) damageTarget(t, s.damage * multiplier(), 0.25);
        }
    }
    if (i === 1) {
      let d = target ? Math.min(dist(player, target), 180) : 145,
        dest = walkable(player.x + Math.cos(a) * d, player.y + Math.sin(a) * d);
      player.leap = {
        t: 1,
        max: 1,
        startX: player.x,
        startY: player.y,
        x: dest.x,
        y: dest.y,
        damage: s.damage * multiplier(),
      };
      player.attackFrame = 4;
    }
    if (i === 2) {
      player.attackFrame = 6;
      projectiles.push({
        type: 'boulder',
        x: player.x,
        y: player.y - 45,
        dx: Math.cos(a) * 310,
        dy: Math.sin(a) * 310,
        t: 1.7,
        r: 23,
        damage: s.damage * multiplier(),
        attackId,
      });
    }
    if (i === 3) {
      player.attackFrame = 7;
      player.attack = 1.4;
      effects.push({
        type: 'quake',
        x: player.x,
        y: player.y,
        t: 1.5,
        max: 1.5,
        r: 180,
        tick: 0.15,
        pulses: 0,
        damage: s.damage * multiplier(),
      });
    }
    return;
  }
  const fire = (angle) =>
    projectiles.push({
      type: diamond ? 'crystal' : 'fire',
      x: player.x,
      y: player.y - 35,
      dx: Math.cos(angle) * (diamond ? 510 : 440),
      dy: Math.sin(angle) * (diamond ? 510 : 440),
      t: 1.25,
      damage: s.damage * multiplier(),
      r: diamond ? 9 : 10,
      attackId,
    });
  if (i === 0) fire(a);
  if (i === 1) {
    if (diamond) {
      player.shield = 80;
      player.shieldTime = 10;
      burst(player.x, player.y - 50, 25, '#bdfff1');
      toast('Escudo: 80 resistencia · 10 s');
    } else {
      fire(a - 0.17);
      fire(a);
      fire(a + 0.17);
    }
  }
  if (i === 2) {
    if (diamond) {
      const aim = target
        ? { x: target.x, y: target.y }
        : { x: player.x + Math.cos(a) * 100, y: player.y + Math.sin(a) * 60 };
      effects.push({
        type: 'field',
        x: aim.x,
        y: aim.y,
        t: 5,
        max: 5,
        r: 125,
        tick: 0,
        damage: s.damage * multiplier(),
      });
    } else {
      effects.push({ type: 'ring', x: player.x, y: player.y - 20, t: 0.6, max: 0.6, r: 150 });
      areaHit(player.x, player.y, 160, s.damage * multiplier());
      shake = 0.18;
    }
  }
  if (i === 3) {
    let aim = target
      ? { x: target.x, y: target.y }
      : {
          x: clamp(player.x + Math.cos(a) * 200, region().minX + 20, region().maxX - 20),
          y: clamp(player.y + Math.sin(a) * 90, region().top + 20, region().bottom - 20),
        };
    effects.push({
      type: diamond ? 'skycrystal' : 'meteor',
      x: aim.x,
      y: aim.y,
      t: 1.05,
      max: 1.05,
      r: 140,
      hit: false,
      damage: s.damage * multiplier(),
    });
  }
}
function showDialog(eyebrow, title, html, buttons) {
  $('.dialog').classList.remove('map-dialog', 'pausewide');
  paused = true;
  dialogOpen = true;
  held = -1;
  resetInput();
  $('#dialogeyebrow').textContent = eyebrow;
  $('#dialogtitle').textContent = title;
  $('#dialogbody').innerHTML = html;
  $('#dialogbuttons').replaceChildren();
  buttons.forEach(([text, fn]) => {
    let b = document.createElement('button');
    b.textContent = text;
    b.onclick = fn;
    $('#dialogbuttons').append(b);
  });
  $('#modal').classList.remove('hidden');
  save();
}
function closeDialog() {
  net.away = false;
  paused = false;
  dialogOpen = false;
  last = performance.now();
  $('#modal').classList.add('hidden');
}
function startMission() {
  if (net.role === 'guest') {
    toast('El anfitrión debe aceptar o repetir la patrulla con Max');
    closeDialog();
    return;
  }
  quest.state = 'active';
  quest.kills = 0;
  spawnEnemies();
  if (net.peer) lanSend({ type: 'mission' });
  closeDialog();
  toast('Misión de Max · Derrota a 6 invasores del refugio');
  save();
}
function claimMission() {
  if (quest.state !== 'return') return;
  quest.state = 'done';
  quest.completions = (quest.completions || 0) + 1;
  player.hp = maxHP();
  law.karma = Math.min(0, law.karma + 8);
  player.coins += 10;
  xp(80);
  closeDialog();
  toast('Misión completada · +80 EXP · 10 monedas · Karma +8 · Puedes repetirla');
  save();
}
function talk() {
  if (!started || !npcHere() || dist(player, npc) > 130) return;
  if (quest.state === 'new')
    showDialog(
      'MAX · EL REFUGIO',
      'Invasores entre los pinos',
      '<p>«Esas criaturas han tomado el claro. Ten cuidado: lanzan energía verde. Prueba las formas de tu Omnitrix y despeja la zona.»</p><p>Derrota a los <b>6 invasores del Refugio</b>, incluido el cabecilla, y vuelve conmigo. Los enemigos de otras zonas no cuentan.</p><p class="reward">80 EXP · 10 monedas · Curación completa · Recupera 8 de karma<br>Misión repetible al cobrar.</p>',
      [
        ['ACEPTAR MISIÓN', startMission],
        ['AHORA NO', closeDialog],
      ],
    );
  else if (quest.state === 'return')
    showDialog(
      'MAX · OBJETIVO COMPLETADO',
      'El camino vuelve a estar libre',
      '<p>«Buen trabajo. Si esas criaturas regresan, volveré a necesitarte. También puedes explorar la ciudad y sus nuevos distritos.»</p><p class="reward">+80 EXP · 10 monedas · Vida restaurada · Karma +8</p>',
      [['COBRAR RECOMPENSA', claimMission]],
    );
  else if (quest.state === 'active')
    showDialog(
      'MAX · EL REFUGIO',
      'Todavía quedan invasores',
      '<p>Has derrotado a <b>' +
        quest.kills +
        ' de 6</b>. Sigue hacia el este de este mismo refugio. Sus proyectiles verdes se pueden esquivar.</p>',
      [['VOLVER AL BOSQUE', closeDialog]],
    );
  else
    showDialog(
      'MAX · MISIÓN REPETIBLE',
      '¿Una nueva patrulla?',
      '<p>«Descansa un momento. Si quieres, podemos volver a patrullar el claro.»</p><p>Patrullas completadas: <b>' +
        (quest.completions || 1) +
        '</b>.</p><p class="reward">Otra ronda: 6 invasores · 80 EXP · 10 monedas · Karma +8</p>',
      [
        ['REPETIR MISIÓN', startMission],
        [
          'DESCANSAR',
          () => {
            player.hp = maxHP();
            closeDialog();
            save();
          },
        ],
      ],
    );
}
function guide() {
  let html = Object.entries(ALIENS)
    .filter(([id]) => (race === 'osmo' ? id === 'osmo' : id === skillId()))
    .map(
      ([id, a]) =>
        '<p><b>' +
        a.name.toUpperCase() +
        '</b> · ' +
        a.hp +
        ' vida · Maestría ' +
        Math.floor(player.masteries[id]) +
        '%</p><div class="skills">' +
        a.skills
          .map(
            (k, i) =>
              '<div><b>' +
              (i + 1) +
              ' · ' +
              k.name +
              '</b>M ' +
              k.unlock +
              ' · Recarga ' +
              k.cd +
              ' s<br><small>' +
              (id === 'diamond' && i === 1
                ? 'Escudo: 80 resistencia / 10 s'
                : id === 'diamond' && i === 2
                  ? '9 daño por pulso durante 5 s'
                  : id === 'heatblast' && i === 1
                    ? '3 proyectiles × 14 daño'
                    : id === 'fourarms' && i === 3
                      ? '3 golpes × 26 daño'
                      : id === 'xlr8' && i === 0
                        ? '3 golpes × 6 daño'
                        : id === 'xlr8' && i === 1
                          ? '6 pulsos × 8 daño'
                          : k.damage + ' daño base') +
              '</small></div>',
          )
          .join('') +
        '</div>',
    )
    .join('');
  showDialog(
    'OMNITRIX · GUÍA DE CAMPO',
    'OMNI · Guía de progresión',
    '<p>OMNI 0.9: concierto al norte de Bahía, batalla rítmica con RUN y skin de Cuatro Brazos al superar Difícil con Omnitrix. La skin no cambia el poder. Ten ofrece el primer capítulo: robot al sur del Barrio, 950 vida y recompensa del 90% de un nivel al volver. Una primera victoria y una repetición por raza. Regresa del Barrio a Bahía por la izquierda.</p><p>OMNI 0.7: Insecotide ralentiza 3 s, deja un charco de 6 pulsos, envenena 5 s y vuela 12 s. Sus extras son Batida sónica y Ráfaga pegajosa. Sir Aldric entrega una misión repetible de nivel 15: cuatro caballeros, 160 EXP y 10 monedas. Max también paga 10 monedas. Cada raza guarda su propio saldo. El salón está al norte de Fortaleza; Ten espera al norte del Barrio. Ajusta música, efectos y ambiente por separado en AUDIO.</p><p> SALTAR (ESPACIO) sirve en forma humana; como alien, ESPACIO esquiva. Q abre el Omnitrix. Fortaleza al norte del Refugio: caballeros de nivel recomendado 15. Barrio al sur de Bahía. Bestia detecta presencias con ecolocalización y amplía su alcance con Sentidos (8 s). El osmosiano acumula poder durante 60 s de fuego: alcanza 300 vida y +12% daño; al salir reinicia.</p><p>Multijugador: dos teléfonos en la misma Wi-Fi, IP y código de sala. Ambos conservan su nivel y raza; el anfitrión dirige las zonas. Fuego amigo activo sin EXP. El botín de enemigos va a quien da el último golpe y la misión de Max progresa para ambos.</p><p>ÁRBOL abre las seis habilidades de la forma actual. Las extras V/VI cuestan 3 puntos cada una; obtienes 1 por nivel. La regeneración recupera 0,35% de tu vida máxima por segundo tras 20 s sin daño. El jefe de las Ruinas tiene 650 vida, recompensa 120 EXP y reaparece a los 60 s de caer; sus ataques causan 9–10 de daño. El osmosiano tiene un 30% de obtener su ADN al vencerlo.</p><p>Usa ◀ / ▶ en humano para elegir alien. Puedes transformarte con <b>cualquier carga disponible</b>. Una batería llena dura <b>120 s</b> y se recarga en <b>40 s</b> en humano. Los ataques especiales gastan un % de batería (se muestra en cada botón); además requieren maestría y respetar el enfriamiento.</p><p>Maestría independiente: +1 cada 5 s transformado. Habilidades a 0 / 15 / 40 / 75. La vida conserva su porcentaje al cambiar. Humano: 100 vida. Nivel máximo 20, daño +3,5% por nivel, vida fija.</p>' +
      html +
      '<p>Los invasores lanzan energía verde cada 4 s. Max ofrece una patrulla repetible de seis enemigos: 80 EXP y +8 karma al cobrar. Los enemigos dan 10 EXP; el cabecilla 24.</p><p>Los civiles caminan y huyen del peligro. Herirlos baja tu karma y alerta a la policía. Los ataques enemigos no te culpan. Pierde de vista a los agentes o sal al bosque para reducir la búsqueda. El karma se guarda. Los civiles abatidos regresan después de 60 s en su zona.</p><p>Diamante tiene un botón extra DESLIZAR (tecla F), disponible desde maestría 0: 0,7 s de desplazamiento y 5 s de enfriamiento, sin coste de batería. No daña ni atraviesa obstáculos. XLR8 corre más rápido; después vienen humano, Diamante, Cuatro Brazos y Heatblast. Cambia tu apariencia en PERSONAJE, sin perder progreso.</p><p>MAPA muestra doce zonas, con la Fortaleza al norte del Refugio y el Barrio al sur de Bahía. Viaja por las señales de los extremos. Edificios y mobiliario tienen colisión; el salón y la habitación tienen interiores.</p>',
    [['ENTENDIDO', closeDialog]],
  );
}

// 0.15.5: grouped pause menu (play · watch & aliens · character · settings) with a status card
function gameVersion() {
  const m = (($('#menu .eyebrow') || {}).textContent || '').match(/(\d+\.\d+(?:\.\d+)?)/);
  return m ? m[1] : '';
}
function pauseMenu() {
  if (!started) return;
  const top = Object.entries(player.masteries || {})
      .filter(([id, v]) => ALIENS[id] && v > 0 && !isFusionId(id))
      .sort((p, q) => q[1] - p[1])
      .slice(0, 4),
    w = omniActive() ? getWatch() : null,
    eras = w && w.eras ? w.eras.map((e) => ERA_NAMES[e]).join(' + ') : '',
    mc = w && player.masterControl && w.masterControl;
  const groups = [
    ['JUGAR', [['CONTINUAR', closeDialog, 'main'], ['MISIONES', missionBoard], ['HISTORIA · ECOS DEL VACÍO', sagaMenu], ['HISTORIA 03 · CAZADOR', s3Menu], ['BOSS RUSH', bossRushMenu], ['EXTRAS · ARENA · RETOS · LOGROS', extrasMenu], ['MAPA', () => showWorldMap()], ['VIAJE RÁPIDO', () => travelMenu()], ['FAVORES', () => favoursMenu()], ['MINIJUEGOS / TRABAJOS', jobsMenu], ['MULTIJUGADOR · CROSSPLAY', lanMenu]]],
    ['RELOJ Y ALIENS', [['RELOJ / OMNITRIX', () => watchMenu()], ['MEJORAS DE ALIENS', () => upgradeMenu()], ['EQUIPOS DE ALIENS', () => loadoutMenu()], ['MEJORAS DEL RELOJ', () => watchUpgMenu()], ['LABORATORIO DE ADN', () => labMenu()], ['VARIANTES', () => variantMenu()], ['SKINS DE ALIENS', alienSkinMenu], ['ÁRBOL', skillTree], ['GUÍA / ATAQUES', guide]]],
    ['PERSONAJE', [['PERSONAJE / SKIN', skinMenu], ['RAZAS', raceMenu], ['MODO FOTO', photoMode], ['TÍTULOS', () => titlesMenu(pauseMenu)], ['PRESTIGIO', prestigeMenu], ['MASCOTA: ' + (F1().pet ? 'SÍ' : 'NO'), () => { F1().pet = !F1().pet; save(); pauseMenu(); }], ['RECOMPENSA DIARIA', dailyCalendar]]],
    [
      'AJUSTES',
      [
        ['MÚSICA', () => window.OmniMusic.open()],
        ['SONIDO: ' + (sound ? 'SÍ' : 'NO'), () => { sound = !sound; pauseMenu(); }],
        ['DÍA / NOCHE: ' + String(dayMode).toUpperCase(), () => { dayMode = dayMode === 'noche' ? 'día' : dayMode === 'día' ? 'ciclo' : 'noche'; pauseMenu(); }],
        ['DIFICULTAD: ' + diffCfg().name, () => difficultyMenu(pauseMenu)],
        ['INTERFAZ: ' + (UI_THEMES.find((x) => x[0] === uiTheme()) || UI_THEMES[0])[1], () => uiMenu(pauseMenu)],
        ['GRÁFICOS: ' + gfxLabel(), () => { gfxCycle(); pauseMenu(); }],
        ['DIAL: ' + (dialDocked() ? 'MINI' : 'PANTALLA COMPLETA'), () => { dialDockSet(!dialDocked()); pauseMenu(); }],
        ['MANDO', padHelp],
        ['TRANSFERIR PARTIDA', () => transferMenu(pauseMenu)],
        ['FALLOS DEL RELOJ: ' + (F3().glitch ? 'SÍ' : 'NO'), () => { F3().glitch = !F3().glitch; save(); pauseMenu(); }],
        ['NUEVA PARTIDA', newGameConfirm, 'danger'],
      ],
    ],
  ];
  const acts = [];
  const html =
    '<div class="pstat"><div><b>Nivel ' + player.level + '</b> / ' + LEVEL_CAP + ' · Daño ×' + multiplier().toFixed(2) + '<br><small>' + region().name + ' · ' + (race === 'omni' ? 'Omnitrix' : race === 'osmo' ? 'Osmosiano' : 'Anodita') + '</small></div>' +
    (w ? '<div><b>' + w.name + '</b><br><small>' + eras + (mc ? ' · ★ CONTROL MAESTRO' : '') + ' · ' + watchPlaylist(w).length + ' aliens</small></div>' : '') +
    '</div>' +
    (top.length ? '<div class="pmast">' + top.map(([id, v]) => '<span><i style="width:' + Math.floor(v) + '%"></i>' + ALIENS[id].name + ' ' + Math.floor(v) + '%</span>').join('') + '</div>' : '') +
    groups
      .map(([title, list]) => '<div class="pgroup"><h4>' + title + '</h4><div class="pbtns">' + list.map(([label, fn, cls]) => (acts.push(fn), '<button class="pbtn ' + (cls || '') + '" data-pact="' + (acts.length - 1) + '">' + label + '</button>')).join('') + '</div></div>')
      .join('');
  showDialog('PAUSA · VERSIÓN ' + gameVersion(), 'Partida guardada', html, []);
  $('#modal .dialog').classList.add('pausewide');
  for (const b of document.querySelectorAll('[data-pact]')) b.onclick = () => acts[+b.dataset.pact]();
  pauseTabs(); // part-44
  const first = document.querySelector('[data-pact="0"]');
  if (first) try { first.focus({ preventScroll: true }); } catch (e) {}
}
function newGameConfirm() {
  showDialog('NUEVA AVENTURA', '¿Empezar de nuevo?', '<p>Se borrarán el nivel, las maestrías y el progreso de esta raza.</p>', [
    ['CANCELAR', pauseMenu],
    [
      'BORRAR Y EMPEZAR',
      () => {
        profiles[race] = race === 'osmo' ? freshProfile() : { ...freshProfile(), player: cleanClone(playerTemplate) };
        applyProfile(profiles[race]);
        persistGame();
        closeDialog();
      },
    ],
  ]);
}
function defeat() {
  if (arenaOn()) arenaEnd('defeat'); // part-33
  bossRushEnd('defeat'); // part-45
  towerEnd('defeat'); // part-46
  if (race === 'osmo') {
    player.form = 'human';
    player.fireCharge = 0;
    refreshOsmo();
  }
  const arrested = law.timer > 0 && officers.some((o) => o.alive && dist(o, player) < 180);
  law.timer = 0;
  law.heat = 0;
  officers = [];
  player.leap = null;
  player.motion = null;
  player.alien = false;
  player.hp = 100;
  player.shield = 0;
  player.shieldTime = 0;
  if (net.role === 'guest') {
    player.x = region().minX + 80;
    player.y = region().exitY;
  } else {
    enterZone(1, 'center');
    player.x = 540;
    player.y = 627;
  }
  player.inv = 3;
  player.lock = 0;
  for (const e of enemies) {
    e.x = e.homeX;
    e.y = e.homeY;
    e.wind = 0;
    e.cd = 2;
  }
  burst(player.x, player.y - 40, 30, '#beff87');
  showDialog(
    arrested ? 'POLICÍA · DETENIDO' : 'MAX · REFUGIO',
    arrested ? 'La persecución terminó' : 'Todavía puedes intentarlo',
    '<p>Has recuperado la vida. Conservas experiencia, las cuatro maestrías, cofres y progreso de misión.</p>',
    [['VOLVER A INTENTAR', closeDialog]],
  );
  save();
}
function hitPlayer(amount) {
  if (
    (player.jump > 0.17 && player.jump < 0.57) ||
    player.inv > 0 ||
    (player.leap && player.leap.t > 0.2 && player.leap.t < 0.85)
  )
    return;
  if (player.downed) return;
  amount = amount * diffCfg().dmg; // difficulty (part-32)
  player.regenWait = 20;
  if (player.shield > 0 && player.alien) { // any alien's shield move (Diamante, kit 'shield' moves)
    const absorbed = Math.min(player.shield, amount);
    player.shield -= absorbed;
    amount -= absorbed;
    popup(player.x, player.y - 125, 'ESCUDO −' + absorbed, '#a4ffeb');
    burst(player.x, player.y - 40, 9, '#acffed');
    if (player.shield <= 0) {
      player.shieldTime = 0;
      toast('¡El escudo de diamante se rompió!');
      burst(player.x, player.y - 40, 35, '#d3fff6');
    }
    if (amount <= 0) {
      player.inv = 0.32;
      return;
    }
  }
  player.hp -= amount;
  player.hurtT = 0.3;
  player.inv = 0.65;
  shake = 0.17;
  popup(player.x, player.y - 110, '−' + amount, '#ff9c91');
  tone(75, 0.16, 'square', 0.025);
  if (player.hp <= 0 && !coopDown()) defeat();
}

function interact() {
  if (sagaInteract()) return; // Historia 02 (part-42)
  if (featInteract()) return; // Historia 03 (part-45)
  if (f3Interact()) return; // favours (part-47)
  if (talkExtra()) return;
  if (puzzleInteract()) return;
  if (missionInteract()) return;
  if (npcHere() && dist(player, npc) < 130) {
    talk();
    return;
  }
  const chest = region().chest;
  if (chest && dist(player, chest) < 100 && !opened.includes(region().id)) {
    opened.push(region().id);
    xp(15);
    player.hp = Math.min(maxHP(), player.hp + 30);
    burst(chest.x, chest.y - 20, 25, '#ffe8a0');
    toast('Cofre encontrado · +15 EXP · +30 vida');
    tone(960, 0.25);
    save();
  }
}
function drawScene(c, z, day) {
  if (REGIONS[z] && REGIONS[z].painted) return c.drawImage(paintedScene(REGIONS[z].painted, day), 0, 0, WW, WH + 140); // part-41
  let im = art.night,
    sx = 0,
    sy = 0,
    sw = im.width,
    sh = im.height;
  if (z === 1) {
    im = day ? art.day : art.night;
    sw = im.width;
    sh = im.height;
  } else if (z === 0 || z === 2) {
    im = art.regions;
    sw = Math.floor(im.width / 2);
    sh = Math.floor(im.height / 2);
    sx = day ? 0 : sw;
    sy = z === 0 ? 0 : sh;
  } else if (z === 3) {
    im = art.city;
    sw = im.width;
    sh = Math.floor(im.height / 2);
    sy = day ? 0 : sh;
  } else if (z === 12) {
    im = art.bellwood9;
    sw = im.width;
    sh = im.height;
  } else if (z >= 10) {
    im = art.places8;
    sw = Math.floor(im.width / 2);
    sh = Math.floor(im.height / 2);
    sx = day ? sw : 0;
    sy = z === 10 ? 0 : sh;
  } else if (z >= 8) {
    im = art.places7;
    sw = Math.floor(im.width / 2);
    sh = Math.floor(im.height / 2);
    sx = day ? sw : 0;
    sy = z === 8 ? 0 : sh;
  } else if (z >= 6) {
    im = art.places6;
    sw = Math.floor(im.width / 2);
    sh = Math.floor(im.height / 2);
    sx = day ? 0 : sw;
    sy = z === 6 ? 0 : sh;
  } else {
    im = art.districts;
    sw = Math.floor(im.width / 2);
    sh = Math.floor(im.height / 2);
    sx = day ? 0 : sw;
    sy = z === 4 ? 0 : sh;
  }
  c.drawImage(im, sx, sy, sw, sh, 0, 0, WW, WH);
  if (z >= 6) c.drawImage(im, sx, sy + Math.floor(sh * 0.9), sw, Math.floor(sh * 0.1), 0, WH, WW, 140);
}
function mapPaint(c, z, w, h, detail = false) {
  c.clearRect(0, 0, w, h);
  c.save();
  c.scale(w / WW, h / WH);
  drawScene(c, z, false);
  c.fillStyle = '#06122166';
  c.fillRect(0, 0, WW, WH);
  c.fillStyle = '#a1b3ba55';
  for (const b of REGIONS[z].colliders) c.fillRect(b.x, b.y, b.w, b.h);
  const dot = (x, y, color, size = 18) => {
    c.fillStyle = '#071019';
    c.fillRect(x - size - 5, y - size - 5, size * 2 + 10, size * 2 + 10);
    c.fillStyle = color;
    c.fillRect(x - size, y - size, size * 2, size * 2);
  };
  const r = REGIONS[z];
  if (r.links.left !== undefined) dot(r.minX + 15, r.exitY, '#8de5f3', 15);
  if (r.links.right !== undefined) dot(r.maxX - 15, r.exitY, '#8de5f3', 15);
  if (r.links.up !== undefined) dot(r.portalX, r.top + 10, '#8de5f3', 18);
  if (r.links.down !== undefined) dot(r.portalX, r.bottom - 10, '#8de5f3', 18);
  if (z === 1) dot(npc.x, npc.y, '#ffcf76', 18);
  if (z === 6) dot(questKnight.x, questKnight.y, '#ffcf76', 18);
  if (z === 9) dot(ten.x, ten.y, '#ffcf76', 18);
  if (z === 10) dot(kim.x, kim.y, '#ffcf76', 18);
  if (z === 12) dot(neko.x, neko.y, '#ffcf76', 18);
  if (z === 3) dot(1110, 560, '#8de5f3', 18);
  const chest = REGIONS[z].chest;
  if (chest && !opened.includes(REGIONS[z].id)) dot(chest.x, chest.y, '#f7e097', 14);
  for (const e of z === zone ? enemies : zoneStates[REGIONS[z].id] || [])
    if (e.alive) dot(e.x, e.y, '#ff878b', 10);
  if (z === zone) {
    for (const c of [...citizens, ...remoteTargets()]) if (c.alive) dot(c.x, c.y, '#8aeadb', 9);
    for (const o of officers) if (o.alive) dot(o.x, o.y, '#83baff', 12);
  }
  if (z === zone) dot(player.x, player.y, '#c9ff89', 22);
  c.restore();
}
function drawMiniMap() {
  mapPaint($('#minimap').getContext('2d'), zone, 110, 62);
  const c = $('#dialportrait').getContext('2d'),
    id = player.alien ? player.activeAlien : player.selected;
  c.clearRect(0, 0, 52, 52);
  if (race === 'osmo') return;
  // the watch decides how the alien is presented (silhouette / hologram / red / colour icon)
  const ws = getWatch();
  if (ws.iconStyle === 'os-silhouette') {
    c.fillStyle = '#86d79a';
    c.fillRect(0, 0, 52, 52);
  }
  drawWatchIcon(c, id, ws.iconStyle, 26, 26, 48, 1);
}

function showWorldMap(selected = zone) {
  showDialog(
    'ATLAS · ' + discovered.length + ' / ' + REGIONS.length + ' ZONAS VISITADAS',
    'Del pinar a Ciudad Bahía',
    '<div class="zonecards">' +
      REGIONS.map(
        (r, i) =>
          '<button class="zonecard ' +
          (i === selected ? 'active' : '') +
          '" data-zone="' +
          i +
          '"><canvas width="144" height="70"></canvas><b>' +
          (i + 1) +
          '. ' +
          r.name +
          '</b><small>' +
          (i === zone ? 'ESTÁS AQUÍ' : discovered.includes(r.id) ? 'EXPLORADO' : 'POR EXPLORAR') +
          '</small></button>',
      ).join('') +
      '</div><canvas id="areamap" width="690" height="180"></canvas><div class="map-legend"><span style="color:#c9ff89">■ Tú</span><span style="color:#ffcf76">■ NPC / cofres</span><span style="color:#ff878b">■ Enemigos</span><span style="color:#8de5f3">■ Salidas</span><span style="color:#8aeadb">■ Civiles</span><span style="color:#83baff">■ Policía</span><span>▧ Obstáculos</span></div><p>Toca una zona para verla. Para viajar, camina hasta las señales. Fortaleza: ↑ desde el Refugio. Barrio: ↓ desde Bahía. Salón: ↑ desde Fortaleza. Habitación de Ten: ↑ desde Barrio; vuelve a Bahía por la salida izquierda. Bellwood: ↑ en la parte derecha de Bahía. Concierto: ↑ por el centro de Bahía. Zona devastada: ↓ desde Barrio. El resto sigue conectado por los lados. ' +
      REGIONS[selected].subtitle +
      '.</p>',
    [['VOLVER AL JUEGO', closeDialog]],
  );
  $('.dialog').classList.add('map-dialog');
  document.querySelectorAll('[data-zone]').forEach((b) => {
    const i = +b.dataset.zone;
    mapPaint(b.querySelector('canvas').getContext('2d'), i, 144, 70);
    b.onclick = () => showWorldMap(i);
  });
  mapPaint($('#areamap').getContext('2d'), selected, 690, 180, true);
}
function resetInput() {
  keys = {};
  stick.x = 0;
  stick.y = 0;
  stick.id = null;
  held = -1;
  $('#stick').style.transform = '';
}
function floorBounds(x) {
  return {
    top: zone === 1 ? 510 + Math.max(0, 540 - x) * 0.1 + Math.max(0, x - 1150) * 0.035 : region().top,
    bottom: region().bottom,
  };
}
function isSolid(x, y, r = 13) {
  return region().colliders.some((b) => x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r) || puzzleSolid(x, y, r) || coopSolid(x, y, r); // + locked puzzle alcoves (part-26)
}
function lineClear(ax, ay, bx, by) {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 15));
  for (let i = 1; i <= n; i++)
    if (isSolid(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n, 2)) return false;
  return true;
}
function walkable(x, y) {
  const bounds = floorBounds(x);
  return { x: clamp(x, region().minX, region().maxX), y: clamp(y, bounds.top, bounds.bottom) };
}
function moveActor(o, dx, dy) {
  const prevActor = solidActor;
  solidActor = o;
  moveActorCore(o, dx, dy);
  solidActor = prevActor;
}
function moveActorCore(o, dx, dy) {
  if (o.slow > 0) {
    dx *= 0.6;
    dy *= 0.6;
  }
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 6));
  for (let i = 0; i < steps; i++) {
    let p = walkable(o.x + dx / steps, o.y);
    if (!isSolid(p.x, p.y)) o.x = p.x;
    p = walkable(o.x, o.y + dy / steps);
    if (!isSolid(p.x, p.y)) o.y = p.y;
  }
}

function ensureCitizens() {
  if (!isCity()) {
    citizens = [];
    return;
  }
  const id = region().id;
  citizens =
    civilStates[id] ||
    [540, 1120].map((x, i) => ({
      kind: 'civil',
      id: i,
      row: 6 + i,
      x,
      y: region().exitY + 25,
      homeX: x,
      homeY: region().exitY + 25,
      hp: 70,
      max: 70,
      alive: true,
      respawn: 0,
      face: i ? -1 : 1,
      anim: 0,
      moving: false,
      fear: 0,
      inv: 0,
      wait: i + 1,
      tx: x,
      ty: region().exitY + 25,
    }));
  civilStates[id] = citizens;
}
function crime(penalty = 5) {
  if (net.source === 'guest') {
    lanSend({ type: 'crime', penalty });
    law.heat = Math.min(100, law.heat + penalty * 2);
    law.timer = Math.max(law.timer, 40);
    return;
  }
  law.karma = Math.max(-100, law.karma - penalty);
  law.heat = Math.min(100, law.heat + penalty * 2);
  law.timer = Math.min(60, 35 + law.heat * 0.25);
  if (law.notice <= 0) {
    toast('Daño a ciudadanos · Karma ' + law.karma + ' · Policía alertada');
    law.notice = 3;
  }
  save();
}
function damageCitizen(c, damage, source) {
  if (!c.alive || c.inv > 0) return;
  c.hp -= Math.round(damage);
  c.inv = 0.22;
  c.fear = 6;
  c.wait = 0;
  popup(c.x, c.y - 112, '−' + Math.round(damage), '#ffb7bb');
  if (source === 'player') crime(5);
  if (c.hp <= 0) {
    c.alive = false;
    c.respawn = 60;
    if (source === 'player') crime(15);
    burst(c.x, c.y - 35, 12, '#87c7d2');
  }
  save();
}
function damageOfficer(o, damage) {
  if (!o.alive) return;
  o.hp -= Math.round(damage);
  o.hit = 0.2;
  popup(o.x, o.y - 110, '' + Math.round(damage), '#c7dcff');
  crime(2);
  if (o.hp <= 0) {
    o.alive = false;
    burst(o.x, o.y - 35, 14, '#9bb8e3');
  }
}
function updateCitizens(dt) {
  if (net.role === 'guest') return;
  for (const c of citizens) {
    c.inv = Math.max(0, c.inv - dt);
    c.fear = Math.max(0, c.fear - dt);
    c.moving = false;
    if (!c.alive) {
      c.respawn -= dt;
      if (c.respawn <= 0) {
        c.alive = true;
        c.hp = c.max;
        c.x = c.homeX;
        c.y = c.homeY;
        c.inv = 2;
      }
      continue;
    }
    c.wait -= dt;
    if (c.wait <= 0) {
      let threat = [...enemies.filter((e) => e.alive), ...(c.fear > 0 ? [player] : [])].sort(
        (a, b) => dist(a, c) - dist(b, c),
      )[0];
      let flee = threat && dist(c, threat) < 240;
      let d = threat ? Math.max(1, dist(c, threat)) : 1;
      let dest = walkable(
        c.x + (flee ? ((c.x - threat.x) / d) * 170 : (Math.random() - 0.5) * 260),
        c.y + (flee ? ((c.y - threat.y) / d) * 95 : (Math.random() - 0.5) * 100),
      );
      if (!isSolid(dest.x, dest.y)) {
        c.tx = dest.x;
        c.ty = dest.y;
      }
      c.wait = flee ? 0.7 : 2 + Math.random() * 2;
      if (flee) c.fear = Math.max(c.fear, 1);
    }
    const d = Math.hypot(c.tx - c.x, c.ty - c.y);
    if (d > 8) {
      let ox = c.x,
        oy = c.y,
        speed = c.fear > 0 ? 108 : 40;
      moveActor(c, ((c.tx - c.x) / d) * speed * dt, ((c.ty - c.y) / d) * speed * dt);
      c.moving = Math.hypot(c.x - ox, c.y - oy) > 0.1;
      if (Math.abs(c.tx - c.x) > 2) c.face = c.tx > c.x ? 1 : -1;
      c.anim += dt * (c.fear > 0 ? 10 : 5);
    }
  }
}
function updateLaw(dt) {
  if (net.role === 'guest') return;
  law.notice = Math.max(0, law.notice - dt);
  if (law.timer <= 0) return;
  const seen =
    isCity() &&
    officers.some((o) => o.alive && dist(o, player) < 330 && lineClear(o.x, o.y, player.x, player.y));
  if (!seen) law.timer = Math.max(0, law.timer - dt);
  if (law.timer <= 0) {
    officers = [];
    law.heat = 0;
    toast('Has perdido a la policía · El karma se conserva');
    save();
    return;
  }
  if (!isCity()) return;
  law.spawn -= dt;
  if (law.spawn <= 0 && officers.filter((o) => o.alive).length < 1 + wantedLevel()) {
    law.spawn = 3;
    let x = clamp(player.x + (player.x > 800 ? -450 : 450), region().minX + 35, region().maxX - 35),
      y = region().exitY;
    for (let i = 0; i < 20 && isSolid(x, y); i++) x = clamp(x - 25, 60, 1540);
    if (!isSolid(x, y))
      officers.push({
        id: 'police' + ++nextAttackId,
        kind: 'police',
        x,
        y,
        hp: 100,
        max: 100,
        alive: true,
        face: 1,
        anim: 0,
        moving: false,
        cd: 1,
        hit: 0,
      });
  }
  for (const o of officers) {
    if (!o.alive) continue;
    o.hit = Math.max(0, o.hit - dt);
    o.cd -= dt;
    let d = dist(o, player);
    o.face = player.x >= o.x ? 1 : -1;
    o.moving = d > 65;
    if (o.moving) {
      moveActor(
        o,
        ((player.x - o.x) / Math.max(1, d)) * 108 * dt,
        ((player.y - o.y) / Math.max(1, d)) * 108 * dt,
      );
      o.anim += dt * 8;
    }
    if (o.cd <= 0 && d < 330 && lineClear(o.x, o.y, player.x, player.y)) {
      o.cd = 2.8;
      const a = Math.atan2(player.y - o.y, player.x - o.x);
      hostileShots.push({
        type: 'stun',
        x: o.x,
        y: o.y - 35,
        dx: Math.cos(a) * 300,
        dy: Math.sin(a) * 300,
        t: 1.3,
        damage: 8,
        r: 8,
      });
    }
  }
}
function updateEnemies(dt) {
  if (net.role === 'guest') return;
  for (const e of enemies) {
    if (e.majorBoss || e.robotBoss) continue;
    if (e.knight) {
      updateKnight(e, dt);
      continue;
    }
    e.hit = Math.max(0, e.hit - dt);
    e.cast = Math.max(0, (e.cast || 0) - dt);
    e.stun = Math.max(0, (e.stun || 0) - dt);
    e.moving = false;
    if (!e.alive) {
      if (zone !== 1 || quest.state === 'done') {
        e.respawn -= dt;
        if (e.respawn <= 0) {
          e.alive = true;
          e.hp = e.max;
          e.x = e.homeX;
          e.y = e.homeY;
          e.cd = 2;
          e.rcd = 2;
        }
      }
      continue;
    }
    e.cd = Math.max(0, e.cd - dt);
    e.rcd = Math.max(0, e.rcd - dt);
    if (e.stun > 0) continue;
    let targets = [
      ...(zone !== 1 || player.x > 650 ? [player] : []),
      ...remoteTargets(),
      ...citizens.filter((c) => c.alive),
    ];
    targets.sort((a, b) => dist(e, a) - dist(e, b));
    let t = targets[0];
    if (!t) continue;
    let d = dist(e, t);
    e.face = t.x > e.x ? 1 : -1;
    if (e.wind > 0) {
      e.wind -= dt;
      if (e.wind <= 0 && d < 66 && lineClear(e.x, e.y, t.x, t.y)) {
        if (t.kind === 'civil') damageCitizen(t, e.boss ? 15 : 10, 'enemy');
        else hurtTeam(t, Math.round((e.boss ? 18 : 10) * nightDmg()));
      }
      if (paused) return;
      continue;
    }
    if (d < 420 && e.rcd <= 0 && lineClear(e.x, e.y, t.x, t.y)) {
      e.rcd = 4;
      e.cast = 0.4;
      let a = Math.atan2(t.y - e.y, t.x - e.x);
      hostileShots.push({
        type: 'green',
        x: e.x,
        y: e.y - 35,
        dx: Math.cos(a) * 230,
        dy: Math.sin(a) * 230,
        t: 2.2,
        damage: Math.round((e.boss ? 12 : 9) * nightDmg()),
        r: 8,
      });
    }
    if (d < 350) {
      if (d > 52) {
        let slow = effects.some((f) => f.type === 'field' && f.t > 0 && dist(e, f) < f.r) ? 0.55 : 1,
          speed = (e.boss ? 58 : 69) * slow * (e.mod === 'fast' ? 1.7 : 1) * nightSpeed();
        moveActor(e, ((t.x - e.x) / d) * speed * dt, ((t.y - e.y) / d) * speed * dt);
        e.anim += dt * 7;
        e.moving = true;
      } else if (e.cd <= 0 && lineClear(e.x, e.y, t.x, t.y)) {
        e.wind = 0.55;
        e.cd = e.boss ? 1.8 : 2.3;
      }
    }
  }
}

function update(dt) {
  clock += dt;
  gateLock = Math.max(0, gateLock - dt);
  transition = Math.max(0, transition - dt);
  player.inv = Math.max(0, player.inv - dt);
  player.attack = Math.max(0, player.attack - dt);
  player.lock = player.emptyLock = 0;
  player.slideCool = Math.max(0, player.slideCool - dt);
  dodgeTick(dt);
  for (const id of Object.keys(ALIENS))
    player.cooldowns[id] = player.cooldowns[id].map((v) => Math.max(0, v - dt * cooldownRate()));
  player.swapCool = Math.max(0, (player.swapCool || 0) - dt);
  player.cool = player.cooldowns[player.activeAlien];
  if (player.shield > 0) {
    player.shieldTime = Math.max(0, player.shieldTime - dt);
    if (player.shieldTime <= 0) player.shield = 0;
  }
  if (player.alien || (race === 'osmo' && player.form !== 'human')) {
    const id = player.activeAlien,
      prev = mastery();
    player.masteries[id] = Math.min(100, prev + dt * 0.2);
    if (ALIENS[id].fusion) fusionTick(id, dt);
    for (const s of currentSkills())
      if (prev < s.unlock && mastery() >= s.unlock) {
        toast('¡' + alien().name + ': ' + s.name + ' desbloqueado!');
        tone(900, 0.25);
      }
    player.battery = Math.max(0, player.battery - dt * drainRate());
    if (race !== 'osmo' && player.battery < 15 && !player.lowWarned && player.battery > 0) {
      player.lowWarned = true;
      playWatchSFX('low_power');
      toast('¡Energía baja!');
    }
    if (player.battery < 0.000001) revert(true);
  } else {
    const was = player.battery;
    player.battery = Math.min(100, player.battery + dt * rechargeRate());
    if (race !== 'osmo' && was < 100 && player.battery >= 100) playWatchSFX('recharged');
  }
  let vx = stick.x + (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0),
    vy = stick.y + (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
  let len = Math.hypot(vx, vy);
  if (len > 1) {
    vx /= len;
    vy /= len;
  }
  player.moving = len > 0.12 && !player.leap && !player.motion;
  puzzleTick(dt);
  missionTick(dt);
  coopTickMissions(dt); // co-op only missions (part-30)
  arenaTick(dt); // wave arena (part-33)
  sagaTick(dt); // Historia 02 (part-42)
  scanTick(dt); // codex scanning (part-43)
  featTick(dt); // batch 1 (part-45)
  f2Tick(dt); // batch 2 (part-46)
  f3Tick(dt); // batch 3 (part-47)
  eliteTick();
  sigTick(dt);
  anoditeTick(dt);
  travelTick(dt); // SHIFT / full joystick: the alien's fast way of moving (part-24)
  if (player.motion) {
    updateMotion(dt);
  } else if (player.leap) {
    const l = player.leap;
    l.t = Math.max(0, l.t - dt);
    const progress = 1 - l.t;
    moveActor(
      player,
      l.startX + (l.x - l.startX) * progress - player.x,
      l.startY + (l.y - l.startY) * progress - player.y,
    );
    player.attackFrame = 4;
    player.attack = 0.15;
    if (l.t <= 0) {
      areaHit(player.x, player.y, 145, l.damage, 0.6);
      effects.push({ type: 'slam', x: player.x, y: player.y, r: 145, t: 0.65, max: 0.65 });
      burst(player.x, player.y - 5, 25, '#d3bba0');
      shake = 0.25;
      player.leap = null;
      player.motion = null;
      player.attackFrame = 5;
      player.attack = 0.4;
    }
  } else if (player.moving) {
    player.anim += dt * 9;
    player.dx = vx;
    player.dy = vy;
    if (Math.abs(vx) > 0.05) player.face = vx > 0 ? 1 : -1;
    let speed = moveSpeed() * travelMult() * (effects.some((f) => f.type === 'tornado' && f.t > 0) ? 0.6 : 1);
    moveActor(player, vx * speed * dt, vy * speed * 0.75 * dt);
    if (checkGate(vx, vy)) return;
  } else player.anim = 0;
  if (held >= 0) attack(held);
  updateCitizens(dt);
  updateLaw(dt);
  const beforeZone = zone;
  updateEnemies(dt);
  if (zone !== beforeZone) return;
  if (net.role !== 'guest')
    for (let i = 0; i < enemies.length; i++)
      for (let j = i + 1; j < enemies.length; j++) {
        const a = enemies[i],
          b = enemies[j];
        if (!a.alive || !b.alive) continue;
        const d = dist(a, b);
        if (d > 0 && d < 38) {
          const push = (38 - d) * Math.min(0.5, dt * 4),
            dx = ((a.x - b.x) / d) * push,
            dy = ((a.y - b.y) / d) * push;
          moveActor(a, dx, dy);
          moveActor(b, -dx, -dy);
        }
      }
  for (const p of projectiles) {
    let nx = p.x + p.dx * dt,
      ny = p.y + p.dy * dt;
    p.t -= dt;
    if (!lineClear(p.x, p.y + 35, nx, ny + 35)) {
      p.t = 0;
      burst(p.x, p.y, 5, '#c6d7b2');
      continue;
    }
    p.x = nx;
    p.y = ny;
    for (const t of combatants())
      if (t.alive && Math.hypot(t.x - p.x, t.y - 36 - p.y) < 30 + p.r) {
        if (p.type === 'boulder') {
          areaHit(t.x, t.y, 85, p.damage, 0.4);
          effects.push({ type: 'slam', x: t.x, y: t.y, r: 85, t: 0.4, max: 0.4 });
        } else {
          damageTarget(t, p.damage);
          if (p.type === 'goo') applyStatus(t, 'slow', 3);
          if (p.slow) applyStatus(t, 'slow', p.slow);
          if (p.type === 'toxin') applyStatus(t, 'poison', 5, p.poisonDamage);
        }
        p.t = 0;
        break;
      }
    if (Math.random() < 0.25)
      burst(p.x, p.y, 1, p.type === 'kit' ? p.color : p.type === 'crystal' ? '#9dfadf' : p.type === 'boulder' ? '#c6b9a1' : '#ff9c3b');
  }
  for (const p of hostileShots) {
    let nx = p.x + p.dx * dt,
      ny = p.y + p.dy * dt;
    p.t -= dt;
    if (!lineClear(p.x, p.y + 35, nx, ny + 35)) {
      p.t = 0;
      continue;
    }
    p.x = nx;
    p.y = ny;
    for (const t of [...teamTargets(), ...(p.type === 'green' ? citizens.filter((c) => c.alive) : [])])
      if (Math.hypot(t.x - p.x, t.y - 35 - p.y) < 29 + p.r) {
        if (t.kind === 'civil') damageCitizen(t, p.damage, 'enemy');
        else hurtTeam(t, p.damage);
        if (p.slow && t === player) applyStatus(player, 'slow', 1.6); // the hunter's nets (part-45)
        p.t = 0;
        break;
      }
    if (zone !== beforeZone) return;
  }
  for (const fx of effects) {
    fx.t -= dt;
    if (fx.type === 'flurry' || fx.type === 'tornado') {
      fx.x = player.x;
      fx.y = player.y;
      fx.tick -= dt;
      const count = fx.type === 'flurry' ? 3 : 6;
      if (fx.tick <= 0 && fx.pulses < count) {
        fx.tick += fx.type === 'flurry' ? 0.09 : 0.32;
        fx.pulses++;
        if (fx.type === 'tornado') areaHit(fx.x, fx.y, fx.r, fx.damage, 0.1);
        else
          for (const t of combatants())
            if (t.alive && dist(player, t) < fx.r && lineClear(player.x, player.y, t.x, t.y)) {
              const a = Math.atan2(t.y - player.y, t.x - player.x);
              if (Math.abs(Math.atan2(Math.sin(a - fx.a), Math.cos(a - fx.a))) < 1.15)
                damageTarget(t, fx.damage, 0.05);
            }
      }
    }
    if ((fx.type === 'meteor' || fx.type === 'skycrystal') && !fx.hit && fx.t < 0.37) {
      fx.hit = true;
      shake = 0.32;
      burst(fx.x, fx.y - 30, 40, fx.type === 'skycrystal' ? '#b8ffed' : '#ffc24b');
      areaHit(fx.x, fx.y, fx.r, fx.damage);
      tone(fx.type === 'skycrystal' ? 180 : 70, 0.35, 'sawtooth');
    }
    if (fx.type === 'field' || fx.type === 'quake') {
      fx.tick -= dt;
      if (fx.tick <= 0 && (fx.type !== 'quake' || fx.pulses < 3)) {
        fx.tick += fx.type === 'quake' ? 0.5 : 0.75;
        fx.pulses = (fx.pulses || 0) + 1;
        areaHit(fx.x, fx.y, fx.r, fx.damage, fx.type === 'quake' ? 0.3 : 0);
        if (fx.type === 'quake') {
          shake = 0.12;
          burst(fx.x, fx.y, 12, '#dcccb0');
        }
      }
    }
  }
  for (const p of particles) {
    p.x += p.dx * dt;
    p.y += p.dy * dt;
    p.dy += 70 * dt;
    p.t -= dt;
  }
  for (const n of numbers) {
    n.y -= 25 * dt;
    n.t -= dt;
  }
  for (const ar of [particles, projectiles, hostileShots, numbers, effects])
    for (let i = ar.length - 1; i >= 0; i--) if (ar[i].t <= 0) ar.splice(i, 1);
  updateExpansion(dt);
  while (particles.length > 230) particles.shift();
  shake = Math.max(0, shake - dt);
  flash = Math.max(0, flash - dt);
  toastTime -= dt;
  if (toastTime <= 0) $('#toast').classList.remove('show');
  saveClock += dt;
  if (saveClock > 4) {
    saveClock = 0;
    save();
  }
  cam.x += (clamp(player.x - (W * 0.48) / sceneZoom(), 0, cameraMaxX()) - cam.x) * Math.min(1, dt * 5);
  cam.y += (clamp(player.y - (H * 0.61) / sceneZoom(), 0, cameraMaxY()) - cam.y) * Math.min(1, dt * 4);
  hud();
}
function hud() {
  const p = player,
    id = p.alien ? p.activeAlien : p.selected,
    def = ALIENS[id];
  $('#form').textContent = p.alien ? def.name.toUpperCase() : 'HUMANO';
  $('#level').textContent = 'NV. ' + p.level;
  $('#hpfill').style.width = clamp((p.hp / maxHP()) * 100, 0, 100) + '%';
  $('#hptext').textContent = Math.ceil(p.hp) + ' / ' + maxHP();
  $('#xpfill').style.width = (p.level === LEVEL_CAP ? 100 : (p.xp / xpNeed()) * 100) + '%';
  $('#xptext').textContent = p.level === LEVEL_CAP ? 'NIVEL MÁXIMO' : p.xp + ' / ' + xpNeed() + ' EXP';
  $('#batteryfill').style.width = p.battery + '%';
  $('#batterytext').textContent = Math.floor(p.battery) + '%';
  $('#batteryhint').textContent = p.alien
    ? 'Transformado · ' + Math.ceil(p.battery * 1.2) + ' s de energía'
    : p.battery < 100
      ? 'Carga completa en ' + Math.ceil((100 - p.battery) * 0.4) + ' s · Ya puedes usarla'
      : 'Listo para transformar';
  $('#masteryfill').style.width = mastery() + '%';
  $('#masterytext').textContent = Math.floor(mastery()) + '%';
  $('#masterylabel').textContent = 'MAESTRÍA ' + def.name.toUpperCase();
  $('#masteryfill').style.background = def.color;
  $('#transformlabel').textContent = p.alien ? 'VOLVER A HUMANO · Q' : race === 'anodite' ? 'FORMA ANODITA · Q' : 'OMNITRIX · Q';
  $('#transformhint').textContent = p.battery <= 0 ? 'RECARGANDO' : def.name.toUpperCase();
  $('#transform').classList.toggle('unavailable', !p.alien && p.battery <= 0);
  $('#dialname').textContent = def.name.toUpperCase();
  $('#dialmastery').textContent = 'MAESTRÍA ' + Math.floor(mastery()) + '%';
  $('#dialprev').disabled = p.alien;
  $('#dialnext').disabled = p.alien;
  const nearNpc = npcHere() && dist(player, npc) <= 130,
    nearChest = region().chest && !opened.includes(region().id) && dist(player, region().chest) < 100;
  $('#talk').classList.toggle('hidden', !nearNpc && !nearChest);
  $('#talk').textContent = nearNpc ? '◆ HABLAR' : '◆ ABRIR COFRE';
  document.querySelectorAll('.attack').forEach((b, i) => {
    const skill = def.skills[i],
      locked = (!p.alien && i !== 0) || (p.alien && mastery() < skill.unlock);
    b.classList.toggle('locked', locked);
    b.classList.toggle('cooldown', p.cool[i] > 0);
    b.classList.toggle('diamond', id === 'diamond');
    b.classList.toggle('fourarms', id === 'fourarms');
    b.classList.toggle('xlr8', id === 'xlr8');
    b.querySelector('span').textContent = i === 0 && !p.alien ? 'PUÑO' : skill.short;
    b.querySelector('small').textContent = locked
      ? 'M ' + skill.unlock
      : p.cool[i] > 0.1
        ? p.cool[i].toFixed(1) + ' s'
        : 'LISTO';
  });
  $('#questtext').textContent =
    quest.state === 'new'
      ? 'Habla con Max'
      : quest.state === 'active'
        ? 'Invasores del refugio · ' + quest.kills + ' / 6'
        : quest.state === 'return'
          ? 'Regresa con Max'
          : 'Patrullas completadas · ' + (quest.completions || 1);
  $('#questsub').textContent =
    zone !== 1
      ? 'Max está en el Refugio · Ver mapa'
      : quest.state === 'active'
        ? 'Invasores al este →'
        : quest.state === 'done'
          ? 'Habla con Max para repetir'
          : quest.state === 'return'
            ? '← Cobra tu recompensa'
            : 'Acércate a Max ◆';
  $('#clock').textContent = region().name.toUpperCase();
  $('#shieldstatus').classList.toggle('hidden', p.shield <= 0);
  $('#shieldstatus').textContent =
    'ESCUDO ' + Math.ceil(p.shield) + ' / 80 · ' + Math.ceil(p.shieldTime) + ' s';
  $('#slide').classList.toggle('hidden', !p.alien || p.activeAlien !== 'diamond');
  $('#slide').classList.toggle('cooldown', p.slideCool > 0);
  $('#slide small').textContent = p.slideCool > 0 ? p.slideCool.toFixed(1) + ' s' : 'LISTO · F';
  $('#lawstatus').textContent =
    'KARMA ' +
    law.karma +
    ' · ' +
    (wantedLevel()
      ? '★'.repeat(wantedLevel()) + ' BÚSQUEDA · ' + Math.ceil(law.timer) + ' s fuera de vista'
      : 'SIN BÚSQUEDA');
  $('#lawstatus').classList.toggle('wanted', wantedLevel() > 0);
  drawMiniMap();
  hudExpansion();
  hudV8();
  hudV9();
  hudMissions();
  sagaHud(); // part-42
  f1Hud(); // part-45
  f2Hud(); // part-46
  f3Hud(); // part-47
  anoditeHud();
}
function spriteInfo(row) {
  if (row >= 2000 && SHEET_ROWS[row]) return SHEET_ROWS[row]; // imported alien sheets (part-22)
  if (row >= 100) return aliasSpriteInfo(row);
  if (row === 29) return { table: OMNI_V9_FRAMES.neko, sheet: art.neko9 };
  if (row === 26) return { table: OMNI_V8_FRAMES.fourconcert, sheet: art.fourconcert8 };
  if (row === 27) return { table: OMNI_V8_FRAMES.kim, sheet: art.kim8 };
  if (row === 28) return { table: OMNI_V8_FRAMES.robot, sheet: art.robot8 };
  if (row === 21)
    return {
      table: OMNI_V7_FRAMES.insect,
      sheet: art.insect7,
      anchors: OMNI_V7_FRAMES.anchors.insect,
      base: 220,
    };
  if (row === 22 || row === 23) return { table: OMNI_V7_FRAMES.npcs[row - 22], sheet: art.npcs7 };
  if (row === 24)
    return { table: OMNI_V7_FRAMES.osmo, sheet: art.osmo7, anchors: OMNI_V7_FRAMES.anchors.osmo, base: 320 };
  if (row === 25)
    return {
      table: OMNI_V7_FRAMES.combat,
      sheet: art.combat7,
      anchors: OMNI_V7_FRAMES.anchors.combat,
      base: 270,
    };
  if (row >= 30 && row <= 32 && window.OMNI_PRIME) return primeInfo(row - 30);
  if (row === 16) return { table: window.OMNI_V6_FRAMES.bestia, sheet: art.bestia6 };
  if (row === 17 || row === 18)
    return { table: window.OMNI_V6_FRAMES.knights[row - 17], sheet: art.knights6 };
  if (row === 19) return { table: window.OMNI_V6_FRAMES.full, sheet: art.full6 };
  if (row === 20) return { table: window.OMNI_V6_FRAMES.jump, sheet: art.jump6 };
  if (row === 13) return { table: window.OMNI_V5_FRAMES.boss, sheet: art.boss };
  if (row === 14 || row === 15) return { table: window.OMNI_V5_FRAMES.osmo[row - 14], sheet: art.osmo };
  if (row === 9 || row === 10) return { table: window.OMNI_V6_FRAMES.skins[row - 9], sheet: art.skins6 };
  if (row === 11) return { table: window.OMNI_V4_FRAMES.xlr8, sheet: art.speed };
  if (row === 12) return { table: window.OMNI_V4_FRAMES.slide, sheet: art.slide };
  if (row === 5) return { table: window.OMNI_V3_FRAMES.four, sheet: art.four };
  if (row === 2 || row >= 6)
    return { table: window.OMNI_V3_FRAMES.actors[row === 2 ? 0 : row - 5], sheet: art.actors };
  if (row === 3 || row === 4) return { table: newFrames[row - 3], sheet: art.expansion };
  return { table: frames[row], sheet: art.characters };
}
function sprite(row, frame, x, y, height, face = 1, alpha = 1) {
  const { table, sheet, anchors, base } = spriteInfo(row),
    f = table[frame] || table[0],
    anchor = anchors?.[frame],
    scale = height / (base || (row === 20 ? table[1][3] : row === 12 ? table[3][3] : table[0][3])),
    dw = f[2] * scale,
    dh = f[3] * scale;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(face * (row === 16 && [0, 1, 2, 8, 10, 11].includes(frame) ? -1 : 1), 1);
  ctx.globalAlpha = alpha;
  ctx.drawImage(
    sheet,
    ...f,
    Math.round(anchor ? (f[0] - anchor[0]) * scale : -dw * 0.5),
    Math.round(anchor ? (f[1] - anchor[1]) * scale : -dh),
    Math.round(dw),
    Math.round(dh),
  );
  ctx.restore();
}

function txt(text, x, y, size = 11, color = '#fff', align = 'center') {
  ctx.font = 'bold ' + size + 'px Arial';
  ctx.textAlign = align;
  ctx.fillStyle = '#080c19';
  ctx.fillText(text, Math.round(x + 1), Math.round(y + 2));
  ctx.fillStyle = color;
  ctx.fillText(text, Math.round(x), Math.round(y));
}

function crystal(x, y, w, h, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#63cdaa';
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.lineTo(w / 2, -h * 0.13);
  ctx.lineTo(w * 0.3, h * 0.3);
  ctx.lineTo(0, h / 2);
  ctx.lineTo(-w * 0.4, h * 0.2);
  ctx.lineTo(-w / 2, -h * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#193d3c';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#c5ffed';
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.lineTo(w / 2, -h * 0.13);
  ctx.lineTo(0, h / 2);
  ctx.lineTo(-w * 0.1, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#f3fff8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.4);
  ctx.lineTo(-w * 0.3, -h * 0.07);
  ctx.stroke();
  ctx.restore();
}
function drawGate(x, to, left) {
  const y = region().exitY;
  ctx.fillStyle = '#0a111c88';
  ctx.fillRect(x - 40, y - 5, 80, 8);
  ctx.fillStyle = '#594b3c';
  ctx.fillRect(x - 3, y - 67, 6, 67);
  ctx.fillStyle = '#233e3e';
  ctx.fillRect(x - 42, y - 82, 84, 27);
  ctx.strokeStyle = '#abc5aa';
  ctx.strokeRect(x - 42, y - 82, 84, 27);
  txt((left ? '← ' : '') + to + (left ? '' : ' →'), x, y - 64, 8, '#dbf0c8');
  ctx.fillStyle = '#9adbbe';
  ctx.globalAlpha = 0.4 + Math.sin(clock * 3) * 0.15;
  ctx.fillRect(x - 20, y + 5, 40, 3);
  ctx.globalAlpha = 1;
}
function draw() {
  if (window.OmniRhythm?.active || window.OmniCooking?.active) return;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#080e1d';
  ctx.fillRect(0, 0, W, H);
  if (!ready) return;
  ctx.save();
  let cx = started ? cam.x : 140,
    cy = started ? cam.y : 205;
  const zoom = started ? sceneZoom() : 1;
  ctx.scale(zoom, zoom);
  ctx.translate(
    -Math.round(cx) + (shake ? Math.random() * 6 - 3 : 0),
    -Math.round(cy) + (shake ? Math.random() * 4 - 2 : 0),
  );
  let daylight = dayMode === 'día' ? 1 : dayMode === 'ciclo' ? (1 - Math.cos((clock / 90) * Math.PI)) / 2 : 0;
  drawScene(ctx, zone, lowGfx() && daylight >= 0.5); // low graphics: one background pass (part-43)
  if (daylight > 0 && !lowGfx()) {
    ctx.globalAlpha = daylight;
    drawScene(ctx, zone, true);
    ctx.globalAlpha = 1;
  }
  if (zone < 3)
    for (let i = 0; i < 22; i++) {
      let x = 180 + ((i * 137) % 1250) + Math.sin(clock * 0.4 + i) * 20,
        y = 455 + ((i * 97) % 280) + Math.cos(clock * 0.6 + i) * 8;
      ctx.globalAlpha = 0.3 + Math.sin(clock * 2 + i) * 0.2;
      ctx.fillStyle = '#b8e8a4';
      ctx.fillRect(x, y, 2, 2);
    }
  ctx.globalAlpha = 1;
  if (started) {
    const labels = [
        'RUINAS',
        'REFUGIO',
        'RIBERA',
        'BAHÍA',
        'MERCADO',
        'MUELLES',
        'FORTALEZA',
        'BARRIO',
        'SALÓN',
        'TEN',
        'CONCIERTO',
        'DEVASTACIÓN',
        'BELLWOOD',
        'CENTRAL',
        'VACÍO',
      ],
      l = region().links;
    if (l.left !== undefined) drawGate(region().minX + 35, labels[l.left], true);
    if (l.right !== undefined) drawGate(region().maxX - 35, labels[l.right], false);
    drawVerticalGates();
    drawBellwoodGate();
    const ch = region().chest;
    if (ch) {
      ctx.fillStyle = '#12252b88';
      ctx.fillRect(ch.x - 22, ch.y - 3, 44, 7);
      ctx.fillStyle = opened.includes(region().id) ? '#5d635b' : '#735a30';
      ctx.fillRect(ch.x - 21, ch.y - 25, 42, 24);
      ctx.fillStyle = opened.includes(region().id) ? '#23383c' : '#d4ba70';
      ctx.fillRect(ch.x - 21, ch.y - 25, 42, 6);
      ctx.fillStyle = '#ead98b';
      ctx.fillRect(ch.x - 3, ch.y - 20, 6, 8);
      if (!opened.includes(region().id)) txt('◆', ch.x, ch.y - 38 + Math.sin(clock * 3) * 3, 14, '#ffdf91');
    }
    drawPuzzles(); // alien puzzles (part-26)
    drawTerminal(); // mission board (part-27)
    drawSig(); // signature move effects (part-28)
    drawCoopSites(); // co-op mission plates / gate (part-30)
    for (const e of enemies) if (e.elite && e.alive) { ctx.save(); ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 3; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(clock * 6); ctx.beginPath(); ctx.ellipse(e.x, e.y - 2, 48, 15, 0, 0, 7); ctx.stroke(); ctx.restore(); txt('DRON DE ÉLITE', e.x, e.y - 175, 10, '#ff8a8a'); }
  }
  for (const fx of effects) {
    if (['meteor', 'skycrystal', 'field'].includes(fx.type)) {
      ctx.strokeStyle = fx.type === 'meteor' ? '#ff914b' : '#99f3d4';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 7]);
      ctx.beginPath();
      ctx.ellipse(fx.x, fx.y, fx.r, fx.r * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      if (fx.type === 'field') {
        ctx.fillStyle = '#75e5bc22';
        ctx.fill();
        for (let i = 0; i < 12; i++) {
          let a = i * 2.399,
            rr = 30 + (i % 4) * 24;
          crystal(
            fx.x + Math.cos(a) * rr,
            fx.y + Math.sin(a) * rr * 0.4 - 15,
            13 + (i % 3) * 4,
            28 + (i % 3) * 11,
            Math.cos(a) * 0.3,
          );
        }
      }
    }
  }
  drawExpansion();
  drawV6Effects();
  drawV7Effects();
  drawV8Effects();
  drawNetworkEffects();
  sagaDraw(); // part-42
  featDraw(); // part-45
  f3Draw(); // part-47
  const actors = (
    started
      ? [
          ...(npcHere() ? [{ kind: 'npc', y: npc.y }] : []),
          ...(extraNPC() ? [{ kind: 'questnpc', y: extraNPC().y, e: extraNPC() }] : []),
          ...[...enemies, ...citizens, ...officers, ...remoteTargets()]
            .filter((e) => e.alive)
            .map((e) => ({ kind: e.kind || 'enemy', y: e.y, e })),
          { kind: 'player', y: player.y },
        ]
      : []
  ).sort((a, b) => a.y - b.y);
  for (const a of actors) {
    let o = a.kind === 'npc' ? npc : a.kind === 'player' ? player : a.e;
    ctx.fillStyle = '#01051180';
    ctx.beginPath();
    ctx.ellipse(o.x, o.y - 2, a.kind === 'player' && player.alien ? 28 : 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    if (a.kind === 'npc') {
      sprite(
        3,
        dist(player, npc) < 130 && Math.floor(clock) % 5 === 0 ? 3 : 0,
        o.x,
        o.y,
        103,
        player.x >= npc.x ? 1 : -1,
      );
      txt('MAX', o.x, o.y - 115, 10, '#dcdfc8');
      txt(quest.state === 'new' ? '◆' : quest.state === 'return' ? '!' : '·', o.x, o.y - 132, 18, '#e3d99a');
    } else if (a.kind === 'questnpc') {
      sprite(o.row, dist(player, o) < 140 ? 3 : 0, o.x, o.y, 110, o.face);
      txt(o.name, o.x, o.y - 122, 10, '#ffe0a0');
      txt(
        o === neko
          ? 'COCINA · +10 MONEDAS'
          : o === kim
            ? '♪ BATALLA DE BAILE'
            : o === ten
              ? 'HISTORIA · CAPÍTULO 1'
              : player.knightQuest.state === 'return'
                ? '!'
                : '◆ NV. 15',
        o.x,
        o.y - 139,
        9,
        '#e7d997',
      );
    } else if (a.kind === 'robot') {
      drawRobot(a.e);
    } else if (a.kind === 'boss') {
      const e = a.e,
        f = e.cast > 0 ? e.frame : e.moving ? 1 + (Math.floor(e.anim) % 2) : 0;
      sprite(13, f, e.x, e.y, 155, e.face, e.hit > 0 ? 0.5 : 1);
      txt('JEFE ÍGNEO · NV. 10', e.x, e.y - 171, 10, '#ffbd84');
      ctx.fillStyle = '#281720';
      ctx.fillRect(e.x - 50, e.y - 163, 100, 6);
      ctx.fillStyle = '#ff9c60';
      ctx.fillRect(e.x - 50, e.y - 163, 100 * Math.max(0, e.hp / e.max), 6);
    } else if (a.kind === 'remote') {
      drawRemote(a.e);
    } else if (a.kind === 'player' && race === 'osmo') {
      drawOsmo(
        player.attack > 0 ? 3 : player.moving ? 1 + (Math.floor(player.anim) % 2) : 0,
        o.x,
        o.y - jumpHeight(),
        player.face,
      );
    } else if (a.kind === 'player') {
      let f =
          player.attack > 0
            ? player.alien && ['fourarms', 'xlr8', 'bestia'].includes(player.activeAlien)
              ? player.attackFrame
              : 3
            : player.moving
              ? (Math.floor(player.anim) % 2) + 1
              : 0,
        bob = player.moving ? Math.sin(player.anim * Math.PI) * 1.5 : Math.sin(clock * 2) * 0.6;
      if (player.alien) {
        ctx.fillStyle =
          player.activeAlien === 'diamond'
            ? '#7affe01a'
            : player.activeAlien === 'xlr8'
              ? '#62dfff22'
              : '#ff842017';
        ctx.beginPath();
        ctx.ellipse(o.x, o.y - 3, 51, 17, 0, 0, Math.PI * 2);
        ctx.fill();
        if (alien().fusion) fusionParticles(o);
        if (!paused && player.activeAlien === 'heatblast' && Math.random() < 0.2)
          particles.push({
            x: o.x + (Math.random() - 0.5) * 22,
            y: o.y - 100,
            dx: 0,
            dy: -30,
            t: 0.5,
            color: '#ffca59',
            size: 2,
          });
      }
      let row = player.alien ? alien().row : SKINS[player.skin].row;
      if (player.jump > 0 && !player.alien) {
        if (player.skin === 0) {
          row = 20;
          f = player.jump > 0.65 ? 0 : player.jump > 0.35 ? 1 : player.jump > 0.1 ? 2 : 3;
        } else f = player.jump > 0.1 ? 4 : 5;
      }
      if (player.motion && player.motion.type === 'slide') {
        row = 12;
        const t = player.motion.max - player.motion.t;
        f = t < 0.12 ? 0 : player.motion.t < 0.12 ? 3 : 1 + (Math.floor(t * 12) % 2);
      }
      let pose = combatPose(player, row, f);
      const pr = primePose(); // 0.17: reaching for the watch while the dial is open (part-40)
      if (pr) pose = pr;
      if (ultOn()) {
        ctx.save();
        ctx.globalAlpha = 0.28 + 0.14 * Math.sin(clock * 8);
        ctx.fillStyle = getWatch().color;
        ctx.beginPath();
        ctx.ellipse(o.x, o.y - 62, 48 * ultScale(), 72 * ultScale(), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.filter = (!lowGfx() && variantFilter()) || 'none'; // mastery colour variants (part-47)
      sprite(
        pose.row,
        pose.f,
        o.x,
        o.y +
          bob -
          pose.lift -
          jumpHeight() -
          travelLift() -
          (player.leap ? Math.sin((1 - player.leap.t) * Math.PI) * 140 : 0),
        (player.alien ? alienHeight(player.activeAlien) : 98) * ultScale(),
        player.face,
        player.downed ? 0.5 : player.travel ? travelAlpha() : player.inv > 0 && Math.floor(clock * 12) % 2 === 0 ? 0.45 : 1,
      );
      ctx.filter = 'none';
      if (player.downed) drawDowned(player, player.downed);
      if (player.shield > 0) {
        ctx.save();
        ctx.translate(o.x, o.y - 55);
        ctx.fillStyle = '#8ae9cf22';
        ctx.strokeStyle = player.shield < 25 ? '#f7ffdd' : '#b6ffe7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          let a = (Math.PI / 3) * i - Math.PI / 2,
            x = Math.cos(a) * 51,
            y = Math.sin(a) * 66;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (player.shield < 40) {
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-25, -30);
          ctx.lineTo(-8, -10);
          ctx.lineTo(-17, 0);
          ctx.lineTo(2, 25);
          ctx.stroke();
        }
        ctx.restore();
      }
    } else if (a.kind === 'civil' || a.kind === 'police') {
      const e = a.e,
        f = e.fear > 0 ? 3 : e.moving ? (Math.floor(e.anim) % 2) + 1 : 0;
      sprite(a.kind === 'police' ? 8 : e.row, f, e.x, e.y, 108, e.face, e.hit > 0 || e.inv > 0 ? 0.65 : 1);
      txt(
        a.kind === 'police' ? 'POLICÍA' : 'CIVIL',
        e.x,
        e.y - 120,
        8,
        a.kind === 'police' ? '#a3caff' : '#a6e2db',
      );
      if (e.hp < e.max) {
        ctx.fillStyle = '#14212b';
        ctx.fillRect(e.x - 22, e.y - 115, 44, 4);
        ctx.fillStyle = a.kind === 'police' ? '#7faaf2' : '#8bccb1';
        ctx.fillRect(e.x - 22, e.y - 115, 44 * Math.max(0, e.hp / e.max), 4);
      }
    } else {
      const e = a.e;
      let f = e.wind > 0 || e.cast > 0 ? 3 : e.moving ? (Math.floor(e.anim) % 2) + 1 : 0;
      if (featDrawEnemy(e, f) || f2DrawEnemy(e)) { scanDrawMark(e); continue; }
      if (e.sagaKind) { sagaDrawEnemy(e, f); scanDrawMark(e); continue; }
      scanDrawMark(e);
      sprite(
        e.knight === 'melee' ? 17 : e.knight === 'ranged' ? 18 : 2,
        f,
        e.x,
        e.y,
        e.knight ? 119 : e.boss ? 113 : 98,
        e.face,
        e.hit > 0 ? 0.5 : 1,
      );
      let barY = e.y - (e.knight ? 134 : e.boss ? 126 : 111);
      if (e.knight) txt('CABALLERO · NV. 15', e.x, barY - 7, 8, '#b8beec');
      ctx.fillStyle = '#101522';
      ctx.fillRect(e.x - 24, barY, 48, 5);
      ctx.fillStyle = e.boss ? '#e7b070' : '#b07c9a';
      ctx.fillRect(e.x - 24, barY, 48 * Math.max(0, e.hp / e.max), 5);
      if (e.boss) txt('CABECILLA', e.x, barY - 6, 8, '#ffcc96');
      if (e.wind > 0) {
        ctx.strokeStyle = '#ff786d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, 43, 16, 0, 0, Math.PI * 2);
        ctx.stroke();
        txt('!', e.x, e.y - 127, 18, '#ffaaa0');
      }
    }
  }
  for (const p of hostileShots) {
    ctx.fillStyle = p.type === 'green' ? '#46a744' : p.type === 'bossfire' ? '#ff742a' : p.type === 'void' ? '#7a3fd0' : '#427dd6';
    ctx.fillRect(p.x - 11, p.y - 8, 22, 16);
    ctx.fillStyle = p.type === 'green' ? '#b5ff74' : p.type === 'bossfire' ? '#ffe396' : p.type === 'void' ? '#e7d4ff' : '#c4eeff';
    ctx.fillRect(p.x - 6, p.y - 4, 12, 8);
  }
  for (const p of projectiles) {
    if (p.type === 'goo' || p.type === 'toxin') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.dy, p.dx));
      ctx.fillStyle = p.type === 'toxin' ? '#9972d6' : '#508b24';
      ctx.fillRect(-16, -8, 29, 16);
      ctx.fillStyle = '#bbfa61';
      ctx.fillRect(-9, -5, 19, 10);
      ctx.fillStyle = '#efff9f';
      ctx.fillRect(1, -3, 6, 4);
      ctx.fillStyle = '#7dc634';
      ctx.fillRect(-25, -4, 6, 6);
      ctx.restore();
    } else if (p.type === 'wood' || p.type === 'electric') {
      ctx.fillStyle = p.type === 'wood' ? '#c08c51' : '#a3f6ff';
      ctx.fillRect(p.x - 17, p.y - 4, 34, 8);
      ctx.fillRect(p.x - 7, p.y - 9, 14, 18);
    } else if (p.type === 'boulder') {
      ctx.fillStyle = '#68655e';
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        let a = (i * Math.PI * 2) / 7 + clock * 3;
        i
          ? ctx.lineTo(p.x + Math.cos(a) * 25, p.y + Math.sin(a) * 22)
          : ctx.moveTo(p.x + Math.cos(a) * 25, p.y + Math.sin(a) * 22);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#b0a78c';
      ctx.fillRect(p.x - 12, p.y - 12, 20, 9);
    } else if (p.type === 'kit') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.dy, p.dx));
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.45;
      ctx.fillRect(-26, -5, 22, 10);
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(0, -p.r - 2);
      ctx.lineTo(-12, 0);
      ctx.lineTo(0, p.r + 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(-4, -3, 12, 6);
      ctx.restore();
    } else if (p.type === 'crystal') crystal(p.x, p.y, 12, 30, Math.atan2(p.dy, p.dx) + Math.PI / 2);
    else {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.dy, p.dx));
      ctx.fillStyle = '#ee6028';
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(6, -9);
      ctx.lineTo(-8, -11);
      ctx.lineTo(-24 - Math.sin(clock * 27) * 7, -5);
      ctx.lineTo(-17, 0);
      ctx.lineTo(-29, 7);
      ctx.lineTo(-5, 10);
      ctx.lineTo(7, 7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffca58';
      ctx.fillRect(-9, -6, 16, 12);
      ctx.fillStyle = '#fff3b1';
      ctx.fillRect(0, -3, 8, 6);
      ctx.restore();
    }
  }
  for (const fx of effects) {
    let progress = 1 - fx.t / fx.max;
    ctx.globalAlpha = Math.min(1, fx.t * 4);
    if (fx.type === 'tornado') {
      ctx.strokeStyle = '#a1edff';
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(
          fx.x,
          fx.y - 15 - i * 17,
          60 - i * 6,
          10,
          Math.sin(clock * 13 + i) * 0.12,
          clock * 10 + i,
          clock * 10 + i + Math.PI * 1.6,
        );
        ctx.stroke();
      }
    }
    if (fx.type === 'flurry') {
      ctx.strokeStyle = '#d4faff';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const x = fx.x + Math.cos(fx.a) * (35 + progress * 55),
          y = fx.y - 38 + i * 7;
        ctx.beginPath();
        ctx.moveTo(x - player.face * 20, y);
        ctx.lineTo(x + player.face * 14, y);
        ctx.stroke();
      }
    }
    if (fx.type === 'speedtrail') {
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(fx.x - Math.cos(fx.a) * 35, fx.y - Math.sin(fx.a) * 20);
      ctx.lineTo(fx.x, fx.y);
      ctx.stroke();
    }
    if (fx.type === 'sonic') {
      ctx.strokeStyle = '#e6eeee';
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, Math.max(1, fx.r * progress - i * 22), fx.a - 0.9, fx.a + 0.9);
        ctx.stroke();
      }
    }
    if (fx.type === 'slam' || fx.type === 'quake') {
      ctx.strokeStyle = '#dac6a2';
      ctx.lineWidth = 4;
      ctx.beginPath();
      let r = fx.r * (fx.type === 'quake' ? (progress * 3) % 1 : progress);
      ctx.ellipse(fx.x, fx.y, r, r * 0.38, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        let a = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(fx.x + Math.cos(a) * 30, fx.y + Math.sin(a) * 15);
        ctx.lineTo(fx.x + Math.cos(a + 0.1) * r * 0.7, fx.y + Math.sin(a + 0.1) * r * 0.3);
        ctx.lineTo(fx.x + Math.cos(a) * r, fx.y + Math.sin(a) * r * 0.4);
        ctx.stroke();
      }
    }
    if (fx.type === 'ring') {
      ctx.strokeStyle = '#ffd570';
      ctx.lineWidth = 9 * (1 - progress) + 2;
      ctx.beginPath();
      ctx.ellipse(fx.x, fx.y, fx.r * progress, fx.r * progress * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (fx.type === 'punch') {
      ctx.strokeStyle = '#e7deb7';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, fx.r * progress, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (fx.type === 'meteor' || fx.type === 'skycrystal') {
      let drop = clamp(progress / 0.65, 0, 1),
        y = fx.y - 330 * (1 - drop) - 45;
      if (fx.type === 'skycrystal') crystal(fx.x, y, 65, 130, 0);
      else {
        ctx.fillStyle = '#f97824';
        ctx.fillRect(fx.x - 17, y - 10, 34, 48);
        ctx.fillStyle = '#ffe084';
        ctx.fillRect(fx.x - 10, y, 20, 31);
      }
      if (fx.hit) {
        ctx.strokeStyle = fx.type === 'skycrystal' ? '#c8ffed' : '#ffda8b';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.ellipse(fx.x, fx.y, fx.r * (1 - fx.t / 0.5), fx.r * 0.4 * (1 - fx.t / 0.5), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  for (const p of particles) {
    ctx.globalAlpha = Math.min(1, p.t * 3);
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  }
  ctx.globalAlpha = 1;
  for (const n of numbers) {
    ctx.globalAlpha = Math.min(1, n.t * 3);
    txt(n.text, n.x, n.y, 15, n.color);
  }
  ctx.globalAlpha = 1;
  if (!started) {
    sprite(race === 'osmo' ? 14 : SKINS[player.skin].row, Math.floor(clock * 2) % 2, 765, 660, 158, 1);
    sprite(4, 0, 1010, 675, 205, -1);
  }
  drawSensory();
  ctx.restore();
  weatherDraw(); // part-47
  if (flash > 0) {
    ctx.fillStyle = 'rgba(178,255,122,' + flash * 0.8 + ')';
    ctx.fillRect(0, 0, W, H);
  }
  if (transition > 0) {
    ctx.fillStyle = 'rgba(4,10,20,' + Math.min(0.75, transition) + ')';
    ctx.fillRect(0, 0, W, H);
    txt(region().name, W / 2, H / 2, 24, '#d7eec5');
  }
}
function loop(now) {
  const dt = Math.min(0.04, (now - last) / 1000 || 0);
  last = now;
  if (ready) {
    window.OmniSound?.ambient(
      started && !paused && !net.remoteAway && !net.waiting && !document.hidden,
      sound,
      zone,
      dayMode,
    );
    netUpdate(dt);
    watchTick(dt);
    if (started && !paused) coopTick(dt);
    if (started && !paused && !net.remoteAway && !net.waiting) update(dt * timeScale() * featSlow());
    else if (!started) clock += dt;
    if (drawThisFrame()) draw(); // low graphics: 30 fps drawing (part-43)
  }
  requestAnimationFrame(loop);
}
function resize() {
  // 0.15.5: on screens wider than 16:9 (landscape phones) the HUD area grows to the screen edges; the world view stays
  // 960x540 in the middle, so the controls sit beside the action instead of on top of it
  const gw = Math.round(Math.min(1280, Math.max(W, (H * innerWidth) / Math.max(1, innerHeight)))),
    scale = Math.min(innerWidth / gw, innerHeight / H),
    g = $('#game');
  g.style.width = gw + 'px';
  g.style.setProperty('--gx', (gw - W) / 2 + 'px');
  g.classList.toggle('wide', gw > W);
  g.style.transform = 'translate(-50%,-50%) scale(' + scale + ')';
}
function point(e) {
  const r = $('#joystick').getBoundingClientRect(),
    scale = r.width / 154;
  let x = (e.clientX - r.left) / scale - 77,
    y = (e.clientY - r.top) / scale - 77,
    len = Math.hypot(x, y);
  if (len > 50) {
    x *= 50 / len;
    y *= 50 / len;
  }
  stick.x = x / 50;
  stick.y = y / 50;
  $('#stick').style.transform = 'translate(' + x + 'px,' + y + 'px)';
}
$('#joystick').addEventListener('pointerdown', (e) => {
  if (paused) return;
  e.preventDefault();
  stick.id = e.pointerId;
  e.currentTarget.setPointerCapture(e.pointerId);
  point(e);
});
$('#joystick').addEventListener('pointermove', (e) => {
  if (e.pointerId === stick.id) point(e);
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'])
  $('#joystick').addEventListener(ev, (e) => {
    if (e.pointerId === stick.id) {
      stick.id = null;
      stick.x = stick.y = 0;
      $('#stick').style.transform = '';
    }
  });
document.querySelectorAll('[data-skill]').forEach((b) => {
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    held = +b.dataset.skill;
    attack(held);
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'])
    b.addEventListener(ev, () => (held = -1));
});
$('#jobsbtn').onclick = jobsMenu;
$('#alienskins').onclick = alienSkinMenu;
$('#jump').onclick = jump;
$('#lanbtn').onclick = lanMenu;
$('#racebtn').onclick = raceMenu;
$('#treebtn').onclick = skillTree;
$('#moreattacks').onclick = () => {
  attackPage = 1 - attackPage;
  held = -1;
  hud();
};
$('#musicbtn').onclick = () => window.OmniMusic.open();
$('#skins').onclick = skinMenu;
$('#slide').onclick = slide;
$('#transform').onclick = transform;
$('#talk').onclick = interact;
$('#dialprev').onclick = () => selectAlien(-1);
$('#dialnext').onclick = () => selectAlien(1);
$('#mapbtn').onclick = () => showWorldMap();
$('#pause').onclick = pauseMenu;
$('#mission').onclick = () => {
  if (activeMission()) {
    missionBoard();
    return;
  }
  if (zone === 12) {
    if (dist(player, neko) <= 145) nekoTalk();
    else toast('Acércate a Maid Neko');
    return;
  }
  if (zone === 9 || zone === 11) {
    storyTalk();
    return;
  }
  if (zone === 10) {
    if (dist(player, kim) <= 145) danceMenu();
    else toast('Acércate a Kim Taehyung en el centro del concierto');
    return;
  }
  if (zone === 6 || zone === 8) {
    knightTalk();
    return;
  }
  if (npcHere() && dist(player, npc) <= 130) talk();
  else
    showDialog(
      'DIARIO · SOMBRAS ENTRE LOS PINOS',
      'Un camino seguro',
      '<p>' +
        $('#questtext').textContent +
        '.</p><p>' +
        (quest.state === 'active'
          ? 'Encuentra a los seis invasores en la parte derecha del Refugio de Max. Los enemigos de otras zonas no cuentan para esta misión. Al derrotar a los seis, vuelve al guardabosques, en la izquierda.'
          : quest.state === 'done'
            ? 'Habla con Max para repetir la misión. Cada alien tiene maestría independiente.'
            : 'Max está en la zona Refugio, cerca del inicio. Usa el MAPA para orientarte. Acércate a él y pulsa HABLAR.') +
        '</p>',
      [['CONTINUAR', closeDialog]],
    );
};
$('#play').onclick = () => {
  if (!ready) return;
  started = true;
  paused = false;
  $('#menu').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  cam.x = clamp(player.x - (W * 0.48) / sceneZoom(), 0, cameraMaxX());
  cam.y = clamp(player.y - (H * 0.64) / sceneZoom(), 0, cameraMaxY());
  tone(460, 0.12);
  hud();
  if (migrated) toast('Partida actualizada · Nivel y maestría conservados');
  else if (quest.state === 'new') toast('Habla con Max · Usa el dial para elegir tu alien');
  save();
};
document.addEventListener('keydown', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) e.preventDefault();
  if (!e.repeat && started && watchKey(e, k)) return;
  if (sel) return;
  keys[k] = true;
  if (e.repeat) return;
  if (k === 'Escape') {
    dialogOpen ? closeDialog() : pauseMenu();
  }
  if (k === 'q' || k === 't') omnitrixAction();
  if (k === 'f') slide();
  if (k === 'k' || k === 'Tab') { e.preventDefault(); skillTree(); }
  if (k === 'v') {
    attackPage = 1 - attackPage;
    hud();
  }
  if (k === 'e') interact();
  if (k === 'm') showWorldMap();
  if (k === ' ') jumpOrDodge();
  if (k === 'j') {
    held = 0;
    attack(0);
  }
  if ('123456'.includes(k) && k.length === 1) {
    held = +k - 1;
    attack(held);
  }
});
document.addEventListener('keyup', (e) => {
  keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false;
  if ('123456jJ'.includes(e.key) && e.key.length === 1) held = -1;
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    save();
    resetInput();
    if (started && !paused) pauseMenu();
  }
});
window.addEventListener('blur', resetInput);
window.addEventListener('pagehide', save);
window.addEventListener('resize', resize);
window.pauseFromAndroid = () => {
  if (window.OmniCooking?.active) {
    OmniCooking.pause();
    save();
    return;
  }
  if (window.OmniRhythm?.active) {
    OmniRhythm.pause();
    save();
    return;
  }
  net.away = true;
  if (net.peer) netUpdate(0.2);
  save();
  resetInput();
  if (started && !paused) pauseMenu();
};
window.backFromAndroid = () => {
  if (window.OmniCooking?.active) {
    OmniCooking.pause();
    return;
  }
  if (window.OmniRhythm?.active) {
    OmniRhythm.pause();
    return;
  }
  if (dialogOpen) closeDialog();
  else pauseMenu();
};
async function boot() {
  try {
    await Promise.all(
      [
        ['bellwood9', 'assets/bellwood-v9.webp'],
        ['neko9', 'assets/neko-v9.webp'],
        ['food9', 'assets/food-v9.webp'],
        ['characters', 'assets/characters.webp'],
        ['night', 'assets/forest-night.webp'],
        ['day', 'assets/forest-day.webp'],
        ['expansion', 'assets/expansion-characters.webp'],
        ['regions', 'assets/forest-regions.webp'],
        ['city', 'assets/city.webp'],
        ['actors', 'assets/actors-v3.webp'],
        ['four', 'assets/four-arms.webp'],
        ['districts', 'assets/city-districts.webp'],
        ['skins', 'assets/skins-v4.webp'],
        ['speed', 'assets/speed-alien-v4.webp'],
        ['slide', 'assets/diamond-slide-v4.webp'],
        ['walk', 'assets/walk-v5.webp'],
        ['boss', 'assets/boss-v5.webp'],
        ['osmo', 'assets/osmo-v5.webp'],
        ['skins6', 'assets/skins-v6.webp'],
        ['prime', 'assets/prime.webp'],
        ['bestia6', 'assets/bestia-v6.webp'],
        ['knights6', 'assets/knights-v6.webp'],
        ['full6', 'assets/full-fire-v6.webp'],
        ['places6', 'assets/places-v6.webp'],
        ['jump6', 'assets/jump-v6.webp'],
        ['insect7', 'assets/insect-v7.webp'],
        ['osmo7', 'assets/osmo-v7.webp'],
        ['combat7', 'assets/combat-v7.webp'],
        ['places7', 'assets/places-v7.webp'],
        ['npcs7', 'assets/npcs-v7.webp'],
        ['fourconcert8', 'assets/fourconcert-v8.webp'],
        ['kim8', 'assets/kim-v8.webp'],
        ['robot8', 'assets/robot-v8.webp'],
        ['places8', 'assets/places-v8.webp'],
      ].map(
        ([name, url]) =>
          new Promise((resolve, reject) => {
            let im = new Image();
            im.onload = () => {
              art[name] = im;
              resolve();
            };
            im.onerror = () => {
              reject(new Error(url));
            };
            im.src = url;
          }),
      ),
    );
    ready = true;
    load();
    initProgress();
    ensureBoss();
    ensureRobot();
    try {
      const raw = localStorage.getItem('omni-skin'),
        skin = Number(raw);
      if (raw !== null && SKINS[skin]) player.skin = skin;
    } catch (e) {}
    $('#loading').textContent = 'Listo · Tu aventura se guarda automáticamente';
    draw();
  } catch (e) {
    $('#loading').textContent = 'No se pudo cargar el bosque. Cierra y vuelve a abrir el juego.';
  }
}
// Test hooks exist only with an explicit local QA query; the APK does not enable them.
if (location.search.includes('qa=1') || location.hash === '#qa')
  window.__game = {
    get W() { return {
 ensureFusion, fusionPreview, ALIENS, ROW_ALIAS, WATCHES, WATCH_ORDER, ALIEN_DB, ULTIMATES, FUSIONS, SFX, get sel() { return sel; }, get fx() { return fx; }, getWatch, equipWatch, watchUnlocked, watchPlaylist, openSelector, selMove, selConfirm, selCancel, watchKey, watchSpecial, playWatchSFX, watchMenu, scanDNA, watchSanitize, checkWatchUnlocks, ultOn, ultForm, drainRate, rechargeRate, cooldownRate, skillCostMult, skillCost, quickSwapCfg, selectAlien, watchSwap, maxHP, multiplier, setFree: (v) => (watchFree = v), load, persistGame, applyProfile, profileSnapshot, seqBusy, timeScale };
    },
    neko,
    nekoTalk,
    nekoStory,
    jobsMenu,
    travelToJob,
    startCooking,
    kitchenProgress,
    initV9,
    initV8,
    hasMusicSkin,
    selectAlienSkin,
    alienSkinMenu,
    musicalAttack,
    kim,
    danceMenu,
    startDance,
    danceReward,
    startStory,
    claimStory,
    storyTalk,
    ensureRobot,
    defeatRobot,
    robotQuestKill,
    updateRobot,
    robotCast,
    beginKnightQuest,
    claimKnightQuest,
    knightKill,
    knightTalk,
    talkExtra,
    insectAttack,
    applyStatus,
    updateStatus,
    updateV7,
    combatPose,
    castFrame,
    hud,
    questKnight,
    ten,
    setDayMode: (v) => (dayMode = v),
    jump,
    jumpHeight,
    updateV6,
    bestiaAttack,
    updateKnight,
    net,
    lanMenu,
    lanReceive,
    lanSend,
    netUpdate,
    worldPacket,
    avatarPacket,
    damageTarget,
    combatants,
    draw,
    drawScene,
    get citizens() {
      return citizens;
    },
    get officers() {
      return officers;
    },
    get hostileShots() {
      return hostileShots;
    },
    get law() {
      return law;
    },
    damageCitizen,
    damageOfficer,
    updateEnemies,
    updateLaw,
    ensureCitizens,
    startMission,
    claimMission,
    get player() {
      return player;
    },
    get quest() {
      return quest;
    },
    get enemies() {
      return enemies;
    },
    get zone() {
      return zone;
    },
    get zoneStates() {
      return zoneStates;
    },
    get opened() {
      return opened;
    },
    get discovered() {
      return discovered;
    },
    get gateLock() {
      return gateLock;
    },
    get race() {
      return race;
    },
    get profiles() {
      return profiles;
    },
    get bossTimer() {
      return bossTimer;
    },
    chooseRace,
    profileSnapshot,
    skillTree,
    buySkill,
    refundSkills,
    unlockAbsorption,
    absorb,
    materials,
    ensureBoss,
    bossReward,
    updateBoss,
    updateExpansion,
    initProgress,
    persistGame,
    sprite,
    SKINS,
    SPEEDS,
    moveSpeed,
    skinMenu,
    selectSkin,
    slide,
    REGIONS,
    ALIENS,
    update,
    transform,
    revert,
    attack,
    damageEnemy,
    xp,
    talk,
    interact,
    closeDialog,
    spawnEnemies,
    save,
    guide,
    enterZone,
    selectAlien,
    isSolid,
    lineClear,
    moveActor,
    checkGate,
    showWorldMap,
    hitPlayer,
    get projectiles() {
      return projectiles;
    },
    get effects() {
      return effects;
    },
    setStarted: () => {
      started = true;
      paused = false;
    },
    setQuest: (s) => (quest = { state: s, kills: 0 }),
    setPaused: (p) => (paused = p),
    setKeys: (k) => (keys = k),
    maxHP,
    xpNeed,
    multiplier,
    mastery,
    get paused() {
      return paused;
    },
  };
window.omniMusicBridge = { openDialog: showDialog, closeDialog, isPaused: () => paused || !started };
// ---- Copia de seguridad (código de texto) ----
function backupCode() {
  const o = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('omni')) o[k] = localStorage.getItem(k);
    }
  } catch (e) {}
  return btoa(unescape(encodeURIComponent(JSON.stringify({ omni: 1, t: Date.now(), d: o }))));
}
function restoreCode(code) {
  let p;
  try {
    p = JSON.parse(decodeURIComponent(escape(atob(String(code).replace(/\s+/g, '')))));
  } catch (e) {
    return 'Código no válido';
  }
  if (!p || p.omni !== 1 || !p.d || typeof p.d !== 'object' || typeof p.d[STORE] !== 'string')
    return 'Código no válido';
  let st;
  try {
    st = JSON.parse(p.d[STORE]);
  } catch (e) {
    return 'Código dañado';
  }
  if (!st || typeof st !== 'object' || ![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(st.version))
    return 'Código dañado';
  for (const [k, v] of Object.entries(p.d))
    if (!k.startsWith('omni') || typeof v !== 'string') return 'Código no válido';
  window.__omniImporting = true;
  try {
    for (const [k, v] of Object.entries(p.d)) localStorage.setItem(k, v);
  } catch (e) {
    window.__omniImporting = false;
    return 'No se pudo guardar';
  }
  return '';
}
function backupMenu() {
  let code = backupCode();
  showDialog(
    'COPIA DE SEGURIDAD',
    'Guarda o recupera tu progreso',
    '<p>Copia este código y guárdalo en un lugar seguro (notas, mensajes). Si reinstalas el juego, pégalo abajo para recuperar tu partida.</p><textarea id="bkout" readonly rows="3" style="width:100%;font-size:9px;background:#071923;color:#e7ffe7;border:1px solid #749286;user-select:text;touch-action:auto"></textarea><p>Restaurar desde un código:</p><textarea id="bkin" rows="2" placeholder="Pega aquí tu código" style="width:100%;font-size:9px;background:#071923;color:#e7ffe7;border:1px solid #749286;user-select:text;touch-action:auto"></textarea><p id="bkmsg" style="min-height:14px"></p>',
    [
      ['VOLVER', closeDialog],
      ['ENVIAR A OTRO DISPOSITIVO', () => transferMenu(backupMenu)],
      [
        'COPIAR',
        () => {
          const t = $('#bkout');
          t.value = code;
          t.focus();
          t.select();
          let ok = false;
          try {
            ok = document.execCommand('copy');
          } catch (e) {}
          if (!ok && navigator.clipboard)
            navigator.clipboard.writeText(code).then(
              () => {
                $('#bkmsg').textContent = 'Código copiado';
              },
              () => {},
            );
          $('#bkmsg').textContent = ok ? 'Código copiado' : 'Selecciona el texto y cópialo manualmente';
        },
      ],
      [
        'RESTAURAR',
        () => {
          const v = $('#bkin').value.trim();
          if (!v) {
            $('#bkmsg').textContent = 'Pega primero un código';
            return;
          }
          const err = restoreCode(v);
          if (err) {
            $('#bkmsg').textContent = err;
            return;
          }
          $('#bkmsg').textContent = 'Partida restaurada · Reiniciando…';
          setTimeout(() => location.reload(), 600);
        },
      ],
    ],
  );
  $('#bkout').value = code;
}
if ($('#backupbtn')) $('#backupbtn').onclick = backupMenu;

// ---- Consejos de los primeros minutos (una sola vez) ----
const hintsSeen = (() => {
  try {
    return JSON.parse(localStorage.getItem('omni-hints') || '{}');
  } catch (e) {
    return {};
  }
})();
function hintOnce(id, text) {
  if (hintsSeen[id]) return;
  hintsSeen[id] = 1;
  try {
    localStorage.setItem('omni-hints', JSON.stringify(hintsSeen));
  } catch (e) {}
  toast(text);
}
let hintTimer = 0,
  hintWasAlien = false;
setInterval(() => {
  if (!started || paused || dialogOpen || window.__omniImporting) return;
  hintTimer++;
  if (hintTimer === 2) hintOnce('move', 'Mueve con la palanca · Acércate a Max y pulsa ◆ HABLAR');
  if (race !== 'osmo' && player.alien && !hintWasAlien) {
    hintOnce(
      'alien',
      'Transformado: J o clic ataca · 1–4 poderes · ESPACIO esquiva · Q vuelve a humano',
    );
  }
  hintWasAlien = !!player.alien;
  if (race !== 'osmo' && player.alien && player.battery < 30)
    hintOnce('lowbat', 'Batería baja · Vuelve a humano para recargar antes de que se agote');
  if (player.level >= 2)
    hintOnce('lvl2', 'Subiste de nivel · Cada alien gana maestría usándolo y desbloquea ataques nuevos');
  if (player.hp / maxHP() < 0.3)
    hintOnce('lowhp', 'Vida baja · Esquiva con SALTAR · La vida se regenera si no te golpean');
}, 1000);

// ---- Diseños del Omnitrix (cosmético: color + forma del dial) ----
// alien eras (used by the watch playlists in part-35 and the HUD)
const ERA_NAMES = { os: 'Clásicos', af: 'Alien Force', ua: 'Ultimate Alien', ov: 'Omniverse' };
const ERA_SHORT = { os: 'Clásicos', af: 'Alien Force', ua: 'Ultimate', ov: 'Omniverse' };
// ============================================================================================
// OMNI WATCH SYSTEM · part 1/3: REGISTRIES (data + small hooks, no gameplay code)
//
// RULE: aliens and watches are SEPARATE systems.
//   ALIENS.<id>  (heatblast, diamond, ...) owns: gameplay sprite, abilities, stats, movement, mastery, alien audio.
//   WATCHES.<id> owns: selection UI, icon style, open/activate animation, watch SFX, playlist,
//                      timeout/recharge behaviour and special functionality.
// An alien exists ONCE. There is no "ultimatrixHeatblast". Which watch can hold an alien is the alien's
// `watches` list (null = every watch); a watch only decides how that alien is *presented* and *used*.
//
// CANON LABELS (never present game inventions as canon):
//   canon.design    'show' = name/look inspired by the TV series | 'game' = invented for OMNI | 'unverified' = placeholder
//   canon.mechanics 'show' | 'game' (all mechanics numbers in this file are game-original balance choices) | 'planned'
//
// HOW TO ADD A WATCH LATER (Nemetrix, Antitrix, ...): registerWatch({...}) below (copy a ready one, or use
// `extends:'ultimatrix'` for a variant like Albedo). Add a SFX profile in SFX if it needs its own sounds,
// a selector layout in SELECTORS (part-16) only if none of ring/strip/slider/wheel fits, and fill `hooks`
// only for genuinely new behaviour. Set status:'ready' when it works. See WATCHES.md.
// ============================================================================================
const WATCH_GATING = true; // true => a watch must be unlocked (player.watchUnlocks); false => every ready watch free
const WATCHES = {};
const WATCH_ORDER = [];
const WATCH_SKINS = {}; // future: alternate-universe faceplates/devices (palette + icon style overrides)
const HOLDERS = {}; // future: alternate wearers (Ben 23, Gwen 10 ...) – sprites/dialogue, NOT watch logic
const FUSIONS = {}; // Biomnitrix: { id:{ a, b, result, canon } }
const ULTIMATES = {}; // Ultimatrix forms: ULTIMATES[baseAlienId]
const PREDATORS = {}; // Nemetrix roster (separate from ALIENS)
const REBOOT_LAYERS = {}; // Reboot: alternate equipment states of a BASE alien (Omni-Enhanced, Omni-Kix, Omni-Naut)
const DEFAULT_WATCH_TIMING = { drainPerSec: 100 / 120, rechargePerSec: 100 / 40, skillCostMult: 1, cooldownRate: 1 };

// Animation state names (spec). The selector state machine uses these strings; sequences live on each watch.
const WATCH_STATES = {
  os: ['OS_IDLE', 'OS_BUTTON_PRESS', 'OS_DIAL_RAISE', 'OS_DISPLAY', 'OS_ROTATE', 'OS_SELECTED', 'OS_SLAM', 'OS_FLASH', 'OS_TRANSFORM'],
  af: ['AF_IDLE', 'AF_ACTIVATE', 'AF_CORE_RISE', 'AF_HOLOGRAM_IN', 'AF_SCROLL', 'AF_SELECTED', 'AF_CONFIRM', 'AF_FLASH', 'AF_TRANSFORM'],
  ua: ['UA_IDLE', 'UA_ACTIVATE', 'UA_UNFOLD', 'UA_SELECT', 'UA_CONFIRM', 'UA_FLASH', 'UA_TRANSFORM'],
  ultimate: ['ULTIMATE_TRIGGER', 'ULTIMATE_MECHANICAL', 'ULTIMATE_CHARGE', 'ULTIMATE_FLASH', 'ULTIMATE_SPAWN', 'ULTIMATE_REVERT'],
  ov: ['OV_CLOSED', 'OV_ACTIVATE', 'OV_OPEN', 'OV_WHEEL', 'OV_CONFIRM', 'OV_INPUT', 'OV_FLASH', 'OV_TRANSFORM'],
};

function registerWatch(def) {
  const base = def.extends ? WATCHES[def.extends] : null; // variants (Albedo) reuse a whole profile and override fields
  const d = {
    status: 'ready', // 'ready' | 'planned'
    canon: { design: 'show', mechanics: 'game' },
    unlock: { level: 1 },
    timing: {},
    selector: { type: 'strip' },
    iconStyle: 'ov-icon',
    anim: { open: 'slide', activate: 'flash' },
    fx: 'os', // transformation effect profile (TRANSFORM_FX in part-16)
    sfxProfile: def.id,
    twoStep: false, // true: first confirm the alien, then press the core to transform
    hooks: {},
    specials: [],
    playlist: (api) => api.candidates(),
    ...(base || {}),
    ...def,
  };
  d.timing = { ...DEFAULT_WATCH_TIMING, ...((base && base.timing) || {}), ...(def.timing || {}) };
  d.hooks = { ...((base && base.hooks) || {}), ...(def.hooks || {}) };
  WATCHES[d.id] = d;
  if (!WATCH_ORDER.includes(d.id)) WATCH_ORDER.push(d.id);
  return d;
}
function registerHolder(def) {
  HOLDERS[def.id] = { status: 'planned', canon: 'unverified', ...def };
}
function registerFusion(def) {
  FUSIONS[def.id] = { status: 'planned', canon: 'show', ...def };
}
function registerUltimate(def) {
  ULTIMATES[def.base] = { status: 'ready', canon: 'game', watches: null, ...def };
}

// ============================ ALIEN DATABASE (metadata; gameplay data stays in ALIENS) ============================
// origin = series where it debuted. watches = which watches may hold it (null = all). Both are independent.
// wave 1 = playable now; 2-4 = planned implementation waves; implemented:false aliens can't be selected yet.
const ORIGIN_NAMES = { os: 'Clásico', af: 'Alien Force', ua: 'Ultimate Alien', ov: 'Omniverse', antitrix: 'Antitrix' };
const ALIEN_DB = {};
(function () {
  // [id, display name, origin, wave]
  const planned = (origin, wave, list) => list.forEach(([id, name]) => (ALIEN_DB[id] = { id, name, origin, wave, implemented: false, species: null, watches: null }));
  planned('os', 2, [['greymatter', 'Grey Matter'], ['ripjaws', 'Ripjaws'], ['upgrade', 'Upgrade'], ['ghostfreak', 'Ghostfreak'], ['cannonbolt', 'Cannonbolt'], ['wildvine', 'Wildvine']]);
  planned('os', 0, [['blitzwolfer', 'Blitzwolfer'], ['snareoh', 'Snare-oh'], ['frankenstrike', 'Frankenstrike'], ['upchuck', 'Upchuck'], ['ditto', 'Ditto'], ['eyeguy', 'Eye Guy'], ['waybig', 'Way Big'], ['arctiguana', 'Arctiguana'], ['buzzshock', 'Buzzshock'], ['spitter', 'Spitter']]);
  planned('af', 3, [['swampfire', 'Swampfire'], ['bigchill', 'Big Chill'], ['humungousaur', 'Humungousaur'], ['echoecho', 'Echo Echo'], ['goop', 'Goop'], ['rath', 'Rath']]);
  planned('af', 0, [['jetray', 'Jetray'], ['chromastone', 'Chromastone'], ['brainstorm', 'Brainstorm'], ['spidermonkey', 'Spidermonkey'], ['alienx', 'Alien X'], ['lodestar', 'Lodestar'], ['nanomech', 'Nanomech']]);
  planned('ua', 0, [['waterhazard', 'Water Hazard'], ['ampfibian', 'AmpFibian'], ['armodrillo', 'Armodrillo'], ['terraspin', 'Terraspin'], ['nrg', 'NRG'], ['fasttrack', 'Fasttrack'], ['chamalien', 'ChamAlien'], ['clockwork', 'Clockwork'], ['eatle', 'Eatle'], ['juryrigg', 'Jury Rigg']]);
  planned('ov', 4, [['feedback', 'Feedback'], ['bloxx', 'Bloxx'], ['gravattack', 'Gravattack'], ['crashhopper', 'Crashhopper'], ['ballweevil', 'Ball Weevil'], ['shocksquatch', 'Shocksquatch']]);
  planned('ov', 0, [['walkatrout', 'Walkatrout'], ['peskydust', 'Pesky Dust'], ['molestache', 'Mole-Stache'], ['theworst', 'The Worst'], ['kickinhawk', 'Kickin Hawk'], ['toepick', 'Toepick'], ['astrodactyl', 'Astrodactyl'], ['bullfrag', 'Bullfrag'], ['atomix', 'Atomix'], ['gutrot', 'Gutrot'], ['whampire', 'Whampire']]);
  planned('antitrix', 0, [['wreckingbolt', 'Wreckingbolt'], ['thornblade', 'Thornblade'], ['undertow', 'Undertow'], ['darkmatter', 'Dark Matter'], ['crystalfist', 'Crystalfist'], ['bootleg', 'Bootleg'], ['quadsmack', 'Quad Smack'], ['hotshot', 'Hot Shot'], ['rush', 'Rush'], ['skunkmoth', 'Skunkmoth'], ['bashmouth', 'Bashmouth']]);
  // the six playable aliens (ALIENS owns the gameplay; only metadata is declared here)
  const meta = {
    heatblast: { species: 'Pyronite', origin: 'os', watches: null },
    diamond: { species: 'Petrosapien', origin: 'os', watches: null },
    fourarms: { species: 'Tetramand', origin: 'os', watches: null },
    xlr8: { species: 'Kineceleran', origin: 'os', watches: null },
    // game-original design choice: the worn Prototype dial only carries the four basic forms
    bestia: { species: 'Vulpimancer', origin: 'os', watches: ['recalibrated', 'ultimatrix', 'albedo', 'completed'] },
    insect: { species: 'Lepidopterran', origin: 'os', watches: ['recalibrated', 'ultimatrix', 'albedo', 'completed'] },
  };
  for (const id of Object.keys(meta)) ALIEN_DB[id] = { id, name: ALIENS[id].name, wave: 1, implemented: true, ...meta[id] };
})();
function alienInfo(id) {
  return ALIEN_DB[id] || { id, implemented: !!ALIENS[id], watches: null };
}
// Antitrix transformations beyond the listed roster (e.g. Humungoraptor) are added the same way: ALIEN_DB.<id> = {...}.

// ============================ SEMANTIC WATCH SFX ============================
// Gameplay calls playWatchSFX('scroll'|'select'|'transform'|'ultimate.charge'|...). The CURRENT watch resolves it.
// A watch does not have to implement every event (missing => silent). Recipe entry:
//   [freqHz, seconds, wave, volume, delayMs]   (original synthesized sounds; no copyrighted audio is used)
// A file may be used instead: SFX_FILES[profile][event] = 'audio/watch/ov/scroll_01.ogg' (falls back to the recipe).
// Variations: events 'scroll_01', 'scroll_02', ... are picked at random when you play 'scroll'.
const SFX_FILES = {};
const SFX = {
  prototype: {
    activate: [[300, 0.07, 'square', 0.03, 0], [220, 0.1, 'square', 0.03, 70]],
    open: [[300, 0.05, 'square', 0.03, 0]],
    raise: [[150, 0.12, 'sawtooth', 0.03, 0], [260, 0.08, 'square', 0.03, 90]],
    scroll_01: [[720, 0.025, 'square', 0.03, 0], [380, 0.02, 'square', 0.02, 22]],
    scroll_02: [[680, 0.025, 'square', 0.03, 0], [350, 0.02, 'square', 0.02, 22]],
    scroll_03: [[760, 0.025, 'square', 0.03, 0], [410, 0.02, 'square', 0.02, 22]],
    select: [[520, 0.04, 'square', 0.025, 0]],
    confirm: [[420, 0.05, 'square', 0.03, 0]],
    cancel: [[260, 0.08, 'square', 0.025, 0]],
    slam: [[110, 0.14, 'sawtooth', 0.05, 0], [70, 0.2, 'square', 0.04, 40]],
    transform: [[160, 0.12, 'sawtooth', 0.04, 0], [320, 0.1, 'square', 0.03, 90], [640, 0.2, 'sawtooth', 0.025, 170]],
    quick_transform: [[320, 0.08, 'square', 0.03, 0], [640, 0.12, 'sawtooth', 0.03, 60]],
    revert: [[640, 0.08, 'square', 0.03, 0], [320, 0.12, 'square', 0.03, 80], [160, 0.2, 'sawtooth', 0.03, 170]],
    warning: [[1000, 0.05, 'square', 0.03, 0]],
    low_power: [[1000, 0.05, 'square', 0.03, 0], [1000, 0.05, 'square', 0.03, 120]],
    timeout: [[880, 0.08, 'square', 0.04, 0], [880, 0.08, 'square', 0.04, 140], [440, 0.3, 'sawtooth', 0.04, 280]],
    recharge: [[330, 0.05, 'square', 0.02, 0]],
    recharged: [[660, 0.06, 'square', 0.03, 0], [990, 0.12, 'square', 0.03, 80]],
    error: [[110, 0.14, 'square', 0.03, 0]],
    locked: [[110, 0.08, 'square', 0.03, 0], [90, 0.1, 'square', 0.03, 100]],
    invalid: [[130, 0.1, 'square', 0.03, 0]],
    random_transform: [[90, 0.1, 'sawtooth', 0.05, 0], [1400, 0.06, 'square', 0.04, 80], [70, 0.2, 'sawtooth', 0.05, 150]],
    scan_start: [[500, 0.06, 'square', 0.03, 0]],
    scan_complete: [[700, 0.08, 'square', 0.03, 0], [1050, 0.12, 'square', 0.03, 90]],
    dna_added: [[880, 0.1, 'square', 0.03, 0], [1320, 0.16, 'square', 0.03, 110]],
  },
  recalibrated: {
    activate: [[700, 0.05, 'triangle', 0.03, 0], [1050, 0.08, 'triangle', 0.025, 50]],
    open: [[600, 0.05, 'triangle', 0.025, 0]],
    raise: [[400, 0.1, 'triangle', 0.03, 0], [800, 0.1, 'sine', 0.025, 80]],
    hologram_in: [[1000, 0.08, 'sine', 0.02, 0], [1500, 0.14, 'sine', 0.02, 60]],
    scroll_01: [[1250, 0.03, 'triangle', 0.025, 0]],
    scroll_02: [[1180, 0.03, 'triangle', 0.025, 0]],
    scroll_03: [[1320, 0.03, 'triangle', 0.025, 0]],
    select: [[880, 0.03, 'triangle', 0.025, 0]],
    confirm: [[900, 0.05, 'triangle', 0.03, 0], [1350, 0.08, 'triangle', 0.025, 50]],
    cancel: [[500, 0.07, 'triangle', 0.025, 0]],
    transform: [[500, 0.08, 'triangle', 0.035, 0], [750, 0.08, 'triangle', 0.03, 60], [1200, 0.18, 'sine', 0.03, 120]],
    quick_transform: [[900, 0.05, 'triangle', 0.03, 0], [1350, 0.1, 'triangle', 0.03, 50]],
    revert: [[1100, 0.07, 'triangle', 0.03, 0], [700, 0.1, 'triangle', 0.03, 60], [420, 0.16, 'sine', 0.03, 130]],
    warning: [[1250, 0.04, 'triangle', 0.03, 0]],
    low_power: [[1250, 0.04, 'triangle', 0.03, 0], [1250, 0.04, 'triangle', 0.03, 110]],
    timeout: [[900, 0.1, 'triangle', 0.04, 0], [600, 0.1, 'triangle', 0.04, 120], [300, 0.25, 'sine', 0.04, 240]],
    recharge: [[900, 0.03, 'sine', 0.02, 0]],
    recharged: [[880, 0.06, 'triangle', 0.03, 0], [1320, 0.12, 'triangle', 0.03, 70]],
    error: [[160, 0.12, 'triangle', 0.03, 0]],
    locked: [[200, 0.1, 'triangle', 0.03, 0], [150, 0.1, 'triangle', 0.03, 100]],
    invalid: [[180, 0.1, 'triangle', 0.03, 0]],
    scan_start: [[800, 0.06, 'triangle', 0.03, 0], [1000, 0.06, 'triangle', 0.03, 90]],
    scan_loop: [[1200, 0.05, 'sine', 0.02, 0]],
    scan_complete: [[900, 0.08, 'triangle', 0.03, 0], [1400, 0.14, 'triangle', 0.03, 90]],
    dna_added: [[1000, 0.1, 'triangle', 0.03, 0], [1500, 0.2, 'sine', 0.03, 110]],
    master_control: [[600, 0.1, 'triangle', 0.03, 0], [900, 0.1, 'triangle', 0.03, 90], [1500, 0.25, 'sine', 0.03, 180]],
  },
  ultimatrix: {
    activate: [[180, 0.1, 'sawtooth', 0.03, 0], [360, 0.1, 'sawtooth', 0.03, 80]],
    open: [[180, 0.12, 'sawtooth', 0.03, 0], [360, 0.12, 'sawtooth', 0.03, 90], [720, 0.14, 'sawtooth', 0.025, 180]],
    scroll_01: [[420, 0.04, 'sawtooth', 0.025, 0], [210, 0.03, 'sawtooth', 0.02, 30]],
    scroll_02: [[460, 0.04, 'sawtooth', 0.025, 0], [230, 0.03, 'sawtooth', 0.02, 30]],
    scroll_03: [[390, 0.04, 'sawtooth', 0.025, 0], [195, 0.03, 'sawtooth', 0.02, 30]],
    select: [[420, 0.05, 'sawtooth', 0.02, 0]],
    confirm: [[300, 0.08, 'sawtooth', 0.03, 0], [600, 0.08, 'sawtooth', 0.025, 70]],
    cancel: [[240, 0.08, 'sawtooth', 0.025, 0]],
    transform: [[120, 0.18, 'sawtooth', 0.045, 0], [240, 0.12, 'sawtooth', 0.04, 110], [960, 0.22, 'square', 0.03, 200]],
    quick_transform: [[240, 0.1, 'sawtooth', 0.035, 0], [960, 0.14, 'square', 0.03, 80]],
    revert: [[800, 0.1, 'sawtooth', 0.035, 0], [200, 0.25, 'sawtooth', 0.035, 110]],
    warning: [[600, 0.06, 'sawtooth', 0.035, 0]],
    low_power: [[600, 0.06, 'sawtooth', 0.035, 0], [600, 0.06, 'sawtooth', 0.035, 130]],
    timeout: [[300, 0.12, 'sawtooth', 0.05, 0], [300, 0.12, 'sawtooth', 0.05, 170], [100, 0.4, 'sawtooth', 0.05, 340]],
    recharge: [[260, 0.05, 'sawtooth', 0.02, 0]],
    recharged: [[300, 0.08, 'sawtooth', 0.03, 0], [900, 0.14, 'square', 0.03, 90]],
    error: [[90, 0.16, 'sawtooth', 0.03, 0]],
    locked: [[100, 0.1, 'sawtooth', 0.03, 0], [80, 0.12, 'sawtooth', 0.03, 120]],
    invalid: [[120, 0.1, 'sawtooth', 0.03, 0]],
    'ultimate.activate': [[220, 0.1, 'sawtooth', 0.04, 0], [330, 0.1, 'square', 0.03, 90]],
    'ultimate.mechanical': [[90, 0.08, 'square', 0.045, 0], [90, 0.08, 'square', 0.045, 140], [140, 0.1, 'square', 0.045, 280], [180, 0.14, 'sawtooth', 0.04, 420]],
    'ultimate.charge': [[200, 0.25, 'sawtooth', 0.03, 0], [400, 0.25, 'sawtooth', 0.035, 200], [800, 0.3, 'sawtooth', 0.04, 400], [1600, 0.3, 'square', 0.03, 600]],
    'ultimate.transform': [[110, 0.2, 'sawtooth', 0.05, 0], [220, 0.2, 'sawtooth', 0.05, 140], [440, 0.2, 'sawtooth', 0.045, 280], [1320, 0.35, 'square', 0.035, 420]],
    'ultimate.revert': [[1000, 0.1, 'sawtooth', 0.04, 0], [300, 0.25, 'sawtooth', 0.04, 100]],
  },
  completed: {
    activate: [[1200, 0.04, 'sine', 0.03, 0], [1600, 0.05, 'sine', 0.025, 40]],
    open: [[1200, 0.04, 'sine', 0.03, 0], [1600, 0.05, 'sine', 0.025, 40], [2000, 0.07, 'sine', 0.02, 90]],
    raise: [[800, 0.08, 'sine', 0.025, 0], [1400, 0.1, 'sine', 0.02, 60]],
    hologram_in: [[1500, 0.05, 'sine', 0.02, 0], [2200, 0.12, 'sine', 0.02, 50]],
    scroll_01: [[1800, 0.02, 'sine', 0.025, 0]],
    scroll_02: [[1950, 0.02, 'sine', 0.025, 0]],
    scroll_03: [[2100, 0.02, 'sine', 0.025, 0]],
    select: [[1500, 0.025, 'sine', 0.025, 0]],
    confirm: [[1900, 0.05, 'triangle', 0.03, 0], [2500, 0.05, 'triangle', 0.03, 60]],
    cancel: [[900, 0.06, 'sine', 0.025, 0]],
    transform: [[400, 0.1, 'sine', 0.04, 0], [800, 0.1, 'sine', 0.035, 70], [1600, 0.12, 'sine', 0.03, 140], [2400, 0.2, 'triangle', 0.025, 210]],
    quick_transform: [[1800, 0.04, 'sine', 0.03, 0], [2400, 0.06, 'sine', 0.025, 40]],
    revert: [[2000, 0.06, 'sine', 0.03, 0], [1000, 0.1, 'sine', 0.03, 60], [500, 0.18, 'sine', 0.03, 120]],
    warning: [[1700, 0.04, 'sine', 0.03, 0]],
    low_power: [[1700, 0.04, 'sine', 0.03, 0], [1700, 0.04, 'sine', 0.03, 100]],
    timeout: [[1000, 0.08, 'sine', 0.04, 0], [500, 0.3, 'sine', 0.04, 100]],
    recharge: [[1600, 0.03, 'sine', 0.02, 0]],
    recharged: [[1500, 0.05, 'sine', 0.03, 0], [2200, 0.12, 'sine', 0.03, 60]],
    error: [[200, 0.12, 'sine', 0.03, 0]],
    locked: [[240, 0.1, 'sine', 0.03, 0], [180, 0.1, 'sine', 0.03, 100]],
    invalid: [[220, 0.1, 'sine', 0.03, 0]],
    scan_start: [[1400, 0.05, 'sine', 0.025, 0], [1800, 0.05, 'sine', 0.025, 80]],
    scan_complete: [[1600, 0.06, 'sine', 0.03, 0], [2400, 0.12, 'sine', 0.03, 80]],
    dna_added: [[1900, 0.08, 'triangle', 0.03, 0], [2500, 0.16, 'triangle', 0.03, 90]],
    master_control: [[900, 0.08, 'sine', 0.03, 0], [1500, 0.08, 'sine', 0.03, 70], [2400, 0.2, 'sine', 0.03, 140]],
    random_transform: [[600, 0.05, 'sine', 0.03, 0], [1800, 0.05, 'sine', 0.03, 50], [900, 0.08, 'sine', 0.03, 100]],
  },
};
SFX.albedo = SFX.ultimatrix; // variants may share a profile; give Albedo its own table later
// Biomnitrix: organic, bubbly double tones (two dials = two voices).
SFX.biomnitrix = {
  activate: [[260, 0.08, 'triangle', 0.035, 0], [390, 0.08, 'triangle', 0.035, 60]],
  open: [[330, 0.1, 'sine', 0.03, 0], [495, 0.1, 'sine', 0.03, 0]],
  split: [[440, 0.12, 'triangle', 0.03, 0], [660, 0.12, 'triangle', 0.03, 40], [220, 0.16, 'sine', 0.03, 80]],
  scroll_01: [[880, 0.025, 'triangle', 0.025, 0], [1320, 0.02, 'sine', 0.015, 15]],
  scroll_02: [[990, 0.025, 'triangle', 0.025, 0], [1480, 0.02, 'sine', 0.015, 15]],
  scroll_03: [[784, 0.025, 'triangle', 0.025, 0], [1175, 0.02, 'sine', 0.015, 15]],
  select: [[1000, 0.03, 'triangle', 0.025, 0]],
  'fusion.select_a': [[660, 0.06, 'triangle', 0.03, 0]],
  'fusion.select_b': [[990, 0.06, 'triangle', 0.03, 0]],
  'fusion.lock': [[523, 0.07, 'square', 0.025, 0], [784, 0.09, 'triangle', 0.03, 60]],
  'fusion.combine': [[330, 0.3, 'sine', 0.03, 0], [494, 0.3, 'sine', 0.03, 0], [392, 0.25, 'triangle', 0.025, 160], [587, 0.25, 'triangle', 0.025, 160], [784, 0.3, 'sine', 0.03, 320]],
  'fusion.transform': [[196, 0.16, 'sawtooth', 0.035, 0], [392, 0.16, 'triangle', 0.035, 70], [784, 0.2, 'triangle', 0.03, 140], [1175, 0.3, 'sine', 0.03, 210]],
  'fusion.split': [[880, 0.08, 'triangle', 0.03, 0], [440, 0.1, 'triangle', 0.03, 50], [660, 0.1, 'sine', 0.03, 50], [220, 0.2, 'sine', 0.03, 120]],
  transform: [[262, 0.12, 'triangle', 0.035, 0], [523, 0.14, 'triangle', 0.03, 80], [1046, 0.2, 'sine', 0.03, 160]],
  confirm: [[784, 0.05, 'triangle', 0.03, 0], [1046, 0.06, 'triangle', 0.03, 50]],
  cancel: [[440, 0.07, 'triangle', 0.025, 0], [330, 0.07, 'triangle', 0.025, 50]],
  revert: [[880, 0.08, 'triangle', 0.03, 0], [440, 0.1, 'triangle', 0.03, 50], [660, 0.1, 'sine', 0.03, 50], [220, 0.2, 'sine', 0.03, 120]],
  warning: [[700, 0.05, 'triangle', 0.03, 0], [1050, 0.05, 'triangle', 0.03, 0]],
  low_power: [[700, 0.05, 'triangle', 0.03, 0], [700, 0.05, 'triangle', 0.03, 110]],
  timeout: [[600, 0.1, 'triangle', 0.04, 0], [300, 0.3, 'sine', 0.04, 100]],
  recharge: [[900, 0.03, 'sine', 0.02, 0]],
  recharged: [[660, 0.06, 'triangle', 0.03, 0], [990, 0.12, 'triangle', 0.03, 70]],
  error: [[180, 0.12, 'triangle', 0.03, 0]],
  locked: [[220, 0.1, 'triangle', 0.03, 0], [165, 0.1, 'triangle', 0.03, 100]],
  invalid: [[200, 0.1, 'triangle', 0.03, 0]],
  scan_start: [[700, 0.05, 'triangle', 0.025, 0], [1050, 0.05, 'triangle', 0.025, 80]],
  scan_complete: [[880, 0.06, 'triangle', 0.03, 0], [1320, 0.12, 'triangle', 0.03, 80]],
  dna_added: [[990, 0.08, 'triangle', 0.03, 0], [1480, 0.16, 'triangle', 0.03, 90]],
  master_control: [[523, 0.08, 'triangle', 0.03, 0], [784, 0.08, 'triangle', 0.03, 70], [1046, 0.2, 'triangle', 0.03, 140]],
};

// ============================ THE FOUR INITIAL WATCHES ============================
registerWatch({
  id: 'prototype',
  name: 'Omnitrix Prototipo',
  hudName: 'PROTOTIPO',
  tagline: 'Clásico · Dial mecánico',
  canon: { design: 'show', mechanics: 'game' },
  unlock: { level: 1 },
  color: '#7dff9a',
  shape: 'hourglass',
  iconStyle: 'os-silhouette', // BLACK silhouettes
  selector: { type: 'ring' },
  fx: 'os',
  sequence: {
    // button press -> dial raises -> silhouette -> (player rotates) ; confirm -> selected -> slam -> flash(commit) -> transform
    open: [['OS_BUTTON_PRESS', 0.16], ['OS_DIAL_RAISE', 0.28], ['OS_DISPLAY', 0.2], ['OS_ROTATE', 0]],
    confirm: [['OS_SELECTED', 0.12], ['OS_SLAM', 0.16], ['OS_FLASH', 0.2, { commit: true }], ['OS_TRANSFORM', 0.08]],
  },
  timing: { drainPerSec: 100 / 120, rechargePerSec: 100 / 40 },
  misfireChance: 0.1,
  summary: [
    'Dial mecánico: pulsa, el dial se eleva y giras siluetas negras.',
    'Solo los 10 aliens clásicos en el dial gastado.',
    '10% de fallo: el dial elige otro alien al azar.',
    '120 s de energía · recarga completa en 40 s.',
  ],
  hooks: {
    // return an alien id to override the selected one (ALIENS stays untouched)
    pick(api, wanted) {
      const list = api.playlist().filter((id) => id !== wanted);
      if (!api.masterControl && api.rand() < this.misfireChance && list.length) return { id: list[Math.floor(api.rand() * list.length)], misfire: true };
      return { id: wanted };
    },
  },
});
registerWatch({
  id: 'recalibrated',
  name: 'Omnitrix Recalibrado',
  hudName: 'RECALIBRADO',
  tagline: 'Alien Force · Hologramas',
  canon: { design: 'show', mechanics: 'game' },
  unlock: { level: 3 },
  color: '#6fd7ff',
  shape: 'ring',
  iconStyle: 'af-hologram', // green holograms
  selector: { type: 'strip' },
  fx: 'af',
  twoStep: false, // one press transforms (the two-step version confused players)
  masterControl: true,
  sequence: {
    open: [['AF_ACTIVATE', 0.12], ['AF_CORE_RISE', 0.2], ['AF_HOLOGRAM_IN', 0.2], ['AF_SCROLL', 0]],
    confirm: [['AF_CONFIRM', 0.12], ['AF_FLASH', 0.2, { commit: true }], ['AF_TRANSFORM', 0.08]],
  },
  timing: { drainPerSec: 100 / 120, rechargePerSec: 100 / 36, skillCostMult: 0.8 },
  quickSwap: { cost: 8, cooldown: 1.5 },
  summary: [
    'Núcleo que sube y tira de hologramas verdes: desplázate y confirma.',
    'Todos los aliens que hayas desbloqueado.',
    'Sin fallos: siempre el alien que eliges.',
    'Cambio rápido transformado (8% de batería).',
    'Habilidades un 20% más baratas · recarga 36 s.',
  ],
});
registerWatch({
  id: 'ultimatrix',
  name: 'Ultimatrix',
  hudName: 'ULTIMATRIX',
  tagline: 'Ultimate · Forma definitiva',
  canon: { design: 'show', mechanics: 'game' },
  unlock: { level: 8 },
  color: '#ff6a3d',
  shape: 'diamond',
  iconStyle: 'ua-red',
  selector: { type: 'slider' },
  fx: 'ua',
  ultimate: { minMastery: 40, minBattery: 25, cost: 10 }, // default rules; ULTIMATES[alien] overrides stats per form
  sequence: {
    open: [['UA_ACTIVATE', 0.12], ['UA_UNFOLD', 0.26], ['UA_SELECT', 0]],
    confirm: [['UA_CONFIRM', 0.1], ['UA_FLASH', 0.2, { commit: true }], ['UA_TRANSFORM', 0.08]],
    ultimate: [['ULTIMATE_TRIGGER', 0.25], ['ULTIMATE_MECHANICAL', 0.35], ['ULTIMATE_CHARGE', 0.45], ['ULTIMATE_FLASH', 0.15, { commit: true }], ['ULTIMATE_SPAWN', 0.3]],
    revert: [['ULTIMATE_REVERT', 0.3, { commit: true }]],
  },
  timing: { drainPerSec: 100 / 100, rechargePerSec: 100 / 55 },
  specials: [{ id: 'ultimate', key: 'u', label: 'ULTIMATE', labelOff: 'QUITAR ULTIMATE' }],
  summary: [
    'Barra mecánica que se despliega con un deslizador de aliens.',
    'Todos los aliens que hayas desbloqueado.',
    'ULTIMATE (tecla U): secuencia mecánica y forma definitiva con más vida, daño y enfriamientos rápidos.',
    'Forma Ultimate gasta energía ×2,2 y necesita maestría 40%.',
    '100 s de energía · recarga completa en 55 s.',
  ],
});
registerWatch({
  id: 'completed',
  name: 'Omnitrix Completo',
  hudName: 'COMPLETO',
  tagline: 'Omniverse · Rueda holográfica',
  canon: { design: 'show', mechanics: 'game' },
  unlock: { level: 12 },
  color: '#c7f2ff',
  shape: 'prime',
  iconStyle: 'ov-icon', // native 32x32 pixel icons, nearest-neighbour
  selector: { type: 'wheel' },
  fx: 'ov',
  twoStep: false, // one press transforms (the two-step version confused players)
  masterControl: true,
  sequence: {
    // ~10 steps of 45 ms: faceplate opens, core rises, wheel expands
    open: [['OV_ACTIVATE', 0.045], ['OV_OPEN', 0.45], ['OV_WHEEL', 0]],
    confirm: [['OV_CONFIRM', 0.08], ['OV_INPUT', 0.08], ['OV_FLASH', 0.12, { commit: true }], ['OV_TRANSFORM', 0.06]],
  },
  // No countdown: it only drains slowly. The cost is paid when you use abilities.
  timing: { drainPerSec: 0.15, rechargePerSec: 100 / 25, skillCostMult: 1.6 },
  quickSwap: { cost: 0, cooldown: 3 },
  favorites: true,
  haptics: true,
  summary: [
    'Rueda holográfica: rueda del ratón, arrastre o flechas; toca el alien para transformarte.',
    'Todos los aliens desbloqueados, con favoritos ★.',
    'Sin cuenta atrás: solo un goteo lento de energía.',
    'Habilidades un 60% más caras (la energía se gasta peleando).',
    'Cambio rápido gratis (3 s de espera) · recarga completa en 25 s.',
  ],
});
// Albedo is a VARIANT of the Ultimatrix: same machinery, different theme/forms. No duplicated implementation.
registerWatch({
  id: 'albedo',
  extends: 'ultimatrix',
  name: 'Ultimatrix de Albedo',
  hudName: 'ALBEDO',
  tagline: 'Variante · Tema rojo',
  canon: { design: 'show', mechanics: 'game' },
  unlock: { level: 14 },
  color: '#ff2f4f',
  summary: ['Variante del Ultimatrix con tema rojo.', 'Misma mecánica Ultimate; sus formas exclusivas (Arctiguana, Gravattack, Rath) llegan con esos aliens.'],
});
// ============================ PLANNED (registered so the system is ready for them) ============================
// Biomnitrix: TWO dials. Any two unlocked aliens fuse into one form (part-18 builds the fused alien on demand).
// Picking the same alien twice transforms into that alien alone. The six series fusions in FUSIONS keep their names.
registerWatch({
  id: 'biomnitrix',
  name: 'Biomnitrix',
  hudName: 'BIOMNITRIX',
  tagline: 'Fusión · Dos diales',
  canon: { design: 'show', mechanics: 'game' },
  unlock: { level: 10 },
  color: '#b6ff4d',
  shape: 'bio',
  iconStyle: 'bio-dna',
  selector: { type: 'dual' },
  fx: 'bio',
  fusion: true,
  sfxProfile: 'biomnitrix',
  sequence: {
    open: [['BIO_ACTIVATE', 0.14], ['BIO_SPLIT', 0.3], ['BIO_SELECT', 0]],
    confirm: [['BIO_LOCK', 0.16], ['BIO_COMBINE', 0.42], ['BIO_FLASH', 0.18, { commit: true }], ['BIO_TRANSFORM', 0.08]],
  },
  timing: { drainPerSec: 100 / 90, rechargePerSec: 100 / 45, skillCostMult: 1 },
  summary: [
    'Dos diales: elige el alien A, después el alien B, y se fusionan.',
    'Cualquier pareja de aliens desbloqueados: cuerpo de A, colores mezclados, ataques de los dos.',
    'Las seis fusiones de la serie conservan su nombre y ganan +10% de vida.',
    'Elige el mismo alien dos veces para transformarte sin fusión.',
    'Fusión: +15% de vida y +10% de daño · 90 s de energía · recarga 45 s.',
  ],
  hooks: {
    pick(api, wanted) {
      const b = api.player.fusePartner;
      if (b && b !== wanted && api.candidates().includes(b)) {
        const id = ensureFusion(wanted, b);
        if (id) return { id };
      }
      return { id: wanted };
    },
  },
});
registerWatch({
  id: 'nemetrix',
  name: 'Nemetrix',
  hudName: 'NEMETRIX',
  status: 'planned',
  note: 'Pendiente: selección de depredadores con su propia interfaz y roster (PREDATORS).',
  color: '#ff3b3b',
  selector: { type: 'predator' },
  rosterKey: 'predators',
  canon: { design: 'show', mechanics: 'planned' },
});
registerWatch({
  id: 'antitrix',
  name: 'Antitrix',
  hudName: 'ANTITRIX',
  status: 'planned',
  note: 'Pendiente: roster propio (origin "antitrix" en ALIEN_DB) con estética mutante/corrupta.',
  color: '#a24dff',
  rosterOrigin: 'antitrix',
  canon: { design: 'show', mechanics: 'planned' },
});
registerWatch({
  id: 'reboot',
  name: 'Omnitrix Reboot',
  hudName: 'REBOOT',
  status: 'planned',
  note: 'Pendiente: capas Omni-Enhanced / Omni-Kix / Omni-Naut sobre el alien base (REBOOT_LAYERS).',
  color: '#3dff9f',
  layers: ['normal', 'enhanced', 'kix', 'naut'],
  canon: { design: 'show', mechanics: 'planned' },
});

// ============================ FUSIONS (Biomnitrix; data only, six demonstrated combinations) ============================
// status flips to 'ready' in part-18 once both parents are playable. Any other pair is a game-original fusion.
registerFusion({ id: 'atomicx', a: 'atomix', b: 'alienx', result: 'atomicx', name: 'Atomic-X' });
registerFusion({ id: 'bigchuck', a: 'waybig', b: 'upchuck', result: 'bigchuck', name: 'Big Chuck' });
registerFusion({ id: 'crashocker', a: 'crashhopper', b: 'shocksquatch', result: 'crashocker', name: 'Crashocker' });
registerFusion({ id: 'fourmungousaur', a: 'fourarms', b: 'humungousaur', result: 'fourmungousaur', name: 'Fourmungousaur' });
registerFusion({ id: 'humungoopsaur', a: 'humungousaur', b: 'goop', result: 'humungoopsaur', name: 'Humungoopsaur' });
registerFusion({ id: 'uprigg', a: 'upgrade', b: 'juryrigg', result: 'uprigg', name: 'Uprigg' });
// Game-original fusions would be registered with canon:'game' and clearly labelled.

// ============================ ULTIMATE FORMS ============================
// Stats are game-original balance. canon 'show' = the form exists in the series. row/skills may point at a different
// sprite row / ability set once art exists; null => the base alien's sprite is reused with scale + aura.
const ULTIMATE_DEFAULT = { hpMult: 1.35, damageMult: 1.3, cooldownRate: 1.25, scale: 1.1, costMult: 1.2, drainMult: 2.2, row: null, skills: null };
registerUltimate({ base: 'bestia', name: 'Ultimate Bestia', canon: 'show', hpMult: 1.5, damageMult: 1.35, cooldownRate: 1.3, scale: 1.18, costMult: 1.15, drainMult: 2.0 });
for (const id of ['heatblast', 'diamond', 'fourarms', 'xlr8', 'insect'])
  registerUltimate({ base: id, name: 'Ultimate ' + ALIENS[id].name, canon: 'game' }); // not a series form: original to OMNI
// Planned series forms (alien not implemented yet). They become selectable automatically when the base alien exists.
for (const [id, watches] of [['humungousaur'], ['swampfire'], ['spidermonkey'], ['bigchill'], ['cannonbolt'], ['echoecho'], ['waybig'], ['arctiguana', ['albedo']], ['gravattack', ['albedo']], ['rath', ['albedo']]])
  registerUltimate({ base: id, name: 'Ultimate ' + (ALIEN_DB[id] ? ALIEN_DB[id].name : id), canon: 'show', status: 'planned', watches: watches || null });

// ============================ HOLDERS (alternate wearers; placeholders, canon must be checked first) ============================
registerHolder({ id: 'ben23', name: 'Ben 23', note: 'Portador alternativo: verificar canon antes de añadir.' });
registerHolder({ id: 'gwen10', name: 'Gwen 10', note: 'Portadora alternativa: verificar canon antes de añadir.' });
registerHolder({ id: 'madben', name: 'Mad Ben', note: 'Variante: verificar canon antes de añadir.' });
registerHolder({ id: 'badben', name: 'Bad Ben', note: 'Variante: verificar canon antes de añadir.' });
registerHolder({ id: 'negaben', name: 'Nega Ben', note: 'Variante: verificar canon antes de añadir.' });
registerHolder({ id: 'benzarro', name: 'Benzarro', note: 'Variante: verificar canon antes de añadir.' });
// ============================================================================================
// OMNI WATCH SYSTEM · part 2/3: ENGINE (state, timing, SFX resolver, icons, unlocks, transform plumbing)
// Reads WATCHES / ALIEN_DB / ULTIMATES from part-14. All state lives on `player` (watch, watchUnlocks, alienUnlocks,
// watchFav, masterControl, ultimate, swapCool) so each co-op player is fully independent.
// ============================================================================================
let watchFree = false; // private "unlock everything" switch (persisted in localStorage, set from the watch menu)
try {
  watchFree = localStorage.getItem('omni-watchfree') === '1';
} catch (e) {}

function getWatch(id) {
  const w = WATCHES[id !== undefined ? id : player.watch];
  return w && w.status === 'ready' ? w : WATCHES.prototype;
}
function oxColor() {
  return getWatch().color;
}
const omniActive = () => race === 'omni'; // the Osmosian and Anodite races have no watch

// ---------------- unlocks (watch and alien unlocks are independent) ----------------
function watchUnlocked(id) {
  const w = WATCHES[id];
  if (!w || w.status !== 'ready') return false;
  if (!WATCH_GATING || watchFree) return true;
  return !!(player.watchUnlocks && player.watchUnlocks[id]);
}
function grantWatch(id, announce = true) {
  const w = WATCHES[id];
  if (!w || w.status !== 'ready' || (player.watchUnlocks && player.watchUnlocks[id])) return false;
  (player.watchUnlocks = player.watchUnlocks || {})[id] = true;
  if (announce) {
    toast('¡' + w.name + ' desbloqueado! Equípalo en RELOJ / OMNITRIX');
    playWatchSFX('recharged', id);
  }
  return true;
}
function alienUnlocked(id) {
  const flag = player.alienUnlocks && player.alienUnlocks[id],
    lv = alienInfo(id).unlockLevel;
  if (flag === true || watchFree) return true; // DNA scan / private mode
  return lv ? player.level >= lv : flag !== false; // level progression (the six originals have no level)
}
function grantAlien(id) {
  if (!ALIENS[id]) return false;
  (player.alienUnlocks = player.alienUnlocks || {})[id] = true;
  return true;
}
// Progression: watches unlock by level (a quest can call grantWatch(id) instead); Master Control is a late reward.
function checkWatchUnlocks(announce) {
  if (!player.watchUnlocks) player.watchUnlocks = {};
  for (const id of WATCH_ORDER) {
    const w = WATCHES[id];
    if (w.status === 'ready' && player.level >= (w.unlock ? w.unlock.level : 99)) grantWatch(id, announce);
  }
  if (announce) {
    const fresh = CORE_ALIENS.filter((id) => alienInfo(id).unlockLevel === player.level).map((id) => ALIENS[id].name);
    if (fresh.length) toast('¡ADN nuevo! ' + fresh.slice(0, 4).join(', ') + (fresh.length > 4 ? ' y ' + (fresh.length - 4) + ' más' : '') + ' disponible en el dial');
  }
  if (!player.masterControl && player.level >= 15) {
    player.masterControl = true;
    if (announce) {
      toast('¡CONTROL MAESTRO! Sin fallos del dial y cambios rápidos más baratos');
      playWatchSFX('master_control');
    }
  }
}

// ---------------- playlists ----------------
function watchCandidates(w = getWatch()) {
  return CORE_ALIENS.filter((id) => {
    const i = alienInfo(id);
    return ALIENS[id] && i.implemented && alienUnlocked(id) && (!i.watches || i.watches.includes(w.id));
  });
}
function watchApi() {
  const w = getWatch();
  return {
    player,
    ALIENS,
    rand: Math.random,
    toast,
    masterControl: !!player.masterControl && !!w.masterControl,
    candidates: () => watchCandidates(w),
    playlist: () => watchPlaylist(w),
  };
}
function watchPlaylist(w = getWatch()) {
  const l = (w.playlist(watchApi()) || []).filter((id) => ALIENS[id]);
  return l.length ? l : watchCandidates(w).length ? watchCandidates(w) : ['heatblast'];
}
function ensureSelection() {
  const l = watchPlaylist();
  if (!l.includes(player.selected) && !labFusionOk(player.selected)) player.selected = l[0]; // DNA lab fusions are allowed (part-47)
}

// ---------------- timing (per watch; Osmo race keeps the original numbers) ----------------
const timingFor = () => (omniActive() ? getWatch().timing : DEFAULT_WATCH_TIMING);
function ultForm(id = player.activeAlien) {
  const u = ULTIMATES[id],
    w = getWatch();
  if (!u || u.status !== 'ready' || !ALIENS[id] || (u.watches && !u.watches.includes(w.id))) return null;
  return { ...ULTIMATE_DEFAULT, ...u };
}
const ultOn = () => omniActive() && player.alien && player.ultimate && !!ultForm();
function drainRate() {
  return timingFor().drainPerSec * (ultOn() ? ultForm().drainMult : 1) * wupDrain();
}
const rechargeRate = () => timingFor().rechargePerSec * wupRecharge();
function cooldownRate() {
  return timingFor().cooldownRate * (ultOn() ? ultForm().cooldownRate : 1);
}
function skillCostMult() {
  return timingFor().skillCostMult * (ultOn() ? ultForm().costMult : 1);
}
function ultScale() {
  return ultOn() ? ultForm().scale : 1;
}
function quickSwapCfg() {
  if (!omniActive()) return null;
  const w = getWatch(),
    mc = !!player.masterControl && !!w.masterControl;
  if (w.quickSwap) return mc ? { cost: Math.floor(w.quickSwap.cost / 2), cooldown: (w.quickSwap.cooldown / 2) * wupSwap() } : { ...w.quickSwap, cooldown: w.quickSwap.cooldown * wupSwap() };
  return mc ? { cost: 6, cooldown: 2 * wupSwap() } : null;
}

// ---------------- semantic watch SFX ----------------
function synthRecipe(r) {
  for (const [f, d, wave, v, delay] of r) {
    if (delay) setTimeout(() => tone(f, d, wave, v), delay);
    else tone(f, d, wave, v);
  }
}
function playWatchSFX(ev, watchId) {
  ev = String(ev).replace(/^watch\./, '');
  const w = watchId ? WATCHES[watchId] : getWatch(),
    prof = (w && SFX[w.sfxProfile]) || {},
    files = (w && SFX_FILES[w.sfxProfile]) || {};
  if (files[ev]) { // recorded sound for this watch (part-23)
    if (sound) playSfxFile(files[ev]);
    return true;
  }
  let key = ev;
  if (!prof[key]) {
    const vars = Object.keys(prof).filter((k) => k.startsWith(ev + '_')); // scroll -> scroll_01/02/03 at random
    if (!vars.length) return false;
    key = vars[Math.floor(Math.random() * vars.length)];
  }
  const file = SFX_FILES[w.sfxProfile] && SFX_FILES[w.sfxProfile][key];
  if (file && sound) {
    try {
      const a = new Audio(file);
      a.volume = 0.5;
      a.play().catch(() => synthRecipe(prof[key]));
      return true;
    } catch (e) {}
  }
  synthRecipe(prof[key]);
  return true;
}

// ---------------- icons: ONE gameplay sprite, presented per watch (never a per-watch alien) ----------------
const ICON_N = 96; // 0.15.5: sharper dial icons for the new alien art (was 32)
const iconCache = {};
const ICON_FILES = {}; // optional hand-made 32x32 art: ICON_FILES[style][alienId] = 'path.png' (falls back to procedural)
const cv = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
function iconBase(id) {
  if (iconCache['b|' + id]) return iconCache['b|' + id];
  if (ALIENS[id] && ALIENS[id].fusion) return fusionIconBase(id);
  const al = ROW_ALIAS[ALIENS[id].row], // recoloured placeholder bodies are tinted per icon (no full-size sheet copy)
    { table, sheet } = spriteInfo(al ? al.base : ALIENS[id].row),
    f = table[0],
    c = cv(ICON_N, ICON_N),
    g = c.getContext('2d');
  const art = !al && ALIENS[id].row >= 2000; // imported art: smooth downscale; pixel bodies stay crisp
  g.imageSmoothingEnabled = art;
  if (art) g.imageSmoothingQuality = 'high';
  const k = Math.min((ICON_N - 4) / f[2], (ICON_N - 4) / f[3]),
    dw = Math.max(1, Math.round(f[2] * k)),
    dh = Math.max(1, Math.round(f[3] * k)),
    draw = () => g.drawImage(sheet, f[0], f[1], f[2], f[3], ((ICON_N - dw) / 2) | 0, ICON_N - dh - 1, dw, dh);
  if (al) tintFilter(g, al, draw, ICON_N, ICON_N);
  else draw();
  if (sheet.complete !== false && (sheet.naturalWidth === undefined || sheet.naturalWidth > 0)) iconCache['b|' + id] = c;
  return c;
}
function tinted(src, color) {
  const c = cv(ICON_N, ICON_N),
    g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, ICON_N, ICON_N);
  return c;
}
const ICON_STYLES = {
  // Prototype: flat BLACK silhouette with a thin green rim so it reads on the dark dial
  'os-silhouette'(g, base) {
    const rim = tinted(base, '#2f6b43');
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) g.drawImage(rim, dx, dy);
    g.drawImage(tinted(base, '#04070a'), 0, 0);
  },
  // Recalibrated: green hologram with scanlines
  'af-hologram'(g, base) {
    g.globalAlpha = 0.92;
    g.drawImage(tinted(base, '#8dffa8'), 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = 'rgba(0,0,0,.5)';
    for (let y = 1; y < ICON_N; y += 3) g.fillRect(0, y, ICON_N, 1);
  },
  // Ultimatrix: hot red mono with a hint of detail
  'ua-red'(g, base) {
    g.drawImage(tinted(base, '#ff5a2e'), 0, 0);
    g.globalAlpha = 0.38;
    g.drawImage(base, 0, 0);
  },
  // Completed: full-colour 32x32 pixel icon with a pale holographic outline
  'ov-icon'(g, base) {
    const rim = tinted(base, '#c7f2ff');
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) g.drawImage(rim, dx, dy);
    g.drawImage(base, 0, 0);
  },
};
function watchIcon(id, style) {
  const key = style + '|' + id,
    file = ICON_FILES[style] && ICON_FILES[style][id];
  if (iconCache[key]) return iconCache[key];
  if (file) {
    const im = new Image();
    im.src = file;
    iconCache[key] = im; // hand-made art wins once loaded
    return im;
  }
  const base = iconBase(id),
    c = cv(ICON_N, ICON_N),
    g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  (ICON_STYLES[style] || ICON_STYLES['ov-icon'])(g, base);
  if (iconCache['b|' + id]) iconCache[key] = c; // only cache once the sprite sheet has really loaded
  return c;
}
function drawWatchIcon(g, id, style, cx, cy, size, alpha = 1) {
  g.save();
  g.imageSmoothingEnabled = size < ICON_N; // downscaling the 80px icon: smooth; enlarging: crisp pixels
  g.globalAlpha = alpha;
  g.drawImage(watchIcon(id, style), 0, 0, ICON_N, ICON_N, Math.round(cx - size / 2), Math.round(cy - size / 2), size, size);
  g.restore();
}

// ---------------- theme + equip ----------------
const SHAPE_TO_OX = { hourglass: 'classic', ring: 'prime', diamond: 'ember', prime: 'prime' };
function applyWatchTheme() {
  const w = getWatch(),
    g = document.getElementById('game');
  g.dataset.ox = SHAPE_TO_OX[w.shape] || 'classic';
  g.dataset.watch = w.id;
  g.style.setProperty('--ox', w.color);
}
function equipWatch(id) {
  const w = WATCHES[id];
  if (!omniActive()) return toast('Solo la raza Omni usa el Omnitrix');
  if (!w || w.status !== 'ready') return toast('Ese reloj aún no está disponible'), playWatchSFX('invalid');
  if (!watchUnlocked(id)) return toast('Bloqueado · Nivel ' + w.unlock.level), playWatchSFX('locked');
  if (player.alien) return toast('Vuelve a humano para cambiar de reloj'), playWatchSFX('invalid');
  player.watch = id;
  ensureSelection();
  applyWatchTheme();
  playWatchSFX('activate');
  toast(w.name.toUpperCase() + ' equipado');
  hud();
  save();
}

// ---------------- selection stepping (Q/R and HUD arrows) ----------------
function favoriteList() {
  const l = watchPlaylist(),
    f = (player.watchFav || []).filter((id) => l.includes(id));
  return getWatch().favorites && f.length > 1 ? f : l;
}
function selectAlien(step) {
  if (!omniActive() || !started || paused) return;
  if (player.alien) {
    if (quickSwapCfg()) {
      const ids = favoriteList(),
        i = ids.indexOf(player.activeAlien);
      watchSwap(ids[(i + step + ids.length) % ids.length]);
    } else {
      toast('Vuelve a humano para cambiar el dial');
      playWatchSFX('invalid');
    }
    return;
  }
  const ids = watchPlaylist(),
    i = ids.indexOf(player.selected);
  player.selected = ids[(i + step + ids.length) % ids.length];
  playWatchSFX('scroll');
  hud();
  save();
}

// ---------------- transformation plumbing ----------------
function watchPick(wanted) {
  const w = getWatch(),
    h = w.hooks.pick,
    r = h ? h.call(w, watchApi(), wanted) : null;
  return r && r.id && ALIENS[r.id] ? r : { id: wanted };
}
function watchSwap(id) {
  const cfg = quickSwapCfg();
  if (!cfg || !player.alien || !ALIENS[id] || player.leap || player.motion) return false;
  if (id === player.activeAlien) return false;
  if (player.swapCool > 0) {
    toast('Cambio rápido en ' + Math.ceil(player.swapCool) + ' s');
    playWatchSFX('invalid');
    return false;
  }
  if (cfg.cost > 0 && player.battery <= cfg.cost + 5) {
    toast('Batería baja para el cambio rápido');
    playWatchSFX('error');
    return false;
  }
  const ratio = player.hp / maxHP();
  player.ultimate = false;
  player.activeAlien = player.selected = id;
  player.cool = player.cooldowns[id];
  player.hp = clamp(ratio * maxHP(), 1, maxHP());
  player.battery = Math.max(1, player.battery - cfg.cost);
  player.swapCool = cfg.cooldown;
  player.shield = player.shieldTime = 0;
  player.lock = player.emptyLock = 0;
  flash = 0.15;
  burst(player.x, player.y - 50, 22, alien().color);
  playWatchSFX('quick_transform');
  if (typeof fxPlay === 'function') fxPlay(getWatch().fx, { alien: id, quick: true });
  toast(alien().name.toUpperCase() + ' · cambio rápido');
  hud();
  save();
  return true;
}

// ---------------- special functions (watch.specials) ----------------
const SPECIALS = {
  // Ultimatrix: evolve the CURRENT alien into its Ultimate form (stats from ULTIMATES, rules from watch.ultimate)
  ultimate: {
    label: (w) => (player.ultimate ? w.specials[0].labelOff : w.specials[0].label),
    visible: () => omniActive() && player.alien && !!ultForm(), // only aliens that have an Ultimate form
    run() {
      const w = getWatch(),
        rule = w.ultimate;
      if (!rule || !player.alien) return;
      if (typeof seqBusy === 'function' && seqBusy()) return;
      if (player.ultimate) {
        playSequence('revert', () => applyUltimate(false));
        return;
      }
      const f = ultForm();
      if (!f) return toast('Este alien aún no tiene forma Ultimate'), playWatchSFX('invalid');
      if (mastery() < rule.minMastery) return toast('Necesitas maestría ' + rule.minMastery + '% para la forma Ultimate'), playWatchSFX('locked');
      if (player.battery < rule.minBattery) return toast('Batería insuficiente para evolucionar'), playWatchSFX('error');
      playSequence('ultimate', () => applyUltimate(true));
    },
  },
};
function watchSpecial(id) {
  const w = getWatch();
  if (!omniActive() || !started || paused || !w.specials.some((s) => s.id === id)) return;
  if (SPECIALS[id]) SPECIALS[id].run();
}
function applyUltimate(on) {
  if (!player.alien) return;
  if (on && !ultForm()) return;
  const ratio = player.hp / maxHP();
  player.ultimate = !!on;
  player.hp = clamp(ratio * maxHP(), 1, maxHP());
  if (on) player.battery = Math.max(1, player.battery - getWatch().ultimate.cost);
  flash = 0.3;
  burst(player.x, player.y - 50, 40, getWatch().color);
  burst(player.x, player.y - 50, 20, alien().color);
  toast(on ? ultForm().name.toUpperCase() + ' · ' + maxHP() + ' vida máxima' : 'Forma Ultimate terminada');
  hud();
  save();
}

// ---------------- DNA scanning (architecture + working flow; aliens beyond the six are data-only for now) ----------------
// scanDNA('swampfire'): alert -> scan -> acquisition -> unlock. Only implemented aliens can be added to the dial.
function scanDNA(id, done) {
  const i = alienInfo(id);
  if (!ALIENS[id] || !i.implemented) return toast('ADN detectado, pero ese alien aún no está en el juego'), playWatchSFX('invalid'), false;
  if (alienUnlocked(id) && player.alienUnlocks && player.alienUnlocks[id] === true) return toast('Ya tienes ese ADN'), false;
  playWatchSFX('warning');
  toast('ADN DESCONOCIDO DETECTADO · escaneando…');
  playWatchSFX('scan_start');
  setTimeout(() => {
    playWatchSFX('scan_complete');
    grantAlien(id);
    playWatchSFX('dna_added');
    toast('¡ADN añadido! ' + ALIENS[id].name.toUpperCase() + ' disponible');
    burst(player.x, player.y - 50, 30, ALIENS[id].color);
    ensureSelection();
    hud();
    save();
    if (done) done();
  }, 900);
  return true;
}

// ---------------- save sanitising (never destroys progress; legacy saves keep their old behaviour) ----------------
function watchSanitize(raw) {
  const legacy = !raw || raw.watch === undefined;
  if (!player.watchUnlocks || typeof player.watchUnlocks !== 'object') player.watchUnlocks = {};
  player.watchUnlocks.prototype = true;
  if (legacy) {
    player.watch = 'recalibrated'; // closest to the pre-0.9.3 watch: all aliens, no misfire, 120 s
    player.watchUnlocks.recalibrated = true;
  }
  if (!Array.isArray(player.watchFav)) player.watchFav = [];
  if (!player.puzzles || typeof player.puzzles !== 'object') player.puzzles = {};
  if (!player.missions || typeof player.missions !== 'object') player.missions = {};
  if (!player.coop || typeof player.coop !== 'object') player.coop = {};
  if (!player.alienUnlocks || typeof player.alienUnlocks !== 'object') player.alienUnlocks = {};
  player.masterControl = !!player.masterControl;
  if (!WATCHES[player.watch] || WATCHES[player.watch].status !== 'ready') player.watch = 'prototype';
  player.swapCool = 0;
  player.lowWarned = false;
  checkWatchUnlocks(false);
  if (!watchUnlocked(player.watch)) player.watch = 'prototype';
  if (!player.alien || !ultForm()) player.ultimate = false;
  if (isFusionId(player.activeAlien) && (!ensureFusion(player.activeAlien) || !getWatch().fusion)) player.activeAlien = ALIENS[fusionParts(player.activeAlien)[0]] ? fusionParts(player.activeAlien)[0] : player.selected; // fusion without a Biomnitrix: keep the body (A)
  if (player.fusePartner && !ALIENS[player.fusePartner]) player.fusePartner = null;
  ensureSelection();
}
// ============================================================================================
// OMNI WATCH SYSTEM · part 3/3: SELECTOR UIs, TRANSFORM FX, SEQUENCES, WATCH MENU, INPUT
// Everything is drawn procedurally on two small 480x270 canvases (nearest-neighbour scaled to the 960x540 game):
//   #watchsel  interactive selector (ring / strip / slider / wheel)   #watchfx  non-blocking transformation effects
// A new selector layout = one entry in SELECTORS. A new effect = one entry in TRANSFORM_FX. A new watch = data only.
// ============================================================================================
const SW = 480,
  SH = 270;
const eo = (p) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
const lerp = (a, b, t) => a + (b - a) * t;
const buzz = (ms) => {
  try {
    if (navigator.vibrate && getWatch().haptics) navigator.vibrate(ms);
  } catch (e) {}
};
// Sound that belongs to a state of a sequence (the watch resolves the real recipe via playWatchSFX).
const STATE_SFX = {
  OS_BUTTON_PRESS: 'activate', OS_DIAL_RAISE: 'raise', OS_DISPLAY: 'open', OS_SLAM: 'slam', OS_FLASH: 'transform',
  AF_ACTIVATE: 'activate', AF_CORE_RISE: 'raise', AF_HOLOGRAM_IN: 'hologram_in', AF_CONFIRM: 'confirm', AF_FLASH: 'transform',
  UA_ACTIVATE: 'activate', UA_UNFOLD: 'open', UA_CONFIRM: 'confirm', UA_FLASH: 'transform',
  OV_ACTIVATE: 'activate', OV_OPEN: 'open', OV_CONFIRM: 'confirm', OV_INPUT: 'select', OV_FLASH: 'transform',
  ULTIMATE_TRIGGER: 'ultimate.activate', ULTIMATE_MECHANICAL: 'ultimate.mechanical', ULTIMATE_CHARGE: 'ultimate.charge',
  ULTIMATE_FLASH: 'ultimate.transform', ULTIMATE_REVERT: 'ultimate.revert',
};

// ---------------- drawing helpers ----------------
function symbol(g, shape, cx, cy, s, color, fill = true) {
  g.save();
  g.fillStyle = g.strokeStyle = color;
  g.lineWidth = Math.max(2, s / 6);
  g.beginPath();
  if (shape === 'hourglass') {
    g.moveTo(cx - s, cy - s); g.lineTo(cx + s, cy - s); g.lineTo(cx, cy); g.closePath();
    g.moveTo(cx - s, cy + s); g.lineTo(cx + s, cy + s); g.lineTo(cx, cy); g.closePath();
    g.fill();
  } else if (shape === 'ring') {
    g.arc(cx, cy, s, 0, 7); g.stroke();
    g.beginPath(); g.arc(cx, cy, s * 0.35, 0, 7); g.fill();
  } else if (shape === 'diamond') {
    g.moveTo(cx, cy - s * 1.2); g.lineTo(cx + s, cy); g.lineTo(cx, cy + s * 1.2); g.lineTo(cx - s, cy); g.closePath();
    fill ? g.fill() : g.stroke();
  } else if (shape === 'bio') { // Biomnitrix: two overlapping cells
    g.arc(cx - s * 0.45, cy, s * 0.7, 0, 7); g.stroke();
    g.beginPath(); g.arc(cx + s * 0.45, cy, s * 0.7, 0, 7); g.stroke();
    g.beginPath(); g.arc(cx, cy, s * 0.28, 0, 7); g.fill();
  } else {
    g.arc(cx, cy, s, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(cx - s * 0.6, cy - s * 0.6); g.lineTo(cx + s * 0.6, cy - s * 0.6); g.lineTo(cx, cy); g.lineTo(cx + s * 0.6, cy + s * 0.6); g.lineTo(cx - s * 0.6, cy + s * 0.6); g.lineTo(cx, cy); g.closePath(); g.fill();
  }
  g.restore();
}
// 0.16.1: the watch sits on Ben's wrist like in the show — forearm, sleeve, strap and a chunky case per watch
const WATCH_BODY = {
  prototype: { case: '#c9cfcb', rim: '#7f8a86', strap: '#1c1f22', prong: '#2f3a35', shape: 'round', sleeve: '#2f6d3a' },
  recalibrated: { case: '#17201c', rim: '#3d4a44', strap: '#111518', prong: '#7dff9a', shape: 'slim', sleeve: '#2f6d3a' },
  ultimatrix: { case: '#262b2e', rim: '#5d666a', strap: '#14171a', prong: '#7dff9a', shape: 'prongs', sleeve: '#2f6d3a' },
  albedo: { case: '#2b2224', rim: '#6a4a4e', strap: '#171214', prong: '#ff4d4d', shape: 'prongs', sleeve: '#6d2f34' },
  completed: { case: '#e8ecea', rim: '#7d8784', strap: '#1a1d20', prong: '#2a302d', shape: 'round', sleeve: '#2f6d3a' },
  biomnitrix: { case: '#24331b', rim: '#6c8f3e', strap: '#18200f', prong: '#b6ff4d', shape: 'organic', sleeve: '#2f6d3a' },
};
// 0.16.2: hand-made watch art (tools/import_watch_layers.py) replaces the drawn watch when it exists
const WL = window.OMNI_WATCH_LAYERS || {};
const wlImg = {};
// profile.json "sfx": switch a watch's sound set without touching its art or animations
for (const id in WL) if (WL[id].profile && WL[id].profile.sfx && WATCHES[id]) WATCHES[id].sfxProfile = WL[id].profile.sfx;
// profile.json in the art folder can point a watch at another watch's art ("art") or animations ("anim")
const wlSrc = (id, kind) => (WL[id] && WL[id].profile && WL[id].profile[kind] && WL[WL[id].profile[kind]] ? WL[id].profile[kind] : id);
function wlGet(id, layer) {
  id = wlSrc(id, layer.startsWith('strip_') ? 'anim' : 'art');
  const L = WL[id] && WL[id][layer];
  if (!L) return null;
  const k = id + layer;
  if (!wlImg[k]) { wlImg[k] = new Image(); wlImg[k].src = L.src; }
  return imgReady(wlImg[k]) ? wlImg[k] : null;
}
// animation strip: { img, frames, fw, fh, fps } or null
function wlStrip(id, kind) {
  const img = wlGet(id, 'strip_' + kind);
  if (!img) return null;
  const L = WL[wlSrc(id, 'anim')]['strip_' + kind];
  return { img, frames: L.frames, fw: L.fw, fh: L.fh, fps: L.fps };
}
// draw frame p (0..1) of a strip at the same scale/centre as the body art (strap vertical in the art -> along the arm)
function drawStripFrame(g, st, p, cx, cy, r) {
  const i = Math.min(st.frames - 1, Math.max(0, Math.floor(p * st.frames))), S = r * 5.0;
  g.save(); g.imageSmoothingEnabled = true; g.translate(cx, cy); g.rotate(Math.PI / 2);
  g.drawImage(st.img, i * st.fw, 0, st.fw, st.fh, -S / 2, -S / 2, S, S);
  g.restore();
}
// Biomnitrix: two linked devices (body_left / body_right) drawn side by side along the forearm
function wristPair(g, w, cx, cy, r) {
  const L = wlGet(w.id, 'body_left'), R = wlGet(w.id, 'body_right');
  if (!L || !R) return false;
  const S = r * 3.4;
  forearm(g, w, cy, r);
  g.save(); g.imageSmoothingEnabled = true;
  [[L, -1], [R, 1]].forEach(([img, side]) => {
    g.save(); g.translate(cx + side * r * 1.25, cy); g.rotate(Math.PI / 2);
    g.drawImage(img, -S / 2, -(S * img.height) / img.width / 2, S, (S * img.height) / img.width);
    g.restore();
  });
  g.restore();
  return true;
}
function wristLayers(g, w, cx, cy, r, glow) {
  const body = wlGet(w.id, 'body');
  if (!body) return wristPair(g, w, cx, cy, r);
  const S = r * 5.0; // body art: the watch face is about 35% of the image width
  g.save();
  forearm(g, w, cy, r);
  g.imageSmoothingEnabled = true;
  // the art is drawn strap-vertical; on the wrist the strap runs along the arm, so turn it 90 degrees
  g.save(); g.translate(cx, cy); g.rotate(Math.PI / 2);
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 12;
  g.drawImage(body, -S / 2, -(S * body.height) / body.width / 2, S, (S * body.height) / body.width);
  g.restore();
  const dial = wlGet(w.id, 'dial');
  if (dial) {
    const ds = r * 2.6, rot = sel ? (sel.pos || 0) * ((Math.PI * 2) / Math.max(6, sel.list.length)) : 0;
    g.save(); g.translate(cx, cy); g.rotate(rot);
    g.drawImage(dial, -ds / 2, -ds / 2, ds, ds);
    g.restore();
  }
  g.restore();
  return true;
}
function forearm(g, w, cy, r) {
  const b = WATCH_BODY[w.id] || WATCH_BODY.completed,
    ay = cy - r * 0.75, ah = r * 1.5;
  const skin = g.createLinearGradient(0, ay, 0, ay + ah);
  skin.addColorStop(0, '#f2c7a0'); skin.addColorStop(0.55, '#d9a57c'); skin.addColorStop(1, '#a8714f');
  g.fillStyle = skin;
  g.beginPath(); g.moveTo(40, ay + 4); g.quadraticCurveTo(SW / 2, ay - 6, SW + 10, ay + 10); g.lineTo(SW + 10, ay + ah + 6); g.quadraticCurveTo(SW / 2, ay + ah + 10, 40, ay + ah); g.closePath(); g.fill();
  g.fillStyle = b.sleeve;
  g.beginPath(); g.moveTo(-10, ay - 8); g.lineTo(78, ay - 4); g.lineTo(70, ay + ah + 8); g.lineTo(-10, ay + ah + 12); g.closePath(); g.fill();
}
function wristBody(g, w, cx, cy, r, glow) {
  if (wristLayers(g, w, cx, cy, r, glow)) return;
  const b = WATCH_BODY[w.id] || WATCH_BODY.completed,
    R = r * 1.3;
  g.save();
  // forearm across the bottom of the screen, jacket sleeve on the left
  const ay = cy - r * 0.75, ah = r * 1.5;
  const skin = g.createLinearGradient(0, ay, 0, ay + ah);
  skin.addColorStop(0, '#f2c7a0'); skin.addColorStop(0.55, '#d9a57c'); skin.addColorStop(1, '#a8714f');
  g.fillStyle = skin;
  g.beginPath(); g.moveTo(40, ay + 4); g.quadraticCurveTo(SW / 2, ay - 6, SW + 10, ay + 10); g.lineTo(SW + 10, ay + ah + 6); g.quadraticCurveTo(SW / 2, ay + ah + 10, 40, ay + ah); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(70,35,20,.55)'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = b.sleeve;
  g.beginPath(); g.moveTo(-10, ay - 8); g.lineTo(78, ay - 4); g.lineTo(70, ay + ah + 8); g.lineTo(-10, ay + ah + 12); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(60, ay - 4, 6, ah + 10);
  // strap
  g.fillStyle = b.strap;
  g.fillRect(cx - R * 1.25, ay - 2, R * 2.5, ah + 4);
  g.fillStyle = 'rgba(255,255,255,.07)';
  for (let x = cx - R * 1.2; x < cx + R * 1.2; x += 9) g.fillRect(x, ay, 2, ah);
  // case
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 10;
  g.fillStyle = b.case;
  g.beginPath();
  if (b.shape === 'prongs') {
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      g.save(); g.translate(cx, cy); g.rotate(a);
      g.fillStyle = b.rim; g.fillRect(R * 0.75, -r * 0.28, R * 0.45, r * 0.56);
      g.fillStyle = b.prong; g.globalAlpha = 0.5 + 0.5 * glow; g.fillRect(R * 1.05, -r * 0.16, R * 0.1, r * 0.32); g.globalAlpha = 1;
      g.restore();
    }
    g.beginPath(); g.arc(cx, cy, R, 0, 7);
  } else if (b.shape === 'slim') {
    g.ellipse(cx, cy, R * 1.05, R * 0.92, 0, 0, 7);
  } else if (b.shape === 'organic') {
    for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2, rr = R * (1 + 0.07 * Math.sin(a * 5)); g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  } else {
    g.arc(cx, cy, R, 0, 7);
  }
  g.fillStyle = b.case; g.fill();
  g.shadowBlur = 0;
  g.lineWidth = 3; g.strokeStyle = b.rim; g.stroke();
  // side buttons / dial notches
  g.fillStyle = b.rim;
  for (const [dx, dy] of [[-1, 0], [1, 0]]) g.fillRect(cx + dx * (R + 2) - 5, cy + dy - 6, 10, 12);
  if (b.shape === 'round' || b.shape === 'slim') {
    g.fillStyle = b.prong;
    for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + (k * Math.PI) / 2; g.beginPath(); g.arc(cx + Math.cos(a) * R * 0.84, cy + Math.sin(a) * R * 0.84, r * 0.11, 0, 7); g.fill(); }
  }
  // inner dark well + glow ring in the watch colour
  g.beginPath(); g.arc(cx, cy, r * 1.08, 0, 7); g.fillStyle = '#060a08'; g.fill();
  g.shadowColor = w.color; g.shadowBlur = 8 + glow * 18; g.lineWidth = 2.5; g.strokeStyle = w.color; g.stroke();
  g.restore();
}
function face(g, cx, cy, r, w, press = 0, glow = 0) {
  wristBody(g, w, cx, cy, r, glow);
  const act = wlStrip(w.id, 'activate'), since = sel && sel.opened ? (performance.now() - sel.opened) / 1000 : 9;
  if (act) { // hand-made activation strip plays when the dial opens, then rests on its last frame
    const dur = act.frames / (act.fps || 10);
    drawStripFrame(g, act, Math.min(0.999, since / dur), cx, cy, r);
    return;
  }
  const core = wlGet(w.id, 'core') || wlGet(w.id, 'core_left');
  if (core) { // hand-made core: boots up when the dial opens, glows and presses down on the slam
    const boot = sel && sel.opened ? Math.min(1, (performance.now() - sel.opened) / 550) : 1;
    drawCoreAnim(g, core, cx, cy, r * 2 * (1 - press * 0.15), w.color, { boot, glow, ring: boot < 1 ? boot : 0 });
    return;
  }
  if (drawWatchLogo(g, w, cx, cy, r * 2.6 * (1 - press * 0.12), glow > 0.5)) return; // the watch's own mark (part-23)
  g.save();
  const k = 1 - press * 0.12;
  g.beginPath(); g.arc(cx, cy, r * k, 0, 7);
  g.fillStyle = '#10171a'; g.fill();
  g.lineWidth = 3; g.strokeStyle = w.color; g.shadowColor = w.color; g.shadowBlur = 6 + glow * 14; g.stroke();
  g.shadowBlur = 0;
  symbol(g, w.shape, cx, cy, r * 0.42 * k, w.color);
  g.restore();
}
function txtc(g, t, x, y, size, color, align = 'center') {
  g.font = 'bold ' + size + 'px Arial';
  g.textAlign = align;
  g.fillStyle = color;
  g.fillText(t, x, y);
}
function title(g, s, hint) {
  txtc(g, s.w.name.toUpperCase(), 14, 20, 11, s.w.color, 'left');
  txtc(g, s.w.tagline, 14, 33, 8, '#9fb2b4', 'left');
  if (hint) {
    g.save(); g.font = 'bold 8px Arial';
    const tw = g.measureText(hint).width + 16;
    g.fillStyle = 'rgba(2,8,5,.82)'; g.fillRect(SW / 2 - tw / 2, 256, tw, 12);
    g.strokeStyle = s.w.color; g.globalAlpha = 0.5; g.strokeRect(SW / 2 - tw / 2, 256, tw, 12); g.restore();
    txtc(g, hint, SW / 2, 265, 8, '#d6e8da');
  }
}
function aname(g, s, y, color) {
  const id = s.list[((Math.round(s.pos) % s.list.length) + s.list.length) % s.list.length];
  txtc(g, ALIENS[id].name.toUpperCase(), SW / 2, y, 13, color || '#eaf6ea');
  txtc(g, 'MAESTRÍA ' + Math.floor(player.masteries[id] || 0) + '%', SW / 2, y + 12, 8, '#a9bbbd');
}
function flashRect(g, color, a) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = Math.min(1, a); g.fillStyle = color; g.fillRect(0, 0, SW, SH); g.restore();
}
function ringTicks(g, cx, cy, r, n, rot, color, len = 6) {
  g.save(); g.strokeStyle = color; g.lineWidth = 2; g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + (i * Math.PI * 2) / n;
    g.moveTo(cx + Math.cos(a) * (r - len), cy + Math.sin(a) * (r - len));
    g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  g.stroke(); g.restore();
}
const wrapI = (i, n) => ((i % n) + n) % n;

// ============================ SELECTOR LAYOUTS ============================
const SELECTORS = {};
// ---- RING: Prototype. Button press -> dial raises -> black silhouettes on a green display -> rotate -> slam ----
SELECTORS.ring = {
  rate: 12,
  region(s, x, y) {
    if (Math.hypot(x - 240, y - 232) < 38) return 'core';
    if (y < 96 && x > 150 && x < 330) return 'alien:' + Math.round(s.pos);
    if (x < 150 && y > 90 && y < 215) return 'left';
    if (x > 330 && y > 90 && y < 215) return 'right';
    return 'bg';
  },
  draw(g, s, now) {
    const w = s.w, st = s.state, p = s.p, n = s.list.length;
    const open = st === 'OS_BUTTON_PRESS' ? 0 : st === 'OS_DIAL_RAISE' ? eo(p) : 1;
    const cy = 232 - 80 * open;
    // raised dial with the rotating green display
    if (open > 0) {
      g.save();
      // the dial core rises out of the watch on a metal collar (show-style pop-up)
      const cg = g.createLinearGradient(196, 0, 284, 0);
      cg.addColorStop(0, '#59615d'); cg.addColorStop(0.5, '#d9dfdb'); cg.addColorStop(1, '#59615d');
      g.fillStyle = cg; g.fillRect(212, cy, 56, 232 - cy);
      g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = cy + 6; y < 226; y += 7) g.fillRect(212, y, 56, 2);
      const raised = wlGet(w.id, 'raised');
      if (raised) { const rs = (60 + open * 10) * 2.3; g.drawImage(raised, 240 - rs / 2, cy - rs / 2, rs, rs); }
      else { g.beginPath(); g.arc(240, cy, 60 + open * 10, 0, 7); g.fillStyle = '#c9cfcb'; g.fill(); }
      g.lineWidth = 3; g.strokeStyle = '#7f8a86'; g.stroke();
      g.beginPath(); g.arc(240, cy, 52 + open * 10, 0, 7); g.fillStyle = '#17241d'; g.fill();
      g.lineWidth = 3; g.strokeStyle = w.color; g.stroke();
      g.save(); g.beginPath(); g.arc(240, cy, 46 + open * 8, 0, 7); g.clip();
      g.fillStyle = '#86d79a'; g.fillRect(0, 0, SW, SH);
      g.fillStyle = '#6fc486'; for (let y = 0; y < SH; y += 4) g.fillRect(0, y, SW, 1);
      const sa = st === 'OS_DIAL_RAISE' || st === 'OS_BUTTON_PRESS' ? 0 : st === 'OS_DISPLAY' ? p : 1;
      for (let k = -2; k <= 3; k++) {
        const i = Math.floor(s.pos) + k, d = i - s.pos;
        if (Math.abs(d) > 1.6) continue;
        drawWatchIcon(g, s.list[wrapI(i, n)], 'os-silhouette', 240 + d * 76, cy + 2, Math.round(lerp(76, 36, Math.min(1, Math.abs(d)))), sa * (1 - Math.abs(d) * 0.45));
      }
      g.restore();
      ringTicks(g, 240, cy, 58 + open * 4, 24, s.pos * ((Math.PI * 2) / Math.max(n, 1)), w.color, 7);
      g.restore();
    }
    const press = st === 'OS_SLAM' ? Math.sin(Math.min(1, p) * Math.PI * 0.5 + 0.2) : st === 'OS_BUTTON_PRESS' ? Math.sin(p * Math.PI) : 0;
    face(g, 240, 232, 36, w, press, st === 'OS_SLAM' ? 1 : 0);
    // side button pressed during OS_BUTTON_PRESS
    g.fillStyle = w.color; g.fillRect(279 + (st === 'OS_BUTTON_PRESS' ? Math.sin(p * Math.PI) * 4 : 0), 222, 8, 14);
    title(g, s, st === 'OS_ROTATE' ? '◀ ▶ elige · ENTER / ESPACIO / clic transforma · ESC cierra' : '');
    if (st === 'OS_ROTATE' || st === 'OS_SELECTED') aname(g, s, 60 + 0, '#dff7e3');
    if (st === 'OS_ROTATE') txtc(g, '¡Puede fallar! (10%)', SW - 14, 20, 8, '#ffd27a', 'right');
    if (st === 'OS_FLASH') flashRect(g, '#caffd6', 1 - p * 0.35);
    if (st === 'OS_TRANSFORM') flashRect(g, '#caffd6', 0.65 * (1 - p));
  },
};
// ---- STRIP: Recalibrated. Core rises, green holograms in a scroll line, confirm, then press the core ----
SELECTORS.strip = {
  rate: 14,
  region(s, x, y) {
    if (Math.hypot(x - 240, y - 232) < 36) return 'core';
    if (y > 50 && y < 190) {
      const d = Math.round((x - 240) / 120);
      if (Math.abs(d) <= 1 && Math.abs(x - 240 - d * 120) < 52) return d === 0 ? 'alien:' + Math.round(s.pos) : 'alien:' + (Math.round(s.pos) + d);
      return x < 240 ? 'left' : 'right';
    }
    return 'bg';
  },
  draw(g, s, now) {
    const w = s.w, st = s.state, p = s.p, n = s.list.length;
    const rise = st === 'AF_ACTIVATE' ? 0 : st === 'AF_CORE_RISE' ? eo(p) : 1;
    const holo = st === 'AF_ACTIVATE' || st === 'AF_CORE_RISE' ? 0 : st === 'AF_HOLOGRAM_IN' ? eo(p) : 1;
    // light pillar from the core
    if (rise > 0) {
      g.save();
      const grd = g.createLinearGradient(0, 232, 0, 232 - 150 * rise);
      grd.addColorStop(0, 'rgba(120,255,160,.55)'); grd.addColorStop(1, 'rgba(120,255,160,0)');
      g.fillStyle = grd;
      g.beginPath(); g.moveTo(222, 232); g.lineTo(258, 232); g.lineTo(300 + 20 * rise, 232 - 150 * rise); g.lineTo(180 - 20 * rise, 232 - 150 * rise); g.closePath(); g.fill();
      g.restore();
    }
    // hologram cards
    for (let k = -2; k <= 3; k++) {
      const i = Math.floor(s.pos) + k, d = i - s.pos, ad = Math.abs(d);
      if (ad > 1.7) continue;
      const sz = Math.round(lerp(96, 48, Math.min(1, ad))) * (0.55 + 0.45 * holo),
        flick = 0.88 + 0.12 * Math.sin(now / 38 + i);
      drawWatchIcon(g, s.list[wrapI(i, n)], 'af-hologram', 240 + d * 120, 120 - rise * 0 + Math.sin(now / 420 + i) * 2, sz, holo * (1 - ad * 0.5) * flick);
    }
    if (holo > 0.5) {
      // brackets around the centre card
      g.save(); g.strokeStyle = s.locked ? '#eaffee' : '#7dff9a'; g.lineWidth = 2; g.globalAlpha = holo;
      const bx = 188, by = 66, bw = 104, bh = 104, L = 14;
      for (const [x0, y0, sx, sy] of [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]]) {
        g.beginPath(); g.moveTo(x0, y0 + sy * L); g.lineTo(x0, y0); g.lineTo(x0 + sx * L, y0); g.stroke();
      }
      g.restore();
      aname(g, s, 174, s.locked ? '#eaffee' : '#aaffbd');
      txtc(g, '◀', 70, 125, 22, '#7dff9a'); txtc(g, '▶', SW - 70, 125, 22, '#7dff9a');
    }
    const pressed = st === 'AF_CONFIRM' ? Math.sin(p * Math.PI) : 0;
    face(g, 240, 232, 32, w, pressed, rise * 0.6 + (s.locked ? 0.8 + 0.3 * Math.sin(now / 120) : 0));
    // the core visibly lifts when risen
    if (rise > 0) { g.save(); g.fillStyle = w.color; g.globalAlpha = 0.5 * rise; g.beginPath(); g.ellipse(240, 232 - 34 * rise, 18, 6, 0, 0, 7); g.fill(); g.restore(); }
    title(g, s, st === 'AF_SCROLL' || st === 'AF_SELECTED' ? '◀ ▶ elige · ENTER / ESPACIO / clic transforma · ESC cierra' : '');
    if (st === 'AF_FLASH') flashRect(g, '#b8ffd0', 1 - p * 0.35);
    if (st === 'AF_TRANSFORM') flashRect(g, '#b8ffd0', 0.65 * (1 - p));
  },
};
// ---- SLIDER: Ultimatrix. Mechanical brackets unfold, big red card with a scrub bar ----
SELECTORS.slider = {
  rate: 10,
  region(s, x, y) {
    if (Math.hypot(x - 240, y - 238) < 30) return 'core';
    if (y > 192 && y < 214 && x > 80 && x < 400) return 'bar:' + (((x - 90) / 300) * (s.list.length - 1));
    if (x > 70 && x < 410 && y > 62 && y < 190) return x < 160 ? 'left' : x > 320 ? 'right' : 'alien:' + Math.round(s.pos);
    return 'bg';
  },
  draw(g, s, now) {
    const w = s.w, st = s.state, p = s.p, n = s.list.length;
    const unfold = st === 'UA_ACTIVATE' ? 0 : st === 'UA_UNFOLD' ? eo(p) : 1;
    const pulse = st === 'UA_ACTIVATE' ? p : 1;
    const half = 170 * unfold;
    g.save();
    g.fillStyle = '#150d0c'; g.fillRect(240 - half, 72, half * 2, 118);
    g.strokeStyle = w.color; g.lineWidth = 2; g.strokeRect(240 - half, 72, half * 2, 118);
    for (const sx of [-1, 1]) { // mechanical clamps
      g.fillStyle = w.color; g.fillRect(240 + sx * half - (sx > 0 ? 8 : 0), 62, 8, 138);
      g.fillStyle = '#2a1512'; for (let y = 70; y < 196; y += 14) g.fillRect(240 + sx * half - (sx > 0 ? 6 : -2), y, 4, 6);
    }
    g.restore();
    if (unfold > 0.8) {
      for (let k = -1; k <= 2; k++) {
        const i = Math.floor(s.pos) + k, d = i - s.pos, ad = Math.abs(d);
        if (ad > 1.4) continue;
        drawWatchIcon(g, s.list[wrapI(i, n)], 'ua-red', 240 + d * 130, 130, Math.round(lerp(104, 48, Math.min(1, ad))), 1 - ad * 0.55);
      }
      aname(g, s, 182, '#ffd2c4');
      txtc(g, '◀', 96, 134, 22, w.color); txtc(g, '▶', SW - 96, 134, 22, w.color);
      // scrub bar
      g.fillStyle = '#2a1512'; g.fillRect(90, 203, 300, 4);
      g.fillStyle = w.color;
      for (let i = 0; i < n; i++) g.fillRect(90 + (i / Math.max(1, n - 1)) * 300 - 1, 199, 2, 12);
      const hx = 90 + (wrapI(s.pos, n) / Math.max(1, n - 1)) * 300;
      g.fillRect(hx - 5, 196, 10, 18);
    }
    const pressed = st === 'UA_CONFIRM' ? Math.sin(p * Math.PI) : 0;
    face(g, 240, 238, 28, w, pressed, pulse * 0.6);
    title(g, s, st === 'UA_SELECT' ? '◀ ▶ elige · ENTER / ESPACIO / clic transforma · ESC cierra' : '');
    if (st === 'UA_FLASH') flashRect(g, '#ffb08a', 1 - p * 0.35);
    if (st === 'UA_TRANSFORM') flashRect(g, '#ffb08a', 0.65 * (1 - p));
  },
};
// ---- WHEEL: Completed. Faceplate opens (10 steps), core rises, procedural holographic alien wheel ----
SELECTORS.wheel = {
  rate: 14,
  CX: 240, CY: 112, R: 80,
  region(s, x, y) {
    const d = Math.hypot(x - this.CX, y - this.CY);
    if (Math.hypot(x - 240, y - 242) < 28) return 'core';
    if (d < this.R + 34) {
      // nearest icon by angle
      const n = Math.min(s.list.length, 9), a = Math.atan2(y - this.CY, x - this.CX);
      let best = -1, bd = 9;
      for (let i = Math.round(s.pos) - Math.ceil(n / 2); i <= Math.round(s.pos) + Math.ceil(n / 2); i++) {
        const ia = -Math.PI / 2 + ((i - s.pos) * Math.PI * 2) / n, df = Math.abs(Math.atan2(Math.sin(a - ia), Math.cos(a - ia)));
        if (df < bd) { bd = df; best = i; }
      }
      if (d > 36 && best >= -999) return 'alien:' + best;
      return 'wheel';
    }
    return 'bg';
  },
  draw(g, s, now) {
    const w = s.w, st = s.state, N = s.list.length, n = Math.min(N, 9), CX = this.CX, CY = this.CY; // long rosters: only 9 icons on the wheel at a time
    // OV_OPEN is stepped like a 10-frame pixel animation
    const frame = st === 'OV_ACTIVATE' ? 0 : st === 'OV_OPEN' ? Math.min(9, Math.floor((s.t / s.dur) * 10)) : 9;
    const plate = frame <= 2 ? frame / 2 : 1; // faceplate halves slide apart
    const riseF = frame < 3 ? 0 : frame <= 5 ? (frame - 2) / 3 : 1;
    const wheelF = frame < 6 ? 0 : (frame - 5) / 4;
    const R = this.R * wheelF;
    // faceplate (two halves) + core
    const cy0 = 242;
    g.save();
    g.fillStyle = '#0f1719'; g.strokeStyle = w.color; g.lineWidth = 2;
    for (const sx of [-1, 1]) {
      g.beginPath(); g.arc(240 + sx * plate * 24, cy0, 28, sx < 0 ? Math.PI / 2 : -Math.PI / 2, sx < 0 ? (Math.PI * 3) / 2 : Math.PI / 2); g.closePath(); g.fill(); g.stroke();
    }
    g.restore();
    const coreY = cy0 - riseF * 18, coreP = st === 'OV_INPUT' ? 1 : 0;
    if (frame >= 2) face(g, 240, coreY, 20, w, coreP, riseF);
    if (wheelF > 0) {
      g.save();
      g.globalAlpha = 0.9 * wheelF;
      g.strokeStyle = w.color; g.lineWidth = 1;
      g.beginPath(); g.arc(CX, CY, R + 22, 0, 7); g.stroke();
      g.setLineDash([2, 6]); g.beginPath(); g.arc(CX, CY, Math.max(0, R - 24), 0, 7); g.stroke(); g.setLineDash([]);
      ringTicks(g, CX, CY, R + 22, 36, now / 4000 + s.pos * 0.2, w.color, 4);
      g.restore();
      // procedural wheel: icons are repositioned mathematically, no extra frames
      const order = [];
      for (let i = Math.floor(s.pos) - n; i <= Math.floor(s.pos) + n; i++) {
        const k = i - s.pos;
        if (Math.abs(k) <= n / 2 + 0.01) order.push(i);
      }
      order.sort((a, b) => Math.abs(b - s.pos) - Math.abs(a - s.pos)); // far first, selected last (on top)
      for (const i of order) {
        const ang = -Math.PI / 2 + ((i - s.pos) * Math.PI * 2) / n,
          near = (1 + Math.cos(ang + Math.PI / 2)) / 2,
          id = s.list[wrapI(i, N)],
          sz = Math.round(lerp(20, 52, near * near)),
          x = CX + Math.cos(ang) * R, y = CY + Math.sin(ang) * R;
        drawWatchIcon(g, id, 'ov-icon', x, y, sz, wheelF * lerp(0.5, 1, near));
        if (getWatch().favorites && (player.watchFav || []).includes(id)) txtc(g, '★', x + sz / 2 - 2, y - sz / 2 + 8, 11, '#ffe27a');
      }
      // centre read-out
      g.save(); g.globalAlpha = wheelF;
      g.beginPath(); g.arc(CX, CY, 28, 0, 7); g.fillStyle = 'rgba(8,20,26,.8)'; g.fill();
      g.lineWidth = 2; g.strokeStyle = s.locked ? '#ffffff' : w.color; g.stroke();
      const sid = s.list[wrapI(Math.round(s.pos), N)];
      g.restore();
      if (frame >= 9) {
        txtc(g, ALIENS[sid].name.toUpperCase(), CX, CY + 3, 8, s.locked ? '#fff' : '#d9f6ff');
        txtc(g, Math.floor(player.masteries[sid] || 0) + '%', CX, CY + 14, 7, '#9fb8c0');
        if (s.locked) txtc(g, 'CONFIRMADO · PULSA EL RELOJ ▼', SW - 14, 33, 8, '#ffffff', 'right');
      }
    }
    title(g, s, st === 'OV_WHEEL' ? '◀ ▶ / rueda elige · ENTER / ESPACIO / clic transforma · F ★ · ESC cierra' : '');
    if (st === 'OV_FLASH') flashRect(g, '#d8fbff', 1 - s.p * 0.4);
    if (st === 'OV_TRANSFORM') flashRect(g, '#d8fbff', 0.6 * (1 - s.p));
  },
  down(s, x, y) {
    const d = Math.hypot(x - this.CX, y - this.CY);
    if (d < this.R + 34 && d > 20 && s.interactive) s.drag = { a0: Math.atan2(y - this.CY, x - this.CX), p0: s.pos, moved: false, last: Math.round(s.pos) };
  },
  move(s, x, y) {
    if (!s.drag) return;
    const a = Math.atan2(y - this.CY, x - this.CX),
      da = Math.atan2(Math.sin(a - s.drag.a0), Math.cos(a - s.drag.a0)),
      n = Math.min(s.list.length, 9);
    if (Math.abs(da) > 0.12) s.drag.moved = true;
    if (s.drag.moved) {
      s.pos = s.target = s.drag.p0 - da / ((Math.PI * 2) / n);
      const r = Math.round(s.pos);
      if (r !== s.drag.last) { s.drag.last = r; playWatchSFX('scroll'); buzz(8); syncSelection(s); }
    }
  },
  up(s) {
    const d = s.drag;
    s.drag = null;
    if (d && d.moved) { s.target = Math.round(s.pos); return true; } // consumed by the drag
    return false;
  },
};

// ============================ SELECTOR CONTROLLER ============================
let sel = null;
const selActive = () => !!sel;
function selIndex(s) {
  return wrapI(Math.round(s.target), s.list.length);
}
function syncSelection(s) {
  if (s.mode === 'transform' && !s.fuseA) player.selected = s.list[wrapI(Math.round(s.target), s.list.length)];
}
function selEnter(s) {
  const st = s.seq[s.si];
  s.state = st[0]; s.dur = st[1] * (s.phase === 'open' ? 0.55 : 0.8); s.t = 0; s.p = 0; // snappier than the first version
  s.interactive = st[1] === 0;
  if (STATE_SFX[s.state]) playWatchSFX(STATE_SFX[s.state]);
  if (st[2] && st[2].commit) selCommit(s);
}
function selCommit(s) {
  const id = s.list[selIndex(s)];
  if (s.mode === 'swap') watchSwap(id);
  else {
    if (s.w.fusion) dualCommit(s); // Biomnitrix: A = body, B = partner (same alien twice = no fusion)
    else player.selected = id;
    transform({ fromSelector: true });
  }
}
function selClose() {
  if (!sel) return;
  sel = null;
  $('#watchsel').classList.add('hidden');
  dialDockApply();
  last = performance.now();
  hud();
}
function openSelector() {
  if (sel || !omniActive() || !started || paused || dialogOpen || net.waiting || seqBusy()) return;
  const w = getWatch();
  let mode = 'transform';
  if (player.alien) {
    if (!quickSwapCfg()) return toast('Vuelve a humano para cambiar el dial'), playWatchSFX('invalid');
    if (player.swapCool > 0) return toast('Cambio rápido en ' + Math.ceil(player.swapCool) + ' s'), playWatchSFX('invalid');
    mode = 'swap';
  } else if (player.battery <= 0) return toast('Batería vacía · Recupera un poco de carga'), playWatchSFX('error');
  const list = mode === 'swap' ? favoriteList() : watchPlaylist();
  let idx = list.indexOf(mode === 'swap' ? player.activeAlien : player.selected);
  if (idx < 0) idx = 0;
  resetInput();
  held = -1;
  sel = { opened: performance.now(), w, mode, list, pos: idx, target: idx, locked: false, phase: 'open', seq: w.sequence.open.slice(), si: 0, drag: null, state: '', t: 0, dur: 0, p: 0, interactive: false, lastIdx: idx };
  selEnter(sel);
  $('#watchsel').classList.remove('hidden');
  $('#watchsel').dataset.watch = w.id;
  dialDockApply();
}
function selMove(d) {
  const s = sel;
  if (!s || !s.interactive) return;
  if (s.list.length < 2) return;
  s.target = Math.round(s.target) + d;
  s.locked = false;
  playWatchSFX('scroll');
  buzz(8);
  syncSelection(s);
}
function selGoto(i) {
  const s = sel;
  if (!s || !s.interactive) return;
  const cur = Math.round(s.target);
  if (i === cur) return selConfirm();
  s.target = i;
  s.locked = false;
  playWatchSFX('scroll');
  buzz(8);
  syncSelection(s);
}
function selConfirm(press) {
  const s = sel;
  if (!s || !s.interactive) return;
  if (s.w.fusion && s.mode === 'transform' && dualConfirm(s)) return;
  if (s.w.twoStep && !s.locked && !press) {
    s.locked = true;
    playWatchSFX('select');
    buzz(14);
    return;
  }
  s.phase = 'confirm';
  s.seq = s.w.sequence.confirm.slice();
  s.si = 0;
  selEnter(s);
}
function selCancel() {
  if (!sel || (sel.phase === 'confirm' && !sel.interactive)) return;
  if (sel.locked && sel.interactive) { sel.locked = false; playWatchSFX('cancel'); return; }
  if (sel.interactive && dualCancel(sel)) return;
  playWatchSFX('cancel');
  selClose();
}
function selFav() {
  const s = sel;
  if (!s || !s.w.favorites) return;
  const id = s.list[selIndex(s)],
    f = (player.watchFav = player.watchFav || []),
    i = f.indexOf(id);
  i >= 0 ? f.splice(i, 1) : f.push(id);
  playWatchSFX('fav' in (SFX[s.w.sfxProfile] || {}) ? 'fav' : 'confirm');
  save();
}
function selTick(dt) {
  const s = sel;
  if (!s) return;
  if (paused || dialogOpen || !started || player.alien !== (s.mode === 'swap')) return selClose();
  const kind = SELECTORS[s.w.selector.type];
  if (!s.drag) s.pos += (s.target - s.pos) * Math.min(1, dt * kind.rate);
  s.t += dt;
  if (s.dur > 0) {
    s.p = Math.min(1, s.t / s.dur);
    if (s.t >= s.dur) {
      s.si++;
      if (s.si >= s.seq.length) return selClose();
      selEnter(s);
    }
  } else s.p = 1;
  const g = $('#watchsel').getContext('2d');
  const mini = miniDial(s), cw = mini ? MINI_W * 2 : 960, chh = mini ? MINI_H * 2 : 540;
  if (g.canvas.width !== cw || g.canvas.height !== chh) { g.canvas.width = cw; g.canvas.height = chh; }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  if (mini) { // 0.17: just the watch face with the dial on it (part-40)
    g.setTransform(2, 0, 0, 2, 0, 0);
    try { miniDraw(g, s, performance.now()); } catch (e) { console.warn('mini dial', e); }
    return;
  }
  g.setTransform(g.canvas.width / SW, 0, 0, g.canvas.height / SH, 0, 0); // 0.15.5: drawn at 2x for sharper art and text
  g.imageSmoothingEnabled = false;
  const dim = s.state === 'OS_FLASH' || /_FLASH$/.test(s.state) ? 0.8 : 0.66;
  g.fillStyle = 'rgba(2,8,5,' + dim + ')';
  g.fillRect(0, 0, SW, SH);
  selTechBackdrop(g, s.w.color || '#7dff9a'); // 0.16 Omnitrix-tech frame
  if (s.mode === 'swap') txtc(g, 'CAMBIO RÁPIDO', SW - 14, 20, 9, s.w.color, 'right');
  try {
    kind.draw(g, s, performance.now());
  } catch (e) {
    console.warn('watch draw', e); // a drawing bug must never freeze the game loop
  }
}

// pointer input on the selector canvas
function selPoint(e) {
  const c = $('#watchsel'),
    r = c.getBoundingClientRect(),
    m = sel && miniDial(sel);
  return [((e.clientX - r.left) / r.width) * (m ? MINI_W : SW), ((e.clientY - r.top) / r.height) * (m ? MINI_H : SH)];
}
function selDown(e) {
  if (!sel) return;
  e.preventDefault();
  if (miniDial(sel)) return miniDown(e);
  const [x, y] = selPoint(e),
    k = SELECTORS[sel.w.selector.type];
  sel.press = { x, y, moved: false };
  if (k.down) k.down(sel, x, y);
}
function selMoveEv(e) {
  if (!sel || !sel.press) return;
  if (miniDial(sel)) return miniMove(e);
  const [x, y] = selPoint(e);
  if (Math.hypot(x - sel.press.x, y - sel.press.y) > 6) sel.press.moved = true;
  const k = SELECTORS[sel.w.selector.type];
  if (k.move) k.move(sel, x, y);
}
function selUp(e) {
  if (!sel) return;
  if (miniDial(sel)) return miniUp(e);
  const [x, y] = selPoint(e),
    s = sel,
    k = SELECTORS[s.w.selector.type],
    pr = s.press;
  s.press = null;
  if (k.up && k.up(s, x, y)) return;
  if (!s.interactive || (pr && pr.moved && s.w.selector.type !== 'strip' && s.w.selector.type !== 'slider')) return;
  if (pr && pr.moved) { // swipe on strip / slider
    selMove(x < pr.x ? 1 : -1);
    return;
  }
  const r = k.region(s, x, y);
  if (r === 'core') selConfirm(true);
  else if (r === 'left') selMove(-1);
  else if (r === 'right') selMove(1);
  else if (r.startsWith('alien:')) selGoto(+r.slice(6));
  else if (r.startsWith('bar:')) selGoto(Math.round(+r.slice(4)));
  else if (r === 'back' || r === 'bg') selCancel();
}
$('#watchsel').addEventListener('pointerdown', selDown);
$('#watchsel').addEventListener('pointermove', selMoveEv);
$('#watchsel').addEventListener('pointerup', selUp);
$('#watchsel').addEventListener('contextmenu', (e) => { e.preventDefault(); selCancel(); });
$('#watchsel').addEventListener('wheel', (e) => {
  if (!sel) return;
  e.preventDefault();
  if (Math.abs(e.deltaY) + Math.abs(e.deltaX) < 1) return;
  const now = performance.now();
  if (now - (sel.lastWheel || 0) < 90) return;
  sel.lastWheel = now;
  selMove((e.deltaY || e.deltaX) > 0 ? 1 : -1);
}, { passive: false });

// keyboard: returns true when the key was consumed by the watch system
function watchKey(e, k) {
  if (storyRun) { e.preventDefault(); storySkip(); return true; }
  if (fx && fx.cine) { e.preventDefault(); cineSkip(); return true; }
  if (sel) {
    e.preventDefault();
    if (k === 'Escape' || k === 'g' || k === 'Backspace') selCancel();
    else if (k === 'ArrowLeft' || k === 'a' || k === 'q' || k === 'ArrowUp' || k === 'w') selMove(-1);
    else if (k === 'ArrowRight' || k === 'd' || k === 'r' || k === 'ArrowDown' || k === 's') selMove(1);
    else if (k === 'Enter' || k === ' ' || k === 'q' || k === 't') selConfirm(true); // one press transforms
    else if (k === 'f') selFav();
    else if (k === 'PageUp' || k === '[') selMove(-6);
    else if (k === 'PageDown' || k === ']') selMove(6);
    return true;
  }
  if (!omniActive()) return false;
  if (k === 'g') { openSelector(); return true; } // also opens the quick-swap dial while transformed
  for (const sp of getWatch().specials) if (sp.key === k) { watchSpecial(sp.id); return true; }
  return false;
}

// ============================ TRANSFORM FX (reusable profiles, no per-alien sheets) ============================
const FX_CX = 230,
  FX_CY = 150;
const TRANSFORM_FX = {
  // Prototype: green flash -> black body silhouette -> contracting energy rings -> final flash
  os: { dur: 0.75, draw(g, p, o) {
    flashRect(g, '#caffd6', p < 0.3 ? 0.9 * (1 - p / 0.3) : 0);
    if (p > 0.08 && p < 0.7) {
      const j = Math.sin(p * 80) * 2;
      drawWatchIcon(g, o.id, 'os-silhouette', FX_CX + j, FX_CY, Math.round(lerp(150, 110, p)), Math.min(1, (p - 0.08) * 8) * (p > 0.6 ? (0.7 - p) * 10 : 1));
      g.save(); g.strokeStyle = '#7dff9a'; g.lineWidth = 3; g.globalAlpha = 0.8;
      for (let i = 0; i < 3; i++) { const q = (p * 2 + i / 3) % 1; g.beginPath(); g.arc(FX_CX, FX_CY, 120 * (1 - q), 0, 7); g.stroke(); }
      g.restore();
    }
    flashRect(g, '#e6ffe9', p > 0.58 && p < 0.8 ? 1 - Math.abs(p - 0.68) * 8 : 0);
  } },
  // Recalibrated: DNA helix particles converge, hologram flickers into the alien, flash
  af: { dur: 0.85, draw(g, p, o) {
    g.save();
    for (let i = 0; i < 40; i++) {
      const t = i / 40, a = p * 9 + t * 12.5, r = (1 - p) * 90 * (0.4 + t * 0.6), y = FX_CY - 60 + t * 120;
      g.fillStyle = i % 2 ? '#7dff9a' : '#b8ffd0'; g.globalAlpha = Math.min(1, p * 4) * (1 - Math.max(0, p - 0.8) * 5);
      g.fillRect(Math.round(FX_CX + Math.cos(a) * r), Math.round(y), 3, 3);
    }
    g.restore();
    if (p > 0.3 && p < 0.85) drawWatchIcon(g, o.id, 'af-hologram', FX_CX, FX_CY, 128, (0.5 + 0.5 * Math.sin(p * 90)) * Math.min(1, (p - 0.3) * 5));
    flashRect(g, '#b8ffd0', p > 0.7 ? Math.max(0, 1 - Math.abs(p - 0.76) * 7) : 0);
  } },
  // Ultimatrix (normal transform): red sparks + closing slats + diamond emblem
  ua: { dur: 0.7, draw(g, p, o) {
    g.save();
    const slat = p < 0.4 ? p / 0.4 : Math.max(0, 1 - (p - 0.4) / 0.3);
    g.fillStyle = '#7a1e0c'; g.fillRect(0, FX_CY - 150 + slat * 110, SW, 36); g.fillRect(0, FX_CY + 114 - slat * 110, SW, 36);
    for (let i = 0; i < 26; i++) { const t = (i * 0.137 + p) % 1; g.fillStyle = '#ffb08a'; g.globalAlpha = 1 - t; g.fillRect(FX_CX - 60 + ((i * 37) % 120), FX_CY + 40 - t * 140, 3, 3); }
    g.restore();
    symbol(g, 'diamond', FX_CX, FX_CY, 26 + p * 70, '#ff6a3d', false);
    flashRect(g, '#ffd0b8', p > 0.5 ? Math.max(0, 1 - Math.abs(p - 0.58) * 7) : 0);
  } },
  // Completed: very fast flash -> morph frames through the playlist -> emblem burst
  ov: { dur: 0.45, draw(g, p, o) {
    flashRect(g, '#d8fbff', p < 0.2 ? 1 - p / 0.2 : 0);
    if (p > 0.15 && p < 0.7) {
      const list = o.list, f = Math.floor((p - 0.15) * 12), id = p > 0.5 ? o.id : list[(list.indexOf(o.id) + f + 1) % list.length];
      drawWatchIcon(g, id, 'ov-icon', FX_CX, FX_CY, 128, 1);
    }
    if (p > 0.45) { g.save(); g.strokeStyle = '#c7f2ff'; g.lineWidth = 3; g.globalAlpha = 1 - (p - 0.45) * 1.8; g.beginPath(); g.arc(FX_CX, FX_CY, (p - 0.45) * 330, 0, 7); g.stroke(); g.restore(); symbol(g, 'prime', FX_CX, FX_CY, 24, '#c7f2ff'); }
  } },
};
let fx = null, fxRaf = 0, fxLast = 0;
function fxPlay(name, o = {}) {
  let prof = TRANSFORM_FX[name];
  if (!prof) return;
  // full transformations play the cutscene (part-19) unless it is switched off, it's a quick swap, or in co-op
  const cine = cineOn && !o.quick && !(net.role || net.peer) && !!CINE_STYLE[name] && cineWanted(o.alien || player.activeAlien); // full scene once per alien per session
  if (cine) prof = TRANSFORM_FX.cine;
  const id = o.alien || player.activeAlien;
  if (cine && storyPlay(id)) return; // illustrated storyboard for this alien (part-25)
  fx = { prof, cine, t: 0, dur: prof.dur * (o.quick ? 0.5 : 1), o: { id, list: watchPlaylist(), color: getWatch().color, style: name } };
  $('#watchfx').classList.remove('hidden');
  $('#watchfx').classList.toggle('cine', cine);
  if (!fxRaf) { fxLast = performance.now(); fxRaf = requestAnimationFrame(fxLoop); }
}
function fxLoop(now) {
  const dt = Math.min(0.05, (now - fxLast) / 1000);
  fxLast = now;
  const g = $('#watchfx').getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  g.setTransform(g.canvas.width / SW, 0, 0, g.canvas.height / SH, 0, 0);
  g.imageSmoothingEnabled = false;
  let more = false;
  if (fx) {
    fx.t += dt;
    if (fx.t >= fx.dur) fx = null;
    else { fx.prof.draw(g, fx.t / fx.dur, fx.o); more = true; }
  }
  if (seqRun) { seqRun.draw(g); more = true; }
  if (more) fxRaf = requestAnimationFrame(fxLoop);
  else { fxRaf = 0; $('#watchfx').classList.add('hidden'); $('#watchfx').classList.remove('cine'); }
}

// ============================ SEQUENCES (Ultimatrix ultimate / revert) ============================
// Non-interactive state machines that reuse the same state/SFX/commit machinery as the selectors.
let seqRun = null;
const seqBusy = () => !!seqRun;
function playSequence(name, onCommit) {
  const w = getWatch(),
    seq = w.sequence && w.sequence[name];
  if (!seq || seqRun) return;
  seqRun = { w, seq, si: 0, t: 0, state: '', dur: 0, p: 0, onCommit, id: player.activeAlien, drawn: 0 };
  seqRun.draw = (g) => seqDraw(g, seqRun);
  seqEnter(seqRun);
  $('#watchfx').classList.remove('hidden');
  if (!fxRaf) { fxLast = performance.now(); fxRaf = requestAnimationFrame(fxLoop); }
}
function seqEnter(r) {
  const st = r.seq[r.si];
  r.state = st[0]; r.dur = st[1]; r.t = 0; r.p = 0;
  if (STATE_SFX[r.state]) playWatchSFX(STATE_SFX[r.state]);
  if (st[2] && st[2].commit && r.onCommit) r.onCommit();
}
function seqDraw(g, r) {
  const dt = Math.min(0.05, (performance.now() - (r.lastT || performance.now())) / 1000);
  r.lastT = performance.now();
  r.t += dt;
  r.p = Math.min(1, r.t / r.dur);
  const p = r.p, cx = FX_CX, cy = FX_CY, c = r.w.color, st = r.state;
  g.save();
  if (st === 'ULTIMATE_TRIGGER') {
    symbol(g, 'diamond', cx, cy - 30, 14 + eo(p) * 40, c, false);
    g.strokeStyle = c; g.lineWidth = 3; g.globalAlpha = 1 - p; g.beginPath(); g.arc(cx, cy - 30, 20 + p * 110, 0, 7); g.stroke();
  } else if (st === 'ULTIMATE_MECHANICAL') {
    const k = eo(p);
    g.fillStyle = '#2b100b'; g.strokeStyle = c; g.lineWidth = 2;
    for (const sx of [-1, 1]) {
      const x = cx + sx * (180 - 150 * k) - (sx > 0 ? 0 : 60);
      g.fillRect(x, cy - 70, 60, 140); g.strokeRect(x, cy - 70, 60, 140);
      g.fillStyle = c; for (let i = 0; i < 6; i++) g.fillRect(x + 8, cy - 62 + i * 24, 6, 6); g.fillStyle = '#2b100b';
    }
    drawWatchIcon(g, r.id, 'ua-red', cx, cy, 96, 0.8);
  } else if (st === 'ULTIMATE_CHARGE') {
    const sh = p * 3;
    for (let i = 0; i < 48; i++) {
      const a = i * 2.399 + p * 6, d = (1 - p) * (40 + ((i * 53) % 130));
      g.fillStyle = i % 3 ? '#ffb08a' : '#ffffff'; g.globalAlpha = 0.4 + p * 0.6;
      g.fillRect(Math.round(cx + Math.cos(a) * d + (Math.random() - 0.5) * sh), Math.round(cy + Math.sin(a) * d * 0.8 + (Math.random() - 0.5) * sh), 3, 3);
    }
    drawWatchIcon(g, r.id, 'ua-red', cx + (Math.random() - 0.5) * sh * 2, cy, 96 + p * 24, 0.9);
    flashRect(g, '#ff6a3d', p * p * 0.35);
  } else if (st === 'ULTIMATE_FLASH') {
    flashRect(g, '#fff0e6', 1 - p * 0.3);
  } else if (st === 'ULTIMATE_SPAWN') {
    g.strokeStyle = c; g.lineWidth = 4;
    for (let i = 0; i < 3; i++) { const q = Math.min(1, Math.max(0, p * 1.4 - i * 0.18)); g.globalAlpha = 1 - q; g.beginPath(); g.arc(cx, cy, 20 + q * 220, 0, 7); g.stroke(); }
    flashRect(g, '#ffd2bc', (1 - p) * 0.5);
  } else if (st === 'ULTIMATE_REVERT') {
    flashRect(g, '#ff9b73', (1 - p) * 0.6);
    g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, (1 - p) * 140, 0, 7); g.stroke();
  }
  g.restore();
  if (r.t >= r.dur) {
    r.si++;
    if (r.si >= r.seq.length) { seqRun = null; return; }
    seqEnter(r);
  }
}
// Gameplay slows while a selector / sequence is on screen (not in co-op: the host's world must keep running for both).
function timeScale() {
  if (net.role || net.peer) return 1;
  return sel ? 0.12 : photoOn || sagaCineOn || storyRun || (fx && fx.cine) ? 0 : seqRun ? 0.3 : 1; // the cutscene freezes the action
}
function watchTick(dt) {
  if (sel) selTick(dt);
}

// ============================ WATCH MENU (equip) ============================
function watchMenu(focusId) {
  const cur = getWatch();
  const focus = WATCHES[focusId] ? focusId : cur.id;
  const cards = WATCH_ORDER.map((id) => {
    const w = WATCHES[id],
      ok = w.status === 'ready',
      un = watchUnlocked(id);
    return (
      '<button class="wcard ' + (id === cur.id ? 'active ' : '') + (id === focus ? 'focus ' : '') + (!ok || !un ? 'locked' : '') + '" data-w="' + id + '" style="--ox:' + w.color + '">' +
      '<canvas width="64" height="64"></canvas><strong>' + w.name + '</strong><small>' +
      (!ok ? 'PRÓXIMAMENTE' : un ? (id === cur.id ? 'EQUIPADO' : w.tagline) : 'NIVEL ' + w.unlock.level) + (ok && w.eras ? '<br>' + w.eras.map((e) => ERA_SHORT[e]).join(' + ') + (w.masterControl ? ' · ★MC' : '') : '') + '</small></button>'
    );
  }).join('');
  const f = WATCHES[focus];
  const design = { show: 'basado en la serie', game: 'original del juego', unverified: 'sin verificar' }[f.canon.design];
  const mech = { show: 'de la serie', game: 'originales de OMNI', planned: 'pendientes' }[f.canon.mechanics];
  const detail =
    '<div class="wdetail" style="--ox:' + f.color + '"><b>' + f.name + '</b>' +
    '<span class="wcanon">DISEÑO: ' + design + ' · MECÁNICAS: ' + mech + '</span>' +
    (f.status === 'ready' ? '<ul>' + f.summary.map((l) => '<li>' + l + '</li>').join('') + '</ul>' : '<p>' + f.note + '</p>') +
    '</div>';
  showDialog(
    'RELOJ / OMNITRIX',
    'Elige tu reloj',
    '<p>Cada reloj cambia cómo eliges, cómo te transformas y cómo se gasta la energía. Cada reloj lleva los aliens de su era (Clásicos, Alien Force, Ultimate, Omniverse); el CONTROL MAESTRO (nivel 15) los desbloquea todos en los relojes que lo tienen.</p><div class="wgrid">' + cards + '</div>' + detail,
    [
      ['LISTO', closeDialog],
      [f.status === 'ready' && f.id !== cur.id ? 'EQUIPAR ' + f.hudName : 'EQUIPADO', () => { equipWatch(focus); watchMenu(focus); }],
      ['CINEMÁTICA: ' + (cineOn ? 'SÍ' : 'NO'), () => {
        cineOn = !cineOn;
        try { localStorage.setItem('omni-cine', cineOn ? '1' : '0'); } catch (e) {}
        watchMenu(focus);
      }],
      ['MODO PRIVADO: ' + (watchFree ? 'TODO DESBLOQUEADO' : 'PROGRESIÓN NORMAL'), () => {
        watchFree = !watchFree;
        try { localStorage.setItem('omni-watchfree', watchFree ? '1' : '0'); } catch (e) {}
        watchMenu(focus);
      }],
    ],
  );
  document.querySelectorAll('.wcard').forEach((b) => {
    const w = WATCHES[b.dataset.w],
      g = b.querySelector('canvas').getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = w.iconStyle === 'os-silhouette' ? '#86d79a' : '#0c1519';
    g.fillRect(0, 0, 64, 64);
    if (w.status === 'ready' && !drawWatchLogo(g, w, 32, 32, 60, false)) drawWatchIcon(g, 'heatblast', w.iconStyle, 32, 32, 64, 1);
    else symbol(g, w.shape || 'prime', 32, 32, 14, w.color, false);
    b.onclick = () => {
      watchMenu(b.dataset.w);
      playWatchSFX('select', w.status === 'ready' ? w.id : undefined);
    };
  });
}
const watchBtn = $('#oxbtn');
if (watchBtn) watchBtn.onclick = () => watchMenu();

// ---- HUD hooks ----
function watchHud() {
  const sp = $('#special');
  if (!omniActive()) return sp.classList.add('hidden');
  const w = getWatch(),
    dr = drainRate(),
    rr = rechargeRate();
  $('#energyname').textContent = w.hudName;
  $('#batteryhint').textContent = player.alien
    ? dr < 0.5
      ? 'Transformado · sin cuenta atrás'
      : 'Transformado · ' + Math.ceil(player.battery / dr) + ' s de energía'
    : player.battery < 100
      ? 'Carga completa en ' + Math.ceil((100 - player.battery) / rr) + ' s · Ya puedes usarla'
      : 'Listo · ' + (w.eras ? w.eras.map((e) => ERA_SHORT[e]).join('+') : '') + (player.masterControl && w.masterControl ? ' · ★MC' : '') + ' · ' + watchPlaylist(w).length + ' aliens';
  if (player.alien && ultOn()) $('#form').textContent = ultForm().name.toUpperCase();
  const s0 = w.specials[0];
  sp.classList.toggle('hidden', !(s0 && SPECIALS[s0.id] && SPECIALS[s0.id].visible()));
  if (s0) {
    sp.textContent = SPECIALS[s0.id].label(w) + ' · ' + s0.key.toUpperCase();
    sp.classList.toggle('on', !!player.ultimate);
  }
}
$('#special').onclick = () => {
  const s0 = getWatch().specials[0];
  if (s0) watchSpecial(s0.id);
};
$('#dialportrait').onclick = () => openSelector();

// 0.16: Omnitrix-tech backdrop for every watch dial: hex grid, scanlines, corner brackets and a sweeping scan bar
function selTechBackdrop(g, col) {
  const t = performance.now() / 1000;
  g.save();
  g.strokeStyle = col;
  g.globalAlpha = 0.07;
  g.lineWidth = 0.6;
  const r = 12, h = r * Math.sqrt(3);
  for (let y = -h, row = 0; y < SH + h; y += h / 2, row++)
    for (let x = row % 2 ? r * 1.5 : 0; x < SW + r * 3; x += r * 3) {
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k;
        g[k ? 'lineTo' : 'moveTo'](x + r * Math.cos(a), y + r * Math.sin(a));
      }
      g.closePath();
      g.stroke();
    }
  g.globalAlpha = 0.05;
  g.fillStyle = col;
  for (let y = 0; y < SH; y += 3) g.fillRect(0, y, SW, 1);
  const sy = ((t * 60) % (SH + 40)) - 20;
  const gr = g.createLinearGradient(0, sy - 18, 0, sy + 2);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, col);
  g.globalAlpha = 0.12;
  g.fillStyle = gr;
  g.fillRect(0, sy - 18, SW, 20);
  g.globalAlpha = 0.85;
  g.lineWidth = 2;
  g.shadowColor = col;
  g.shadowBlur = 6;
  const m = 8, L = 22;
  for (const [x, y, dx, dy] of [[m, m, 1, 1], [SW - m, m, -1, 1], [m, SH - m, 1, -1], [SW - m, SH - m, -1, -1]]) {
    g.beginPath();
    g.moveTo(x, y + dy * L);
    g.lineTo(x, y);
    g.lineTo(x + dx * L, y);
    g.stroke();
  }
  g.restore();
}
// ============================================================================================
// OMNI ALIEN KITS · builds the roster from www/roster.js (window.OMNI_ROSTER). One alien = one ALIENS entry (gameplay)
// + one ALIEN_DB entry (metadata). Placeholder art: a recoloured copy of one of the six hand-drawn bodies.
// Moves are KIT_MOVES[kind]; add a kind (or replace a whole alien's attack code) without touching the watch system.
// ============================================================================================
const ROW_ALIAS = {}; // row >= 100 -> { base:<real row>, hue, sat, bri }
const tintLRU = []; // only a few full-size tinted sheets are kept in memory
function tintSheet(def) {
  const base = spriteInfo(def.base).sheet;
  if (!base || base.complete === false || !(base.naturalWidth || base.width)) return null;
  if (def._c) {
    tintLRU.splice(tintLRU.indexOf(def), 1);
    tintLRU.push(def);
    return def._c;
  }
  const w = base.naturalWidth || base.width,
    h = base.naturalHeight || base.height,
    c = cv(w, h),
    g = c.getContext('2d');
  tintFilter(g, def, () => g.drawImage(base, 0, 0), w, h);
  def._c = c;
  tintLRU.push(def);
  while (tintLRU.length > 4) tintLRU.shift()._c = null;
  return c;
}
function tintFilter(g, def, draw, w, h) {
  if ('filter' in g) {
    g.filter = 'hue-rotate(' + def.hue + 'deg) saturate(' + def.sat + ') brightness(' + def.bri + ')';
    draw();
    g.filter = 'none';
    if (def.over) { // fusions: wash of the partner's colour over the body
      g.globalCompositeOperation = 'source-atop';
      g.globalAlpha = def.overA || 0.3;
      g.fillStyle = def.over;
      g.fillRect(0, 0, w, h);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
  } else {
    draw();
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'hsla(' + def.hue + ',70%,50%,.45)';
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
  }
}
function aliasSpriteInfo(row) {
  const def = ROW_ALIAS[row],
    b = spriteInfo(def.base);
  return { ...b, sheet: tintSheet(def) || b.sheet };
}
const alienHeight = (id) => (ALIENS[id] && ALIENS[id].height) || (id === 'fourarms' ? 144 : id === 'bestia' ? 92 : 123);

// ---------------- moves ----------------
const KIT_MOVES = {
  bolt(s, d, a, t, c) {
    const n = s.shots || 1;
    for (let k = 0; k < n; k++) kitShot(s, d, a + (n > 1 ? (k - (n - 1) / 2) * (s.spread || 0.2) : 0), c);
  },
  swarm(s, d, a, t, c) {
    for (let k = 0; k < (s.shots || 6); k++) kitShot(s, d, a + (Math.random() - 0.5) * 0.7, c, 430 + Math.random() * 160);
  },
  nova(s, d, a, t, c) {
    effects.push({ type: 'ring', x: player.x, y: player.y - 20, t: 0.6, max: 0.6, r: s.r || 150 });
    areaHit(player.x, player.y, s.r || 150, d, s.stun || 0.25);
    burst(player.x, player.y - 40, 18, c);
    shake = 0.15;
  },
  slam(s, d, a, t, c) {
    const x = player.x + Math.cos(a) * (s.r || 90) * 0.5,
      y = player.y + Math.sin(a) * (s.r || 90) * 0.3;
    effects.push({ type: 'slam', x, y, r: s.r || 90, t: 0.45, max: 0.45 });
    areaHit(x, y, s.r || 90, d, 0.35);
    burst(x, y - 10, 12, c);
    shake = 0.12;
  },
  dash(s, d, a, t) {
    const dd = t ? Math.min(dist(player, t), 200) : 150,
      dest = walkable(player.x + Math.cos(a) * dd, player.y + Math.sin(a) * dd);
    player.leap = { t: 1, max: 1, startX: player.x, startY: player.y, x: dest.x, y: dest.y, damage: d };
    player.attackFrame = 4;
  },
  chain(s, d, a, t, c) {
    const list = combatants()
      .filter((e) => e.alive && dist(player, e) < 430 && lineClear(player.x, player.y, e.x, e.y))
      .sort((p, q) => dist(player, p) - dist(player, q))
      .slice(0, s.targets || 3);
    for (const e of list) {
      damageTarget(e, d, 0.2);
      effects.push({ type: 'ring', x: e.x, y: e.y - 30, t: 0.3, max: 0.3, r: 46 });
      burst(e.x, e.y - 40, 8, c);
    }
    if (!list.length) toast('Sin objetivos cerca');
  },
  shield(s) {
    player.shield = s.amount || 80;
    player.shieldTime = s.time || 10;
    burst(player.x, player.y - 50, 22, '#bdfff1');
    toast('Escudo: ' + player.shield + ' resistencia · ' + player.shieldTime + ' s');
  },
  heal(s) {
    const add = maxHP() * (s.pct || 0.25);
    player.hp = Math.min(maxHP(), player.hp + add);
    burst(player.x, player.y - 50, 20, '#9dff9d');
    toast('+' + Math.round(add) + ' vida');
  },
  phase(s) {
    player.inv = Math.max(player.inv, s.time || 3);
    burst(player.x, player.y - 50, 18, '#e3e0ff');
    toast('Intangible · ' + (s.time || 3) + ' s');
  },
  drain(s, d, a, t, c) {
    const r = s.r || 110;
    let hit = false;
    for (const e of combatants()) if (e.alive && dist(player, e) < r) hit = true;
    effects.push({ type: 'ring', x: player.x, y: player.y - 20, t: 0.45, max: 0.45, r });
    areaHit(player.x, player.y, r, d, 0.2);
    if (hit) {
      player.hp = Math.min(maxHP(), player.hp + d * (s.heal || 0.4));
      burst(player.x, player.y - 50, 12, '#ff9d9d');
    }
  },
  meteor(s, d, a, t) {
    const aim = t
      ? { x: t.x, y: t.y }
      : {
          x: clamp(player.x + Math.cos(a) * 200, region().minX + 20, region().maxX - 20),
          y: clamp(player.y + Math.sin(a) * 90, region().top + 20, region().bottom - 20),
        };
    effects.push({ type: 'meteor', x: aim.x, y: aim.y, t: 1.05, max: 1.05, r: 140, hit: false, damage: d });
  },
  field(s, d, a, t) {
    const aim = t ? { x: t.x, y: t.y } : { x: player.x + Math.cos(a) * 100, y: player.y + Math.sin(a) * 60 },
      time = s.time || 5;
    if (s.fx === 'puddle') effects.push({ type: 'puddle', x: aim.x, y: aim.y, r: s.r || 140, t: time, max: time, tick: 0.05, pulses: 0, damage: d });
    else effects.push({ type: 'field', x: aim.x, y: aim.y, t: time, max: time, r: s.r || 125, tick: 0, damage: d });
  },
};
function kitShot(s, d, angle, color, speed) {
  projectiles.push({
    type: 'kit',
    color,
    x: player.x,
    y: player.y - 35,
    dx: Math.cos(angle) * (speed || s.speed || 470),
    dy: Math.sin(angle) * (speed || s.speed || 470),
    t: 1.3,
    r: s.r || 10,
    damage: d,
    slow: s.slow || 0,
    attackId: nextAttackId++,
  });
}
const KIT_SND = { bolt: 'fire', swarm: 'fire', nova: 'punch', slam: 'punch', dash: 'punch', chain: 'crystal', drain: 'spit' };
function kitAttack(i) {
  const id = player.activeAlien,
    s = ALIENS[id].skills[i];
  if (!s) return;
  if (!unlockedSkill(id, i)) {
    toast(i < 4 ? s.name + ': requiere ' + s.unlock + '% de maestría' : 'Aprende esta habilidad por 3 puntos');
    return;
  }
  player.cool[i] = s.cd;
  player.attack = 0.35;
  player.attackFrame = 3;
  const t = nearest(s.kind === 'chain' ? 430 : 480),
    a = t ? Math.atan2(t.y - player.y, t.x - player.x) : Math.atan2(player.dy, player.dx);
  player.face = Math.cos(a) >= 0 ? 1 : -1;
  window.OmniSound?.play(KIT_SND[s.kind] || 'punch');
  (KIT_MOVES[s.kind] || KIT_MOVES.bolt)(s, s.damage * multiplier(), a, t, s.color || ALIENS[id].color); // fusions colour each move by its parent
  if (ALIENS[id].sheet) player.attackFrame = SHEET_KIND_FRAME[s.kind] || 4; // pose from the alien's sheet
}

// ---------------- build the roster ----------------
(function buildRoster() {
  const D = window.OMNI_ROSTER;
  if (!D) return;
  const CLASSIC10 = ['greymatter', 'ripjaws', 'upgrade', 'ghostfreak']; // join the six originals on every watch (incl. Prototype)
  let k = 0;
  for (const [id, arch, base, hue, sat, bri, height, hp, speed, color, lv, sigEs] of D.R) {
    const row = 100 + k++,
      info = ALIEN_DB[id] || (ALIEN_DB[id] = { id, name: id, origin: 'ov', wave: 0, species: null });
    ROW_ALIAS[row] = { base: D.ROWS[base], hue, sat, bri };
    const dmMul = id === 'alienx' ? 1.5 : id === 'waybig' ? 1.2 : 1;
    ALIENS[id] = {
      name: info.name,
      row,
      hp,
      height,
      color,
      kit: arch,
      skills: D.ARCH[arch].map((m, i) => ({
        ...m,
        kind: m.k,
        name: i === 3 ? sigEs : m.n,
        short: i === 3 ? sigEs.split(' ')[0].toUpperCase() : m.s,
        damage: Math.round(m.d * dmMul),
        cd: m.cd,
        unlock: m.u || 0,
        cost: i < 4 ? [0, 3, 6, 12][i] : 0,
        points: 3,
      })),
    };
    SPEEDS[id] = speed;
    CORE_ALIENS.push(id);
    Object.assign(info, {
      implemented: true,
      unlockLevel: lv,
      watches: CLASSIC10.includes(id) ? null : ['recalibrated', 'ultimatrix', 'albedo', 'completed', 'biomnitrix'],
    });
    // series Ultimate forms become real as soon as their base alien exists
    if (ULTIMATES[id]) ULTIMATES[id].status = 'ready';
  }
  // the six originals are classic aliens too: no extra restriction on any watch
  for (const id of ['bestia', 'insect']) ALIEN_DB[id].watches = null;
  initProgress(); // masteries / cooldowns / learned skills for the new aliens
})();

// ---------------- DNA drops: defeated enemies can leave unknown DNA for an alien you have not unlocked yet ----------------
function dnaDrop() {
  if (!omniActive() || Math.random() > 0.04) return;
  const locked = CORE_ALIENS.filter((id) => ALIENS[id] && alienInfo(id).implemented && !alienInfo(id).story && !alienUnlocked(id) && alienInfo(id).unlockLevel <= player.level + 4);
  if (locked.length) scanDNA(locked[Math.floor(Math.random() * locked.length)]);
}
// ============================================================================================
// OMNI BIOMNITRIX · fusions of ANY two aliens (game-original mechanics; the watch itself is from the series)
// A fused alien is generated on demand from its two parents and lives in ALIENS like every other alien:
//   id      'fu_<a>_x_<b>'  (A = body, B = colours; order matters, so Heatblast+Diamante != Diamante+Heatblast)
//   sprite  A's body, hue pulled halfway towards B's colour (ROW_ALIAS row >= 1000), two-colour aura in the world
//   moves   I: A basic · II: B second · III: A signature · IV: B signature · V: A extra · VI: B extra
//   stats   average HP ×1.15 (series fusions ×1.1 more), average speed, damage ×1.1, the taller parent's height
// Fusions are never added to CORE_ALIENS (they are not dial entries) and are rebuilt from their id after a load
// or when a co-op partner shows one.
// ============================================================================================
const FUSION_BONUS = { hp: 1.15, named: 1.1, damage: 1.1 };
const FUSION_COST = [0, 4, 8, 14];
let fusionRows = 0;
const isFusionId = (id) => typeof id === 'string' && id.startsWith('fu_') && id.includes('_x_');
const fusionId = (a, b) => 'fu_' + a + '_x_' + b;
const fusionParts = (id) => id.slice(3).split('_x_');

// the six hand-coded aliens expressed as kit moves (fusions use the shared KIT_MOVES engine; their own
// code stays untouched when you play them alone)
const ORIG_KIT = {
  heatblast: [{ kind: 'bolt', speed: 520 }, { kind: 'bolt', shots: 3, spread: 0.2 }, { kind: 'nova', r: 150 }, { kind: 'meteor' }, { kind: 'bolt', speed: 640, r: 13 }, { kind: 'swarm', shots: 6 }],
  diamond: [{ kind: 'bolt', speed: 560, r: 9 }, { kind: 'shield', amount: 100, time: 10 }, { kind: 'field', r: 125, time: 5 }, { kind: 'meteor' }, { kind: 'bolt', shots: 5, spread: 0.16 }, { kind: 'slam', r: 115 }],
  fourarms: [{ kind: 'slam', r: 90 }, { kind: 'dash' }, { kind: 'bolt', speed: 380, r: 16 }, { kind: 'nova', r: 190, stun: 0.7 }, { kind: 'slam', r: 120 }, { kind: 'nova', r: 200, stun: 0.6 }],
  xlr8: [{ kind: 'bolt', speed: 680, r: 8 }, { kind: 'nova', r: 160 }, { kind: 'chain', targets: 4 }, { kind: 'dash' }, { kind: 'dash' }, { kind: 'swarm', shots: 8 }],
  bestia: [{ kind: 'slam', r: 80 }, { kind: 'shield', amount: 60, time: 8 }, { kind: 'dash' }, { kind: 'slam', r: 95 }, { kind: 'nova', r: 150 }, { kind: 'nova', r: 200, stun: 1 }],
  insect: [{ kind: 'bolt', slow: 0.3 }, { kind: 'field', fx: 'puddle', r: 140, time: 5 }, { kind: 'bolt', slow: 0.5 }, { kind: 'phase', time: 3 }, { kind: 'nova', r: 160 }, { kind: 'bolt', shots: 3, spread: 0.25 }],
};
function parentSkill(id, i) {
  const A = ALIENS[id],
    s = A.skills[i];
  if (!s) return null;
  return A.kit ? { ...s } : { ...s, ...(ORIG_KIT[id] ? ORIG_KIT[id][i] : { kind: 'bolt' }) };
}

// colour helpers
function hexRgb(h) {
  const n = parseInt(String(h).replace('#', '').slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbHue([r, g, b]) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
function mixHex(a, b) {
  const x = hexRgb(a), y = hexRgb(b);
  return '#' + x.map((v, i) => Math.round((v + y[i]) / 2).toString(16).padStart(2, '0')).join('');
}

function namedFusion(a, b) {
  for (const f of Object.values(FUSIONS)) if ((f.a === a && f.b === b) || (f.a === b && f.b === a)) return f;
  return null;
}
function fusionName(a, b) {
  const nf = namedFusion(a, b);
  if (nf) return nf.name;
  // join at syllable-ish edges: "Heat|blast" + "Dia|mante" -> Heatmante; multi-word names use their first/last word
  const V = /[aeiouyáéíóú]/i,
    clean = (t) => t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/g, ''),
    wa = ALIENS[a].name.split(/\s+/).filter(Boolean),
    wb = ALIENS[b].name.split(/\s+/).filter(Boolean),
    na = clean(wa.length > 1 ? wa[0] : wa.join('')),
    nb = clean(wb.length > 1 ? wb[wb.length - 1] : wb.join(''));
  let ha = -1;
  for (let i = 3; i <= Math.ceil(na.length * 0.6) && wa.length < 2; i++)
    if (i < na.length && !V.test(na[i]) && V.test(na[i - 1])) { ha = i + 1; break; }
  if (ha < 0) ha = wa.length > 1 ? na.length : Math.ceil(na.length / 2);
  let tb = -1;
  if (nb.length > 4)
    for (let i = Math.max(1, Math.floor(nb.length * 0.35)); i < nb.length - 1; i++)
      if (!V.test(nb[i]) && V.test(nb[i - 1])) {
        let j = i;
        while (j < nb.length && !V.test(nb[j])) j++;
        tb = j - i >= 3 ? j - 2 : j - i === 2 ? j - 1 : i; // start at the syllable onset
        break;
      }
  if (tb < 0) tb = nb.length > 4 ? Math.floor(nb.length / 2) : 0;
  const head = na.slice(0, ha) || na,
    tail = nb.slice(tb).toLowerCase();
  return head.charAt(0).toUpperCase() + head.slice(1) + tail;
}
const fusionOk = (a, b) => a !== b && ALIENS[a] && ALIENS[b] && CORE_ALIENS.includes(a) && CORE_ALIENS.includes(b);
// light preview for the selector (does not create anything)
function fusionPreview(a, b) {
  if (!fusionOk(a, b)) return null;
  const nf = namedFusion(a, b);
  return {
    name: fusionName(a, b),
    hp: Math.round(((ALIENS[a].hp + ALIENS[b].hp) / 2) * FUSION_BONUS.hp * (nf ? FUSION_BONUS.named : 1)),
    named: !!nf,
  };
}

// build (once) and return the fused alien id, or null if the pair is not valid
function ensureFusion(a, b) {
  if (b === undefined) {
    if (!isFusionId(a)) return ALIENS[a] ? a : null;
    [a, b] = fusionParts(a);
  }
  if (!fusionOk(a, b)) return null;
  const id = fusionId(a, b),
    A = ALIENS[a],
    B = ALIENS[b];
  if (!ALIENS[id]) {
    const nf = namedFusion(a, b),
      ra = A.row >= 100 && ROW_ALIAS[A.row] ? ROW_ALIAS[A.row] : { base: A.row, hue: 0, sat: 1, bri: 1 },
      dh = ((rgbHue(hexRgb(B.color)) - rgbHue(hexRgb(A.color)) + 540) % 360) - 180,
      row = 1000 + fusionRows++;
    ROW_ALIAS[row] = { base: ra.base, hue: Math.round(ra.hue + dh * 0.5), sat: Math.max(ra.sat, 1.15), bri: ra.bri, over: B.color, overA: 0.32 };
    const plan = [[a, 0, 0], [b, 1, 1], [a, 3, 2], [b, 3, 3], [a, 4, 4], [b, 5, 5]]; // [parent, its slot, fused slot]
    const skills = plan.map(([p, si, slot]) => {
      const s = parentSkill(p, si) || parentSkill(p, 0);
      return {
        ...s,
        kind: s.kind || 'bolt',
        color: ALIENS[p].color,
        from: p,
        damage: Math.round((s.damage || 0) * FUSION_BONUS.damage),
        unlock: slot < 4 ? [0, 15, 40, 75][slot] : 0,
        cost: slot < 4 ? FUSION_COST[slot] : 0,
        points: 3,
      };
    });
    ALIENS[id] = {
      name: fusionName(a, b),
      row,
      hp: Math.round(((A.hp + B.hp) / 2) * FUSION_BONUS.hp * (nf ? FUSION_BONUS.named : 1)),
      height: Math.round(Math.max(alienHeight(a), alienHeight(b)) * 1.04),
      color: mixHex(A.color, B.color),
      kit: 'fusion',
      sheet: A.sheet || null, // a body with real art keeps its poses
      fusion: { a, b, named: nf ? nf.id : null },
      skills,
    };
    SPEEDS[id] = Math.round(((SPEEDS[a] || 200) + (SPEEDS[b] || 200)) / 2);
    ALIEN_DB[id] = { id, name: ALIENS[id].name, origin: 'fusion', wave: 0, implemented: true, species: null, watches: ['biomnitrix'], fusion: true, canon: nf ? 'show' : 'game' };
  }
  // progress: fusion mastery starts at the weaker parent's, extra moves follow what each parent has learned
  if (player && player.masteries) {
    player.masteries[id] = Math.max(player.masteries[id] || 0, Math.min(player.masteries[a] || 0, player.masteries[b] || 0));
    if (!Array.isArray(player.cooldowns[id])) player.cooldowns[id] = [0, 0, 0, 0, 0, 0];
    player.learned[id] = [!!player.learned[a]?.[0], !!player.learned[b]?.[1]];
  }
  return id;
}
// fighting as a fusion trains both parents a little
function fusionTick(id, dt) {
  const f = ALIENS[id] && ALIENS[id].fusion;
  if (!f) return;
  for (const p of [f.a, f.b]) player.masteries[p] = Math.min(100, (player.masteries[p] || 0) + dt * 0.1);
}
function fusionParticles(o) {
  const f = ALIENS[player.activeAlien] && ALIENS[player.activeAlien].fusion;
  if (!f || paused || Math.random() > 0.35) return;
  const side = Math.random() < 0.5,
    t = clock * 3 + (side ? 0 : Math.PI);
  particles.push({ x: o.x + Math.cos(t) * 26, y: o.y - 30 - Math.random() * 70, dx: 0, dy: -24, t: 0.55, color: ALIENS[side ? f.a : f.b].color, size: 2 });
}
// series fusions become 'ready' when both parents are in the game
for (const f of Object.values(FUSIONS)) if (ALIENS[f.a] && ALIENS[f.b]) f.status = 'ready';

// ---------------- icons ----------------
// fused icon: left half = A, right half = B, with a thin lime seam
function fusionIconBase(id) {
  const { a, b } = ALIENS[id].fusion,
    ia = iconBase(a),
    ib = iconBase(b),
    c = cv(ICON_N, ICON_N),
    g = c.getContext('2d'),
    h = ICON_N / 2;
  g.drawImage(ia, 0, 0, h, ICON_N, 0, 0, h, ICON_N);
  g.drawImage(ib, h, 0, h, ICON_N, h, 0, h, ICON_N);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = '#d8ff8a';
  g.fillRect(h, 0, 1, ICON_N);
  g.globalCompositeOperation = 'source-over';
  if (iconCache['b|' + a] && iconCache['b|' + b]) iconCache['b|' + id] = c;
  return c;
}
// Biomnitrix icon style: full colour with a lime organic rim and a dark inner rim
ICON_STYLES['bio-dna'] = function (g, base) {
  const rim = tinted(base, '#b6ff4d'),
    dark = tinted(base, '#1d3a10');
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) g.drawImage(rim, dx, dy);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(dark, dx, dy);
  g.drawImage(base, 0, 0);
};

// ---------------- selector: two dials ----------------
const DUAL_X = [138, 342],
  DUAL_Y = 100;
function dualActive(s) {
  return s.fuseA ? 1 : 0;
}
SELECTORS.dual = {
  rate: 13,
  region(s, x, y) {
    if (Math.hypot(x - 240, y - 232) < 36) return 'core';
    const k = dualActive(s),
      cx = DUAL_X[k];
    if (s.fuseA && Math.hypot(x - DUAL_X[0], y - DUAL_Y) < 66) return 'back';
    if (Math.abs(y - DUAL_Y) < 70 && Math.abs(x - cx) < 100) {
      if (Math.abs(x - cx) < 34) return 'alien:' + Math.round(s.pos);
      return x < cx ? 'left' : 'right';
    }
    return 'bg';
  },
  draw(g, s, now) {
    const w = s.w, st = s.state, p = s.p, n = s.list.length;
    const open = st === 'BIO_ACTIVATE' ? 0 : st === 'BIO_SPLIT' ? eo(p) : 1;
    const combine = st === 'BIO_COMBINE' ? eo(p) : st === 'BIO_FLASH' || st === 'BIO_TRANSFORM' ? 1 : 0;
    const idA = s.fuseA || s.list[selIndex(s)],
      idB = s.fuseA ? s.list[selIndex(s)] : null;
    // DNA strands linking the two dials to the core
    g.save();
    for (let i = 0; i < 28; i++) {
      const t = i / 27;
      for (const k of [0, 1]) {
        const x0 = lerp(240, DUAL_X[k], t * open),
          y0 = lerp(222, DUAL_Y + 40, t) + Math.sin(now / 160 + t * 9 + k * 3) * 5;
        g.fillStyle = (i + k) % 2 ? '#b6ff4d' : '#5fae2a';
        g.globalAlpha = open * (0.35 + 0.4 * (k === dualActive(s) ? 1 : 0.4));
        g.fillRect(Math.round(x0), Math.round(y0), 2, 2);
      }
    }
    g.restore();
    for (const k of [0, 1]) {
      const cx = lerp(240, DUAL_X[k], open) + (combine ? (240 - DUAL_X[k]) * combine : 0),
        active = !combine && k === dualActive(s),
        r = 54 * (0.4 + 0.6 * open);
      g.save();
      g.globalAlpha = open * (1 - combine * 0.6);
      g.beginPath(); g.arc(cx, DUAL_Y, r, 0, 7);
      g.fillStyle = '#0d1a0c'; g.fill();
      g.lineWidth = active ? 3 : 2;
      g.strokeStyle = active ? '#d8ff8a' : '#4f7f2a';
      g.shadowColor = '#b6ff4d'; g.shadowBlur = active ? 10 + 4 * Math.sin(now / 140) : 0;
      g.stroke();
      g.shadowBlur = 0;
      g.beginPath(); g.arc(cx, DUAL_Y, r - 4, 0, 7); g.clip();
      if (active) {
        for (let d0 = -1; d0 <= 1; d0++) {
          const i = Math.floor(s.pos) + d0, d = i - s.pos, ad = Math.abs(d);
          if (ad > 1.4) continue;
          drawWatchIcon(g, s.list[wrapI(i, n)], 'bio-dna', cx + d * 64, DUAL_Y, Math.round(lerp(84, 40, Math.min(1, ad))), 1 - ad * 0.55);
        }
      } else {
        const id = k === 0 ? idA : idB;
        if (id) drawWatchIcon(g, id, 'bio-dna', cx, DUAL_Y, 84, 1);
        else txtc(g, '?', cx, DUAL_Y + 10, 30, '#4f7f2a');
      }
      g.restore();
      if (open > 0.9 && !combine) {
        const id = k === 0 ? idA : idB;
        txtc(g, k === 0 ? 'A · CUERPO' : 'B · COLOR', DUAL_X[k], DUAL_Y - 60, 8, active ? '#d8ff8a' : '#6f9a4a');
        if (id) txtc(g, ALIENS[id].name.toUpperCase(), DUAL_X[k], DUAL_Y + 68, 11, active ? '#f0ffe0' : '#a9c69a');
        if (active) { txtc(g, '◀', DUAL_X[k] - 72, DUAL_Y + 6, 16, '#b6ff4d'); txtc(g, '▶', DUAL_X[k] + 72, DUAL_Y + 6, 16, '#b6ff4d'); }
      }
    }
    if (open > 0.9 && !combine) txtc(g, '+', 240, DUAL_Y + 8, 22, '#b6ff4d');
    // preview of the result
    if (open > 0.9) {
      const pv = idB ? (idB === idA ? null : fusionPreview(idA, idB)) : null;
      if (s.fuseA) {
        if (pv) {
          txtc(g, '= ' + pv.name.toUpperCase() + (pv.named ? ' ★' : ''), 240, 186, 12, '#eaffd0');
          txtc(g, pv.hp + ' VIDA · ' + (pv.named ? 'FUSIÓN DE LA SERIE' : 'FUSIÓN ORIGINAL DE OMNI'), 240, 197, 7, '#9fc28a');
        } else txtc(g, '= ' + ALIENS[idA].name.toUpperCase() + ' (SIN FUSIÓN)', 240, 190, 10, '#c9dcc0');
      }
    }
    if (combine > 0) {
      const id = s.fuseA && idB && idB !== s.fuseA ? fusionId(s.fuseA, idB) : idA;
      if (st !== 'BIO_COMBINE' && ALIENS[id]) drawWatchIcon(g, id, 'bio-dna', 240, DUAL_Y, 96, 1);
      g.save(); g.strokeStyle = '#d8ff8a'; g.lineWidth = 3; g.globalAlpha = combine;
      for (let i = 0; i < 2; i++) { g.beginPath(); g.arc(240, DUAL_Y, 20 + ((now / 6 + i * 40) % 80), 0, 7); g.stroke(); }
      g.restore();
    }
    face(g, 240, 232, 32, w, st === 'BIO_LOCK' ? Math.sin(p * Math.PI) : 0, s.fuseA ? 0.6 + 0.3 * Math.sin(now / 120) : 0.2);
    title(g, s, st === 'BIO_SELECT' ? (s.fuseA ? '◀ ▶ elige B · ENTER fusiona · ESC vuelve a A' : '◀ ▶ elige A (cuerpo) · ENTER fija A') : '');
    if (st === 'BIO_FLASH') flashRect(g, '#e4ffc4', 1 - p * 0.35);
    if (st === 'BIO_TRANSFORM') flashRect(g, '#e4ffc4', 0.65 * (1 - p));
  },
};
Object.assign(STATE_SFX, { BIO_ACTIVATE: 'activate', BIO_SPLIT: 'split', BIO_LOCK: 'fusion.select_b', BIO_COMBINE: 'fusion.combine', BIO_FLASH: 'fusion.transform' });

// two-step pick, called from selConfirm / selCancel / selCommit (part-16)
function dualConfirm(s) {
  if (!s.fuseA) {
    s.fuseA = s.list[selIndex(s)];
    player.selected = s.fuseA;
    playWatchSFX('fusion.lock');
    buzz(14);
    if (s.list.length > 1) { s.target = Math.round(s.target) + 1; s.pos = s.target - 0.6; } // suggest a partner
    return true;
  }
  return false;
}
function dualCancel(s) {
  if (!s.fuseA) return false;
  const i = s.list.indexOf(s.fuseA);
  s.fuseA = null;
  if (i >= 0) s.target = s.pos = i;
  playWatchSFX('cancel');
  return true;
}
function dualCommit(s) {
  const b = s.list[selIndex(s)];
  player.selected = s.fuseA;
  player.fusePartner = b !== s.fuseA ? b : null;
}

// ---------------- transform effect: the two parents slide together and merge ----------------
TRANSFORM_FX.bio = {
  dur: 0.9,
  draw(g, p, o) {
    const f = ALIENS[o.id] && ALIENS[o.id].fusion;
    flashRect(g, '#e4ffc4', p < 0.12 ? 0.8 * (1 - p / 0.12) : 0);
    g.save();
    for (let i = 0; i < 36; i++) {
      const t = i / 36, a = p * 10 + t * 12.5, r = 70 * (1 - p * 0.7), y = FX_CY - 70 + t * 140;
      g.fillStyle = i % 2 ? '#b6ff4d' : '#e4ffc4';
      g.globalAlpha = Math.min(1, p * 5) * (1 - Math.max(0, p - 0.8) * 5);
      g.fillRect(Math.round(FX_CX + Math.cos(a) * r), Math.round(y), 3, 3);
      g.fillRect(Math.round(FX_CX - Math.cos(a) * r), Math.round(y), 3, 3);
    }
    g.restore();
    if (f && p < 0.55) {
      const k = eo(p / 0.55), al = Math.min(1, p * 6);
      drawWatchIcon(g, f.a, 'bio-dna', FX_CX - 120 * (1 - k), FX_CY, 104, al);
      drawWatchIcon(g, f.b, 'bio-dna', FX_CX + 120 * (1 - k), FX_CY, 104, al * 0.85);
    } else if (p > 0.15 && p < 0.88) drawWatchIcon(g, o.id, 'bio-dna', FX_CX, FX_CY, 128, Math.min(1, (p - 0.15) * 4) * (p > 0.8 ? (0.88 - p) * 12 : 1));
    flashRect(g, '#f0ffd8', p > 0.5 ? Math.max(0, 1 - Math.abs(p - 0.58) * 7) : 0);
  },
};

// co-op: a partner may show a fusion (or an alien this build lacks): rebuild it, or fall back safely
function remoteAlien(id) {
  return ALIENS[ensureFusion(id) || 'heatblast'];
}
// ============================================================================================
// OMNI TRANSFORMATION CUTSCENE · a short full-screen pixel-art sequence (original, drawn in code from the game's own
// sprites; no frames from the TV series). Beats: hero close-up -> wrist + dial -> SLAM -> energy morph -> reveal.
// Every watch colours it with its own palette/flavour (TRANSFORM_FX names: os, af, ua, ov, bio). ~2.8 s, skippable
// with any key or a tap. Off in co-op (the partner keeps playing) and toggled in the watch menu.
// ============================================================================================
let cineOn = true;
try { cineOn = localStorage.getItem('omni-cine') !== '0'; } catch (e) {}
const CINE_DUR = 2.8;
const CINE_STYLE = {
  os: { c: '#7dff9a', c2: '#2f6b43', bg: '#06140b', flash: '#caffd6' },
  af: { c: '#7dff9a', c2: '#6fd7ff', bg: '#04100f', flash: '#b8ffd0' },
  ua: { c: '#ff6a3d', c2: '#7a1e0c', bg: '#140604', flash: '#ffd0b8' },
  ov: { c: '#c7f2ff', c2: '#3d8fb0', bg: '#04101a', flash: '#e6fbff' },
  bio: { c: '#b6ff4d', c2: '#4f7f2a', bg: '#08140a', flash: '#e4ffc4' },
};
const cineTmp = cv(256, 256);
// draw one sprite frame on the cutscene canvas, bottom-centred; tint = flat colour silhouette
function cineSprite(g, row, frame, cx, by, height, o = {}) {
  const info = spriteInfo(row),
    f = info.table[frame] || info.table[0];
  if (!info.sheet || !f) return;
  const k = height / f[3],
    dw = Math.max(1, Math.round(f[2] * k)),
    dh = Math.max(1, Math.round(height));
  g.save();
  g.imageSmoothingEnabled = false;
  g.globalAlpha = o.alpha == null ? 1 : o.alpha;
  if (o.tint) {
    if (cineTmp.width < f[2] || cineTmp.height < f[3]) { cineTmp.width = Math.max(cineTmp.width, f[2]); cineTmp.height = Math.max(cineTmp.height, f[3]); }
    const t = cineTmp.getContext('2d');
    t.imageSmoothingEnabled = false;
    t.clearRect(0, 0, cineTmp.width, cineTmp.height);
    t.globalCompositeOperation = 'source-over';
    t.drawImage(info.sheet, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]);
    t.globalCompositeOperation = 'source-in';
    t.fillStyle = o.tint;
    t.fillRect(0, 0, cineTmp.width, cineTmp.height);
    t.globalCompositeOperation = 'source-over';
    if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = 12; }
    g.drawImage(cineTmp, 0, 0, f[2], f[3], Math.round(cx - dw / 2), Math.round(by - dh), dw, dh);
  } else {
    if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = 10; }
    if (o.flip) { g.translate(Math.round(cx), 0); g.scale(-1, 1); cx = 0; }
    g.drawImage(info.sheet, f[0], f[1], f[2], f[3], Math.round(cx - dw / 2), Math.round(by - dh), dw, dh);
  }
  g.restore();
}
const heroRow = () => (SKINS[player.skin] || SKINS[0]).row;
// small seeded noise so particles are stable frame to frame
const cineRnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function cineBars(g, k) {
  const h = Math.round(34 * k);
  g.fillStyle = '#000';
  g.fillRect(0, 0, SW, h);
  g.fillRect(0, SH - h, SW, h);
}
function speedLines(g, st, t, n = 26) {
  g.save();
  g.strokeStyle = st.c;
  g.lineWidth = 2;
  for (let i = 0; i < n; i++) {
    const a = cineRnd(i) * 6.283,
      r0 = 60 + ((t * 600 + cineRnd(i + 40) * 300) % 260);
    g.globalAlpha = 0.25 + cineRnd(i + 9) * 0.35;
    g.beginPath();
    g.moveTo(240 + Math.cos(a) * r0, 135 + Math.sin(a) * r0);
    g.lineTo(240 + Math.cos(a) * (r0 + 40), 135 + Math.sin(a) * (r0 + 40));
    g.stroke();
  }
  g.restore();
}
// generic pixel forearm + watch seen from above (not any specific show design)
function cineWrist(g, st, w, cx, cy, rise, iconId, iconStyle) {
  g.save();
  // sleeve, forearm (outlined, two-tone shading) and a clenched fist with knuckles
  g.fillStyle = '#3a2a22'; g.fillRect(0, cy - 34, cx + 44, 68);
  g.fillStyle = '#c98f63'; g.fillRect(0, cy - 30, cx + 40, 60);
  g.fillStyle = '#e3ad80'; g.fillRect(0, cy - 30, cx + 40, 12);
  g.fillStyle = '#9b6a46'; g.fillRect(0, cy + 20, cx + 40, 10);
  g.fillStyle = '#f2f2ee'; g.fillRect(0, cy - 34, 46, 68); g.fillStyle = '#c9c9c2'; g.fillRect(0, cy + 18, 46, 16); g.fillStyle = '#3a2a22'; g.fillRect(46, cy - 34, 3, 68);
  g.fillStyle = '#3a2a22'; g.fillRect(cx + 38, cy - 30, 58, 60);
  g.fillStyle = '#c98f63'; g.fillRect(cx + 40, cy - 26, 52, 52);
  g.fillStyle = '#e3ad80'; g.fillRect(cx + 40, cy - 26, 52, 9);
  for (let i = 0; i < 4; i++) { g.fillStyle = '#e3ad80'; g.fillRect(cx + 83, cy - 24 + i * 13, 9, 9); g.fillStyle = '#8a5a3a'; g.fillRect(cx + 74, cy - 14 + i * 13, 18, 2); }
  g.fillStyle = '#1a2226'; g.fillRect(cx - 34, cy - 36, 68, 72); // strap
  g.fillStyle = '#2b3a40'; g.fillRect(cx - 34, cy - 36, 68, 6);
  const r = 30 + rise * 6;
  g.beginPath(); g.arc(cx, cy - rise * 8, r, 0, 7);
  g.fillStyle = '#10171a'; g.fill();
  g.lineWidth = 4; g.strokeStyle = st.c; g.shadowColor = st.c; g.shadowBlur = 8 + rise * 10; g.stroke();
  g.shadowBlur = 0;
  if (rise > 0.5 && iconId) drawWatchIcon(g, iconId, iconStyle, cx, cy - rise * 8, Math.round(r * 1.6), Math.min(1, (rise - 0.5) * 3));
  else if (!drawWatchLogo(g, w, cx, cy - rise * 8, r * 2.3, rise > 0.2)) symbol(g, w.shape || 'prime', cx, cy - rise * 8, r * 0.45, st.c);
  g.restore();
}
function cinePalm(g, cx, cy, k) { // an open hand slamming down from the top
  const y = lerp(-140, cy - 84, k);
  g.save();
  g.fillStyle = '#3a2a22';
  g.fillRect(cx - 48, y - 4, 96, 96); // outline: palm + four fingers pointing down
  g.fillStyle = '#c98f63'; g.fillRect(cx - 44, y, 88, 50);
  for (let i = 0; i < 4; i++) { g.fillStyle = '#3a2a22'; g.fillRect(cx - 44 + i * 22 + 19, y + 50, 3, 42); g.fillStyle = '#c98f63'; g.fillRect(cx - 44 + i * 22, y + 50, 19, 38 - (i === 0 || i === 3 ? 6 : 0)); g.fillStyle = '#e3ad80'; g.fillRect(cx - 44 + i * 22, y + 50, 5, 30); }
  g.fillStyle = '#e3ad80'; g.fillRect(cx - 44, y, 88, 10);
  g.fillStyle = '#9b6a46'; g.fillRect(cx - 44, y + 42, 88, 4);
  g.fillStyle = '#f2f2ee'; g.fillRect(cx - 50, y - 70, 100, 66); g.fillStyle = '#3a2a22'; g.fillRect(cx - 50, y - 6, 100, 3); // sleeve
  g.restore();
}

TRANSFORM_FX.cine = {
  dur: CINE_DUR,
  draw(g, p, o) {
    const st = CINE_STYLE[o.style] || CINE_STYLE.ov,
      w = getWatch(),
      t = p * CINE_DUR,
      A = ALIENS[o.id] || ALIENS.heatblast,
      fu = A.fusion;
    o.beats = o.beats || {};
    const beat = (k, ev) => { if (!o.beats[k]) { o.beats[k] = 1; if (ev) playWatchSFX(ev); } };
    let sh = 0;
    if (p > 0.36 && p < 0.5) sh = (0.5 - p) * 60;
    g.save();
    if (sh) g.translate(Math.round((cineRnd(Math.floor(t * 60)) - 0.5) * sh), Math.round((cineRnd(Math.floor(t * 60) + 3) - 0.5) * sh));
    // background
    g.fillStyle = st.bg; g.fillRect(-20, -20, SW + 40, SH + 40);
    if (o.style === 'ua') { g.fillStyle = st.c2; for (let i = 0; i < 9; i++) g.fillRect(-20, i * 32 + ((t * 80) % 32) - 16, SW + 40, 6); }
    if (o.style === 'af' || o.style === 'os') { g.fillStyle = st.c; g.globalAlpha = 0.07; for (let y = 0; y < SH; y += 4) g.fillRect(0, y, SW, 1); g.globalAlpha = 1; }
    if (p < 0.16) {
      // 1 · hero close-up, the camera pushes in
      beat('a'); // the dial already played its activate sound
      const k = eo(p / 0.16);
      speedLines(g, st, t, 18);
      cineSprite(g, heroRow(), 0, 250, 470 + k * 40, 520 + k * 60, { glow: st.c2 });
      g.save(); g.globalAlpha = 0.5 * k; g.fillStyle = st.c; g.beginPath(); g.arc(320, 200, 18 + 6 * Math.sin(t * 30), 0, 7); g.fill(); g.restore();
    } else if (p < 0.44) {
      // 2 · wrist close-up: dial pops up and spins through the playlist, then 3 · SLAM
      beat('b');
      const k = (p - 0.16) / 0.2,
        rise = eo(Math.min(1, k * 1.6)),
        list = o.list && o.list.length ? o.list : [o.id],
        spin = k < 0.85 ? list[Math.floor(k * 14 + list.indexOf(fu ? fu.a : o.id) + 1) % list.length] : fu ? fu.a : o.id;
      speedLines(g, st, t);
      cineWrist(g, st, w, 220, 150, rise, ALIENS[spin] ? spin : o.id, w.iconStyle);
      if (p > 0.32) {
        beat('c', 'slam');
        beat('c2', 'confirm');
        cinePalm(g, 220, 150, eo(Math.min(1, (p - 0.32) / 0.06)));
      }
      if (p > 0.38) flashRect(g, st.flash, Math.min(1, (p - 0.38) / 0.04));
    } else if (p < 0.74) {
      // 4 · energy morph: hero silhouette -> alien silhouette inside rings and a DNA helix
      beat('d');
      const k = (p - 0.44) / 0.3,
        hgt = lerp(150, Math.min(220, 150 * (alienHeight(o.id) / 98)), eo(k));
      flashRect(g, st.flash, Math.max(0, 1 - k * 5));
      g.save();
      const grd = g.createRadialGradient(240, 150, 10, 240, 150, 220);
      grd.addColorStop(0, st.c + '88'); grd.addColorStop(1, st.bg + '00');
      g.fillStyle = grd; g.fillRect(0, 0, SW, SH);
      g.strokeStyle = st.c; g.lineWidth = 3;
      for (let i = 0; i < 4; i++) { const q = (k * 2 + i / 4) % 1; g.globalAlpha = 1 - q; g.beginPath(); g.ellipse(240, 150, 30 + q * 230, 12 + q * 80, 0, 0, 7); g.stroke(); }
      g.globalAlpha = 1;
      for (let i = 0; i < 44; i++) {
        const s = i / 44, a = t * 9 + s * 12.6, r = 70 - k * 20, y = 250 - s * 220;
        g.fillStyle = i % 2 ? st.c : '#ffffff';
        g.fillRect(Math.round(240 + Math.cos(a) * r), Math.round(y), 3, 3);
        g.fillRect(Math.round(240 - Math.cos(a) * r), Math.round(y), 3, 3);
      }
      g.restore();
      if (fu) {
        // Biomnitrix: both parents walk into the light and merge
        const m = eo(Math.min(1, k * 1.4));
        cineSprite(g, ALIENS[fu.a].row, 0, lerp(120, 240, m), 250, 170, { tint: ALIENS[fu.a].color, alpha: 1 - Math.max(0, k - 0.7) * 3, glow: st.c });
        cineSprite(g, ALIENS[fu.b].row, 0, lerp(360, 240, m), 250, 170, { tint: ALIENS[fu.b].color, alpha: 0.85 - Math.max(0, k - 0.7) * 3, glow: st.c });
        if (k > 0.7) cineSprite(g, A.row, 0, 240, 250, hgt, { tint: '#ffffff', alpha: (k - 0.7) * 3.3, glow: st.c });
      } else {
        const wob = Math.sin(t * 50) * 3 * (1 - k);
        if (k < 0.55) cineSprite(g, heroRow(), 0, 240 + wob, 250, lerp(150, 120, k), { tint: st.c, alpha: 1 - Math.max(0, k - 0.35) * 5, glow: st.c });
        if (k > 0.35) cineSprite(g, A.row, 0, 240 - wob, 250, hgt, { tint: k > 0.85 ? '#ffffff' : st.c, alpha: Math.min(1, (k - 0.35) * 4), glow: st.c });
      }
      if (o.style === 'ua') symbol(g, 'diamond', 240, 140, 20 + k * 50, st.c, false);
    } else {
      // 5 · reveal: full colour, burst, name banner, letterbox opens
      beat('e', 'transform');
      const k = (p - 0.74) / 0.26,
        hgt = Math.min(220, 150 * (alienHeight(o.id) / 98));
      flashRect(g, '#ffffff', Math.max(0, 0.9 - k * 6));
      g.save();
      g.strokeStyle = st.c; g.lineWidth = 2;
      for (let i = 0; i < 30; i++) {
        const a = cineRnd(i) * 6.283, r = 40 + k * (120 + cineRnd(i + 5) * 120);
        g.globalAlpha = Math.max(0, 1 - k * 1.2);
        g.fillStyle = i % 3 ? A.color : st.c;
        g.fillRect(Math.round(240 + Math.cos(a) * r), Math.round(150 + Math.sin(a) * r * 0.6), 4, 4);
      }
      g.restore();
      cineSprite(g, (player.alienSkins?.[o.id] === 'art' && SKIN_ART[o.id]?.row) || A.row, 0, 240, 252, hgt * (1 + 0.04 * Math.sin(Math.min(1, k * 3) * Math.PI)), { glow: A.color });
      const bx = lerp(-260, 0, eo(Math.min(1, k * 3)));
      g.save();
      g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(bx, 196, 260, 34);
      g.fillStyle = st.c; g.fillRect(bx + 256, 196, 4, 34);
      g.restore();
      txtc(g, A.name.toUpperCase(), bx + 16, 219, 18, '#ffffff', 'left');
      txtc(g, fu ? 'FUSIÓN · ' + ALIENS[fu.a].name.toUpperCase() + ' + ' + ALIENS[fu.b].name.toUpperCase() : w.name.toUpperCase(), bx + 16, 192, 8, st.c, 'left');
    }
    g.restore();
    cineBars(g, p < 0.06 ? p / 0.06 : p > 0.93 ? (1 - p) / 0.07 : 1);
    if (p < 0.9) txtc(g, 'TOCA / TECLA · SALTAR', SW - 10, SH - 12, 7, '#7d8b8e', 'right');
  },
};
function cineSkip() {
  if (!fx || !fx.cine) return false;
  fx.t = Math.max(fx.t, fx.dur * 0.94);
  return true;
}
$('#watchfx').addEventListener('pointerdown', (e) => { if (cineSkip()) e.preventDefault(); });
// ============================================================================================
// OMNI CO-OP (0.9.7) · room codes, friendly fire switch, downed + revive, enemies scaled for two, shared XP.
// Works over every transport (room code, copy-paste crossplay, Wi-Fi). The host owns the world and the rules.
// ============================================================================================
const COOP = {
  enemyToughness: 1.5, // enemies take damage / this while both players are in the zone (≈ +50% health)
  shareXP: 0.75, // the partner in the same zone earns 75% of every kill's EXP
  downTime: 30, // seconds you can wait for a revive before the normal defeat
  reviveTime: 2.5, // seconds your partner must stand next to you
  reviveRange: 95,
  reviveHP: 0.4,
};
try { net.ff = localStorage.getItem('omni-ff') === '1'; } catch (e) { net.ff = false; }
const partnerHere = () => !!(net.peer && net.remote && net.remote.zone === zone && !net.remoteAway);
const coopActive = () => !!(net.role && net.peer);

// ---------------- shared EXP + tougher enemies (host side; enemies live on the host) ----------------
function coopDamage(dmg) {
  return partnerHere() ? dmg / COOP.enemyToughness : dmg;
}
function coopShareXP(amount) {
  if (!partnerHere() || !amount) return;
  const s = Math.max(1, Math.round(amount * COOP.shareXP));
  if (net.source === 'guest') {
    // the guest landed the kill (and already got the full amount): the host gets the share
    const prev = net.source;
    net.source = null;
    xp(s);
    net.source = prev;
    popup(player.x, player.y - 130, '+' + s + ' EXP equipo', '#9fe7ff');
  } else lanSend({ type: 'reward', xp: s, team: true });
}

// ---------------- downed / revive ----------------
// Instead of the normal defeat, a player in co-op with their partner nearby goes down and can be revived.
function coopDown() {
  if (!coopActive() || !partnerHere() || net.remote.downed || player.downed) return false;
  player.downed = { t: COOP.downTime, rev: 0 };
  player.hp = 1;
  player.leap = player.motion = null;
  player.attack = 0;
  player.shield = player.shieldTime = 0;
  if (player.alien) revert(false);
  player.hp = 1;
  burst(player.x, player.y - 40, 24, '#ff8a8a');
  toast('¡DERRIBADO! Tu compañero puede reanimarte (' + COOP.downTime + ' s)');
  playWatchSFX('timeout');
  return true;
}
function coopTick(dt) {
  const d = player.downed;
  if (!d) return;
  if (!coopActive()) { player.downed = null; defeat(); return; } // partner left: normal defeat
  d.t -= dt;
  const near = partnerHere() && !net.remote.downed && dist(player, net.remote) < COOP.reviveRange;
  d.rev = near ? d.rev + dt : Math.max(0, d.rev - dt * 0.5);
  if (d.rev >= COOP.reviveTime) {
    player.downed = null;
    player.hp = Math.round(maxHP() * COOP.reviveHP);
    player.inv = 2;
    burst(player.x, player.y - 50, 30, '#9dff9d');
    toast('¡Reanimado!');
    lanSend({ type: 'revived' });
    coopApply('rescue'); // being revived counts for the Rescue mission too (part-30)
    playWatchSFX('recharged');
    return;
  }
  if (d.t <= 0) {
    player.downed = null;
    defeat();
  }
}
// drawn under/over a downed body (local player or partner)
function drawDowned(o, d) {
  if (!d) return;
  ctx.save();
  ctx.strokeStyle = '#ff7a7a';
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5 + 0.3 * Math.sin(clock * 6);
  ctx.beginPath();
  ctx.ellipse(o.x, o.y - 4, COOP.reviveRange * 0.7, 22, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  txt('DERRIBADO · ' + Math.ceil(d.t) + ' s', o.x, o.y - 120, 10, '#ffb0b0');
  ctx.fillStyle = '#2a1015';
  ctx.fillRect(o.x - 36, o.y - 112, 72, 6);
  ctx.fillStyle = '#9dff9d';
  ctx.fillRect(o.x - 36, o.y - 112, 72 * clamp(d.rev / COOP.reviveTime, 0, 1), 6);
  if (o !== player && dist(player, o) < COOP.reviveRange * 1.6) txt('Quédate cerca para reanimar', o.x, o.y + 22, 9, '#cfffcf');
}

// ---------------- room code menu ----------------
function roomMenu() {
  if (!(window.OmniRoom && window.OmniRoom.supported)) {
    toast('Este dispositivo no admite salas con código');
    return;
  }
  showDialog(
    'SALA CON CÓDIGO · 2 JUGADORES',
    'Crea una sala o únete',
    '<p>El anfitrión crea la sala y le dice el <b>código de 5 letras</b> a su amigo. El amigo lo escribe y pulsa UNIRSE. Funciona entre PC y móvil, en casa o por Internet (los dos necesitan conexión). Primero elige tu raza en el menú.</p>' +
      '<div class="lanfields"><label>Código de la sala<input id="roomjoin" maxlength="9" placeholder="K7QM2" autocapitalize="characters" autocomplete="off" style="text-transform:uppercase;letter-spacing:3px"></label></div>' +
      '<p id="roommsg" style="min-height:14px">' + (net.mode === 'room' && net.role === 'host' && net.room ? 'Tu sala: <b>' + net.room + '</b>' : '') + '</p>',
    [
      ['VOLVER', lanMenu],
      ['CREAR SALA', roomHost],
      ['UNIRSE', () => roomJoin($('#roomjoin').value)],
    ],
  );
  const inp = $('#roomjoin');
  if (inp) inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') roomJoin(inp.value); });
}
function roomPrep(role, info) {
  leaveRoom();
  net.leaving = false;
  net.mode = 'room';
  net.role = role;
  net.peer = false;
  net.waiting = true;
  net.remote = null;
  net.seq = net.seen = 0;
  net.info = info;
  window.__rtcDialog = true;
}
function roomHost() {
  roomPrep('host', 'CREANDO SALA…');
  showDialog(
    'SALA CON CÓDIGO · ANFITRIÓN',
    'Tu código',
    '<p style="text-align:center;font-size:42px;letter-spacing:8px;margin:8px 0" id="roomcodebig">· · · · ·</p><p style="text-align:center">Díselo a tu amigo (WhatsApp, Discord, en voz alta…). Cuando entre, la partida empieza sola.</p><p id="roommsg" style="min-height:14px;text-align:center">Conectando con el servidor de salas…</p>',
    [
      ['CANCELAR', () => { leaveRoom(); closeDialog(); }],
      ['COPIAR', () => {
        const c = net.room || '';
        try { navigator.clipboard.writeText(c); $('#roommsg').textContent = 'Código copiado'; } catch (e) { $('#roommsg').textContent = c; }
      }],
      ['JUGAR MIENTRAS ESPERO', () => { window.__rtcDialog = false; net.waiting = false; closeDialog(); if (!started) $('#play').click(); toast('Sala ' + (net.room || '') + ' abierta · tu amigo puede unirse cuando quiera'); }],
    ],
  );
  window.OmniRoom.host((code) => {
    net.room = code;
    net.info = 'SALA ' + code + ' · ESPERANDO';
    if ($('#roomcodebig')) $('#roomcodebig').textContent = code;
    if ($('#roommsg')) $('#roommsg').textContent = 'Esperando a tu amigo…';
  });
}
function roomJoin(code) {
  const c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c.length < 4) {
    if ($('#roommsg')) $('#roommsg').textContent = 'Escribe el código que te dio el anfitrión';
    return;
  }
  roomPrep('guest', 'UNIÉNDOSE A ' + c + '…');
  net.room = c;
  if ($('#roommsg')) $('#roommsg').textContent = 'Uniéndote a ' + c + '…';
  window.OmniRoom.join(c);
}
function ffToggle() {
  if (net.role === 'guest') return toast('El anfitrión decide el fuego amigo');
  net.ff = !net.ff;
  try { localStorage.setItem('omni-ff', net.ff ? '1' : '0'); } catch (e) {}
  toast('Fuego amigo ' + (net.ff ? 'ACTIVADO' : 'DESACTIVADO'));
  if (net.peer) lanSend(worldPacket());
  lanMenu();
}
// ============================================================================================
// OMNI CONTROLS (0.9.8) · one clear PC layout:
//   WASD / arrows move · J or LEFT CLICK attack (hold to keep attacking) · 1-4 abilities · 5-6 extra abilities
//   Q (or T) OMNITRIX: human -> open the dial, alien -> back to human · SPACE jump (human) / dodge (alien)
//   E talk · F slide (Diamante) · U special · G quick swap dial · mouse wheel picks the alien · M map · K tree · ESC pause
// Inside the dial: ◀ ▶ / A D / wheel to choose · ENTER, SPACE, Q or click to transform · ESC or right-click to close.
// ============================================================================================
const DODGE = { time: 0.2, dist: 150, cool: 0.75, inv: 0.32 };
function dodge() {
  if (!started || paused || dialogOpen || player.downed || player.leap || player.motion || !player.alien) return;
  if ((player.dodgeCool || 0) > 0) return;
  let vx = (keys.d || keys.ArrowRight ? 1 : 0) - (keys.a || keys.ArrowLeft ? 1 : 0) + (stick.x || 0),
    vy = (keys.s || keys.ArrowDown ? 1 : 0) - (keys.w || keys.ArrowUp ? 1 : 0) + (stick.y || 0);
  if (Math.hypot(vx, vy) < 0.2) { vx = player.face || 1; vy = 0; } // standing still: dodge the way you face
  const l = Math.hypot(vx, vy);
  player.dodge = { t: DODGE.time, vx: vx / l, vy: vy / l };
  player.dodgeCool = DODGE.cool;
  player.inv = Math.max(player.inv, DODGE.inv);
  perfectDodgeCheck(); // part-46
  burst(player.x, player.y - 10, 10, alien().color);
  window.OmniSound?.play('punch');
}
function dodgeTick(dt) {
  player.hurtT = Math.max(0, (player.hurtT || 0) - dt);
  player.dodgeCool = Math.max(0, (player.dodgeCool || 0) - dt);
  const d = player.dodge;
  if (!d) return false;
  d.t -= dt;
  const step = (DODGE.dist / DODGE.time) * dt;
  moveActor(player, d.vx * step, d.vy * step * 0.75);
  if (Math.random() < 0.6) particles.push({ x: player.x, y: player.y - 30 - Math.random() * 50, dx: -d.vx * 40, dy: 0, t: 0.25, color: alien().color, size: 3 });
  if (d.t <= 0) player.dodge = null;
  return true;
}
// SPACE: jump as a human, dodge as an alien
function jumpOrDodge() {
  if (player.alien) dodge();
  else jump();
}
// Q / T / the big button: one Omnitrix action
function omnitrixAction() {
  if (!started || paused || dialogOpen || player.downed) return;
  if (!omniActive()) return transform(); // Osmosian: absorption menu
  if (player.alien) return transform(); // transform() while transformed = back to human
  openSelector();
}

// ---- mouse: left click on the world attacks (hold to keep attacking); wheel picks the alien ----
const worldCanvas = $('#world');
worldCanvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse' || e.button !== 0 || !started || paused || dialogOpen || sel) return;
  held = 0;
  attack(0);
});
window.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse' && held === 0) held = -1; });
worldCanvas.addEventListener('wheel', (e) => {
  if (!started || paused || dialogOpen || sel || !omniActive() || player.alien) return;
  e.preventDefault();
  const now = performance.now();
  if (now - (worldCanvas._wheel || 0) < 110) return;
  worldCanvas._wheel = now;
  selectAlien((e.deltaY || e.deltaX) > 0 ? 1 : -1);
}, { passive: false });
worldCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ---- buttons ----
$('#transform').onclick = omnitrixAction;
$('#jump').onclick = jumpOrDodge;

// full cutscene the first time you become each alien this session; after that the quick watch effect
const cineSeen = new Set();
function cineWanted(id) {
  if (cineSeen.has(id)) return false;
  cineSeen.add(id);
  return true;
}
// ============================================================================================
// OMNI ALIEN SHEETS · real art for roster aliens (www/alien-sheets.js, generated by tools/import_sheets.py).
// Each sheet has 12 poses in the approved order: 0 idle · 1 ready · 2 walk · 3 dash · 4-7 attacks · 8 leap/special
// · 9-10 hurt (per alien) · 11 power-up. Rows >= 2000 are these atlases; feet anchors keep every pose on the ground.
// An alien with a sheet replaces its recoloured placeholder automatically; aliens without one keep the placeholder.
// ============================================================================================
const SHEET_ROWS = {};
const SKIN_ART = {}; // "new art" skins for the original six: SKIN_ART[alienId] = { row, hurt }
// which pose each kind of move shows (kit moves, part-17)
const SHEET_KIND_FRAME = { bolt: 4, swarm: 6, chain: 6, slam: 5, dash: 3, nova: 11, meteor: 8, field: 7, shield: 11, heal: 11, phase: 8, drain: 5 };
(function loadSheets() {
  const S = window.OMNI_SHEETS || {};
  let k = 0;
  for (const [id, m] of Object.entries(S)) {
    const skinOf = id.startsWith('skin_') ? id.slice(5) : null;
    if (!ALIENS[skinOf || id]) continue;
    const row = 2000 + k++,
      img = new Image();
    img.src = m.src;
    SHEET_ROWS[row] = { table: m.table, sheet: img, anchors: m.anchors, base: m.base };
    if (skinOf) {
      SKIN_ART[skinOf] = { row, hurt: m.hurt };
      continue;
    }
    ALIENS[id].row = row;
    ALIENS[id].sheet = { hurt: m.hurt };
  }
})();
// pose for an alien that has a sheet (null = use the normal rules)
function sheetPose(o) {
  const d = o.alien && ALIENS[o.activeAlien],
    sh = d && d.sheet;
  if (!sh) return null;
  if (o.attack > 0) return o.attackFrame >= 3 && o.attackFrame <= 11 ? o.attackFrame : 4;
  const tv = o.travel && (o.travel.type || o.travel); // travelling pose (part-24)
  if (tv && o.moving !== false) return { roll: 4, charge: 3, speed: 3, leap: 8, flight: 8, phase: 3, burrow: 7, blink: 0 }[tv] ?? 3;
  if ((o.hurtT || 0) > 0) return sh.hurt;
  if (o.leap) return 8;
  return o.moving ? 1 + (Math.floor(o.anim || 0) % 2) : 0;
}

// ---------------- "new art" skins (same powers, different look) ----------------
const skinArt = (o) => (o.alien && o.alienSkins && o.alienSkins[o.activeAlien] === 'art' && SKIN_ART[o.activeAlien]) || null;
const TRAVEL_POSE = { roll: 4, charge: 3, speed: 3, leap: 8, flight: 8, phase: 3, burrow: 7, blink: 0 };
function skinArtPose(o, sk) {
  if (o.cast && o.cast.t > 0) return [4, 6, 7, 11, 5, 8][o.cast.i] ?? 4; // Heatblast / Diamante / Insectoide casts
  if (o.attack > 0) return { 3: 4, 4: 5, 5: 8, 6: 6, 7: 7 }[o.attackFrame] ?? 4;
  const tv = o.travel && (o.travel.type || o.travel);
  if (tv && o.moving !== false) return TRAVEL_POSE[tv] ?? 3;
  if ((o.hurtT || 0) > 0) return sk.hurt;
  if (o.motion && o.motion.type === 'slide') return 3;
  if (o.leap) return 8;
  if (o.activeAlien === 'insect' && o.flight > 0) return 7;
  return o.moving ? 1 + (Math.floor(o.anim || 0) % 2) : 0;
}
function setAlienSkin(alienId, skin) {
  if (race !== 'omni' || !ALIENS[alienId]) return false;
  if (skin === 'art' && !SKIN_ART[alienId]) return false;
  if (skin === 'concert' && !(alienId === 'fourarms' && player.unlockedAlienSkins.fourarmsConcert)) return false;
  player.alienSkins[alienId] = skin;
  persistGame();
  return true;
}
// ============================================================================================
// OMNI WATCH ASSETS · original watch marks, 12-frame logo animations and recorded SFX (tools/watch-assets).
// Watch -> art profile. A watch without a profile (Biomnitrix) keeps its procedural face and synth sounds.
// Sounds go through the same semantic events as before (playWatchSFX); missing events fall back to the synth recipe.
// ============================================================================================
const WATCH_ART = { prototype: 'classic', recalibrated: 'alien_force', ultimatrix: 'ultimatrix', albedo: 'ultimatrix', completed: 'omniverse' };
const WATCH_ART_FILTER = { albedo: 'hue-rotate(240deg) saturate(1.5)' }; // Albedo: the Ultimatrix mark in red
const SFX_ROUTES = {
  classic: { activate: 'activate', raise: 'activate', scroll: 'dial_tick', select: 'select', confirm: 'select', slam: 'slam', transform: 'transform', quick_transform: 'transform', warning: 'timeout_warning', low_power: 'timeout_warning', timeout: 'timeout', recharged: 'recharge', scan_start: 'dna_scan', dna_added: 'dna_scan' },
  alien_force: { activate: 'activate', hologram_in: 'hologram_open', open: 'hologram_open', scroll: 'scroll', select: 'select', confirm: 'select', transform: 'transform', quick_transform: 'transform', timeout: 'timeout', recharged: 'recharge', error: 'error', invalid: 'error', locked: 'error' },
  ultimatrix: { activate: 'activate', scroll: 'scroll', select: 'select', confirm: 'select', transform: 'transform', quick_transform: 'transform', 'ultimate.activate': 'ultimate_trigger', 'ultimate.mechanical': 'ultimate_mechanical', 'ultimate.transform': 'ultimate_transform', 'ultimate.revert': 'ultimate_revert' },
  omniverse: { activate: 'activate', open: 'faceplate_open', scroll: 'scroll_tick', select: 'snap', confirm: 'select', transform: 'transform', quick_transform: 'transform', warning: 'timeout_warning', low_power: 'timeout_warning', timeout: 'timeout', recharged: 'recharge', master_control: 'master_control' },
};
for (const [watch, art] of Object.entries(WATCH_ART)) {
  const prof = WATCHES[watch] && WATCHES[watch].sfxProfile;
  if (!prof) continue;
  SFX_FILES[prof] = SFX_FILES[prof] || {};
  for (const [ev, file] of Object.entries(SFX_ROUTES[art])) SFX_FILES[prof][ev] = 'assets/sfx-' + art + '-' + file + '.wav';
}
// watches that use a recorded sound set but keep their own face (watch implementation pack: Biomnitrix -> Omniverse sounds)
const WATCH_SFX_ONLY = { biomnitrix: 'omniverse' };
for (const [watch, art] of Object.entries(WATCH_SFX_ONLY)) {
  const prof = WATCHES[watch] && WATCHES[watch].sfxProfile;
  if (!prof) continue;
  SFX_FILES[prof] = SFX_FILES[prof] || {};
  for (const [ev, file] of Object.entries(SFX_ROUTES[art])) if (!SFX_FILES[prof][ev]) SFX_FILES[prof][ev] = 'assets/sfx-' + art + '-' + file + '.wav';
}
// one <audio> per file, cloned when the same sound overlaps (fast scroll ticks)
const sfxPool = {};
function playSfxFile(file) {
  try {
    const vol = (window.OmniSound?.volumes?.sfx ?? 0.5) * 1.4;
    if (vol <= 0) return true;
    let a = sfxPool[file];
    if (!a) a = sfxPool[file] = new Audio(file);
    const p = a.paused || a.ended ? a : a.cloneNode();
    p.volume = Math.min(1, vol);
    p.currentTime = 0;
    const r = p.play();
    if (r && r.catch) r.catch(() => {});
    return true;
  } catch (e) {
    return false;
  }
}
// logos
const WATCH_LOGO = {};
for (const art of new Set(Object.values(WATCH_ART))) {
  const mark = new Image(),
    anim = new Image();
  mark.src = 'assets/logo-' + art + '.png';
  anim.src = 'assets/logo-' + art + '-anim.webp';
  WATCH_LOGO[art] = { mark, anim };
}
const imgReady = (im) => im && im.complete && im.naturalWidth > 0;
// draws the watch's logo; returns false when the watch has none (caller draws the procedural face)
function drawWatchLogo(g, w, cx, cy, size, animate) {
  const art = WATCH_ART[w.id],
    L = art && WATCH_LOGO[art];
  if (!L) return false;
  const useAnim = animate && imgReady(L.anim),
    img = useAnim ? L.anim : L.mark;
  if (!imgReady(img)) return false;
  g.save();
  g.imageSmoothingEnabled = true;
  if (WATCH_ART_FILTER[w.id] && 'filter' in g) g.filter = WATCH_ART_FILTER[w.id];
  if (useAnim) {
    const f = Math.floor(performance.now() / 80) % 12;
    g.drawImage(img, f * 256, 0, 256, 256, cx - size / 2, cy - size / 2, size, size);
  } else g.drawImage(img, cx - size / 2, cy - size / 2, size, size);
  g.restore();
  return true;
}
// ============================================================================================
// OMNI TRAVERSAL (0.10) · every alien gets its own fast way to move. Hold SHIFT (PC) or push the joystick all the
// way (phone) while moving. Costs a little extra battery. Types:
//   speed  super-speed with afterimages      flight  flies above the ground       roll   rolls, rams enemies
//   charge shoulder charge, rams enemies     leap    long bounding hops           phase  intangible glide
//   blink  short teleports                   burrow  digs underground, untouchable
// ============================================================================================
const TRAVEL_TYPES = {
  speed: { name: 'SUPERVELOCIDAD', mult: 2.4, drain: 0.6 },
  flight: { name: 'VUELO', mult: 1.9, drain: 0.7, lift: 44 },
  roll: { name: 'RODAR', mult: 2.3, drain: 0.6, ram: 18 },
  charge: { name: 'EMBESTIR', mult: 1.8, drain: 0.5, ram: 14 },
  leap: { name: 'SALTOS', mult: 2.1, drain: 0.5 },
  phase: { name: 'INTANGIBLE', mult: 1.8, drain: 0.9, alpha: 0.45, safe: true },
  blink: { name: 'TELETRANSPORTE', mult: 1, drain: 0.8, blink: 72 },
  burrow: { name: 'EXCAVAR', mult: 2.0, drain: 0.8, alpha: 0.18, safe: true },
};
// per alien (the alien's best-known way of getting around); anything not listed falls back to its archetype
const TRAVEL_BY_ALIEN = {
  xlr8: 'speed', fasttrack: 'speed', feedback: 'speed', ditto: 'speed', juryrigg: 'speed', greymatter: 'speed', ripjaws: 'speed', diamond: 'speed', buzzshock: 'speed',
  heatblast: 'flight', insect: 'flight', jetray: 'flight', astrodactyl: 'flight', bigchill: 'flight', whampire: 'flight', atomix: 'flight', gravattack: 'flight', lodestar: 'flight', nanomech: 'flight', peskydust: 'flight', brainstorm: 'flight', ampfibian: 'flight', alienx: 'flight',
  cannonbolt: 'roll', ballweevil: 'roll', terraspin: 'roll',
  fourarms: 'leap', bestia: 'leap', wildvine: 'leap', spidermonkey: 'leap', crashhopper: 'leap', blitzwolfer: 'leap', bullfrag: 'leap', kickinhawk: 'leap', toepick: 'leap',
  ghostfreak: 'phase', chamalien: 'phase', upgrade: 'phase', goop: 'phase', snareoh: 'phase',
  eyeguy: 'blink', echoecho: 'blink', clockwork: 'blink',
  armodrillo: 'burrow', molestache: 'burrow',
};
const TRAVEL_BY_KIT = { speedy: 'speed', brute: 'charge', tank: 'charge', blaster: 'flight', trickster: 'phase', support: 'blink', beast: 'leap', ghost: 'phase', fusion: null };
function travelType(id = player.activeAlien) {
  const A = ALIENS[id];
  if (!A) return null;
  if (A.fusion) return travelType(A.fusion.b) || travelType(A.fusion.a); // fusions travel like their partner
  return TRAVEL_BY_ALIEN[id] || TRAVEL_BY_KIT[A.kit] || 'charge';
}
const travelName = (id) => (TRAVEL_TYPES[travelType(id)] || {}).name || '';
let stickFull = 0;
function travelWanted(dt) {
  const s = Math.hypot(stick.x || 0, stick.y || 0);
  stickFull = s > 0.95 ? stickFull + dt : 0;
  return !!keys.Shift || stickFull > 0.3;
}
function travelTick(dt) {
  const on = player.alien && race !== 'osmo' && player.moving && !player.downed && !player.leap && !player.motion && player.battery > 2 && travelWanted(dt);
  const type = on ? travelType() : null,
    T = type && TRAVEL_TYPES[type];
  if (!T) {
    if (player.travel) endTravel();
    return;
  }
  if (!player.travel || player.travel.type !== type) {
    player.travel = { type, t: 0, hop: 0, blink: 0, hits: {} };
    if (!player.travelSeen) {
      player.travelSeen = true;
      toast(T.name + ' · mantén SHIFT o empuja el joystick a fondo');
    }
  }
  const tr = player.travel;
  tr.t += dt;
  player.battery = Math.max(1, player.battery - T.drain * dt);
  if (T.safe) player.inv = Math.max(player.inv, 0.12);
  // blink: hop forward in short teleports
  if (T.blink) {
    tr.blink -= dt;
    if (tr.blink <= 0) {
      tr.blink = 0.28;
      burst(player.x, player.y - 50, 10, alien().color);
      moveActor(player, player.dx * T.blink, player.dy * T.blink * 0.75);
      burst(player.x, player.y - 50, 10, '#ffffff');
    }
  }
  // ramming types damage what they run through (once per target every 0.6 s)
  if (T.ram) {
    for (const e of combatants()) {
      if (!e.alive || dist(player, e) > 55) continue;
      const k = String(e.kind || 'e') + e.id;
      if ((tr.hits[k] || 0) > tr.t) continue;
      tr.hits[k] = tr.t + 0.6;
      damageTarget(e, T.ram * multiplier(), 0.3);
      burst(e.x, e.y - 40, 8, alien().color);
      shake = Math.max(shake || 0, 0.06);
    }
  }
  // trails
  if (!paused && Math.random() < 0.7) {
    const c = type === 'burrow' ? '#8a6a45' : alien().color;
    particles.push({ x: player.x - player.dx * 20 + (Math.random() - 0.5) * 16, y: player.y - (type === 'flight' ? 10 : 25) - Math.random() * 40, dx: -player.dx * 60, dy: type === 'burrow' ? -40 : 0, t: 0.3, color: c, size: type === 'speed' ? 4 : 3 });
  }
  if (type === 'leap') {
    const before = tr.hop;
    tr.hop = (tr.hop + dt * 2.6) % 1;
    if (tr.hop < before) burst(player.x, player.y - 2, 8, '#cdb894'); // landing dust
  }
}
function endTravel() {
  player.travel = null;
}
// movement multiplier, extra height and transparency for drawing
function travelMult() {
  const T = player.travel && TRAVEL_TYPES[player.travel.type];
  return T ? T.mult : 1;
}
function travelLift(o = player) {
  const type = o === player ? player.travel && player.travel.type : o.travel;
  if (!type) return 0;
  if (type === 'flight') return TRAVEL_TYPES.flight.lift + Math.sin(clock * 6) * 4;
  if (type === 'leap') {
    const h = o === player && player.travel ? player.travel.hop : (clock * 2.6) % 1;
    return Math.sin(h * Math.PI) * 52;
  }
  return 0;
}
function travelAlpha(o = player) {
  const type = o === player ? player.travel && player.travel.type : o.travel;
  const T = type && TRAVEL_TYPES[type];
  return T && T.alpha ? T.alpha : 1;
}
// 0.15: the approved transformation storyboards (www/storyboards.js, tools/import_storyboards.py) — one comic page per
// alien, played panel by panel in reading order. Each shot is a crop of the page; tall panels are shown whole over a
// dimmed copy of themselves. Only the selected alien's page is loaded (memory on phones); if it isn't ready yet the
// procedural cutscene plays instead and the storyboard is used next time.
const STORY = window.OMNI_CUTSCENES || {};
const BOARDS = window.OMNI_STORYBOARDS || {};
const storyImgCache = {};
let storyCacheOrder = [];
function storyImg(src) {
  if (!storyImgCache[src]) {
    const im = new Image();
    im.src = src;
    storyImgCache[src] = im;
    storyCacheOrder.push(src);
    while (storyCacheOrder.length > 5) delete storyImgCache[storyCacheOrder.shift()]; // keep a few pages decoded at most
  }
  return storyImgCache[src];
}
// Upchuck has two pages: Perk (classic watch) and Murk (every later watch)
function boardId(id) {
  if (id === 'upchuck' && BOARDS.upchuck_murk && typeof getWatch === 'function' && getWatch().id !== 'prototype') return 'upchuck_murk';
  return id;
}
// 0.15.3 "show style": every panel full screen like the cartoon's close-ups, zoom-through cuts between them, a quick
// flash on the watch slam, then the camera pulls back from the alien's face to the full-body reveal with a slam.
function boardShots(id) {
  const b = BOARDS[boardId(id)];
  if (!b || !b.panels || !b.panels.length) return null;
  const n = b.panels.length,
    each = 0.45; // 0.15.7: max 10 panels per scene at an even pace (about 5.5 s each)
  return b.panels.map((c, i) => {
    const kind = i === n - 1 ? 'reveal' : i === 0 ? 'intro' : i === 1 ? 'flash' : 'morph';
    return {
      src: b.src, crop: c, aspect: b.aspect, era: b.era, idx: i, n, kind,
      dur: kind === 'reveal' ? 1.6 : kind === 'intro' ? 0.55 : kind === 'flash' ? 0.35 : each,
      from: [1.0, 0.5, 0.5], to: [1.0, 0.5, 0.5],
      fx: kind === 'reveal' ? ['nocut'] : kind === 'flash' ? ['flash', 'pulse'] : ['nocut'],
      sfx: kind === 'reveal' ? ['confirm'] : [],
    };
  });
}
function storyFor(id) {
  const b = boardShots(id);
  if (b) return b;
  return STORY[id] && STORY[id].length ? [...(STORY._intro || []), ...STORY[id]] : null;
}
function storyPreload(id) {
  const b = BOARDS[boardId(id)];
  if (b) storyImg(b.src);
  else if (STORY[id]) for (const s of [...(STORY._intro || []), ...STORY[id]]) storyImg(s.src);
}
// keep the page of the alien on the dial loaded, so the scene is ready when you transform
setInterval(() => {
  try {
    if (started && race === 'omni' && player.selected) storyPreload(player.selected);
  } catch (e) {}
}, 800);
let storyRun = null,
  storyRaf = 0,
  storyLast = 0,
  storyTap = 0;
const storyCanvas = $('#storyfx');
// the storyboard canvas covers the WHOLE screen (wide phones included), not just the 16:9 game area
function storyFit() {
  if (!storyCanvas) return;
  if (storyCanvas.parentElement !== document.body) document.body.append(storyCanvas);
  const dpr = Math.min(2, window.devicePixelRatio || 1),
    h = Math.round(Math.max(540, Math.min(900, innerHeight * dpr))),
    w = Math.round((h * innerWidth) / Math.max(1, innerHeight));
  if (storyCanvas.width !== w || storyCanvas.height !== h) {
    storyCanvas.width = w;
    storyCanvas.height = h;
  }
  Object.assign(storyCanvas.style, { position: 'fixed', left: '0', top: '0', width: '100vw', height: '100vh', zIndex: '50' });
}
addEventListener('resize', () => storyRun && storyFit());
function storyPlay(id) {
  const shots = storyFor(id);
  if (!shots || !storyCanvas) return false;
  if (!shots.every((s) => imgReady(storyImg(s.src)))) {
    if (typeof cineSeen !== 'undefined') cineSeen.delete(id); // still loading: the storyboard plays next time
    return false;
  }
  storyFit();
  storyRun = { shots, i: 0, t: 0, started: {} };
  storySnap = null;
  storySparks = [];
  storyCanvas.classList.remove('hidden');
  storyLast = performance.now();
  if (!storyRaf) storyRaf = requestAnimationFrame(storyLoop);
  return true;
}
function storyEnd() {
  storyRun = null;
  if (storyCanvas) storyCanvas.classList.add('hidden');
  last = performance.now();
}
function storySkip() {
  if (!storyRun) return false;
  storyEnd();
  return true;
}
function storyLoop(now) {
  storyRaf = 0;
  if (!storyRun) return;
  const dt = Math.min(0.05, (now - storyLast) / 1000);
  storyLast = now;
  const r = storyRun;
  r.t += dt;
  let s = r.shots[r.i];
  if (r.t >= s.dur) {
    storySnapshot();
    r.i++;
    r.t = 0;
    if (r.i >= r.shots.length) return storyEnd();
    s = r.shots[r.i];
  }
  if (!r.started[r.i]) {
    r.started[r.i] = true;
    (s.sfx || []).forEach((ev, k) => setTimeout(() => storyRun && playWatchSFX(ev), k * 160));
  }
  storyDraw(storyCanvas.getContext('2d'), s, r.t, r.i === r.shots.length - 1);
  storyRaf = requestAnimationFrame(storyLoop);
}
let storySnap = null,
  storySparks = [];
function storySnapshot() {
  try {
    if (!storySnap) storySnap = document.createElement('canvas');
    storySnap.width = storyCanvas.width;
    storySnap.height = storyCanvas.height;
    storySnap.getContext('2d').drawImage(storyCanvas, 0, 0);
  } catch (e) {
    storySnap = null;
  }
}
function storyDraw(g, s, t, lastShot) {
  const W = storyCanvas.width,
    H = storyCanvas.height,
    p = Math.min(1, t / s.dur),
    e = 1 - Math.pow(1 - p, 2),
    img = storyImg(s.src),
    fx = s.fx || [];
  const z = lerp(s.from[0], s.to[0], e),
    fxp = lerp(s.from[1], s.to[1], e),
    fyp = lerp(s.from[2], s.to[2], e);
  if (s.crop) return boardDraw(g, s, t, p, z, fxp, fyp, img, fx, lastShot);
  // cover fit, then zoom around the focus point while keeping the screen covered
  const k = Math.max(W / s.w, H / s.h) * z,
    dw = s.w * k,
    dh = s.h * k;
  let x = W / 2 - fxp * dw,
    y = H / 2 - fyp * dh;
  x = Math.min(0, Math.max(W - dw, x));
  y = Math.min(0, Math.max(H - dh, y));
  let sx = 0,
    sy = 0;
  if (fx.includes('shake')) {
    const a = 7 * Math.max(0, 1 - t / 0.45) + 1.5;
    sx = (Math.random() - 0.5) * a * 2;
    sy = (Math.random() - 0.5) * a * 2;
  }
  g.save();
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  g.imageSmoothingEnabled = true;
  g.drawImage(img, x + sx, y + sy, dw, dh);
  g.restore();
  storyOverlay(g, W, H, t, p, s, fx, lastShot);
}
function storyOverlay(g, W, H, t, p, s, fx, lastShot) {
  g.save();
  if (fx.includes('pulse')) {
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.25 + 0.2 * Math.sin(t * 18);
    g.fillStyle = '#5dff6a';
    g.fillRect(0, 0, W, H);
  }
  if (fx.includes('glow')) {
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.12 + 0.1 * Math.sin(t * 10);
    g.fillStyle = '#ffd36a';
    g.fillRect(0, 0, W, H);
  }
  g.restore();
  // every cut opens with a quick green-white flash; "flash" shots get a longer one
  const fl = fx.includes('flash') ? 0.22 : fx.includes('nocut') ? 0 : 0.07;
  if (fl && t < fl) {
    g.save();
    g.globalAlpha = 1 - t / fl;
    g.fillStyle = t < fl / 2 ? '#f4fff0' : '#9dff8a';
    g.fillRect(0, 0, W, H);
    g.restore();
  }
  if (lastShot && p > 0.85) {
    g.save();
    g.globalAlpha = (p - 0.85) / 0.15;
    g.fillStyle = '#fff';
    g.fillRect(0, 0, W, H);
    g.restore();
  }
  g.save();
  const u = H / 540;
  g.font = 'bold ' + Math.round(13 * u) + 'px Arial';
  g.textAlign = 'center';
  g.fillStyle = 'rgba(0,0,0,.55)';
  g.fillRect(W / 2 - 150 * u, H - 30 * u, 300 * u, 20 * u);
  g.fillStyle = '#e8f4e6';
  g.fillText('DOBLE TOQUE O TECLA PARA SALTAR', W / 2, H - 15 * u);
  g.restore();
}
// one comic panel of a storyboard page, drawn full screen ("show style")
function boardDraw(g, s, t, p, z0, fxp0, fyp0, img, fx, lastShot) {
  const W = storyCanvas.width,
    H = storyCanvas.height,
    iw = img.naturalWidth || img.width,
    ih = img.naturalHeight || img.height,
    sy = s.crop[1] * ih,
    sh = s.crop[3] * ih;
  let sx = s.crop[0] * iw,
    sw = s.crop[2] * iw;
  // 0.15.8: every panel is shown at the SAME height (no jumping between big and small boxes); a panel wider than the
  // screen is trimmed at its sides instead of being shrunk
  const fitH = (H * 0.96) / sh;
  if (sw * fitH > W) {
    const nw = W / fitH;
    sx += (sw - nw) / 2;
    sw = nw;
  }
  const cover = Math.max(W / sw, H / sh),
    contain = Math.min(W / sw, H / sh),
    ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3),
    xray = s.era !== 'classic';
  g.save();
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  g.imageSmoothingEnabled = true;
  let shake = 0;
  // 0.15.4: frame the WHOLE panel (only a little tighter than "fit"), never a big crop. The space around a tall panel is
  // filled with a soft, dimmed copy of the same panel, so there are no black bars.
  const fit = fitH;
  storySoftBack(g, img, sx, sy, sw, sh, W, H, s);
  if (s.kind === 'reveal') {
    storyRays(g, W, H, t, 0.2);
    // the alien drops in slightly big and slams into place
    const land = ease(t / 0.32),
      k = fit * lerp(1.12, 1.0, land) * (1 - 0.012 + 0.012 * Math.sin(t * 3)),
      dw = sw * k,
      dh = sh * k;
    if (t > 0.3 && t < 0.7) shake = 8 * (1 - (t - 0.3) / 0.4);
    const x = (W - dw) / 2 + (Math.random() - 0.5) * shake,
      y = (H - dh) / 2 + (Math.random() - 0.5) * shake;
    g.shadowColor = '#5dff6a';
    g.shadowBlur = 24;
    g.drawImage(img, sx, sy, sw, sh, x, y, dw, dh);
    g.shadowBlur = 0;
    if (t > 0.28 && t < 0.55) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.55 * (1 - (t - 0.28) / 0.27);
      g.fillStyle = '#b8ffb0';
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
    }
  } else {
    // gentle push-in with a small camera roll
    const e = ease(p),
      z = lerp(1.0, 1.03, e),
      roll = (s.idx % 2 ? 1 : -1) * 0.01 * (0.4 + e),
      k = fit * z,
      dw = sw * k,
      dh = sh * k;
    if (s.idx > s.n * 0.55) shake = 2.5 * (1 - p);
    g.translate(W / 2 + (Math.random() - 0.5) * shake, H / 2 + (Math.random() - 0.5) * shake);
    g.rotate(roll);
    g.shadowColor = 'rgba(93,255,106,.7)';
    g.shadowBlur = 16;
    g.drawImage(img, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
    g.shadowBlur = 0;
    g.setTransform(1, 0, 0, 1, 0, 0);
    // Alien Force / Ultimate: the green X-ray pulse through the body stages
    if (xray && s.kind === 'morph' && s.idx < s.n * 0.6) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.08 + 0.06 * Math.sin(t * 30);
      g.fillStyle = '#3dff5a';
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
    }
    if (s.kind === 'flash') storyRays(g, W, H, t, 0.35 * (1 - p));
  }
  // zoom-through cut: the previous shot rushes past the camera
  if (storySnap && t < 0.14 && s.idx > 0) {
    const q = t / 0.14,
      sc = 1 + q * 0.6;
    g.globalAlpha = 0.85 * (1 - q);
    g.drawImage(storySnap, (W - W * sc) / 2, (H - H * sc) / 2, W * sc, H * sc);
    g.globalAlpha = 1;
  }
  storySparksDraw(g, W, H, s.kind === 'reveal' ? 3 : s.kind === 'flash' ? 4 : 1);
  // vignette
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,20,0,.55)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
  g.restore();
  storyOverlay(g, W, H, t, p, s, fx, lastShot);
}
const storySoft = { key: null, c: null };
function storySoftBack(g, img, sx, sy, sw, sh, W, H, s) {
  const key = s.src + s.crop.join(',');
  if (storySoft.key !== key) {
    const c = storySoft.c || document.createElement('canvas');
    c.width = 48;
    c.height = 27;
    const cg = c.getContext('2d'),
      k = Math.max(48 / sw, 27 / sh);
    cg.imageSmoothingEnabled = true;
    cg.drawImage(img, sx, sy, sw, sh, (48 - sw * k) / 2, (27 - sh * k) / 2, sw * k, sh * k);
    storySoft.c = c;
    storySoft.key = key;
  }
  g.save();
  g.imageSmoothingEnabled = true;
  g.globalAlpha = 0.7;
  g.drawImage(storySoft.c, -20, -12, W + 40, H + 24);
  g.globalAlpha = 1;
  g.fillStyle = 'rgba(0,14,0,.45)';
  g.fillRect(0, 0, W, H);
  g.restore();
}
// turning green light rays from the centre (watch energy)
function storyRays(g, W, H, t, a) {
  if (a <= 0) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.translate(W / 2, H / 2);
  g.rotate(t * 0.9);
  for (let i = 0; i < 14; i++) {
    g.rotate((Math.PI * 2) / 14);
    g.globalAlpha = a * (0.55 + 0.45 * Math.sin(t * 7 + i));
    g.fillStyle = i % 2 ? '#5dff6a' : '#c8ffbf';
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(W, -36);
    g.lineTo(W, 36);
    g.closePath();
    g.fill();
  }
  g.restore();
}
// green energy sparks flying out from the centre
function storySparksDraw(g, W, H, rate) {
  for (let i = 0; i < rate; i++) {
    const a = Math.random() * Math.PI * 2,
      v = 260 + Math.random() * 520;
    storySparks.push({ x: W / 2 + Math.cos(a) * 40, y: H / 2 + Math.sin(a) * 30, dx: Math.cos(a) * v, dy: Math.sin(a) * v, t: 0.6 + Math.random() * 0.4 });
  }
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const sp of storySparks) {
    sp.t -= 1 / 60;
    sp.x += sp.dx / 60;
    sp.y += sp.dy / 60;
    g.globalAlpha = Math.max(0, Math.min(1, sp.t * 1.5));
    g.fillStyle = '#9dff8a';
    g.fillRect(sp.x, sp.y, 3, 3);
  }
  g.restore();
  storySparks = storySparks.filter((sp) => sp.t > 0 && sp.x > -10 && sp.x < W + 10 && sp.y > -10 && sp.y < H + 10).slice(-160);
}
if (storyCanvas)
  storyCanvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const now = performance.now();
    if (e.pointerType === 'mouse' || now - storyTap < 400) storySkip(); // mouse: one click · touch: double tap
    storyTap = now;
  });
// ============================================================================================
// OMNI ALIEN PUZZLES (0.13) · sealed alcoves in the back of an area with a reward capsule inside. Each lock needs a
// kind of alien: boulder (heavy hitters / roll / charge), tunnel (small aliens / burrow), barrier (intangible /
// teleport / burrow while fast-travelling), chasm (flight / leaps while fast-travelling), ice (fire aliens) and
// machine (tech aliens press E). Opened locks and claimed rewards are saved in player.puzzles.
// ============================================================================================
const PUZZLE_TYPES = {
  boulder: { name: 'Roca agrietada', need: 'Un alien fuerte: golpéala, o embiste/rueda contra ella (SHIFT)', hits: 3 },
  tunnel: { name: 'Túnel estrecho', need: 'Un alien pequeño (Materia Gris, Nanomech…) o excavar (SHIFT)' },
  barrier: { name: 'Barrera de energía', need: 'Crúzala intangible, teletransportándote o excavando (SHIFT)' },
  chasm: { name: 'Grieta', need: 'Crúzala volando o a saltos (SHIFT)' },
  ice: { name: 'Bloque de hielo', need: 'Un alien de fuego: atácalo para derretirlo', hits: 3 },
  machine: { name: 'Máquina averiada', need: 'Un alien tecnológico: acércate y pulsa E' },
};
// zone index -> [type, x, reward]
const PUZZLE_SPOTS = {
  0: [['boulder', 620, 'dna'], ['tunnel', 1050, 'coins']],
  2: [['barrier', 420, 'dna'], ['chasm', 1000, 'xp']],
  5: [['ice', 700, 'dna'], ['machine', 950, 'coins']],
  6: [['ice', 400, 'xp'], ['barrier', 1100, 'dna']],
  7: [['boulder', 350, 'coins'], ['tunnel', 1350, 'dna']],
  11: [['chasm', 450, 'xp'], ['boulder', 1150, 'dna']],
  8: [['machine', 500, 'xp']],
};
const FIRE_ALIENS = ['heatblast', 'swampfire', 'nrg', 'atomix'];
const TECH_ALIENS = ['upgrade', 'greymatter', 'juryrigg', 'brainstorm', 'nanomech', 'clockwork'];
const HEAVY_ALIENS = ['fourarms', 'diamond', 'waybig', 'humungousaur', 'armodrillo', 'rath', 'bloxx', 'terraspin'];
const alienParents = (id) => (ALIENS[id] && ALIENS[id].fusion ? [ALIENS[id].fusion.a, ALIENS[id].fusion.b] : [id]);
const alienIs = (list) => player.alien && alienParents(player.activeAlien).some((id) => list.includes(id));
function isHeavy() {
  if (!player.alien) return false;
  return alienParents(player.activeAlien).some((id) => HEAVY_ALIENS.includes(id) || ['brute', 'tank'].includes(ALIENS[id].kit) || ['roll', 'charge'].includes(travelType(id)));
}
function puzzles(z = zone) {
  return (PUZZLE_SPOTS[z] || []).map(([type, x, reward], i) => {
    const top = floorBounds(x).top,
      key = REGIONS[z].id + ':' + i;
    return { key, type, x, reward, cache: { x, y: top + 24 }, rect: { x: x - 78, y: top - 40, w: 156, h: 108 }, st: (player.puzzles || {})[key] || {} };
  });
}
const inRect = (r, x, y, pad = 0) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
// can the local player go through this lock right now?
function puzzlePass(p) {
  if (p.st.open) return true;
  const tv = player.travel && player.travel.type;
  if (p.type === 'tunnel') return (player.alien && alienHeight(player.activeAlien) <= 85) || tv === 'burrow';
  if (p.type === 'barrier') return tv === 'phase' || tv === 'blink' || tv === 'burrow';
  if (p.type === 'chasm') return tv === 'flight' || tv === 'leap';
  return false;
}
// collision hook used by isSolid (part-10): locked alcoves are solid, except for an actor already inside one
let solidActor = null;
function puzzleSolid(x, y, r) {
  const list = puzzleCache();
  for (const p of list) {
    if (!inRect(p.rect, x, y, r)) continue;
    const a = solidActor;
    if (a && inRect(p.rect, a.x, a.y, 0)) continue; // never trap someone inside
    if (a === player && puzzlePass(p)) continue;
    if (p.st.open) continue;
    return true;
  }
  return false;
}
let puzzleMemo = { z: -1, v: -1, p: null, list: [] },
  puzzleVer = 0;
function puzzleCache() {
  if (puzzleMemo.z !== zone || puzzleMemo.v !== puzzleVer || puzzleMemo.p !== player) puzzleMemo = { z: zone, v: puzzleVer, p: player, list: puzzles() };
  return puzzleMemo.list;
}
function setPuzzle(p, patch) {
  player.puzzles = player.puzzles || {};
  player.puzzles[p.key] = Object.assign({}, player.puzzles[p.key] || {}, patch);
  p.st = player.puzzles[p.key];
  puzzleVer++;
  save();
}
function openPuzzle(p) {
  setPuzzle(p, { open: true });
  burst(p.x, p.cache.y - 10, 40, p.type === 'ice' ? '#bdf1ff' : p.type === 'machine' ? '#9dff9d' : '#d9c7a4');
  shake = 0.2;
  toast('¡' + PUZZLE_TYPES[p.type].name + ' superada!');
  playWatchSFX('confirm');
  if (typeof missionEvent === 'function') missionEvent('puzzle', { type: p.type, key: p.key });
}
// attacks near a boulder / ice block wear it down (called after every attack, part-08)
function puzzleHit() {
  if (!player.alien) return;
  for (const p of puzzleCache()) {
    if (p.st.open || !PUZZLE_TYPES[p.type].hits) continue;
    if (Math.abs(player.x - p.x) > 170 || player.y - p.rect.y > 220) continue;
    const ok = p.type === 'boulder' ? isHeavy() : alienIs(FIRE_ALIENS);
    if (!ok) {
      if (!p.warned || clock - p.warned > 3) {
        p.warned = clock;
        toast(PUZZLE_TYPES[p.type].need);
      }
      continue;
    }
    const hits = (p.st.hits || 0) + 1;
    burst(p.x, p.cache.y, 14, p.type === 'ice' ? '#bdf1ff' : '#b9a98a');
    if (hits >= PUZZLE_TYPES[p.type].hits) openPuzzle(p);
    else setPuzzle(p, { hits });
  }
}
// E near a machine
function puzzleInteract() {
  for (const p of puzzleCache()) {
    if (p.type !== 'machine' || p.st.open || dist(player, p.cache) > 150) continue;
    if (!alienIs(TECH_ALIENS)) {
      toast(PUZZLE_TYPES.machine.need);
      return true;
    }
    openPuzzle(p);
    return true;
  }
  return false;
}
const PUZZLE_REWARD_NAME = { dna: 'Cápsula de ADN', coins: 'Monedas', xp: 'Datos de fontanero' };
function puzzleTick(dt) {
  for (const p of puzzleCache()) {
    // ramming through a boulder while rolling / charging
    if (!p.st.open && p.type === 'boulder' && player.travel && ['roll', 'charge'].includes(player.travel.type) && inRect(p.rect, player.x, player.y, 30)) openPuzzle(p);
    // reward pickup
    if (!p.st.claimed && dist(player, p.cache) < 48) claimCache(p);
  }
}
function claimCache(p) {
  setPuzzle(p, { claimed: true, open: p.st.open || p.type === 'tunnel' || p.type === 'barrier' || p.type === 'chasm' });
  let msg = '';
  if (p.reward === 'dna') {
    const locked = CORE_ALIENS.filter((id) => ALIENS[id] && alienInfo(id).implemented && !alienUnlocked(id));
    if (locked.length) {
      locked.sort((a, b) => (alienInfo(a).unlockLevel || 0) - (alienInfo(b).unlockLevel || 0));
      scanDNA(locked[0]);
      msg = 'Cápsula de ADN';
    } else {
      player.coins = (player.coins || 0) + 40;
      msg = 'Cápsula de ADN vacía · +40 monedas';
    }
  } else if (p.reward === 'coins') {
    player.coins = (player.coins || 0) + 30;
    msg = '+30 monedas';
  } else {
    xp(90);
    msg = '+90 EXP';
  }
  burst(p.cache.x, p.cache.y - 20, 30, '#7dff9a');
  toast(PUZZLE_REWARD_NAME[p.reward] + ' · ' + msg);
  if (typeof missionEvent === 'function') missionEvent('cache', { key: p.key, reward: p.reward });
  hud();
  save();
}

// ---------------- drawing (world space, behind actors) ----------------
function drawPuzzles() {
  for (const p of puzzleCache()) {
    const { x, rect } = p,
      cy = p.cache.y,
      t = clock;
    // reward capsule
    if (!p.st.claimed) {
      const bob = Math.sin(t * 3 + x) * 4;
      ctx.save();
      ctx.fillStyle = '#0c1a1088';
      ctx.beginPath(); ctx.ellipse(x, cy + 2, 16, 5, 0, 0, 7); ctx.fill();
      ctx.shadowColor = '#7dff9a'; ctx.shadowBlur = 14;
      ctx.fillStyle = p.reward === 'dna' ? '#7dff9a' : p.reward === 'coins' ? '#ffd76a' : '#8fd9ff';
      ctx.fillRect(x - 8, cy - 30 + bob, 16, 24);
      ctx.fillStyle = '#ffffffaa';
      ctx.fillRect(x - 4, cy - 26 + bob, 4, 16);
      ctx.restore();
    }
    // the lock itself
    ctx.save();
    if (p.type === 'boulder') {
      if (!p.st.open) {
        const k = 1 - (p.st.hits || 0) * 0.08;
        ctx.fillStyle = '#6d6a63';
        ctx.beginPath();
        ctx.moveTo(x - 76 * k, cy + 44); ctx.lineTo(x - 70 * k, cy - 30); ctx.lineTo(x - 30, cy - 62 * k); ctx.lineTo(x + 28, cy - 66 * k);
        ctx.lineTo(x + 72 * k, cy - 26); ctx.lineTo(x + 78 * k, cy + 44); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#8b877d'; ctx.fillRect(x - 52, cy - 46, 40, 14); ctx.fillRect(x + 6, cy - 30, 46, 12);
        ctx.strokeStyle = '#2d2b27'; ctx.lineWidth = 3; ctx.beginPath();
        ctx.moveTo(x - 10, cy - 60); ctx.lineTo(x + 4, cy - 30); ctx.lineTo(x - 14, cy - 6); ctx.lineTo(x + 8, cy + 30);
        for (let h = 0; h < (p.st.hits || 0); h++) { ctx.moveTo(x - 40 + h * 30, cy - 20); ctx.lineTo(x - 20 + h * 30, cy + 20); }
        ctx.stroke();
      } else {
        ctx.fillStyle = '#5d5a54';
        for (let i = 0; i < 7; i++) ctx.fillRect(x - 70 + i * 21, cy + 30 - (i % 3) * 6, 14, 10);
      }
    } else if (p.type === 'tunnel') {
      ctx.fillStyle = '#5a5248';
      ctx.fillRect(rect.x, cy - 70, rect.w, 112);
      ctx.fillStyle = '#7a7064';
      for (let i = 0; i < 6; i++) ctx.fillRect(rect.x + 6 + (i % 3) * 50, cy - 64 + Math.floor(i / 3) * 40, 40, 14);
      ctx.fillStyle = '#120f0c';
      ctx.beginPath(); ctx.ellipse(x, cy + 40, 26, 34, 0, Math.PI, 0); ctx.fill();
      ctx.fillRect(x - 26, cy + 38, 52, 6);
    } else if (p.type === 'barrier') {
      if (!p.st.open) {
        const a = 0.35 + 0.15 * Math.sin(t * 6);
        ctx.fillStyle = 'rgba(176,110,255,' + a + ')';
        ctx.fillRect(rect.x, cy - 80, rect.w, 124);
        ctx.fillStyle = 'rgba(230,200,255,.6)';
        for (let y = 0; y < 124; y += 8) ctx.fillRect(rect.x, cy - 80 + ((y + t * 60) % 124), rect.w, 2);
        ctx.strokeStyle = '#d7b6ff'; ctx.lineWidth = 3; ctx.strokeRect(rect.x, cy - 80, rect.w, 124);
        ctx.fillStyle = '#3a2d4f'; ctx.fillRect(rect.x - 10, cy - 90, 12, 134); ctx.fillRect(rect.x + rect.w - 2, cy - 90, 12, 134);
      }
    } else if (p.type === 'chasm') {
      ctx.fillStyle = '#05080b';
      ctx.beginPath(); ctx.ellipse(x, cy + 34, 86, 22, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#4fd1ff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 4);
      ctx.beginPath(); ctx.ellipse(x, cy + 34, 86, 22, 0, 0, 7); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#2b3a40'; ctx.fillRect(rect.x - 8, cy - 70, 10, 120); ctx.fillRect(rect.x + rect.w - 2, cy - 70, 10, 120);
    } else if (p.type === 'ice') {
      if (!p.st.open) {
        const k = 1 - (p.st.hits || 0) * 0.15;
        ctx.fillStyle = 'rgba(170,230,255,.85)';
        ctx.fillRect(x - 74 * k, cy - 70 * k, 148 * k, 114 * k);
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.fillRect(x - 60 * k, cy - 60 * k, 18, 70 * k); ctx.fillRect(x - 30 * k, cy - 62 * k, 8, 40 * k);
        ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 2; ctx.strokeRect(x - 74 * k, cy - 70 * k, 148 * k, 114 * k);
      } else {
        ctx.fillStyle = 'rgba(120,200,255,.45)';
        ctx.beginPath(); ctx.ellipse(x, cy + 34, 70, 14, 0, 0, 7); ctx.fill();
      }
    } else if (p.type === 'machine') {
      ctx.fillStyle = '#39434a';
      ctx.fillRect(rect.x, cy - 74, rect.w, 118);
      ctx.fillStyle = p.st.open ? '#0e1a12' : '#566169';
      ctx.fillRect(x - 40, cy - 54, 80, 98);
      ctx.fillStyle = p.st.open ? '#7dff9a' : Math.floor(t * 3) % 2 ? '#ff4d4d' : '#6b1d1d';
      ctx.fillRect(rect.x + 10, cy - 66, 14, 10);
      if (!p.st.open && Math.random() < 0.15) burst(rect.x + 120, cy - 40, 3, '#ffe27a');
    }
    ctx.restore();
    // hint when close and still locked
    if (!p.st.claimed && !puzzlePass(p) && dist(player, p.cache) < 230) {
      txt(PUZZLE_TYPES[p.type].name.toUpperCase(), x, rect.y - 22, 10, '#ffe6a6');
      txt(PUZZLE_TYPES[p.type].need, x, rect.y - 8, 8, '#d7e8e4');
    }
  }
}
// ============================================================================================
// OMNI MISSION BOARD (0.13) · a Plumber terminal at Max's Shelter (also PAUSE → MISIONES). One active mission at a
// time; progress shows in the mission panel. Types: puzzle (open locks of a type), cache (collect rewards), kill (as a
// kind of alien), variety (with different aliens), trial (race between areas), elite (a tough drone in an area).
// Saved in player.missions = { active, progress, done, timer }.
// ============================================================================================
const TERMINAL = { x: 860, y: 548 };
const MISSIONS = [
  { id: 'rocks', title: 'Rocas en el camino', desc: 'Rompe 2 rocas agrietadas (Ruinas, Barrio, Zona devastada).', type: 'puzzle', ptype: 'boulder', count: 2, level: 1, reward: { xp: 180, coins: 30 } },
  { id: 'small', title: 'Pequeño pero listo', desc: 'Entra en 2 túneles estrechos con un alien pequeño.', type: 'puzzle', ptype: 'tunnel', count: 2, level: 2, reward: { xp: 180, coins: 30 } },
  { id: 'sky', title: 'Sobre el abismo', desc: 'Cruza 2 grietas volando o a saltos (SHIFT).', type: 'puzzle', ptype: 'chasm', count: 2, level: 2, reward: { xp: 200, coins: 35 } },
  { id: 'trial1', title: 'Contrarreloj', desc: 'Sal del Refugio y llega a Ciudad Bahía en 30 s. ¡Usa el movimiento rápido!', type: 'trial', from: 1, to: 3, time: 30, level: 2, reward: { xp: 220, coins: 40 } },
  { id: 'flyers', title: 'Patrulla aérea', desc: 'Derrota 5 enemigos siendo un alien volador.', type: 'kill', travel: 'flight', count: 5, level: 3, reward: { xp: 260, coins: 40 } },
  { id: 'variety', title: 'Biodiversidad', desc: 'Derrota enemigos con 5 aliens distintos.', type: 'variety', count: 5, level: 3, reward: { xp: 260, coins: 50, dna: true } },
  { id: 'thaw', title: 'Deshielo', desc: 'Derrite 2 bloques de hielo con un alien de fuego (Muelles, Fortaleza).', type: 'puzzle', ptype: 'ice', count: 2, level: 4, reward: { xp: 260, coins: 50 } },
  { id: 'brutes', title: 'Fuerza bruta', desc: 'Derrota 8 enemigos con aliens fuertes.', type: 'kill', heavy: true, count: 8, level: 4, reward: { xp: 300, coins: 50 } },
  { id: 'dna', title: 'Rastro de ADN', desc: 'Recoge 3 cápsulas de ADN escondidas tras los puzles.', type: 'cache', reward_kind: 'dna', count: 3, level: 5, reward: { xp: 320, coins: 60, dna: true } },
  { id: 'ghost', title: 'Paso fantasma', desc: 'Atraviesa 2 barreras de energía (intangible, teletransporte o excavando).', type: 'puzzle', ptype: 'barrier', count: 2, level: 5, reward: { xp: 300, coins: 60 } },
  { id: 'elite1', title: 'Dron de élite', desc: 'Un dron de élite apareció en las Ruinas del pinar. Derrótalo.', type: 'elite', zone: 0, hp: 900, level: 5, reward: { xp: 400, coins: 80, dna: true } },
  { id: 'tech', title: 'Reparaciones', desc: 'Repara 2 máquinas averiadas con un alien tecnológico (pulsa E).', type: 'puzzle', ptype: 'machine', count: 2, level: 6, reward: { xp: 320, coins: 60 } },
  { id: 'trial2', title: 'Mensajero veloz', desc: 'Sal del Refugio y llega a los Muelles en 45 s.', type: 'trial', from: 1, to: 5, time: 45, level: 6, reward: { xp: 350, coins: 70 } },
  { id: 'elite2', title: 'Asalto en los muelles', desc: 'Un dron de élite blindado ataca los Muelles del faro.', type: 'elite', zone: 5, hp: 1500, level: 9, reward: { xp: 600, coins: 120, dna: true } },
];
const missionById = (id) => MISSIONS.find((m) => m.id === id);
function MS() {
  // always a complete record (old saves, the Osmosian race and fresh profiles start with none or an empty one)
  const s = (player.missions = player.missions && typeof player.missions === 'object' ? player.missions : {});
  if (!s.progress || typeof s.progress !== 'object') s.progress = {};
  if (!s.done || typeof s.done !== 'object') s.done = {};
  if (s.active === undefined || (s.active && !missionById(s.active))) s.active = null;
  return s;
}
function activeMission() {
  const s = MS();
  return s.active ? missionById(s.active) : null;
}
function missionProgress(m) {
  return (MS().progress[m.id] || 0);
}
function missionAccept(id) {
  const m = missionById(id),
    s = MS();
  if (!m || s.done[id] || player.level < m.level) return;
  if (m.coop && !coopOn()) return toast('Misión cooperativa · conecta a un compañero primero');
  s.active = id;
  s.progress[id] = 0;
  s.timer = null;
  s.seen = [];
  toast('Misión aceptada · ' + m.title);
  playWatchSFX('confirm');
  if (m.type === 'trial') toast(zone === m.from ? 'Contrarreloj: ¡sal del Refugio para empezar!' : 'Contrarreloj: ve al Refugio de Max para empezar');
  hud();
  save();
}
function missionAbandon() {
  const s = MS();
  s.active = null;
  s.timer = null;
  hud();
  save();
}
function missionComplete(m) {
  const s = MS();
  s.done[m.id] = true;
  statEvent('mission', { id: m.id, coop: !!m.coop });
  s.active = null;
  s.timer = null;
  const r = m.reward;
  if (r.coins) player.coins = (player.coins || 0) + r.coins;
  if (r.xp) xp(r.xp);
  let extra = '';
  if (r.dna) {
    const locked = CORE_ALIENS.filter((id) => ALIENS[id] && alienInfo(id).implemented && !alienInfo(id).story && !alienUnlocked(id));
    if (locked.length) {
      locked.sort((a, b) => (alienInfo(a).unlockLevel || 0) - (alienInfo(b).unlockLevel || 0));
      setTimeout(() => scanDNA(locked[0]), 900);
      extra = ' · ADN nuevo';
    }
  }
  toast('¡MISIÓN COMPLETADA! ' + m.title + ' · +' + (r.xp || 0) + ' EXP · +' + (r.coins || 0) + ' monedas' + extra);
  playWatchSFX('master_control') || playWatchSFX('confirm');
  burst(player.x, player.y - 60, 40, '#ffe27a');
  hud();
  save();
}
function missionAdd(m, n = 1) {
  const s = MS();
  s.progress[m.id] = Math.min(m.count || 1, (s.progress[m.id] || 0) + n);
  if (s.progress[m.id] >= (m.count || 1)) missionComplete(m);
  else {
    toast(m.title + ' · ' + s.progress[m.id] + ' / ' + m.count);
    hud();
    save();
  }
}
// events from other systems
function missionEvent(kind, d = {}) {
  statEvent(kind, d); // challenges / achievements (part-34)
  const m = activeMission();
  if (!m) return;
  if (m.type === 'puzzle' && kind === 'puzzle' && d.type === m.ptype) missionAdd(m);
  // passing a tunnel / barrier / chasm counts when you claim what's behind it
  if (m.type === 'puzzle' && kind === 'cache' && ['tunnel', 'barrier', 'chasm'].includes(m.ptype) && d.key && puzzleTypeOf(d.key) === m.ptype) missionAdd(m);
  if (m.type === 'cache' && kind === 'cache' && d.reward === m.reward_kind) missionAdd(m);
  if (kind === 'kill' && player.alien) {
    if (m.type === 'kill') {
      const tv = travelType();
      if ((m.travel && tv === m.travel) || (m.heavy && isHeavy())) missionAdd(m);
    }
    if (m.type === 'variety') {
      const s = MS();
      s.seen = s.seen || [];
      if (!s.seen.includes(player.activeAlien)) {
        s.seen.push(player.activeAlien);
        missionAdd(m);
      }
    }
  }
  if (m.type === 'elite' && kind === 'elite' && zone === m.zone) missionComplete(m);
  if (m.coop) coopMissionEvent(m, kind);
}
function puzzleTypeOf(key) {
  const [rid, i] = key.split(':'),
    z = REGIONS.findIndex((r) => r.id === rid);
  return PUZZLE_SPOTS[z] && PUZZLE_SPOTS[z][+i] ? PUZZLE_SPOTS[z][+i][0] : null;
}
// per frame: trials and elite spawning
let missionHudT = 0;
function missionTick(dt) {
  const m = activeMission(),
    s = MS();
  if (!m) return;
  if (m.type === 'trial') {
    if (s.timer == null && s.armed && zone !== m.from) s.timer = 0; // left the start area: go!
    if (zone === m.from && s.timer == null) s.armed = true;
    if (s.timer != null) {
      s.timer += dt;
      if (zone === m.to) return missionComplete(m);
      if (s.timer > m.time) {
        toast('Contrarreloj fallida · vuelve al Refugio para reintentarlo');
        s.timer = null;
        s.armed = false;
        playWatchSFX('timeout');
      }
    }
    missionHudT -= dt;
    if (missionHudT <= 0) {
      missionHudT = 0.2;
      hudMissions();
    }
  }
}
// host: spawn an elite drone if this player's OR the partner's mission needs one here
function eliteTick() {
  if (net.role === 'guest' || enemies.some((e) => e.elite)) return;
  const mine = activeMission(),
    theirs = net.peer && net.remote && net.remote.zone === zone && net.remote.eliteZone === zone ? MISSIONS.find((x) => x.type === 'elite' && x.zone === zone) : null,
    m = mine && mine.type === 'elite' && mine.zone === zone ? mine : theirs;
  if (!m) return;
  {
    const r = region(),
      x = (r.minX + r.maxX) / 2 + 200,
      y = (r.top + r.bottom) / 2;
    enemies.push({ id: 90, x, y, homeX: x, homeY: y, face: -1, hp: m.hp, max: m.hp, boss: true, elite: true, kind: 'enemy', rcd: 1, cast: 0, stun: 0, alive: true, respawn: 0, cd: 0.8, wind: 0, anim: 0, hit: 0, moving: false });
    toast('¡Dron de élite detectado!');
    playWatchSFX('warning');
  }
}
// called from damageEnemy when something dies (part-08)
// called on the host (enemies live there) for every kill, whoever landed it. Kills are shared: they count for the
// host's mission and are forwarded to the guest's game for theirs, as long as the guest is in the same area.
function missionKill(e) {
  if (e.elite) e.respawn = 1e9; // an elite never comes back
  if (e.twin) return; // twin drones are handled by the co-op mission (part-30)
  missionEvent(e.elite ? 'elite' : 'kill');
  if (net.peer && net.remote && net.remote.zone === zone) lanSend({ type: 'missionKill', elite: !!e.elite, zone });
}
// guest side: a kill reported by the host
function missionRemoteKill(m) {
  if (m.zone !== zone) return;
  missionEvent(m.elite ? 'elite' : 'kill');
}
// the area an elite drone should appear in for this player's mission (sent to the partner in the avatar packet)
function myEliteZone() {
  const m = activeMission();
  return m && m.type === 'elite' ? m.zone : -1;
}
// ---------------- HUD + board ----------------
function hudMissions() {
  const m = activeMission();
  if (!m) return;
  const s = MS();
  $('#mission .tiny').textContent = 'TABLÓN DE MISIONES';
  $('#questtext').textContent = m.title;
  $('#questsub').textContent =
    m.type === 'trial'
      ? s.timer != null
        ? '⏱ ' + Math.max(0, m.time - s.timer).toFixed(1) + ' s · llega a ' + REGIONS[m.to].name
        : 'Sal del Refugio para empezar · ' + m.time + ' s'
      : m.type === 'elite'
        ? 'Derrota al dron · ' + REGIONS[m.zone].name
        : m.coop
          ? coopHudLine(m)
          : missionProgress(m) + ' / ' + m.count + ' · ' + m.desc;
}
function missionBoard() {
  const s = MS(),
    on = coopOn(),
    card = (m) => {
      const done = s.done[m.id],
        act = s.active === m.id,
        lock = player.level < m.level;
      const r = m.reward;
      return (
        '<button class="mcard' + (act ? ' active' : '') + (done ? ' done' : '') + (lock ? ' locked' : '') + '" data-mission="' + m.id + '"><b>' + m.title + '</b><span>' + m.desc + '</span><small>' +
        (done ? 'COMPLETADA' : lock ? 'NIVEL ' + m.level : act ? 'EN CURSO · ' + (m.count ? missionProgress(m) + '/' + m.count : '') : 'ACEPTAR') +
        ' · +' + r.xp + ' EXP · +' + r.coins + ' monedas' + (r.dna ? ' · ADN' : '') + '</small></button>'
      );
    },
    cards = MISSIONS.filter((m) => !m.coop).map(card).join(''),
    coopCards = on ? MISSIONS.filter((m) => m.coop).map(card).join('') : '';
  const solo = MISSIONS.filter((m) => !m.coop),
    doneN = solo.filter((m) => s.done[m.id]).length;
  showDialog(
    'TERMINAL DE FONTANERO',
    'Tablón de misiones · ' + doneN + ' / ' + solo.length,
    '<p>Una misión a la vez. Los puzles de alien están en las Ruinas, la Ribera, los Muelles, la Fortaleza, el Barrio, la Zona devastada y el Salón.</p><div class="mgrid">' + cards + '</div>' +
      (on
        ? '<h3 class="mcoop">MISIONES COOPERATIVAS</h3><p>Solo con compañero conectado. Cada uno acepta la suya; lo que hacéis juntos cuenta para los dos.</p><div class="mgrid">' + coopCards + '</div>'
        : '<p class="mcoop-note">🤝 Hay ' + MISSIONS.filter((m) => m.coop).length + ' misiones cooperativas más · aparecen al jugar con un compañero (MENÚ → SALA).</p>'),
    [['LISTO', closeDialog], ...(s.active ? [['ABANDONAR MISIÓN', () => { missionAbandon(); missionBoard(); }]] : [])],
  );
  for (const b of document.querySelectorAll('[data-mission]')) {
    b.onclick = () => {
      const id = b.dataset.mission,
        m = missionById(id);
      if (s.done[id] || s.active === id) return;
      if (player.level < m.level) return toast('Necesitas nivel ' + m.level);
      if (m.coop && !coopOn()) return toast('Misión cooperativa · conecta a un compañero primero');
      if (s.active) return toast('Ya tienes una misión · abandónala primero');
      missionAccept(id);
      missionBoard();
    };
  }
}
function missionInteract() {
  if (zone !== 1 || dist(player, TERMINAL) > 120) return false;
  missionBoard();
  return true;
}
function drawTerminal() {
  if (zone !== 1) return;
  const { x, y } = TERMINAL;
  ctx.save();
  ctx.fillStyle = '#0b161288';
  ctx.beginPath(); ctx.ellipse(x, y + 4, 30, 8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#2d3a40'; ctx.fillRect(x - 22, y - 58, 44, 62);
  ctx.fillStyle = '#7dff9a'; ctx.globalAlpha = 0.75 + 0.25 * Math.sin(clock * 4);
  ctx.fillRect(x - 16, y - 52, 32, 22);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0e1a12'; for (let i = 0; i < 3; i++) ctx.fillRect(x - 12, y - 48 + i * 6, 24 - i * 6, 2);
  ctx.fillStyle = '#ffd76a'; ctx.fillRect(x - 6, y - 22, 12, 6);
  ctx.restore();
  const avail = MISSIONS.some((m) => !MS().done[m.id] && player.level >= m.level && (!m.coop || coopOn()));
  if (avail && !activeMission()) txt('!', x, y - 72 + Math.sin(clock * 4) * 3, 18, '#ffe27a');
  if (dist(player, TERMINAL) < 160) txt('MISIONES · E', x, y - 88, 10, '#c3f38e');
}
// ============================================================================================
// OMNI SIGNATURE MOVES (0.13) · roster aliens replace their generic slot-IV move with something only they do.
// Each is a KIT_MOVES kind (part-17), so cooldowns, battery, mastery and co-op damage work as for every other move.
// ============================================================================================
const SIG = {
  bigchill: ['freeze', 'Aliento helado'], arctiguana: ['freeze', 'Rayo congelante'],
  echoecho: ['clones', 'Eco múltiple'], ditto: ['clones', 'División'],
  upgrade: ['hack', 'Fusión técnica'], nanomech: ['hack', 'Nanoinfección'],
  ghostfreak: ['phasedash', 'Susto espectral'], chamalien: ['phasedash', 'Ataque invisible'],
  cannonbolt: ['rollram', 'Bola de cañón'], ballweevil: ['rollram', 'Bola de plasma'], terraspin: ['rollram', 'Torbellino'],
  gravattack: ['gravity', 'Pozo de gravedad'], lodestar: ['gravity', 'Atracción magnética'],
  snareoh: ['grab', 'Vendas'], wildvine: ['grab', 'Látigo de lianas'], spidermonkey: ['grab', 'Telaraña'], ripjaws: ['grab', 'Mordisco abisal'],
  clockwork: ['timestop', 'Paro temporal'],
  waybig: ['stomp', 'Pisotón cósmico'], humungousaur: ['stomp', 'Terremoto jurásico'],
  greymatter: ['analyse', 'Punto débil'], brainstorm: ['analyse', 'Cálculo perfecto'],
  eyeguy: ['beam', 'Mirada láser'], jetray: ['beam', 'Rayo neuroshock'],
  blitzwolfer: ['shriek', 'Aullido sónico'],
  frankenstrike: ['overcharge', 'Descarga Tesla'], feedback: ['overcharge', 'Retroalimentación'], shocksquatch: ['overcharge', 'Electroshock'],
};
const SIG_DAMAGE = { freeze: 40, clones: 14, hack: 85, phasedash: 46, rollram: 52, gravity: 60, grab: 58, timestop: 0, stomp: 80, analyse: 0, beam: 64, shriek: 42, overcharge: 34 };
const sigFx = [];
const facing = () => ({ x: player.face || 1, y: 0 });
const aliveFoes = (r, from = player) => combatants().filter((e) => e.alive && dist(from, e) < r);
Object.assign(KIT_MOVES, {
  freeze(s, d, a) { // cone in front: damage + frozen (long stun)
    for (const e of aliveFoes(260)) {
      const ang = Math.atan2(e.y - player.y, e.x - player.x);
      if (Math.abs(((ang - a + 9.42) % 6.283) - 3.14) < 0.7) {
        damageTarget(e, d, 2.4);
        e.frozen = 2.4;
      }
    }
    sigFx.push({ type: 'cone', x: player.x, y: player.y - 45, a, t: 0.5, max: 0.5, color: '#bdf1ff' });
  },
  clones(s, d) { // two copies that pulse sonic damage around them for 5 s
    for (const k of [-1, 1]) sigFx.push({ type: 'clone', x: player.x + k * 90, y: player.y + k * 20, t: 5, max: 5, tick: 0, d, row: alienRowFor(player), h: alienHeight(player.activeAlien), face: player.face });
  },
  hack(s, d) { // take over the nearest foe: it short-circuits, then explodes on its friends
    const t = aliveFoes(340).sort((p, q) => dist(player, p) - dist(player, q))[0];
    if (!t) return toast('Sin objetivos cerca');
    damageTarget(t, 1, 2.6);
    sigFx.push({ type: 'hack', target: t, t: 2.4, max: 2.4, d });
  },
  phasedash(s, d, a) { startRush(a, 300, 0.32, d, '#d7b6ff', 1.6); player.inv = Math.max(player.inv, 0.5); },
  rollram(s, d, a) { startRush(a, 420, 0.6, d, ALIENS[player.activeAlien].color, 0.5); player.inv = Math.max(player.inv, 0.7); },
  gravity(s, d, a) { // pull everything nearby into one point, then crush it
    const c = { x: player.x + Math.cos(a) * 140, y: player.y + Math.sin(a) * 60 };
    sigFx.push({ type: 'well', x: c.x, y: c.y, t: 0.9, max: 0.9, d, hit: false });
  },
  grab(s, d, a) { // pull the nearest foe to you and pin it
    const t = aliveFoes(380).sort((p, q) => dist(player, p) - dist(player, q))[0];
    if (!t) return toast('Sin objetivos cerca');
    sigFx.push({ type: 'grab', target: t, t: 0.35, max: 0.35, d, color: ALIENS[player.activeAlien].color });
  },
  timestop() { // every foe on screen stops for 3 s
    for (const e of aliveFoes(620)) {
      e.stun = Math.max(e.stun || 0, 3);
      e.frozen = 0;
      sigFx.push({ type: 'clock', target: e, t: 3, max: 3 });
    }
    sigFx.push({ type: 'flash', t: 0.4, max: 0.4, color: '#ffe27a' });
  },
  stomp(s, d) {
    effects.push({ type: 'ring', x: player.x, y: player.y - 10, t: 0.8, max: 0.8, r: 320 });
    areaHit(player.x, player.y, 320, d, 1.1);
    shake = 0.45;
    burst(player.x, player.y, 40, '#d3bba0');
  },
  analyse() { // weak points: everything you do hits 80% harder for 8 s
    player.critT = 8;
    toast('Puntos débiles analizados · +80% de daño durante 8 s');
    burst(player.x, player.y - 60, 24, '#9dff9d');
  },
  beam(s, d, a) { // piercing line
    const len = 620;
    for (const e of combatants()) {
      if (!e.alive) continue;
      const dx = e.x - player.x, dy = e.y - 35 - (player.y - 35),
        along = dx * Math.cos(a) + dy * Math.sin(a),
        off = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
      if (along > 0 && along < len && off < 46) damageTarget(e, d, 0.5);
    }
    sigFx.push({ type: 'beam', x: player.x, y: player.y - 55, a, len, t: 0.35, max: 0.35, color: ALIENS[player.activeAlien].color });
  },
  shriek(s, d, a) { // sonic cone that knocks foes back
    for (const e of aliveFoes(300)) {
      const ang = Math.atan2(e.y - player.y, e.x - player.x);
      if (Math.abs(((ang - a + 9.42) % 6.283) - 3.14) < 0.8) {
        damageTarget(e, d, 1.2);
        if (net.role !== 'guest') moveActor(e, Math.cos(ang) * 110, Math.sin(ang) * 50);
      }
    }
    sigFx.push({ type: 'cone', x: player.x, y: player.y - 55, a, t: 0.45, max: 0.45, color: '#8fe6ff', rings: true });
  },
  overcharge(s, d) { // big chain: up to 6 foes, long stun
    KIT_MOVES.chain({ targets: 6 }, d, 0, null, '#ffe96a');
    for (const e of aliveFoes(430)) e.stun = Math.max(e.stun || 0, 1.2);
    shake = 0.2;
  },
});
function startRush(a, distance, time, d, color, stun) {
  player.rush = { vx: Math.cos(a), vy: Math.sin(a) * 0.6, speed: distance / time, t: time, d, color, stun, hits: new Set() };
}
const alienRowFor = (o) => (skinArt(o) ? skinArt(o).row : ALIENS[o.activeAlien].row);
// per frame
function sigTick(dt) {
  player.critT = Math.max(0, (player.critT || 0) - dt);
  const r = player.rush;
  if (r) {
    r.t -= dt;
    moveActor(player, r.vx * r.speed * dt, r.vy * r.speed * dt);
    player.attack = Math.max(player.attack, 0.1);
    for (const e of combatants())
      if (e.alive && !r.hits.has(e) && dist(player, e) < 70) {
        r.hits.add(e);
        damageTarget(e, r.d, r.stun);
        burst(e.x, e.y - 40, 10, r.color);
      }
    if (Math.random() < 0.8) particles.push({ x: player.x, y: player.y - 30 - Math.random() * 40, dx: -r.vx * 80, dy: 0, t: 0.3, color: r.color, size: 4 });
    if (r.t <= 0) player.rush = null;
  }
  for (let i = sigFx.length - 1; i >= 0; i--) {
    const f = sigFx[i];
    f.t -= dt;
    if (f.type === 'clone') {
      f.tick -= dt;
      if (f.tick <= 0) {
        f.tick = 0.5;
        areaHit(f.x, f.y, 110, f.d, 0.3);
        effects.push({ type: 'ring', x: f.x, y: f.y - 30, t: 0.3, max: 0.3, r: 100 });
      }
    }
    if (f.type === 'hack' && f.t <= 0) {
      const t = f.target;
      areaHit(t.x, t.y, 170, f.d, 0.6);
      damageTarget(t, f.d, 0);
      effects.push({ type: 'ring', x: t.x, y: t.y - 30, t: 0.5, max: 0.5, r: 170 });
      burst(t.x, t.y - 40, 30, '#39ff88');
      shake = 0.25;
    }
    if (f.type === 'hack' && f.t > 0 && f.target.alive) f.target.stun = Math.max(f.target.stun || 0, 0.3);
    if (f.type === 'well' && f.t > 0 && net.role !== 'guest')
      for (const e of aliveFoes(340, f)) moveActor(e, (f.x - e.x) * Math.min(1, dt * 5), (f.y - e.y) * Math.min(1, dt * 5));
    if (f.type === 'well' && f.t <= 0 && !f.hit) {
      f.hit = true;
      areaHit(f.x, f.y, 130, f.d, 1.2);
      effects.push({ type: 'slam', x: f.x, y: f.y, r: 130, t: 0.5, max: 0.5 });
      shake = 0.3;
    }
    if (f.type === 'grab') {
      const t = f.target;
      if (net.role !== 'guest' && t.alive) moveActor(t, (player.x + (player.face || 1) * 60 - t.x) * Math.min(1, dt * 12), (player.y - t.y) * Math.min(1, dt * 12));
      if (f.t <= 0) damageTarget(t, f.d, 1.6);
    }
    if (f.t <= 0) sigFx.splice(i, 1);
  }
  for (const e of enemies) if (e.frozen > 0) e.frozen = Math.max(0, e.frozen - dt);
}
// drawing (world space)
function drawSig() {
  for (const f of sigFx) {
    const k = Math.max(0, f.t / f.max);
    ctx.save();
    if (f.type === 'cone') {
      ctx.globalAlpha = k * 0.6;
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.arc(f.x, f.y, 260 * (1.2 - k * 0.5), f.a - 0.6, f.a + 0.6); ctx.closePath(); ctx.fill();
      if (f.rings) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.arc(f.x, f.y, 70 * i * (1.3 - k), f.a - 0.5, f.a + 0.5); ctx.stroke(); } }
    } else if (f.type === 'clone') {
      sprite(f.row, Math.floor(clock * 4) % 2 ? 1 : 0, f.x, f.y, f.h, f.face, 0.45 + 0.15 * Math.sin(clock * 10));
    } else if (f.type === 'hack' && f.target.alive) {
      ctx.strokeStyle = '#39ff88'; ctx.lineWidth = 2; ctx.globalAlpha = 0.7;
      ctx.strokeRect(f.target.x - 30, f.target.y - 110, 60, 110);
      txt(Math.ceil(f.t) + '', f.target.x, f.target.y - 120, 12, '#39ff88');
    } else if (f.type === 'well') {
      ctx.fillStyle = '#1a0b2e'; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, 70 + 40 * k, 24 + 12 * k, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#b77cff'; ctx.lineWidth = 3; ctx.globalAlpha = 0.9;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(f.x, f.y, (130 - i * 35) * k + 10, (40 - i * 10) * k + 4, clock * 3, 0, 7); ctx.stroke(); }
    } else if (f.type === 'grab' && f.target.alive) {
      ctx.strokeStyle = f.color; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(player.x, player.y - 50); ctx.lineTo(f.target.x, f.target.y - 50); ctx.stroke();
    } else if (f.type === 'clock' && f.target.alive) {
      ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.arc(f.target.x, f.target.y - 60, 34, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(f.target.x, f.target.y - 60); ctx.lineTo(f.target.x + Math.cos(-clock * 0.2) * 26, f.target.y - 60 + Math.sin(-clock * 0.2) * 26); ctx.stroke();
    } else if (f.type === 'flash') {
      ctx.globalAlpha = k * 0.4; ctx.fillStyle = f.color; ctx.fillRect(-5000, -5000, 10000, 10000);
    } else if (f.type === 'beam') {
      ctx.strokeStyle = f.color; ctx.lineWidth = 14 * k + 2; ctx.globalAlpha = 0.85; ctx.shadowColor = f.color; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(f.a) * f.len, f.y + Math.sin(f.a) * f.len * 0.6); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4 * k + 1;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(f.a) * f.len, f.y + Math.sin(f.a) * f.len * 0.6); ctx.stroke();
    }
    ctx.restore();
  }
  // frozen foes get an ice shell; analysed player gets green crosshairs
  for (const e of enemies)
    if (e.alive && e.frozen > 0) {
      ctx.save(); ctx.fillStyle = 'rgba(170,230,255,.45)'; ctx.fillRect(e.x - 32, e.y - 115, 64, 115); ctx.restore();
    }
  if ((player.critT || 0) > 0) {
    ctx.save(); ctx.strokeStyle = '#9dff9d'; ctx.globalAlpha = 0.6; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(player.x, player.y - 60, 46 + Math.sin(clock * 8) * 3, 0, 7); ctx.stroke(); ctx.restore();
  }
}
// apply to the roster (after part-17 built the kits)
for (const [id, [kind, name]] of Object.entries(SIG)) {
  const A = ALIENS[id];
  if (!A || !A.kit || !A.skills[3]) continue;
  Object.assign(A.skills[3], { kind, name, short: name.split(' ')[0].toUpperCase(), damage: Math.round(SIG_DAMAGE[kind] * (id === 'waybig' ? 1.4 : 1)), cd: kind === 'timestop' ? 16 : kind === 'analyse' ? 14 : A.skills[3].cd });
}
KIT_SND.freeze = 'crystal'; KIT_SND.beam = 'fire'; KIT_SND.overcharge = 'crystal'; KIT_SND.shriek = 'punch';
SHEET_KIND_FRAME.freeze = 4; SHEET_KIND_FRAME.clones = 11; SHEET_KIND_FRAME.hack = 4; SHEET_KIND_FRAME.phasedash = 3; SHEET_KIND_FRAME.rollram = 4;
SHEET_KIND_FRAME.gravity = 11; SHEET_KIND_FRAME.grab = 6; SHEET_KIND_FRAME.timestop = 11; SHEET_KIND_FRAME.stomp = 5; SHEET_KIND_FRAME.analyse = 11;
SHEET_KIND_FRAME.beam = 4; SHEET_KIND_FRAME.shriek = 6; SHEET_KIND_FRAME.overcharge = 11;
// ============================================================================================
// OMNI ANODITE RACE (0.14) · a third race with its own progress (RAZAS). No watch: Q channels mana into the
// Anodite energy form (a glowing pink body) which uses the mana bar like a battery, flies with SHIFT and fights with
// mana powers. Built on the alien pipeline (ALIENS.anodite + KIT_MOVES) so mastery, cooldowns, co-op, puzzles and
// missions all work. Human form keeps the punch and jump.
// ============================================================================================
const ANODITE_ROW = 1990;
ROW_ALIAS[ANODITE_ROW] = { base: SKINS[0].row, hue: 300, sat: 1.6, bri: 1.25, over: '#ff5fd8', overA: 0.5 };
ALIENS.anodite = {
  name: 'Anodita',
  row: ANODITE_ROW,
  hp: 240,
  height: 104,
  color: '#ff5fd8',
  kit: 'anodite',
  skills: [
    { kind: 'bolt', name: 'Rayo de maná', short: 'RAYO', damage: 22, cd: 0.6, unlock: 0, cost: 0, speed: 560, r: 11, points: 3 },
    { kind: 'swarm', name: 'Ráfaga de maná', short: 'RÁFAGA', damage: 12, cd: 4, unlock: 15, cost: 3, shots: 7, points: 3 },
    { kind: 'shield', name: 'Escudo de maná', short: 'ESCUDO', damage: 0, cd: 14, unlock: 40, cost: 6, amount: 110, time: 10, points: 3 },
    { kind: 'nova', name: 'Tormenta de maná', short: 'TORMENTA', damage: 70, cd: 11, unlock: 75, cost: 12, r: 210, stun: 0.9, points: 3 },
    { kind: 'grab', name: 'Lazo de maná', short: 'LAZO', damage: 40, cd: 6, unlock: 0, cost: 0, points: 3 },
    { kind: 'heal', name: 'Sanación de maná', short: 'SANAR', damage: 0, cd: 16, unlock: 0, cost: 0, pct: 0.3, points: 3 },
  ],
};
SPEEDS.anodite = 235;
TRAVEL_BY_ALIEN.anodite = 'flight'; // levitation
ALIEN_DB.anodite = { id: 'anodite', name: 'Anodita', origin: 'anodite', wave: 0, implemented: true, species: 'Anodita', watches: [], unlockLevel: 1 };
initProgress(); // mastery / cooldowns / learned slots for the new form

const isAnodite = () => race === 'anodite';
function anoditeTransform() {
  if (!started || paused || player.leap || player.motion || player.jump > 0 || player.downed) return;
  if (player.alien) return anoditeRevert(false);
  if (player.battery <= 0) {
    toast('Sin maná · espera a que se recargue');
    tone(90);
    return;
  }
  const ratio = player.hp / 100;
  player.activeAlien = player.selected = 'anodite';
  player.cool = player.cooldowns.anodite;
  player.alien = true;
  player.ultimate = false;
  player.lowWarned = false;
  player.hp = clamp(ratio * maxHP(), 1, maxHP());
  flash = 0.35;
  burst(player.x, player.y - 50, 40, '#ff5fd8');
  burst(player.x, player.y - 50, 20, '#ffe1f6');
  tone(520, 0.3, 'sine', 0.03);
  tone(780, 0.4, 'triangle', 0.025);
  statEvent('transform', { alien: 'anodite' });
  toast('FORMA ANODITA · ' + maxHP() + ' vida máxima · SHIFT: VUELO');
  save();
}
function anoditeRevert(empty) {
  if (!player.alien) return;
  const ratio = player.hp / maxHP();
  player.alien = false;
  player.travel = null;
  player.shield = 0;
  player.hp = clamp(ratio * 100, 1, 100);
  if (empty) {
    player.battery = 0;
    toast('Maná agotado');
  }
  burst(player.x, player.y - 50, 24, '#ff9de6');
  tone(400, 0.25, 'sine', 0.025);
  save();
}
// glow and sparkles while in energy form
function anoditeTick(dt) {
  if (!isAnodite() || !player.alien || paused) return;
  if (Math.random() < 0.5)
    particles.push({ x: player.x + (Math.random() - 0.5) * 40, y: player.y - 20 - Math.random() * 90, dx: (Math.random() - 0.5) * 20, dy: -30 - Math.random() * 30, t: 0.6, color: Math.random() < 0.5 ? '#ff5fd8' : '#ffe1f6', size: 2 + Math.random() * 2 });
}
// HUD: mana instead of the watch
function anoditeHud() {
  if (!isAnodite()) return;
  if (player.selected !== 'anodite') player.selected = 'anodite';
  if (!player.alien) $('#transformhint').textContent = player.battery <= 0 ? 'RECARGANDO' : 'ENERGÍA DE MANÁ';
  $('#dialname').textContent = 'ANODITA';
  $('#dialprev').disabled = $('#dialnext').disabled = true;
  $('#energyname').textContent = 'MANÁ';
  $('#masterylabel').textContent = 'MAESTRÍA DE MANÁ';
  $('#batteryhint').textContent = player.alien
    ? 'Forma anodita · ' + Math.ceil(player.battery / Math.max(0.01, drainRate())) + ' s de maná'
    : player.battery < 100
      ? 'Maná recargándose · ya puedes usarlo'
      : 'Maná lleno · pulsa Q';
}
// ============================================================================================
// OMNI CO-OP MISSIONS (0.15) · only on the board while a partner is connected. Each player keeps their own mission
// state; the shared moments (plates pressed, gate crossed, twins down, partner revived) are sent to the partner so both
// get the credit. The host owns the enemies (twin drones).
//   plates  Double weight      · Ruins: two pressure plates must be held at the same time → vault opens
//   gate    One opens, one crosses · Docks: one holds the switch, the other goes through the gate to the core
//   twins   Twin drones        · Fortress: two linked elites; both must fall within 3 s or the first comes back
//   team    Mixed team         · defeat 10 enemies while both of you are transformed into different aliens
//   rescue  Rescue             · revive your partner (or be revived)
//   relay   Relay              · from the Shelter, both reach Bay City within 40 s
// ============================================================================================
MISSIONS.push(
  { id: 'c_plates', coop: true, title: 'Peso doble', desc: 'Ruinas del pinar: pisad las dos placas a la vez para abrir la cámara de los fontaneros.', type: 'coop', key: 'plates', level: 1, reward: { xp: 300, coins: 60 } },
  { id: 'c_gate', coop: true, title: 'Uno abre, otro pasa', desc: 'Muelles: uno mantiene el interruptor y el otro cruza la puerta de energía hasta el núcleo.', type: 'coop', key: 'gate', level: 1, reward: { xp: 300, coins: 60 } },
  { id: 'c_twins', coop: true, title: 'Drones gemelos', desc: 'Fortaleza: derrotad a los dos drones con menos de 3 s de diferencia o el primero se reactiva.', type: 'coop', key: 'twins', level: 6, reward: { xp: 600, coins: 120, dna: true } },
  { id: 'c_team', coop: true, title: 'Equipo variado', desc: 'Derrotad 10 enemigos mientras los dos estáis transformados en aliens distintos.', type: 'coopkill', count: 10, level: 2, reward: { xp: 350, coins: 70 } },
  { id: 'c_rescue', coop: true, title: 'Rescate', desc: 'Reanima a tu compañero cuando caiga (o deja que te reanime).', type: 'coop', key: 'rescue', level: 1, reward: { xp: 250, coins: 50 } },
  { id: 'c_relay', coop: true, title: 'Relevo', desc: 'Salid del Refugio y llegad los dos a la baliza de Ciudad Bahía en 50 s.', type: 'cooprelay', from: 1, to: 3, time: 50, level: 2, reward: { xp: 350, coins: 70 } },
);
const coopOn = () => !!(net.role && net.peer && net.remote);
const COOP_SITES = {
  plates: { zone: 0, a: { x: 330, dy: 160 }, b: { x: 1330, dy: 160 }, vault: { x: 830, dy: 175 } },
  gate: { zone: 5, sw: { x: 560, dy: 125 }, x: 1270 },
};
const coopState = () => (player.coop = player.coop && typeof player.coop === 'object' ? player.coop : {});
const siteY = (z, dy) => REGIONS[z].top + dy;
const onSpot = (o, z, s, r = 48) => o && (o === player ? zone === z : o.zone === z) && Math.hypot(o.x - s.x, o.y - siteY(z, s.dy)) < r;
function coopMis(key) {
  const m = activeMission();
  return m && m.coop && (m.key === key || m.type === key) ? m : null;
}
// shared events: apply here and tell the partner
function coopShare(ev, extra = {}) {
  coopApply(ev, extra);
  if (net.peer) lanSend({ type: 'coopEvent', ev, ...extra });
}
function coopApply(ev, extra = {}) {
  const st = coopState();
  if (ev === 'plates' && !st.platesOpen) {
    st.platesOpen = true;
    toast('¡Las placas se activan! La cámara de los fontaneros se abre');
    playWatchSFX('confirm');
    shake = 0.25;
    save();
  }
  if (ev === 'gate' || ev === 'twins' || ev === 'rescue') {
    const m = coopMis(ev);
    if (m) missionComplete(m);
  }
}
function coopReceive(m) {
  coopApply(m.ev, m);
}
// mission events coming from part-27
function coopMissionEvent(m, kind) {
  if (m.type === 'coopkill' && kind === 'kill' && coopOn() && player.alien && net.remote.alien && net.remote.activeAlien !== player.activeAlien) missionAdd(m);
}
// ---------------- per frame ----------------
let twinsDeadAt = {};
function coopTickMissions(dt) {
  coopHudTick(dt);
  const st = coopState(),
    P = COOP_SITES.plates;
  // plates: me on one plate, partner on the other
  if (coopOn() && zone === P.zone && !st.platesOpen && coopMis('plates')) {
    const r = net.remote;
    if ((onSpot(player, P.zone, P.a) && onSpot(r, P.zone, P.b)) || (onSpot(player, P.zone, P.b) && onSpot(r, P.zone, P.a))) coopShare('plates');
  }
  // vault reward (each player claims their own)
  if (zone === P.zone && st.platesOpen && !st.vaultClaimed && Math.hypot(player.x - P.vault.x, player.y - siteY(P.zone, P.vault.dy)) < 50) {
    st.vaultClaimed = true;
    burst(P.vault.x, siteY(P.zone, P.vault.dy) - 20, 30, '#ffd76a');
    const m = coopMis('plates');
    if (m) missionComplete(m);
    else {
      player.coins = (player.coins || 0) + 40;
      toast('Cámara de los fontaneros · +40 monedas');
    }
    save();
  }
  // gate core: whoever reaches it completes it for both
  const G = COOP_SITES.gate;
  if (zone === G.zone && coopMis('gate') && Math.hypot(player.x - G.x, player.y - (REGIONS[G.zone].top + 24)) < 50) coopShare('gate');
  // relay: both must stand in the target area before the time runs out
  const rm = activeMission();
  if (rm && rm.type === 'cooprelay') {
    const s = MS();
    if (s.timer == null && s.armed && zone !== rm.from) s.timer = 0;
    if (zone === rm.from && s.timer == null) s.armed = true;
    if (s.timer != null) {
      s.timer += dt;
      // the guest always follows the host between areas, so the finish is a beacon both must stand at
      const b = relayBeacon(rm);
      if (zone === rm.to && coopOn() && dist(player, b) < 90 && net.remote.zone === rm.to && dist(net.remote, b) < 90) missionComplete(rm);
      else if (s.timer > rm.time) {
        toast('Relevo fallido · volved los dos al Refugio');
        s.timer = null;
        s.armed = false;
      }
    }
  }
  // twin drones (host only): spawn, and revive the first one if the second survives 3 s longer
  if (net.role !== 'guest' && zone === 6) {
    const wantTwins = coopMis('twins') || (coopOn() && net.remote.zone === 6 && net.remote.coopKey === 'twins');
    const twins = enemies.filter((e) => e.twin);
    if (wantTwins && coopOn() && !twins.length) {
      const r = region();
      for (const k of [0, 1]) {
        const x = r.minX + 450 + k * 650, y = (r.top + r.bottom) / 2;
        enemies.push({ id: 91 + k, x, y, homeX: x, homeY: y, face: -1, hp: 800, max: 800, boss: true, elite: true, twin: true, kind: 'enemy', rcd: 1, cast: 0, stun: 0, alive: true, respawn: 0, cd: 0.8, wind: 0, anim: 0, hit: 0, moving: false });
      }
      toast('¡Drones gemelos! Derrotadlos casi a la vez');
      playWatchSFX('warning');
    }
    const dead = twins.filter((e) => !e.alive),
      alive = twins.filter((e) => e.alive);
    if (twins.length === 2 && dead.length === 1 && alive.length === 1) {
      const d = dead[0];
      twinsDeadAt[d.id] = twinsDeadAt[d.id] || clock;
      if (clock - twinsDeadAt[d.id] > 3) {
        d.alive = true;
        d.hp = d.max;
        twinsDeadAt = {};
        toast('El dron gemelo se ha reactivado · ¡más rápido!');
        burst(d.x, d.y - 60, 30, '#8fd9ff');
      }
    }
    if (twins.length === 2 && dead.length === 2 && !twins.done) {
      twins.forEach((e) => (e.respawn = 1e9));
      for (const e of twins) e.twinDone = true;
      twinsDeadAt = {};
      if (!twins.some((e) => e.reported)) {
        twins.forEach((e) => (e.reported = true));
        coopShare('twins');
      }
    }
  }
}
// the gate is solid unless the partner is on the switch (or it is already crossed)
function coopSolid(x, y, r) {
  const G = COOP_SITES.gate;
  if (zone !== G.zone || !coopMis('gate')) return false;
  const top = REGIONS[G.zone].top,
    rect = { x: G.x - 78, y: top - 40, w: 156, h: 108 };
  if (!inRect(rect, x, y, r)) return false;
  if (solidActor && inRect(rect, solidActor.x, solidActor.y, 0)) return false;
  return !(coopOn() && onSpot(net.remote, G.zone, G.sw, 55));
}
function relayBeacon(m) {
  const r = REGIONS[m.to];
  return { x: (r.minX + r.maxX) / 2, y: (r.top + r.bottom) / 2 };
}
// ---------------- drawing ----------------
function drawCoopSites() {
  const rm = activeMission();
  if (rm && rm.type === 'cooprelay' && zone === rm.to) {
    const b = relayBeacon(rm);
    ctx.save();
    ctx.strokeStyle = '#9fe7ff'; ctx.lineWidth = 4; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(clock * 5);
    ctx.beginPath(); ctx.ellipse(b.x, b.y, 90, 28, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = '#9fe7ff'; ctx.fillRect(b.x - 4, b.y - 120, 8, 120);
    ctx.restore();
    txt('BALIZA · LOS DOS AQUÍ', b.x, b.y - 132, 10, '#9fe7ff');
  }
  const st = coopState(),
    P = COOP_SITES.plates,
    G = COOP_SITES.gate;
  if (zone === P.zone && (coopMis('plates') || st.platesOpen)) {
    for (const s of [P.a, P.b]) {
      const y = siteY(P.zone, s.dy),
        lit = st.platesOpen || onSpot(player, P.zone, s) || (coopOn() && onSpot(net.remote, P.zone, s));
      ctx.save();
      ctx.fillStyle = lit ? '#7dff9a' : '#3b4a3f';
      ctx.beginPath(); ctx.ellipse(s.x, y, 44, 14, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = lit ? '#e4ffd8' : '#7a8f7e'; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
      if (!st.platesOpen) txt('PLACA', s.x, y - 22, 9, '#c3f38e');
    }
    const vy = siteY(P.zone, P.vault.dy);
    ctx.save();
    ctx.fillStyle = st.platesOpen ? '#1c2a22' : '#39443d';
    ctx.fillRect(P.vault.x - 46, vy - 70, 92, 72);
    ctx.fillStyle = st.platesOpen ? '#7dff9a' : '#ff4d4d';
    ctx.fillRect(P.vault.x - 6, vy - 62, 12, 8);
    if (st.platesOpen && !st.vaultClaimed) {
      ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 14; ctx.fillStyle = '#ffd76a';
      ctx.fillRect(P.vault.x - 10, vy - 40 + Math.sin(clock * 3) * 3, 20, 26);
    }
    ctx.restore();
    if (!st.platesOpen && coopMis('plates') && dist(player, { x: P.vault.x, y: vy }) < 600) txt('Pisad las dos placas a la vez', P.vault.x, vy - 84, 10, '#ffe6a6');
  }
  if (zone === G.zone && coopMis('gate')) {
    const sy = siteY(G.zone, G.sw.dy),
      held = coopOn() && onSpot(net.remote, G.zone, G.sw, 55),
      top = REGIONS[G.zone].top;
    ctx.save();
    ctx.fillStyle = onSpot(player, G.zone, G.sw, 55) || held ? '#ffd76a' : '#5a4a2a';
    ctx.beginPath(); ctx.ellipse(G.sw.x, sy, 40, 13, 0, 0, 7); ctx.fill();
    ctx.restore();
    txt('INTERRUPTOR', G.sw.x, sy - 20, 9, '#ffe6a6');
    ctx.save();
    ctx.globalAlpha = held ? 0.18 : 0.55 + 0.15 * Math.sin(clock * 6);
    ctx.fillStyle = '#ffb23f';
    ctx.fillRect(G.x - 78, top - 56, 156, 124);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#7dff9a'; ctx.shadowColor = '#7dff9a'; ctx.shadowBlur = 12;
    ctx.fillRect(G.x - 9, top - 4 + Math.sin(clock * 3) * 3, 18, 24);
    ctx.restore();
    txt(held ? 'PUERTA ABIERTA · ¡CRUZA!' : 'Tu compañero debe pisar el interruptor', G.x, top - 70, 10, held ? '#c3f38e' : '#ffe6a6');
  }
  for (const e of enemies)
    if (e.twin && e.alive) {
      ctx.save(); ctx.strokeStyle = '#8fd9ff'; ctx.lineWidth = 3; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.ellipse(e.x, e.y - 2, 50, 16, 0, 0, 7); ctx.stroke(); ctx.restore();
      txt('DRON GEMELO', e.x, e.y - 190, 10, '#8fd9ff');
    }
}

// HUD line for an active co-op mission (part-27 hudMissions)
function coopHudLine(m) {
  if (!coopOn()) return '🤝 Esperando a tu compañero · ' + m.title;
  const s = MS(),
    st = coopState();
  if (m.type === 'cooprelay') return s.timer != null ? '⏱ ' + Math.max(0, m.time - s.timer).toFixed(1) + ' s · los dos a la baliza de ' + REGIONS[m.to].name : 'Salid del Refugio para empezar · ' + m.time + ' s';
  if (m.type === 'coopkill') return missionProgress(m) + ' / ' + m.count + ' · transformados en aliens distintos';
  if (m.key === 'plates') return st.platesOpen ? 'Cámara abierta · recoge el premio' : 'Ruinas del pinar · una placa cada uno';
  if (m.key === 'gate') return 'Muelles · uno pisa el interruptor, el otro cruza';
  if (m.key === 'twins') return 'Fortaleza · los dos drones en menos de 3 s';
  if (m.key === 'rescue') return 'Reanima a tu compañero (o deja que te reanime)';
  return m.desc;
}
let coopHudT = 0;
function coopHudTick(dt) {
  const m = activeMission();
  if (!m || !m.coop) return;
  coopHudT -= dt;
  if (coopHudT <= 0) {
    coopHudT = 0.25;
    hudMissions();
  }
}
// ============================================================================================
// OMNI CONTROLLER SUPPORT (0.15) · any standard Xbox / PlayStation / generic pad on PC (Gamepad API).
// The pad is turned into the same key presses the keyboard makes, so every system (watch dial, cutscenes, dialogs,
// missions, co-op) works without special cases. Left stick moves (analog). Menus: D-pad / stick move the focus, A picks.
//   A / ✕  jump · dodge        X / □  attack (J)          Y / △  Omnitrix (Q)        B / ○  talk · interact (E)
//   LB     quick swap (G)      RB     next power page (V) RT     power 2             D-pad  powers 3-6
//   LT / L3 hold: fast travel (SHIFT)   START  pause       SELECT / VIEW  map        R3     skill tree
// ============================================================================================
const PAD = {
  dead: 0.28,
  prev: [],
  stick: false,
  focus: 0,
  repeatT: 0,
  name: '',
  // standard mapping button index → key while playing
  play: { 0: ' ', 2: 'j', 3: 'q', 1: 'e', 4: 'g', 5: 'v', 7: '2', 12: '3', 15: '4', 13: '5', 14: '6', 9: 'Escape', 8: 'm', 11: 'k' },
};
function padKey(key, down) {
  try {
    document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key, bubbles: true, cancelable: true }));
  } catch (e) {}
}
// focusable things in an open dialog / menu
function padTargets() {
  if (!$('#modal').classList.contains('hidden'))
    return [...document.querySelectorAll('#modal button, #modal [data-mission], #modal input, #modal select')].filter((b) => !b.disabled && b.offsetParent);
  const menu = $('#menu');
  if (menu && !menu.classList.contains('hidden')) return [...menu.querySelectorAll('button')].filter((b) => !b.disabled && b.offsetParent);
  return [];
}
function padFocus(list, i) {
  if (!list.length) return;
  PAD.focus = (i + list.length) % list.length;
  for (const b of list) b.classList.remove('padfocus');
  const b = list[PAD.focus];
  b.classList.add('padfocus');
  try { b.focus({ preventScroll: false }); b.scrollIntoView({ block: 'nearest' }); } catch (e) {}
}
function padMenuMode() {
  return !$('#modal').classList.contains('hidden') || ($('#menu') && !$('#menu').classList.contains('hidden'));
}
function padPoll(dt) {
  let pads = [];
  try { pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []; } catch (e) {}
  const gp = pads.find((p) => p.connected && p.mapping === 'standard') || pads.find((p) => p.connected);
  if (!gp) return;
  const btn = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5)),
    pressed = (i) => btn(i) && !PAD.prev[i],
    released = (i) => !btn(i) && PAD.prev[i];
  const ax = gp.axes[0] || 0,
    ay = gp.axes[1] || 0,
    mag = Math.hypot(ax, ay);
  // ---- cutscenes / storyboards: any button skips
  if ((typeof storyRun !== 'undefined' && storyRun) || (fx && fx.cine)) {
    for (let i = 0; i < gp.buttons.length; i++) if (pressed(i)) { padKey('Enter', true); padKey('Enter', false); break; }
  } else if (sel) {
    // ---- watch dial: stick / D-pad scroll, A or Y confirms, B or LB closes
    PAD.repeatT -= dt;
    const dir = pressed(14) || pressed(12) ? -1 : pressed(15) || pressed(13) ? 1 : mag > 0.6 && PAD.repeatT <= 0 ? (Math.abs(ax) > Math.abs(ay) ? Math.sign(ax) : Math.sign(ay)) : 0;
    if (dir) { padKey(dir < 0 ? 'ArrowLeft' : 'ArrowRight', true); PAD.repeatT = 0.18; }
    if (mag < 0.3) PAD.repeatT = 0;
    if (pressed(0) || pressed(3)) padKey('Enter', true);
    if (pressed(1) || pressed(4)) padKey('Escape', true);
    if (pressed(2)) padKey('f', true);
  } else if (padMenuMode()) {
    // ---- dialogs and the title menu: move a highlight, A clicks it, B closes
    const list = padTargets();
    PAD.repeatT -= dt;
    let step = pressed(12) || pressed(14) ? -1 : pressed(13) || pressed(15) ? 1 : 0;
    if (!step && mag > 0.6 && PAD.repeatT <= 0) step = Math.abs(ay) >= Math.abs(ax) ? Math.sign(ay) : Math.sign(ax);
    if (step) { padFocus(list, (list.indexOf(document.activeElement) >= 0 ? list.indexOf(document.activeElement) : PAD.focus - (step > 0 ? 1 : 0)) + step); PAD.repeatT = 0.2; }
    if (mag < 0.3) PAD.repeatT = 0;
    if (pressed(0) && list.length) {
      const b = list.includes(document.activeElement) ? document.activeElement : list[Math.min(PAD.focus, list.length - 1)];
      b.click();
      PAD.focus = 0;
    }
    if ((pressed(1) || pressed(9)) && dialogOpen) closeDialog();
    if (stick.x || stick.y) { stick.x = stick.y = 0; PAD.stick = false; }
  } else {
    // ---- playing
    for (const [i, key] of Object.entries(PAD.play)) {
      if (pressed(+i)) padKey(key, true);
      if (released(+i)) padKey(key, false);
    }
    if (btn(6) || btn(10)) { keys.Shift = true; PAD.shiftOwn = true; }
    else if (PAD.shiftOwn) { keys.Shift = false; PAD.shiftOwn = false; }
    if (mag > PAD.dead) {
      const k = Math.min(1, (mag - PAD.dead) / (1 - PAD.dead)) / mag;
      stick.x = ax * k;
      stick.y = ay * k;
      PAD.stick = true;
    } else if (PAD.stick) {
      stick.x = stick.y = 0;
      PAD.stick = false;
    }
  }
  PAD.prev = gp.buttons.map((b) => !!(b.pressed || b.value > 0.5));
}
let padLast = performance.now();
function padLoop(t) {
  const dt = Math.min(0.1, (t - padLast) / 1000);
  padLast = t;
  try { padPoll(dt); } catch (e) {}
  requestAnimationFrame(padLoop);
}
requestAnimationFrame(padLoop);
window.addEventListener('gamepadconnected', (e) => {
  PAD.name = e.gamepad.id || 'Mando';
  PAD.prev = [];
  toast('🎮 Mando conectado · A saltar · X atacar · Y Omnitrix · B hablar · START pausa');
});
window.addEventListener('gamepaddisconnected', () => {
  stick.x = stick.y = 0;
  toast('Mando desconectado');
});
function padHelp() {
  showDialog(
    'MANDO',
    PAD.name ? 'Conectado · ' + PAD.name.slice(0, 40) : 'Conecta un mando y pulsa cualquier botón',
    '<div class="padmap"><p><b>Stick izquierdo</b> moverse · <b>A / ✕</b> saltar y esquivar · <b>X / □</b> atacar · <b>Y / △</b> Omnitrix · <b>B / ○</b> hablar e interactuar</p>' +
      '<p><b>LB</b> cambio rápido · <b>RB</b> página de poderes · <b>RT</b> poder 2 · <b>Cruceta</b> poderes 3-6 · <b>LT / L3</b> (mantener) viaje rápido</p>' +
      '<p><b>START</b> pausa · <b>SELECT / VISTA</b> mapa · <b>R3</b> árbol</p>' +
      '<p>En menús: <b>cruceta o stick</b> para moverte, <b>A</b> para elegir, <b>B</b> para cerrar. En el dial del reloj: stick para girar, <b>A</b> transforma.</p></div>',
    [['LISTO', closeDialog]],
  );
}
// ============================================================================================
// OMNI DIFFICULTY (0.15) · Fácil / Normal / Difícil, saved per profile. Scales damage taken, enemy toughness and the
// experience you earn. In co-op the host's choice rules the shared world (enemies live on the host); co-op already
// makes enemies tougher on its own (coopDamage, part-20).
// ============================================================================================
const DIFFS = {
  facil: { name: 'FÁCIL', hp: 0.7, dmg: 0.55, xp: 0.9, desc: 'Enemigos más débiles y menos daño. Para aprender o jugar tranquilo.' },
  normal: { name: 'NORMAL', hp: 1, dmg: 1, xp: 1, desc: 'El equilibrio original.' },
  dificil: { name: 'DIFÍCIL', hp: 1.45, dmg: 1.5, xp: 1.3, desc: 'Enemigos más duros que pegan más fuerte · +30% de experiencia.' },
};
function diffKey() {
  const k = net.role === 'guest' && net.peer && net.hostDiff ? net.hostDiff : player.diff;
  return DIFFS[k] ? k : 'normal';
}
const diffCfg = () => DIFFS[diffKey()];
function difficultyMenu(back) {
  const guest = net.role === 'guest' && net.peer;
  showDialog(
    'DIFICULTAD',
    'Ahora: ' + diffCfg().name + (guest ? ' (la elige el anfitrión)' : ''),
    Object.entries(DIFFS)
      .map(([k, d]) => '<p><b>' + d.name + '</b> · ' + d.desc + '</p>')
      .join('') + (guest ? '<p>En una sala, el anfitrión decide la dificultad para los dos.</p>' : ''),
    [
      ...Object.entries(DIFFS).map(([k, d]) => [
        (diffKey() === k ? '✓ ' : '') + d.name,
        () => {
          if (guest) return toast('La dificultad la elige el anfitrión');
          player.diff = k;
          save();
          toast('Dificultad: ' + d.name);
          difficultyMenu(back);
        },
      ]),
      ['VOLVER', back || closeDialog],
    ],
  );
}
// ============================================================================================
// OMNI WAVE ARENA (0.15) · survival mode in the Ruinas del pinar. Endless waves that get bigger and tougher; every
// 5th wave brings brutes. Clearing a wave gives EXP + coins and heals a little. Best wave is saved per race.
// Solo or co-op: the host runs the waves (enemies live on the host) and the guest is pulled along and shares them.
// ============================================================================================
const ARENA_ZONE = 0;
const arena = { on: false, wave: 0, breakT: 0, kills: 0, remote: null };
const arenaOn = () => arena.on;
function arenaBest() {
  return player.arenaBest || 0;
}
function arenaStart() {
  if (net.role === 'guest' && net.peer) return toast('La arena la abre el anfitrión de la sala');
  if (!started) return;
  closeDialog();
  if (player.downed) return;
  if (zone !== ARENA_ZONE) enterZone(ARENA_ZONE, 'center');
  const r = region();
  player.x = (r.minX + r.maxX) / 2;
  player.y = (r.top + r.bottom) / 2;
  arena.on = true;
  arena.wave = 0;
  arena.kills = 0;
  arena.breakT = 2.5;
  enemies = [];
  zoneStates[r.id] = enemies;
  toast('ARENA DE OLEADAS · aguanta todo lo que puedas · récord: oleada ' + arenaBest());
  playWatchSFX('warning');
  arenaSync();
  hud();
}
function arenaSpawnWave() {
  arena.wave++;
  const n = arena.wave,
    r = region(),
    cx = (r.minX + r.maxX) / 2,
    cy = (r.top + r.bottom) / 2,
    count = Math.min(3 + n, 12) + (coopOn() ? 2 : 0),
    brutes = n % 5 === 0 ? 1 + Math.floor(n / 10) : n > 6 ? 1 : 0,
    hp = Math.round(100 * (1 + 0.16 * (n - 1)));
  enemies = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1,
      x = clamp(cx + side * (380 + Math.random() * 300), r.minX + 40, r.maxX - 40),
      y = clamp(r.top + 30 + Math.random() * (r.bottom - r.top - 60), r.top + 20, r.bottom - 20),
      boss = i < brutes,
      h = boss ? Math.round(hp * 3.5) : hp;
    enemies.push({ id: 300 + i, x, y, homeX: x, homeY: y, face: -side, hp: h, max: h, boss, arena: true, kind: 'enemy', rcd: 1.5 + i * 0.3, cast: 0, stun: 0, alive: true, respawn: 1e9, cd: 1 + i * 0.2, wind: 0, anim: 0, hit: 0, moving: false });
  }
  zoneStates[r.id] = enemies;
  toast('OLEADA ' + n + (brutes ? ' · ¡' + brutes + ' bruto' + (brutes > 1 ? 's' : '') + '!' : '') + ' · ' + count + ' enemigos');
  playWatchSFX(n % 5 === 0 ? 'warning' : 'confirm');
  arenaSync();
}
function arenaWaveClear() {
  const n = arena.wave;
  xp(30 * n);
  player.coins = (player.coins || 0) + 8 * n;
  player.hp = Math.min(maxHP(), player.hp + maxHP() * 0.15);
  if (n > arenaBest()) {
    player.arenaBest = n;
    toast('¡Oleada ' + n + ' superada! · NUEVO RÉCORD · +' + 30 * n + ' EXP · +' + 8 * n + ' monedas');
  } else toast('¡Oleada ' + n + ' superada! · +' + 30 * n + ' EXP · +' + 8 * n + ' monedas');
  statEvent('arena', { wave: n });
  if (net.peer) lanSend({ type: 'arenaClear', wave: n });
  burst(player.x, player.y - 60, 30, '#ffe27a');
  arena.breakT = 4;
  save();
}
function arenaEnd(reason) {
  if (!arena.on) return;
  const reached = Math.max(0, arena.wave - (reason === 'defeat' ? 1 : 0));
  arena.on = false;
  toast('Arena terminada · superaste ' + reached + ' oleada' + (reached === 1 ? '' : 's') + ' · récord: ' + arenaBest());
  delete zoneStates[REGIONS[ARENA_ZONE].id];
  if (zone === ARENA_ZONE && reason !== 'defeat') spawnEnemies();
  arenaSync();
  arenaHudSet();
  save();
}
function arenaTick(dt) {
  if (!arena.on) {
    if (arena.remote != null || (arenaHudEl && !arenaHudEl.classList.contains('hidden'))) arenaHudSet();
    return;
  }
  if (zone !== ARENA_ZONE) return arenaEnd('left');
  if (net.role === 'guest') return;
  if (arena.breakT > 0) {
    arena.breakT -= dt;
    if (arena.breakT <= 0) arenaSpawnWave();
  } else {
    for (const e of enemies) if (!e.alive) e.respawn = 1e9;
    const left = enemies.filter((e) => e.arena && e.alive).length;
    if (!left && arena.wave > 0) arenaWaveClear();
  }
  arenaHudSet();
}
// tell the guest so its HUD shows the wave (enemies themselves arrive in the world packet)
function arenaSync() {
  if (net.peer && net.role !== 'guest') lanSend({ type: 'arena', on: arena.on, wave: arena.wave });
}
function arenaReceive(m) {
  if (m.type === 'arena') {
    arena.remote = m.on ? m.wave : null;
    arenaHudSet();
  }
  if (m.type === 'arenaClear' && net.role === 'guest') {
    player.coins = (player.coins || 0) + 8 * m.wave;
    if (m.wave > arenaBest()) player.arenaBest = m.wave;
    statEvent('arena', { wave: m.wave });
    toast('¡Oleada ' + m.wave + ' superada! · +' + 8 * m.wave + ' monedas');
    save();
  }
}
let arenaHudEl = null;
function arenaHudSet() {
  if (!arenaHudEl) {
    arenaHudEl = document.createElement('div');
    arenaHudEl.id = 'arenahud';
    document.body.append(arenaHudEl);
  }
  const guestWave = net.role === 'guest' && zone === ARENA_ZONE ? arena.remote : null,
    show = (arena.on || guestWave != null) && started;
  arenaHudEl.classList.toggle('hidden', !show);
  if (!show) return;
  const wave = arena.on ? arena.wave : guestWave,
    left = enemies.filter((e) => e.arena && e.alive).length;
  const text =
    arena.on && arena.breakT > 0
      ? (arena.wave ? 'OLEADA ' + arena.wave + ' SUPERADA · ' : 'ARENA · ') + 'siguiente en ' + Math.ceil(arena.breakT) + ' s'
      : 'OLEADA ' + wave + ' · quedan ' + left + ' · récord ' + arenaBest();
  if (arenaHudEl.textContent !== text) arenaHudEl.textContent = text;
}
// ============================================================================================
// OMNI EXTRAS (0.15) · one place in the pause menu for the new side systems:
//   statEvent   one hook other systems call (kills, transformations, powers, puzzles, missions, arena waves)
//   RETOS       three daily challenges, the same for everyone on a given day (seeded by the date), new ones at midnight
//   LOGROS      achievements, saved per race
//   CÓDICE      every alien: unlocked or not, life, speed, fast travel, moves, signature move, mastery
//   + ARENA (part-33), DIFICULTAD (part-32), MANDO (part-31)
// ============================================================================================
function stats() {
  const s = (player.stats = player.stats && typeof player.stats === 'object' ? player.stats : {});
  for (const k of ['kills', 'transforms', 'powers', 'puzzles', 'missions', 'coopMissions', 'dailies']) s[k] = s[k] || 0;
  if (!Array.isArray(s.aliens)) s.aliens = [];
  return s;
}
function statEvent(kind, d = {}) {
  try {
    const s = stats();
    if (kind === 'kill') s.kills++;
    if (kind === 'transform') {
      try { onTransformEvent(d.alien); } catch (e) {} // combo finisher + malfunction (part-47)
      s.transforms++;
      if (d.alien && !s.aliens.includes(d.alien)) s.aliens.push(d.alien);
      if (d.alien && isFusionId(d.alien)) s.fusion = true;
    }
    if (kind === 'power') s.powers++;
    if (kind === 'puzzle') s.puzzles++;
    if (kind === 'mission') {
      s.missions++;
      if (d.coop) s.coopMissions++;
      if (diffKey() === 'dificil') s.hardMission = true;
    }
    dailyEvent(kind, d);
    achCheck();
  } catch (e) {
    console.warn('statEvent', e);
  }
}
// ---------------- daily challenges ----------------
const DAILY_POOL = [
  { id: 'kill15', ev: 'kill', n: 15, text: 'Derrota 15 enemigos' },
  { id: 'kill30', ev: 'kill', n: 30, text: 'Derrota 30 enemigos' },
  { id: 'killas', ev: 'kill', n: 6, alien: true, omni: true, text: 'Derrota 6 enemigos como {A}' },
  { id: 'trans5', ev: 'transform', n: 5, omni: true, text: 'Transfórmate 5 veces' },
  { id: 'variety', ev: 'transform', n: 3, variety: true, omni: true, text: 'Transfórmate en 3 aliens distintos' },
  { id: 'power20', ev: 'power', n: 20, omni: true, text: 'Usa 20 poderes de alien' },
  { id: 'travel', ev: 'kill', n: 3, travel: true, omni: true, text: 'Derrota 3 enemigos mientras usas el viaje rápido (SHIFT)' },
  { id: 'puzzle', ev: 'puzzle', n: 1, omni: true, text: 'Resuelve 1 puzle de alien' },
  { id: 'mission', ev: 'mission', n: 1, text: 'Completa 1 misión del tablón' },
  { id: 'arena3', ev: 'arena', n: 3, wave: true, text: 'Supera la oleada 3 en la arena' },
  { id: 'arena6', ev: 'arena', n: 6, wave: true, text: 'Supera la oleada 6 en la arena' },
];
const DAILY_REWARD = { xp: 150, coins: 40 },
  DAILY_BONUS = { xp: 250, coins: 80 };
function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function seeded(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
}
function daily() {
  const today = todayKey();
  let D = player.daily;
  if (!D || typeof D !== 'object' || D.date !== today || D.race !== race) {
    const rnd = seeded(today + race),
      pool = DAILY_POOL.filter((c) => race === 'omni' || !c.omni),
      ids = [];
    while (ids.length < 3 && ids.length < pool.length) {
      const c = pool[Math.floor(rnd() * pool.length)];
      if (!ids.includes(c.id) && !(c.ev === 'arena' && ids.some((i) => i.startsWith('arena'))) && !(c.id.startsWith('kill') && ids.some((i) => i.startsWith('kill')))) ids.push(c.id);
    }
    const opts = CORE_ALIENS.concat(Object.keys(ALIENS)).filter((id, i, a) => a.indexOf(id) === i && ALIENS[id] && !isFusionId(id) && id !== 'anodite' && alienUnlocked(id));
    D = player.daily = { date: today, race, ids, prog: {}, done: {}, seen: [], alien: opts.length ? opts[Math.floor(rnd() * opts.length)] : 'heatblast', bonus: false };
  }
  return D;
}
const dailyDef = (id) => DAILY_POOL.find((c) => c.id === id);
const dailyText = (c, D) => c.text.replace('{A}', (ALIENS[D.alien] || { name: '?' }).name);
function dailyEvent(kind, d) {
  const D = daily();
  for (const id of D.ids) {
    const c = dailyDef(id);
    if (!c || D.done[id] || c.ev !== kind) continue;
    if (c.alien && !(player.alien && player.activeAlien === D.alien)) continue;
    if (c.travel && !player.travel) continue;
    if (c.variety) {
      if (!d.alien || D.seen.includes(d.alien)) continue;
      D.seen.push(d.alien);
    }
    D.prog[id] = c.wave ? Math.max(D.prog[id] || 0, d.wave || 0) : (D.prog[id] || 0) + 1;
    if (D.prog[id] >= c.n) {
      D.prog[id] = c.n;
      D.done[id] = true;
      stats().dailies++;
      xp(DAILY_REWARD.xp);
      player.coins = (player.coins || 0) + DAILY_REWARD.coins;
      toast('✔ RETO DIARIO · ' + dailyText(c, D) + ' · +' + DAILY_REWARD.xp + ' EXP · +' + DAILY_REWARD.coins + ' monedas');
      playWatchSFX('confirm');
      if (!D.bonus && D.ids.every((i) => D.done[i])) {
        D.bonus = true;
        xp(DAILY_BONUS.xp);
        player.coins += DAILY_BONUS.coins;
        setTimeout(() => toast('🌟 ¡LOS TRES RETOS DE HOY! · +' + DAILY_BONUS.xp + ' EXP · +' + DAILY_BONUS.coins + ' monedas'), 1600);
      }
      save();
    }
  }
}
function dailyMenu(back) {
  const D = daily(),
    left = (() => {
      const t = new Date(),
        m = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1) - t;
      return Math.floor(m / 3600000) + ' h ' + Math.floor((m % 3600000) / 60000) + ' min';
    })();
  showDialog(
    'RETOS DIARIOS',
    D.ids.filter((i) => D.done[i]).length + ' / 3 completados · nuevos retos en ' + left,
    '<div class="xlist">' +
      D.ids
        .map((id) => {
          const c = dailyDef(id),
            p = D.prog[id] || 0;
          return '<div class="xrow' + (D.done[id] ? ' done' : '') + '"><b>' + (D.done[id] ? '✔ ' : '') + dailyText(c, D) + '</b><div class="xbar"><i style="width:' + Math.round((p / c.n) * 100) + '%"></i></div><small>' + p + ' / ' + c.n + ' · +' + DAILY_REWARD.xp + ' EXP · +' + DAILY_REWARD.coins + ' monedas</small></div>';
        })
        .join('') +
      '</div><p>Completa los tres para un premio extra: +' + DAILY_BONUS.xp + ' EXP · +' + DAILY_BONUS.coins + ' monedas. En co-op, las bajas compartidas cuentan para los dos.</p>',
    [['VOLVER', back || closeDialog]],
  );
}
// ---------------- achievements ----------------
const ACHS = [
  ['first', '🥊', 'Primer golpe', 'Derrota a tu primer enemigo', (s) => s.kills >= 1],
  ['hunter', '🎯', 'Cazador', 'Derrota 100 enemigos', (s) => s.kills >= 100],
  ['exterm', '💥', 'Exterminador', 'Derrota 500 enemigos', (s) => s.kills >= 500],
  ['shift', '⌚', 'Cambiante', 'Transfórmate 25 veces', (s) => s.transforms >= 25],
  ['collector', '🧬', 'Coleccionista', 'Usa 10 aliens distintos', (s) => s.aliens.filter((a) => !isFusionId(a)).length >= 10],
  ['fusion', '🔀', 'Biomnitrix', 'Transfórmate en una fusión', (s) => !!s.fusion],
  ['power', '⚡', 'Todo poder', 'Usa 100 poderes de alien', (s) => s.powers >= 100],
  ['puzzler', '🧩', 'Mente de puzles', 'Resuelve 5 puzles de alien', (s) => s.puzzles >= 5],
  ['plumber', '🔧', 'Fontanero', 'Completa 5 misiones', (s) => s.missions >= 5],
  ['board', '📋', 'Tablón limpio', 'Completa todas las misiones en solitario', () => MISSIONS.filter((m) => !m.coop).every((m) => MS().done[m.id])],
  ['team', '🤝', 'Trabajo en equipo', 'Completa una misión cooperativa', (s) => s.coopMissions >= 1],
  ['duo', '👥', 'Inseparables', 'Completa las 6 misiones cooperativas', () => MISSIONS.filter((m) => m.coop).every((m) => MS().done[m.id])],
  ['arena5', '🏟️', 'Gladiador', 'Supera la oleada 5 en la arena', () => arenaBest() >= 5],
  ['arena10', '🛡️', 'Imparable', 'Supera la oleada 10 en la arena', () => arenaBest() >= 10],
  ['arena20', '👑', 'Leyenda de la arena', 'Supera la oleada 20 en la arena', () => arenaBest() >= 20],
  ['daily3', '📅', 'Constante', 'Completa 3 retos diarios', (s) => s.dailies >= 3],
  ['daily15', '🗓️', 'Rutina de héroe', 'Completa 15 retos diarios', (s) => s.dailies >= 15],
  ['hard', '🔥', 'Valiente', 'Completa una misión en DIFÍCIL', (s) => !!s.hardMission],
  ['lv10', '⭐', 'Veterano', 'Llega al nivel 10', () => player.level >= 10],
  ['lv20', '🌟', 'Héroe máximo', 'Llega al nivel 20', () => player.level >= 20],
  ['races', '🌍', 'Tres razas', 'Juega con las tres razas', () => ['omni', 'osmo', 'anodite'].every((r) => r === race || (profiles && profiles[r]))],
];
function achCheck() {
  if (!started) return;
  const s = stats(),
    got = (player.ach = player.ach && typeof player.ach === 'object' ? player.ach : {});
  let n = 0;
  for (const [id, icon, name, , test] of ACHS) {
    if (got[id]) continue;
    let ok = false;
    try { ok = test(s); } catch (e) {}
    if (!ok) continue;
    got[id] = Date.now();
    n++;
    setTimeout(() => {
      toast('🏆 LOGRO DESBLOQUEADO · ' + icon + ' ' + name);
      playWatchSFX('master_control') || playWatchSFX('confirm');
    }, 400 + n * 1400);
  }
  if (n) save();
}
setInterval(() => { try { achCheck(); } catch (e) {} }, 4000);
function achMenu(back) {
  const got = player.ach || {},
    n = ACHS.filter((a) => got[a[0]]).length;
  showDialog(
    'LOGROS',
    n + ' / ' + ACHS.length + ' desbloqueados',
    '<div class="achgrid">' +
      ACHS.map(([id, icon, name, desc]) => '<div class="ach' + (got[id] ? ' got' : '') + '"><span>' + (got[id] ? icon : '🔒') + '</span><b>' + name + '</b><small>' + desc + '</small></div>').join('') +
      '</div>',
    [['VOLVER', back || closeDialog]],
  );
}
// ---------------- alien codex ----------------
function codexIds() {
  return Object.keys(ALIENS).filter((id) => !isFusionId(id) && id !== 'anodite' && alienInfo(id).implemented !== false);
}
function codexMenu(back) {
  const ids = codexIds(),
    have = ids.filter((id) => alienUnlocked(id)).length;
  showDialog(
    'CÓDICE ALIEN',
    have + ' / ' + ids.length + ' aliens desbloqueados',
    '<p>Toca un alien para ver su ficha.</p><div class="codex">' +
      ids
        .map((id) => {
          const A = ALIENS[id],
            u = alienUnlocked(id);
          return '<button class="cx' + (u ? '' : ' locked') + '" data-codex="' + id + '" style="--c:' + (A.color || '#7dff9a') + '"><b>' + (u ? A.name : '???') + '</b><small>' + (u ? Math.floor((player.masteries && player.masteries[id]) || 0) + '% maestría' : 'Nivel ' + (alienInfo(id).unlockLevel || '?')) + '</small></button>';
        })
        .join('') +
      '</div>',
    [['BESTIARIO', () => bestiaryMenu(back)], ['VOLVER', back || closeDialog]],
  );
  for (const b of document.querySelectorAll('[data-codex]')) b.onclick = () => codexCard(b.dataset.codex, back);
}
function codexCard(id, back) {
  const A = ALIENS[id],
    info = alienInfo(id),
    u = alienUnlocked(id);
  if (!u) {
    toast('Bloqueado · ' + (info.unlockLevel ? 'se desbloquea al nivel ' + info.unlockLevel : 'escanea su ADN'));
    return;
  }
  const tv = travelType(id),
    sig = SIG[id],
    skills = (A.skills || []).map((s, i) => '<li><b>' + (i === 0 ? 'J' : i + 1) + '</b> ' + s.name + (s.damage ? ' · ' + s.damage + ' daño' : '') + (s.cd ? ' · ' + s.cd + ' s' : '') + '</li>').join('');
  showDialog(
    'CÓDICE · ' + A.name.toUpperCase(),
    info.species || A.name,
    '<div class="cxcard" style="--c:' + (A.color || '#7dff9a') + '"><p><b>Vida</b> ' + A.hp + ' · <b>Velocidad</b> ' + (SPEEDS[id] || '—') + '</p>' +
      '<p><b>Viaje rápido (SHIFT)</b> ' + (tv && TRAVEL_TYPES[tv] ? TRAVEL_TYPES[tv].name : '—') + (sig ? ' · <b>Movimiento firma</b> ' + sig[1] : '') + '</p>' +
      '<p><b>Maestría</b> ' + Math.floor((player.masteries && player.masteries[id]) || 0) + '%</p><ul class="cxskills">' + skills + '</ul></div>',
    [['CÓDICE', () => codexMenu(back)], ['VOLVER', back || closeDialog]],
  );
}
// ---------------- hub ----------------
function extrasMenu() {
  const D = daily(),
    got = player.ach || {};
  showDialog(
    'EXTRAS',
    'Arena · retos · logros · códice',
    '<p>Récord en la arena: <b>oleada ' + arenaBest() + '</b> · Retos de hoy: <b>' + D.ids.filter((i) => D.done[i]).length + ' / 3</b> · Logros: <b>' + ACHS.filter((a) => got[a[0]]).length + ' / ' + ACHS.length + '</b> · Dificultad: <b>' + diffCfg().name + '</b></p>',
    [
      arenaOn() ? ['SALIR DE LA ARENA', () => { arenaEnd('quit'); closeDialog(); }] : ['ARENA DE OLEADAS', arenaStart],
      ['RETOS DIARIOS', () => dailyMenu(extrasMenu)],
      ['LOGROS', () => achMenu(extrasMenu)],
      ['CÓDICE ALIEN', () => codexMenu(extrasMenu)],
      ['BOSS RUSH', bossRushMenu],
      ['TORRE DEL VACÍO', towerMenu],
      ['RETOS SEMANALES', () => weeklyMenu(extrasMenu)],
      ['ENTRENAMIENTO', trainingToggle],
      ['TIENDA', () => shopMenu(extrasMenu)],
      ['COLECCIÓN', () => collectionMenu(extrasMenu)],
      ['TÍTULOS', () => titlesMenu(extrasMenu)],
      ['DIFICULTAD', () => difficultyMenu(extrasMenu)],
      ['MANDO', padHelp],
      ['VOLVER', pauseMenu],
    ],
  );
}
// ============================================================================================
// OMNI WATCH ERAS (0.15.5) · each watch carries its own era's aliens, like the show:
//   Prototipo (Classic) ............ Classic aliens
//   Recalibrado (Alien Force) ...... Alien Force aliens
//   Ultimatrix / Albedo ............ Alien Force + Ultimate Alien aliens
//   Completo (Omniverse) ........... every era (Classic, Alien Force, Ultimate Alien, Omniverse)
//   Biomnitrix ..................... every era (any two can fuse)
// MASTER CONTROL (level 15, on watches that support it) unlocks every alien you have, from every era, on that watch.
// You still have to unlock an alien (level / DNA) before it appears anywhere.
// ============================================================================================
const WATCH_ERAS = {
  prototype: ['os'],
  recalibrated: ['af'],
  ultimatrix: ['af', 'ua'],
  albedo: ['af', 'ua'],
  completed: ['os', 'af', 'ua', 'ov'],
  biomnitrix: ['os', 'af', 'ua', 'ov'],
};
function eraOf(id) {
  return (ALIEN_DB[id] && ALIEN_DB[id].origin) || 'os';
}
function eraPlaylist(w, api) {
  const eras = WATCH_ERAS[w.id];
  const mc = !!player.masterControl && !!w.masterControl;
  return CORE_ALIENS.filter((id) => ALIENS[id] && alienInfo(id).implemented !== false && alienUnlocked(id) && (!eras || mc || eras.includes(eraOf(id))));
}
for (const [id, eras] of Object.entries(WATCH_ERAS)) {
  const w = WATCHES[id];
  if (!w) continue;
  w.eras = eras;
  w.playlist = (api) => eraPlaylist(w, api);
  const line = 'Aliens: ' + eras.map((e) => ERA_NAMES[e]).join(' + ') + (w.masterControl ? ' · CONTROL MAESTRO (nivel 15): todas las eras' : '');
  w.summary = (w.summary || []).filter((s) => !/aliens clásicos en el dial|Todos los aliens (que hayas )?desbloquead/.test(s));
  w.summary.splice(1, 0, line);
}
// the six originals and their classic friends were limited by a per-alien list before; eras replace that
for (const id of CORE_ALIENS) if (ALIEN_DB[id]) ALIEN_DB[id].watches = null;
// ============================================================================================
// OMNI UI POLISH (0.15.5)
//  · the watch dial gets a dark backdrop and the HUD fades behind it, so the dial is readable
//  · PC key help folds into a small "H · TECLAS" chip after 40 s of play (H toggles it); a pad shows its buttons
// ============================================================================================
let uiPlayT = 0,
  kbManual = null;
setInterval(() => {
  try {
    const g = $('#game');
    g.classList.toggle('selopen', !!sel);
    if (started && !paused) uiPlayT += 0.25;
    const kb = $('#kbhint');
    if (kb) {
      const mini = kbManual != null ? kbManual : uiPlayT > 40;
      kb.classList.toggle('mini', mini);
      kb.classList.toggle('pad', !!(PAD && PAD.name));
    }
  } catch (e) {}
}, 250);
document.addEventListener('keydown', (e) => {
  if (e.key && e.key.toLowerCase() === 'h' && started && !dialogOpen && !sel) {
    const kb = $('#kbhint');
    kbManual = !(kb && kb.classList.contains('mini'));
  }
});
// ============================================================================================
// OMNI WATCH CORE LIGHT (0.16.2) · like the show, the core tells you the watch's state:
//   green  ready            · flashing amber + beeps  about to time out (last 15%)
//   red    recharging       · watch colour while transformed
// ============================================================================================
let coreBeepT = 0;
setInterval(() => {
  try {
    const t = $('#transform');
    if (!t || !started) return;
    let st = 'ready';
    if (!omniActive()) st = 'ready';
    else if (player.alien) st = player.battery < 15 && drainRate() > 0.05 ? 'warn' : 'active';
    else if (player.battery < 100 && player.battery < 25) st = 'charge';
    if (t.dataset.core !== st) t.dataset.core = st;
    if (st === 'warn' && !paused) {
      coreBeepT -= 0.25;
      if (coreBeepT <= 0) {
        coreBeepT = player.battery < 6 ? 0.5 : 1;
        playWatchSFX('warning') || tone(1320, 0.06, 'square', 0.015);
      }
    } else coreBeepT = 0;
  } catch (e) {}
}, 250);
// ============================================================================================
// OMNI WATCH ANIMATIONS (0.16.3) · the watch art you supplied, animated like the show:
//   ON       dial opens: the core starts dark, a light sweep fills it, a ring pulses out
//   SLAM     core presses in (selector, part-16) with a shockwave
//   TIMEOUT  energy runs out: the core flashes red with beeps, then goes dark (watch close-up)
//   CHARGED  back to 100%: the core fills from red to green with a ding (watch close-up)
// Uses the hand-made core art when it exists (tools/import_watch_layers.py), else the drawn watch.
// ============================================================================================
const coreTint = {};
function tintedCore(img, color, key) {
  const k = key + color;
  if (coreTint[k]) return coreTint[k];
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = color;
  g.globalAlpha = color === '#000' ? 0.82 : 0.6;
  g.fillRect(0, 0, c.width, c.height);
  coreTint[k] = c;
  return c;
}
// o: { boot 0..1, glow, ring 0..1, tint: colour or null, tintA 0..1, fillY 0..1 (bottom-up fill of the normal colour) }
function drawCoreAnim(g, img, cx, cy, cs, color, o = {}) {
  const boot = o.boot == null ? 1 : o.boot;
  g.save();
  g.imageSmoothingEnabled = true;
  g.shadowColor = o.tint || color;
  g.shadowBlur = (10 + (o.glow || 0) * 24) * boot;
  const x = cx - cs / 2, y = cy - cs / 2;
  // dark base (powered off)
  g.drawImage(tintedCore(img, '#000', img.src || 'c'), x, y, cs, cs);
  g.shadowBlur = 0;
  // powered part: sweeps in from the top during boot / fills up from the bottom while charging
  g.save();
  g.beginPath();
  if (o.fillY != null) g.rect(x, y + cs * (1 - o.fillY), cs, cs * o.fillY);
  else g.arc(cx, cy, (cs / 2) * 1.5 * boot, 0, 7);
  g.clip();
  g.shadowColor = o.tint || color;
  g.shadowBlur = 10 + (o.glow || 0) * 24;
  g.drawImage(img, x, y, cs, cs);
  if (o.tint) {
    g.globalAlpha = o.tintA == null ? 1 : o.tintA;
    g.drawImage(tintedCore(img, o.tint, img.src || 'c'), x, y, cs, cs);
  }
  g.restore();
  if (o.ring > 0) {
    g.strokeStyle = o.tint || color;
    g.globalAlpha = 1 - o.ring;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(cx, cy, (cs / 2) * (1 + o.ring * 0.9), 0, 7);
    g.stroke();
  }
  g.restore();
}
// ---------------- watch close-ups during play (timeout / recharged) ----------------
let wanim = null;
const wanimCanvas = (() => {
  const c = document.createElement('canvas');
  c.id = 'watchanim';
  c.width = 360;
  c.height = 200;
  c.className = 'hidden';
  const host = document.getElementById('game');
  if (host) host.append(c);
  return c;
})();
function watchAnim(kind) {
  if (!omniActive() || !wanimCanvas) return;
  wanim = { kind, t: 0, dur: kind === 'timeout' ? 1.6 : 1.3, beeps: 0 };
  wanimCanvas.classList.remove('hidden');
  if (kind === 'charged') playWatchSFX('recharged');
}
let wanimLast = performance.now();
function wanimLoop(now) {
  const dt = Math.min(0.05, (now - wanimLast) / 1000);
  wanimLast = now;
  if (wanim) {
    wanim.t += dt;
    const g = wanimCanvas.getContext('2d'),
      W = wanimCanvas.width,
      H = wanimCanvas.height,
      w = getWatch(),
      p = wanim.t / wanim.dur,
      cx = W / 2,
      cy = H / 2 + 6,
      r = 54,
      fade = p < 0.12 ? p / 0.12 : p > 0.85 ? (1 - p) / 0.15 : 1;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    g.globalAlpha = Math.max(0, fade);
    // panel
    g.fillStyle = 'rgba(2,8,5,.88)';
    g.beginPath();
    g.moveTo(14, 0); g.lineTo(W, 0); g.lineTo(W, H - 14); g.lineTo(W - 14, H); g.lineTo(0, H); g.lineTo(0, 14); g.closePath();
    g.fill();
    g.strokeStyle = wanim.kind === 'timeout' ? '#ff4d4d' : w.color;
    g.lineWidth = 2;
    g.stroke();
    // wrist + watch art
    const body = typeof wlGet === 'function' ? wlGet(w.id, 'body') : null,
      core = typeof wlGet === 'function' ? wlGet(w.id, 'core') : null;
    const hasStrip = typeof wlStrip === 'function' && wlStrip(w.id, wanim.kind === 'timeout' ? 'timeout' : 'recharge');
    g.fillStyle = '#d9a57c';
    g.fillRect(0, cy - 34, W, 68);
    if (hasStrip) {
    } else if (body) {
      const S = r * 5.0;
      g.save(); g.translate(cx, cy); g.rotate(Math.PI / 2);
      g.drawImage(body, -S / 2, -(S * body.height) / body.width / 2, S, (S * body.height) / body.width);
      g.restore();
    } else {
      g.fillStyle = '#1c1f22'; g.fillRect(cx - 90, cy - 34, 180, 68);
      g.beginPath(); g.arc(cx, cy, r * 1.25, 0, 7); g.fillStyle = '#c9cfcb'; g.fill();
    }
    const strip = typeof wlStrip === 'function' ? wlStrip(w.id, wanim.kind === 'timeout' ? 'timeout' : 'recharge') : null;
    if (strip) { // hand-made animation strip replaces the built-in core animation
      g.fillStyle = '#d9a57c';
      g.fillRect(0, cy - 34, W, 68);
      drawStripFrame(g, strip, Math.min(0.999, p / 0.85), cx, cy, r);
    }
    const tint = wanim.kind === 'timeout' ? (p < 0.7 ? (Math.floor(wanim.t * 6) % 2 ? '#ff2a2a' : null) : '#ff2a2a') : null;
    const coreImg = core || null;
    if (strip) {
    } else if (coreImg) {
      if (wanim.kind === 'timeout') drawCoreAnim(g, coreImg, cx, cy, r * 2, w.color, { boot: p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) / 0.2), tint, glow: 0.6 });
      else drawCoreAnim(g, coreImg, cx, cy, r * 2, w.color, { fillY: Math.min(1, p / 0.6), tint: p < 0.6 ? '#ff2a2a' : null, tintA: 1 - p / 0.6, glow: p > 0.6 ? 1 : 0.3, ring: p > 0.6 ? (p - 0.6) / 0.4 : 0 });
    } else {
      g.save();
      g.beginPath(); g.arc(cx, cy, r, 0, 7);
      g.fillStyle = wanim.kind === 'timeout' ? (tint || (p > 0.7 ? '#222' : '#600')) : p < 0.6 ? '#a22' : w.color;
      g.shadowColor = g.fillStyle; g.shadowBlur = 18; g.fill(); g.restore();
    }
    g.globalAlpha = Math.max(0, fade);
    g.font = 'bold 15px Arial';
    g.textAlign = 'center';
    g.fillStyle = wanim.kind === 'timeout' ? '#ff8a8a' : '#c8ffb8';
    g.fillText(wanim.kind === 'timeout' ? 'ENERGÍA AGOTADA' : 'OMNITRIX RECARGADO', cx, 22);
    if (wanim.kind === 'timeout' && p < 0.7 && Math.floor(wanim.t * 6) !== wanim.beeps) {
      wanim.beeps = Math.floor(wanim.t * 6);
      if (wanim.beeps % 2) tone(1480, 0.07, 'square', 0.02);
    }
    if (p >= 1) {
      wanim = null;
      wanimCanvas.classList.add('hidden');
    }
  }
  requestAnimationFrame(wanimLoop);
}
requestAnimationFrame(wanimLoop);
// recharged to 100% after a timeout
let wasEmpty = false;
setInterval(() => {
  try {
    if (!started || !omniActive()) return;
    if (!player.alien && player.battery <= 1) wasEmpty = true;
    if (wasEmpty && player.battery >= 100) {
      wasEmpty = false;
      watchAnim('charged');
    }
  } catch (e) {}
}, 250);
// ============================================================================================
// OMNI AUTO-UPDATE (0.19) · the game lives at REMOTE (GitHub Pages). Every copy checks REMOTE/version.json:
//   · on the title screen a newer build starts the UPDATE SCREEN straight away: animated OMNI logo, "v0.18 → v0.19",
//     a real download bar (each changed file is fetched into the cache) and the list of what's new. Then it restarts.
//   · mid-game a banner offers ACTUALIZAR (the game is saved first) — nothing interrupts a fight.
//   · after the restart a "¡ACTUALIZADO!" card shows the notes once.
//   · APK / PC app: the next start loads the game files from REMOTE (saves stay local). Offline → the built-in copy.
//   · OMNI.html (single file) can't replace itself: the banner points to the website instead.
// version.json = { build, version, notes[], files[[name, bytes]] } (written by build.sh from NOTES.txt)
// ============================================================================================
const OMNI_REMOTE = window.OMNI_REMOTE || 'https://omni-game.github.io/';
const OMNI_BUILD = +(window.OMNI_BUILD || 0);
window.OMNI_BOOTED = true;
const updMode = () => (window.__omniSingle ? 'single' : location.protocol === 'file:' ? 'app' : location.href.startsWith(OMNI_REMOTE) ? 'web' : 'other');
let updBusy = false, updOffer = null;
function curVersion() {
  const e = document.querySelector('#menu .eyebrow');
  const m = e && e.textContent.match(/\d+\.\d+(\.\d+)?/);
  return m ? m[0] : '';
}
function updateCheck() {
  if (updBusy) return;
  fetch(OMNI_REMOTE + 'version.json?t=' + Date.now(), { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((v) => {
      if (!v || !(+v.build > OMNI_BUILD)) return;
      const mode = updMode();
      if (mode === 'single' || mode === 'other') return updBanner(v, true);
      if (!started) return runUpdate(v);
      updBanner(v, false);
    })
    .catch(() => {});
}
// ---------------- banner (mid-game) ----------------
function updBanner(v, linkOnly) {
  if (updOffer && updOffer.build === v.build) return;
  updOffer = v;
  let b = document.getElementById('updbanner');
  if (!b) {
    b = document.createElement('div');
    b.id = 'updbanner';
    $('#game').append(b);
  }
  b.innerHTML = linkOnly
    ? '<b>⬇ OMNI ' + v.version + ' disponible</b><span>Juega la última versión en ' + OMNI_REMOTE.replace('https://', '').replace(/\/$/, '') + '</span><button data-x>✕</button>'
    : '<b>⬇ OMNI ' + v.version + ' disponible</b><span>' + ((v.notes && v.notes[0]) || 'Nueva versión') + '</span><button data-go>ACTUALIZAR</button><button data-x>✕</button>';
  b.classList.remove('hidden');
  const go = b.querySelector('[data-go]');
  if (go) go.onclick = () => { try { save(); } catch (e) {} b.classList.add('hidden'); runUpdate(v); };
  b.querySelector('[data-x]').onclick = () => b.classList.add('hidden');
  playWatchSFX('activate');
}
// ---------------- the update screen ----------------
function updLogo(cv, state) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
  const w = (typeof getWatch === 'function' && getWatch()) || { color: '#8dff5a', id: 'prototype' };
  const col = w.color || '#8dff5a';
  const mark = new Image();
  mark.src = 'assets/logo-' + ((typeof WATCH_ART !== 'undefined' && WATCH_ART[w.id]) || 'classic') + '.png';
  const t0 = performance.now();
  let raf = 0, stopped = false;
  const frame = (now) => {
    if (stopped || !cv.isConnected) return;
    raf = requestAnimationFrame(frame);
    if (!cv.offsetParent) return; // hidden (e.g. the title logo while playing): skip the drawing
    const t = (now - t0) / 1000, p = state.p;
    g.clearRect(0, 0, W, H);
    // halo
    const halo = g.createRadialGradient(cx, cy, 10, cx, cy, W / 2);
    halo.addColorStop(0, col + '55'); halo.addColorStop(1, col + '00');
    g.fillStyle = halo; g.fillRect(0, 0, W, H);
    // spinning segmented ring
    g.save(); g.translate(cx, cy); g.rotate(t * 1.4);
    g.lineWidth = 7; g.lineCap = 'round';
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      g.strokeStyle = k / 12 <= p ? col : col + '33';
      g.beginPath(); g.arc(0, 0, W * 0.4, a + 0.06, a + (Math.PI * 2) / 12 - 0.06); g.stroke();
    }
    g.restore();
    // counter-rotating ticks
    g.save(); g.translate(cx, cy); g.rotate(-t * 0.8); g.strokeStyle = col + '88'; g.lineWidth = 2;
    for (let k = 0; k < 36; k++) { const a = (k / 36) * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * W * 0.33, Math.sin(a) * W * 0.33); g.lineTo(Math.cos(a) * W * (k % 3 ? 0.35 : 0.37), Math.sin(a) * W * (k % 3 ? 0.35 : 0.37)); g.stroke(); }
    g.restore();
    // the watch mark, pulsing
    const s = W * 0.5 * (1 + 0.04 * Math.sin(t * 5)) * (state.done ? 1 + Math.min(0.25, ((now - state.doneAt) / 1000) * 0.8) : 1);
    g.save(); g.shadowColor = col; g.shadowBlur = 20 + 14 * Math.sin(t * 5);
    if (mark.complete && mark.naturalWidth) g.drawImage(mark, cx - s / 2, cy - s / 2, s, s);
    else { g.fillStyle = col; g.beginPath(); g.moveTo(cx - s * 0.3, cy - s * 0.35); g.lineTo(cx + s * 0.3, cy - s * 0.35); g.lineTo(cx, cy); g.lineTo(cx + s * 0.3, cy + s * 0.35); g.lineTo(cx - s * 0.3, cy + s * 0.35); g.lineTo(cx, cy); g.closePath(); g.fill(); }
    g.restore();
    // sparks orbiting
    for (let k = 0; k < 6; k++) {
      const a = t * 2.2 + (k * Math.PI) / 3, r = W * 0.4;
      g.fillStyle = '#ffffff'; g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6 + k);
      g.fillRect(cx + Math.cos(a) * r - 2, cy + Math.sin(a) * r - 2, 4, 4);
      g.globalAlpha = 1;
    }
    if (state.done && now - state.doneAt < 500) { g.fillStyle = 'rgba(255,255,255,' + (0.5 - (now - state.doneAt) / 1000) + ')'; g.fillRect(0, 0, W, H); }
  };
  raf = requestAnimationFrame(frame);
  return () => { stopped = true; cancelAnimationFrame(raf); };
}
// ---------------- the browser tab: OMNI logo, and a progress ring + percentage while updating ----------------
const TAB_TITLE = document.title || 'OMNI';
const tabMark = new Image();
tabMark.src = 'assets/logo-classic.png';
function tabIcon(p, label) {
  try {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.append(link); }
    if (p == null) { link.href = 'assets/logo-classic.png'; document.title = label || TAB_TITLE; return; }
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#06120a'; g.beginPath(); g.arc(32, 32, 31, 0, 7); g.fill();
    if (tabMark.complete && tabMark.naturalWidth) g.drawImage(tabMark, 12, 12, 40, 40);
    g.strokeStyle = '#8dff5a'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.arc(32, 32, 27, -Math.PI / 2, -Math.PI / 2 + Math.max(0.05, p) * Math.PI * 2); g.stroke();
    link.href = c.toDataURL('image/png');
    document.title = label || '⬇ ' + Math.round(p * 100) + '% · Actualizando OMNI';
  } catch (e) {}
}
function fmtKB(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
async function runUpdate(v) {
  if (updBusy) return;
  updBusy = true;
  const mode = updMode(), from = curVersion() || '?';
  let el = document.getElementById('updscreen');
  if (!el) { el = document.createElement('div'); el.id = 'updscreen'; $('#game').append(el); }
  el.innerHTML =
    '<div class="updwrap"><canvas width="220" height="220"></canvas><h2>OMNI</h2><p class="updver">ACTUALIZANDO · v' + from + ' <b>→</b> v' + v.version + '</p>' +
    '<div class="updbar"><i></i></div><p class="updfile">Conectando…</p>' +
    (v.notes && v.notes.length ? '<ul>' + v.notes.slice(0, 5).map((n) => '<li>' + n + '</li>').join('') + '</ul>' : '') + '</div>';
  el.classList.remove('hidden');
  const state = { p: 0, done: false, doneT: 0 };
  const stopLogo = updLogo(el.querySelector('canvas'), state);
  tabIcon(0);
  playWatchSFX('activate');
  const bar = el.querySelector('.updbar i'), lab = el.querySelector('.updfile');
  const files = (v.files && v.files.length ? v.files : [['game.js', 600000]]).slice();
  const total = files.reduce((a, f) => a + (f[1] || 1), 0);
  let got = 0;
  try {
    for (const [name, size] of files) {
      lab.textContent = 'Descargando ' + name + ' · ' + fmtKB(size);
      // same URL the game will load after the restart, refreshed in the browser cache
      const r = await fetch(OMNI_REMOTE + name, { cache: 'reload' });
      if (!r.ok) throw new Error(name);
      if (r.body && r.body.getReader) {
        const rd = r.body.getReader();
        let n = 0;
        for (;;) {
          const { done, value } = await rd.read();
          if (done) break;
          n += value.length;
          state.p = Math.min(1, (got + Math.min(n, size || n)) / total);
          bar.style.width = (state.p * 100).toFixed(1) + '%';
          tabIcon(state.p);
        }
      } else await r.arrayBuffer();
      got += size || 1;
      state.p = got / total;
      bar.style.width = (state.p * 100).toFixed(1) + '%';
    }
  } catch (e) {
    lab.textContent = 'Sin conexión · se intentará más tarde';
    tabIcon(null);
    playWatchSFX('error');
    setTimeout(() => { el.classList.add('hidden'); stopLogo(); updBusy = false; }, 2200);
    return;
  }
  state.done = true;
  state.doneAt = performance.now();
  lab.textContent = '¡Listo! Reiniciando OMNI…';
  tabIcon(1, '✔ OMNI ' + v.version + ' · reiniciando…');
  bar.style.width = '100%';
  playWatchSFX('recharged');
  try {
    if (mode === 'app') localStorage.setItem('omni-remote', String(v.build));
    localStorage.setItem('omni-updated', JSON.stringify({ from, to: v.version, build: v.build, notes: v.notes || [] }));
  } catch (e) {}
  setTimeout(() => location.reload(), 1300);
}
// ---------------- after the restart: what's new ----------------
function updWelcome() {
  let u = null;
  try { u = JSON.parse(localStorage.getItem('omni-updated') || 'null'); } catch (e) {}
  if (!u || !(OMNI_BUILD >= u.build)) return;
  try { localStorage.removeItem('omni-updated'); } catch (e) {}
  const c = document.createElement('div');
  c.id = 'updwelcome';
  c.innerHTML = '<canvas width="120" height="120"></canvas><div><b>¡ACTUALIZADO A v' + u.to + '!</b><small>desde v' + u.from + '</small>' +
    (u.notes && u.notes.length ? '<ul>' + u.notes.slice(0, 5).map((n) => '<li>' + n + '</li>').join('') + '</ul>' : '') + '<button>¡A JUGAR!</button></div>';
  $('#game').append(c);
  tabIcon(1, '✔ OMNI ' + u.to);
  setTimeout(() => tabIcon(null), 6000);
  const st = { p: 1, done: false };
  updLogo(c.querySelector('canvas'), st); // stops by itself once the card is removed
  c.querySelector('button').onclick = () => c.remove();
  setTimeout(() => c.remove(), 15000);
}
setTimeout(updWelcome, 900);
setTimeout(updateCheck, 1500);
// show the version that is actually running (the menu text lives in the installed page)
if (window.OMNI_REMOTE_ON)
  fetch(OMNI_REMOTE + 'version.json?t=' + Date.now(), { cache: 'no-store' }).then((r) => r.json()).then((v) => {
    const e = $('#menu .eyebrow');
    if (e && v.version) e.textContent = e.textContent.replace(/\d+\.\d+(\.\d+)?/, v.version);
  }).catch(() => {});
setInterval(updateCheck, 10 * 60 * 1000);
// ============================================================================================
// OMNI PRIMING + SIDE DIAL (0.17)
//  · while the dial is open the hero reaches for the watch in the world: 3 hand-made frames per skin
//    (tools/import_prime.py → assets/prime.webp). Frame 3 (glowing watch) holds until the transformation lands.
//  · the dial opens as a side panel (the game stays visible behind it), on the side the hero is NOT facing so the
//    priming arm is never covered. Pause → AJUSTES → DIAL switches back to full screen.
// ============================================================================================
function primeInfo(k) {
  const P = window.OMNI_PRIME;
  return { table: P.table[k], sheet: art.prime, anchors: P.anchors[k], base: P.table[k][0][3] };
}
let primeHold = 0; // after the confirm, keep the glowing frame while the transform sequence plays
function primePose() {
  if (race !== 'omni' || player.alien || !window.OMNI_PRIME || !art.prime || !(player.skin >= 0 && player.skin <= 2)) return null;
  if (player.jump > 0 || player.motion || player.leap) return null;
  let f = -1;
  if (sel && sel.mode === 'transform') {
    const t = (performance.now() - sel.opened) / 1000;
    f = t < 0.12 ? 0 : t < 0.26 ? 1 : 2;
    primeHold = performance.now() + 2500;
  } else if (seqBusy() && performance.now() < primeHold) f = 2;
  else primeHold = 0;
  return f < 0 ? null : { row: 30 + player.skin, f, lift: 0 };
}
// ---------------- mini dial: the watch face (your art) opens on the transform button with its era's dial ----------------
//  OS  Prototype   black silhouette in a green diamond window on the face
//  AF  Recalibrated  hologram of the alien rising out of the core in a beam of light
//  UA  Ultimatrix / Albedo  glowing ring of alien slots around the core, the chosen one at the top
//  OV  Completed   holographic ring of icons orbiting the face
const MINI_W = 260, MINI_H = 300, FCX = 130, FCY = 196, FR = 50; // logical size (drawn at 2x), face centre/radius
const MINI_TYPES = ['ring', 'strip', 'slider', 'wheel']; // Biomnitrix (dual) / Predator keep their full selector
const MINI_STYLE = { prototype: 'os', recalibrated: 'af', ultimatrix: 'ua', albedo: 'ua', completed: 'ov' };
const MINI_ICON = { os: 'os-silhouette', af: 'af-hologram', ua: 'af-hologram', ov: 'ov-icon' };
function miniDial(s) {
  return !!s && dialDocked() && MINI_TYPES.includes(s.w.selector.type);
}
const miniWrap = (i, n) => ((i % n) + n) % n;
function miniFace(g, w, cx, cy, r, glow) {
  const id = w.id === 'albedo' ? 'ultimatrix' : w.id;
  g.save();
  g.shadowColor = w.color; g.shadowBlur = 8 + glow * 16;
  g.beginPath(); g.arc(cx, cy, r * 1.08, 0, 7); g.fillStyle = '#05090a'; g.fill();
  g.shadowBlur = 0;
  g.imageSmoothingEnabled = true;
  const body = id === 'recalibrated' ? wlGet(id, 'body') : null, core = wlGet(id, 'core');
  if (body) { // the recalibrated art is the whole watch: show its round face
    const S = (r * 2) / 0.5;
    g.save(); g.beginPath(); g.arc(cx, cy, r * 1.06, 0, 7); g.clip();
    g.drawImage(body, cx - S / 2, cy - (S * body.height) / body.width / 2, S, (S * body.height) / body.width);
    g.restore();
  } else if (core) {
    const img = w.id === 'albedo' ? tintedCore(core, '#ff2a2a', 'albedo') : core;
    g.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  } else {
    g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fillStyle = '#10171a'; g.fill();
    symbol(g, w.shape, cx, cy, r * 0.45, w.color);
  }
  // switched ON: the art lights up (additive pass) and a pulsing halo breathes around it
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 260), art2 = body || core;
  if (art2) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.28 + 0.18 * pulse;
    g.beginPath(); g.arc(cx, cy, r * 1.06, 0, 7); g.clip();
    if (body) { const S = (r * 2) / 0.5; g.drawImage(body, cx - S / 2, cy - (S * body.height) / body.width / 2, S, (S * body.height) / body.width); }
    else g.drawImage(w.id === 'albedo' ? tintedCore(core, '#ff2a2a', 'albedo') : core, cx - r, cy - r, r * 2, r * 2);
    const lg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    lg.addColorStop(0, w.color + '88'); lg.addColorStop(1, w.color + '00');
    g.fillStyle = lg; g.fillRect(cx - r, cy - r, r * 2, r * 2);
    g.restore();
  }
  g.save(); g.shadowColor = w.color; g.shadowBlur = 18 + 14 * pulse;
  g.lineWidth = 2.5; g.strokeStyle = w.color; g.globalAlpha = 0.75 + 0.25 * pulse;
  g.beginPath(); g.arc(cx, cy, r * 1.08, 0, 7); g.stroke();
  g.restore();
  g.restore();
}
function miniDraw(g, s, now) {
  const w = s.w, col = w.color || '#7dff9a', n = s.list.length, st = MINI_STYLE[w.id] || 'ov', icon = MINI_ICON[st],
    boot = Math.min(1, (now - s.opened) / 300), e = 1 - Math.pow(1 - boot, 3),
    open = Math.min(1, Math.max(0, ((now - s.opened) / 1000 - 0.12) / 0.3)), // the dial UI unfolds after the face
    cur = n ? miniWrap(Math.round(s.pos), n) : 0;
  if (!n) return;
  g.save();
  g.globalAlpha = e;
  g.translate(FCX, FCY); g.scale(0.6 + 0.4 * e, 0.6 + 0.4 * e); g.translate(-FCX, -FCY);
  if (st === 'af') { // ---- hologram out of the core
    const beam = g.createLinearGradient(0, FCY - 10, 0, 30);
    beam.addColorStop(0, col + 'aa'); beam.addColorStop(1, col + '00');
    g.save(); g.globalAlpha = e * open * 0.55; g.fillStyle = beam;
    g.beginPath(); g.moveTo(FCX - FR * 0.45, FCY - FR * 0.3); g.lineTo(FCX + FR * 0.45, FCY - FR * 0.3); g.lineTo(FCX + 64, 36); g.lineTo(FCX - 64, 36); g.closePath(); g.fill(); g.restore();
    miniFace(g, w, FCX, FCY, FR, 0.6);
    for (let k = -1; k <= 1; k++) {
      const i = Math.floor(s.pos) + k, d = i - s.pos;
      if (Math.abs(d) > 1.3) continue;
      const fl = 0.85 + 0.15 * Math.sin(now / 60 + k);
      drawWatchIcon(g, s.list[miniWrap(i, n)], icon, FCX + d * 70, 92 + Math.abs(d) * 14, 104 - Math.min(1, Math.abs(d)) * 54, open * fl * (1 - Math.abs(d) * 0.6));
    }
  } else if (st === 'os') { // ---- silhouette in a diamond window
    miniFace(g, w, FCX, FCY, FR * 1.25, 0.5);
    const D = FR * 1.05 * open;
    if (D > 2) {
      g.save();
      g.beginPath(); g.moveTo(FCX, FCY - D); g.lineTo(FCX + D * 0.8, FCY); g.lineTo(FCX, FCY + D); g.lineTo(FCX - D * 0.8, FCY); g.closePath();
      g.fillStyle = '#9be36b'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#0a0f0b'; g.stroke();
      g.clip();
      g.fillStyle = 'rgba(40,90,30,.25)'; for (let y = FCY - D; y < FCY + D; y += 3) g.fillRect(FCX - D, y, D * 2, 1);
      for (let k = -1; k <= 1; k++) {
        const i = Math.floor(s.pos) + k, d = i - s.pos;
        if (Math.abs(d) > 1.2) continue;
        drawWatchIcon(g, s.list[miniWrap(i, n)], icon, FCX + d * D * 1.5, FCY + 4, D * 1.6, 1);
      }
      g.restore();
    }
  } else { // ---- ring of aliens around the core (UA: glowing band with slots · OV: orbiting icons)
    const RR = st === 'ua' ? 84 : 86, slots = Math.min(8, Math.max(n, 3)), step = (Math.PI * 2) / slots;
    if (st === 'ua') {
      g.save(); g.globalAlpha = e * open * 0.5; g.lineWidth = 34; g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 18;
      g.beginPath(); g.arc(FCX, FCY, RR, 0, 7); g.stroke(); g.restore();
      g.save(); g.globalAlpha = e * open * 0.8; g.lineWidth = 1.5; g.strokeStyle = '#eaffd0';
      g.beginPath(); g.arc(FCX, FCY, RR - 17, 0, 7); g.stroke(); g.beginPath(); g.arc(FCX, FCY, RR + 17, 0, 7); g.stroke(); g.restore();
    } else {
      g.save(); g.globalAlpha = e * open * 0.7; g.lineWidth = 1.5; g.strokeStyle = col; g.setLineDash([6, 5]); g.lineDashOffset = -now / 40;
      g.beginPath(); g.arc(FCX, FCY, RR, 0, 7); g.stroke(); g.restore();
    }
    for (let k = -Math.floor(slots / 2); k <= Math.floor(slots / 2); k++) {
      if (k === Math.floor(slots / 2) && slots % 2 === 0) continue;
      const i = Math.floor(s.pos) + k, d = i - s.pos, a = -Math.PI / 2 + d * step * open;
      const x = FCX + Math.cos(a) * RR, y = FCY + Math.sin(a) * RR, top = Math.max(0, 1 - Math.abs(d)), sz = 26 + top * 18;
      if (top > 0.01 && st === 'ua') { // highlighted slot at the top
        g.save(); g.globalAlpha = e * open * top; g.fillStyle = '#d9ffb0'; g.strokeStyle = '#0a1a06'; g.lineWidth = 2;
        g.fillRect(x - sz * 0.62, y - sz * 0.62, sz * 1.24, sz * 1.24); g.strokeRect(x - sz * 0.62, y - sz * 0.62, sz * 1.24, sz * 1.24); g.restore();
      }
      drawWatchIcon(g, s.list[miniWrap(i, n)], icon, x, y, sz, e * open * (0.45 + 0.55 * top));
    }
    miniFace(g, w, FCX, FCY, FR, 0.5 + 0.5 * open);
  }
  // left / right arrows beside the face
  if (n > 1) {
    g.fillStyle = col; g.globalAlpha = e * 0.9;
    const ay = st === 'af' ? 92 : FCY, ax = st === 'af' ? 120 : (st === 'os' ? FR * 1.45 : 112);
    for (const sx of [-1, 1]) { const x = FCX + sx * ax; g.beginPath(); g.moveTo(x + sx * 8, ay); g.lineTo(x - sx * 3, ay - 9); g.lineTo(x - sx * 3, ay + 9); g.closePath(); g.fill(); }
  }
  g.restore();
  // name
  const name = ALIENS[s.list[cur]].name.toUpperCase();
  g.font = 'bold 12px Arial';
  const tw = g.measureText(name).width + 22, ny = st === 'af' ? 158 : 18;
  g.globalAlpha = e; g.fillStyle = 'rgba(2,8,5,.88)'; g.fillRect(FCX - tw / 2, ny - 13, tw, 18);
  g.strokeStyle = col; g.lineWidth = 1; g.strokeRect(FCX - tw / 2 + 0.5, ny - 12.5, tw - 1, 17);
  g.fillStyle = '#eaf6ea'; g.textAlign = 'center'; g.fillText(name, FCX, ny + 1);
  if (s.mode === 'swap') { g.font = 'bold 7px Arial'; g.fillStyle = col; g.fillText('CAMBIO RÁPIDO', FCX, ny - 17); }
  g.globalAlpha = 1;
}
function miniDown(e) {
  const [x, y] = selPoint(e);
  sel.press = { x, y, ox: x, moved: false };
  try { $('#watchsel').setPointerCapture(e.pointerId); } catch (er) {}
}
function miniMove(e) {
  const [x] = selPoint(e), p = sel.press;
  if (Math.abs(x - p.ox) > 26) { selMove(x < p.ox ? 1 : -1); p.ox = x; p.moved = true; } // drag to turn the dial
}
function miniUp(e) {
  const s = sel, p = s.press;
  s.press = null;
  if (!p || p.moved || !s.interactive) return;
  const [x, y] = selPoint(e), st = MINI_STYLE[s.w.id] || 'ov', d = Math.hypot(x - FCX, y - FCY);
  if (d < FR * 1.1) return selConfirm(true); // press the core (where the transform button is) to transform
  if (st === 'af' && y < 170 && Math.abs(x - FCX) < 40) return selConfirm(true); // tap the hologram
  if (st === 'ua' || st === 'ov') { // tap an alien on the ring
    if (d > 60 && d < 112) {
      const slots = Math.min(8, Math.max(s.list.length, 3)), a = Math.atan2(y - FCY, x - FCX) + Math.PI / 2,
        k = Math.round((((a + Math.PI) % (Math.PI * 2)) - Math.PI) / ((Math.PI * 2) / slots));
      return k === 0 ? selConfirm(true) : selGoto(miniWrap(Math.round(s.target) + k, s.list.length) === miniWrap(Math.round(s.target), s.list.length) ? Math.round(s.target) : Math.round(s.target) + k);
    }
  }
  if (d > 125) return selCancel();
  selMove(x < FCX ? -1 : 1);
}
// put the dial on the transform button
function miniPlace() {
  const c = $('#watchsel'), t = $('#transform'), gm = $('#game');
  if (!c || !t || !gm) return;
  const gr = gm.getBoundingClientRect(), tr = t.getBoundingClientRect(), k = gr.width / (gm.offsetWidth || gr.width);
  if (!tr.width) return;
  let cx = (tr.left + tr.width / 2 - gr.left) / k, cy = (tr.top + tr.height / 2 - gr.top) / k;
  const H = gm.offsetHeight || 540;
  cy = Math.min(cy, H - (MINI_H - FCY) + 8); // keep the ring on screen
  c.style.setProperty('left', cx - FCX + 'px', 'important');
  c.style.setProperty('top', cy - FCY + 'px', 'important');
}
// ---------------- side dial ----------------
function dialDocked() {
  try { return localStorage.getItem('omni-dialdock') !== '0'; } catch (e) { return true; }
}
function dialDockSet(on) {
  try { localStorage.setItem('omni-dialdock', on ? '1' : '0'); } catch (e) {}
  dialDockApply();
}
let dockSide = 'right';
function dialDockApply() {
  const g = $('#game');
  if (!g) return;
  const on = !!sel && miniDial(sel);
  if (sel && !sel.dockSide) sel.dockSide = player.face < 0 ? 'right' : 'left'; // the side the hero is NOT facing
  g.classList.toggle('dock', on);
  const c = $('#watchsel');
  if (on) miniPlace();
  else if (c) { c.style.removeProperty('left'); c.style.removeProperty('top'); }
}
setInterval(() => { try { dialDockApply(); } catch (e) {} }, 100);
// ============================================================================================
// OMNI NEW ZONES ART (0.18) · the Coastal Nuclear Plant and the Null Void are painted in code (no external art), once,
// into 1600 × 1040 canvases (the extra 140 px is the strip under the floor that every scene has). Night and day
// versions are cached separately. A hand-painted file can replace either: assets/bg-plant.webp / assets/bg-void.webp.
// ============================================================================================
const PAINTED = {};
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function paintedScene(kind, day) {
  const key = kind + (day ? 'd' : 'n');
  if (PAINTED[key]) return PAINTED[key];
  const c = document.createElement('canvas');
  c.width = 1600;
  c.height = 1040;
  const g = c.getContext('2d');
  if (kind === 'plant') paintPlant(g, day);
  else paintVoid(g, day);
  return (PAINTED[key] = c);
}
function paintPlant(g, day) {
  const R = seeded(1337);
  // sky
  const sky = g.createLinearGradient(0, 0, 0, 560);
  if (day) { sky.addColorStop(0, '#7fa9c9'); sky.addColorStop(0.7, '#d9c9a4'); sky.addColorStop(1, '#e8b98a'); }
  else { sky.addColorStop(0, '#0b1424'); sky.addColorStop(0.65, '#23304a'); sky.addColorStop(1, '#4a3b4a'); }
  g.fillStyle = sky;
  g.fillRect(0, 0, 1600, 600);
  if (!day) for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.3 + R() * 0.6) + ')'; g.fillRect(R() * 1600, R() * 300, 2, 2); }
  // distant city
  g.fillStyle = day ? '#8b98a6' : '#1a2234';
  for (let x = 0; x < 1600; x += 40 + R() * 50) { const h = 40 + R() * 110; g.fillRect(x, 470 - h, 34 + R() * 30, h + 90); }
  // cooling towers (hyperbolic) with steam
  const tower = (cx, w, h, base) => {
    const top = base - h;
    const tg = g.createLinearGradient(cx - w, 0, cx + w, 0);
    tg.addColorStop(0, day ? '#9aa1a4' : '#3b4250'); tg.addColorStop(0.45, day ? '#e2e4df' : '#6b7383'); tg.addColorStop(1, day ? '#8e9599' : '#2c3240');
    g.fillStyle = tg;
    g.beginPath();
    g.moveTo(cx - w, base);
    g.quadraticCurveTo(cx - w * 0.52, base - h * 0.55, cx - w * 0.62, top);
    g.lineTo(cx + w * 0.62, top);
    g.quadraticCurveTo(cx + w * 0.52, base - h * 0.55, cx + w, base);
    g.closePath();
    g.fill();
    g.strokeStyle = day ? '#7a8084' : '#22283a'; g.lineWidth = 3; g.stroke();
    g.fillStyle = day ? 'rgba(120,30,30,.75)' : 'rgba(170,60,60,.6)';
    g.fillRect(cx - w * 0.6, top + 18, w * 1.2, 10);
    for (let k = 0; k < 9; k++) {
      g.fillStyle = day ? 'rgba(250,250,250,' + (0.55 - k * 0.05) + ')' : 'rgba(160,175,190,' + (0.45 - k * 0.04) + ')';
      g.beginPath(); g.arc(cx + (k - 2) * 26 + R() * 20, top - 20 - k * 30, 34 + k * 9, 0, 7); g.fill();
    }
  };
  tower(260, 150, 330, 560);
  tower(1340, 140, 300, 560);
  // reactor building + dome
  g.fillStyle = day ? '#b9b6aa' : '#3c3f4a';
  g.fillRect(560, 330, 480, 230);
  g.fillStyle = day ? '#d3d0c3' : '#4c5060';
  g.beginPath(); g.ellipse(800, 335, 170, 120, 0, Math.PI, 0); g.fill();
  g.strokeStyle = day ? '#8f8c80' : '#262935'; g.lineWidth = 4; g.stroke();
  for (let i = 0; i < 6; i++) { g.fillStyle = day ? '#5d7d8e' : (R() < 0.6 ? '#e6d47a' : '#1c2230'); g.fillRect(590 + i * 76, 380, 46, 30); g.fillRect(590 + i * 76, 450, 46, 30); }
  // radiation sign on the dome
  g.save(); g.translate(800, 290); g.fillStyle = '#f2c230'; g.beginPath(); g.arc(0, 0, 46, 0, 7); g.fill();
  g.fillStyle = '#1b1b1b';
  for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 40, (k * 2 * Math.PI) / 3 - 0.5, (k * 2 * Math.PI) / 3 + 0.5); g.closePath(); g.fill(); }
  g.fillStyle = '#f2c230'; g.beginPath(); g.arc(0, 0, 11, 0, 7); g.fill(); g.fillStyle = '#1b1b1b'; g.beginPath(); g.arc(0, 0, 7, 0, 7); g.fill();
  g.restore();
  // back wall with pipes
  g.fillStyle = day ? '#8c8a80' : '#2a2c35';
  g.fillRect(0, 470, 1600, 100);
  for (let p = 0; p < 3; p++) {
    g.fillStyle = ['#7d6a4a', '#5b7a6a', '#8a5048'][p];
    g.fillRect(0, 490 + p * 22, 1600, 12);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 491 + p * 22, 1600, 3);
    for (let x = 60; x < 1600; x += 180) { g.fillStyle = '#2b2b2b'; g.fillRect(x + p * 30, 487 + p * 22, 10, 18); }
  }
  // hazard stripe along the wall foot
  for (let x = 0; x < 1600; x += 40) { g.fillStyle = (x / 40) % 2 ? '#1d1d1d' : '#e2b22a'; g.beginPath(); g.moveTo(x, 570); g.lineTo(x + 40, 570); g.lineTo(x + 20, 586); g.lineTo(x - 20, 586); g.closePath(); g.fill(); }
  // concrete floor
  const fl = g.createLinearGradient(0, 586, 0, 1040);
  fl.addColorStop(0, day ? '#a8a69c' : '#3e4049'); fl.addColorStop(1, day ? '#87857c' : '#25262d');
  g.fillStyle = fl; g.fillRect(0, 586, 1600, 454);
  g.strokeStyle = day ? 'rgba(0,0,0,.12)' : 'rgba(0,0,0,.35)'; g.lineWidth = 2;
  for (let y = 640; y < 1040; y += 70) { g.beginPath(); g.moveTo(0, y); g.lineTo(1600, y); g.stroke(); }
  for (let x = 0; x < 1600; x += 160) { g.beginPath(); g.moveTo(x, 586); g.lineTo(x - 60, 1040); g.stroke(); }
  // yellow floor lane
  g.fillStyle = day ? 'rgba(226,178,42,.75)' : 'rgba(226,178,42,.45)';
  g.fillRect(0, 846, 1600, 8);
  // glowing waste puddles + barrels
  for (const [x, y] of [[180, 820], [1480, 760], [640, 900], [1120, 930]]) {
    const pg = g.createRadialGradient(x, y, 4, x, y, 70);
    pg.addColorStop(0, 'rgba(160,255,80,.75)'); pg.addColorStop(1, 'rgba(160,255,80,0)');
    g.fillStyle = pg; g.beginPath(); g.ellipse(x, y, 80, 24, 0, 0, 7); g.fill();
  }
  for (const [x, y] of [[110, 640], [150, 660], [1500, 650], [1460, 672], [1540, 690]]) {
    g.fillStyle = '#c7a12b'; g.fillRect(x - 18, y - 46, 36, 46);
    g.fillStyle = '#1d1d1d'; g.fillRect(x - 18, y - 34, 36, 5); g.fillRect(x - 18, y - 16, 36, 5);
    g.fillStyle = '#aaff55'; g.beginPath(); g.ellipse(x, y - 46, 18, 5, 0, 0, 7); g.fill();
  }
  if (!day) { g.fillStyle = 'rgba(10,20,40,.18)'; g.fillRect(0, 0, 1600, 1040); }
}
function paintVoid(g, day) {
  const R = seeded(4242);
  const sky = g.createLinearGradient(0, 0, 0, 640);
  sky.addColorStop(0, '#05010d'); sky.addColorStop(0.5, day ? '#2a1150' : '#1a0a35'); sky.addColorStop(1, day ? '#4b2378' : '#2f1555');
  g.fillStyle = sky; g.fillRect(0, 0, 1600, 640);
  for (let i = 0; i < 220; i++) { g.fillStyle = 'rgba(' + (200 + R() * 55) + ',' + (180 + R() * 75) + ',255,' + (0.3 + R() * 0.7) + ')'; const s = R() < 0.1 ? 3 : 1.5; g.fillRect(R() * 1600, R() * 600, s, s); }
  // swirling vortex
  g.save(); g.translate(800, 230);
  for (let k = 0; k < 14; k++) {
    g.strokeStyle = 'rgba(' + (150 + k * 6) + ',' + (90 + k * 8) + ',255,' + (0.35 - k * 0.02) + ')';
    g.lineWidth = 10 - k * 0.5;
    g.beginPath(); g.ellipse(0, 0, 40 + k * 32, 14 + k * 11, -0.25, k * 0.6, k * 0.6 + 4.2); g.stroke();
  }
  const core = g.createRadialGradient(0, 0, 2, 0, 0, 70);
  core.addColorStop(0, '#ffffff'); core.addColorStop(0.3, '#c9a7ff'); core.addColorStop(1, 'rgba(120,60,220,0)');
  g.fillStyle = core; g.beginPath(); g.arc(0, 0, 70, 0, 7); g.fill();
  g.restore();
  // floating rock islands in the distance
  const rock = (x, y, w, h, col) => {
    g.fillStyle = col;
    g.beginPath(); g.moveTo(x - w, y);
    for (let i = 0; i <= 8; i++) g.lineTo(x - w + (i * w) / 4, y - (i % 2 ? 8 : 0) - R() * 6);
    g.lineTo(x + w * 0.4, y + h * 0.6); g.lineTo(x, y + h); g.lineTo(x - w * 0.5, y + h * 0.5); g.closePath(); g.fill();
    g.fillStyle = 'rgba(190,140,255,.35)'; g.fillRect(x - w, y - 4, w * 2, 4);
  };
  rock(220, 260, 110, 120, '#24163a'); rock(1380, 200, 90, 100, '#2a1a44'); rock(520, 420, 70, 70, '#1d1230'); rock(1140, 400, 80, 90, '#21143a');
  // chains hanging from nowhere
  g.strokeStyle = '#5a4e70'; g.lineWidth = 4;
  for (const x of [360, 1240]) for (let y = 0; y < 470; y += 22) { g.beginPath(); g.ellipse(x + Math.sin(y / 60) * 6, y, 6, 10, 0, 0, 7); g.stroke(); }
  // the floating platform (floor)
  const fl = g.createLinearGradient(0, 560, 0, 1040);
  fl.addColorStop(0, '#3a2a55'); fl.addColorStop(0.3, '#2a1d40'); fl.addColorStop(1, '#140c22');
  g.fillStyle = fl;
  g.beginPath(); g.moveTo(0, 590);
  for (let x = 0; x <= 1600; x += 80) g.lineTo(x, 580 + R() * 18);
  g.lineTo(1600, 1040); g.lineTo(0, 1040); g.closePath(); g.fill();
  // glowing cracks
  g.strokeStyle = 'rgba(200,140,255,.8)'; g.lineWidth = 2; g.shadowColor = '#b27bff'; g.shadowBlur = 10;
  for (let i = 0; i < 16; i++) {
    let x = R() * 1600, y = 620 + R() * 380;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += (R() - 0.5) * 80; y += R() * 30; g.lineTo(x, y); }
    g.stroke();
  }
  g.shadowBlur = 0;
  // crystals
  for (const [x, y, s] of [[120, 640, 1], [260, 700, 0.7], [1470, 630, 1.1], [1360, 690, 0.6], [80, 900, 0.8], [1530, 920, 0.9]]) {
    g.fillStyle = 'rgba(170,110,255,.85)';
    g.beginPath(); g.moveTo(x, y - 70 * s); g.lineTo(x + 16 * s, y - 10 * s); g.lineTo(x, y); g.lineTo(x - 16 * s, y - 10 * s); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.moveTo(x, y - 70 * s); g.lineTo(x + 5 * s, y - 20 * s); g.lineTo(x, y - 8 * s); g.closePath(); g.fill();
  }
  // edge glow where the platform meets the void
  const eg = g.createLinearGradient(0, 570, 0, 610);
  eg.addColorStop(0, 'rgba(200,150,255,0)'); eg.addColorStop(0.5, 'rgba(200,150,255,.5)'); eg.addColorStop(1, 'rgba(200,150,255,0)');
  g.fillStyle = eg; g.fillRect(0, 570, 1600, 40);
}
// ============================================================================================
// OMNI SAGA 01 · "ECOS DEL VACÍO" (0.18) — the long story mission: how you got Ghostfreak and the Osmosian acid.
//  1  Agent Vera (Plumber) at the Lighthouse Docks: ghost-energy readings at the Coastal Nuclear Plant (→ east)
//  2  The plant is overrun: defeat 5 irradiated drones
//  3  Seal the 3 reactor valves (E) — every valve wakes more drones
//  4  The reactor tears a rift to the NULL VOID; a spectral prisoner escapes through it (cinematic) → portal opens (↑)
//  5  Null Void: defeat 4 void wardens, then free Draven, an Osmosian prisoner → he gives you OSMOSIAN ACID
//  6  The Spectre attacks (boss: phases through attacks, teleports, rings of void bolts). Beat it and the watch scans
//     its DNA → GHOSTFREAK (Omnitrix races). Back to Vera for the reward.
// Osmosian acid: Osmosians get the ACID absorption form (anywhere, poison attacks); every race gets corrosive hits
// (15% of hits poison the enemy). State: player.saga = { step, kills, valves, wardens, done }.
// ============================================================================================
const SAGA_ZONE_DOCKS = 5, SAGA_ZONE_PLANT = 13, SAGA_ZONE_VOID = 14;
const VERA = { x: 1260, y: 735, name: 'AGENTE VEGA' };
const DRAVEN = { x: 1250, y: 700, name: 'DRAVEN' };
const VALVES = [{ x: 330, y: 610 }, { x: 800, y: 600 }, { x: 1270, y: 610 }];
const SAGA_STEPS = [
  ['', ''],
  ['Lecturas fantasma', 'Ve a la Central nuclear costera (Muelles → este)'],
  ['Central en alerta', 'Derrota drones irradiados'],
  ['Sella el reactor', 'Cierra las 3 válvulas (E)'],
  ['La grieta', 'Entra en el Vacío Nulo (↑ en la Central)'],
  ['Prisioneros del Vacío', 'Derrota a los carceleros y libera a Draven'],
  ['El Espectro', 'Derrota al Espectro'],
  ['Regreso', 'Vuelve con el Agente Vega en los Muelles'],
];
function SG() {
  const s = (player.saga = player.saga && typeof player.saga === 'object' ? player.saga : {});
  s.step = s.step | 0; s.kills = s.kills | 0; s.wardens = s.wardens | 0;
  if (!Array.isArray(s.valves)) s.valves = [false, false, false];
  return s;
}
const sagaActive = () => SG().step > 0 && SG().step < 8;
// Ghostfreak becomes a story reward. Saves that already reached its old unlock level keep it.
const GF_LEVEL = (alienInfo('ghostfreak') && alienInfo('ghostfreak').unlockLevel) || 0;
if (ALIEN_DB.ghostfreak) { ALIEN_DB.ghostfreak.unlockLevel = 0; ALIEN_DB.ghostfreak.story = true; }
let sagaProfile = null;
function sagaInit() {
  if (sagaProfile === player) return;
  sagaProfile = player;
  const s = SG();
  player.alienUnlocks = player.alienUnlocks || {};
  if (s.step < 8 && player.alienUnlocks.ghostfreak !== true) player.alienUnlocks.ghostfreak = GF_LEVEL && player.level >= GF_LEVEL ? true : false;
  sagaLinks();
  if (player.acid) refreshAcid();
}
function sagaLinks() {
  const P = REGIONS[SAGA_ZONE_PLANT];
  if (!P) return;
  if (SG().step >= 4) P.links.up = SAGA_ZONE_VOID;
  else delete P.links.up;
}
function sagaGo(step, msg) {
  const s = SG();
  s.step = step;
  sagaLinks();
  if (msg) toast(msg);
  playWatchSFX('confirm');
  hud();
  save();
}
// ---------------- cinematics: letterbox, speaker + typed line, screen effects. Tap / Enter to continue ----------------
let sagaCineOn = false;
function sagaCine(lines, done) {
  let el = document.getElementById('sagacine');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sagacine';
    el.innerHTML = '<i class="bar top"></i><i class="bar bot"></i><div class="cap"><b></b><p></p><small>Toca o pulsa ENTER</small></div>';
    $('#game').append(el);
  }
  sagaCineOn = true;
  closeDialog();
  el.classList.remove('hidden');
  let i = -1, typing = null;
  const who = el.querySelector('b'), txt = el.querySelector('p');
  const next = () => {
    if (typing) { clearInterval(typing); typing = null; txt.textContent = lines[i].t; return; }
    i++;
    if (i >= lines.length) {
      el.classList.add('hidden');
      el.onclick = null;
      sagaCineOn = false;
      document.removeEventListener('keydown', key, true);
      last = performance.now();
      if (done) done();
      return;
    }
    const L = lines[i];
    who.textContent = L.w || '';
    who.style.color = L.c || '#c9ff89';
    txt.textContent = '';
    let k = 0;
    typing = setInterval(() => { k += 2; txt.textContent = L.t.slice(0, k); if (k >= L.t.length) { clearInterval(typing); typing = null; } }, 22);
    if (L.fx === 'shake') { shake = 0.6; tone(90, 0.4, 'sawtooth'); }
    if (L.fx === 'flash') { el.classList.remove('flash', 'riftfx'); void el.offsetWidth; el.classList.add('flash'); playWatchSFX('transform'); }
    if (L.fx === 'alarm') { for (let n = 0; n < 3; n++) setTimeout(() => tone(880, 0.18, 'square', 0.04), n * 300); }
    if (L.fx === 'rift') { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash', 'riftfx'); burst(800, 560, 60, '#b98cff'); shake = 0.5; }
    if (L.fx === 'scan') playWatchSFX('scan_start');
  };
  const key = (e) => {
    if (!sagaCineOn) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    if (e.type === 'keydown' && !e.repeat && ['Enter', ' ', 'e', 'E', 'Escape'].includes(e.key)) next();
  };
  document.addEventListener('keydown', key, true);
  el.onclick = next;
  next();
}
// ---------------- story beats ----------------
function sagaTalkVera() {
  const s = SG();
  if (s.step === 0) {
    if (player.level < 4) return showDialog('AGENTE VEGA · FONTANEROS', 'Todavía no', '<p>«Estoy siguiendo una señal muy rara. Vuelve cuando tengas más experiencia.»</p><p class="reward">Nivel recomendado: 4</p>', [['VALE', closeDialog]]);
    return sagaCine([
      { w: 'AGENTE VEGA', c: '#8de5f3', t: 'Eh, tú. El del reloj. Soy el agente Vega, de los Fontaneros.' },
      { w: 'AGENTE VEGA', c: '#8de5f3', t: 'Hace una hora la Central nuclear costera empezó a emitir energía fantasma. No es radiación normal.' },
      { w: 'AGENTE VEGA', c: '#8de5f3', t: 'Los drones de seguridad se han vuelto locos y algo intenta abrir una puerta… hacia el Vacío Nulo.' },
      { w: 'TÚ', t: 'El Vacío Nulo… ¿la prisión dimensional?' },
      { w: 'AGENTE VEGA', c: '#8de5f3', t: 'Exacto. Si esa puerta se abre, todo lo que hay dentro saldrá. La Central está al este de estos muelles. Date prisa.' },
    ], () => { SG().kills = 0; sagaGo(1, 'HISTORIA · Ecos del Vacío · Ve a la Central nuclear (este de los Muelles)'); });
  }
  if (s.step === 7) {
    return sagaCine([
      { w: 'AGENTE VEGA', c: '#8de5f3', t: '¡Has vuelto! La Central está estable y la grieta se ha cerrado sola.' },
      { w: 'AGENTE VEGA', c: '#8de5f3', t: 'Y ese ADN fantasma en tu reloj… cuídalo. Lo que hay en el Vacío no siempre se queda allí.' },
      { w: 'AGENTE VEGA', c: '#8de5f3', t: 'Los Fontaneros te deben una. Toma esto, te lo has ganado.' },
    ], () => {
      const s2 = SG();
      s2.step = 8;
      s2.done = true;
      xp(1200);
      player.coins = (player.coins || 0) + 300;
      statEvent('mission', { id: 'saga1' });
      toast('¡HISTORIA COMPLETADA! Ecos del Vacío · +1200 EXP · +300 monedas · El Vacío Nulo sigue abierto para explorar');
      playWatchSFX('recharged');
      hud();
      save();
    });
  }
  if (s.step >= 8) return story3Talk(); // Historia 03 (part-45)
  const st = SAGA_STEPS[Math.min(7, s.step)] || ['', ''];
  showDialog('AGENTE VEGA · FONTANEROS', s.step >= 8 ? 'Gracias otra vez' : st[0], s.step >= 8 ? '<p>«El Vacío Nulo sigue abierto desde la Central. Los carceleros vuelven a aparecer: buen sitio para entrenar.»</p>' : '<p>«' + st[1] + '. Te espero aquí.»</p>', [['VALE', closeDialog]]);
}
function sagaEnterZone() {
  const s = SG();
  if (zone === SAGA_ZONE_PLANT && s.step === 1) {
    sagaCine([
      { w: 'SISTEMA DE LA CENTRAL', c: '#ffcf76', t: '¡ALERTA! Contención del reactor al 34 %. Drones de seguridad: comportamiento hostil.', fx: 'alarm' },
      { w: 'TÚ', t: 'Esos drones brillan en verde… están irradiados. Primero ellos, luego el reactor.' },
    ], () => sagaGo(2, 'Derrota 5 drones irradiados'));
  }
  if (zone === SAGA_ZONE_VOID && s.step === 4) {
    sagaCine([
      { w: 'VACÍO NULO', c: '#b98cff', t: 'No hay suelo, ni cielo, ni tiempo. Solo rocas flotando sobre la nada.', fx: 'flash' },
      { w: '???', c: '#d7b762', t: '¡Eh! ¡Aquí! Los carceleros me tienen encadenado…' },
      { w: 'DRAVEN', c: '#d7b762', t: 'Soy osmosiano. Quítame de encima a esos guardias y te daré algo que he guardado todo este tiempo.' },
    ], () => sagaGo(5, 'Derrota 4 carceleros del Vacío'));
  }
}
function sagaValve(i) {
  const s = SG();
  if (s.valves[i]) return;
  s.valves[i] = true;
  burst(VALVES[i].x, VALVES[i].y - 30, 30, '#c9ff89');
  tone(520, 0.2, 'square');
  const n = s.valves.filter(Boolean).length;
  toast('Válvula ' + n + ' / 3 sellada');
  if (net.role !== 'guest')
    for (let k = 0; k < 2; k++) { // the reactor wakes more drones
      const x = clamp(VALVES[i].x + (k ? 260 : -260), 120, 1480), y = 740 + k * 50;
      enemies.push({ id: 200 + i * 2 + k, x, y, homeX: x, homeY: y, face: -1, hp: 180, max: 180, sagaKind: 'rad', kind: 'enemy', rcd: 1.5, cast: 0, stun: 0, alive: true, respawn: 1e9, cd: 1, wind: 0, anim: 0, hit: 0, moving: false, temp: true });
    }
  if (n >= 3) setTimeout(() => sagaCine([
    { w: 'SISTEMA DE LA CENTRAL', c: '#ffcf76', t: 'Contención restaurada… ERROR. Pico de energía no identificada en el núcleo.', fx: 'alarm' },
    { w: '', t: 'El aire se rasga como una tela. Una grieta violeta se abre sobre el reactor.', fx: 'rift' },
    { w: '???', c: '#c9a7ff', t: 'Por fin… un portal. Y un portador del Omnitrix… qué ADN tan… interesante.', fx: 'shake' },
    { w: '', t: 'Una figura espectral cruza la grieta y desaparece en el Vacío.' },
    { w: 'TÚ', t: 'Si algo ha salido de ahí… voy a tener que entrar a buscarlo.' },
  ], () => sagaGo(4, '¡Se ha abierto un portal al Vacío Nulo! (↑ en el centro de la Central)')), 600);
  save();
}
function sagaFreeDraven() {
  sagaCine([
    { w: 'DRAVEN', c: '#d7b762', t: 'Libre… gracias. Llevo aquí desde antes de que nacieras, chaval.' },
    { w: 'DRAVEN', c: '#d7b762', t: 'Toma: ácido osmosiano. Un frasco de lo que absorbí de las paredes de esta prisión. Corroe casi cualquier cosa.' },
    { w: '', t: 'Has conseguido: ÁCIDO OSMOSIANO.', c: '#c9ff89', fx: 'flash' },
    { w: 'DRAVEN', c: '#d7b762', t: 'Y ten cuidado. Lo que salió por la grieta ha vuelto… y viene a por tu reloj.', fx: 'shake' },
  ], () => {
    player.acid = true;
    refreshAcid();
    toast(race === 'osmo' ? 'ÁCIDO OSMOSIANO · nueva absorción: FORMA ÁCIDA' : 'ÁCIDO OSMOSIANO · tus golpes corroen (15 % de veneno)');
    sagaGo(6);
    sagaSpawnSpectre();
  });
}
function sagaSpawnSpectre() {
  if (net.role === 'guest' || zone !== SAGA_ZONE_VOID || enemies.some((e) => e.sagaKind === 'specter' && e.alive)) return;
  const hp = 2600;
  enemies.push({ id: 95, x: 1100, y: 720, homeX: 1100, homeY: 720, face: -1, hp, max: hp, boss: true, sagaKind: 'specter', kind: 'enemy', rcd: 1.2, cast: 0, stun: 0, alive: true, respawn: 1e9, cd: 1, wind: 0, anim: 0, hit: 0, moving: false, tp: 4, ring: 3, intangible: 0 });
  toast('¡EL ESPECTRO ataca!');
  playWatchSFX('warning');
}
function sagaSpectreDown() {
  const omni = race === 'omni';
  sagaCine([
    { w: 'EL ESPECTRO', c: '#c9a7ff', t: 'Imposible… mi esencia… se… dispersa…', fx: 'shake' },
    ...(omni
      ? [{ w: 'OMNITRIX', c: '#c9ff89', t: 'ADN desconocido detectado. Escaneando… muestra adquirida.', fx: 'scan' }, { w: '', c: '#c9ff89', t: 'NUEVO ALIEN: GHOSTFREAK. Ya está en tu dial.', fx: 'flash' }]
      : [{ w: '', c: '#c9ff89', t: 'La esencia del Espectro se desvanece en el Vacío. La grieta empieza a cerrarse tras de ti.', fx: 'flash' }]),
    { w: 'TÚ', t: 'Hora de volver con Vega.' },
  ], () => {
    if (omni) { grantAlien('ghostfreak'); ensureSelection(); playWatchSFX('dna_added'); }
    xp(500);
    sagaGo(7, 'Vuelve con el Agente Vega en los Muelles');
  });
}
// ---------------- hooks from the core game ----------------
function sagaKill(e) { // damageEnemy (part-08), host side
  const s = SG();
  if (e.temp || e.sagaKind === 'specter') e.respawn = 1e9;
  if (zone === SAGA_ZONE_PLANT && s.step === 2 && e.sagaKind === 'rad') {
    s.kills++;
    if (s.kills >= 5) sagaGo(3, '¡Drones neutralizados! Sella las 3 válvulas del reactor (E)');
    else hud();
  }
  if (zone === SAGA_ZONE_VOID && s.step === 5 && e.sagaKind === 'void') {
    s.wardens++;
    if (s.wardens >= 4) toast('¡Carceleros derrotados! Libera a Draven (E)');
    hud();
  }
  if (e.sagaKind === 'specter' && s.step === 6 && !e.rush) sagaSpectreDown();
}
function sagaAcid(e) { // corrosive hits once you own the acid
  if (player.acid && e.alive && Math.random() < 0.15) applyStatus(e, 'poison', 3, 3 * multiplier());
}
function sagaNear() {
  const s = SG();
  if (zone === SAGA_ZONE_DOCKS && dist(player, VERA) < 130) return ['◆ HABLAR CON VEGA', sagaTalkVera];
  if (zone === SAGA_ZONE_PLANT && s.step === 3) {
    const i = VALVES.findIndex((v, k) => !s.valves[k] && dist(player, v) < 115);
    if (i >= 0) return ['◆ SELLAR VÁLVULA', () => sagaValve(i)];
  }
  if (zone === SAGA_ZONE_VOID && s.step === 5 && dist(player, DRAVEN) < 130)
    return s.wardens >= 4 ? ['◆ LIBERAR A DRAVEN', sagaFreeDraven] : ['◆ DRAVEN', () => toast('Derrota a los carceleros primero · ' + s.wardens + ' / 4')];
  return null;
}
function sagaInteract() {
  if (!started) return false;
  const n = sagaNear();
  if (!n) return false;
  n[1]();
  return true;
}
let sagaLastNear = '', sagaZoneSeen = -1;
function sagaTick(dt) {
  sagaInit();
  const s = SG();
  if (zone !== sagaZoneSeen) { sagaZoneSeen = zone; if (!dun.on) setTimeout(sagaEnterZone, 500); }
  // dress the zone's enemies
  if (zone === SAGA_ZONE_PLANT || zone === SAGA_ZONE_VOID)
    for (const e of enemies)
      if (!e.sagaKind && !e.elite && !e.twin) {
        e.sagaKind = zone === SAGA_ZONE_PLANT ? 'rad' : e.boss && e.max > 1000 ? 'specter' : 'void';
        if (net.role !== 'guest' && e.sagaKind !== 'specter') e.hp = e.max = Math.round((zone === SAGA_ZONE_PLANT ? 180 : 280) * (1 + player.level * 0.04)); // the host owns enemy health
      }
  if (zone === SAGA_ZONE_VOID && s.step === 6 && !dun.on && net.role !== 'guest' && !enemies.some((e) => e.sagaKind === 'specter' && e.alive)) sagaSpawnSpectre();
  // the Spectre: phases out, teleports next to you, fires rings of void bolts
  if (net.role !== 'guest')
    for (const e of enemies) {
      if (e.sagaKind !== 'specter' || !e.alive) continue;
      e.intangible = Math.max(0, (e.intangible || 0) - dt);
      e.tp -= dt;
      e.ring -= dt;
      if (e.tp <= 0) {
        e.tp = 5 + Math.random() * 2;
        e.intangible = 1.1;
        burst(e.x, e.y - 60, 20, '#b98cff');
        const side = Math.random() < 0.5 ? -1 : 1;
        e.x = clamp(player.x + side * 220, region().minX + 60, region().maxX - 60);
        e.y = clamp(player.y + (Math.random() - 0.5) * 80, region().top + 20, region().bottom - 20);
        burst(e.x, e.y - 60, 20, '#b98cff');
      }
      if (e.ring <= 0) {
        e.ring = e.hp < e.max / 2 ? 2.6 : 3.6;
        const n = e.hp < e.max / 2 ? 12 : 8;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2;
          hostileShots.push({ type: 'void', x: e.x, y: e.y - 60, dx: Math.cos(a) * 210, dy: Math.sin(a) * 210, t: 2.4, damage: 11, r: 9 });
        }
      }
    }
  // interaction button
  const near = sagaNear(), lab = near ? near[0] : '';
  if (lab !== sagaLastNear) { sagaLastNear = lab; hud(); }
}
function sagaHud() { // called at the end of hud() (part-11)
  const n = sagaNear();
  if (n) { $('#talk').classList.remove('hidden'); $('#talk').textContent = n[0]; }
  const s = SG();
  if (!sagaActive() || activeMission() || [6, 8, 9, 10, 12].includes(zone)) return;
  if (zone === 1 && quest.state !== 'done' && ![SAGA_ZONE_PLANT, SAGA_ZONE_VOID].includes(zone)) return;
  const st = SAGA_STEPS[s.step];
  $('#mission .tiny').textContent = 'HISTORIA · ECOS DEL VACÍO';
  $('#questtext').textContent = st[0];
  $('#questsub').textContent =
    s.step === 2 ? st[1] + ' · ' + Math.min(5, s.kills) + ' / 5'
      : s.step === 3 ? st[1] + ' · ' + s.valves.filter(Boolean).length + ' / 3'
        : s.step === 5 ? (s.wardens >= 4 ? 'Libera a Draven (E)' : 'Carceleros · ' + Math.min(4, s.wardens) + ' / 4')
          : st[1];
}
function sagaMenu() {
  const s = SG(), st = SAGA_STEPS[Math.min(7, s.step)];
  showDialog(
    'HISTORIA 02 · ECOS DEL VACÍO',
    s.step >= 8 ? 'Completada' : s.step === 0 ? 'Sin empezar' : 'Paso ' + s.step + ' / 7',
    s.step === 0
      ? '<p>Habla con el <b>Agente Vega</b> en los <b>Muelles del faro</b> (nivel 4+). Una misión larga: la Central nuclear, el Vacío Nulo, un prisionero osmosiano… y algo espectral.</p><p class="reward">Recompensas: Ghostfreak · Ácido osmosiano · 1700 EXP · 300 monedas</p>'
      : s.step >= 8
        ? '<p>Ghostfreak y el ácido osmosiano son tuyos. El Vacío Nulo sigue abierto (↑ en la Central nuclear) con carceleros para entrenar.</p>'
        : '<p><b>' + st[0] + '</b><br>' + st[1] + '.</p><p>Muelles del faro → salida este → Central nuclear costera' + (s.step >= 4 ? ' → portal ↑ → Vacío Nulo' : '') + '.</p>',
    [['VOLVER', pauseMenu]],
  );
}
// ---------------- drawing ----------------
function sagaDraw() { // ground objects + story NPCs (before the actors)
  const s = SG();
  if (zone === SAGA_ZONE_DOCKS) {
    sprite(22, Math.floor(clock) % 6 === 0 ? 3 : 0, VERA.x, VERA.y, 104, player.x >= VERA.x ? 1 : -1);
    txt(VERA.name, VERA.x, VERA.y - 120, 10, '#8de5f3');
    if (s.step === 0 || s.step === 7 || (s.step >= 8 && [0, 4].includes(F1().s3.step))) txt('!', VERA.x, VERA.y - 138, 18, '#ffcf76');
  }
  if (zone === SAGA_ZONE_PLANT) {
    VALVES.forEach((v, i) => {
      const on = s.valves[i];
      ctx.fillStyle = '#2b2f36'; ctx.fillRect(v.x - 26, v.y - 60, 52, 60);
      ctx.fillStyle = on ? '#6fd36f' : s.step === 3 ? (Math.floor(clock * 4) % 2 ? '#ff5a4a' : '#7a2a22') : '#555';
      ctx.fillRect(v.x - 20, v.y - 54, 40, 8);
      ctx.save(); ctx.translate(v.x, v.y - 28); ctx.rotate(on ? 0 : clock * 2);
      ctx.strokeStyle = '#d9a43a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.moveTo(0, -14); ctx.lineTo(0, 14); ctx.stroke();
      ctx.restore();
      if (s.step === 3 && !on) txt('VÁLVULA', v.x, v.y - 70, 8, '#ffcf76');
    });
    if (s.step >= 4) { // the rift over the reactor
      const y = floorBounds(800).top + 15;
      ctx.save();
      ctx.globalAlpha = 0.75 + 0.2 * Math.sin(clock * 3);
      const gr = ctx.createRadialGradient(800, y - 60, 5, 800, y - 60, 90);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, '#c9a7ff'); gr.addColorStop(1, 'rgba(120,60,220,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(800, y - 60, 60, 95, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
  }
  if (zone === SAGA_ZONE_VOID && s.step <= 5) { // Draven in chains
    sprite(14, 0, DRAVEN.x, DRAVEN.y, 100, -1);
    ctx.strokeStyle = '#8b7fa6'; ctx.lineWidth = 3;
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(DRAVEN.x + sx * 22, DRAVEN.y - 60); ctx.lineTo(DRAVEN.x + sx * 70, DRAVEN.y - 150); ctx.stroke(); }
    txt(DRAVEN.name + ' · OSMOSIANO', DRAVEN.x, DRAVEN.y - 116, 9, '#d7b762');
    if (s.step === 5 && s.wardens >= 4) txt('!', DRAVEN.x, DRAVEN.y - 134, 18, '#ffcf76');
  }
}
function sagaDrawEnemy(e, f) {
  const k = e.sagaKind;
  if (k === 'specter') {
    const row = ALIENS.ghostfreak ? ALIENS.ghostfreak.row : 2;
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(clock * 5);
    const gr = ctx.createRadialGradient(e.x, e.y - 80, 5, e.x, e.y - 80, 110);
    gr.addColorStop(0, '#b98cff'); gr.addColorStop(1, 'rgba(120,60,220,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(e.x, e.y - 80, 110, 0, 7); ctx.fill();
    ctx.restore();
    sprite(row, f, e.x, e.y - 10 - Math.sin(clock * 2) * 8, 168, e.face, e.intangible > 0 ? 0.3 : e.hit > 0 ? 0.55 : 0.85);
    const by = e.y - 200;
    txt('EL ESPECTRO', e.x, by - 8, 10, '#d9c2ff');
    ctx.fillStyle = '#101522'; ctx.fillRect(e.x - 60, by, 120, 7);
    ctx.fillStyle = '#b98cff'; ctx.fillRect(e.x - 60, by, 120 * Math.max(0, e.hp / e.max), 7);
    return;
  }
  const col = k === 'rad' ? '#9dff4d' : '#b98cff';
  ctx.save();
  ctx.globalAlpha = 0.28 + 0.12 * Math.sin(clock * 6 + e.id);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(e.x, e.y - 50, 40, 58, 0, 0, 7); ctx.fill();
  ctx.restore();
  sprite(2, f, e.x, e.y, k === 'void' ? 104 : 98, e.face, e.hit > 0 ? 0.5 : k === 'void' ? 0.8 : 1);
  const by = e.y - 112;
  txt(k === 'rad' ? 'DRON IRRADIADO' : 'CARCELERO DEL VACÍO', e.x, by - 6, 8, col);
  ctx.fillStyle = '#101522'; ctx.fillRect(e.x - 24, by, 48, 5);
  ctx.fillStyle = col; ctx.fillRect(e.x - 24, by, 48 * Math.max(0, e.hp / e.max), 5);
  if (e.wind > 0) txt('!', e.x, e.y - 127, 18, '#ffaaa0');
}
// ---------------- Osmosian acid form ----------------
function refreshAcid() {
  if (!OSMO_FORMS.acid) {
    OSMO_FORMS.acid = { name: 'Ácido osmosiano', hp: 230, color: '#a8ff3c' };
    OSMO_SKILLS.acid = [
      makeSkill('Salpicadura ácida', 'ÁCIDO', 19, 0.7),
      makeSkill('Abanico corrosivo', 'ABANICO', 14, 3.5, 15),
      makeSkill('Charco tóxico', 'CHARCO', 30, 7, 40),
      makeSkill('Lluvia ácida', 'LLUVIA', 14, 12, 75),
      { ...makeSkill('Golpe absorbente', 'ABSORBENTE', 34, 5), points: 3 },
      { ...makeSkill('Resonancia material', 'RESONANCIA', 58, 12), points: 3 },
    ];
  }
}
function acidAttack(i, a, d, target) { // osmoAttack (part-02) for the acid form, skills 0-3
  const spitA = (ang) => { shoot('toxin', ang, d, 430); const p = projectiles.at(-1); p.r = 12; p.t = 1.5; p.poisonDamage = 4 * multiplier(); };
  if (i === 0) spitA(a);
  if (i === 1) for (let n = -2; n <= 2; n++) spitA(a + n * 0.16);
  if (i === 2) {
    castArea('resonance', player.x, player.y, 150, d, 0.6, '#a8ff3c');
    for (const e of combatants()) if (e.alive && dist(player, e) < 150) applyStatus(e, 'poison', 5, 5 * multiplier());
  }
  if (i === 3) effects.push({ type: 'rain', x: target?.x || player.x, y: target?.y || player.y, r: 160, t: 2.5, max: 2.5, tick: 0, pulses: 0, damage: d, color: '#a8ff3c' });
}
refreshAcid(); // the acid form exists from boot (saves can be in it); it is only usable once player.acid
// ============================================================================================
// OMNI 0.18 · CODEX SCANNING + LOW GRAPHICS
//  SCAN  stand near an enemy type you haven't scanned yet and press B (or the ESCANEAR button): hold still in range for
//        1.5 s while the watch scans. The entry goes into the codex BESTIARY (Pause → Extras → Códice) with its notes,
//        weak points and how many you've beaten. First scan of each type: +40 EXP · +15 coins.
//  GFX   Pause → Ajustes → GRÁFICOS: AUTO (old phones get LOW automatically) / ALTOS / BAJOS. Low: no glow blur,
//        fewer particles, one background pass, 30 fps drawing (the game itself still runs at full speed).
// ============================================================================================
const BEASTS = {
  dron: ['Dron invasor', 'Patrulla de Vilgax. Dispara energía verde cada pocos segundos.', 'Esquiva sus disparos lentos y ataca de cerca.', 'Bosque, ciudad'],
  cabecilla: ['Cabecilla', 'El dron que dirige al grupo. Más vida y golpes más fuertes.', 'Acaba primero con los demás.', 'Refugio de Max'],
  caballero: ['Caballero de la Orden', 'Guerreros con armadura; unos atacan cuerpo a cuerpo y otros a distancia.', 'Aliens fuertes rompen su guardia.', 'Fortaleza, Salón'],
  elite: ['Dron de élite', 'Dron blindado de las misiones del tablón.', 'Usa ataques de área y no te quedes quieto.', 'Varias zonas'],
  jefe: ['Jefe ígneo', 'Criatura de fuego que aparece cada cierto tiempo.', 'Aliens de hielo y agua lo frenan.', 'Bosque'],
  robot: ['Robot de Vilgax', 'Máquina de guerra de la Historia 01.', 'Golpea cuando recarga su cañón.', 'Zona devastada'],
  irradiado: ['Dron irradiado', 'Drones de seguridad de la Central, alterados por la energía fantasma.', 'Brillan antes de atacar: aléjate.', 'Central nuclear'],
  carcelero: ['Carcelero del Vacío', 'Guardianes de la prisión dimensional. Más duros que un dron.', 'El veneno y el ácido les hacen mucho daño.', 'Vacío Nulo'],
  espectro: ['El Espectro', 'Ser fantasmal escapado del Vacío. Se vuelve intangible y se teletransporta.', 'Ataca justo después de que reaparezca; esquiva sus anillos.', 'Vacío Nulo'],
};
function beastType(e) {
  if (!e || e.dummy) return null;
  if (e.sagaKind === 'specter') return 'espectro';
  if (e.sagaKind === 'rad') return 'irradiado';
  if (e.sagaKind === 'void') return 'carcelero';
  if (e.robotBoss) return 'robot';
  if (e.majorBoss) return 'jefe';
  if (e.knight) return 'caballero';
  if (e.elite) return 'elite';
  if (e.boss) return 'cabecilla';
  if (e.kind === 'enemy' || !e.kind) return 'dron';
  return null;
}
function BX() {
  const b = (player.bestiary = player.bestiary && typeof player.bestiary === 'object' ? player.bestiary : {});
  return b;
}
function bestiaryKill(e) {
  const t = beastType(e);
  if (!t) return;
  const b = BX();
  b[t] = b[t] || { scanned: false, kills: 0 };
  b[t].kills++;
}
let scan = null; // { e, t, type }
function scanCandidate() {
  if (!started || sel || dialogOpen || player.downed) return null;
  const b = BX();
  let best = null, bd = 300;
  for (const e of enemies) {
    if (!e.alive) continue;
    const t = beastType(e);
    if (!t || (b[t] && b[t].scanned)) continue;
    const d = dist(player, e);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function scanStart() {
  if (scan) return;
  const e = scanCandidate();
  if (!e) return toast('Nada nuevo que escanear cerca');
  scan = { e, t: 0, type: beastType(e) };
  playWatchSFX('scan_start');
}
let scanBtn = null, scanShown = false;
function scanTick(dt) {
  if (lowGfx() && particles.length > 50) particles.splice(0, particles.length - 50);
  if (!scanBtn) {
    scanBtn = document.createElement('button');
    scanBtn.id = 'scanbtn';
    scanBtn.className = 'talk hidden';
    scanBtn.onclick = scanStart;
    $('#game').append(scanBtn);
  }
  const c = scanCandidate(), show = !!c && !scan;
  if (show !== scanShown) { scanShown = show; scanBtn.classList.toggle('hidden', !show); }
  if (show) scanBtn.textContent = '◎ ESCANEAR · B';
  if (!scan) return;
  const e = scan.e;
  if (!e.alive || dist(player, e) > 340 || zone !== scan.zone && scan.zone != null) { scan = null; toast('Escaneo interrumpido'); return; }
  scan.zone = zone;
  scan.t += dt;
  if (scan.t >= 1.5) {
    const b = BX(), t = scan.type, B = BEASTS[t];
    b[t] = b[t] || { scanned: false, kills: 0 };
    if (!b[t].scanned) {
      b[t].scanned = true;
      xp(40);
      player.coins = (player.coins || 0) + 15;
      toast('ESCANEO COMPLETO · ' + B[0] + ' añadido al códice · +40 EXP · +15 monedas');
      playWatchSFX('dna_added');
      burst(e.x, e.y - 60, 24, '#8de5f3');
      save();
    }
    scan = null;
  }
}
function scanDrawMark(e) { // over each enemy: progress ring while scanning, a small "?" if never scanned
  modDraw(e); // elite labels (part-46)
  f3DrawEnemyLabel(e); // zone bosses (part-47)
  if (scan && scan.e === e) {
    const p = Math.min(1, scan.t / 1.5), y = e.y - 60;
    ctx.save();
    ctx.strokeStyle = '#8de5f3'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(e.x, y, 54, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#8de5f3';
    ctx.fillRect(e.x - 50, y - 60 + ((clock * 140) % 120), 100, 3);
    ctx.restore();
    txt('ESCANEANDO ' + Math.floor(p * 100) + '%', e.x, e.y + 22, 8, '#8de5f3');
  } else {
    const t = beastType(e), b = BX();
    if (t && !(b[t] && b[t].scanned) && dist(player, e) < 300) txt('?', e.x + 30, e.y - 100, 12, '#8de5f3');
  }
}
document.addEventListener('keydown', (e) => {
  if (e.repeat || !e.key || e.key.toLowerCase() !== 'b' || !started || sel || dialogOpen || sagaCineOn) return;
  scanStart();
});
function bestiaryMenu(back) {
  const b = BX(), ids = Object.keys(BEASTS), have = ids.filter((t) => b[t] && b[t].scanned).length;
  showDialog(
    'CÓDICE · BESTIARIO',
    have + ' / ' + ids.length + ' escaneados',
    '<p>Acércate a un enemigo nuevo (marcado con <b>?</b>) y pulsa <b>B</b> o <b>ESCANEAR</b>.</p><div class="codex">' +
      ids.map((t) => {
        const s = b[t] && b[t].scanned, B = BEASTS[t];
        return '<button class="cx' + (s ? '' : ' locked') + '" data-beast="' + t + '" style="--c:#8de5f3"><b>' + (s ? B[0] : '???') + '</b><small>' + (s ? 'Derrotados: ' + ((b[t] && b[t].kills) || 0) : B[3]) + '</small></button>';
      }).join('') +
      '</div>',
    [['ALIENS', () => codexMenu(back)], ['VOLVER', back || closeDialog]],
  );
  for (const btn of document.querySelectorAll('[data-beast]'))
    btn.onclick = () => {
      const t = btn.dataset.beast, s = b[t] && b[t].scanned, B = BEASTS[t];
      if (!s) return toast('Sin escanear · búscalo en: ' + B[3]);
      showDialog('BESTIARIO · ' + B[0].toUpperCase(), B[3], '<div class="cxcard" style="--c:#8de5f3"><p>' + B[1] + '</p><p><b>Consejo</b> ' + B[2] + '</p><p><b>Derrotados</b> ' + (b[t].kills || 0) + '</p></div>', [['BESTIARIO', () => bestiaryMenu(back)], ['VOLVER', back || closeDialog]]);
    };
}
// ---------------- low graphics ----------------
function gfxMode() {
  try { return localStorage.getItem('omni-gfx') || 'auto'; } catch (e) { return 'auto'; }
}
const GFX_AUTO_LOW = (() => {
  try {
    const n = navigator, mob = /Android|iPhone|iPad|Mobile/i.test(n.userAgent || '');
    return (n.deviceMemory && n.deviceMemory <= 3) || (mob && n.hardwareConcurrency && n.hardwareConcurrency <= 4);
  } catch (e) { return false; }
})();
let LOW = false;
function lowGfx() { return LOW; }
function gfxApply() {
  const m = gfxMode();
  LOW = m === 'low' || (m === 'auto' && !!GFX_AUTO_LOW);
  const g = $('#game');
  if (g) g.classList.toggle('lowgfx', LOW);
}
function gfxCycle() {
  const m = gfxMode(), next = m === 'auto' ? 'high' : m === 'high' ? 'low' : 'auto';
  try { localStorage.setItem('omni-gfx', next); } catch (e) {}
  gfxApply();
  toast('Gráficos: ' + gfxLabel() + (LOW ? ' · menos efectos, 30 fps' : ''));
}
function gfxLabel() {
  const m = gfxMode();
  return m === 'auto' ? 'AUTO (' + (GFX_AUTO_LOW ? 'BAJOS' : 'ALTOS') + ')' : m === 'low' ? 'BAJOS' : 'ALTOS';
}
// glow blur is the most expensive canvas effect on weak phones: switched off everywhere in LOW mode
(() => {
  try {
    const P = CanvasRenderingContext2D.prototype, d = Object.getOwnPropertyDescriptor(P, 'shadowBlur');
    if (d && d.set) Object.defineProperty(P, 'shadowBlur', { get: d.get, set(v) { d.set.call(this, LOW ? 0 : v); }, configurable: true });
  } catch (e) {}
})();
gfxApply();
let lowFrame = 0;
const drawThisFrame = () => !LOW || (lowFrame ^= 1) === 1;
// ============================================================================================
// OMNI 0.20 · INTERFACE THEMES + polish (www/themes.css)
//  · 4 looks: TECH (the Omnitrix-tech skin), CLEAN (minimal), COMIC (comic book), CONSOLE (Plumber HQ terminal).
//    Picked in Pause → Ajustes → INTERFAZ or on the title screen; saved per device. All follow the watch colour.
//  · pause menu in tabs · big LEVEL UP banner · animated logo on the title screen.
// ============================================================================================
const UI_THEMES = [
  ['tech', 'OMNITRIX TECH', 'Cristal negro, bordes de neón y hexágonos. El estilo clásico de OMNI.'],
  ['clean', 'LIMPIA', 'Mínima: barras finas y translúcidas, casi toda la pantalla es juego. Ideal en móvil.'],
  ['comic', 'CÓMIC', 'Viñetas color crema, tinta negra, puntos de trama y botones como explosiones.'],
  ['console', 'CONSOLA FONTANERO', 'Terminales del cuartel: texto mono, líneas de escaneo y botones [ ASÍ ].'],
];
function uiTheme() {
  try { const t = localStorage.getItem('omni-ui'); return UI_THEMES.some((x) => x[0] === t) ? t : 'tech'; } catch (e) { return 'tech'; }
}
function uiApply(t) {
  t = t || uiTheme();
  try { localStorage.setItem('omni-ui', t); } catch (e) {}
  const g = $('#game');
  if (g) g.dataset.ui = t;
}
function uiMenu(back) {
  const cur = uiTheme();
  showDialog(
    'INTERFAZ',
    'Elige el estilo de la pantalla',
    '<p>Cambia cómo se ven el HUD, los menús y la pantalla de título. Todos usan el color de tu reloj.</p><div class="uicards">' +
      UI_THEMES.map(([id, n, d]) => '<button data-ui="' + id + '" class="' + (id === cur ? 'on' : '') + '"><b>' + n + '</b><small>' + d + '</small></button>').join('') +
      '</div>',
    [['LISTO', back || closeDialog]],
  );
  for (const b of document.querySelectorAll('.uicards [data-ui]'))
    b.onclick = () => { uiApply(b.dataset.ui); playWatchSFX('select'); uiMenu(back); };
}
// ---------------- pause menu in tabs ----------------
let pauseTab = 0;
function pauseTabs() {
  const groups = [...document.querySelectorAll('#modal .pausewide .pgroup, #modal .pgroup')];
  if (groups.length < 2 || document.querySelector('#modal .ptabs')) return;
  const bar = document.createElement('div');
  bar.className = 'ptabs';
  groups.forEach((gr, i) => {
    const h = gr.querySelector('h4'), b = document.createElement('button');
    b.textContent = h ? h.textContent : 'MENÚ ' + (i + 1);
    if (h) h.style.display = 'none';
    b.onclick = () => { pauseTab = i; show(); playWatchSFX('scroll'); };
    bar.append(b);
  });
  groups[0].parentNode.insertBefore(bar, groups[0]);
  const show = () => {
    if (pauseTab >= groups.length) pauseTab = 0;
    groups.forEach((gr, i) => gr.classList.toggle('off', i !== pauseTab));
    [...bar.children].forEach((b, i) => b.classList.toggle('on', i === pauseTab));
  };
  show();
}
// Q / E or shoulder buttons switch tabs while the pause menu is open
document.addEventListener('keydown', (e) => {
  const bar = document.querySelector('#modal:not(.hidden) .ptabs');
  if (!bar || !['[', ']', 'PageUp', 'PageDown'].includes(e.key)) return;
  const n = bar.children.length;
  pauseTab = (pauseTab + (e.key === '[' || e.key === 'PageUp' ? n - 1 : 1)) % n;
  bar.children[pauseTab].click();
});
// ---------------- level up banner ----------------
function levelBanner(lv) {
  let el = document.getElementById('levelup');
  if (el) el.remove();
  el = document.createElement('div');
  el.id = 'levelup';
  el.innerHTML = '<i></i><b>¡NIVEL ' + lv + '!</b><small>ATAQUES MÁS FUERTES · +1 PUNTO DE ÁRBOL</small>';
  $('#game').append(el);
  setTimeout(() => el.remove(), 2300);
}
// ---------------- title screen logo ----------------
function menuLogo() {
  const menu = $('#menu');
  if (!menu || document.getElementById('menulogo') || typeof updLogo !== 'function') return;
  const c = document.createElement('canvas');
  c.id = 'menulogo';
  c.width = c.height = 220;
  menu.append(c);
  updLogo(c, { p: 1, done: false });
}
uiApply();
setTimeout(menuLogo, 300);
{
  const ub = document.getElementById('uibtn');
  if (ub) ub.onclick = () => uiMenu();
}
// ============================================================================================
// OMNI 0.21 · FEATURE BATCH 1
//   ULTRA METER   hits fill it; when full and your alien has an Ultimate form, U (or the ⚡ button) = 15 s Ultimate on
//                 ANY watch (the Ultimatrix keeps its own special as before)
//   UPGRADES      spend coins: up to 5 levels per alien, +8 % damage and +8 % health each (Pause → Reloj y aliens)
//   COMBO + RANK  hits within 2.5 s chain a combo, ranked D C B A S; B or better pays bonus EXP when it ends
//   DAILY REWARD  7-day login calendar (coins, EXP, DNA, a full Ultra on day 7)
//   PET DRONE     "Chispa" follows you, zaps nearby enemies and scavenges 2 coins per kill (toggle in Pause)
//   PHOTO MODE    freezes the game, hides the HUD, saves a picture of the scene
//   EMOTES        Z or 💬: quick messages / pings, shown above you and over Wi-Fi to your co-op partner
//   BOSS RUSH     five boss waves back to back in the Ruins, best time saved (Extras)
//   SAVE TRANSFER send your whole save to another device with a 5-letter code (Ajustes / Copia de seguridad)
//   STORY 03      "El Cazador de ADN": after Story 02, Agent Vega sends you after a DNA bounty hunter
// State: player.f1 = { ultra, upg{}, login{last, streak}, pet, rushBest, s3{step, found[], kills} }
// ============================================================================================
function F1() {
  const f = (player.f1 = player.f1 && typeof player.f1 === 'object' ? player.f1 : {});
  f.ultra = +f.ultra || 0;
  if (!f.upg || typeof f.upg !== 'object') f.upg = {};
  if (!f.login || typeof f.login !== 'object') f.login = { last: '', streak: 0 };
  if (f.pet === undefined) f.pet = true;
  if (!f.s3 || typeof f.s3 !== 'object') f.s3 = { step: 0, found: [false, false, false], kills: 0 };
  return f;
}
const dayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
// ---------------- alien upgrades ----------------
const UPG_MAX = 5, upgCost = (lv) => 120 + lv * 110;
function upgLevel(id) { return Math.min(UPG_MAX, F1().upg[id] | 0); }
function upgFor() { return race === 'omni' ? (player.alien ? player.activeAlien : null) : player.activeAlien; }
function upgDmg() { const id = upgFor(); return id ? 1 + upgLevel(id) * 0.08 : 1; }
function upgHP() { return race === 'omni' && player.alien ? 1 + upgLevel(player.activeAlien) * 0.08 : 1; }
function upgradeMenu(back) {
  const ids = race === 'omni' ? codexIds().filter((id) => alienUnlocked(id)) : [player.activeAlien].filter((id) => ALIENS[id]);
  showDialog(
    'MEJORAS DE ALIENS',
    (player.coins || 0) + ' monedas',
    '<p>Cada nivel: <b>+8 % daño</b> y <b>+8 % vida</b> para ese alien. Máximo ' + UPG_MAX + ' niveles.</p><div class="codex">' +
      ids.map((id) => {
        const lv = upgLevel(id), max = lv >= UPG_MAX;
        return '<button class="cx" data-upg="' + id + '" style="--c:' + (ALIENS[id].color || '#7dff9a') + '"><b>' + ALIENS[id].name + ' · ' + '★'.repeat(lv) + '☆'.repeat(UPG_MAX - lv) + '</b><small>' + (max ? 'MÁXIMO' : 'Mejorar: ' + upgCost(lv) + ' monedas') + '</small></button>';
      }).join('') + '</div>',
    [['VOLVER', back || pauseMenu]],
  );
  for (const b of document.querySelectorAll('[data-upg]'))
    b.onclick = () => {
      const id = b.dataset.upg, lv = upgLevel(id), c = upgCost(lv);
      if (lv >= UPG_MAX) return toast('Ya está al máximo');
      if ((player.coins || 0) < c) return toast('Te faltan ' + (c - (player.coins || 0)) + ' monedas'), playWatchSFX('error');
      player.coins -= c;
      F1().upg[id] = lv + 1;
      playWatchSFX('dna_added');
      toast(ALIENS[id].name + ' mejorado a nivel ' + (lv + 1));
      hud(); save();
      upgradeMenu(back);
    };
}
// ---------------- Ultra meter ----------------
let ultraT = 0;
const watchHasUlt = () => omniActive() && getWatch().specials && getWatch().specials.some((s) => s.id === 'ultimate');
function ultraReady() { return omniActive() && player.alien && !watchHasUlt() && F1().ultra >= 100 && !player.ultimate && !!ultForm(); }
function ultraFire() {
  if (!ultraReady()) {
    if (omniActive() && player.alien && !watchHasUlt() && !ultForm()) toast('Este alien no tiene forma Ultimate');
    else if (omniActive() && player.alien && F1().ultra < 100) toast('Medidor ULTRA al ' + Math.floor(F1().ultra) + ' %');
    return;
  }
  const ratio = player.hp / maxHP();
  player.ultimate = true;
  player.hp = clamp(ratio * maxHP(), 1, maxHP());
  F1().ultra = 0;
  ultraT = 15;
  flash = 0.35;
  burst(player.x, player.y - 60, 45, getWatch().color);
  playWatchSFX('ultimate.transform');
  toast('¡ULTRA! ' + ultForm().name.toUpperCase() + ' · 15 s');
  hud();
}
function ultraEnd() {
  ultraT = 0;
  if (!player.ultimate) return;
  const ratio = player.hp / maxHP();
  player.ultimate = false;
  player.hp = clamp(ratio * maxHP(), 1, maxHP());
  playWatchSFX('ultimate.revert');
  toast('Ultra terminado');
  hud();
}
// ---------------- combo + style rank ----------------
const combo = { n: 0, t: 0, best: 0 };
const RANKS = [[40, 'S', '#ffd84a'], [25, 'A', '#ff7a4a'], [12, 'B', '#c084ff'], [5, 'C', '#5fd3ff'], [0, 'D', '#9fb2b4']];
const rankOf = (n) => RANKS.find((r) => n >= r[0]);
let comboEl = null;
function comboShow() {
  if (!comboEl) { comboEl = document.createElement('div'); comboEl.id = 'combo'; $('#game').append(comboEl); }
  if (combo.n < 3) { comboEl.classList.add('hidden'); return; }
  const r = rankOf(combo.n);
  comboEl.classList.remove('hidden');
  comboEl.style.setProperty('--rk', r[2]);
  comboEl.innerHTML = '<b>' + r[1] + '</b><span>×' + combo.n + ' COMBO</span><i style="width:' + Math.max(0, (combo.t / 2.5) * 100) + '%"></i>';
}
function comboEnd() {
  const n = combo.n, r = rankOf(n);
  combo.n = 0;
  if (n >= 12) {
    const bonus = n * 3;
    xp(bonus);
    toast('Combo ×' + n + ' · rango ' + r[1] + ' · +' + bonus + ' EXP');
  }
  comboShow();
}
// ---------------- hooks from damageEnemy (part-08) ----------------
function featHit(e, dmg) {
  if (!(dmg > 0)) return;
  combo.n++;
  combo.t = 2.5;
  combo.best = Math.max(combo.best, combo.n);
  if (omniActive() && player.alien && !player.ultimate && !watchHasUlt()) F1().ultra = Math.min(100, F1().ultra + Math.min(6, dmg / 12));
  comboShow();
}
function featKill(e) {
  if (e.temp || e.rush) e.respawn = 1e9;
  if (F1().pet && started && dist(player, e) < 700) {
    player.coins = (player.coins || 0) + 2;
    popup(e.x + 20, e.y - 120, '+2 🪙', '#ffe27a');
  }
  if (e.hunter) s3HunterDown();
  if (zone === 6 && F1().s3.step === 2) { F1().s3.kills++; if (F1().s3.kills >= 6) s3Go(3); else hud(); }
}
// ---------------- daily reward ----------------
const DAILY = [['50 monedas', { coins: 50 }], ['150 EXP', { xp: 150 }], ['100 monedas', { coins: 100 }], ['ADN nuevo', { dna: true }], ['200 monedas', { coins: 200 }], ['300 EXP', { xp: 300 }], ['400 monedas + ULTRA lleno', { coins: 400, ultra: true }]];
function dailyLogin() {
  const L = F1().login, today = dayKey();
  if (L.last === today) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  L.streak = L.last === dayKey(y) ? (L.streak % 7) + 1 : 1;
  L.last = today;
  const [label, r] = DAILY[L.streak - 1];
  if (r.coins) player.coins = (player.coins || 0) + r.coins;
  if (r.xp) xp(r.xp);
  if (r.ultra) F1().ultra = 100;
  if (r.dna) {
    const locked = typeof CORE_ALIENS !== 'undefined' ? CORE_ALIENS.filter((id) => ALIENS[id] && alienInfo(id).implemented && !alienInfo(id).story && !alienUnlocked(id)) : [];
    if (locked.length && omniActive()) setTimeout(() => scanDNA(locked[Math.floor(Math.random() * locked.length)]), 1200);
    else player.coins = (player.coins || 0) + 150;
  }
  save();
  // a small card, not a menu: it never pauses the game (or a co-op partner)
  let c = document.getElementById('dailycard');
  if (c) c.remove();
  c = document.createElement('div');
  c.id = 'dailycard';
  c.innerHTML = '<b>RECOMPENSA DIARIA · DÍA ' + L.streak + ' / 7</b><span>' + label + '</span><div>' + DAILY.map((d, i) => '<i class="' + (i < L.streak ? 'got' : '') + '"></i>').join('') + '</div>';
  $('#game').append(c);
  setTimeout(() => c.remove(), 6500);
  playWatchSFX('recharged');
}
// ---------------- pet drone ----------------
const pet = { x: 0, y: 0, cd: 2, zap: null, ok: false };
function petTick(dt) {
  if (!F1().pet || !started) return;
  const tx = player.x - (player.face || 1) * 62, ty = player.y - 115 + Math.sin(clock * 3) * 6;
  if (!pet.ok || Math.abs(pet.x - tx) > 800) { pet.x = tx; pet.y = ty; pet.ok = true; }
  pet.x += (tx - pet.x) * Math.min(1, dt * 4);
  pet.y += (ty - pet.y) * Math.min(1, dt * 4);
  pet.cd -= dt;
  if (pet.zap) { pet.zap.t -= dt; if (pet.zap.t <= 0) pet.zap = null; }
  if (pet.cd <= 0 && !paused) {
    pet.cd = 2.5;
    let best = null, bd = 300;
    for (const e of enemies) if (e.alive && !e.intangible) { const d = Math.hypot(e.x - pet.x, e.y - 40 - pet.y); if (d < bd) { bd = d; best = e; } }
    if (best) {
      pet.zap = { x: best.x, y: best.y - 50, t: 0.18 };
      damageTarget(best, 6 * multiplier());
      tone(1300, 0.05, 'square', 0.015);
    }
  }
}
function petDraw() {
  if (!F1().pet || !started || !pet.ok) return;
  const c = petColor() || (omniActive() && getWatch().color) || '#8dff5a';
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(pet.x, player.y - 2, 14, 4, 0, 0, 7); ctx.fill();
  if (pet.zap) { ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.shadowColor = c; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(pet.x, pet.y); ctx.lineTo((pet.x + pet.zap.x) / 2 + 8, (pet.y + pet.zap.y) / 2 - 10); ctx.lineTo(pet.zap.x, pet.zap.y); ctx.stroke(); ctx.shadowBlur = 0; }
  ctx.strokeStyle = '#cfd8d4'; ctx.lineWidth = 2;
  const sp = Math.sin(clock * 40) * 14;
  ctx.beginPath(); ctx.moveTo(pet.x - sp, pet.y - 15); ctx.lineTo(pet.x + sp, pet.y - 15); ctx.stroke();
  ctx.fillStyle = '#2b3530'; ctx.beginPath(); ctx.arc(pet.x, pet.y, 11, 0, 7); ctx.fill();
  ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(pet.x + (player.face || 1) * 3, pet.y, 4.5, 0, 7); ctx.fill();
  ctx.restore();
}
// ---------------- photo mode ----------------
let photoOn = false;
function photoMode() {
  closeDialog();
  photoOn = true;
  const g = $('#game');
  g.classList.add('photo');
  let bar = document.getElementById('photobar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'photobar';
    bar.innerHTML = '<span>MODO FOTO</span><button data-shot>📷 GUARDAR</button><button data-out>✕ SALIR</button>';
    g.append(bar);
    bar.querySelector('[data-shot]').onclick = photoShot;
    bar.querySelector('[data-out]').onclick = photoExit;
  }
  bar.classList.remove('hidden');
}
function photoShot() {
  try {
    const url = $('#world').toDataURL('image/png'), a = document.createElement('a');
    a.href = url; a.download = 'omni-foto-' + Date.now() + '.png';
    document.body.append(a); a.click(); a.remove();
    let pv = document.getElementById('photoprev');
    if (!pv) { pv = document.createElement('div'); pv.id = 'photoprev'; $('#game').append(pv); pv.onclick = () => pv.classList.add('hidden'); }
    pv.innerHTML = '<img src="' + url + '"><small>Guardada en Descargas. En el móvil también puedes mantener pulsada la imagen o hacer captura. Toca para cerrar.</small>';
    pv.classList.remove('hidden');
    playWatchSFX('select');
  } catch (e) { toast('No se pudo guardar la foto · haz una captura de pantalla'); }
}
function photoExit() {
  photoOn = false;
  $('#game').classList.remove('photo');
  const bar = document.getElementById('photobar'), pv = document.getElementById('photoprev');
  if (bar) bar.classList.add('hidden');
  if (pv) pv.classList.add('hidden');
  last = performance.now();
}
// ---------------- emotes / pings ----------------
const EMOTES = ['¡Ayuda!', '¡Aquí!', '¡Bien hecho!', '¡Vamos!', 'Gracias', '😂'];
const emote = { mine: null, theirs: null, ping: null };
function emoteWheel() {
  if (!started || sel || dialogOpen) return;
  let w = document.getElementById('emotewheel');
  if (w && !w.classList.contains('hidden')) { w.classList.add('hidden'); return; }
  if (!w) {
    w = document.createElement('div');
    w.id = 'emotewheel';
    w.innerHTML = EMOTES.map((t, i) => '<button data-em="' + i + '" style="--a:' + (i * 60 - 90) + 'deg">' + t + '</button>').join('') + '<i>Z</i>';
    $('#game').append(w);
    for (const b of w.querySelectorAll('[data-em]')) b.onclick = () => { emoteSend(+b.dataset.em); w.classList.add('hidden'); };
  }
  w.classList.remove('hidden');
}
function emoteSend(i) {
  emote.mine = { i, t: 2.6 };
  if (i === 1) emote.ping = { x: player.x, y: player.y, t: 4 };
  playWatchSFX('select');
  if (net.peer) lanSend({ type: 'emote', i, x: Math.round(player.x), y: Math.round(player.y), zone });
}
function featReceive(m) {
  if (m.type !== 'emote' || !(m.i >= 0 && m.i < EMOTES.length)) return;
  emote.theirs = { i: m.i, t: 2.6 };
  if (m.i === 1 && m.zone === zone) emote.ping = { x: m.x, y: m.y, t: 4 };
  tone(980, 0.08, 'triangle', 0.03);
  toast('Compañero: ' + EMOTES[m.i]);
}
function bubble(x, y, text, col) {
  ctx.save();
  ctx.font = 'bold 13px Arial';
  const w = ctx.measureText(text).width + 18;
  ctx.fillStyle = 'rgba(4,10,8,.88)'; ctx.strokeStyle = col; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.rect(x - w / 2, y - 26, w, 24); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 6, y - 2); ctx.lineTo(x, y + 7); ctx.lineTo(x + 6, y - 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(text, x, y - 9);
  ctx.restore();
}
// ---------------- boss rush ----------------
const rush = { on: false, wave: 0, t: 0, next: 0 };
const RUSH_WAVES = [
  ['Tres cabecillas', () => [0, 1, 2].map((k) => ({ boss: true, hp: 650, dx: (k - 1) * 260 }))],
  ['Dron de élite', () => [{ boss: true, elite: true, hp: 1700, dx: 200 }]],
  ['Coloso irradiado', () => [{ boss: true, sagaKind: 'rad', hp: 2200, dx: 220 }, { sagaKind: 'rad', hp: 300, dx: -260 }, { sagaKind: 'rad', hp: 300, dx: 360 }]],
  ['Capitanes del Vacío', () => [{ boss: true, sagaKind: 'void', hp: 1700, dx: -240 }, { boss: true, sagaKind: 'void', hp: 1700, dx: 260 }]],
  ['El Espectro', () => [{ boss: true, sagaKind: 'specter', hp: 3200, dx: 240, tp: 4, ring: 3, intangible: 0 }]],
];
function bossRushMenu() {
  const best = F1().rushBest;
  showDialog('BOSS RUSH', best ? 'Récord: ' + rushFmt(best) : 'Sin récord todavía',
    '<p>Cinco oleadas de jefes seguidas en las Ruinas del pinar: tres cabecillas, un dron de élite, el Coloso irradiado, los Capitanes del Vacío y el Espectro. Entre oleadas recuperas un 25 % de vida. Cuenta el tiempo total.</p><p class="reward">Primera vez: 800 EXP · 250 monedas. Nuevo récord: +150 monedas.</p>',
    [['¡EMPEZAR!', bossRushStart], ['VOLVER', extrasMenu]]);
}
const rushFmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') + '.' + Math.floor((s % 1) * 10);
function bossRushStart() {
  if (net.role === 'guest' && net.peer) return toast('El Boss Rush lo empieza el anfitrión');
  if (arenaOn()) return toast('Sal antes de la arena');
  closeDialog();
  if (zone !== 0) enterZone(0, 'center');
  enemies = [];
  zoneStates[region().id] = enemies;
  Object.assign(rush, { on: true, wave: 0, t: 0, next: 2 });
  toast('BOSS RUSH · prepárate…');
  playWatchSFX('warning');
}
function rushSpawn() {
  const [name, mk] = RUSH_WAVES[rush.wave], r = region(), cx = (r.minX + r.maxX) / 2, cy = (r.top + r.bottom) / 2, k = 1 + player.level * 0.05;
  rush.wave++;
  enemies = mk().map((d, i) => {
    const x = clamp(cx + d.dx, r.minX + 60, r.maxX - 60), y = cy + (i % 2 ? 40 : -20), hp = Math.round(d.hp * k);
    return { id: 400 + i, x, y, homeX: x, homeY: y, face: -1, kind: 'enemy', rcd: 1.5, cast: 0, stun: 0, alive: true, respawn: 1e9, cd: 1, wind: 0, anim: 0, hit: 0, moving: false, rush: true, ...d, hp, max: hp };
  });
  zoneStates[r.id] = enemies;
  toast('OLEADA ' + rush.wave + ' / 5 · ' + name);
  playWatchSFX(rush.wave === 5 ? 'warning' : 'confirm');
}
function bossRushEnd(why) {
  if (!rush.on) return;
  rush.on = false;
  delete zoneStates[REGIONS[0].id];
  if (why === 'win') {
    const f = F1(), first = !f.rushBest, rec = !f.rushBest || rush.t < f.rushBest;
    if (first) { xp(800); player.coins = (player.coins || 0) + 250; }
    else if (rec) player.coins = (player.coins || 0) + 150;
    if (rec) f.rushBest = rush.t;
    stats().rush = (stats().rush || 0) + 1;
    showDialog('¡BOSS RUSH COMPLETADO!', 'Tiempo: ' + rushFmt(rush.t), '<p>' + (rec ? '<b>¡NUEVO RÉCORD!</b> ' : 'Récord: ' + rushFmt(f.rushBest) + '. ') + (first ? '+800 EXP · +250 monedas' : rec ? '+150 monedas' : '') + '</p>', [['GENIAL', closeDialog], ['OTRA VEZ', bossRushStart]]);
    playWatchSFX('recharged');
    save();
  } else toast('Boss Rush terminado · oleada ' + rush.wave + ' / 5');
  if (zone === 0 && why !== 'defeat') spawnEnemies();
}
function rushTick(dt) {
  if (!rush.on) return;
  if (zone !== 0) return bossRushEnd('left');
  if (net.role === 'guest') return;
  rush.t += dt;
  if (rush.next > 0) { rush.next -= dt; if (rush.next <= 0) rushSpawn(); return; }
  if (!enemies.some((e) => e.rush && e.alive)) {
    if (rush.wave >= 5) return bossRushEnd('win');
    player.hp = Math.min(maxHP(), player.hp + maxHP() * 0.25);
    rush.next = 3;
    toast('¡Oleada superada! · ' + rushFmt(rush.t));
  }
}
// ---------------- save transfer (device → device, 5-letter code) ----------------
let xferPeer = null;
function xferOpts() { // ?peerhost=host:port (QA / self-hosting), like room codes (room.js)
  const o = { debug: 0 }, m = /[?&]peerhost=([^&]+)/.exec(location.search || '');
  if (m) { const [h, p] = decodeURIComponent(m[1]).split(':'); Object.assign(o, { host: h, port: +(p || 9000), path: '/', secure: location.protocol === 'https:' }); }
  return o;
}
function xferStop() { try { if (xferPeer) xferPeer.destroy(); } catch (e) {} xferPeer = null; }
function transferMenu(back) {
  showDialog('TRANSFERIR PARTIDA', 'De un dispositivo a otro',
    '<p>Pasa tu partida completa (las 3 razas, nivel, aliens, monedas…) del móvil al PC, del PC a la web, etc. Los dos necesitan Internet.</p><p><b>En el dispositivo QUE TIENE la partida:</b> ENVIAR. Te dará un código.<br><b>En el dispositivo NUEVO:</b> escribe el código y pulsa RECIBIR. Su partida se sustituye por la enviada.</p><div class="lanfields"><label>Código<input id="xfercode" maxlength="5" placeholder="K7QM2" autocapitalize="characters" autocomplete="off" style="text-transform:uppercase;letter-spacing:3px"></label></div><p id="xfermsg" style="min-height:14px"></p>',
    [['VOLVER', () => { xferStop(); (back || closeDialog)(); }], ['ENVIAR', xferSend], ['RECIBIR', () => xferRecv($('#xfercode').value)]]);
  const inp = $('#xfercode');
  if (inp) inp.addEventListener('keydown', (e) => e.stopPropagation());
}
function xferSend() {
  if (typeof window.Peer !== 'function') return ($('#xfermsg').textContent = 'Este dispositivo no admite la transferencia');
  xferStop();
  try { save(); } catch (e) {}
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', code = Array.from({ length: 5 }, () => A[Math.floor(Math.random() * A.length)]).join('');
  const payload = backupCode();
  $('#xfermsg').innerHTML = 'Conectando…';
  xferPeer = new window.Peer('omni-save-' + code.toLowerCase(), xferOpts());
  xferPeer.on('open', () => { $('#xfermsg').innerHTML = 'Código: <b style="font-size:22px;letter-spacing:5px">' + code + '</b> · escríbelo en el otro dispositivo y pulsa RECIBIR'; });
  xferPeer.on('connection', (c) => {
    c.on('open', () => { c.send(payload); $('#xfermsg').textContent = 'Partida enviada ✔'; playWatchSFX('recharged'); setTimeout(xferStop, 4000); });
  });
  xferPeer.on('error', () => { $('#xfermsg').textContent = 'Sin conexión · revisa Internet e inténtalo otra vez'; });
}
function xferRecv(raw) {
  const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 5) return ($('#xfermsg').textContent = 'Escribe el código de 5 letras');
  if (typeof window.Peer !== 'function') return ($('#xfermsg').textContent = 'Este dispositivo no admite la transferencia');
  xferStop();
  $('#xfermsg').textContent = 'Buscando…';
  xferPeer = new window.Peer(xferOpts());
  xferPeer.on('open', () => {
    const c = xferPeer.connect('omni-save-' + code.toLowerCase(), { reliable: true });
    c.on('data', (d) => {
      const err = restoreCode(typeof d === 'string' ? d : String(d));
      if (err) { $('#xfermsg').textContent = err; return; }
      $('#xfermsg').textContent = 'Partida recibida ✔ · reiniciando…';
      playWatchSFX('recharged');
      setTimeout(() => location.reload(), 1200);
    });
  });
  xferPeer.on('error', (e) => { $('#xfermsg').textContent = e && e.type === 'peer-unavailable' ? 'No hay ningún envío con ese código' : 'Sin conexión · revisa Internet'; });
}
// ---------------- STORY 03 · El Cazador de ADN ----------------
const S3_TRACKERS = [{ x: 420, y: 720 }, { x: 820, y: 780 }, { x: 1240, y: 715 }];
const S3_STEPS = ['', 'Encuentra 3 rastreadores en el Mercado de Bahía (E)', 'Derrota 6 enemigos en la Fortaleza', 'El Cazador te espera en las Ruinas del pinar', 'Vuelve con el Agente Vega en los Muelles'];
function s3Go(step, msg) {
  F1().s3.step = step;
  if (step === 3) setTimeout(() => sagaCine([
    { w: 'AGENTE VEGA', c: '#8de5f3', t: 'Ha aterrizado en las Ruinas del pinar. Se llama Kraal: caza ADN alienígena para venderlo.', fx: 'alarm' },
    { w: 'AGENTE VEGA', c: '#8de5f3', t: 'Usa redes que te frenan y embiste sin avisar. No dejes que te atrape quieto.' },
  ]), 300);
  if (msg) toast(msg);
  playWatchSFX('confirm');
  hud(); save();
}
function story3Talk() { // from Agent Vega once Story 02 is done (part-42)
  const s = F1().s3;
  if (s.step === 0) return sagaCine([
    { w: 'AGENTE VEGA', c: '#8de5f3', t: 'Otra vez tú. Bien, porque tengo un problema: alguien está robando muestras de ADN de toda la bahía.' },
    { w: 'AGENTE VEGA', c: '#8de5f3', t: 'Dejó rastreadores en el Mercado. Encuéntralos y sabremos adónde los envía.' },
  ], () => { s.found = [false, false, false]; s.kills = 0; s3Go(1, 'HISTORIA 03 · El Cazador de ADN · ' + S3_STEPS[1]); });
  if (s.step === 4) return sagaCine([
    { w: 'AGENTE VEGA', c: '#8de5f3', t: 'Kraal está bajo custodia y todo el ADN robado vuelve a su sitio. Gran trabajo.' },
    { w: 'AGENTE VEGA', c: '#8de5f3', t: 'Los Fontaneros te deben otra. Toma tu recompensa.' },
  ], () => { s.step = 5; xp(1500); player.coins = (player.coins || 0) + 400; statEvent('mission', { id: 'saga3' }); toast('¡HISTORIA 03 COMPLETADA! · +1500 EXP · +400 monedas'); playWatchSFX('recharged'); hud(); save(); });
  showDialog('AGENTE VEGA · FONTANEROS', s.step >= 5 ? 'Todo en calma' : 'El Cazador de ADN', s.step >= 5 ? '<p>«Por ahora no hay más misiones. Te avisaré.»</p>' : '<p>«' + S3_STEPS[s.step] + '.»</p>', [['VALE', closeDialog]]);
}
function s3HunterDown() {
  sagaCine([
    { w: 'KRAAL', c: '#ff8a6a', t: '¡Mis muestras…! Esto no ha terminado, portador.', fx: 'shake' },
    { w: '', c: '#c9ff89', t: 'Recuperas el ALMACÉN DE ADN del Cazador. Puedes quedarte una muestra.', fx: 'flash' },
  ], () => { s3Pick(); s3Go(4, 'Vuelve con el Agente Vega en los Muelles'); });
}
function s3Pick() {
  const locked = omniActive() && typeof CORE_ALIENS !== 'undefined' ? CORE_ALIENS.filter((id) => ALIENS[id] && alienInfo(id).implemented && !alienInfo(id).story && !alienUnlocked(id)) : [];
  if (!locked.length) { player.coins = (player.coins || 0) + 800; toast('Muestras vendidas a los Fontaneros · +800 monedas'); save(); return; }
  showDialog('ALMACÉN DE ADN', 'Elige un alien para tu reloj', '<div class="codex">' + locked.slice(0, 18).map((id) => '<button class="cx" data-pick="' + id + '" style="--c:' + (ALIENS[id].color || '#7dff9a') + '"><b>' + ALIENS[id].name + '</b><small>' + ((alienInfo(id).unlockLevel && 'Nivel ' + alienInfo(id).unlockLevel) || 'ADN raro') + '</small></button>').join('') + '</div>', []);
  for (const b of document.querySelectorAll('[data-pick]')) b.onclick = () => { grantAlien(b.dataset.pick); ensureSelection(); playWatchSFX('dna_added'); toast('¡ADN añadido! ' + ALIENS[b.dataset.pick].name.toUpperCase()); closeDialog(); save(); };
}
function s3Spawn() {
  if (net.role === 'guest' || zone !== 0 || F1().s3.step !== 3 || rush.on || arenaOn() || enemies.some((e) => e.hunter && e.alive)) return;
  const hp = Math.round(3600 * (1 + player.level * 0.04));
  enemies.push({ id: 97, x: 1150, y: 700, homeX: 1150, homeY: 700, face: -1, hp, max: hp, boss: true, hunter: true, kind: 'enemy', rcd: 1, cast: 0, stun: 0, alive: true, respawn: 1e9, cd: 1, wind: 0, anim: 0, hit: 0, moving: false, net: 3, dash: 6 });
  toast('¡KRAAL, EL CAZADOR DE ADN!');
  playWatchSFX('warning');
}
function s3Tick(dt) {
  const s = F1().s3;
  if (s.step === 3) s3Spawn();
  if (net.role === 'guest') return;
  for (const e of enemies) {
    if (!e.hunter || !e.alive) continue;
    e.net -= dt; e.dash -= dt;
    if (e.net <= 0) { // spread of net shots: they slow you down
      e.net = 3.2;
      const a0 = Math.atan2(player.y - e.y, player.x - e.x);
      for (const k of [-0.25, 0, 0.25]) hostileShots.push({ type: 'bossfire', x: e.x, y: e.y - 60, dx: Math.cos(a0 + k) * 260, dy: Math.sin(a0 + k) * 260, t: 2.2, damage: 9, r: 10, slow: true });
    }
    if (e.dash <= 0) { // charge
      e.dash = 6.5;
      const a = Math.atan2(player.y - e.y, player.x - e.x);
      burst(e.x, e.y - 40, 16, '#ff8a6a');
      e.x = clamp(e.x + Math.cos(a) * 260, region().minX + 50, region().maxX - 50);
      e.y = clamp(e.y + Math.sin(a) * 120, region().top + 20, region().bottom - 20);
      if (dist(e, player) < 80) hitPlayer(16);
    }
  }
}
function s3Near() {
  const s = F1().s3;
  if (zone === 4 && s.step === 1) {
    const i = S3_TRACKERS.findIndex((t, k) => !s.found[k] && dist(player, t) < 110);
    if (i >= 0) return ['◆ DESACTIVAR RASTREADOR', () => {
      s.found[i] = true;
      burst(S3_TRACKERS[i].x, S3_TRACKERS[i].y - 20, 20, '#8de5f3');
      playWatchSFX('scan_complete');
      const n = s.found.filter(Boolean).length;
      toast('Rastreador ' + n + ' / 3');
      if (n >= 3) sagaCine([{ w: 'OMNITRIX', c: '#c9ff89', t: 'Señal triangulada: todos los rastreadores envían a la Fortaleza de los Caballeros.' }], () => s3Go(2, 'Derrota 6 enemigos en la Fortaleza'));
      hud(); save();
    }];
  }
  return null;
}
// ---------------- the shared tick, draw, HUD and input ----------------
let f1Day = '', f1Profile = null;
function featTick(dt) {
  if (f1Profile !== player) { f1Profile = player; F1(); }
  if (started && f1Day !== dayKey()) { f1Day = dayKey(); setTimeout(dailyLogin, 2500); }
  if (combo.n > 0) { combo.t -= dt; if (combo.t <= 0) comboEnd(); else if (comboEl) { const i = comboEl.querySelector('i'); if (i) i.style.width = (combo.t / 2.5) * 100 + '%'; } }
  if (ultraT > 0) { ultraT -= dt; if (ultraT <= 0 || !player.alien) ultraEnd(); }
  for (const k of ['mine', 'theirs', 'ping']) if (emote[k]) { emote[k].t -= dt; if (emote[k].t <= 0) emote[k] = null; }
  petTick(dt);
  rushTick(dt);
  s3Tick(dt);
  ultraHud();
}
function featDraw() {
  if (emote.ping) {
    const p = emote.ping;
    ctx.save(); ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 3; ctx.globalAlpha = Math.min(1, p.t);
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 30 + (clock * 40) % 30, 10, 0, 0, 7); ctx.stroke();
    ctx.restore(); txt('▼ AQUÍ', p.x, p.y - 130, 11, '#ffe27a');
  }
  if (zone === 4 && F1().s3.step === 1)
    S3_TRACKERS.forEach((t, i) => {
      if (F1().s3.found[i]) return;
      ctx.fillStyle = '#20262c'; ctx.fillRect(t.x - 12, t.y - 26, 24, 26);
      ctx.fillStyle = Math.floor(clock * 4) % 2 ? '#ff4d4d' : '#5a1a1a'; ctx.beginPath(); ctx.arc(t.x, t.y - 30, 5, 0, 7); ctx.fill();
      txt('RASTREADOR', t.x, t.y - 42, 8, '#8de5f3');
    });
  petDraw();
  if (emote.mine) bubble(player.x, player.y - 150, EMOTES[emote.mine.i], (omniActive() && getWatch().color) || '#8dff5a');
  if (emote.theirs && net.remote && net.remote.zone === zone) bubble(net.remote.x, net.remote.y - 150, EMOTES[emote.theirs.i], '#8de5f3');
}
function featDrawEnemy(e, f) { // the hunter (Story 03)
  if (!e.hunter) return false;
  ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#ff6a3a'; ctx.beginPath(); ctx.ellipse(e.x, e.y - 70, 55, 85, 0, 0, 7); ctx.fill(); ctx.restore();
  sprite(17, f, e.x, e.y, 150, e.face, e.hit > 0 ? 0.55 : 1);
  const by = e.y - 178;
  txt('KRAAL · CAZADOR DE ADN', e.x, by - 8, 10, '#ffb59a');
  ctx.fillStyle = '#101522'; ctx.fillRect(e.x - 60, by, 120, 7);
  ctx.fillStyle = '#ff7a4a'; ctx.fillRect(e.x - 60, by, 120 * Math.max(0, e.hp / e.max), 7);
  return true;
}
let ultraEl = null;
function ultraHud() {
  const show = omniActive() && started && !watchHasUlt();
  if (!ultraEl) {
    ultraEl = document.createElement('button');
    ultraEl.id = 'ultrabtn';
    ultraEl.onclick = ultraFire;
    $('#game').append(ultraEl);
  }
  ultraEl.classList.toggle('hidden', !show);
  if (!show) return;
  const f = F1(), ready = ultraReady();
  ultraEl.classList.toggle('ready', ready);
  ultraEl.classList.toggle('on', ultraT > 0);
  ultraEl.style.setProperty('--p', (ultraT > 0 ? ultraT / 15 : f.ultra / 100) * 100 + '%');
  const t = ultraT > 0 ? '⚡ ' + Math.ceil(ultraT) + ' s' : ready ? '⚡ ULTRA · U' : 'ULTRA ' + Math.floor(f.ultra) + '%';
  if (ultraEl.textContent !== t) ultraEl.textContent = t;
}
document.addEventListener('keydown', (e) => {
  if (e.repeat || !e.key || !started || sel || dialogOpen || sagaCineOn) return;
  const k = e.key.toLowerCase();
  if (k === 'u' && !watchHasUlt()) ultraFire();
  if (k === 'z') emoteWheel();
});
function f1Near() { return s3Near(); }
function featInteract() {
  if (!started) return false;
  const n = f1Near();
  if (!n) return false;
  n[1]();
  return true;
}
// emote button (always there: works solo too, and talks to your partner in co-op)
{
  const b = document.createElement('button');
  b.id = 'emotebtn';
  b.textContent = '💬';
  b.onclick = emoteWheel;
  $('#game').append(b);
}
function f1Hud() { // end of hud() (part-11)
  const n = f1Near();
  if (n) { $('#talk').classList.remove('hidden'); $('#talk').textContent = n[0]; }
  const s = F1().s3;
  if (!(s.step >= 1 && s.step <= 4) || activeMission() || sagaActive() || [6, 8, 9, 10, 12].includes(zone) && !(zone === 6 && s.step === 2)) return;
  $('#mission .tiny').textContent = 'HISTORIA 03 · EL CAZADOR DE ADN';
  $('#questtext').textContent = ['', 'Rastreadores', 'Ataque a la Fortaleza', 'Kraal', 'Regreso'][s.step];
  $('#questsub').textContent = s.step === 1 ? S3_STEPS[1] + ' · ' + s.found.filter(Boolean).length + ' / 3' : s.step === 2 ? S3_STEPS[2] + ' · ' + Math.min(6, s.kills) + ' / 6' : S3_STEPS[s.step];
}
function s3Menu() {
  const s = F1().s3, done = SG().step >= 8;
  showDialog('HISTORIA 03 · EL CAZADOR DE ADN', s.step >= 5 ? 'Completada' : s.step ? 'Paso ' + s.step + ' / 4' : 'Sin empezar',
    !done ? '<p>Termina primero la Historia 02 (Ecos del Vacío).</p>'
      : s.step === 0 ? '<p>Habla con el <b>Agente Vega</b> en los Muelles del faro. Un cazador está robando ADN alienígena por toda la bahía.</p><p class="reward">Recompensa: elige un alien del almacén de ADN · 1500 EXP · 400 monedas</p>'
        : s.step >= 5 ? '<p>Kraal está bajo custodia. ¡Buen trabajo!</p>' : '<p>' + S3_STEPS[s.step] + '.</p>',
    [['VOLVER', pauseMenu]]);
}
function dailyCalendar() {
  const L = F1().login;
  showDialog('RECOMPENSA DIARIA', 'Racha: día ' + (L.streak || 0) + ' de 7',
    '<div class="daily7">' + DAILY.map(([lab], i) => '<div class="' + (i < L.streak ? 'got' : '') + '"><b>DÍA ' + (i + 1) + '</b><small>' + lab + '</small></div>').join('') + '</div><p>Se recoge sola al empezar a jugar cada jornada.</p>',
    [['VOLVER', pauseMenu]]);
}
// ============================================================================================
// OMNI 0.22 · FEATURE BATCH 2 — combat + progression
//   PERFECT DODGE  dodge just before a hit lands → slow motion, +20 Ultra, and your next hit is a ×2 COUNTER
//   ELEMENTS       every alien has an element; every enemy type has weak points (+35 % damage, "¡DÉBIL!")
//   ELITE MODS     1 in 10 normal enemies spawns as an elite: SHIELDED, FAST, SPLITTER or REGEN (+EXP, +coins)
//   VOID TOWER     endless floors in the Null Void, a captain every 5th floor, best floor saved (Extras)
//   TRAINING       a training dummy with live damage-per-second readout (Extras)
//   WEEKLY         3 weekly challenges (resets Monday), 300 coins + 300 EXP each
//   LEVEL CAP 30   + PRESTIGE at 30: back to level 1 keeping everything, a ★ that adds +5 % damage (max 10)
//   TITLES         earned by playing, shown under your health bar
//   COIN SHOP      movement trails, watch colours, pet colours
//   COLLECTION     everything you have unlocked, as percentages
// State: player.f2 = { prestige, title, owned[], equip{}, week{}, dunBest, titles[] }
// ============================================================================================
const LEVEL_CAP = 30;
function F2() {
  const f = (player.f2 = player.f2 && typeof player.f2 === 'object' ? player.f2 : {});
  f.prestige = f.prestige | 0;
  if (!Array.isArray(f.owned)) f.owned = [];
  if (!f.equip || typeof f.equip !== 'object') f.equip = {};
  if (!f.week || typeof f.week !== 'object') f.week = {};
  return f;
}
// ---------------- elements ----------------
const ELEM = {};
for (const [el, ids] of Object.entries({
  fire: ['heatblast', 'swampfire', 'bestia'],
  ice: ['bigchill', 'arctiguana'],
  water: ['waterhazard', 'ripjaws', 'ampfibian', 'walkatrout'],
  electric: ['buzzshock', 'feedback', 'shocksquatch', 'lodestar', 'nrg', 'ampfibian', 'xlr8', 'fasttrack'],
  plant: ['wildvine', 'swampfire', 'insect', 'eatle'],
  light: ['diamond', 'chromastone', 'alienx', 'ghostfreak', 'echoecho', 'anodite'],
  heavy: ['fourarms', 'humungousaur', 'cannonbolt', 'armodrillo', 'rath', 'bloxx', 'gravattack', 'waybig', 'terraspin', 'ballweevil'],
  tech: ['upgrade', 'nanomech', 'greymatter', 'brainstorm', 'clockwork', 'juryrigg', 'atomix'],
})) for (const id of ids) (ELEM[id] = ELEM[id] || []).push(el);
const ELEM_NAME = { fire: 'Fuego', ice: 'Hielo', water: 'Agua', electric: 'Electricidad', plant: 'Planta', light: 'Luz', heavy: 'Fuerza', tech: 'Tecnología' };
const WEAK = { dron: ['electric', 'tech'], cabecilla: ['heavy', 'fire'], caballero: ['electric', 'heavy'], elite: ['electric', 'tech'], jefe: ['water', 'ice'], robot: ['electric', 'tech'], irradiado: ['water', 'ice'], carcelero: ['fire', 'light'], espectro: ['light', 'electric'] };
function myElems() {
  if (race === 'osmo') return { electric: ['electric'], fire: ['fire'], stone: ['heavy'], wood: ['plant'] }[player.form] || [];
  if (race === 'anodite') return ['light'];
  return player.alien ? ELEM[player.activeAlien] || [] : [];
}
let weakPopT = 0, counterUntil = 0, slowUntil = 0;
// damageEnemy (part-08): weak points, perfect-dodge counter, elite shield
function dmgMod(e, dmg) {
  const t = beastType(e), w = (t && WEAK[t]) || [], now = performance.now();
  if (myElems().some((x) => w.includes(x))) {
    dmg *= 1.35;
    if (now > weakPopT) { weakPopT = now + 700; popup(e.x - 30, e.y - 130, '¡DÉBIL!', '#ffd84a'); }
  }
  if (now < counterUntil) { counterUntil = 0; dmg *= 2; popup(e.x + 30, e.y - 150, '¡CONTRAATAQUE!', '#ff7a4a'); flash = 0.15; }
  if (e.mod === 'shield' && e.shield > 0) { const a = Math.min(e.shield, dmg * 0.7); e.shield -= a; dmg -= a; if (e.shield <= 0) { burst(e.x, e.y - 60, 20, '#8de5f3'); popup(e.x, e.y - 140, 'ESCUDO ROTO', '#8de5f3'); } }
  dmg *= weatherDmg(); // part-47
  if (e.dummy) dummyHit(dmg);
  return dmg;
}
const featSlow = () => (performance.now() < slowUntil ? 0.3 : 1);
// dodge (part-21): was a hit about to land?
function perfectDodgeCheck() {
  const near = enemies.some((e) => e.alive && e.wind > 0 && e.wind < 0.4 && dist(e, player) < 100) ||
    hostileShots.some((p) => p.t > 0 && Math.hypot(p.x - player.x, p.y + 35 - player.y) < 120 && (p.dx * (player.x - p.x) + p.dy * (player.y - 35 - p.y)) > 0);
  if (!near) return;
  slowUntil = performance.now() + 900;
  counterUntil = performance.now() + 1800;
  player.inv = Math.max(player.inv, 0.6);
  if (typeof F1 === 'function' && omniActive()) F1().ultra = Math.min(100, F1().ultra + 20);
  toast('¡ESQUIVA PERFECTA! · tu próximo golpe hace ×2');
  playWatchSFX('select');
}
// ---------------- elite modifiers ----------------
const MODS = { shield: ['BLINDADO', '#8de5f3'], fast: ['VELOZ', '#ffe27a'], split: ['DIVISOR', '#c084ff'], regen: ['REGENERA', '#7dff9a'] };
function eliteRoll() {
  if (net.role === 'guest') return;
  for (const e of enemies) {
    if (e.modRolled) continue;
    e.modRolled = true;
    if (e.boss || e.knight || e.elite || e.rush || e.temp || e.dummy || e.hunter || e.majorBoss || e.robotBoss || e.mini || e.dun || Math.random() > 0.1) continue;
    const k = Object.keys(MODS)[Math.floor(Math.random() * 4)];
    e.mod = k;
    e.baseMax = e.max;
    e.max = e.hp = Math.round(e.max * 1.6);
    if (k === 'shield') e.shield = e.max * 0.5;
  }
}
function eliteTickMods(dt) {
  if (net.role === 'guest') return;
  for (const e of enemies) if (e.alive && e.mod === 'regen' && e.hp < e.max) e.hp = Math.min(e.max, e.hp + e.max * 0.02 * dt);
}
function eliteKill(e) {
  if (!e.mod) return;
  xp(30);
  player.coins = (player.coins || 0) + 20;
  popup(e.x, e.y - 150, 'ÉLITE · +20 🪙', MODS[e.mod][1]);
  if (e.mod === 'split' && net.role !== 'guest')
    for (const s of [-1, 1]) {
      const x = e.x + s * 50, hp = Math.round(e.max * 0.3);
      enemies.push({ id: 700 + Math.floor(Math.random() * 99), x, y: e.y, homeX: x, homeY: e.y, face: -s, hp, max: hp, kind: 'enemy', rcd: 2, cast: 0, stun: 0.4, alive: true, respawn: 1e9, cd: 1, wind: 0, anim: 0, hit: 0, moving: false, mini: true, temp: true, modRolled: true, sagaKind: e.sagaKind });
    }
  if (e.baseMax) { e.max = e.baseMax; e.baseMax = 0; }
  e.mod = null; // a respawned enemy rolls again
  e.shield = 0;
  e.modRolled = !!e.temp;
}
function modDraw(e) { // over each enemy (part-43 scanDrawMark)
  if (e.mod && e.alive) {
    const [n, c] = MODS[e.mod];
    txt('★ ' + n, e.x, e.y - 128, 8, c);
    if (e.mod === 'shield' && e.shield > 0) { ctx.save(); ctx.strokeStyle = c; ctx.globalAlpha = 0.5; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(e.x, e.y - 50, 42, 62, 0, 0, 7); ctx.stroke(); ctx.restore(); }
  }
  if (e.mini && e.alive) txt('MINI', e.x, e.y - 112, 7, '#c084ff');
}
// ---------------- training dummy ----------------
const dummy = { hits: [], total: 0 };
function dummyHit(d) { dummy.hits.push([performance.now(), d]); dummy.total += d; }
function dummyDps() { const now = performance.now(); dummy.hits = dummy.hits.filter((h) => now - h[0] < 5000); return Math.round(dummy.hits.reduce((a, h) => a + h[1], 0) / 5); }
function trainingToggle() {
  closeDialog();
  const i = enemies.findIndex((e) => e.dummy);
  if (i >= 0) { enemies.splice(i, 1); toast('Muñeco retirado'); return; }
  const x = clamp(player.x + (player.face || 1) * 160, region().minX + 60, region().maxX - 60);
  enemies.push({ id: 600, x, y: player.y, homeX: x, homeY: player.y, face: -1, hp: 1e9, max: 1e9, kind: 'enemy', rcd: 1e9, cast: 0, stun: 1e9, alive: true, respawn: 1e9, cd: 1e9, wind: 0, anim: 0, hit: 0, moving: false, dummy: true, modRolled: true });
  dummy.hits = []; dummy.total = 0;
  toast('Muñeco de entrenamiento · golpéalo para medir tu daño por segundo');
}
function f2DrawEnemy(e) {
  if (!e.dummy) return false;
  ctx.fillStyle = '#6b4a2a'; ctx.fillRect(e.x - 5, e.y - 90, 10, 90);
  ctx.fillStyle = '#8a6238'; ctx.fillRect(e.x - 30, e.y - 80, 60, 10);
  for (const [r, c] of [[30, '#e8e2d0'], [22, '#d04a3a'], [14, '#e8e2d0'], [6, '#d04a3a']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(e.x, e.y - 112, r, 0, 7); ctx.fill(); }
  if (e.hit > 0) { ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(e.x, e.y - 112, 32, 0, 7); ctx.fill(); }
  txt('DPS ' + dummyDps(), e.x, e.y - 158, 13, '#ffe27a');
  txt('TOTAL ' + Math.round(dummy.total), e.x, e.y - 144, 9, '#d6e8da');
  e.hp = e.max; // never dies
  return true;
}
// ---------------- void tower (endless) ----------------
const dun = { on: false, floor: 0, next: 0 };
function towerMenu() {
  showDialog('TORRE DEL VACÍO', F2().dunBest ? 'Récord: piso ' + F2().dunBest : 'Sin récord',
    '<p>Pisos sin fin en el Vacío Nulo. Cada piso trae más carceleros y más fuertes; cada 5 pisos, un capitán. Entre pisos recuperas un 15 % de vida. Cada piso da EXP y monedas.</p>',
    [['¡SUBIR!', towerStart], ['VOLVER', extrasMenu]]);
}
function towerStart() {
  if (net.role === 'guest' && net.peer) return toast('La torre la abre el anfitrión');
  if (arenaOn() || rush.on) return toast('Termina antes lo que estás haciendo');
  closeDialog();
  dun.on = true; dun.floor = 0; dun.next = 2;
  if (zone !== SAGA_ZONE_VOID) enterZone(SAGA_ZONE_VOID, 'center');
  enemies = [];
  zoneStates[region().id] = enemies;
  toast('TORRE DEL VACÍO · piso 1');
}
function towerSpawn() {
  dun.floor++;
  const n = dun.floor, r = region(), cx = (r.minX + r.maxX) / 2, k = 1 + n * 0.12 + player.level * 0.03, cap = n % 5 === 0, count = Math.min(2 + n, 9);
  enemies = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1, x = clamp(cx + side * (260 + Math.random() * 380), r.minX + 50, r.maxX - 50), y = r.top + 30 + Math.random() * (r.bottom - r.top - 60), boss = cap && i === 0, hp = Math.round(260 * k * (boss ? 4 : 1));
    enemies.push({ id: 800 + i, x, y, homeX: x, homeY: y, face: -side, hp, max: hp, boss, sagaKind: 'void', kind: 'enemy', rcd: 1.6 + i * 0.2, cast: 0, stun: 0, alive: true, respawn: 1e9, cd: 1, wind: 0, anim: 0, hit: 0, moving: false, dun: true, modRolled: true });
  }
  zoneStates[r.id] = enemies;
  toast('PISO ' + n + (cap ? ' · ¡CAPITÁN!' : '') + ' · ' + count + ' carceleros');
  playWatchSFX(cap ? 'warning' : 'confirm');
}
function towerEnd(why) {
  if (!dun.on) return;
  dun.on = false;
  const reached = Math.max(0, dun.floor - 1);
  if (reached > (F2().dunBest || 0)) { F2().dunBest = reached; toast('Torre terminada · NUEVO RÉCORD: piso ' + reached); }
  else toast('Torre terminada · pisos superados: ' + reached);
  delete zoneStates[REGIONS[SAGA_ZONE_VOID].id];
  if (zone === SAGA_ZONE_VOID && why !== 'defeat') spawnEnemies();
  save();
}
function towerTick(dt) {
  if (!dun.on) return;
  if (zone !== SAGA_ZONE_VOID) return towerEnd('left');
  if (net.role === 'guest') return;
  if (dun.next > 0) { dun.next -= dt; if (dun.next <= 0) towerSpawn(); return; }
  if (!enemies.some((e) => e.dun && e.alive)) {
    const n = dun.floor;
    xp(20 * n);
    player.coins = (player.coins || 0) + 10 * n;
    player.hp = Math.min(maxHP(), player.hp + maxHP() * 0.15);
    if (n > (F2().dunBest || 0)) F2().dunBest = n;
    toast('¡Piso ' + n + ' superado! · +' + 20 * n + ' EXP · +' + 10 * n + ' monedas');
    dun.next = 3;
    save();
  }
}
// ---------------- weekly challenges ----------------
const WEEKLY = [
  ['kills', 'Derrota 150 enemigos', 150], ['transforms', 'Transfórmate 40 veces', 40], ['missions', 'Completa 5 misiones', 5],
  ['puzzles', 'Resuelve 6 puzles', 6], ['powers', 'Usa 300 poderes', 300], ['dailies', 'Completa 6 retos diarios', 6],
  ['combo', 'Consigue un combo de 40', 40], ['rush', 'Completa el Boss Rush', 1], ['floors', 'Llega al piso 10 de la Torre', 10], ['scans', 'Escanea 3 enemigos nuevos', 3],
];
function weekId(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return t.getUTCFullYear() + '-W' + Math.ceil(((t - y0) / 86400000 + 1) / 7);
}
function weekCounters() {
  const s = stats(), b = (typeof BX === 'function' && BX()) || {};
  return { kills: s.kills, transforms: s.transforms, missions: s.missions, puzzles: s.puzzles, powers: s.powers, dailies: s.dailies, rush: s.rush || 0, scans: Object.values(b).filter((x) => x && x.scanned).length };
}
function WK() {
  const f = F2(), id = weekId();
  if (f.week.id !== id) {
    let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const pool = WEEKLY.map((w, i) => i), picks = [];
    while (picks.length < 3) { h = (h * 1103515245 + 12345) >>> 0; const i = pool.splice(h % pool.length, 1)[0]; picks.push(i); }
    f.week = { id, picks, base: weekCounters(), done: {}, combo: 0, floors: 0 };
  }
  return f.week;
}
function weekProgress(i) {
  const w = WK(), [key, , goal] = WEEKLY[i], now = weekCounters();
  const v = key === 'combo' ? w.combo : key === 'floors' ? w.floors : (now[key] || 0) - (w.base[key] || 0);
  return Math.min(goal, Math.max(0, v));
}
function weekTick() {
  const w = WK();
  if (typeof combo !== 'undefined') w.combo = Math.max(w.combo || 0, combo.n);
  if (dun.on) w.floors = Math.max(w.floors || 0, dun.floor - 1);
  for (const i of w.picks) {
    if (w.done[i]) continue;
    if (weekProgress(i) >= WEEKLY[i][2]) {
      w.done[i] = true;
      xp(300);
      player.coins = (player.coins || 0) + 300;
      toast('¡RETO SEMANAL! ' + WEEKLY[i][1] + ' · +300 EXP · +300 monedas');
      playWatchSFX('recharged');
      save();
    }
  }
}
function weeklyMenu(back) {
  const w = WK();
  showDialog('RETOS SEMANALES', 'Semana ' + w.id.split('-W')[1] + ' · se renuevan el lunes',
    w.picks.map((i) => { const [, n, g] = WEEKLY[i], p = weekProgress(i); return '<div class="xrow"><b>' + (w.done[i] ? '✔ ' : '') + n + '</b><span class="xbar"><i style="width:' + (p / g) * 100 + '%"></i></span><small>' + p + ' / ' + g + ' · 300 EXP · 300 monedas</small></div>'; }).join(''),
    [['VOLVER', back || extrasMenu]]);
}
// ---------------- prestige ----------------
const prestigeMult = () => 1 + F2().prestige * 0.05;
function prestigeMenu() {
  const f = F2();
  if (player.level < LEVEL_CAP) return showDialog('PRESTIGIO', 'Nivel ' + LEVEL_CAP + ' necesario', '<p>Al llegar al nivel ' + LEVEL_CAP + ' puedes volver al nivel 1 conservando todo (aliens, relojes, mejoras, monedas) y ganar una ★ de prestigio: +5 % de daño permanente por estrella (máx. 10).</p><p>Tienes ★' + f.prestige + '.</p>', [['VOLVER', pauseMenu]]);
  if (f.prestige >= 10) return toast('Ya tienes el prestigio máximo ★10');
  showDialog('PRESTIGIO', '¿Volver al nivel 1?', '<p>Conservas todos tus aliens, relojes, mejoras, monedas e historias. Ganas <b>★' + (f.prestige + 1) + '</b> (+5 % de daño permanente).</p>', [['¡PRESTIGIO!', () => {
    if (typeof CORE_ALIENS !== 'undefined') for (const id of CORE_ALIENS) if (ALIENS[id] && alienUnlocked(id)) grantAlien(id); // level-unlocked aliens stay unlocked
    f.prestige++;
    player.level = 1; player.xp = 0;
    closeDialog();
    levelBanner('★' + f.prestige);
    toast('¡PRESTIGIO ★' + f.prestige + '! · +' + f.prestige * 5 + ' % de daño');
    playWatchSFX('recharged');
    hud(); save();
  }], ['AHORA NO', pauseMenu]]);
}
// ---------------- titles ----------------
const TITLES = [
  ['novato', 'Novato', 'Empieza a jugar', () => true],
  ['fantasmas', 'Cazafantasmas', 'Completa la Historia 02', () => typeof SG === 'function' && SG().step >= 8],
  ['cazador', 'Cazador de cazadores', 'Completa la Historia 03', () => typeof F1 === 'function' && F1().s3.step >= 5],
  ['combo', 'Rey del combo', 'Consigue un combo de 40', () => (WK().combo || 0) >= 40 || (typeof combo !== 'undefined' && combo.best >= 40)],
  ['rush', 'Imparable', 'Completa el Boss Rush', () => typeof F1 === 'function' && !!F1().rushBest],
  ['torre', 'Escalador del Vacío', 'Llega al piso 10 de la Torre', () => (F2().dunBest || 0) >= 10],
  ['bestia', 'Naturalista', 'Escanea todo el bestiario', () => typeof BX === 'function' && Object.values(BX()).filter((x) => x && x.scanned).length >= 9],
  ['rico', 'Millonario', 'Ten 5000 monedas', () => (player.coins || 0) >= 5000],
  ['mejora', 'Mecánico', 'Mejora un alien al máximo', () => typeof F1 === 'function' && Object.values(F1().upg).some((v) => v >= 5)],
  ['leyenda', 'Leyenda', 'Consigue una ★ de prestigio', () => F2().prestige >= 1],
];
function titleOk(id) { const t = TITLES.find((x) => x[0] === id); try { return !!t && t[3](); } catch (e) { return false; } }
function titlesMenu(back) {
  const f = F2();
  showDialog('TÍTULOS', TITLES.filter((t) => titleOk(t[0])).length + ' / ' + TITLES.length + ' conseguidos',
    '<div class="codex">' + TITLES.map(([id, n, d]) => { const ok = titleOk(id); return '<button class="cx' + (ok ? '' : ' locked') + '" data-title="' + id + '" style="--c:' + (f.title === id ? 'var(--ox)' : '#8de5f3') + '"><b>' + (f.title === id ? '▶ ' : '') + (ok ? n : '???') + '</b><small>' + d + '</small></button>'; }).join('') + '</div><p>Tu título aparece bajo la barra de vida.</p>',
    [['VOLVER', back || extrasMenu]]);
  for (const b of document.querySelectorAll('[data-title]')) b.onclick = () => { if (!titleOk(b.dataset.title)) return toast('Aún no lo tienes'); f.title = b.dataset.title; save(); hud(); titlesMenu(back); };
}
// ---------------- coin shop ----------------
const SHOP = [
  ['trail_fire', 'Estela de fuego', 'trail', 400, '#ff8a3a'], ['trail_ice', 'Estela de hielo', 'trail', 400, '#9fe8ff'], ['trail_spark', 'Estela de chispas', 'trail', 600, '#ffe27a'], ['trail_void', 'Estela del Vacío', 'trail', 800, '#b98cff'],
  ['ox_gold', 'Reloj dorado', 'ox', 700, '#ffd84a'], ['ox_white', 'Reloj blanco', 'ox', 500, '#eef4ff'], ['ox_purple', 'Reloj morado', 'ox', 500, '#b98cff'], ['ox_cyan', 'Reloj cian', 'ox', 500, '#5fe8ff'],
  ['pet_gold', 'Chispa dorado', 'pet', 600, '#ffd84a'], ['pet_red', 'Chispa rojo', 'pet', 400, '#ff5a4a'], ['pet_ghost', 'Chispa fantasma', 'pet', 800, '#c9a7ff'],
];
const SHOP_KIND = { trail: 'Estelas', ox: 'Color del reloj (interfaz)', pet: 'Color de Chispa' };
function shopMenu(back) {
  const f = F2();
  showDialog('TIENDA', (player.coins || 0) + ' monedas',
    Object.entries(SHOP_KIND).map(([k, n]) => '<h4 class="shoph">' + n + '</h4><div class="codex">' + SHOP.filter((s) => s[2] === k).map(([id, name, , price, col]) => {
      const own = f.owned.includes(id), on = f.equip[k] === id;
      return '<button class="cx" data-shop="' + id + '" style="--c:' + col + '"><b style="color:' + col + '">' + (on ? '▶ ' : '') + name + '</b><small>' + (on ? 'EQUIPADO · toca para quitar' : own ? 'Tuyo · toca para equipar' : price + ' monedas') + '</small></button>';
    }).join('') + '</div>').join(''),
    [['VOLVER', back || extrasMenu]]);
  for (const b of document.querySelectorAll('[data-shop]'))
    b.onclick = () => {
      const it = SHOP.find((s) => s[0] === b.dataset.shop), [id, name, kind, price] = it;
      if (!f.owned.includes(id)) {
        if ((player.coins || 0) < price) return toast('Te faltan ' + (price - (player.coins || 0)) + ' monedas'), playWatchSFX('error');
        player.coins -= price;
        f.owned.push(id);
        toast('¡Comprado! ' + name);
        f.equip[kind] = id;
      } else f.equip[kind] = f.equip[kind] === id ? null : id;
      playWatchSFX('select');
      oxApplied = '';
      hud(); save();
      shopMenu(back);
    };
}
const shopColor = (kind) => { const id = F2().equip[kind], it = id && SHOP.find((s) => s[0] === id); return it ? it[4] : null; };
const petColor = () => shopColor('pet');
let oxApplied = '';
function shopApply() {
  const c = shopColor('ox'), g = $('#game');
  if (!g) return;
  if (c && g.style.getPropertyValue('--ox') !== c) g.style.setProperty('--ox', c);
  if (!c && oxApplied) { applyWatchTheme(); }
  oxApplied = c || '';
}
function trailTick() {
  const c = shopColor('trail');
  if (!c || !player.moving || Math.random() > 0.6) return;
  particles.push({ x: player.x + (Math.random() - 0.5) * 20, y: player.y - 8 - Math.random() * 30, dx: -(player.face || 1) * 30, dy: -10 - Math.random() * 20, t: 0.45, color: c, size: 3 + Math.random() * 2 });
}
// ---------------- collection book ----------------
function collectionMenu(back) {
  const row = (n, a, b) => '<div class="xrow"><b>' + n + '</b><span class="xbar"><i style="width:' + (b ? (a / b) * 100 : 0) + '%"></i></span><small>' + a + ' / ' + b + ' · ' + (b ? Math.round((a / b) * 100) : 0) + ' %</small></div>';
  const ids = codexIds(), bx = typeof BX === 'function' ? BX() : {}, f1 = typeof F1 === 'function' ? F1() : { upg: {}, s3: {} }, got = player.ach || {};
  const parts = [
    ['Aliens', ids.filter((id) => alienUnlocked(id)).length, ids.length],
    ['Bestiario', Object.values(bx).filter((x) => x && x.scanned).length, 9],
    ['Zonas', discovered.length, REGIONS.length],
    ['Logros', ACHS.filter((a) => got[a[0]]).length, ACHS.length],
    ['Misiones', Object.keys(MS().done).length, MISSIONS.length],
    ['Historias', [SG().step >= 8, (f1.s3 || {}).step >= 5].filter(Boolean).length, 2],
    ['Tienda', F2().owned.length, SHOP.length],
    ['Títulos', TITLES.filter((t) => titleOk(t[0])).length, TITLES.length],
    ['Mejoras ★', Object.values(f1.upg).reduce((a, v) => a + Math.min(5, v), 0), ids.length * 5],
  ];
  const tot = Math.round((parts.reduce((a, p) => a + (p[2] ? p[1] / p[2] : 0), 0) / parts.length) * 100);
  showDialog('COLECCIÓN', 'Total: ' + tot + ' %', parts.map((p) => row(...p)).join(''), [['VOLVER', back || extrasMenu]]);
}
// ---------------- tick + HUD ----------------
let f2T = 0;
function f2Tick(dt) {
  F2();
  eliteRoll();
  eliteTickMods(dt);
  towerTick(dt);
  trailTick();
  f2T -= dt;
  if (f2T <= 0) { f2T = 0.5; weekTick(); shopApply(); }
}
function f2Hud() {
  const f = F2();
  if (f.prestige) $('#level').textContent = 'NV. ' + player.level + ' ★' + f.prestige;
  let t = document.getElementById('ptitle');
  const v = document.querySelector('.vitals');
  if (!t && v) { t = document.createElement('span'); t.id = 'ptitle'; v.append(t); }
  const tt = TITLES.find((x) => x[0] === f.title);
  if (t) t.textContent = tt && titleOk(tt[0]) ? '« ' + tt[1] + ' »' : '';
}
// ============================================================================================
// OMNI 0.23 · FEATURE BATCH 3 — world + watch
//   FAVOURS        side quests from people around the bay, one at a time (Pause → Favores)
//   ZONE BOSSES    a named boss can appear when you enter an area (at most every 5 min per area)
//   WORLD EVENTS   every few minutes for 60 s: meteor shower, invasion, coin rain, eclipse
//   BADGES         2 hidden Plumber badges in most areas: walk over them (25 coins each, all = bonus)
//   NIGHT          at night enemies hit 25 % harder and move faster, but kills give more EXP
//   WEATHER        rain (water +15 %, fire −10 %), storm (electric +20 %), fog; changes every few minutes
//   FAST TRAVEL    jump to any area you have visited (Pause → Mapa / Viaje rápido)
//   LOADOUTS       3 saved favourite sets for the dial and quick swap
//   WATCH UPGRADES battery, recharge, quick-swap (coins)
//   DNA LAB        fuse any two of your aliens and transform into the fusion on any watch (150 coins each)
//   VARIANTS       colour variants for an alien at 50 % and 100 % mastery
//   COMBO FINISHER transform or swap during a 5+ combo for a blast around you
//   MALFUNCTION    rarely the watch picks a different alien for you (can be turned off)
// State: player.f3 = { fav{}, badges{}, bossT{}, loadouts[], wup{}, lab[], variant{}, glitch }
// ============================================================================================
function F3() {
  const f = (player.f3 = player.f3 && typeof player.f3 === 'object' ? player.f3 : {});
  for (const k of ['fav', 'badges', 'bossT', 'wup', 'variant']) if (!f[k] || typeof f[k] !== 'object') f[k] = {};
  if (!Array.isArray(f.loadouts)) f.loadouts = [null, null, null];
  if (!Array.isArray(f.lab)) f.lab = [];
  if (f.glitch === undefined) f.glitch = true;
  return f;
}
const OUTDOOR = [0, 1, 2, 3, 4, 5, 7, 11, 13];
// ---------------- favours (side quests) ----------------
const FAVOURS = [
  { id: 'f1', who: 'Lucía, pescadora', text: 'Se me cayó la caja de cebos en la Ribera de luciérnagas. ¿Me la traes?', type: 'fetch', zone: 2, x: 1180, y: 740, reward: [120, 60] },
  { id: 'f2', who: 'Don Ramiro, frutero', text: 'Unos drones asustan a mis clientes del Mercado. Echa a 5.', type: 'clear', zone: 4, count: 5, reward: [160, 80] },
  { id: 'f3', who: 'Nora, guarda forestal', text: 'Perdí 3 sensores en las Ruinas del pinar. Están marcados en verde.', type: 'collect', zone: 0, spots: [[380, 690], [900, 760], [1360, 700]], reward: [180, 90] },
  { id: 'f4', who: 'Teo, repartidor', text: 'Lleva este paquete al Barrio residencial, junto a la casa del roble.', type: 'fetch', zone: 7, x: 1180, y: 760, reward: [140, 70] },
  { id: 'f5', who: 'Capitana Iris', text: 'Los Muelles están llenos de drones. Derrota a 8.', type: 'clear', zone: 5, count: 8, reward: [220, 110] },
  { id: 'f6', who: 'Profesor Alvar', text: 'Necesito 3 muestras de cristal de la Zona devastada.', type: 'collect', zone: 11, spots: [[420, 700], [820, 640], [1250, 740]], reward: [220, 110] },
  { id: 'f7', who: 'Mina, guía', text: 'Un turista se dejó la cámara en Ciudad Bahía, junto al puente rojo.', type: 'fetch', zone: 3, x: 1300, y: 760, reward: [150, 70] },
  { id: 'f8', who: 'Ingeniera Sol', text: 'La Central sigue inestable. Derrota 6 drones irradiados.', type: 'clear', zone: 13, count: 6, reward: [300, 150], need: () => SG().step >= 2 },
];
function favActive() { const f = F3().fav; return f.id ? FAVOURS.find((x) => x.id === f.id) : null; }
function favoursMenu(back) {
  const f = F3().fav, done = f.done || {}, act = favActive();
  showDialog('FAVORES', Object.keys(done).length + ' / ' + FAVOURS.length + ' completados',
    (act ? '<p class="reward"><b>En curso:</b> ' + act.who + ' — ' + act.text + ' (' + favStatus(act) + ')</p>' : '<p>Elige un favor. Solo uno a la vez.</p>') +
      '<div class="codex">' + FAVOURS.map((q) => { const ok = !q.need || q.need(); return '<button class="cx' + (done[q.id] || !ok ? ' locked' : '') + '" data-fav="' + q.id + '" style="--c:#ffe27a"><b>' + (done[q.id] ? '✔ ' : act && act.id === q.id ? '▶ ' : '') + q.who + '</b><small>' + (ok ? REGIONS[q.zone].name + ' · ' + q.reward[0] + ' EXP · ' + q.reward[1] + ' 🪙' : 'Más adelante en la historia') + '</small></button>'; }).join('') + '</div>',
    [...(act ? [['ABANDONAR', () => { F3().fav.id = null; save(); hud(); favoursMenu(back); }]] : []), ['VOLVER', back || pauseMenu]]);
  for (const b of document.querySelectorAll('[data-fav]'))
    b.onclick = () => {
      const q = FAVOURS.find((x) => x.id === b.dataset.fav);
      if (done[q.id] || (q.need && !q.need())) return;
      Object.assign(F3().fav, { id: q.id, n: 0, got: [] });
      toast('Favor aceptado · ' + q.who + ' · ' + REGIONS[q.zone].name);
      playWatchSFX('confirm');
      closeDialog(); hud(); save();
    };
}
function favStatus(q) { const f = F3().fav; return q.type === 'clear' ? Math.min(q.count, f.n || 0) + ' / ' + q.count : q.type === 'collect' ? (f.got || []).length + ' / ' + q.spots.length : 've a ' + REGIONS[q.zone].name; }
function favDone(q) {
  const f = F3().fav;
  (f.done = f.done || {})[q.id] = true;
  f.id = null;
  xp(q.reward[0]);
  player.coins = (player.coins || 0) + q.reward[1];
  toast('¡Favor cumplido! ' + q.who + ' · +' + q.reward[0] + ' EXP · +' + q.reward[1] + ' monedas');
  playWatchSFX('recharged');
  hud(); save();
}
function favNear() {
  const q = favActive();
  if (!q || zone !== q.zone) return null;
  if (q.type === 'fetch' && dist(player, q) < 110) return ['◆ ' + (q.id === 'f4' ? 'ENTREGAR PAQUETE' : 'RECOGER'), () => favDone(q)];
  if (q.type === 'collect') {
    const f = F3().fav, i = q.spots.findIndex((s, k) => !(f.got || []).includes(k) && Math.hypot(player.x - s[0], player.y - s[1]) < 110);
    if (i >= 0) return ['◆ RECOGER', () => { (f.got = f.got || []).push(i); burst(q.spots[i][0], q.spots[i][1] - 20, 16, '#7dff9a'); if (f.got.length >= q.spots.length) favDone(q); else { toast('Recogido ' + f.got.length + ' / ' + q.spots.length); hud(); } }];
  }
  return null;
}
function favKill() { const q = favActive(); if (q && q.type === 'clear' && zone === q.zone) { F3().fav.n = (F3().fav.n || 0) + 1; if (F3().fav.n >= q.count) favDone(q); else hud(); } }
// ---------------- zone bosses ----------------
const ZBOSS = { 0: 'Coloso del pinar', 1: 'Rey de los invasores', 2: 'Bestia del río', 3: 'Gran dron urbano', 4: 'Saqueador del mercado', 5: 'Pirata de los muelles', 7: 'Merodeador del barrio', 11: 'Chatarra viviente', 13: 'Núcleo descontrolado' };
let zbZone = -1;
function zoneBossCheck() {
  if (net.role === 'guest' || !ZBOSS[zone] || arenaOn() || rush.on || dun.on || (zone === 1 && quest.state !== 'done')) return;
  const f = F3(), now = Date.now();
  if (now - (f.bossT[zone] || 0) < 5 * 60 * 1000 || Math.random() > 0.35) return;
  f.bossT[zone] = now;
  const r = region(), x = (r.minX + r.maxX) / 2 + 300, y = (r.top + r.bottom) / 2, hp = Math.round(1400 * (1 + player.level * 0.06));
  enemies.push({ id: 650, x, y, homeX: x, homeY: y, face: -1, hp, max: hp, boss: true, zboss: ZBOSS[zone], kind: 'enemy', rcd: 1, cast: 0, stun: 0, alive: true, respawn: 1e9, cd: 1, wind: 0, anim: 0, hit: 0, moving: false, temp: true, modRolled: true, sagaKind: zone === 13 ? 'rad' : undefined });
  toast('¡JEFE DE ZONA! ' + ZBOSS[zone]);
  playWatchSFX('warning');
}
// ---------------- world events ----------------
const EVENTS = { meteor: ['LLUVIA DE METEOROS', 'Caen meteoros sobre los enemigos'], invasion: ['INVASIÓN', 'Más enemigos · EXP doble'], coins: ['LLUVIA DE MONEDAS', '+5 monedas por cada enemigo'], eclipse: ['ECLIPSE', 'Noche total · enemigos más fuertes · más EXP'] };
const wev = { kind: null, t: 0, next: 150 + Math.random() * 120, tick: 0 };
function eventTick(dt) {
  if (!started || !OUTDOOR.includes(zone)) return;
  if (wev.kind) {
    wev.t -= dt;
    if (wev.kind === 'meteor' && net.role !== 'guest') {
      wev.tick -= dt;
      const live = enemies.filter((e) => e.alive);
      if (wev.tick <= 0 && live.length) { wev.tick = 1.6; const e = live[Math.floor(Math.random() * live.length)]; effects.push({ type: 'meteor', x: e.x, y: e.y, t: 1.05, max: 1.05, r: 120, hit: false, damage: 45 * multiplier() }); }
    }
    if (wev.t <= 0) { toast('Evento terminado · ' + EVENTS[wev.kind][0]); wev.kind = null; wev.next = 180 + Math.random() * 180; }
    eventHud();
    return;
  }
  wev.next -= dt;
  if (wev.next <= 0 && !arenaOn() && !rush.on && !dun.on) {
    const ks = Object.keys(EVENTS);
    wev.kind = ks[Math.floor(Math.random() * ks.length)];
    wev.t = 60;
    if (wev.kind === 'invasion' && net.role !== 'guest') {
      const r = region();
      for (let i = 0; i < 4; i++) { const x = r.minX + 100 + Math.random() * (r.maxX - r.minX - 200), y = r.top + 30 + Math.random() * (r.bottom - r.top - 60); enemies.push({ id: 900 + i, x, y, homeX: x, homeY: y, face: -1, hp: 140, max: 140, kind: 'enemy', rcd: 1 + i * 0.4, cast: 0, stun: 0, alive: true, respawn: 1e9, cd: 1, wind: 0, anim: 0, hit: 0, moving: false, temp: true }); }
    }
    toast('¡EVENTO! ' + EVENTS[wev.kind][0] + ' · ' + EVENTS[wev.kind][1]);
    playWatchSFX('warning');
  }
  eventHud();
}
let evEl = null;
function eventHud() {
  if (!evEl) { evEl = document.createElement('div'); evEl.id = 'eventhud'; $('#game').append(evEl); }
  const on = !!wev.kind && started && OUTDOOR.includes(zone);
  evEl.classList.toggle('hidden', !on);
  if (on) { const t = '⚡ ' + EVENTS[wev.kind][0] + ' · ' + Math.ceil(wev.t) + ' s'; if (evEl.textContent !== t) evEl.textContent = t; }
}
// ---------------- night ----------------
function isNight() {
  if (wev.kind === 'eclipse') return true;
  const daylight = dayMode === 'día' ? 1 : dayMode === 'ciclo' ? (1 - Math.cos((clock / 90) * Math.PI)) / 2 : 0;
  return daylight < 0.3 && OUTDOOR.includes(zone);
}
const nightDmg = () => (isNight() ? 1.25 : 1);
const nightSpeed = () => (isNight() ? 1.12 : 1);
let wasNight = null;
// ---------------- weather ----------------
const WEATHERS = { clear: ['Despejado', ''], rain: ['Lluvia', 'aliens de agua +15 % · fuego −10 %'], storm: ['Tormenta', 'aliens eléctricos +20 %'], fog: ['Niebla', 'poca visibilidad'] };
const wx = { kind: 'clear', t: 120, drops: [] };
function weatherTick(dt) {
  wx.t -= dt;
  if (wx.t <= 0) {
    const r = Math.random();
    const k = r < 0.5 ? 'clear' : r < 0.75 ? 'rain' : r < 0.9 ? 'fog' : 'storm';
    wx.t = 150 + Math.random() * 90;
    if (k !== wx.kind && OUTDOOR.includes(zone)) toast('Tiempo: ' + WEATHERS[k][0] + (WEATHERS[k][1] ? ' · ' + WEATHERS[k][1] : ''));
    wx.kind = k;
  }
}
function weatherDmg() {
  if (!OUTDOOR.includes(zone)) return 1;
  const el = myElems();
  if (wx.kind === 'rain') return el.includes('water') ? 1.15 : el.includes('fire') ? 0.9 : 1;
  if (wx.kind === 'storm') return el.includes('electric') ? 1.2 : 1;
  return 1;
}
function weatherDraw() { // screen space, after the world (part-11)
  if (!started || !OUTDOOR.includes(zone) || wx.kind === 'clear') return;
  const n = lowGfx() ? 40 : 110;
  if (wx.kind === 'rain' || wx.kind === 'storm') {
    ctx.save(); ctx.strokeStyle = 'rgba(170,200,255,.45)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i < n; i++) { const x = (i * 97 + clock * 260 * (1 + (i % 3) * 0.2)) % (W + 60) - 30, y = (i * 53 + clock * 700) % (H + 40) - 20; ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 16); }
    ctx.stroke(); ctx.restore();
    if (wx.kind === 'storm' && Math.sin(clock * 0.9) > 0.995) { ctx.fillStyle = 'rgba(230,240,255,.35)'; ctx.fillRect(0, 0, W, H); }
  }
  if (wx.kind === 'fog') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(200,210,220,.05)'); g.addColorStop(0.6, 'rgba(200,210,220,.28)'); g.addColorStop(1, 'rgba(200,210,220,.38)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (isNight() && wev.kind === 'eclipse') { ctx.fillStyle = 'rgba(10,0,25,.35)'; ctx.fillRect(0, 0, W, H); }
}
// ---------------- plumber badges ----------------
function badgeSpots(z) {
  const r = REGIONS[z], R = seeded(1000 + z * 77), out = [];
  for (let tries = 0; out.length < 2 && tries < 60; tries++) {
    const x = r.minX + 80 + R() * (r.maxX - r.minX - 160), y = r.top + 20 + R() * (r.bottom - r.top - 40);
    if (!isSolid(x, y) && !out.some((p) => Math.abs(p[0] - x) < 300)) out.push([Math.round(x), Math.round(y)]);
  }
  return out;
}
const BADGE_ZONES = OUTDOOR.concat([6, 14]);
const badgeTotal = () => BADGE_ZONES.length * 2;
const badgeCount = () => Object.keys(F3().badges).length;
let badgeCache = {};
function badgeTick() {
  if (!BADGE_ZONES.includes(zone)) return;
  const spots = (badgeCache[zone] = badgeCache[zone] || badgeSpots(zone)), f = F3();
  spots.forEach(([x, y], i) => {
    const k = zone + ':' + i;
    if (f.badges[k] || Math.hypot(player.x - x, player.y - y) > 55) return;
    f.badges[k] = 1;
    player.coins = (player.coins || 0) + 25;
    burst(x, y - 20, 24, '#ffe27a');
    playWatchSFX('dna_added');
    const n = badgeCount();
    toast('INSIGNIA FONTANERO ' + n + ' / ' + badgeTotal() + ' · +25 monedas');
    if (n >= badgeTotal()) { player.coins += 2000; xp(1000); toast('¡TODAS LAS INSIGNIAS! · +2000 monedas · +1000 EXP'); }
    save();
  });
}
function badgeDraw() {
  if (!BADGE_ZONES.includes(zone)) return;
  const spots = (badgeCache[zone] = badgeCache[zone] || badgeSpots(zone)), f = F3();
  spots.forEach(([x, y], i) => {
    if (f.badges[zone + ':' + i]) return;
    const s = Math.abs(Math.cos(clock * 3)), yy = y - 26 + Math.sin(clock * 2 + i) * 4;
    ctx.save(); ctx.translate(x, yy); ctx.scale(Math.max(0.15, s), 1);
    ctx.fillStyle = '#ffd84a'; ctx.strokeStyle = '#5a3b06'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 - Math.PI / 2; ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a3b06'; ctx.fillRect(-2, -6, 4, 12);
    ctx.restore();
  });
}
// ---------------- fast travel ----------------
const TRAVEL_OK = [0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 13, 14];
function travelMenu(back) {
  const list = TRAVEL_OK.filter((i) => REGIONS[i] && discovered.includes(REGIONS[i].id) && (i !== 14 || SG().step >= 4));
  showDialog('VIAJE RÁPIDO', 'Zonas que ya has visitado', '<div class="codex">' + list.map((i) => '<button class="cx" data-go="' + i + '" style="--c:' + (REGIONS[i].color || '#8de5f3') + '"><b>' + (i === zone ? '▶ ' : '') + REGIONS[i].name + '</b><small>' + REGIONS[i].subtitle + '</small></button>').join('') + '</div>', [['VOLVER', back || pauseMenu]]);
  for (const b of document.querySelectorAll('[data-go]'))
    b.onclick = () => {
      const i = +b.dataset.go;
      if (net.role === 'guest' && net.peer) return toast('El anfitrión dirige los viajes');
      if (arenaOn() || rush.on || dun.on) return toast('Termina antes lo que estás haciendo');
      if (i === zone) return closeDialog();
      closeDialog();
      enterZone(i, 'center');
      playWatchSFX('activate');
    };
}
// ---------------- loadouts ----------------
function loadoutMenu(back) {
  const f = F3(), cur = (player.watchFav || []).filter((id) => ALIENS[id]);
  showDialog('EQUIPOS DE ALIENS', 'Tres grupos de favoritos',
    '<p>Guarda tus favoritos actuales (los que usa el cambio rápido) en un hueco y cámbialos de golpe. Favoritos ahora: <b>' + (cur.length ? cur.map((id) => ALIENS[id].name).join(', ') : 'ninguno · márcalos con F en el dial') + '</b></p>' +
      f.loadouts.map((l, i) => '<div class="xrow"><b>EQUIPO ' + 'ABC'[i] + '</b><small>' + (l && l.length ? l.map((id) => (ALIENS[id] ? ALIENS[id].name : id)).join(', ') : 'vacío') + '</small><span class="lbtns"><button class="pbtn" data-ls="' + i + '">GUARDAR</button><button class="pbtn main" data-lu="' + i + '">USAR</button></span></div>').join(''),
    [['VOLVER', back || pauseMenu]]);
  for (const b of document.querySelectorAll('[data-ls]')) b.onclick = () => { if (!cur.length) return toast('Marca primero favoritos en el dial (F)'); f.loadouts[+b.dataset.ls] = cur.slice(); save(); toast('Equipo ' + 'ABC'[+b.dataset.ls] + ' guardado'); loadoutMenu(back); };
  for (const b of document.querySelectorAll('[data-lu]')) b.onclick = () => { const l = f.loadouts[+b.dataset.lu]; if (!l || !l.length) return toast('Ese equipo está vacío'); player.watchFav = l.slice(); if (!player.alien) { player.selected = l[0]; ensureSelection(); } save(); hud(); toast('Equipo ' + 'ABC'[+b.dataset.lu] + ' activo'); playWatchSFX('select'); loadoutMenu(back); };
}
// ---------------- watch upgrades ----------------
const WUP = { bat: ['Batería', 'gasta un 10 % menos por nivel', [300, 600, 1000]], rec: ['Recarga', 'recarga un 15 % más rápido por nivel', [250, 500, 900]], swap: ['Cambio rápido', 'enfriamiento un 15 % menor por nivel', [300, 600, 1000]] };
const wupLv = (k) => Math.min(3, F3().wup[k] | 0);
const wupDrain = () => (omniActive() ? 1 - wupLv('bat') * 0.1 : 1);
const wupRecharge = () => (omniActive() ? 1 + wupLv('rec') * 0.15 : 1);
const wupSwap = () => 1 - wupLv('swap') * 0.15;
function watchUpgMenu(back) {
  showDialog('MEJORAS DEL RELOJ', (player.coins || 0) + ' monedas', '<div class="codex">' + Object.entries(WUP).map(([k, [n, d, costs]]) => { const lv = wupLv(k); return '<button class="cx" data-wup="' + k + '" style="--c:var(--ox)"><b>' + n + ' ' + '▮'.repeat(lv) + '▯'.repeat(3 - lv) + '</b><small>' + d + ' · ' + (lv >= 3 ? 'MÁXIMO' : costs[lv] + ' monedas') + '</small></button>'; }).join('') + '</div>', [['VOLVER', back || pauseMenu]]);
  for (const b of document.querySelectorAll('[data-wup]')) b.onclick = () => { const k = b.dataset.wup, lv = wupLv(k), c = WUP[k][2][lv]; if (lv >= 3) return; if ((player.coins || 0) < c) return toast('Te faltan ' + (c - player.coins) + ' monedas'); player.coins -= c; F3().wup[k] = lv + 1; playWatchSFX('dna_added'); save(); hud(); watchUpgMenu(back); };
}
// ---------------- DNA lab ----------------
let labA = null;
function labMenu(back) {
  const f = F3(), ids = codexIds().filter((id) => alienUnlocked(id) && CORE_ALIENS.includes(id));
  if (!omniActive()) return toast('El laboratorio de ADN es para portadores del Omnitrix');
  showDialog('LABORATORIO DE ADN', labA ? 'Elige el segundo alien (colores y poderes)' : 'Elige el primer alien (cuerpo)',
    (f.lab.length ? '<h4 class="shoph">Tus fusiones · toca para transformarte</h4><div class="codex">' + f.lab.map((fid) => { ensureFusion(fid); return ALIENS[fid] ? '<button class="cx" data-lab="' + fid + '" style="--c:' + (ALIENS[fid].color || '#b6ff4d') + '"><b>' + ALIENS[fid].name + '</b><small>' + fusionParts(fid).map((p) => ALIENS[p].name).join(' + ') + '</small></button>' : ''; }).join('') + '</div>' : '') +
      '<h4 class="shoph">Nueva fusión · 150 monedas · ' + (labA ? ALIENS[labA].name + ' + ?' : '? + ?') + '</h4><div class="codex">' + ids.filter((id) => id !== labA).map((id) => '<button class="cx" data-labp="' + id + '" style="--c:' + (ALIENS[id].color || '#7dff9a') + '"><b>' + ALIENS[id].name + '</b></button>').join('') + '</div>',
    [...(labA ? [['CANCELAR', () => { labA = null; labMenu(back); }]] : []), ['VOLVER', () => { labA = null; (back || pauseMenu)(); }]]);
  for (const b of document.querySelectorAll('[data-labp]'))
    b.onclick = () => {
      if (!labA) { labA = b.dataset.labp; return labMenu(back); }
      const fid = ensureFusion(labA, b.dataset.labp);
      labA = null;
      if (!fid) return toast('Esa fusión no es posible');
      if (f.lab.includes(fid)) return labMenu(back);
      if ((player.coins || 0) < 150) return toast('Necesitas 150 monedas'), labMenu(back);
      player.coins -= 150;
      f.lab.unshift(fid);
      if (f.lab.length > 8) f.lab.length = 8;
      toast('¡Fusión creada! ' + ALIENS[fid].name);
      playWatchSFX('dna_added');
      save();
      labMenu(back);
    };
  for (const b of document.querySelectorAll('[data-lab]'))
    b.onclick = () => {
      if (player.alien) return toast('Vuelve a humano primero');
      if (player.battery <= 0) return toast('Batería vacía');
      player.selected = b.dataset.lab;
      closeDialog();
      transform({ fromSelector: true });
    };
}
const labFusionOk = (id) => isFusionId(id) && F3().lab.includes(id) && !!ALIENS[id];
// ---------------- mastery variants ----------------
const VARIANTS = [['Original', ''], ['Variante (50 %)', 'hue-rotate(110deg) saturate(1.2)'], ['Dorada (100 %)', 'sepia(.85) saturate(2.6) hue-rotate(-12deg) brightness(1.08)']];
function variantFilter() {
  if (!player.alien) return '';
  const v = F3().variant[player.activeAlien] | 0, m = (player.masteries && player.masteries[player.activeAlien]) || 0;
  if (v === 2 && m < 100) return '';
  if (v === 1 && m < 50) return '';
  return VARIANTS[v] ? VARIANTS[v][1] : '';
}
function variantMenu(back) {
  const ids = codexIds().filter((id) => alienUnlocked(id) && ((player.masteries && player.masteries[id]) || 0) >= 50);
  showDialog('VARIANTES DE COLOR', 'Se desbloquean con la maestría', '<p>Al 50 % de maestría: una variante de color. Al 100 %: la versión dorada.</p><div class="codex">' + (ids.length ? ids.map((id) => { const v = F3().variant[id] | 0, m = Math.floor(player.masteries[id]); return '<button class="cx" data-var="' + id + '" style="--c:' + (ALIENS[id].color || '#7dff9a') + '"><b>' + ALIENS[id].name + '</b><small>' + VARIANTS[v][0] + ' · maestría ' + m + ' % · toca para cambiar</small></button>'; }).join('') : '<p>Ningún alien llega aún al 50 % de maestría.</p>') + '</div>', [['VOLVER', back || pauseMenu]]);
  for (const b of document.querySelectorAll('[data-var]')) b.onclick = () => { const id = b.dataset.var, m = player.masteries[id] || 0, max = m >= 100 ? 2 : 1; F3().variant[id] = ((F3().variant[id] | 0) + 1) % (max + 1); save(); variantMenu(back); };
}
// ---------------- combo finisher + malfunction (statEvent 'transform', part-34) ----------------
function onTransformEvent(id) {
  if (typeof combo !== 'undefined' && combo.n >= 5 && started) {
    const n = combo.n, d = n * 8 * multiplier();
    areaHit(player.x, player.y, 190, d, 0.6);
    effects.push({ type: 'resonance', x: player.x, y: player.y, r: 190, t: 0.5, max: 0.5, color: '#ffd84a' });
    flash = 0.25;
    toast('¡FINAL DE COMBO! ×' + n + ' · ' + Math.round(d) + ' de daño en área');
  }
  if (F3().glitch && omniActive() && !isFusionId(id) && Math.random() < 0.03) {
    const l = watchPlaylist().filter((x) => x !== id && ALIENS[x]);
    if (!l.length) return;
    const pick = l[Math.floor(Math.random() * l.length)];
    setTimeout(() => {
      if (!player.alien) return;
      const cfg = quickSwapCfg(), cool = player.swapCool;
      player.swapCool = 0;
      if (cfg) watchSwap(pick);
      else { player.activeAlien = pick; player.cool = player.cooldowns[pick]; player.hp = Math.min(maxHP(), player.hp); hud(); }
      player.swapCool = cool;
      toast('¡FALLO DEL OMNITRIX! Te has convertido en ' + ALIENS[pick].name);
      playWatchSFX('error');
    }, 700);
  }
}
// ---------------- tick / draw / hud / interact ----------------
let f3ZoneSeen = -1;
function f3Tick(dt) {
  F3();
  if (zone !== f3ZoneSeen) { f3ZoneSeen = zone; setTimeout(zoneBossCheck, 1500); }
  eventTick(dt);
  weatherTick(dt);
  badgeTick();
  const n = isNight();
  if (started && n !== wasNight) { if (n && wasNight === false && OUTDOOR.includes(zone)) toast('Cae la noche · enemigos más fuertes · +EXP'); wasNight = n; }
}
function f3Draw() {
  badgeDraw();
  const q = favActive();
  if (q && zone === q.zone) {
    const pts = q.type === 'fetch' ? [[q.x, q.y]] : q.type === 'collect' ? q.spots.filter((s, k) => !(F3().fav.got || []).includes(k)) : [];
    for (const [x, y] of pts) { ctx.save(); ctx.strokeStyle = '#7dff9a'; ctx.lineWidth = 3; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(clock * 5); ctx.beginPath(); ctx.ellipse(x, y, 34, 11, 0, 0, 7); ctx.stroke(); ctx.restore(); txt('▼', x, y - 40 - Math.sin(clock * 4) * 5, 16, '#7dff9a'); }
  }
}
function f3DrawEnemyLabel(e) { if (e.zboss && e.alive) txt('JEFE DE ZONA · ' + e.zboss.toUpperCase(), e.x, e.y - 140, 9, '#ffb59a'); }
function f3Kill(e) {
  favKill();
  if (wev.kind === 'coins') { player.coins = (player.coins || 0) + 5; popup(e.x - 20, e.y - 110, '+5 🪙', '#ffe27a'); }
  if (wev.kind === 'invasion') xp(10);
  if (isNight()) xp(4);
  if (e.zboss) { xp(150); player.coins = (player.coins || 0) + 80; toast('¡Jefe de zona derrotado! ' + e.zboss + ' · +150 EXP · +80 monedas'); }
}
function f3Hud() {
  const n = favNear();
  if (n) { $('#talk').classList.remove('hidden'); $('#talk').textContent = n[0]; }
  const q = favActive();
  if (!q || activeMission() || sagaActive() || (F1().s3.step >= 1 && F1().s3.step <= 4) || [6, 8, 9, 10, 12].includes(zone)) return;
  $('#mission .tiny').textContent = 'FAVOR · ' + q.who.toUpperCase();
  $('#questtext').textContent = q.text.length > 46 ? q.text.slice(0, 44) + '…' : q.text;
  $('#questsub').textContent = REGIONS[q.zone].name + ' · ' + favStatus(q);
}
let f3LastNear = '';
function f3Near() { const n = favNear(); const l = n ? n[0] : ''; if (l !== f3LastNear) { f3LastNear = l; hud(); } return n; }
function f3Interact() { if (!started) return false; const n = favNear(); if (!n) return false; n[1](); return true; }
setInterval(() => { try { if (started) f3Near(); } catch (e) {} }, 300);
applyWatchTheme();
resize();
boot();
requestAnimationFrame(loop);
// QA hooks for the 0.15 systems (only with ?qa=1, like the rest of __game)
if (window.__game)
  window.__game.X = {
    missionBoard, missionAccept, activeMission, MS, MISSIONS, coopOn, coopState, coopShare, coopTickMissions, COOP_SITES,
    arenaStart, arenaEnd, arena, arenaBest, statEvent, stats, daily, dailyMenu, achMenu, achCheck, ACHS, codexMenu, codexCard, codexIds, extrasMenu, difficultyMenu, diffCfg, diffKey, DIFFS, PAD, padPoll, padHelp,
    watchAnim, WATCH_ERAS, eraPlaylist, eraOf, storyPlay, storyFor, storyDraw, storyFit, storyPreload, BOARDS, SHEET_ROWS, SKIN_ART, boardId,
    F3, favoursMenu, wev, wx, eventTick, zoneBossCheck, badgeSpots, badgeTotal, travelMenu, loadoutMenu, watchUpgMenu, labMenu, variantMenu, onTransformEvent, isNight, weatherDmg, drainRate, F2, dmgMod, perfectDodgeCheck, featSlow, towerStart, dun, trainingToggle, dummyDps, weeklyMenu, WK, prestigeMenu, titlesMenu, shopMenu, collectionMenu, LEVEL_CAP, hostileShots, F1, upgradeMenu, ultraFire, combo, rush, bossRushStart, emoteSend, photoMode, photoExit, dailyLogin, transferMenu, story3Talk, s3Go, pet, upgDmg, multiplier, transform, damageEnemy, SG, sagaGo, sagaTalkVera, sagaInteract, sagaNear, VERA, DRAVEN, VALVES, enterZone, BX, scanStart, bestiaryMenu, gfxCycle, lowGfx, absorb, grantAlien, alienUnlocked, REGIONS,
    get enemies() { return enemies; },
    get sagaCineOn() { return sagaCineOn; },
    get scan() { return scan; },
    get storyRun() { return storyRun; },
    get net() { return net; },
    get zone() { return zone; },
  };
})();
