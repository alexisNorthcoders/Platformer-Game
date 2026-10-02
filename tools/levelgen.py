"""Shared toolkit for building open-air levels: the Tiled-style JSON the game
loads, and the level images (parallax sky, terrain, Level Preview).

A level is a layout file in tools/levels/ that builds a `Layout` and calls
`build(number, layout)`. See tools/levels/level_18.py, and the new-level skill
(.claude/skills/new-level/) for the rules a layout has to follow.

Everything here is in map px (32 px tiles); the game draws it at 2x. A tile at
(col, row) spans x = col*32, y = row*32. Maps are 9 rows tall unless the
layout sets `rows` (a Tower Level is many screens high).
"""

import json
import math
import random
from dataclasses import dataclass, field

from PIL import Image

ROWS, TILE = 9, 32  # ROWS: the default `Layout.rows`
VIEW_WIDTH = 512  # map px: the 1024-px canvas at 2x


@dataclass
class Layout:
    cols: int
    # Solid ground: (first col, last col, top row), each running to the bottom of the map.
    # A fourth number is the last row: (first col, last col, top row, bottom row)
    # is a floating island, with cloud wisps painted under it.
    ground: list
    # Single solid tiles on top of the ground, (col, row): battlements that pen Pigs in.
    battlements: list = field(default_factory=list)
    # Moving Platforms: dict(x, y, dx, dy, period, phase, width). (x, y) is the surface's
    # top-left at the start, map px; period in seconds; phase 0 starts at (x, y), 0.5 at the far end;
    # width is the plank's length in map px (default 100, i.e. 200 world px; 64 is a short plank).
    moving_platforms: list = field(default_factory=list)
    # Rotating Platforms: dict(x, y, radius, period, arms, phase, direction, width). (x, y)
    # is the hub, map px; each of `arms` planks circles it at `radius` (to the
    # middle of its surface), staying level. Clockwise, or anticlockwise with
    # direction -1; phase turns every plank on by that share of a turn; width is
    # each plank's length in map px (default 100).
    rotating_platforms: list = field(default_factory=list)
    # Helix Platforms: dict(x, y, radius, period, phase, direction). (x, y) is the
    # middle of the hub's top, map px; two blades turn flat round it like a
    # rotor, reaching `radius` each side as they point across the view.
    helix_platforms: list = field(default_factory=list)
    # Tumbling Planks: dict(x, y, period, phase, direction). (x, y) is the middle of the
    # plank's surface top, map px: it turns end over end, in the plane
    # of the screen. It is flat twice a turn; the King stands within 25 degrees of flat and slides on it when more tilted
    # (js/tumblingPlank.mjs). Drawn in code, so not on the level image.
    tumbling_planks: list = field(default_factory=list)
    # Crumbling Shelves: (col, row) tiles; the shelf's surface is the top of the tile
    # and it is one tile wide. Drawn in code (they shake and fall), so they are
    # not on the level image, only on the Level Preview.
    crumbling_shelves: list = field(default_factory=list)
    # (col, top row of the ground they stand on).
    pigs: list = field(default_factory=list)
    king_pigs: list = field(default_factory=list)
    # (col, row of the ground under it); row - 0.5 stacks a box on another.
    boxes: list = field(default_factory=list)
    door: tuple = (0, 0)
    # Diamond centres, map px.
    diamonds: list = field(default_factory=list)
    # Decorations: window arches and banners, top-left in map px.
    windows: list = field(default_factory=list)
    banners: list = field(default_factory=list)
    # The deadly pit along the bottom: its surface in map px (levels.js
    # `water.top` or `sand.top` is twice this), or None for no pit.
    pit_top: int = None
    # 'water' (waves, far isles), 'sand' (dunes, far dunes), 'grass' (a
    # night thicket of tall grass, a far pine forest), 'lava' (a molten
    # floor, far black crags) or 'cloud' (the Cloud Bank: a drifting floor of
    # cloud, with a bluer daytime sky over it) or 'spike' (Spike Ditches: the ground
    # runs on like a street and the gaps are ditches cut down into it, spikes along
    # the bottom; give `pit_top` at row 8, 256, so a ditch is 2-3 tiles deep).
    pit: str = 'water'
    # 'clouds': a blue sky with clouds, all on the parallax layer.
    # 'sun': a hot sky with a low sun and rare clouds. The sky colour and the sun
    # go on a far layer that stays fixed in the view (levels.js `backdrop.far`).
    # 'moon': a night sky with stars and a moon, on the far layer as for 'sun';
    # the walls are shaded by moonlight and grass grows on them.
    # 'smoke': a smoky red sky with a volcano on the far layer and smoke on the
    # parallax layer; the walls glow with the lava's light.
    # 'overcast': grey daytime bands on the far layer (no sun or moon), low heavy
    # banks of cloud on the parallax layer; the walls are dimmed and cooled.
    # 'storm': a deeper steel blue on the far layer, dark heavy storm clouds and a
    # Viking village silhouette (two ranks) on the parallax layer, and a `rim` image of
    # the village's outline that a Storm's flash lights; the walls are cooled.
    # 'tower': one tall parallax layer, day blue at the foot darkening through dusk
    # to the first stars at the top, with clouds drifting past halfway up (no far layer).
    sky: str = 'clouds'
    # The sky scrolls at this share of the camera's speed.
    parallax: float = 0.3
    seed: int = 0
    # Paint Puddles into the brick tops (shallow spots on islands 2+ tiles wide)
    # and list them in a `puddle` layer, so the game can ripple them under Rain.
    puddles: bool = False
    # Map height in tiles: 9 is one screen; a Tower Level is many screens high.
    rows: int = ROWS
    # Cloud wisps under every floating island; off for a tower, whose ledges sit on its walls.
    wisps: bool = True


# --- Tiled JSON -------------------------------------------------------------------

COLLISION_GID = 292
PLANK_WIDTH = 100  # a Moving Platform's default length, map px
DOOR_GID, BOX_GID, DIAMOND_GID, PIG_GID, KING_PIG_GID = 290, 291, 293, 294, 295


def solid_cells(layout):
    cells = set()
    for first, last, top, *rest in layout.ground:
        for col in range(first, last + 1):
            for row in range(top, (rest[0] if rest else layout.rows - 1) + 1):
                cells.add((col, row))
    cells.update(layout.battlements)
    return cells


def tile_objects(gid, width, height, spots):
    """Tile objects as Tiled stores them: (x, y) is the bottom-left."""
    return [dict(gid=gid, width=width, height=height, x=x, y=y, name='', type='',
                 rotation=0, visible=True) for x, y in spots]


def build_json(layout, cells):
    cols = layout.cols
    collisions = [COLLISION_GID if (col, row) in cells else 0
                  for row in range(layout.rows) for col in range(cols)]
    layers = [dict(name='collisions', type='tilelayer', data=collisions, width=cols,
                   height=layout.rows, opacity=1, visible=True, x=0, y=0)]

    # The game places a tile object at (2x, 2y - 32): see parseAssets.js. Pigs
    # spawn a little above the ground and settle onto it.
    def standing(col, row, lift=16):
        return (col * TILE, row * TILE - lift)

    groups = [
        ('porta', tile_objects(DOOR_GID, 46, 56, [(layout.door[0] * TILE, layout.door[1] * TILE)])),
        ('boxes', tile_objects(BOX_GID, 22, 16, [(col * TILE, row * TILE) for col, row in layout.boxes])),
        ('enemy', tile_objects(PIG_GID, 34, 28, [standing(c, r) for c, r in layout.pigs])),
        ('enemyKing', tile_objects(KING_PIG_GID, 38, 28, [standing(c, r) for c, r in layout.king_pigs])),
        # A diamond drawn at (2x - 10, 2y - 22) at 2x is 36x28: its centre is (2x + 8, 2y - 8).
        ('diamonds', tile_objects(DIAMOND_GID, 12, 10, [(cx - 4, cy + 4) for cx, cy in layout.diamonds])),
        ('moving_platform', [dict(x=p['x'], y=p['y'], width=100, height=8, name='', type='',
                                  rotation=0, visible=True, properties=[
                                      dict(name=key, type='float', value=p.get(key, default))
                                      for key, default in (('dx', 0), ('dy', 0), ('period', 0), ('phase', 0), ('width', PLANK_WIDTH))
                                  ]) for p in layout.moving_platforms]),
    ]
    if layout.puddles:
        # Rectangles on the island tops: (x, y) is the puddle's top-left in map px
        # (see parseAssets.js).
        groups.append(('puddle', [dict(x=x, y=y, width=w, height=3, name='', type='', rotation=0, visible=True)
                                  for x, y, w in island_puddles(layout, cells)]))
    if layout.rotating_platforms:
        # A point object at the hub (see parseAssets.js getRotatingPlatformPaths).
        groups.append(('rotating_platform', [
            dict(x=p['x'], y=p['y'], width=0, height=0, point=True, name='', type='', rotation=0, visible=True,
                 properties=[dict(name=key, type='float', value=p.get(key, default))
                             for key, default in (('radius', 64), ('period', 8), ('arms', 2), ('phase', 0), ('direction', 1), ('width', PLANK_WIDTH))])
            for p in layout.rotating_platforms]))
    if layout.crumbling_shelves:
        # A point object at the shelf's top-left (see parseAssets.js getCrumblingShelf).
        groups.append(('crumbling_shelf', [
            dict(x=col * TILE, y=row * TILE, width=0, height=0, point=True, name='', type='',
                 rotation=0, visible=True) for col, row in layout.crumbling_shelves]))
    if layout.tumbling_planks:
        # A point object at the middle of the plank's surface top (see parseAssets.js getTumblingPlankPath).
        groups.append(('tumbling_plank', [
            dict(x=p['x'], y=p['y'], width=0, height=0, point=True, name='', type='', rotation=0, visible=True,
                 properties=[dict(name=key, type='float', value=p.get(key, default))
                             for key, default in (('period', 8), ('phase', 0), ('direction', 1))])
            for p in layout.tumbling_planks]))
    if layout.helix_platforms:
        # A point object at the middle of the hub's top (see parseAssets.js getHelixPlatformPath).
        groups.append(('helix_platform', [
            dict(x=p['x'], y=p['y'], width=0, height=0, point=True, name='', type='', rotation=0, visible=True,
                 properties=[dict(name=key, type='float', value=p.get(key, default))
                             for key, default in (('radius', 64), ('period', 8), ('phase', 0), ('direction', 1))])
            for p in layout.helix_platforms]))
    next_id = 1
    for name, objects in groups:
        for obj in objects:
            obj['id'] = next_id
            next_id += 1
        layers.append(dict(name=name, type='objectgroup', objects=objects, draworder='topdown',
                           opacity=1, visible=True, x=0, y=0))
    for i, layer in enumerate(layers):
        layer['id'] = i + 1

    return dict(
        compressionlevel=-1, height=layout.rows, width=cols, infinite=False, orientation='orthogonal',
        renderorder='right-down', tiledversion='1.11.1', version='1.10', type='map',
        tileheight=TILE, tilewidth=TILE, nextlayerid=len(layers) + 1, nextobjectid=next_id,
        tilesets=[
            dict(firstgid=1, source='tile_set_1.tsx'),
            dict(firstgid=248, source='tile_set_2.tsx'),
            dict(firstgid=290, source='tile_set_3.tsx'),
            dict(firstgid=291, source='Box.tsx'),
            dict(firstgid=292, source='collision.tsx'),
            dict(firstgid=293, source='diamond.tsx'),
            dict(firstgid=294, source='Jump (34x28).tsx'),
            dict(firstgid=295, source='Fall (38x28).tsx'),
        ],
        layers=layers,
    )


# --- Painting -------------------------------------------------------------------
# The sprite sheets hold only castle interiors: sky, clouds and water are painted
# in the tile sets' palette. Flat colours only; a 1-px dither or checkerboard
# shimmers as the camera scrolls.

SKY = [(96, 128, 170), (118, 142, 161), (140, 169, 181), (152, 203, 216), (165, 194, 199),
       (213, 231, 225), (247, 209, 186), (251, 202, 174)]
CLOUD, CLOUD_SHADE = (220, 242, 237), (165, 194, 199)
FAR_ISLE = (140, 169, 181)
WATER_DEEP, WATER_MID, WATER_CREST = (52, 78, 116), (63, 86, 120), (152, 203, 216)
# The 'sun' sky: pale blue overhead to a hot glow at the horizon.
HOT_SKY = [(120, 158, 190), (150, 182, 204), (182, 204, 210), (214, 218, 200), (238, 222, 180),
           (250, 208, 158), (252, 196, 140)]
HAZE = (250, 236, 214)
# Sun rings, outside in: (radius, colour, opacity over the sky bands).
SUN = [(46, (255, 236, 190), 0.25), (36, (255, 236, 190), 0.5), (27, (255, 228, 160), 1),
       (21, (255, 246, 214), 1), (15, (255, 253, 240), 1)]
FAR_DUNE, FAR_DUNE_SHADE = (228, 190, 146), (214, 170, 128)
SAND_DEEP, SAND_MID, SAND_CREST, SAND_RIPPLE = (206, 150, 92), (232, 184, 120), (250, 224, 170), (214, 162, 100)
# The 'moon' sky: deep night overhead to a dim blue glow at the horizon.
NIGHT_SKY = [(14, 16, 38), (20, 24, 52), (28, 34, 66), (38, 46, 82), (50, 60, 96), (64, 76, 110)]
STAR, STAR_DIM = (236, 240, 250), (150, 160, 196)
# Moon rings, outside in, as for the sun; then its craters.
MOON = [(40, (170, 186, 214), 0.12), (30, (190, 204, 226), 0.25), (19, (226, 230, 216), 1)]
MOON_CRATER = (200, 204, 190)
FAR_PINE, NEAR_PINE = (32, 42, 70), (22, 32, 50)
NIGHT_CLOUD = (56, 66, 100)
GRASS_DEEP, GRASS_MID, GRASS_CREST, GRASS_BLADE = (18, 36, 32), (30, 58, 44), (58, 98, 62), (92, 138, 80)
# Moonlight on the walls: every wall pixel is multiplied by this.
MOONLIGHT = (150, 160, 205)
# The 'smoke' sky: soot overhead to a red glow at the horizon.
# The 'tower' sky, top to foot: night, indigo, dusk rose, a low warm glow, then day blue.
TOWER_SKY = [(14, 16, 38), (26, 30, 70), (52, 50, 104), (112, 80, 130), (214, 128, 128), (246, 176, 140),
             (150, 196, 226), (118, 170, 222), (96, 150, 210)]
SMOKE_SKY = [(26, 20, 24), (38, 28, 32), (54, 36, 38), (78, 44, 40), (108, 52, 38), (140, 62, 36), (170, 74, 36)]
SMOKE, SMOKE_SHADE = (70, 60, 64), (52, 44, 50)
VOLCANO, VOLCANO_SHADE, CRAG = (44, 30, 34), (34, 24, 28), (30, 22, 26)
# Lava: kept equal to LAVA in index.js.
LAVA_DEEP, LAVA_MID, LAVA_CREST, LAVA_HOT, LAVA_CRUST = (154, 42, 18), (210, 72, 26), (245, 138, 42), (255, 208, 96), (90, 28, 20)
# Lava light on the walls: every wall pixel is multiplied by this, and warmed
# near the lava.
EMBERLIGHT = (205, 160, 150)
LAVA_GLOW = (255, 112, 40)
# The Cloud Bank: kept equal to CLOUD_BANK in index.js. A bluer sky goes over it.
BANK_DEEP, BANK_MID, BANK_CREST = (196, 222, 230), (226, 242, 244), (250, 253, 252)
DAY_SKY = [(72, 128, 200), (94, 152, 214), (120, 176, 226), (148, 198, 234), (180, 218, 240), (208, 232, 244)]
# The 'overcast' sky: grey daytime bands, dark at the top, a pale grey at the horizon.
OVERCAST_SKY = [(112, 122, 134), (128, 138, 148), (144, 154, 162), (158, 168, 174), (172, 180, 184), (184, 190, 192)]
OVERCAST_CLOUD, OVERCAST_SHADE = (150, 158, 166), (118, 128, 138)
# Overcast light on the walls: every wall pixel is multiplied by this (dimmer, cooler).
OVERCAST_LIGHT = (205, 215, 232)
OVERCAST_PINE, OVERCAST_NEAR_PINE = (78, 98, 96), (52, 72, 72)
# A Puddle painted on a brick top: dark water, a pale sky-grey glint along its top.
PUDDLE, PUDDLE_GLINT = (86, 104, 126), (170, 188, 202)
# A Crumbling Shelf, in map px (drawn at 2x in CrumblingShelf.js): a plank of brick
# with cracks across it. Kept equal to SHELF in CrumblingShelf.js.
SHELF_BRICK, SHELF_RIM, SHELF_CRACK, SHELF_SHADE = (203, 118, 106), (251, 202, 174), (63, 56, 81), (150, 82, 88)

# The 'storm' sky: a steel blue, deeper than SKY, with dark heavy clouds; the village on
# the horizon is dark blue-grey in two ranks (far paler, near darker), lit at its edge
# by a flash (`rim`).
STORM_SKY = [(34, 58, 100), (46, 74, 118), (60, 92, 136), (74, 108, 150), (90, 124, 162), (108, 142, 176)]
STORM_CLOUD, STORM_SHADE = (62, 74, 98), (42, 52, 74)
STORM_LIGHT = (200, 212, 236)
VILLAGE_FAR, VILLAGE_NEAR, VILLAGE_SMOKE, VILLAGE_RIM = (70, 88, 116), (38, 50, 72), (96, 112, 138), (206, 222, 250)
VILLAGE_BASE = 200  # map px: where the houses stand on the hill
# Spikes: simple grey iron points over dark stone (in the tile sets' palette). Kept
# equal to the drawn tips in index.js (SPIKES.tallestTip is 16).
SPIKE_IRON, SPIKE_EDGE, SPIKE_BASE, SPIKE_STONE = (150, 158, 170), (220, 242, 237), (63, 56, 81), (44, 40, 62)
SPIKE_HEIGHT, SPIKE_WIDTH = 12, 8


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def paint_sky(img, horizon, palette=SKY, bands=16):
    """Flat colour bands, deep overhead to a warm glow at the horizon."""
    px = img.load()
    for y in range(img.height):
        band = min(bands - 1, y * bands // horizon)
        t = band / (bands - 1) * (len(palette) - 1)
        i, f = int(t), t - int(t)
        colour = lerp(palette[i], palette[min(i + 1, len(palette) - 1)], f)
        for x in range(img.width):
            px[x, y] = (*colour, 255)


def paint_sun(img, cx, cy, rings=SUN):
    """Concentric flat rings; the outer ones blend into the sky bands under them."""
    px = img.load()
    for radius, colour, opacity in rings:
        for y in range(cy - radius, cy + radius + 1):
            for x in range(cx - radius, cx + radius + 1):
                if 0 <= x < img.width and 0 <= y < img.height and (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2:
                    px[x, y] = (*lerp(px[x, y], colour, opacity), 255)


def paint_moon(img, cx, cy):
    paint_sun(img, cx, cy, MOON)
    for dx, dy, r in ((-6, -5, 4), (5, 3, 5), (-3, 8, 3), (8, -8, 2)):
        paint_blob(img, cx + dx, cy + dy, r, r, MOON_CRATER)


def paint_stars(img, rng, horizon):
    """Fixed in the view with the moon: single pixels, and a few bright crosses."""
    px = img.load()
    for _ in range(img.width * horizon // 900):
        x, y = rng.randrange(img.width), rng.randrange(int(horizon * 0.75))
        if rng.random() < 0.12:
            for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)):
                if 0 <= x + dx < img.width and 0 <= y + dy < img.height:
                    px[x + dx, y + dy] = (*STAR, 255)
        else:
            px[x, y] = (*(STAR if rng.random() < 0.4 else STAR_DIM), 255)


def paint_blob(img, cx, cy, rx, ry, colour):
    px = img.load()
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            if 0 <= x < img.width and 0 <= y < img.height:
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                    px[x, y] = (*colour, 255)


def paint_clouds(img, rng):
    for _ in range(img.width // 90):
        cx, cy = rng.uniform(0, img.width), rng.uniform(12, 150)
        puffs = [(cx + rng.uniform(-26, 26), cy + rng.uniform(-6, 4), rng.uniform(8, 18)) for _ in range(5)]
        for x, y, r in puffs:
            paint_blob(img, x, y + 3, r, r * 0.55, CLOUD_SHADE)
        for x, y, r in puffs:
            paint_blob(img, x, y, r, r * 0.55, CLOUD)


def paint_tower_sky(img, rng):
    """Day at the foot (bottom), dusk above, stars over the top fifth, and clouds
    drifting past from about a third to two thirds of the way up."""
    h = img.height
    paint_sky(img, h, TOWER_SKY, bands=48)
    px = img.load()
    for _ in range(img.width * h // 1500):
        x, y = rng.randrange(img.width), rng.randrange(int(h * 0.3))
        near = 1 - y / (h * 0.3)  # thicker towards the very top
        if rng.random() > near + 0.15:
            continue
        if rng.random() < 0.12:
            for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)):
                px[x + dx if 0 <= x + dx < img.width else x, y + dy] = (*STAR, 255)
        else:
            px[x, y] = (*(STAR if rng.random() < 0.4 else STAR_DIM), 255)
    for _ in range(img.height // 90):
        cx, cy = rng.uniform(0, img.width), rng.uniform(h * 0.33, h * 0.67)
        puffs = [(cx + rng.uniform(-26, 26), cy + rng.uniform(-6, 4), rng.uniform(8, 18)) for _ in range(5)]
        for x, y, r in puffs:
            paint_blob(img, x, y + 3, r, r * 0.55, CLOUD_SHADE)
        for x, y, r in puffs:
            paint_blob(img, x, y, r, r * 0.55, CLOUD)


def paint_haze(img, rng):
    """Rare, thin streaks of high cloud."""
    for _ in range(max(1, img.width // 450)):
        cx, cy = rng.uniform(0, img.width), rng.uniform(16, 80)
        paint_blob(img, cx, cy, rng.uniform(30, 60), 3, HAZE)
        paint_blob(img, cx + rng.uniform(-20, 20), cy + 6, rng.uniform(16, 30), 2, HAZE)


def paint_night_clouds(img, rng):
    """A few long, dim clouds drifting across the stars."""
    for _ in range(max(1, img.width // 350)):
        cx, cy = rng.uniform(0, img.width), rng.uniform(30, 110)
        paint_blob(img, cx, cy, rng.uniform(40, 80), 4, NIGHT_CLOUD)
        paint_blob(img, cx + rng.uniform(-30, 30), cy - 4, rng.uniform(20, 40), 4, NIGHT_CLOUD)


def paint_pine(img, x, base, height, colour):
    """A pine silhouette: stacked tiers, each a stepped triangle, on a trunk."""
    px = img.load()
    tiers = max(2, height // 14)
    for y in range(base - height, base):
        t = (y - (base - height)) / height  # 0 at the tip
        tier_t = (t * tiers) % 1
        half = round((2 + 14 * tier_t) * (0.45 + 0.55 * t))
        if y > base - 5:
            half = 2  # trunk
        for dx in range(-half, half + 1):
            if 0 <= x + dx < img.width and 0 <= y < img.height:
                px[x + dx, y] = (*colour, 255)


def paint_far_forest(img, rng, horizon, colours=(FAR_PINE, NEAR_PINE)):
    """Two ranks of pines on the horizon: a pale far rank and a dark near one."""
    px = img.load()
    for colour, heights, step, floor in ((colours[0], (26, 56), (10, 26), 6), (colours[1], (18, 40), (14, 34), 3)):
        for y in range(horizon - floor, horizon):
            for x in range(img.width):
                px[x, y] = (*colour, 255)
        x = rng.randint(0, 20)
        while x < img.width:
            paint_pine(img, x, horizon - floor + 2, rng.randint(*heights), colour)
            x += rng.randint(*step)


def paint_far_isles(img, rng, horizon, colour=FAR_ISLE):
    """Low, pale islands on the horizon."""
    px = img.load()
    x = 0
    while x < img.width:
        width, height = rng.randint(60, 160), rng.randint(8, 22)
        for dx in range(width):
            h = round(height * math.sin(math.pi * dx / width) ** 0.6)
            for y in range(horizon - h, horizon):
                if 0 <= x + dx < img.width:
                    px[x + dx, y] = (*colour, 255)
        x += width + rng.randint(40, 200)


def paint_far_dunes(img, rng, horizon):
    """Rolling dunes on the horizon, overlapping into a range; each has a shaded lee side."""
    px = img.load()
    x = -40
    while x < img.width:
        width, height = rng.randint(120, 260), rng.randint(10, 30)
        crest = rng.uniform(0.35, 0.6)  # off-centre: wind-blown
        for dx in range(width):
            t = dx / width
            h = round(height * (math.sin(math.pi * t / crest / 2) if t < crest
                                else math.cos(math.pi * (t - crest) / (1 - crest) / 2)))
            colour = FAR_DUNE if t < crest else FAR_DUNE_SHADE
            for y in range(horizon - h, horizon):
                if 0 <= x + dx < img.width:
                    px[x + dx, y] = (*colour, 255)
        x += width - rng.randint(20, 60)


def paint_water(img, top):
    px = img.load()
    for y in range(top, img.height):
        for x in range(img.width):
            depth = y - top
            colour = WATER_CREST if depth < 2 else WATER_MID if depth < 8 else WATER_DEEP
            if depth >= 2 and (x // 6 + y // 3) % 11 == 0 and depth % 5 == 0:
                colour = WATER_CREST
            px[x, y] = (*colour, 255)


def paint_cloud_bank(img, top):
    """A floor of cloud: a bright crest, greying with depth. Flat on the image;
    index.js draws its drifting lumps above `top` (never below it, so none of
    this shows through)."""
    px = img.load()
    for y in range(top, img.height):
        depth = y - top
        colour = BANK_CREST if depth < 3 else BANK_MID if depth < 14 else BANK_DEEP
        for x in range(img.width):
            px[x, y] = (*colour, 255)


def paint_island_wisps(img, cells, rng):
    rows = img.height // TILE
    """Wisps of cloud under each floating island's bottom edge, so it reads as
    floating: flat blobs, shaded underneath."""
    for col, row in sorted(cells):
        if (col, row + 1) in cells or row + 1 >= rows:
            continue
        bottom = (row + 1) * TILE
        for _ in range(2):
            cx, cy = col * TILE + rng.uniform(4, TILE - 4), bottom + rng.uniform(2, 9)
            r = rng.uniform(9, 16)
            paint_blob(img, cx, cy + 3, r, r * 0.45, CLOUD_SHADE)
            paint_blob(img, cx, cy, r, r * 0.45, CLOUD)


def paint_shelf(img, x, y):
    """A Crumbling Shelf with its surface at (x, y), map px: 32 wide, 7 tall."""
    px = img.load()
    for dy in range(7):
        for dx in range(32):
            px[x + dx, y + dy] = (*(SHELF_RIM if dy < 2 else SHELF_BRICK if dy < 5 else SHELF_SHADE), 255)
    # Cracks: zigzags running down from the rim.
    for cx, cy in ((7, 1), (8, 2), (7, 3), (8, 4), (9, 5), (20, 0), (19, 1), (20, 2), (21, 3), (20, 4), (14, 3), (15, 4)):
        px[x + cx, y + cy] = (*SHELF_CRACK, 255)


def grass_blade_height(x):
    """Tall grass over the pit's surface: blade tips 0-6 px up, fixed per column."""
    h = (x // 2 * 0x9E3779B1) & 0xFFFFFFFF  # blades 2 px wide, scattered by an integer hash
    h = ((h ^ h >> 15) * 0x85EBCA6B) & 0xFFFFFFFF
    return (h ^ h >> 13) % 7


def paint_grass(img, top):
    px = img.load()
    for x in range(img.width):
        tip = top - grass_blade_height(x)
        for y in range(tip, img.height):
            depth = y - top
            colour = GRASS_BLADE if y < tip + 2 else GRASS_CREST if depth < 4 else GRASS_MID if depth < 14 else GRASS_DEEP
            # Darker blades in the thicket: thin vertical strokes.
            if depth >= 6 and (x * 5 + depth // 7) % 9 == 0:
                colour = GRASS_DEEP if depth < 14 else GRASS_MID
            px[x, y] = (*colour, 255)


def paint_sand(img, top):
    px = img.load()
    for y in range(top, img.height):
        for x in range(img.width):
            depth = y - top
            colour = SAND_CREST if depth < 2 else SAND_MID if depth < 12 else SAND_DEEP
            # Wind ripples: short dashes, 2 px tall, in staggered rows.
            if depth >= 4 and (depth // 2) % 3 == 0 and (x // 8 + depth // 6) % 5 == 0:
                colour = SAND_RIPPLE
            px[x, y] = (*colour, 255)


def paint_lava(img, top):
    """Molten rock: a hot crest, veins of dark crust in the deep."""
    px = img.load()
    for y in range(top, img.height):
        for x in range(img.width):
            depth = y - top
            colour = LAVA_CREST if depth < 2 else LAVA_MID if depth < 16 else LAVA_DEEP
            # Crust: short dark veins, 2 px tall, in staggered rows (as in index.js).
            if depth >= 4 and (depth // 2) % 4 == 0 and (x // 12 + depth // 8) % 6 == 0:
                colour = LAVA_CRUST
            px[x, y] = (*colour, 255)


def paint_volcano(img, rng, cx, horizon):
    """A cone on the horizon, lit on its left, with a glowing crater and lava
    running down it, and a plume of smoke billowing up from it."""
    px = img.load()
    height, half_base, half_top = 110, 170, 18
    peak = horizon - height
    for y in range(peak, horizon):
        t = (y - peak) / height
        half = round(half_top + (half_base - half_top) * t ** 1.15)
        for x in range(cx - half, cx + half + 1):
            if 0 <= x < img.width:
                px[x, y] = (*(VOLCANO if x < cx - half // 3 else VOLCANO_SHADE), 255)
    # The crater's glow, and runs of lava down the slope, wandering as they go.
    for x in range(cx - half_top + 3, cx + half_top - 2):
        for y in range(peak - 1, peak + 3):
            px[x, y] = (*(LAVA_HOT if y < peak + 1 else LAVA_CREST), 255)
    for start, lean, length in ((cx - 8, -1, 58), (cx + 2, 0, 36), (cx + 10, 1, 44)):
        x = start
        for y in range(peak + 3, peak + 3 + length):
            colour = LAVA_HOT if y - peak < 8 else LAVA_CREST if y - peak < length * 0.6 else LAVA_MID
            for dx in range(3):
                px[x + dx, y] = (*colour, 255)
            if y % 4 == 0:
                x += lean + rng.choice((-1, 0, 0, 1))
    # The plume: clusters of puffs, growing as they climb and lean downwind.
    for i in range(8):
        r = 7 + i * 2.6
        y = peak - 8 - i * 15
        x = cx + i * i * 1.2
        puffs = [(x + rng.uniform(-r, r), y + rng.uniform(-r * 0.4, r * 0.4), r * rng.uniform(0.7, 1.1)) for _ in range(3)]
        for bx, by, br in puffs:
            paint_blob(img, bx, by + 3, br, br * 0.8, SMOKE_SHADE)
        for bx, by, br in puffs:
            paint_blob(img, bx - 2, by, br * 0.85, br * 0.65, SMOKE)


def paint_smoke(img, rng):
    """Drifting banks of smoke: long flat blobs, shaded underneath."""
    for _ in range(max(2, img.width // 160)):
        cx, cy = rng.uniform(0, img.width), rng.uniform(14, 150)
        puffs = [(cx + rng.uniform(-50, 50), cy + rng.uniform(-6, 6), rng.uniform(12, 26)) for _ in range(6)]
        for x, y, r in puffs:
            paint_blob(img, x, y + 4, r * 1.6, r * 0.5, SMOKE_SHADE)
        for x, y, r in puffs:
            paint_blob(img, x, y, r * 1.4, r * 0.4, SMOKE)


def paint_overcast(img, rng):
    """Low, heavy banks of cloud: long flat blobs sitting close to the horizon,
    shaded underneath."""
    for _ in range(max(3, img.width // 110)):
        cx, cy = rng.uniform(0, img.width), rng.uniform(70, 190)
        puffs = [(cx + rng.uniform(-60, 60), cy + rng.uniform(-5, 5), rng.uniform(14, 28)) for _ in range(6)]
        for x, y, r in puffs:
            paint_blob(img, x, y + 5, r * 1.7, r * 0.55, OVERCAST_SHADE)
        for x, y, r in puffs:
            paint_blob(img, x, y, r * 1.5, r * 0.45, OVERCAST_CLOUD)


def paint_storm_clouds(img, rng):
    """Dark, heavy banks of storm cloud across the top of the sky, where the bolts start."""
    for _ in range(max(4, img.width // 90)):
        cx, cy = rng.uniform(0, img.width), rng.uniform(10, 90)
        puffs = [(cx + rng.uniform(-70, 70), cy + rng.uniform(-8, 8), rng.uniform(16, 32)) for _ in range(7)]
        for x, y, r in puffs:
            paint_blob(img, x, y + 6, r * 1.7, r * 0.6, STORM_SHADE)
        for x, y, r in puffs:
            paint_blob(img, x, y, r * 1.5, r * 0.5, STORM_CLOUD)


def paint_longhouse(img, x, base, width, wall, colour):
    """A longhouse: a low wall under a steep gabled roof, with a crossed pair of
    dragon-head beams at each end of the ridge (a tiny head on each beam's tip)."""
    px = img.load()
    roof = width // 3
    for dy in range(wall):
        for dx in range(width):
            put(px, img, x + dx, base - 1 - dy, colour)
    for dy in range(roof):
        inset = round(dy * (width / 2) / roof)
        for dx in range(inset, width - inset):
            put(px, img, x + dx, base - wall - 1 - dy, colour)
    top = base - wall - roof
    mid = x + width // 2
    for k in range(9):  # two crossed beams at the ridge, 2 px thick, with a knob for a dragon's head at each tip
        for dx in (0, 1):
            put(px, img, mid - 5 + k + dx, top - 9 + k, colour)
            put(px, img, mid + 5 - k + dx, top - 9 + k, colour)
    for hx in (mid - 7, mid + 6):
        for ddx in range(3):
            for ddy in range(3):
                put(px, img, hx + ddx, top - 12 + ddy, colour)
    return top


def put(px, img, x, y, colour):
    if 0 <= x < img.width and 0 <= y < img.height:
        px[x, y] = (*colour, 255)


def paint_palisade(img, x, base, length, colour, height=20):
    """A wall of pointed stakes, 6 px wide, a little uneven."""
    px = img.load()
    for sx in range(x, x + length, 6):
        h = height - (sx // 6 * 7 % 4)
        for dx in range(5):
            for dy in range(h):
                put(px, img, sx + dx, base - 1 - dy, colour)
        for dy in range(3):  # the point
            for dx in range(dy, 5 - dy):
                put(px, img, sx + dx, base - h - 1 - dy, colour)


def village_rank(img, rng, base, colour, sizes, gap, smoke=False):
    """A rank of the village along the base line: longhouses and stretches of palisade."""
    px = img.load()
    for y in range(base - 1, min(img.height, base + 60)):  # the hill under it
        for x in range(img.width):
            px[x, y] = (*colour, 255)
    x = rng.randint(0, 30)
    smokes = []
    while x < img.width:
        if rng.random() < 0.3:
            length = rng.randint(3, 8) * 6
            paint_palisade(img, x, base, length, colour)
            x += length + rng.randint(*gap)
            continue
        width = rng.randint(*sizes)
        top = paint_longhouse(img, x, base, width, rng.randint(14, 24), colour)
        if smoke and rng.random() < 0.6:
            smokes.append((x + width // 2 + rng.randint(-8, 8), top))
        x += width + rng.randint(*gap)
    return smokes


def paint_smoke_trail(img, x, top, rng):
    """A thin wavering trail of smoke rising from a roof, 2 px wide, fading upwards."""
    px = img.load()
    for i in range(34):
        alpha = round(200 * (1 - i / 34))
        sx = x + round(math.sin(i / 5 + rng.random() * 0.3) * 3)
        for dx in (0, 1):
            if 0 <= sx + dx < img.width and 0 <= top - i < img.height:
                px[sx + dx, top - i] = (*VILLAGE_SMOKE, alpha)


def build_village(layout, width):
    """The Viking village silhouette on the horizon, and its rim: two ranks (a
    paler far one, a darker near one) of longhouses and palisade, with a few
    thin smoke trails. Returns (village, rim): the outline pixels lit by a flash."""
    village = Image.new('RGBA', (width, horizon(layout)))
    rng = random.Random(layout.seed + 6)
    village_rank(village, rng, VILLAGE_BASE - 10, VILLAGE_FAR, (70, 110), (14, 50))
    smokes = village_rank(village, rng, VILLAGE_BASE, VILLAGE_NEAR, (60, 100), (24, 80), smoke=True)
    rim = Image.new('RGBA', village.size)
    vpx, rpx = village.load(), rim.load()
    for y in range(village.height - 1):
        for x in range(village.width):
            if vpx[x, y][3] and (y == 0 or not vpx[x, y - 1][3] or x == 0 or not vpx[x - 1, y][3]
                                or x + 1 >= village.width or not vpx[x + 1, y][3]):
                if y < VILLAGE_BASE:
                    rpx[x, y] = (*VILLAGE_RIM, 255)
    for x, top in smokes:
        paint_smoke_trail(village, x, top - 12, rng)
    return village, rim


def paint_spikes(img, top):
    """A Spike Ditch's floor: dark stone from `top` down, an iron bar along it, and
    grey iron points standing 12 px above it, as wide as SPIKE_WIDTH. Flat colours."""
    px = img.load()
    for y in range(top, img.height):
        for x in range(img.width):
            px[x, y] = (*(SPIKE_BASE if y < top + 3 else SPIKE_STONE), 255)
    for start in range(0, img.width, SPIKE_WIDTH):
        for dy in range(SPIKE_HEIGHT):
            half = (SPIKE_WIDTH / 2) * (1 - dy / SPIKE_HEIGHT)
            for dx in range(SPIKE_WIDTH):
                if abs(dx + 0.5 - SPIKE_WIDTH / 2) < half:
                    px[start + dx, top - 1 - dy] = (*(SPIKE_EDGE if dx < SPIKE_WIDTH // 2 - 1 and dy > 2 else SPIKE_IRON), 255)


def island_puddles(layout, cells):
    """Puddles on the brick tops: (x, y, width) in map px, y the top of the
    wall. One on some walls 3+ tiles wide (2 tiles: some), well clear of both
    ends, chosen by the layout's seed. Battlements and lone columns get none."""
    rng = random.Random(layout.seed + 4)
    out = []
    for first, last, top, *rest in layout.ground:
        width = last - first + 1
        if width < 2 or (first, top - 1) in cells and width < 3:
            continue
        if rng.random() < (0.55 if width == 2 else 0.85):
            w = rng.choice((20, 24, 28)) if width == 2 else rng.choice((28, 36, 44))
            x = first * TILE + rng.randint(6, width * TILE - w - 6)
            out.append((x, top * TILE, w))
    return out


def paint_puddles(img, puddles):
    """A shallow Puddle on a brick top: a flat, rounded 3-px lens of dark water
    with a glint along its top. Ripples are drawn in code."""
    px = img.load()
    for x, y, w in puddles:
        for dx in range(w):
            inset = 1 if dx < 2 or dx >= w - 2 else 0
            for dy in range(inset, 3):
                px[x + dx, y + dy] = (*(PUDDLE_GLINT if dy == 0 else PUDDLE), 255)


def paint_far_crags(img, rng, horizon):
    """Jagged black rock on the horizon: straight-sided peaks, overlapping."""
    px = img.load()
    x = -30
    while x < img.width:
        width, height = rng.randint(40, 110), rng.randint(10, 34)
        peak = rng.uniform(0.3, 0.7)
        for dx in range(width):
            t = dx / width
            h = round(height * (t / peak if t < peak else (1 - t) / (1 - peak)))
            for y in range(horizon - h, horizon):
                if 0 <= x + dx < img.width:
                    px[x + dx, y] = (*CRAG, 255)
        x += width - rng.randint(10, 40)


# Terrain (32x32).png gids (1-based, 19 columns): the orange-rimmed wall pieces.
FRAME = {'tl': 21, 't': 22, 'tr': 23, 'l': 40, 'c': 41, 'r': 42}  # walls 2+ tiles wide
COLUMN = {'top': 25, 'mid': 44, 'bottom': 63}  # walls one tile wide
BOTTOM = {'bl': 59, 'b': 60, 'br': 61}  # the underside of a floating island


def terrain_tile(sheet, gid):
    i = gid - 1
    col, row = i % 19, i // 19
    return sheet.crop((col * TILE, row * TILE, col * TILE + TILE, row * TILE + TILE))


def wall_gid(cells, col, row, rows=ROWS):
    solid = lambda c, r: (c, r) in cells or r >= rows  # walls carry on below the map
    up, left, right = solid(col, row - 1), solid(col - 1, row), solid(col + 1, row)
    down = solid(col, row + 1)
    if not left and not right:
        return COLUMN['bottom'] if up and not down else COLUMN['mid'] if up else COLUMN['top']
    if up and not down and left and right and not solid(col - 1, row - 1) and not solid(col + 1, row - 1):
        return FRAME['t']  # a one-row ledge under a lone battlement: the ledge carries on under it
    if up and not down:
        return BOTTOM['bl'] if not left else BOTTOM['br'] if not right else BOTTOM['b']
    if not up:
        return FRAME['tl'] if not left else FRAME['tr'] if not right else FRAME['t']
    return FRAME['l'] if not left else FRAME['r'] if not right else FRAME['c']


def paint_walls(img, cells, light=None, pit_top=None):
    """Walls from the tile set; multiplied by `light` if given (moonlight or
    lava light). Moonlit walls grow grass; lava-lit ones glow near the lava."""
    sheet = Image.open('Sprites/14-TileSets/Terrain (32x32).png').convert('RGBA')
    for col, row in sorted(cells):
        tile = terrain_tile(sheet, wall_gid(cells, col, row, img.height // TILE))
        if light:
            tile = moonlight(tile, light)
        img.alpha_composite(tile, (col * TILE, row * TILE))
    if light == MOONLIGHT:
        paint_wall_grass(img, cells)
    if light == EMBERLIGHT and pit_top is not None:
        paint_lava_glow(img, cells, pit_top)


def moonlight(tile, light=MOONLIGHT):
    """The tile's colours multiplied by `light`; alpha kept."""
    *rgb, alpha = tile.split()
    return Image.merge('RGBA', [band.point(lambda v, m=m: v * m // 255) for band, m in zip(rgb, light)] + [alpha])


def paint_lava_glow(img, cells, pit_top):
    """Walls warm towards LAVA_GLOW over the last 48 px above the lava, in flat
    8-px bands."""
    px = img.load()
    for col, row in cells:
        for y in range(max(row * TILE, pit_top - 48), min(row * TILE + TILE, pit_top)):
            share = 0.5 * (1 - (pit_top - y) // 8 * 8 / 48)
            for x in range(col * TILE, col * TILE + TILE):
                r, g, b, a = px[x, y]
                if a:
                    px[x, y] = (*lerp((r, g, b), LAVA_GLOW, share), a)


def paint_wall_grass(img, cells):
    """Grass along every wall top: a strip over the rim, and blades poking up."""
    px = img.load()
    for col, row in cells:
        if (col, row - 1) in cells:
            continue
        top = row * TILE
        for x in range(col * TILE, col * TILE + TILE):
            tip = top - grass_blade_height(x) // 2 - 1
            for y in range(tip, top + 3):
                if 0 <= y < img.height:
                    px[x, y] = (*(GRASS_BLADE if y < top + 1 else GRASS_CREST), 255)


# A moonlit window glows with candlelight: its sky pixels, by brightness.
CANDLE_DIM, CANDLE, CANDLE_BRIGHT = (214, 128, 72), (246, 180, 96), (255, 226, 150)


def candlelit(window, light=MOONLIGHT):
    """The window arch lit by `light`, with its painted sky (the bluish pixels)
    turned to a warm glow instead."""
    def glow(p, dim):
        r, g, b, a = p
        if b <= r:
            return dim
        return (*(CANDLE_BRIGHT if r > 200 else CANDLE if r > 130 else CANDLE_DIM), a)
    lit = moonlight(window, light)
    lit.putdata([glow(p, dim) for p, dim in zip(window.getdata(), lit.getdata())])
    return lit


def paint_decorations(img, layout):
    """Window arches and banners from Decorations (32x32).png. Under a 'moon'
    sky they are moonlit too, and the windows candlelit."""
    sheet = Image.open('Sprites/14-TileSets/Decorations (32x32).png').convert('RGBA')
    # The window arch without its light beam (the beam is only semi-opaque).
    window = sheet.crop((72, 102, 106, 146))
    window.putdata([p if p[3] > 200 else (0, 0, 0, 0) for p in window.getdata()])
    banner = sheet.crop((34, 32, 62, 152)).resize((14, 60), Image.NEAREST)
    if layout.sky == 'moon':
        window, banner = candlelit(window), moonlight(banner)
    elif layout.sky == 'smoke':
        window, banner = candlelit(window, EMBERLIGHT), moonlight(banner, EMBERLIGHT)
    elif layout.sky == 'overcast':
        window, banner = moonlight(window, OVERCAST_LIGHT), moonlight(banner, OVERCAST_LIGHT)
    elif layout.sky == 'storm':
        window, banner = moonlight(window, STORM_LIGHT), moonlight(banner, STORM_LIGHT)
    for spot in layout.windows:
        img.alpha_composite(window, spot)
    for spot in layout.banners:
        img.alpha_composite(banner, spot)


# --- Images -----------------------------------------------------------------------

def horizon(layout):
    return layout.pit_top if layout.pit_top is not None else layout.rows * TILE


def sky_height(layout):
    """The parallax sky's height: the view plus `parallax` of the rest of the map
    (a tower scrolls the sky up with the camera); one view for a 9-row map."""
    return math.ceil(horizon(layout) if layout.rows == ROWS
                     else ROWS * TILE + (layout.rows - ROWS) * TILE * layout.parallax)


def sky_width(layout):
    """The parallax sky covers the view plus `parallax` of the rest of the map."""
    return math.ceil(VIEW_WIDTH + (layout.cols * TILE - VIEW_WIDTH) * layout.parallax)


# Where the sun's centre sits in the view, map px: right of centre, ahead of the
# King. At 76 above a horizon of 248 (y 172) it clears walls topped at row 6
# and half sets behind row 5; at 22 the walls and far dunes hid it entirely.
SUN_X, SUN_ABOVE_HORIZON = 360, 76


# The moon sits high and left of the sun's spot: clear of every wall, and not
# behind the King at the start.
MOON_X, MOON_ABOVE_HORIZON = 340, 150

# The volcano's peak, right of centre in the view like the sun.
VOLCANO_X = 330


def build_far(layout, width, sun_x):
    """The far layer of a 'sun' or 'moon' sky: sky bands, stars and the sun or
    moon, fixed in the view. `sun_x` places the sun or moon."""
    img = Image.new('RGBA', (width, horizon(layout)))
    if layout.sky == 'storm':
        paint_sky(img, horizon(layout), STORM_SKY)
    elif layout.sky == 'overcast':
        paint_sky(img, horizon(layout), OVERCAST_SKY)
    elif layout.sky == 'smoke':
        paint_sky(img, horizon(layout), SMOKE_SKY)
        paint_volcano(img, random.Random(layout.seed + 2), sun_x, horizon(layout))
    elif layout.sky == 'moon':
        paint_sky(img, horizon(layout), NIGHT_SKY)
        paint_stars(img, random.Random(layout.seed + 1), horizon(layout))
        paint_moon(img, sun_x, horizon(layout) - MOON_ABOVE_HORIZON)
    else:
        paint_sky(img, horizon(layout), HOT_SKY)
        paint_sun(img, sun_x, horizon(layout) - SUN_ABOVE_HORIZON)
    return img


def has_far(layout):
    return layout.sky in ('sun', 'moon', 'smoke', 'overcast', 'storm')


def far_x(layout):
    return {'moon': MOON_X, 'smoke': VOLCANO_X}.get(layout.sky, SUN_X)


def build_sky(layout, width):
    """The parallax layer: clouds and the far horizon. Over sky bands for a
    'clouds' sky; clear for a 'sun' sky, whose far layer shows through."""
    img = Image.new('RGBA', (width, sky_height(layout)))
    rng = random.Random(layout.seed)
    if layout.sky == 'tower':
        paint_tower_sky(img, rng)
    elif layout.sky == 'sun':
        paint_haze(img, rng)
    elif layout.sky == 'moon':
        paint_night_clouds(img, rng)
    elif layout.sky == 'smoke':
        paint_smoke(img, rng)
    elif layout.sky == 'overcast':
        paint_overcast(img, rng)
    elif layout.sky == 'storm':
        paint_storm_clouds(img, rng)
    else:
        paint_sky(img, horizon(layout), DAY_SKY if layout.pit == 'cloud' else SKY)
        paint_clouds(img, rng)
    if layout.sky == 'tower':
        pass
    elif layout.sky == 'storm':
        img.alpha_composite(build_village(layout, width)[0])
    elif layout.pit == 'cloud':
        paint_far_isles(img, rng, horizon(layout), BANK_DEEP)
    elif layout.pit_top is not None:
        if layout.pit == 'grass' and layout.sky == 'overcast':
            paint_far_forest(img, rng, horizon(layout), (OVERCAST_PINE, OVERCAST_NEAR_PINE))
        else:
            {'sand': paint_far_dunes, 'grass': paint_far_forest, 'lava': paint_far_crags}.get(layout.pit, paint_far_isles)(img, rng, horizon(layout))
    return img


def build_terrain(layout, cells):
    """The pit, walls and decorations over a clear sky: drawn over the parallax sky."""
    img = Image.new('RGBA', (layout.cols * TILE, layout.rows * TILE))
    if layout.pit_top is not None:
        {'sand': paint_sand, 'grass': paint_grass, 'lava': paint_lava, 'cloud': paint_cloud_bank, 'spike': paint_spikes}.get(layout.pit, paint_water)(img, layout.pit_top)
    light = {'moon': MOONLIGHT, 'smoke': EMBERLIGHT, 'overcast': OVERCAST_LIGHT, 'storm': STORM_LIGHT}.get(layout.sky)
    paint_walls(img, cells, light, layout.pit_top if layout.pit == 'lava' else None)
    if layout.wisps:
        paint_island_wisps(img, cells, random.Random(layout.seed + 3))
    if layout.puddles:
        paint_puddles(img, island_puddles(layout, cells))
    paint_decorations(img, layout)
    return img


def build_preview(layout, terrain):
    """A map-wide sky under the terrain: the Title Screen's Level Preview. The
    preview shows the middle of the map, so a sun goes there."""
    img = Image.new('RGBA', terrain.size)
    if layout.sky == 'tower':
        # The sky is shorter than the tower: stretch it over the whole climb.
        img.alpha_composite(build_sky(layout, terrain.width).resize(terrain.size, Image.NEAREST))
        img.alpha_composite(terrain)
        return img
    if has_far(layout):
        img.alpha_composite(build_far(layout, terrain.width, terrain.width // 2 + far_x(layout) - VIEW_WIDTH // 2))
    img.alpha_composite(build_sky(layout, terrain.width))
    img.alpha_composite(terrain)
    for col, row in layout.crumbling_shelves:
        paint_shelf(img, col * TILE, row * TILE)
    return img


def build(number, layout):
    """Writes js/data/levels/Level_<n>.json and img/Level <n>{, sky, far, terrain}.png."""
    cells = solid_cells(layout)
    with open(f'js/data/levels/Level_{number}.json', 'w') as f:
        json.dump(build_json(layout, cells), f, indent=1)
    terrain = build_terrain(layout, cells)
    build_sky(layout, sky_width(layout)).save(f'img/Level {number} sky.png')
    if has_far(layout):
        build_far(layout, VIEW_WIDTH, far_x(layout)).save(f'img/Level {number} far.png')
    if layout.sky == 'storm':
        build_village(layout, sky_width(layout))[1].save(f'img/Level {number} rim.png')
    terrain.save(f'img/Level {number} terrain.png')
    build_preview(layout, terrain).save(f'img/Level {number}.png')
    print(f'Wrote Level_{number}.json and the Level {number} images '
          f'(sky {sky_width(layout)} px wide, parallax {layout.parallax})')
