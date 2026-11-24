# omni-game
## Zenith Burst (`/saga/`)

A 3D anime arena fighter in the style of modern "flight-combat" fighting games, with original characters.
Open `saga/index.html` (live at `https://omni-game.github.io/saga/`).

- **Story Campaign** — 3 sagas, 13 episodes, a branching choice with a What-If episode, mid-fight story events (transformations), 3 stars per episode, unlockable fighters and forms.
- **Battle** vs CPU (4 difficulties), **Training** with a dummy and infinite ki, **Fighters** encyclopedia with 3D preview.
- Combat: free flight, rush combos, chargeable smashes, ki blasts, ki charging, Sparking mode, 2 supers + an ultimate per fighter, beam clashes, vanish counters, chase attacks, bursts, transformations, destructible stages.
- Realistic rendering: procedurally sculpted, skinned fighter meshes (SDF anatomy + Surface Nets, built in a Web Worker and cached in IndexedDB) with fitted clothing that rips with damage, sky-based lighting, HDR bloom + filmic tone mapping, textured terrain, craters, smoke and dynamic lights (Settings → Graphics → Low turns the heavy effects off).
- Keyboard, gamepad and touch controls. No build step; three.js r149 is vendored in `saga/lib/`.
