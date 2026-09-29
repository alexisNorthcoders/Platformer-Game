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
    # Water surface in map px (levels.js water.top is twice this); None for no water.
    water_top: int = None
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


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def paint_sky(img, horizon):
    """Flat colour bands, deep blue overhead to a warm glow at the horizon."""
    px = img.load()
    bands = 16
    for y in range(img.height):
        band = min(bands - 1, y * bands // horizon)
        t = band / (bands - 1) * (len(SKY) - 1)
        i, f = int(t), t - int(t)
        colour = lerp(SKY[i], SKY[min(i + 1, len(SKY) - 1)], f)
        for x in range(img.width):
            px[x, y] = (*colour, 255)


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


def paint_water(img, top):
    px = img.load()
    for y in range(top, img.height):
        for x in range(img.width):
            depth = y - top
            colour = WATER_CREST if depth < 2 else WATER_MID if depth < 8 else WATER_DEEP
            if depth >= 2 and (x // 6 + y // 3) % 11 == 0 and depth % 5 == 0:
                colour = WATER_CREST
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
    return layout.water_top if layout.water_top is not None else ROWS * TILE


def sky_width(layout):
    """The parallax sky covers the view plus `parallax` of the rest of the map."""
    return math.ceil(VIEW_WIDTH + (layout.cols * TILE - VIEW_WIDTH) * layout.parallax)


def build_sky(layout, width):
    """Sky, clouds and far isles: the parallax layer."""
    img = Image.new('RGBA', (width, horizon(layout)))
    rng = random.Random(layout.seed)
    paint_sky(img, horizon(layout))
    paint_clouds(img, rng)
    if layout.water_top is not None:
        paint_far_isles(img, rng, horizon(layout))
    return img


def build_terrain(layout, cells):
    """Water, walls and decorations over a clear sky: drawn over the parallax sky."""
    img = Image.new('RGBA', (layout.cols * TILE, ROWS * TILE))
    if layout.water_top is not None:
        paint_water(img, layout.water_top)
    paint_walls(img, cells)
    paint_decorations(img, layout)
    return img


def build_preview(layout, terrain):
    """A map-wide sky under the terrain: the Title Screen's Level Preview."""
    img = Image.new('RGBA', terrain.size)
    img.alpha_composite(build_sky(layout, terrain.width))
    img.alpha_composite(terrain)
    return img


def build(number, layout):
    """Writes js/data/levels/Level_<n>.json and img/Level <n>{, sky, terrain}.png."""
    cells = solid_cells(layout)
    with open(f'js/data/levels/Level_{number}.json', 'w') as f:
        json.dump(build_json(layout, cells), f, indent=1)
    terrain = build_terrain(layout, cells)
    build_sky(layout, sky_width(layout)).save(f'img/Level {number} sky.png')
    terrain.save(f'img/Level {number} terrain.png')
    build_preview(layout, terrain).save(f'img/Level {number}.png')
    print(f'Wrote Level_{number}.json and the Level {number} images '
          f'(sky {sky_width(layout)} px wide, parallax {layout.parallax})')
