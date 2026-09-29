# Level reference

Measured from the code while building Level 18. When the code changes, re-check the number here against its source (named in brackets).

## Units

- Map tiles are 32 px. The game draws everything at 2×, so one tile is 64 world px. "Map px" means Tiled/layout coordinates; "world px" means game coordinates, which are map px × 2.
- The canvas is 1024 × 576 world px, 16 × 9 tiles. **Maps are always 9 rows tall.** Width is free, and the camera scrolls horizontally only.
- The King dies into the water or pit once his position y is greater than 576 [`Player.checkForVerticalCollisions`].

## The King's reach [`Player.js`]

| | |
|---|---|
| Run speed | 4 px/frame |
| Jump | vy −10, gravity 0.5: rises about **100 px** (1.5 tiles) |
| Flat jump distance | about **160 px** (2.5 tiles). A 2-tile gap is safe. |
| Hitbox | 55 × 53, at position + (35, 34). He walks across gaps narrower than 55 px. |
| Standing on ground G | `playerPosition = { x, y: G − 88 }` (world px) |
| A 1-tile wall | Jumpable. A 2-tile wall is not. |

## Pigs [`Enemy.js`, `pigWanderAiCore.mjs`]

- Pigs have no ledge detection: **a Pig walks straight into the water.** Pen them in with 1-tile battlements or walls. They jump straight up (vy −10, gravity 0.4, about 125 px) with no sideways speed, so a 1-tile wall holds them.
- Pigs treat one-way platforms as solid. Keep Moving Platform paths away from Pig pens.
- The Door opens once half of the `enemy` layer's Pigs are defeated [`EnemyTracker`]. King Pigs don't count towards that total.
- Cannons and Match Pigs are decorative: nothing fires a cannon.

## Moving Platforms [`movingPlatform.mjs`]

- The surface is 200 × 16 world px and one-way (he can jump up through it). The sprite is `platform.png`, drawn at surface + (−4, −11).
- The path is an eased ping-pong. `phase` 0 starts at (x, y); 0.5 starts at the far end. Give two ferries that hand over to each other opposite phases.
- Dock each end 8–18 world px from an island edge at the same height, so the King walks on and off.
- Keep **2 tiles of clear air above every path.** A platform that carries the King into a wall pops him on top of it.
- A lit Bomb resting on a platform rides along.
- A platform sinking past a ledge the King also stands on leaves him on the ledge (`carriedDrop`), so he can step off a plank that is still going down.

## Rotating Platforms [`movingPlatform.mjs`, `parseAssets.js`]

- A hub with `arms` planks (default 2) evenly round it. Each plank is a Moving Platform on a circular path: the middle of its surface circles the hub at `radius`, at a steady speed, and stays level. Clockwise, or anticlockwise with `direction` −1. The chain and hub are drawn in code (`MovingPlatform.js`).
- Speed is 2π × radius ÷ period. Level 20's wheel (radius 70 map px, 9 s) moves at 1.6 world px/frame.
- **A plank crosses a gap of 2 × radius + 100 + both dock gaps** (map px): its surface is level with the hub at the left and right of each turn, reaching hub.x ± (radius + 50). Put an island at hub height each side, 4–9 map px off those ends. Level 20: hub (960, 160), radius 70, islands' edges at x 832 and 1088.
- Clockwise, a plank rises on the left and sinks on the right: the King boards on the left and rides over the top to the right. He boards by walking off the ledge while the plank is up to about 25 world px below it (it rises to meet him), or by jumping on. Reversed, he goes the other way.
- Top of the turn is hub.y − radius, bottom hub.y + radius. Keep the bottom above the pit and the top low enough that the King's head (feet − 88 world px) stays on screen, and keep walls outside hub.x ± (radius + 50) between those heights.
- Use 2 arms: planks opposite each other never pass over the rider. More arms can bring a plank down on top of him.

## Map layers [`parseAssets.js`]

Layers are read by name. `collisions`, `boxes` and `porta` must exist; the rest are optional.

| Layer | Kind | Notes |
|---|---|---|
| `collisions` | tiles | gid 292 (also 291, 260) makes a solid 64 × 64 block |
| `platform_2` | tiles | gid 260 makes a one-way 64 × 5 strip |
| `porta` | objects | The Door. Tiled y = ground ÷ 2 (map px). |
| `boxes` | objects | bottom = 2y; row − 0.5 stacks one box on another |
| `enemy`, `enemyKing` | objects | spawn at map y = ground − 16; they settle onto the ground |
| `diamonds` | objects | centre (world) = (2x + 8, 2y − 8) |
| `moving_platform` | rectangles | properties `dx`, `dy` (map px), `period` (s), `phase` |
| `rotating_platform` | points at the hub | properties `radius` (map px), `period` (s a turn), `arms`, `phase` (share of a turn), `direction` |
| `platform` | objects | a static plank (solid, not one-way) |

Tile objects land at world (2x, 2y − 32), with y at the object's bottom. `levelgen.py` applies every offset above; list layout objects by tile or centre.

## Art [`tools/levelgen.py`]

- Tile IDs in `Terrain (32x32).png` (19 columns, first gid 1): wall frame 21/22/23 (top), 40/41/42 (sides and fill); a 1-wide column is 25 (top) and 44 (body). `levelgen.wall_gid` auto-tiles these.
- Crops from `Decorations (32x32).png`: window arch (72, 102)–(106, 146), with its semi-transparent light beam stripped; banner (34, 32)–(62, 152).
- Palette: sky blue (152, 203, 216), cloud (220, 242, 237), horizon glow (251, 202, 174), dark wall (63, 56, 81).
- **Paint flat colours.** A 1-px dither or checkerboard shimmers and tears as the camera scrolls.
- **Put the sky on the parallax layer** (`backdrop` in `levels.js`, `parallax` in the layout); it scrolls slower than the ground. The layout's `parallax` sets the sky image's width, so it must match `levels.js`.
- Anything drawn in code (water, flags, effects) is positioned in world px, fixed in the level. A position built from `camera.x` travels with the view.
- **Anything that should not scroll at all** (a sun, a moon) goes on the far layer: `img/Level N far.png`, one view wide (512 map px), drawn at `camera.x` behind the parallax sky (`backdrop.far`). A `sky='sun'` layout paints the sky bands and the sun there, and leaves its parallax sky clear except for haze and the far horizon.
- **Keep the sun above the walls.** A sun 22 px above the horizon sat behind the forts and the far dunes, so it could not be seen. At 76 px (`SUN_ABOVE_HORIZON`) it clears walls topped at row 6 and half sets behind row 5 walls.
- **A 'moon' sky** paints night bands, stars and the moon on the far layer (`MOON_ABOVE_HORIZON` 150, clear of every wall), dim clouds on the parallax layer, and multiplies the walls, banners and windows by `MOONLIGHT`. Grass grows on every wall top and windows glow with candlelight.
- The 'grass' pit is a thicket of tall grass, 2-px blades whose tips stand 0–6 px over its surface (`grass_blade_height`, mirrored in `index.js` `grassBladeHeight`), with a pine forest on the horizon.
- The pit is drawn again in code over the King (`drawWater`, `drawSand`, `drawGrass` in `index.js`), so he sinks into it. Keep its colours equal to the painted ones in `levelgen.py`; `drawGrass` redraws the painted strip of the terrain image instead, so it always matches. Don't draw effects above the pit's surface: they speckle the walls that stand in it.
- `enemyTint` (a CSS colour, washed over each frame source-atop) recolours Pigs, King Pigs and Match Pigs. Pigs are green, so a red tint needs an opacity of about 0.5 to read as red. The player's hurt flash still wins over it [`Sprite.draw`].

## Playing it in the browser

`tools/play.mjs` drives the game in headless Chromium (Node 22+, `chromium` on the PATH or `CHROMIUM=...`; no npm packages, no browser extension). It serves the repo under `/kings-and-pigs/`, which the game's absolute fetch path needs, and runs its steps in order:

```
node tools/play.mjs --level 20 --file tools/level-checks.js         # the skill's checks, as JSON
node tools/play.mjs --level 20 --eval 'player.setPosition({ x: 1570, y: 232 }); step(60); return camera.x' --shot /tmp/a.png
```

- `requestAnimationFrame` is switched off: the game moves only when a script calls `step(n)`, so runs are repeatable. `hold(key, frames)` holds `'a'`, `'d'`, `'w'`, `'space'` or `'s'`; `play(N)` restarts level N with the fade-in skipped and input on.
- `--shot` saves the canvas as last drawn. Read the PNG to look at it.
- `tools/level-checks.js` runs the skill's step 6 checks for any open-air level (fall and respawn first, then Pigs, rides, checkpoints and start, the far end) and reports `ok` per check.
- Script a real crossing for anything new: keys only, from a checkpoint to the next island, checking hearts. The ride check puts the King on a plank; it does not prove he can get on and off.
- Useful globals: `player`, `camera`, `movingPlatforms` (`.state`, `.surface()`; a plank on a hub has `.state.path.center`), `enemies`, `enemyKing`, `diamonds` (`.diamondHit`), `respawnPoint`, `sky`, `far`, `collisionBlocks`, `keys`, `mapWidth`.
- Riding: the King's feet gap, `player.position.y + 87 − platform.state.y`, should be about 0.
- Checking each checkpoint by placing the King on it also moves `respawnPoint` on to the last one. `play(N)` again resets it.
- Where a browser extension is available instead (Claude in Chrome), serve the repo the same way (`python3 -m http.server` from a directory with a `kings-and-pigs` symlink to the repo), run `await startGame(N)`, and step with `for (let i = 0; i < n; i++) animate()`. The tab's own animation loop also runs once it is in front.
