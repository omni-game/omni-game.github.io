'use strict';
// ZENITH BURST — game data: fighters, stages and the story campaign.
window.ZB = window.ZB || {};

// Super move types (see battle.js): beam, rush, volley, bomb, disk, nova.
ZB.ROSTER = [
  {
    id: 'kairo', name: 'Kairo', title: 'The Last Vashari', body: 'normal', hair: 'spiky',
    bio: 'Raised on the frontier world of Teralune, Kairo never knew he was the last of a warrior race whose power grows with every battle.',
    colors: { skin: 0xf1c7a0, gi: 0x168a8f, gi2: 0xf4f1ea, belt: 0x1d2b53, boots: 0x2a2a3a, eyes: 0x1b1b1b },
    hp: 12000, spd: 1.0, pow: 1.0,
    forms: [
      { name: 'Base', hair: 0x1c1c26, aura: 0xbfe6ff, mult: 1.0 },
      { name: 'Ascended', hair: 0xffd23a, aura: 0xffc933, mult: 1.18, hairScale: 1.15, eyes: 0x15a89a, cost: 2 },
      { name: 'Ascended Fury', hair: 0xffe066, aura: 0xffe36b, mult: 1.33, hairScale: 1.35, eyes: 0x15a89a, spark: true, cost: 2 },
      { name: 'Zenith', hair: 0xe3ecff, aura: 0xdfe8ff, mult: 1.55, hairScale: 1.2, eyes: 0x9aa7ff, spark: true, cost: 3 },
    ],
    supers: [
      { name: 'Solar Lance', type: 'beam', dmg: 1900, cost: 200, color: 0x4fc3ff },
      { name: 'Comet Rush', type: 'rush', dmg: 1500, cost: 150, color: 0x9fe8ff },
    ],
    ultimate: { name: 'Zenith Cannon', type: 'beam', dmg: 4200, color: 0x7fd8ff, width: 2.4 },
  },
  {
    id: 'rhen', name: 'Rhen', title: 'Prince of Ash', body: 'normal', hair: 'tall',
    bio: 'Heir to a fallen empire, Rhen crossed the stars to defeat the one warrior he could never surpass. Pride is both his fuel and his flaw.',
    colors: { skin: 0xe9bd95, gi: 0x1b2a4a, gi2: 0xf2f2f2, belt: 0xd8b84a, boots: 0xf2f2f2, eyes: 0x111111 },
    hp: 11500, spd: 1.02, pow: 1.04,
    forms: [
      { name: 'Base', hair: 0x141420, aura: 0xd9c8ff, mult: 1.0 },
      { name: 'Ascended', hair: 0xffd23a, aura: 0xffcc33, mult: 1.2, hairScale: 1.12, eyes: 0x15a89a, cost: 2 },
      { name: 'Crimson Zenith', hair: 0xff3b4e, aura: 0xff2d48, mult: 1.5, hairScale: 1.25, eyes: 0xff9aa5, spark: true, cost: 3 },
    ],
    supers: [
      { name: 'Ashfall Volley', type: 'volley', dmg: 1500, cost: 150, color: 0xffd24a },
      { name: 'Regal Breaker', type: 'beam', dmg: 2000, cost: 220, color: 0xb57bff },
    ],
    ultimate: { name: 'Crown Nova', type: 'bomb', dmg: 4300, color: 0xffe27a },
  },
  {
    id: 'mira', name: 'Mira', title: 'Wind Blade Monk', body: 'slim', hair: 'pony',
    bio: 'A temple guardian who turns breath into blades. She is the fastest fighter on Teralune and Kairo’s oldest sparring partner.',
    colors: { skin: 0xc98d62, gi: 0xb3242f, gi2: 0xf3e7d3, belt: 0x222222, boots: 0x222222, eyes: 0x2b1a10 },
    hp: 10500, spd: 1.14, pow: 0.95,
    forms: [
      { name: 'Base', hair: 0x2a1b14, aura: 0xc8ffe4, mult: 1.0 },
      { name: 'Gale Mode', hair: 0x2a1b14, aura: 0x58f0a7, mult: 1.18, cost: 2 },
      { name: 'Tempest', hair: 0x7af5c9, aura: 0x41ffb0, mult: 1.34, hairScale: 1.1, spark: true, cost: 2 },
    ],
    supers: [
      { name: 'Crescent Disk', type: 'disk', dmg: 1600, cost: 160, color: 0x7dffcf },
      { name: 'Hundred Gale Palms', type: 'rush', dmg: 1500, cost: 150, color: 0xbfffe6 },
    ],
    ultimate: { name: 'Heaven Splitter', type: 'beam', dmg: 4000, color: 0x5affb8, width: 2.0 },
  },
  {
    id: 'nx9', name: 'NX-9', title: 'Infinite Android', body: 'normal', hair: 'visor',
    bio: 'A combat android built by an emperor’s scientists. Its reactor never runs dry, so its ki slowly refills on its own.',
    colors: { skin: 0xd9dde3, gi: 0x2d3340, gi2: 0x6fd6ff, belt: 0x6fd6ff, boots: 0x1a1d24, eyes: 0x00e5ff },
    hp: 11000, spd: 1.0, pow: 1.0, kiRegen: 14,
    forms: [
      { name: 'Standard', hair: 0x23262e, aura: 0x9ff3ff, mult: 1.0 },
      { name: 'Overclock', hair: 0x23262e, aura: 0x00e5ff, mult: 1.28, eyes: 0xff3355, spark: true, cost: 2 },
    ],
    supers: [
      { name: 'Photon Barrage', type: 'volley', dmg: 1500, cost: 150, color: 0x6fe9ff },
      { name: 'Null Field', type: 'nova', dmg: 1600, cost: 170, color: 0x9ff3ff },
    ],
    ultimate: { name: 'Terminus Ray', type: 'beam', dmg: 4000, color: 0x00d0ff, width: 2.2 },
  },
  {
    id: 'zorath', name: 'Zorath', title: 'Tyrant Emperor', body: 'slim', hair: 'horns',
    bio: 'Ruler of four hundred conquered worlds. He keeps his true power sealed, because no one has ever been worth releasing it for.',
    colors: { skin: 0xf2eef5, gi: 0x5a2a7a, gi2: 0x8a4fb3, belt: 0x5a2a7a, boots: 0xf2eef5, eyes: 0xd0103a },
    hp: 12500, spd: 1.04, pow: 1.05,
    forms: [
      { name: 'Sealed Form', hair: 0x26182e, aura: 0xd27bff, mult: 1.0 },
      { name: 'True Form', hair: 0x8a4fb3, aura: 0xc04dff, mult: 1.22, cost: 2 },
      { name: 'Gilded Form', hair: 0xf0c12a, aura: 0xffcf3a, mult: 1.45, skin: 0xf3c54a, spark: true, cost: 3 },
    ],
    supers: [
      { name: 'Doom Needles', type: 'volley', dmg: 1500, cost: 150, color: 0xff4fa5 },
      { name: 'Imperial Wrath', type: 'bomb', dmg: 2000, cost: 220, color: 0xff7ad9 },
    ],
    ultimate: { name: 'World Ender', type: 'bomb', dmg: 4400, color: 0xff3c8e, size: 1.5 },
  },
  {
    id: 'kragor', name: 'Kragor', title: 'The Berserker', body: 'bulky', hair: 'wild',
    bio: 'A warrior whose power was too great to control, sealed in ice for a thousand years. Something has thawed the ice.',
    colors: { skin: 0xd9a67f, gi: 0xe8e2cf, gi2: 0x7c1f1f, belt: 0x7c1f1f, boots: 0x3a2a1a, eyes: 0x222222 },
    hp: 14000, spd: 0.92, pow: 1.12,
    forms: [
      { name: 'Restrained', hair: 0x1a1a1a, aura: 0xb9ffb0, mult: 1.0 },
      { name: 'Berserk', hair: 0x8dff6a, aura: 0x6dff4a, mult: 1.25, hairScale: 1.2, eyes: 0xffffff, cost: 2 },
      { name: 'Cataclysm', hair: 0xb6ff5c, aura: 0x9dff3a, mult: 1.45, hairScale: 1.4, eyes: 0xffffff, spark: true, scale: 1.12, cost: 3 },
    ],
    supers: [
      { name: 'Gigant Meteor', type: 'bomb', dmg: 1900, cost: 200, color: 0x8dff6a },
      { name: 'Berserker Charge', type: 'rush', dmg: 1700, cost: 170, color: 0xc2ff9a },
    ],
    ultimate: { name: 'Omega Eruption', type: 'nova', dmg: 4400, color: 0x8dff4a, size: 1.6 },
  },
  {
    id: 'mogra', name: 'Mogra', title: 'The Glutton Demon', body: 'blob', hair: 'antenna',
    bio: 'An ancient demon of pure chaos, bound inside a clay jar until a careless thief opened it. It laughs at everything, including pain.',
    colors: { skin: 0xe882b4, gi: 0xf6f0e0, gi2: 0x4b2a6a, belt: 0xf2c14e, boots: 0xf2c14e, eyes: 0x111111 },
    hp: 13000, spd: 0.96, pow: 1.02,
    forms: [
      { name: 'Jolly', hair: 0xe882b4, aura: 0xff9ad1, mult: 1.0 },
      { name: 'Ravenous', hair: 0xd85aa0, aura: 0xff4fb0, mult: 1.3, skin: 0xd85aa0, slim: true, spark: true, cost: 2 },
    ],
    supers: [
      { name: 'Sugar Ray', type: 'beam', dmg: 1800, cost: 190, color: 0xff7ac8 },
      { name: 'Rubber Rampage', type: 'rush', dmg: 1600, cost: 160, color: 0xffb3dc },
    ],
    ultimate: { name: 'Abyss Maw', type: 'nova', dmg: 4200, color: 0xff3fa8, size: 1.5 },
  },
  {
    id: 'valdris', name: 'Valdris', title: 'God of Unmaking', body: 'slim', hair: 'god',
    bio: 'When a universe grows too crowded with power, Valdris wakes to thin it out. He has slept for sixty years. He is not pleased.',
    colors: { skin: 0x9d86c9, gi: 0x161616, gi2: 0xd9b45a, belt: 0xd9b45a, boots: 0xd9b45a, eyes: 0x8af3ff },
    hp: 15000, spd: 1.08, pow: 1.18,
    forms: [
      { name: 'Godly Calm', hair: 0x9d86c9, aura: 0xa66bff, mult: 1.0 },
      { name: 'Unbound', hair: 0x9d86c9, aura: 0x7a2dff, mult: 1.25, spark: true, cost: 3 },
    ],
    supers: [
      { name: 'Erasure Sphere', type: 'bomb', dmg: 2100, cost: 220, color: 0xb98aff },
      { name: 'Divine Strike', type: 'rush', dmg: 1800, cost: 170, color: 0xd6c2ff },
    ],
    ultimate: { name: 'Unmaking', type: 'nova', dmg: 4800, color: 0x8a4bff, size: 1.7 },
  },
  {
    id: 'oriel', name: 'Oriel', title: 'Herald of the Throne', body: 'slim', hair: 'halo',
    bio: 'Attendant, teacher and keeper of balance. Nobody has ever seen Oriel try. Nobody is sure what would happen if Oriel did.',
    colors: { skin: 0x8fb6e8, gi: 0x2b2f6b, gi2: 0xf2f2ff, belt: 0xf2f2ff, boots: 0xf2f2ff, eyes: 0xffffff },
    hp: 16000, spd: 1.16, pow: 1.2,
    forms: [
      { name: 'Serene', hair: 0xf4f6ff, aura: 0xe8f1ff, mult: 1.0 },
    ],
    supers: [
      { name: 'Prism Lance', type: 'beam', dmg: 2100, cost: 200, color: 0xe8f1ff },
      { name: 'Serene Barrage', type: 'volley', dmg: 1700, cost: 160, color: 0xc9dcff },
    ],
    ultimate: { name: 'Absolute Silence', type: 'nova', dmg: 5000, color: 0xffffff, size: 1.7 },
  },
];
ZB.byId = (id) => ZB.ROSTER.find((r) => r.id === id);

ZB.STAGES = [
  { id: 'wasteland', name: 'Crimson Wasteland', sky: [0xf6b26b, 0xe2614a], ground: 0xa0552c, ground2: 0x7a3d1f, fog: 0xe9906a, props: 'mesa', sun: 0xfff0d0 },
  { id: 'city', name: 'Ruined Metropolis', sky: [0x9bb4cc, 0x55657a], ground: 0x5b5f66, ground2: 0x43464c, fog: 0x8495a8, props: 'city', sun: 0xffffff },
  { id: 'glacier', name: 'Frozen Expanse', sky: [0xbfe6ff, 0x4f8fd1], ground: 0xe6f2fb, ground2: 0xb9d6ee, fog: 0xc8e2f6, props: 'ice', sun: 0xffffff },
  { id: 'realm', name: 'Celestial Realm', sky: [0x3a1d6e, 0x0d0624], ground: 0x2a1650, ground2: 0x1a0d36, fog: 0x2a1650, props: 'crystal', sun: 0xd8c8ff },
  { id: 'arena', name: 'Arena of the Throne', sky: [0x1a2a5a, 0x05081a], ground: 0x8a8fa3, ground2: 0x6b7085, fog: 0x1a2a5a, props: 'arena', sun: 0xe8f1ff },
];
ZB.stageById = (id) => ZB.STAGES.find((s) => s.id === id) || ZB.STAGES[0];

// Story campaign.
// Episode fields: player, enemy, pForm/eForm (starting forms), stage, ai (0..1), goal ('win' | 'survive'), time (seconds for survive),
// intro/outro: dialogue lines [speakerId or 'nar', text], events: mid-fight triggers, unlock: rewards, choice: branch after clear.
ZB.CAMPAIGN = [
  {
    id: 'arrival', name: 'Arrival Saga', color: '#ffb347',
    blurb: 'A pod falls from the sky over Teralune, and a prince comes looking for the last of his kind.',
    episodes: [
      {
        id: 'e1', name: 'A Stranger From the Stars', player: 'kairo', enemy: 'rhen', stage: 'wasteland', ai: 0.25, goal: 'win',
        tip: 'Tutorial: J to rush, K (hold) to smash, L for ki blasts, hold I to charge ki. Hold U + J/K for supers.',
        intro: [
          ['nar', 'Teralune. A quiet frontier world at the edge of known space.'],
          ['nar', 'Tonight, a burning pod tears across the sky and slams into the Crimson Wasteland.'],
          ['rhen', 'So this is where you’ve been hiding. The last Vashari, playing farmer on a rock.'],
          ['kairo', 'I don’t know who you are, but you just crushed half of my crops.'],
          ['rhen', 'I am Rhen, heir to the Vashari throne. Show me if your blood is worth anything!'],
        ],
        outro: [
          ['rhen', 'Tch… you hold back even now. How insulting.'],
          ['kairo', 'You’re strong. Why are you really here?'],
          ['rhen', 'Because something is coming for both of us. An emperor who ended our people.'],
        ],
        unlock: { chars: ['rhen'] },
      },
      {
        id: 'e2', name: 'Pride of a Prince', player: 'rhen', enemy: 'kairo', stage: 'glacier', ai: 0.4, goal: 'win',
        tip: 'Press O just as a melee hit lands to VANISH behind your attacker (costs ki).',
        intro: [
          ['nar', 'Three days later, on the northern ice fields.'],
          ['rhen', 'Again. You won’t get stronger if you fight me with half your heart.'],
          ['kairo', 'Fine. But if I win, you help me protect this planet.'],
          ['rhen', 'And if I win, you come with me to the stars. Agreed.'],
        ],
        outro: [
          ['kairo', 'Not bad, your highness.'],
          ['rhen', 'Mark my words, Kairo. One day I will surpass you, and you will know it.'],
        ],
      },
      {
        id: 'e3', name: 'The Iron Sentinel', player: 'mira', enemy: 'nx9', stage: 'city', ai: 0.45, goal: 'win',
        tip: 'When your ki is full, keep holding charge to enter SPARKING mode. Only Sparking fighters can use their Ultimate (U + L).',
        intro: [
          ['nar', 'Meanwhile, in the capital, a silver figure walks out of the smoke.'],
          ['nx9', 'Target: lifeforms with combat rating above nine thousand. Begin extermination.'],
          ['mira', 'You picked the wrong temple to walk past, tin can.'],
        ],
        outro: [
          ['nx9', 'Reactor… at… four percent. Emperor Zorath… will… arrive.'],
          ['mira', 'Zorath? I need to find Kairo. Now.'],
        ],
        unlock: { chars: ['mira', 'nx9'] },
      },
      {
        id: 'e4', name: 'The Emperor Descends', player: 'kairo', enemy: 'zorath', stage: 'wasteland', ai: 0.5, goal: 'survive', time: 60,
        tip: 'Survive! Keep moving, guard with O and dash sideways (Shift) to dodge beams.',
        intro: [
          ['nar', 'A warship the size of a mountain blots out the sun.'],
          ['zorath', 'A Vashari. How quaint. I thought I had swept your kind away like dust.'],
          ['kairo', 'You’re the one who destroyed Rhen’s homeworld.'],
          ['zorath', 'Destroyed? I merely tidied it. Now hold still while I tidy you.'],
        ],
        events: [{ who: 'enemy', below: 0.6, form: 1, lines: [['zorath', 'You made me break the seal. Do you understand what that means?']] }],
        outro: [
          ['zorath', 'You are still standing? Interesting.'],
          ['rhen', 'Kairo! Step aside. This is MY revenge!'],
        ],
        choice: {
          prompt: 'Rhen arrives, burning with rage. What does Kairo do?',
          options: [
            { label: 'Fight Zorath together, but Kairo leads', next: 'e5', note: 'Main story' },
            { label: 'Let Rhen take his revenge', next: 'w1', note: 'What-If story' },
          ],
        },
      },
      {
        id: 'e5', name: 'Golden Awakening', player: 'kairo', enemy: 'zorath', eForm: 1, stage: 'wasteland', ai: 0.55, goal: 'win',
        intro: [
          ['rhen', 'Fine. But if you fall, I won’t catch you.'],
          ['zorath', 'Two insects, one boot. Let us be efficient.'],
        ],
        events: [
          { who: 'player', below: 0.45, form: 1, heal: 0.25, unlockForm: true, lines: [
            ['zorath', 'Your little prince is down. And you are next.'],
            ['kairo', 'Rhen… everyone on this planet… I won’t let you take them!'],
            ['nar', 'Something ancient breaks open inside Kairo. His hair blazes gold.'],
            ['zorath', 'Th-that light… the Ascended Vashari of legend?!'],
          ] },
          { who: 'enemy', below: 0.4, form: 2, lines: [['zorath', 'ENOUGH! Behold the form I never needed: GILDED!']] },
        ],
        outro: [
          ['zorath', 'Impossible… I am the emperor of four hundred worlds!'],
          ['kairo', 'Then go rule them. And never come back here.'],
          ['nar', 'Zorath flees into the stars. Kairo has awakened ASCENDED form.'],
        ],
        unlock: { chars: ['zorath'], forms: { kairo: 1 } },
      },
      {
        id: 'w1', name: 'What If: The Prince’s Revenge', player: 'rhen', enemy: 'zorath', eForm: 1, stage: 'wasteland', ai: 0.55, goal: 'win', whatIf: true,
        intro: [
          ['kairo', 'He’s yours, Rhen. Make it count.'],
          ['rhen', 'For my father. For my people. For every world you burned!'],
          ['zorath', 'The little prince has teeth. Let me pull them.'],
        ],
        events: [
          { who: 'player', below: 0.45, form: 1, heal: 0.25, lines: [
            ['rhen', 'I swore… on the ashes of my home… I would not kneel!'],
            ['nar', 'Rhen’s rage ignites into a golden storm. He has Ascended before Kairo.'],
          ] },
        ],
        outro: [
          ['rhen', 'It is done. The empire falls with you.'],
          ['kairo', 'You did it, Rhen.'],
          ['rhen', 'Don’t look so relieved. You’re next on my list.'],
          ['nar', 'WHAT-IF ENDING: The Prince reclaims his honor. Rhen’s Ascended form is unlocked.'],
        ],
        unlock: { chars: ['zorath'], forms: { rhen: 1 } },
      },
    ],
  },
  {
    id: 'berserker', name: 'Berserker Saga', color: '#8dff6a',
    blurb: 'The northern ice cracks open. Something inside it has been screaming for a thousand years.',
    episodes: [
      {
        id: 'e6', name: 'A Roar Beneath the Ice', player: 'rhen', pForm: 1, enemy: 'kragor', stage: 'glacier', ai: 0.55, goal: 'survive', time: 60,
        intro: [
          ['nar', 'Six months of peace. Then, the glacier explodes.'],
          ['kragor', 'VASHARI…! I smell… VASHARI…!'],
          ['rhen', 'A Vashari? Alive? Who are you?'],
          ['kragor', 'KRAGOR! The one your kings sealed away!'],
        ],
        events: [{ who: 'enemy', below: 0.65, form: 1, lines: [['kragor', 'RRAAAAAGH!!']] }],
        outro: [
          ['rhen', 'His power keeps climbing. There’s no ceiling…'],
          ['kairo', 'Rhen, fall back! I’ve got him!'],
        ],
        unlock: { forms: { rhen: 1 } },
      },
      {
        id: 'e7', name: 'Unstoppable', player: 'kairo', pForm: 1, enemy: 'kragor', eForm: 1, stage: 'wasteland', ai: 0.6, goal: 'win',
        tip: 'Hold T to transform when you have enough skill orbs (the diamonds under your ki bar).',
        intro: [
          ['kragor', 'MORE! GIVE ME MORE!'],
          ['kairo', 'He’s not fighting with his head. Maybe I can wear him out.'],
        ],
        events: [{ who: 'enemy', below: 0.4, form: 2, lines: [['kragor', 'CATACLYYYSM!!']] }],
        outro: [
          ['kairo', 'He’s… crying?'],
          ['kragor', 'Make it… stop… the noise… in my head…'],
          ['nar', 'Kairo pushed past his limit. ASCENDED FURY unlocked.'],
        ],
        unlock: { chars: ['kragor'], forms: { kairo: 2 } },
      },
      {
        id: 'e8', name: 'Crimson Resolve', player: 'rhen', pForm: 1, enemy: 'kragor', eForm: 2, stage: 'glacier', ai: 0.62, goal: 'win',
        intro: [
          ['rhen', 'Kairo is spent. Then it falls to me, as it should.'],
          ['kragor', 'Little prince… your father… sealed me…!'],
          ['rhen', 'Then let his son finish what he started!'],
        ],
        events: [
          { who: 'player', below: 0.4, form: 2, heal: 0.3, unlockForm: true, lines: [
            ['rhen', 'I am not Kairo’s shadow… I am not my father’s ghost…'],
            ['rhen', 'I AM RHEN!!'],
            ['nar', 'A crimson blaze erupts. A form no Vashari has ever reached.'],
          ] },
        ],
        outro: [
          ['kragor', '…quiet. It’s finally… quiet.'],
          ['rhen', 'Rest, brother. You’re free.'],
          ['nar', 'Rhen unlocked CRIMSON ZENITH.'],
        ],
        unlock: { forms: { rhen: 2 } },
      },
    ],
  },
  {
    id: 'unmaker', name: 'Unmaker Saga', color: '#b98aff',
    blurb: 'A god of destruction wakes, and a demon is freed. The universe has decided Teralune has grown too strong.',
    episodes: [
      {
        id: 'e9', name: 'Sweet Catastrophe', player: 'mira', pForm: 1, enemy: 'mogra', stage: 'city', ai: 0.6, goal: 'win',
        intro: [
          ['nar', 'A thief opens a clay jar in the capital museum.'],
          ['mogra', 'Hee hee! Free! Mogra wants a snack. A big one. Like the whole city!'],
          ['mira', 'Kairo is training off-world. Guess I’m on babysitting duty.'],
        ],
        events: [{ who: 'enemy', below: 0.5, form: 1, lines: [['mogra', 'No more games. Mogra is HUNGRY.']] }],
        outro: [
          ['mogra', 'Ow ow ow! Okay! Mogra stops! Mogra is good now. Mostly.'],
          ['mira', '…Do you want some rice cakes?'],
          ['mogra', 'YES!'],
        ],
        unlock: { chars: ['mogra'], forms: { mira: 2 } },
      },
      {
        id: 'e10', name: 'The God Awakens', player: 'kairo', pForm: 2, enemy: 'valdris', stage: 'realm', ai: 0.72, goal: 'survive', time: 75,
        intro: [
          ['oriel', 'Valdris, my lord. You have arrived on Teralune.'],
          ['valdris', 'So this is the planet making all that noise. Which one of you is the loud one?'],
          ['kairo', 'That’d be me. Want to see how loud I can get?'],
          ['valdris', '…Bold. Entertain me, and I may let the planet live.'],
        ],
        outro: [
          ['valdris', 'You lasted longer than most stars do.'],
          ['kairo', '(He wasn’t even trying…)'],
        ],
      },
      {
        id: 'e11', name: 'Beyond the Limit', player: 'kairo', pForm: 2, enemy: 'valdris', stage: 'realm', ai: 0.75, goal: 'win',
        intro: [
          ['valdris', 'Playtime is over. I will unmake this world now.'],
          ['kairo', 'Everyone lent me their strength. I won’t waste it.'],
        ],
        events: [
          { who: 'enemy', below: 0.7, form: 1, lines: [['valdris', 'You force me to be Unbound? Impressive. And unforgivable.']] },
          { who: 'player', below: 0.35, form: 3, heal: 0.45, unlockForm: true, lines: [
            ['oriel', 'Oh my. His ki is… silver. Calm, like the eye of a storm.'],
            ['valdris', 'Zenith. A mortal reaching the state of gods…'],
            ['kairo', 'Let’s finish this.'],
          ] },
        ],
        outro: [
          ['valdris', 'Hah… hahaha! Good. GOOD! I haven’t bled in an age.'],
          ['valdris', 'I will spare Teralune. For now. Wake me when you get stronger.'],
          ['nar', 'Kairo reached ZENITH. Valdris is now playable.'],
        ],
        unlock: { chars: ['valdris'], forms: { kairo: 3 } },
      },
      {
        id: 'e12', name: 'Secret: The Herald’s Trial', player: 'kairo', pForm: 3, enemy: 'oriel', stage: 'arena', ai: 0.85, goal: 'win', secret: true,
        intro: [
          ['oriel', 'You’ve been wonderful, Kairo. May I have a dance too?'],
          ['kairo', 'You’re asking me? I thought you just watched.'],
          ['oriel', 'Watching is my job. This is for fun. Please do not die, it would be a lot of paperwork.'],
        ],
        outro: [
          ['oriel', 'My, my. You actually touched my sleeve.'],
          ['kairo', 'That’s it?! I gave you everything!'],
          ['oriel', 'And that is why you will keep growing. Thank you for the dance.'],
          ['nar', 'TRUE ENDING. Oriel is now playable. Thank you for playing ZENITH BURST!'],
        ],
        unlock: { chars: ['oriel'] },
      },
    ],
  },
];
ZB.allEpisodes = () => ZB.CAMPAIGN.flatMap((s) => s.episodes.map((e) => Object.assign({ saga: s.id }, e)));
ZB.episodeById = (id) => ZB.allEpisodes().find((e) => e.id === id);
ZB.speakerName = (id) => (id === 'nar' ? '' : (ZB.byId(id) || {}).name || id);
