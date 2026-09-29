"""Level 20, "Moonlit Thicket": at night the King crosses a thicket of tall grass
below a forest, riding a Rotating Platform over the first gap and Moving
Platforms between mossy forts, to the far fortress's Door.

Run from the repo root:  python3 tools/levels/level_20.py   (needs Pillow)
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from levelgen import Layout, build  # noqa: E402

LAYOUT = Layout(
    cols=123,
    pit_top=248,
    pit='grass',
    sky='moon',
    parallax=0.3,
    seed=20,
    ground=[
        (0, 0, 1),       # wall, left edge of the map
        (1, 6, 6),       # start
        (9, 10, 6),      # stepping stones: flat,
        (12, 13, 5),     # up one,
        (16, 17, 5),     # flat again,
        (20, 25, 6),     # first fort (Pig)
        (34, 37, 5),     # landing after the wheel
        (46, 52, 5),     # second fort (two Pigs)
        (55, 57, 5),     # stepping stones down
        (62, 64, 3),     # watchtower
        (75, 82, 4),     # King Pig's fort
        (97, 98, 2),     # pillar after the two ferries
        (108, 119, 5),   # the far fortress
        (120, 121, 3),   # its keep
        (122, 122, 0),   # outer wall, right edge of the map
    ],
    battlements=[(20, 5), (25, 5), (46, 4), (52, 4), (75, 3), (82, 3), (108, 4)],
    # The wheel: two planks round a hub, clockwise. Each comes level with the
    # first fort's outer battlement at the left of the turn (8 px off it),
    # carries the King up over the top, and sets him level with the landing at
    # the right (8 px off it).
    rotating_platforms=[
        dict(x=960, y=160, radius=70, period=9.0, arms=2, phase=0, direction=1),
    ],
    moving_platforms=[
        # Ferry from the landing to the second fort's battlement.
        dict(x=1222, y=160, dx=144, dy=0, period=4.5, phase=0),
        # Elevator from the stepping stones up to the watchtower.
        dict(x=1862, y=160, dx=0, dy=-64, period=4.5, phase=0),
        # A long ferry from the watchtower to the King Pig's fort.
        dict(x=2086, y=96, dx=208, dy=0, period=5.5, phase=0),
        # Two ferries in turn, the second a step higher.
        dict(x=2662, y=96, dx=110, dy=0, period=4.5, phase=0),
        dict(x=2878, y=64, dx=120, dy=0, period=4.5, phase=0.5),
        # The last ride slides diagonally down to the far fortress.
        dict(x=3174, y=64, dx=176, dy=64, period=6.0, phase=0),
    ],
    pigs=[(23, 6), (48, 5), (50, 5), (80, 4), (111, 5), (113, 5), (115, 5)],
    king_pigs=[(78, 4)],
    boxes=[(79, 4), (79, 3.5), (119, 5)],
    door=(117, 5),
    # Some on safe ground; the rest hang over the grass on the jump lines and
    # over the top of the wheel.
    diamonds=[
        (100, 170), (140, 170),
        (300, 150), (400, 130), (500, 120),
        (900, 110), (960, 76), (1020, 110),
        (1290, 130), (1390, 130),
        (1720, 100), (1880, 110),
        (2150, 70), (2300, 70),
        (2750, 70), (2960, 40),
        (3250, 60), (3330, 90),
        (3600, 130), (3660, 130),
    ],
    windows=[(1590, 180), (3560, 180), (3720, 180)],
    banners=[(2460, 136), (3500, 168), (3650, 168), (3866, 104)],
)

if __name__ == '__main__':
    build(20, LAYOUT)
