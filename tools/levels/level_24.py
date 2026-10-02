"""Level 24, "Thunderholm": a Viking village on a hill under a storm-lit blue sky.
The ground runs like a village street and the gaps are Spike Ditches cut down
into it. Three Tumbling Planks (one in each third) cross the ditches, a Ferry
crosses a wide one and an Elevator lifts the King up to a tower. Four forts pen
in the Pigs; the last holds the King Pig and the Door. Lightning, no rain.

The pit is 'spike' at 256 (row 8), so a ditch beside a row-6 street is 2 tiles
deep and beside a row-5 one 3. Every transition, and the reason it works:

  flat gap of 2 tiles (128 px)     jump: 160 px flat reach (REFERENCE.md)
  up one, gap of 2 tiles           jump: rise 64 px < 100 px
  down one, gap of 2 tiles         jump: falls further than it rises
  1-tile battlement                jump: 64 px < 100 px
  Ferry, Elevator                  docks 4-14 map px (8-28 world px) < 55 px hitbox
  Tumbling Plank over 4 tiles      the plank is 100 map px in a 128 map px ditch, so
                                   14 map px (28 world px) either side: the King can't fall
                                   through its top face, he stands within 25 degrees of
                                   flat and slides down it (and can jump) when it tilts;
                                   200 px in about 0.85 s at 4 px/frame
  tower to the street              walk off the ledge: a 4-row drop

Run from the repo root:  python3 tools/levels/level_24.py   (needs Pillow)
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from levelgen import Layout, TILE, build  # noqa: E402

ground, battlements, ferries, planks = [(0, 0, 1)], [], [], []
pigs, king_pigs, boxes, checkpoints = [], [], [], []
col = 1  # the next free tile column


def street(width, top, gap=0, checkpoint=None):
    """A wall `width` tiles wide, `gap` tiles on from the last; returns its first column.
    `checkpoint` is the offset of the tile the King's flag stands on."""
    global col
    col += gap
    first = col
    ground.append((first, first + width - 1, top))
    col += width
    if checkpoint is not None:
        checkpoints.append((first + checkpoint, top))
    return first


def fort(width, top, pig_cols, king_col=None):
    """A fort: `width` tiles with a battlement at each end; Pigs stand on `pig_cols` (offsets)."""
    first = street(width, top)
    battlements.extend([(first, top - 1), (first + width - 1, top - 1)])
    pigs.extend((first + c, top) for c in pig_cols)
    if king_col is not None:
        king_pigs.append((first + king_col, top))
    return first


def plank(tiles, top, phase=0, direction=1):
    """A Tumbling Plank over a Spike Ditch `tiles` wide, its middle at the ditch's middle, level with the street."""
    global col
    planks.append(dict(x=col * TILE + tiles * TILE // 2, y=top * TILE, period=8, phase=phase, direction=direction))
    col += tiles


def ferry(tiles, row, width=100, period=4.5, phase=0):
    """Crosses a `tiles`-wide ditch at the height of the streets either side, 4 map px off each."""
    global col
    ferries.append(dict(x=col * TILE + 4, y=row * TILE, dx=tiles * TILE - 8 - width, dy=0,
                        period=period, phase=phase, width=width))
    col += tiles


def elevator(tiles, row, rise, width=100, period=5.0):
    """A lift from the street on the left at `row` up `rise` map px to the tower on the right."""
    global col
    ferries.append(dict(x=col * TILE + (tiles * TILE - width) // 2, y=row * TILE, dx=0, dy=-rise,
                        period=period, phase=0, width=width))
    col += tiles


# --- The first third ---------------------------------------------------------------
street(8, 6)                                  # start
street(4, 6, gap=2, checkpoint=1)             # flat, 2-tile ditch; checkpoint before the plank
plank(4, 6)                                   # Tumbling Plank 1
fort_a = fort(9, 6, [2, 6])                   # fort A (two Pigs)
checkpoints.append((fort_a + 8, 5))           # on the outer battlement, clear of the Pigs
street(4, 5, gap=2)                           # up one, 2-tile ditch
street(4, 5, gap=2)                           # flat, 2-tile ditch
ferry(7, 5)                                   # the Ferry over a wide ditch to fort B

# --- The middle ----------------------------------------------------------------------
fort_b = fort(9, 5, [2, 6])                   # fort B (two Pigs)
checkpoints.append((fort_b + 8, 4))
street(3, 5)
elevator(4, 5, 96)                            # the Elevator up to the tower
street(4, 2, checkpoint=1)                    # the tower, over the village
street(7, 6)                                  # the street 4 rows below: walk off the ledge
checkpoints.append((col - 4, 6))
plank(4, 6)                                   # Tumbling Plank 2
fort_c = fort(9, 6, [2, 6])                   # fort C (two Pigs)
checkpoints.append((fort_c + 8, 5))

# --- The last third ------------------------------------------------------------------
street(4, 5, gap=2)                           # up one, 2-tile ditch
street(4, 6, gap=2, checkpoint=1)             # down one; checkpoint before the last plank
plank(4, 6, phase=0.25, direction=-1)         # Tumbling Plank 3
fort_d = fort(10, 6, [2], king_col=6)         # fort D: a Pig and the King Pig
boxes.extend([(fort_d + 1, 6), (fort_d + 4, 6), (fort_d + 4, 5.5)])
door = (fort_d + 7, 6)
ground.append((col, col, 0))                  # outer wall, right edge of the map
cols = col + 1

# A diamond over the middle of each 2-tile ditch, on the jump line.
diamonds = []
runs = [g for g in ground[1:-1]]
for (a, b, top), (c, d, top2) in zip(runs, runs[1:]):
    if c - b - 1 == 2 and abs(top - top2) <= 1:
        diamonds.append(((b + 1 + (c - b - 1) / 2) * TILE, min(top, top2) * TILE - 44))

LAYOUT = Layout(
    cols=cols,
    pit_top=256,
    pit='spike',
    sky='storm',
    parallax=0.3,
    seed=24,
    ground=ground,
    battlements=battlements,
    moving_platforms=ferries,
    tumbling_planks=planks,
    pigs=pigs,
    king_pigs=king_pigs,
    boxes=boxes,
    door=door,
    diamonds=diamonds,
    windows=[],
    banners=[],
)

if __name__ == '__main__':
    print('cols', cols, 'checkpoints', len(checkpoints), 'planks', planks)
    # levels.js `checkpoints`: the King's position, standing on the top of tile (col, top).
    for c, top in sorted(checkpoints):
        print(f'            {{ x: {c * 64 - 30}, y: {top * 64 - 88} }},')
    build(24, LAYOUT)
