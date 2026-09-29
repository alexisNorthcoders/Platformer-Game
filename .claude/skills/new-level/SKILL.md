---
name: new-level
description: Build a new game level (layout, level JSON, level images, levels.js entry) with the level toolkit. Use when asked to create, add, design or extend a level, or to change an existing level's map or art.
---

# New level

A level is three things, all keyed by its number N:

- `config/levels.js` entry N: start position, and optionally `water`, `backdrop`, `checkpoints`. The Title Screen's level count comes from this object's keys.
- `js/data/levels/Level_N.json`: the Tiled-format map the game loads.
- `img/Level N.png`: the level art, also shown as the Title Screen's Level Preview. Levels with a parallax sky also have `img/Level N sky.png` and `img/Level N terrain.png`.

Levels 1–17 were drawn by hand in Tiled (castle interiors, sources in `tiled/maps/`). Newer levels are generated from a Python layout file with `tools/levelgen.py`. That is the path below. It needs Pillow.

Every number this skill relies on (tile sizes, the King's jump, object offsets, tile IDs) is in [REFERENCE.md](REFERENCE.md). Read it before designing the layout.

## Steps

0. **From an issue?** Read it with `gh issue view <n> --comments` (see `docs/agents/issue-tracker.md`). Its theme and features replace your own choices in steps 1–2; anything it leaves open is yours to decide and name in the PR. Work on a branch, not `main`.

1. **Pick N and a theme.** N is the next free key in `config/levels.js`. The sprite sheets hold only castle interiors (brick walls, planks, windows, banners). Anything else (sky, water, clouds) is painted by `levelgen.py` in the tile sets' palette. Built-in themes: the `pit` is `'water'`, `'sand'` or `'grass'`, and the `sky` is `'clouds'`, `'sun'` or `'moon'`. A new theme means new paint functions in `levelgen.py`, and code in `index.js` to draw the pit (see `drawWater`, `drawSand`, `drawGrass`). Done when you can name the level and its route in one sentence.

2. **Design on the tile grid.** Sketch the route as a list of islands, gaps and rides, in columns × rows (9 rows, any width). Check every move against the King's reach in REFERENCE.md: every gap, every step up, every hop onto or off a Moving or Rotating Platform. Done when each transition on the route has a named reason it is possible, e.g. "walk: 18 px gap < 55 px hitbox" or "jump: 64 px up < 100 px".

3. **Write the layout.** Copy `tools/levels/level_18.py` (water, clouds), `level_19.py` (sand, sun) or `level_20.py` (grass, moon, a Rotating Platform) to `tools/levels/level_N.py` and replace the `Layout` fields. Pen every Pig in with battlements or walls, because Pigs walk off ledges. Done when the file runs: `python3 tools/levels/level_N.py`.

4. **Add the `levels.js` entry.** Set `playerPosition` from the King's standing formula in REFERENCE.md. For an outdoor level, also add the pit, named by the layout's `pit` (`water: { top: 2 × pit_top }`, `sand: { ... }` or `grass: { ... }`), `backdrop` (sky and terrain images, plus `far` for a `sky='sun'` or `'moon'` layout, and the same `parallax` as the layout) and `checkpoints` (one per island or ride section). A checkpoint on a pen's outer battlement keeps the respawn clear of the Pigs. Optional: `enemyTint` recolours every enemy. Level 19 uses all of these. Done when every checkpoint position stands the King on solid ground.

5. **Look at the art.** Crop the generated `img/Level N.png` into screen-sized pieces and view them. Done when walls, water and decorations sit where the layout says.

6. **Play it in the browser** with `node tools/play.mjs --level N --file tools/level-checks.js` (headless Chromium; recipe in REFERENCE.md). It checks each of these:
   - The King rides every Moving Platform and Rotating Platform plank, with his feet gap staying about 0.
   - A fall into the pit costs one heart and respawns him at the last checkpoint.
   - Every Pig is still on its island after about 900 frames.
   - The camera is a whole number at the far end of the map, and the sky still covers the view there.

   Then script a crossing, keys only, of every new or unusual ride (such as a Rotating Platform), and take `--shot` screenshots along the route and look at them. Done when every check passes and the screenshots match the layout.

7. **Run `npm test`** and hand over. Add the new `img/Level N.png` size to the Level Preview sizes in `test/menuGeometry.test.mjs`. In the PR, list the route, and close the issue if there was one (`Closes #n`). Say which checks were scripted and which still need a human to play through, and leave the "played by hand" box unticked until someone has.
