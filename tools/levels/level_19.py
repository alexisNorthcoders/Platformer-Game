"""Level 19, "Sinking Sands": the King crosses a sea of quicksand under a low
desert sun, hopping stone to stone and riding Moving Platforms between ruined
forts, to the far fortress's Door.

Run from the repo root:  python3 tools/levels/level_19.py   (needs Pillow)
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from levelgen import Layout, build  # noqa: E402

LAYOUT = Layout(
    cols=112,
    pit_top=248,
    pit='sand',
    sky='sun',
    parallax=0.3,
    seed=19,
    ground=[
        (0, 0, 1),       # wall, left edge of the map
        (1, 6, 6),       # start
        (9, 10, 6),      # stepping stones: flat,
        (12, 13, 5),     # up one,
        (16, 17, 5),     # flat again,
        (20, 25, 6),     # first fort (Pig)
        (33, 38, 6),     # second fort (two Pigs)
        (43, 46, 3),     # watchtower
        (49, 50, 4),     # stepping stones down
        (53, 54, 5),
        (62, 68, 5),     # King Pig's fort
        (83, 84, 4),     # pillar after the two ferries
        (86, 87, 3),     # its step up
        (97, 108, 5),    # the far fortress
        (109, 110, 3),   # its keep
        (111, 111, 0),   # outer wall, right edge of the map
    ],
    battlements=[(20, 5), (25, 5), (33, 5), (38, 5), (62, 4), (68, 4), (97, 4)],
    moving_platforms=[
        # Ferry across the first stretch of sand.
        dict(x=836, y=192, dx=116, dy=0, period=4.5, phase=0),
        # Elevator from the second fort up to the watchtower.
        dict(x=1252, y=192, dx=0, dy=-96, period=5.0, phase=0),
        # Ferry from the stepping stones to the King Pig's fort.
        dict(x=1764, y=160, dx=116, dy=0, period=4.0, phase=0),
        # Two ferries in turn, the second a step higher.
        dict(x=2212, y=160, dx=100, dy=0, period=4.5, phase=0),
        dict(x=2416, y=128, dx=136, dy=0, period=4.5, phase=0.5),
        # The last ride slides diagonally down to the far fortress.
        dict(x=2820, y=96, dx=180, dy=64, period=6.0, phase=0),
    ],
    pigs=[(23, 6), (35, 6), (36, 6), (63, 5), (99, 5), (101, 5), (103, 5)],
    king_pigs=[(65, 5)],
    boxes=[(66, 5), (66, 4.5), (107, 5)],
    door=(105, 5),
    # Some on safe ground; the rest hang over the sand on the jump lines.
    diamonds=[
        (100, 170), (140, 170),
        (300, 150), (400, 130), (500, 120),
        (900, 150), (980, 150),
        (1300, 60),
        (1420, 70), (1460, 70),
        (1590, 100), (1720, 130),
        (1840, 120), (1920, 120),
        (2300, 120), (2440, 90), (2560, 90),
        (2780, 60),
        (2900, 80), (3000, 110),
        (3200, 130), (3260, 130),
    ],
    windows=[(1420, 124), (3170, 180), (3330, 180)],
    banners=[(3130, 168), (3260, 168), (3526, 104)],
)

if __name__ == '__main__':
    build(19, LAYOUT)
