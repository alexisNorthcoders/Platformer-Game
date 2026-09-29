"""Level 23, "Drizzlewood": a pine forest in light rain under an overcast sky.
A level of precision: narrow footholds, near-max jumps and, in the last third,
short planks. Two Ferries, two Elevators, two Diagonal rides, two Rotating
Platforms and two Helix Platforms carry the King over a thicket of tall grass,
past four forts, to the King Pig's fort and the Door.

The route is written as a walk along the map (`isle`, `ride`...), so every gap
and dock is computed, not typed. Every transition, and the reason it works:

  flat gap of 2 tiles (128 px)   jump: 160 px flat reach (REFERENCE.md)
  up one tile, gap of 1 tile     jump: rise 64 px < 100 px, 64 px gap << 128 px in the air
  down one tile, gap of 2 tiles  jump: falls further than it rises, 128 px gap < 160 px
  1-tile battlement              jump: 64 px < 100 px
  Ferry, Elevator, Diagonal      dock gaps of 4-16 map px (8-32 world px) < 55 px hitbox
  wheel, Helix                   docks 4-8 map px off the plank / blade tips (REFERENCE.md)

Run from the repo root:  python3 tools/levels/level_23.py   (needs Pillow)
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from levelgen import Layout, TILE, build  # noqa: E402

ground, battlements, ferries, wheels, helixes = [(0, 0, 1)], [], [], [], []
pigs, king_pigs, boxes, checkpoints = [], [], [], []
col = 1  # the next free tile column


def isle(width, top, gap=0, checkpoint=False):
    """A wall `width` tiles wide, `gap` tiles on from the last; returns its first column."""
    global col
    col += gap
    first = col
    ground.append((first, first + width - 1, top))
    col += width
    if checkpoint:
        checkpoints.append((first + (width - 1) // 2, top))
    return first


def fort(width, top, pig_cols, king_col=None, checkpoint=True):
    """A fort: `width` tiles with a battlement at each end. Pigs stand on `pig_cols` (offsets)."""
    first = isle(width, top)
    battlements.extend([(first, top - 1), (first + width - 1, top - 1)])
    pigs.extend((first + c, top) for c in pig_cols)
    if king_col is not None:
        king_pigs.append((first + king_col, top))
    if checkpoint:  # on the outer battlement's neighbour, well clear of the Pigs
        checkpoints.append((first + width - 1, top - 1))
    return first


def gap_px(tiles):
    return tiles * TILE


def ferry(tiles, row, width=100, period=4.5, phase=0):
    """Crosses `tiles` of grass at the height of the walls either side, 4 map px off each."""
    global col
    edge = col * TILE
    ferries.append(dict(x=edge + 4, y=row * TILE, dx=gap_px(tiles) - 8 - width, dy=0,
                        period=period, phase=phase, width=width))
    col += tiles


def elevator(tiles, row, rise, width=100, period=5.0):
    """A lift from the wall on the left at `row` up `rise` map px to the taller wall on the right."""
    global col
    edge = col * TILE
    ferries.append(dict(x=edge + (gap_px(tiles) - width) // 2, y=row * TILE, dx=0, dy=-rise,
                        period=period, phase=0, width=width))
    col += tiles


def diagonal(tiles, row, fall, width=100, period=6.0):
    """Slides from the wall on the left at `row` down (`fall` > 0) or up to the wall on the right."""
    global col
    edge = col * TILE
    ferries.append(dict(x=edge + 4, y=row * TILE, dx=gap_px(tiles) - 8 - width, dy=fall,
                        period=period, phase=0, width=width))
    col += tiles


def wheel(tiles, row, radius, width=100, period=9.0, direction=1):
    """A Rotating Platform: its planks reach hub.x +- (radius + width / 2), 8 map px off each wall."""
    global col
    assert gap_px(tiles) == 2 * radius + width + 16, (tiles, radius, width)
    wheels.append(dict(x=col * TILE + gap_px(tiles) // 2, y=row * TILE, radius=radius, period=period,
                       arms=2, phase=0, direction=direction, width=width))
    col += tiles


def helix(tiles, row, period=8.0, phase=0, direction=1):
    """A Helix Platform: blades reaching 4 map px short of the walls each side."""
    global col
    radius = (gap_px(tiles) - 8) // 2
    helixes.append(dict(x=col * TILE + gap_px(tiles) // 2, y=row * TILE, radius=radius, period=period,
                        phase=phase, direction=direction))
    col += tiles


# --- The first third: the widest footholds, full-length planks ---------------------
isle(6, 6)                                   # start
isle(3, 6, gap=2, checkpoint=True)           # flat, 2-tile gap
isle(3, 5, gap=1, checkpoint=True)           # up one, 1-tile gap
ferry(8, 5)                                  # Ferry 1 over the thicket to fort 1
fort(7, 5, [2, 4])                           # fort 1 (two Pigs)
elevator(4, 5, 96)                           # Elevator 1: up to the tower
isle(3, 2, checkpoint=True)                  # tower, 3 wide
isle(2, 3, gap=2)                            # down one, 2-tile gap
isle(2, 3, gap=2, checkpoint=True)           # flat
isle(2, 3, gap=2)                            # flat
diagonal(8, 3, 64)                          # Diagonal ride 1: down to fort 2
fort(9, 5, [2, 5])                           # fort 2 (two Pigs)
wheel(8, 5, 70)                              # Rotating Platform 1, full planks
isle(3, 5, checkpoint=True)
isle(2, 5, gap=2)
ferry(8, 5, period=4.5, phase=0.5)           # Ferry 2 to fort 3
fort(7, 5, [2, 4])                           # fort 3 (two Pigs)

# --- The middle: narrow footholds, the first Helix, shorter planks -----------------
helix(6, 5)                                  # Helix Platform 1
isle(2, 5)
wheel(6, 5, 56, width=64, period=7.5)        # Rotating Platform 2, short planks
isle(2, 5, checkpoint=True)

# --- The last third: 1-tile islands, step-ups, the shortest planks -----------------
isle(1, 5, gap=2)                            # 1 wide, flat 2-tile gap
isle(2, 4, gap=1)                            # up one, 1-tile gap
isle(1, 4, gap=2, checkpoint=True)           # flat 2-tile gap
isle(2, 3, gap=1)                            # up one, 1-tile gap
isle(1, 3, gap=2)                            # flat 2-tile gap
helix(7, 3, phase=0.1, direction=-1)         # Helix Platform 2 over the widest gap
isle(2, 3, checkpoint=True)
isle(1, 4, gap=2)                            # down one, 2-tile gap
isle(2, 4, gap=2)                            # flat
elevator(3, 4, 64, width=64, period=4.5)     # Elevator 2, a short plank
isle(2, 2, checkpoint=True)                  # the last tower
diagonal(8, 2, 96, width=64, period=7.0)    # Diagonal ride 2, short plank, down to fort 4
fort_first = fort(7, 5, [2], king_col=4)     # fort 4: a Pig and the King Pig
boxes.extend([(fort_first + 1, 5), (fort_first + 5, 5)])
door = (fort_first + 3, 5)
isle(2, 3)                                   # the keep
ground.append((col, col, 0))                 # outer wall, right edge of the map
cols = col + 1

# A diamond over the middle of each gap between walls of the same island run, on the jump line.
diamonds = []
runs = sorted(g for g in ground[1:-1] if g[1] - g[0] < 12)
for (a, b, top), (c, d, top2) in zip(runs, runs[1:]):
    if c - b - 1 in (1, 2) and abs(top - top2) <= 1:
        diamonds.append(((b + 1 + (c - b - 1) / 2) * TILE, min(top, top2) * TILE - 44))

LAYOUT = Layout(
    cols=cols,
    pit_top=248,
    pit='grass',
    sky='overcast',
    puddles=True,
    parallax=0.3,
    seed=23,
    ground=ground,
    battlements=battlements,
    moving_platforms=ferries,
    rotating_platforms=wheels,
    helix_platforms=helixes,
    pigs=pigs,
    king_pigs=king_pigs,
    boxes=boxes,
    door=door,
    diamonds=diamonds,
    windows=[],
    banners=[],
)

if __name__ == '__main__':
    print('cols', cols, 'checkpoints', len(checkpoints))
    # levels.js `checkpoints`: the King's position, standing on the top of tile (col, top).
    for c, top in checkpoints:
        print(f'            {{ x: {c * 64 - 30}, y: {top * 64 - 88} }},')
    build(23, LAYOUT)
