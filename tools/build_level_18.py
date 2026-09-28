"""Builds Level 18, "Sky Moat": js/data/levels/Level_18.json and img/Level 18.png.

The King crosses a moat under an open sky, from island to island on Moving
Platforms. The sprite sheets hold only castle interiors, so the sky, clouds
and water are painted here in the tile sets' palette; islands and towers are
auto-tiled from Terrain (32x32).png and Decorations (32x32).png.

Run from the repo root:  python3 tools/build_level_18.py   (needs Pillow)

Everything below is in map px (the Tiled map, 32 px tiles); the game draws it
at 2x. A tile at (col, row) spans x = col*32, y = row*32.
"""

import json
import math
import random

from PIL import Image

COLS, ROWS, TILE = 100, 9, 32
WATER_TOP = 248  # map px; levels.js water.top is twice this

# --- Layout -----------------------------------------------------------------

# Solid ground: (first col, last col, top row). Each runs down into the water.
GROUND = [
    (0, 0, 1),     # keep wall, left edge of the map
    (1, 6, 6),     # start keep
    (9, 10, 6),    # stepping stone
    (17, 22, 6),   # first island (Pig)
    (27, 31, 3),   # lookout tower
    (45, 50, 6),   # pig pen island
    (55, 56, 2),   # needle pillar
    (64, 65, 5),   # rest pillar
    (73, 80, 5),   # King Pig's island
    (90, 98, 3),   # the far castle
    (99, 99, 0),   # its outer wall, right edge of the map
]
# Battlements: one tile on top of an island, (col, row). They keep Pigs from
# wandering into the water; the King jumps them.
BATTLEMENTS = [(17, 5), (22, 5), (45, 5), (50, 5), (73, 4), (80, 4), (90, 2)]

# Moving Platforms: surface top-left at the start (map px), travel, round trip
# in seconds, phase (0..1).
MOVING_PLATFORMS = [
    # Ferry off the start: a gentle first ride.
    dict(x=354, y=192, dx=88, dy=0, period=4.5, phase=0),
    # Elevator from the first island up to the lookout tower.
    dict(x=756, y=192, dx=0, dy=-96, period=5.0, phase=0),
    # The long gap: two ferries in turn, each a step below the last.
    dict(x=1028, y=128, dx=168, dy=0, period=4.5, phase=0),
    dict(x=1232, y=160, dx=104, dy=0, period=4.5, phase=0.5),
    # A quick elevator up to the needle pillar.
    dict(x=1636, y=192, dx=0, dy=-128, period=4.0, phase=0),
    # Down from the needle and over to the rest pillar...
    dict(x=1828, y=128, dx=116, dy=0, period=4.0, phase=0),
    # ...then a fast ferry up to the King Pig's island.
    dict(x=2116, y=128, dx=116, dy=0, period=3.0, phase=0.5),
    # The last ride climbs diagonally to the far castle.
    dict(x=2596, y=160, dx=180, dy=-64, period=6.0, phase=0),
]

# Pigs stand on these tiles (col, top row of the ground they stand on).
PIGS = [(19, 6), (47, 6), (48, 6), (77, 5), (94, 3), (96, 3)]
KING_PIGS = [(76, 5)]
BOXES = [(78, 5), (78, 4.5), (97, 3)]
DOOR = (93, 3)

# Diamonds: centres in map px. Some sit on safe ground; the rest hang over the
# water on the jump lines, for those who dare.
DIAMONDS = [
    (80, 170), (112, 170),
    (256, 150),
    (560, 170), (592, 170),
    (910, 70), (950, 70),
    (1130, 70), (1300, 95), (1400, 90),
    (1792, 30),
    (1900, 80), (2000, 150), (2150, 70),
    (2600, 110), (2720, 60),
    (3040, 70), (3072, 70),
]


def solid_cells():
    cells = set()
    for first, last, top in GROUND:
        for col in range(first, last + 1):
            for row in range(top, ROWS):
                cells.add((col, row))
    cells.update(BATTLEMENTS)
    return cells


# --- Tiled JSON ---------------------------------------------------------------

COLLISION_GID = 292
BOX_GID, DIAMOND_GID, PIG_GID, KING_PIG_GID, DOOR_GID = 291, 293, 294, 295, 290


def tile_objects(gid, width, height, spots):
    """Tile objects as Tiled stores them: (x, y) is the bottom-left."""
    return [dict(gid=gid, width=width, height=height, x=x, y=y, name='', type='',
                 rotation=0, visible=True) for x, y in spots]


def object_layer(name, objects, next_id):
    for obj in objects:
        obj['id'] = next_id
        next_id += 1
    return dict(name=name, type='objectgroup', objects=objects, draworder='topdown',
                opacity=1, visible=True, x=0, y=0), next_id


def build_json(cells):
    collisions = [COLLISION_GID if (col, row) in cells else 0
                  for row in range(ROWS) for col in range(COLS)]
    layers = [dict(name='collisions', type='tilelayer', data=collisions, width=COLS,
                   height=ROWS, opacity=1, visible=True, x=0, y=0)]

    # The game places a tile object at (2x, 2y - 32): see parseAssets.js.
    def standing(col, row, lift=16):
        return (col * TILE, row * TILE - lift)

    groups = [
        ('porta', tile_objects(DOOR_GID, 46, 56, [(DOOR[0] * TILE, DOOR[1] * TILE)])),
        ('boxes', tile_objects(BOX_GID, 22, 16, [(col * TILE, row * TILE) for col, row in BOXES])),
        ('enemy', tile_objects(PIG_GID, 34, 28, [standing(c, r) for c, r in PIGS])),
        ('enemyKing', tile_objects(KING_PIG_GID, 38, 28, [standing(c, r) for c, r in KING_PIGS])),
        # A diamond drawn at (2x - 10, 2y - 22) at 2x is 36x28: its centre is (2x + 8, 2y - 8).
        ('diamonds', tile_objects(DIAMOND_GID, 12, 10, [(cx - 4, cy + 4) for cx, cy in DIAMONDS])),
    ]
    platforms = [dict(x=p['x'], y=p['y'], width=100, height=8, name='', type='',
                      rotation=0, visible=True, properties=[
                          dict(name='dx', type='float', value=p['dx']),
                          dict(name='dy', type='float', value=p['dy']),
                          dict(name='period', type='float', value=p['period']),
                          dict(name='phase', type='float', value=p['phase']),
                      ]) for p in MOVING_PLATFORMS]
    groups.append(('moving_platform', platforms))

    next_id = 1
    for name, objects in groups:
        layer, next_id = object_layer(name, objects, next_id)
        layers.append(layer)
    for i, layer in enumerate(layers):
        layer['id'] = i + 1

    return dict(
        compressionlevel=-1, height=ROWS, width=COLS, infinite=False, orientation='orthogonal',
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


# --- Level image ----------------------------------------------------------------

SKY = [(96, 128, 170), (118, 142, 161), (140, 169, 181), (152, 203, 216), (165, 194, 199),
       (213, 231, 225), (247, 209, 186), (251, 202, 174)]
CLOUD, CLOUD_SHADE = (220, 242, 237), (165, 194, 199)
FAR_ISLE = (140, 169, 181)
WATER_DEEP, WATER_MID, WATER_CREST, WATER_FOAM = (52, 78, 116), (63, 86, 120), (152, 203, 216), (220, 242, 237)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def paint_sky(img):
    """A banded, dithered gradient: deep blue overhead to a warm glow at the horizon."""
    px = img.load()
    for y in range(WATER_TOP):
        t = y / WATER_TOP * (len(SKY) - 1)
        i, f = int(t), t - int(t)
        a, b = SKY[i], SKY[min(i + 1, len(SKY) - 1)]
        for x in range(img.width):
            # 2x2 ordered dither between neighbouring bands, so the steps read as pixel art.
            threshold = ((x % 2) * 2 + (y % 2)) / 4 + 0.125
            px[x, y] = (*(b if f > threshold else a), 255)


def paint_blob(img, cx, cy, rx, ry, colour):
    px = img.load()
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            if 0 <= x < img.width and 0 <= y < img.height:
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                    px[x, y] = (*colour, 255)


def paint_clouds(img, rng):
    for _ in range(38):
        cx, cy = rng.uniform(0, img.width), rng.uniform(12, 150)
        puffs = [(cx + rng.uniform(-26, 26), cy + rng.uniform(-6, 4), rng.uniform(8, 18)) for _ in range(5)]
        for x, y, r in puffs:
            paint_blob(img, x, y + 3, r, r * 0.55, CLOUD_SHADE)
        for x, y, r in puffs:
            paint_blob(img, x, y, r, r * 0.55, CLOUD)


def paint_far_isles(img, rng):
    """Low, pale islands on the horizon."""
    px = img.load()
    x = 0
    while x < img.width:
        width, height = rng.randint(60, 160), rng.randint(8, 22)
        for dx in range(width):
            h = round(height * math.sin(math.pi * dx / width) ** 0.6)
            for y in range(WATER_TOP - h, WATER_TOP):
                if 0 <= x + dx < img.width:
                    px[x + dx, y] = (*FAR_ISLE, 255)
        x += width + rng.randint(40, 200)


def paint_water(img):
    px = img.load()
    for y in range(WATER_TOP, img.height):
        for x in range(img.width):
            depth = y - WATER_TOP
            colour = WATER_CREST if depth < 2 else WATER_MID if depth < 8 else WATER_DEEP
            if depth >= 2 and (x // 6 + y // 3) % 11 == 0 and depth % 5 == 0:
                colour = WATER_CREST
            px[x, y] = (*colour, 255)


# Terrain (32x32).png gids (1-based, 19 columns): the orange-rimmed wall pieces.
FRAME = {  # (open up, open down, open left, open right) -> gid, for walls 2+ wide
    'tl': 21, 't': 22, 'tr': 23, 'l': 40, 'c': 41, 'r': 42,
}
COLUMN = {'top': 25, 'mid': 44}  # one tile wide


def terrain_tile(sheet, gid):
    i = gid - 1
    col, row = i % 19, i // 19
    return sheet.crop((col * TILE, row * TILE, col * TILE + TILE, row * TILE + TILE))


def wall_gid(cells, col, row):
    solid = lambda c, r: (c, r) in cells or r >= ROWS  # walls carry on under the water
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


def paint_decorations(img):
    """A window on each tall wall and banners on the far castle, from Decorations (32x32).png."""
    sheet = Image.open('Sprites/14-TileSets/Decorations (32x32).png').convert('RGBA')
    # The window arch without its light beam (the beam is only semi-opaque).
    window = sheet.crop((72, 102, 106, 146))
    window.putdata([p if p[3] > 200 else (0, 0, 0, 0) for p in window.getdata()])
    banner = sheet.crop((34, 32, 62, 152)).resize((14, 60), Image.NEAREST)
    for x, y in [(876, 128), (3004, 124), (3100, 124)]:
        img.alpha_composite(window, (x, y))
    for x in (2952, 3060, 3152):
        img.alpha_composite(banner, (x, 104))


def build_image(cells):
    rng = random.Random(18)
    img = Image.new('RGBA', (COLS * TILE, ROWS * TILE))
    paint_sky(img)
    paint_clouds(img, rng)
    paint_far_isles(img, rng)
    paint_water(img)
    paint_walls(img, cells)
    paint_decorations(img)
    return img


if __name__ == '__main__':
    cells = solid_cells()
    with open('js/data/levels/Level_18.json', 'w') as f:
        json.dump(build_json(cells), f, indent=1)
    build_image(cells).save('img/Level 18.png')
    print('Wrote js/data/levels/Level_18.json and img/Level 18.png')
