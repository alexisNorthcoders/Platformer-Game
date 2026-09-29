"""Shared toolkit for building open-air levels: the Tiled-style JSON the game
loads, and the level images (parallax sky, terrain, Level Preview).

A level is a layout file in tools/levels/ that builds a `Layout` and calls
`build(number, layout)`. See tools/levels/level_18.py, and the new-level skill
(.claude/skills/new-level/) for the rules a layout has to follow.

Everything here is in map px (32 px tiles); the game draws it at 2x. A tile at
(col, row) spans x = col*32, y = row*32. Maps are always 9 rows tall.
"""

import json
import math
import random
from dataclasses import dataclass, field

from PIL import Image

ROWS, TILE = 9, 32
VIEW_WIDTH = 512  # map px: the 1024-px canvas at 2x


@dataclass
class Layout:
    cols: int
    # Solid ground: (first col, last col, top row), each running to the bottom of the map.
    ground: list
    # Single solid tiles on top of the ground, (col, row): battlements that pen Pigs in.
    battlements: list = field(default_factory=list)
    # Moving Platforms: dict(x, y, dx, dy, period, phase). (x, y) is the surface's
    # top-left at the start, map px; period in seconds; phase 0 starts at (x, y), 0.5 at the far end.
    moving_platforms: list = field(default_factory=list)
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
    # 'water' (waves, far isles) or 'sand' (dunes, far dunes).
    pit: str = 'water'
    # 'clouds': a blue sky with clouds, all on the parallax layer.
    # 'sun': a hot sky with a low sun and rare clouds. The sky colour and the sun
    # go on a far layer that stays fixed in the view (levels.js `backdrop.far`).
    sky: str = 'clouds'
    # The sky scrolls at this share of the camera's speed.
    parallax: float = 0.3
    seed: int = 0


# --- Tiled JSON -------------------------------------------------------------------

COLLISION_GID = 292
DOOR_GID, BOX_GID, DIAMOND_GID, PIG_GID, KING_PIG_GID = 290, 291, 293, 294, 295


def solid_cells(layout):
    cells = set()
    for first, last, top in layout.ground:
        for col in range(first, last + 1):
            for row in range(top, ROWS):
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
                  for row in range(ROWS) for col in range(cols)]
    layers = [dict(name='collisions', type='tilelayer', data=collisions, width=cols,
                   height=ROWS, opacity=1, visible=True, x=0, y=0)]

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
                                      dict(name=key, type='float', value=p.get(key, 0))
                                      for key in ('dx', 'dy', 'period', 'phase')
                                  ]) for p in layout.moving_platforms]),
    ]
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
        compressionlevel=-1, height=ROWS, width=cols, infinite=False, orientation='orthogonal',
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


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def paint_sky(img, horizon, palette=SKY):
    """Flat colour bands, deep overhead to a warm glow at the horizon."""
    px = img.load()
    bands = 16
    for y in range(img.height):
        band = min(bands - 1, y * bands // horizon)
        t = band / (bands - 1) * (len(palette) - 1)
        i, f = int(t), t - int(t)
        colour = lerp(palette[i], palette[min(i + 1, len(palette) - 1)], f)
        for x in range(img.width):
            px[x, y] = (*colour, 255)


def paint_sun(img, cx, cy):
    """Concentric flat rings; the outer ones blend into the sky bands under them."""
    px = img.load()
    for radius, colour, opacity in SUN:
        for y in range(cy - radius, cy + radius + 1):
            for x in range(cx - radius, cx + radius + 1):
                if 0 <= x < img.width and 0 <= y < img.height and (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2:
                    px[x, y] = (*lerp(px[x, y], colour, opacity), 255)


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


def paint_haze(img, rng):
    """Rare, thin streaks of high cloud."""
    for _ in range(max(1, img.width // 450)):
        cx, cy = rng.uniform(0, img.width), rng.uniform(16, 80)
        paint_blob(img, cx, cy, rng.uniform(30, 60), 3, HAZE)
        paint_blob(img, cx + rng.uniform(-20, 20), cy + 6, rng.uniform(16, 30), 2, HAZE)


def paint_far_isles(img, rng, horizon):
    """Low, pale islands on the horizon."""
    px = img.load()
    x = 0
    while x < img.width:
        width, height = rng.randint(60, 160), rng.randint(8, 22)
        for dx in range(width):
            h = round(height * math.sin(math.pi * dx / width) ** 0.6)
            for y in range(horizon - h, horizon):
                if 0 <= x + dx < img.width:
                    px[x + dx, y] = (*FAR_ISLE, 255)
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


# Terrain (32x32).png gids (1-based, 19 columns): the orange-rimmed wall pieces.
FRAME = {'tl': 21, 't': 22, 'tr': 23, 'l': 40, 'c': 41, 'r': 42}  # walls 2+ tiles wide
COLUMN = {'top': 25, 'mid': 44}  # walls one tile wide


def terrain_tile(sheet, gid):
    i = gid - 1
    col, row = i % 19, i // 19
    return sheet.crop((col * TILE, row * TILE, col * TILE + TILE, row * TILE + TILE))


def wall_gid(cells, col, row):
    solid = lambda c, r: (c, r) in cells or r >= ROWS  # walls carry on below the map
    up, left, right = solid(col, row - 1), solid(col - 1, row), solid(col + 1, row)
    if not left and not right:
        return COLUMN['mid'] if up else COLUMN['top']
    if not up:
        return FRAME['tl'] if not left else FRAME['tr'] if not right else FRAME['t']
    return FRAME['l'] if not left else FRAME['r'] if not right else FRAME['c']


def paint_walls(img, cells):
    sheet = Image.open('Sprites/14-TileSets/Terrain (32x32).png').convert('RGBA')
    for col, row in sorted(cells):
        img.alpha_composite(terrain_tile(sheet, wall_gid(cells, col, row)), (col * TILE, row * TILE))


def paint_decorations(img, layout):
    """Window arches and banners from Decorations (32x32).png."""
    sheet = Image.open('Sprites/14-TileSets/Decorations (32x32).png').convert('RGBA')
    # The window arch without its light beam (the beam is only semi-opaque).
    window = sheet.crop((72, 102, 106, 146))
    window.putdata([p if p[3] > 200 else (0, 0, 0, 0) for p in window.getdata()])
    banner = sheet.crop((34, 32, 62, 152)).resize((14, 60), Image.NEAREST)
    for spot in layout.windows:
        img.alpha_composite(window, spot)
    for spot in layout.banners:
        img.alpha_composite(banner, spot)


# --- Images -----------------------------------------------------------------------

def horizon(layout):
    return layout.pit_top if layout.pit_top is not None else ROWS * TILE


def sky_width(layout):
    """The parallax sky covers the view plus `parallax` of the rest of the map."""
    return math.ceil(VIEW_WIDTH + (layout.cols * TILE - VIEW_WIDTH) * layout.parallax)


# Where the sun's centre sits in the view, map px: right of centre, ahead of the
# King. At 76 above a horizon of 248 (y 172) it clears walls topped at row 6
# and half sets behind row 5; at 22 the walls and far dunes hid it entirely.
SUN_X, SUN_ABOVE_HORIZON = 360, 76


def build_far(layout, width, sun_x):
    """The 'sun' sky's far layer: sky bands and the sun, fixed in the view."""
    img = Image.new('RGBA', (width, horizon(layout)))
    paint_sky(img, horizon(layout), HOT_SKY)
    paint_sun(img, sun_x, horizon(layout) - SUN_ABOVE_HORIZON)
    return img


def build_sky(layout, width):
    """The parallax layer: clouds and the far horizon. Over sky bands for a
    'clouds' sky; clear for a 'sun' sky, whose far layer shows through."""
    img = Image.new('RGBA', (width, horizon(layout)))
    rng = random.Random(layout.seed)
    if layout.sky == 'sun':
        paint_haze(img, rng)
    else:
        paint_sky(img, horizon(layout))
        paint_clouds(img, rng)
    if layout.pit_top is not None:
        (paint_far_dunes if layout.pit == 'sand' else paint_far_isles)(img, rng, horizon(layout))
    return img


def build_terrain(layout, cells):
    """The pit, walls and decorations over a clear sky: drawn over the parallax sky."""
    img = Image.new('RGBA', (layout.cols * TILE, ROWS * TILE))
    if layout.pit_top is not None:
        (paint_sand if layout.pit == 'sand' else paint_water)(img, layout.pit_top)
    paint_walls(img, cells)
    paint_decorations(img, layout)
    return img


def build_preview(layout, terrain):
    """A map-wide sky under the terrain: the Title Screen's Level Preview. The
    preview shows the middle of the map, so a sun goes there."""
    img = Image.new('RGBA', terrain.size)
    if layout.sky == 'sun':
        img.alpha_composite(build_far(layout, terrain.width, terrain.width // 2 + SUN_X - VIEW_WIDTH // 2))
    img.alpha_composite(build_sky(layout, terrain.width))
    img.alpha_composite(terrain)
    return img


def build(number, layout):
    """Writes js/data/levels/Level_<n>.json and img/Level <n>{, sky, far, terrain}.png."""
    cells = solid_cells(layout)
    with open(f'js/data/levels/Level_{number}.json', 'w') as f:
        json.dump(build_json(layout, cells), f, indent=1)
    terrain = build_terrain(layout, cells)
    build_sky(layout, sky_width(layout)).save(f'img/Level {number} sky.png')
    if layout.sky == 'sun':
        build_far(layout, VIEW_WIDTH, SUN_X).save(f'img/Level {number} far.png')
    terrain.save(f'img/Level {number} terrain.png')
    build_preview(layout, terrain).save(f'img/Level {number}.png')
    print(f'Wrote Level_{number}.json and the Level {number} images '
          f'(sky {sky_width(layout)} px wide, parallax {layout.parallax})')
