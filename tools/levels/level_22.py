"""Level 22, "Crumbling Heights": floating brick islands high above a Cloud Bank,
under a blue daytime sky. Crumbling Shelves carry the King between the islands
and three Rotating Platforms bridge the forts, to the far fort's Door.

Run from the repo root:  python3 tools/levels/level_22.py   (needs Pillow)
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from levelgen import Layout, build  # noqa: E402

SHELVES = [
    (9, 4), (11, 3), (13, 2),    # a rising staircase off the start island
    (37, 3), (39, 2), (41, 3),   # up and down again between the second and third islands
    (50, 4), (52, 3), (54, 4),   # single shelves, a tile of air between each
    (79, 3), (81, 2), (83, 3),   # another hill
]
WHEELS = [
    dict(x=864, y=128, radius=70, period=9.0, arms=2, phase=0, direction=1),
    dict(x=2208, y=128, radius=70, period=9.0, arms=2, phase=0.25, direction=1),
    dict(x=3040, y=128, radius=70, period=9.0, arms=2, phase=0.5, direction=1),
]

LAYOUT = Layout(
    cols=110,
    pit_top=248,
    pit='cloud',
    sky='clouds',
    parallax=0.3,
    seed=22,
    ground=[
        (0, 0, 1),           # wall, left edge of the map
        (1, 7, 5, 6),        # start island
        (15, 22, 5, 6),      # first fort (two Pigs)
        (31, 35, 4, 5),      # landing after the first wheel
        (44, 48, 4, 5),      # island between the shelves
        (57, 64, 5, 6),      # second fort (three Pigs)
        (73, 77, 4, 5),      # landing after the second wheel
        (86, 90, 4, 5),      # island before the third wheel
        (99, 108, 5, 6),     # the far fort (Pigs and a King Pig)
        (109, 109, 0),       # outer wall, right edge of the map
    ],
    battlements=[(15, 4), (22, 4), (57, 4), (64, 4), (99, 4), (108, 4)],
    crumbling_shelves=SHELVES,
    # Three wheels, all clockwise, each from an island's edge (8 px off it) up
    # over the top and down level with the next island (8 px off it).
    rotating_platforms=WHEELS,
    pigs=[(17, 5), (19, 5), (59, 5), (60, 5), (62, 5), (101, 5), (102, 5), (104, 5)],
    king_pigs=[(105, 5)],
    boxes=[(58, 5), (100, 5), (106, 5)],
    door=(107, 5),
    # Above the shelves and over the tops of the wheels, plus some on the islands.
    diamonds=[(col * 32 + 16, row * 32 - 26) for col, row in SHELVES] + [
        (w['x'], w['y'] - w['radius'] - 24) for w in WHEELS
    ] + [(150, 120), (1100, 90), (1470, 90), (2400, 90), (2960, 90), (3300, 100)],
)

if __name__ == '__main__':
    build(22, LAYOUT)
