"""Level 18, "Sky Moat": the King crosses a moat under an open sky, from
island to island on Moving Platforms, to the far castle's Door.

Run from the repo root:  python3 tools/levels/level_18.py   (needs Pillow)
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from levelgen import Layout, build  # noqa: E402

LAYOUT = Layout(
    cols=100,
    water_top=248,
    parallax=0.3,
    seed=18,
    ground=[
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
    ],
    battlements=[(17, 5), (22, 5), (45, 5), (50, 5), (73, 4), (80, 4), (90, 2)],
    moving_platforms=[
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
    ],
    pigs=[(19, 6), (47, 6), (48, 6), (77, 5), (94, 3), (96, 3)],
    king_pigs=[(76, 5)],
    boxes=[(78, 5), (78, 4.5), (97, 3)],
    door=(93, 3),
    # Some on safe ground; the rest hang over the water on the jump lines.
    diamonds=[
        (80, 170), (112, 170),
        (256, 150),
        (560, 170), (592, 170),
        (910, 70), (950, 70),
        (1130, 70), (1300, 95), (1400, 90),
        (1792, 30),
        (1900, 80), (2000, 150), (2150, 70),
        (2600, 110), (2720, 60),
        (3040, 70), (3072, 70),
    ],
    windows=[(876, 128), (3004, 124), (3100, 124)],
    banners=[(2952, 104), (3060, 104), (3152, 104)],
)

if __name__ == '__main__':
    build(18, LAYOUT)
