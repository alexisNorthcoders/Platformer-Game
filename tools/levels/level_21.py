"""Level 21, "Caldera": under a smoky sky the King crosses a floor of lava below a
volcano, riding two Rotating Platforms and timing two Helix Platforms between
hot forts, to the far fortress's Door.

Run from the repo root:  python3 tools/levels/level_21.py   (needs Pillow)
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from levelgen import Layout, build  # noqa: E402

LAYOUT = Layout(
    cols=99,
    pit_top=248,
    pit='lava',
    sky='smoke',
    parallax=0.3,
    seed=21,
    ground=[
        (0, 0, 1),       # wall, left edge of the map
        (1, 6, 6),       # start
        (9, 10, 6),      # stepping stones: flat,
        (12, 14, 5),     # up one,
        (16, 21, 5),     # first fort (two Pigs)
        (30, 33, 4),     # landing after the first wheel
        (40, 43, 4),     # landing after the first helix
        (46, 53, 5),     # second fort (two Pigs)
        (62, 65, 4),     # landing after the second wheel
        (67, 69, 3),     # up one
        (77, 79, 3),     # landing after the second helix
        (82, 95, 4),     # the far fortress
        (96, 97, 2),     # its keep
        (98, 98, 0),     # outer wall, right edge of the map
    ],
    battlements=[(16, 4), (21, 4), (46, 4), (53, 4), (82, 3)],
    # Two wheels, clockwise, each from a fort's outer battlement (8 px off it)
    # up over the top and down level with the next landing (8 px off it).
    rotating_platforms=[
        dict(x=832, y=128, radius=70, period=9.0, arms=2, phase=0, direction=1),
        dict(x=1856, y=128, radius=70, period=9.0, arms=2, phase=0.25, direction=1),
    ],
    # Two rotors, their blades reaching 4 px short of the landings each side
    # when they point across; the hub is always there to wait on.
    helix_platforms=[
        dict(x=1184, y=128, radius=92, period=8.0, phase=0, direction=1),
        dict(x=2352, y=96, radius=108, period=8.0, phase=0.1, direction=-1),
    ],
    pigs=[(18, 5), (19, 5), (48, 5), (50, 5), (85, 4), (87, 4), (91, 4)],
    king_pigs=[(89, 4)],
    boxes=[(47, 5), (84, 4), (84, 3.5), (95, 4)],
    door=(93, 4),
    # Some on safe ground; the rest over the lava on the jump lines, over the
    # tops of the wheels and along the rotors.
    diamonds=[
        (100, 170), (140, 170),
        (256, 150), (400, 120),
        (770, 90), (832, 40), (894, 90),
        (1130, 110), (1238, 110),
        (1420, 100),
        (1794, 90), (1856, 40), (1918, 90),
        (2090, 90),
        (2290, 80), (2414, 80),
        (2592, 70),
        (2760, 110), (2900, 110),
    ],
    windows=[(590, 180), (2700, 150), (2950, 150)],
    banners=[(1500, 176), (2040, 140), (3098, 80)],
)

if __name__ == '__main__':
    build(21, LAYOUT)
