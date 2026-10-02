"""Level 25, the Boss Level (#113): a one-screen throne room (16x9 tiles) where
the King fights the Giant King Pig. A castle interior like Levels 1-17, so it is
built from the Level 1 tile sets rather than levelgen.py (which paints outdoor
skies). Writes js/data/levels/Level_25.json and img/Level 25.png.

    python3 tools/levels/level_25.py

`python3 tools/levels/level_25.py --check 1` re-renders Level 1's image from its
JSON and compares it with img/Level 1.png, to prove the renderer matches Tiled's.
"""

import json
import sys

from PIL import Image

COLS, ROWS, TILE = 16, 9, 32
BG, COLLISION = 41, 292
DOOR_GID, BOX_GID, PIG_GID, PLATFORM_GID = 290, 291, 293, 295


def tile_image(terrain, decorations, gid):
    """One 32x32 tile from the two tile sets (gid 1-247 Terrain, 248-289 Decorations)."""
    if gid < 248:
        i = gid - 1
        return terrain.crop((i % 19 * TILE, i // 19 * TILE, i % 19 * TILE + TILE, i // 19 * TILE + TILE))
    i = gid - 248
    return decorations.crop((i % 7 * TILE, i // 7 * TILE, i % 7 * TILE + TILE, i // 7 * TILE + TILE))


def render(layers, width=COLS, height=ROWS):
    """The map image as Tiled exports it: tile layers in order, the background offset 1 px."""
    terrain = Image.open('Sprites/14-TileSets/Terrain (32x32).png').convert('RGBA')
    decorations = Image.open('Sprites/14-TileSets/Decorations (32x32).png').convert('RGBA')
    img = Image.new('RGBA', (width * TILE + 1, height * TILE + 1), (0, 0, 0, 0))
    for layer in layers:
        if layer['type'] != 'tilelayer' or layer['name'] == 'collisions':
            continue
        dx, dy = layer.get('offsetx', 0), layer.get('offsety', 0)
        for i, gid in enumerate(layer['data']):
            if gid:
                img.alpha_composite(tile_image(terrain, decorations, gid), (i % width * TILE + dx, i // width * TILE + dy))
    return img


def grid(fill=0):
    return [[fill] * COLS for _ in range(ROWS)]


def flat(rows):
    return [gid for row in rows for gid in row]


def tile_layer(id, name, rows, **extra):
    return dict(id=id, name=name, type='tilelayer', data=flat(rows), width=COLS, height=ROWS,
                x=0, y=0, opacity=1, visible=True, **extra)


def objects(id, name, gid, width, height, spots):
    """Tile objects as Tiled stores them: (x, y) is the bottom-left, map px."""
    objs = [dict(gid=gid, width=width, height=height, x=x, y=y, id=100 * id + n, name='', type='',
                 rotation=0, visible=True) for n, (x, y) in enumerate(spots)]
    return dict(id=id, name=name, type='objectgroup', draworder='topdown', x=0, y=0, opacity=1,
                visible=True, objects=objs)


def build():
    level_1 = json.load(open('js/data/levels/Level_1.json'))
    last = ROWS - 1

    background = grid(BG)

    # Walls and floor, as Level 1's (corner, edge and brick tiles), but over the whole screen.
    outer = grid()
    outer[0] = [27] + [60] * (COLS - 2) + [28]
    for row in range(1, last):
        outer[row][0], outer[row][COLS - 1] = 42, 40
    outer[last] = [46] + [22] * (COLS - 2) + [47]

    # The throne room's back wall: Level 1's panel (top edge, brick, bottom edge) between the walls.
    inner = grid()
    for col in range(1, COLS - 1):
        top, mid, bottom = (135, 154, 173) if col == 1 else (137, 156, 175) if col == COLS - 2 else (136, 155, 174)
        inner[1][col] = top
        for row in range(2, last - 1):
            inner[row][col] = mid
        inner[last - 1][col] = bottom

    # Two window groups high on the back wall, either side of the middle.
    windows = grid()
    for first in (3, 9):
        for k in range(4):
            windows[2][first + k] = 271 + k
            windows[3][first + k] = 278 + k

    collisions = grid()
    collisions[0] = [COLLISION] * COLS
    collisions[last] = [COLLISION] * COLS
    for row in range(1, last):
        collisions[row][0] = collisions[row][COLS - 1] = COLLISION

    # Tiled objects (map px; the game draws at 2x). The Door's bottom sits on the floor:
    # 2y + 1 = floor top (512). The Giant King Pig's (x, y) is his top-left, in the enemyKing layer.
    plank_y = 241  # surface top = 2y - 34 = 448: a jump of 64 px from the floor, inside the King's 100 px
    layers = [
        tile_layer(2, 'background', background, offsetx=1, offsety=1),
        tile_layer(1, 'parede exterior', outer),
        tile_layer(3, 'parede interior', inner),
        tile_layer(4, 'janelas', windows),
        objects(14, 'cannon', 300, 44, 28, []),
        objects(15, 'enemy_match', 296, 26, 18, []),
        objects(10, 'platform', PLATFORM_GID, 104, 22, [(40, plank_y), (376, plank_y)]),
        objects(9, 'diamonds', 294, 12, 10, []),
        objects(5, 'porta', DOOR_GID, 46, 56, [(160, 255.5)]),
        objects(8, 'enemy', PIG_GID, 34, 28, []),
        objects(7, 'boxes', BOX_GID, 22, 16, []),
        # Hitbox middle x = 800: position.x = 800 - 55 - 45 = 700 = 2x. Falls onto the floor.
        objects(11, 'enemyKing', 293, 34, 28, [(350, 116)]),
        dict(id=6, name='collisions', type='tilelayer', data=flat(collisions), width=COLS, height=ROWS,
             x=0, y=0, opacity=0.52, visible=False),
    ]
    out = {k: v for k, v in level_1.items() if k != 'layers'}
    out['layers'] = layers
    out['nextlayerid'] = 16
    out['nextobjectid'] = 1500
    return out


if __name__ == '__main__':
    if sys.argv[1:2] == ['--check']:
        n = sys.argv[2]
        data = json.load(open(f'js/data/levels/Level_{n}.json'))
        mine = render(data['layers'], data['width'], data['height'])
        theirs = Image.open(f'img/Level {n}.png').convert('RGBA')
        diff = sum(1 for a, b in zip(mine.getdata(), theirs.getdata()) if a != b)
        print(mine.size, theirs.size, 'differing pixels:', diff)
        sys.exit(0)
    data = build()
    with open('js/data/levels/Level_25.json', 'w') as f:
        json.dump(data, f, indent=1)
        f.write('\n')
    render(data['layers']).save('img/Level 25.png')
    print('wrote Level_25.json and Level 25.png')
