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

1. **Pick N and a theme.** N is the next free key in `config/levels.js`. The sprite sheets hold only castle interiors (brick walls, planks, windows, banners). Anything else (sky, water, clouds) is painted by `levelgen.py` in the tile sets' palette. Done when you can name the level and its route in one sentence.

2. **Design on the tile grid.** Sketch the route as a list of islands, gaps and rides, in columns × rows (9 rows, any width). Check every move against the King's reach in REFERENCE.md: every gap, every step up, every hop onto or off a Moving Platform. Done when each transition on the route has a named reason it is possible, e.g. "walk: 18 px gap < 55 px hitbox" or "jump: 64 px up < 100 px".

3. **Write the layout.** Copy `tools/levels/level_18.py` to `tools/levels/level_N.py` and replace the `Layout` fields. Pen every Pig in with battlements or walls, because Pigs walk off ledges. Done when the file runs: `python3 tools/levels/level_N.py`.

4. **Add the `levels.js` entry.** Set `playerPosition` from the King's standing formula in REFERENCE.md. For an outdoor level, also add `water: { top: 2 × water_top }`, `backdrop` (sky and terrain images, and the same `parallax` as the layout) and `checkpoints` (one per island or ride section). Done when every checkpoint position stands the King on solid ground.

5. **Look at the art.** Crop the generated `img/Level N.png` into screen-sized pieces and view them. Done when walls, water and decorations sit where the layout says.

6. **Play it in the browser** (recipe in REFERENCE.md). Check each of these:
   - The King rides every Moving Platform, with his feet gap staying about 0.
   - A fall into the water costs one heart and respawns him at the last checkpoint.
   - Every Pig is still on its island after about 900 frames.
   - The camera is a whole number at the far end of the map, and the sky still covers the view there.

   Done when every item has been checked and passes.

7. **Run `npm test`** and hand over. In the PR, list the route. Say which checks were scripted and which still need a human to play through, and leave the "played by hand" box unticked until someone has.
