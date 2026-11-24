# omni-game
## Zenith Burst (`/saga/`)

A 3D anime arena fighter in the style of modern "flight-combat" fighting games, with original characters.
Open `saga/index.html` (live at `https://omni-game.github.io/saga/`).

- **Story Campaign** — 3 sagas, 13 episodes, a branching choice with a What-If episode, mid-fight story events (transformations), 3 stars per episode, unlockable fighters and forms.
- **Battle** vs CPU (4 difficulties), **Training** with a dummy and infinite ki, **Fighters** encyclopedia with 3D preview.
- Combat: free flight, rush combos, chargeable smashes, ki blasts, ki charging, Sparking mode, 2 supers + an ultimate per fighter, beam clashes, vanish counters, chase attacks, bursts, transformations, destructible stages.
- Realistic rendering: procedurally sculpted, skinned fighter meshes (SDF anatomy + Surface Nets, built in a Web Worker and cached in IndexedDB) with fitted clothing that rips with damage, sky-based lighting, HDR bloom + filmic tone mapping, textured terrain, craters, smoke and dynamic lights (Settings → Graphics → Low turns the heavy effects off).
- Keyboard, gamepad and touch controls. No build step; three.js r149 is vendored in `saga/lib/`.

### Blender-built character models

Fighters listed in `ZB.GLB` (`saga/models.js`) load a rigged `.glb` built with Blender; the rest are sculpted at runtime.
To rebuild one (needs `pip install bpy numpy scikit-image`):

```
node saga/tools/joints.js kairo > /tmp/kairo.json
python saga/tools/build_model.py /tmp/kairo.json saga/models/kairo.glb
```

The script sculpts high-resolution anatomy, adds hands with finger bones, fused anime hair, a mouth with teeth,
facial shape keys (`open`, `angry`, `pain`), fitted clothing, an armature matching the game rig and automatic weights.
