---
name: new-level
description: Build a new game level (layout, level JSON, level images, levels.js entry) with the level toolkit. Use when asked to create, add, design or extend a level, or to change an existing level's map or art.
---

# New level

A level is three things, all keyed by its number N:

- `config/levels.js` entry N: start position, and optionally `water`, `backdrop`, `checkpoints`. The Title Screen's level count comes from this object's keys.
- `js/data/levels/Level_N.json`: the Tiled-format map the game loads.
- `img/Level N.png`: the level art, also shown as the Title Screen's Level Preview. Levels with a parallax sky also have `img/Level N sky.png` and `img/Level N terrain.png`.

A **Boss Level** (`boss: true` in its `levels.js` entry, read as `levels[level]?.boss`) is a one-screen castle interior drawn in Tiled, not generated: Level 25 (`tools/levels/level_25.py` renders it). Its Door opens when the Giant King Pig is beaten, not at half the Pigs.

A **Tower Level** (`tower: true`, read as `levels[level]?.tower`) is one screen wide and many rows high: Level 26 (`tools/levels/level_26.py`, `Layout.rows`, `sky='tower'`). The camera follows the King up (`js/tower.mjs`), Checkpoints count by height and a Long Fall (feet more than a screen below his last footing) costs a heart. The bottom of the world is `mapHeight`.

Levels 1–17 were drawn by hand in Tiled (castle interiors, sources in `tiled/maps/`). Newer levels are generated from a Python layout file with `tools/levelgen.py`. That is the path below. It needs Pillow.

Every number this skill relies on (tile sizes, the King's jump, object offsets, tile IDs) is in [REFERENCE.md](REFERENCE.md). Read it before designing the layout.

## Steps

0. **From an issue?** Read it with `gh issue view <n> --comments` (see `docs/agents/issue-tracker.md`). Its theme and features replace your own choices in steps 1–2; anything it leaves open is yours to decide and name in the PR. Work on a branch, not `main`.

1. **Pick N and a theme.** N is the next free key in `config/levels.js`. The sprite sheets hold only castle interiors (brick walls, planks, windows, banners). Anything else (sky, water, clouds) is painted by `levelgen.py` in the tile sets' palette. Built-in themes: the `pit` is `'water'`, `'sand'`, `'grass'`, `'lava'`, `'cloud'` (the Cloud Bank, with a bluer daytime sky) or `'spike'` (Spike Ditches: the ground runs on and the gaps are ditches with spikes along the bottom), and the `sky` is `'clouds'`, `'sun'`, `'moon'`, `'smoke'`, `'overcast'` (grey daytime bands and low heavy clouds, walls dimmed and cooled, no sun or moon) or `'storm'` (a deep steel blue, dark heavy storm clouds, a Viking village silhouette on the horizon). A new theme means new paint functions in `levelgen.py`, and code in `index.js` to draw the pit (see `drawWater`, `drawSand`, `drawGrass`, `drawLava`, `drawCloudBank`). Done when you can name the level and its route in one sentence.

2. **Design on the tile grid.** Sketch the route as a list of islands, gaps and rides, in columns × rows (9 rows, any width). Check every move against the King's reach in REFERENCE.md: every gap, every step up, every hop onto or off a Moving or Rotating Platform. Done when each transition on the route has a named reason it is possible, e.g. "walk: 18 px gap < 55 px hitbox" or "jump: 64 px up < 100 px".

3. **Write the layout.** Copy `tools/levels/level_18.py` (water, clouds), `level_19.py` (sand, sun) `level_20.py` (grass, moon, a Rotating Platform) or `level_21.py` (lava, smoke, Rotating and Helix Platforms) or `level_22.py` (Cloud Bank, floating islands, Crumbling Shelves) or `level_24.py` (Spike Ditches, storm sky, Tumbling Planks, a Storm; the route is written as a walk along the map) or `level_23.py` (grass, overcast, Rain, precision footholds, short planks; its route is written as a walk along the map, so gaps and docks are computed) to `tools/levels/level_N.py` and replace the `Layout` fields. Pen every Pig in with battlements or walls, because Pigs walk off ledges. Done when the file runs: `python3 tools/levels/level_N.py`.

4. **Add the `levels.js` entry.** Set `playerPosition` from the King's standing formula in REFERENCE.md. For an outdoor level, also add the pit, named by the layout's `pit` (`water: { top: 2 × pit_top }`, `sand`, `grass`, `lava`, `cloudBank: { ... }` or `spikes: { top: 2 × pit_top }`), `backdrop` (sky and terrain images, plus `far` for a `sky='sun'`, `'moon'`, `'smoke'`, `'overcast'` or `'storm'` layout, `rim` for `'storm'`, and the same `parallax` as the layout) and `checkpoints` (one per island or ride section). A checkpoint on a pen's outer battlement keeps the respawn clear of the Pigs. Optional: `weather: 'rain'` switches on Rain and `weather: 'storm'` a Storm (see REFERENCE.md), and a layout with `puddles=True` paints and lists the Puddles it needs; `enemyTint` recolours every enemy, `enemyGlow` makes them glow, and `boxTint` recolours the Boxes. Level 19 uses all but the last two; Level 21 uses those. A level with `sand`, `water`, `grass` or `lava` gets the slow sink (the King is caught and sinks for about 1.5 s); `cloudBank` and `spikes` don't. Done when every checkpoint position stands the King on solid ground.

5. **Look at the art.** Crop the generated `img/Level N.png` into screen-sized pieces and view them. Done when walls, water and decorations sit where the layout says.

6. **Play it in the browser** with `node tools/play.mjs --level N --file tools/level-checks.js` (headless Chromium; recipe in REFERENCE.md). It checks each of these:
   - Under `weather`, the same keys with and without it leave the King in the same place with the same hearts (a Storm's flashes also stay at or under 35% white).
   - The King rides every Moving Platform and Rotating Platform plank, with his feet gap staying about 0.
   - Each Tumbling Plank: standing still from flat the King slides off its low end before 80° and is never below the face; a fall onto it at 0°, 30° and 60° lands on the tilted face; a jump from mid-slide works; and a keys-only crossing from the ledge before it works (§3d).
   - He stands on every Helix Platform's hub for a whole turn, and drops from near a blade's tip as the blades turn in.
   - Each Crumbling Shelf shakes and drops 2 s after the King lands on it (even if he hops off), comes back about 3 s later, and is whole after a respawn.
   - A fall into the pit costs one heart and respawns him at the last checkpoint.
   - Every Pig is still on its island after about 900 frames.
   - The camera is a whole number at the far end of the map, and the sky still covers the view there.

   `npm run level-checks` runs these checks on every open-air level (those with Checkpoints and a backdrop in `config/levels.js`), prints one line per level naming any failing checks, and exits 1 if any fail (about 30-60 s a level); `npm run level-checks -- --level N` runs one. It honours `CHROMIUM`. CI runs it too (the `level-checks` job in `.github/workflows/test.yml`), so a PR that breaks an open-air level's checks fails.

   Then script a crossing, keys only, of every new or unusual ride (such as a Rotating Platform), and take `--shot` screenshots along the route and look at them. Done when every check passes and the screenshots match the layout.

7. **Run `npm test`** and hand over. Add the new `img/Level N.png` size to the Level Preview sizes in `test/menuGeometry.test.mjs`. In the PR, list the route, and close the issue if there was one (`Closes #n`). Say which checks were scripted and which still need a human to play through, and leave the "played by hand" box unticked until someone has.
