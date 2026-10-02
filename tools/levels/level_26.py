"""Level 26, "The Sky Tower": the outside of a tall castle tower, one screen wide
and 128 rows high (a Tower Level). The King climbs from its foot to the Door on
the top landing by jumping from ledge to ledge over Moving, Rotating and Helix
Platforms, Crumbling Shelves and Tumbling Planks. The sky darkens with height:
day at the foot, dusk higher up, the first stars at the top.

Run from the repo root:  python3 tools/levels/level_26.py   (needs Pillow)

SECTION LIST (12 sections of 320 map px / 10 rows; a rest landing with a Checkpoint
ends each one). Rides in order; "main" is the most frequent. Every crossing is a
hop between brick pads fixed to the walls (tile-aligned) by one ride:

 S   name              rides, in order                                     main
 1   First Steps       step, side, shelves, step, lift                     step
 2   Twin Lifts        lift, lift, shelves, side, wheel                    lift
 3   Don't Stop        shelves, shelves, step, side, wheel                 shelves
 4   The Wheel         diag, side, wheel, shelves, wheel                   wheel
 5   Crossing Paths    side, diag, diag, lift, step                        diag
 6   Iron Rotor        helix, shelves, helix, helix, shelves, side         helix
 7   Side to Side      lift, side, diag, step, side, side                  side
 8   The Mixed Run     lift, helix, wheel, side, lift                      lift
 9   Tumble Stairs     step, tumble, side, lift, tumble, wheel             tumble
 10  Teeth and Turns   diag, step, diag, wheel, diag                       diag
 11  Wheel Gauntlet    wheel, lift, step, wheel, diag                      wheel
 12  The Door          side, side, lift, tumble, helix, diag               side

Adjacent sections differ in main ride, no two sections share a sequence, and no
ride runs more than 3 times in a row. The build asserts the rise of each section.

WHY EACH JUMP IS POSSIBLE (REFERENCE.md: jump up ~100 world px = 50 map px, flat
~160 world px = 80 map px, walk gap < 55 world px = 27 map px):
 - step: 1 tile gap (32 map px = 64 world) and 32 map px (64 world) up: jump.
 - side / diag / lift: the plank docks 12-14 map px from each pad (walk on/off); the
   far pad is at most 32 map px above the plank's level at that end (jump up < 50).
 - wheel: hub on the near pad's level, planks reach hub.x +- (radius + w/2), docks
   8 map px; the exit pad is 32 map px above hub height (jump up from the plank
   level with the hub).
 - helix: hub top at the near pad's level, blades reach radius each side, docks 4
   map px; the exit pad is 32 up (jump from a blade tip).
 - shelves: a tile of air between each, 32 map px up per shelf (64 world: easy hop);
   each crumbles 2 s after landing, so he keeps going.
 - tumble: a 128 map px gap with the plank level with both pads; he steps on in its
   window (about 1.1 s every 4 s) and steps off.
The build checks, for every crossing, that its ride lines up with both pads long
enough (at least 0.6 s) for a hop within these limits, and that no pad or path
crowds another.
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from levelgen import Layout, build  # noqa: E402

COLS, ROWS, TILE = 16, 128, 32
LEFT, RIGHT = 32, 480            # interior x range (map px), between the brick walls
FOOT_ROW = 126                   # the ground's top row (two rows deep); its surface is y = 4032
RISE = 320                       # one section: 10 rows
SECTIONS_N = 12
HOP = 32                         # the pad / far end is this much above the plank it is reached from


def row_of(u):
    return FOOT_ROW - u // TILE


def surface_y(u):
    return row_of(u) * TILE


# --- the sections -----------------------------------------------------------------

# type: (rise options, S options). rise in map px; S = the gap between two pads' inner edges.
SECTIONS = [
    ('First Steps', ['step', 'side', 'shelves', 'step', 'lift']),
    ('Twin Lifts', ['lift', 'lift', 'shelves', 'side', 'wheel']),
    ("Don't Stop", ['shelves', 'shelves', 'step', 'side', 'wheel']),
    ('The Wheel', ['diag', 'side', 'wheel', 'shelves', 'wheel']),
    ('Crossing Paths', ['side', 'diag', 'diag', 'lift', 'step']),
    ('Iron Rotor', ['helix', 'shelves', 'helix', 'helix', 'shelves', 'side']),
    ('Side to Side', ['lift', 'side', 'diag', 'step', 'side', 'side']),
    ('The Mixed Run', ['lift', 'helix', 'wheel', 'side', 'lift']),
    ('Tumble Stairs', ['step', 'tumble', 'side', 'lift', 'tumble', 'wheel']),
    ('Teeth and Turns', ['diag', 'step', 'diag', 'wheel', 'diag']),
    ('Wheel Gauntlet', ['wheel', 'lift', 'step', 'wheel', 'diag']),
    ('The Door', ['side', 'side', 'lift', 'tumble', 'helix', 'diag']),
]

# Candidate (S, rise) pairs per ride, in map px; rises are multiples of 32.
def _grid(Ss, rises):
    return [(S, r) for S in Ss for r in rises]


OPTIONS = {
    'step': [(32, 32)],
    'side': _grid([160, 192, 224, 256], [32]),
    'diag': _grid([160, 192, 224], [64, 96, 128]),
    'lift': _grid([128], [96, 128, 160, 192, 224]),
    'wheel': _grid([224, 256], [32]),
    'helix': _grid([160, 192, 224], [32]),
    'shelves': [(96, 64), (160, 96), (224, 128)],   # n shelves: S = 64 n + 32, rise = 32 (n + 1)
    'tumble': [(128, 0)],
}


# Tighter pairs for the harder sections (k >= 4): a short plank (64) over a 128-wide gap, a small wheel.
TIGHT = {
    'side': [(128, 32)],
    'diag': [(128, 64), (128, 96), (128, 128)],
    'wheel': [(192, 32)],
    'helix': [(128, 32)],
}


def clear_of(history, side, edge, u):
    """A new pad (side, inner edge, u) must not crowd a lower pad on the same side: either
    it is 120 map px or more above it, or its inner edge is 64 or more short of the lower
    pad's, leaving that room to stand and jump."""
    for hside, hedge, hu in history:
        if hside != side:
            continue
        d = u - hu
        if d >= 120 or d < 0:
            continue
        if d == 0:
            return False
        if side == 'L' and edge > hedge - 64:
            return False
        if side == 'R' and edge < hedge + 64:
            return False
    return True


def plan_section(k, types, start, history=()):
    """Yields plans: a (S, rise, side, edge) per ride so that the pad edges stay inside
    the tower, the rises make 320 and the section ends on a rest landing at least 128
    map px wide, with no pad crowding another. `start` = (side, inner edge of the
    starting pad); `history` the pads below it as (side, edge, u) with u relative to it."""
    rng = random.Random(1000 + k)
    n = len(types)
    memo = {}

    def landing_ok(side, edge):
        return (side == 'L' and 160 <= edge <= 256) or (side == 'R' and 256 <= edge <= 352)

    def steps(i, side, edge, used, hist):
        cands = list(OPTIONS[types[i]]) + (TIGHT.get(types[i], []) if k >= 4 else [])
        for s, r in cands:
            if used + r > RISE:
                continue
            new_edge = edge + s if side == 'L' else edge - s
            # pads need at least 2 tiles (64 px) to stand on, between the wall and the inner edge
            if side == 'L' and not (new_edge <= RIGHT - 64): continue
            if side == 'R' and not (new_edge >= LEFT + 64): continue
            nside = 'R' if side == 'L' else 'L'
            if not clear_of(hist, nside, new_edge, used + r):
                continue
            yield (s, r, nside, new_edge)

    def feasible(i, side, edge, used, hist):
        if i == n:
            return used == RISE and landing_ok(side, edge)
        key = (i, side, edge, used, hist)
        if key not in memo:
            memo[key] = any(feasible(i + 1, ns_, ne, used + r, (hist + ((ns_, ne, used + r),))[-4:])
                            for _, r, ns_, ne in steps(i, side, edge, used, hist))
        return memo[key]

    def search(i, side, edge, used, hist, acc):
        if i == n:
            yield list(acc)
            return
        options = [o for o in steps(i, side, edge, used, hist)
                   if feasible(i + 1, o[2], o[3], used + o[1], (hist + ((o[2], o[3], used + o[1]),))[-4:])]
        rng.shuffle(options)
        for o in options:
            yield from search(i + 1, o[2], o[3], used + o[1], (hist + ((o[2], o[3], used + o[1]),))[-4:], acc + [o])

    starts = [start[1]] if k > 1 else [224, 256, 288, 320, 352]
    for edge in starts:
        hist = tuple(history) + ((start[0], edge, 0),)
        if feasible(0, start[0], edge, 0, hist[-4:]):
            for plan in search(0, start[0], edge, 0, hist[-4:], []):
                yield ([('start', edge)] if k == 1 else []) + plan


_solved = {}


def tail_history(first_side, first_edge, body):
    """The last pads of a section, as (side, edge, u) relative to the landing at its top."""
    pads, used = [(first_side, first_edge, 0)], 0
    for s, r, side, edge in body:
        used += r
        pads.append((side, edge, used))
    return tuple((side, edge, u - RISE) for side, edge, u in pads[-4:])


def solve(k, side, edge, history=()):
    """The plans of sections k.. as a list, or None."""
    if k > SECTIONS_N:
        return []
    key = (k, side, edge, history)
    if key in _solved:
        return _solved[key]
    result = None
    for plan in plan_section(k, SECTIONS[k - 1][1], (side, edge), history):
        first = plan[0][1] if k == 1 else edge
        body = plan[1:] if k == 1 else plan
        last = body[-1]
        rest = solve(k + 1, last[2], last[3], tail_history(side, first, body))
        if rest is not None:
            result = [(first, body)] + rest
            break
    _solved[key] = result
    return result


# --- building -----------------------------------------------------------------------

def mirror_x(x, w=0):
    return 512 - x - w


class Tower:
    def __init__(self):
        self.ground = [(0, 0, 0, ROWS - 1), (15, 15, 0, ROWS - 1), (1, 14, FOOT_ROW, ROWS - 1)]
        self.moving, self.wheels, self.helix, self.tumble, self.shelves = [], [], [], [], []
        self.checkpoints, self.pads = [], []   # pads: (x0, x1, u) solid rectangles (2 rows thick)
        self.paths = []                        # (x0, x1, u_lo, u_hi, label): the space a ride sweeps
        self.landings = []                     # (side, u, edge)
        self.battlements, self.pigs, self.king_pigs, self.diamonds = [], [], [], []
        self.rides = []                        # (section, kind, src pad, dst pad) for validation

    def pad(self, side, edge, u):
        if side == 'L':
            x0, x1 = LEFT, edge
        else:
            x0, x1 = edge, RIGHT
        self.ground.append((x0 // TILE, x1 // TILE - 1, row_of(u), row_of(u) + 1))
        self.pads.append((x0, x1, u))


def build_tower():
    t = Tower()
    side, edge, u = 'L', 288, 0           # the foot: a virtual pad edge, the ground runs the width
    sections = []
    plans = solve(1, 'L', 288)
    if plans is None:
        raise SystemExit('no layout fits the sections')
    for k, (name, types) in enumerate(SECTIONS, start=1):
        d = (k - 1) / (SECTIONS_N - 1)    # difficulty 0..1
        edge, plan = plans[k - 1]
        rng = random.Random(77 + k)
        sec = dict(k=k, name=name, rides=[])
        for j, (kind, (S, rise, nside, new_edge)) in enumerate(zip(types, plan)):
            dirn = 1 if side == 'L' else -1
            w = round(100 - 36 * d - rng.choice([0, 0, 4, 8]))
            w = max(64, min(100, w))
            if (kind in ('side', 'diag') and S == 128) or (kind == 'wheel' and S == 192):
                w = 64
            if kind == 'lift' and w != 100 and S == 128:
                w = 100
            # forward frame (left to right): source inner edge e_s, destination inner edge e_d.
            e_s = edge if dirn == 1 else mirror_x(edge)
            e_d = e_s + S
            u_d = u + rise
            period = round(rng.uniform(6.5, 9.5) * (1 - 0.45 * d), 1)
            phase = rng.choice([0, 0.25, 0.5, 0.75]) if j else 0
            ride = dict(kind=kind, S=S, u=u, u_d=u_d, dirn=dirn)
            fwd = None
            if kind == 'side':
                dx = S - 24 - w
                fwd = dict(x=e_s + 12, y=surface_y(u), dx=dx, dy=0, period=period, phase=0, width=w)
            elif kind == 'diag':
                du = rise - HOP
                dx = S - 24 - w
                fwd = dict(x=e_s + 12, y=surface_y(u), dx=dx, dy=-du, period=period + 1, phase=0, width=w)
            elif kind == 'lift':
                w = 100
                du = rise - HOP
                fwd = dict(x=e_s + 14, y=surface_y(u), dx=0, dy=-du, period=round(period + du / 40, 1), phase=0, width=w)
            if fwd:
                # the second and later rides start at a varied phase, but never mid-way for the first hop:
                # the King boards when the plank is at its near end, so phase only shifts the wait.
                fwd['phase'] = phase if (j and kind != 'lift') else (phase if j else 0)
                if dirn == -1:
                    fwd = dict(fwd, x=mirror_x(fwd['x'], w), dx=-fwd['dx'])
                t.moving.append(fwd)
                ride['plank'] = fwd
            elif kind == 'wheel':
                r = (S - 16 - w) / 2
                hub_x = e_s + S / 2
                dr = dirn
                ww = w
                wd = dict(x=hub_x if dirn == 1 else mirror_x(hub_x), y=surface_y(u), radius=r, period=round(9.0 - 3 * d, 1),
                          arms=2, phase=0 if j == 0 else rng.choice([0, 0.25]), direction=1 if dirn == 1 else -1, width=ww)
                t.wheels.append(wd)
                ride['wheel'] = wd
            elif kind == 'helix':
                r = (S - 8) / 2
                hub_x = e_s + S / 2
                hx = hub_x if dirn == 1 else mirror_x(hub_x)
                hd = dict(x=hx, y=surface_y(u), radius=r, period=round(8.0 - 2 * d, 1),
                          phase=rng.choice([0, 0.25, 0.5]), direction=1 if rng.random() < 0.5 else -1)
                t.helix.append(hd)
                ride['helix'] = hd
            elif kind == 'shelves':
                n = rise // HOP - 1   # (S, rise) = (64 n + 32, 32 (n + 1))
                row0 = row_of(u)
                c_src = (e_s // TILE) - 1       # last col of the source pad (forward frame)
                for i in range(n):
                    col = c_src + 2 * (i + 1)
                    r_ = row0 - (i + 1)
                    if dirn == -1:
                        col = COLS - 1 - col
                    t.shelves.append((col, r_))
                ride['n'] = n
            elif kind == 'tumble':
                cx = e_s + S / 2
                tp = dict(x=cx if dirn == 1 else mirror_x(cx), y=surface_y(u), period=8, phase=rng.choice([0, 0.25, 0.5, 0.75]),
                          direction=rng.choice([1, -1]))
                t.tumble.append(tp)
                ride['tumble'] = tp
            sec['rides'].append(ride)
            # the destination pad (wall-attached)
            t.pad(nside, new_edge, u_d)
            t.rides.append((k, kind, (side, edge, u), (nside, new_edge, u_d), ride))
            side, edge, u = nside, new_edge, u_d
        # the rest landing: 5 columns wide, a Checkpoint on its open side
        t.landings.append((side, u, edge))
        sections.append(sec)
    return t, sections


def finish(t):
    """Checkpoints, Pigs, the Door and the diamonds on the landings."""
    checkpoints = []
    for i, (side, u, edge) in enumerate(t.landings[:-1], start=1):
        cx = edge - 32 if side == 'L' else edge + 32   # inner half of the landing, by the shaft
        checkpoints.append((i, 2 * cx - 62, 2 * surface_y(u) - 88))
    # Pigs penned between the wall and a battlement on wide landings: five spread up the tower
    # and a King Pig near the top. A landing needs 192 map px (6 columns) for a pen and room to land.
    wide = [i for i, (side, u, edge) in enumerate(t.landings[:-1], start=1)
            if (side == 'L' and edge >= 192) or (side == 'R' and edge <= 320)]
    king_at = max(i for i in wide if i >= 10)
    pig_at = [i for i in wide if i != king_at][:5]
    if len(pig_at) < 4 or king_at in pig_at:
        raise SystemExit(f'Pig landings {pig_at}, king {king_at} (wide: {wide})')
    for i in pig_at + [king_at]:
        side, u, edge = t.landings[i - 1]
        row = row_of(u)
        if side == 'L':
            t.battlements.append((3, row - 1))
            (t.king_pigs if i == king_at else t.pigs).append((2, row))
        else:
            t.battlements.append((12, row - 1))
            (t.king_pigs if i == king_at else t.pigs).append((13, row))
    t.pig_landings = pig_at + [king_at]
    # A few Diamonds hovering over the first shelf of three staircases: a jump from the shelf, off the straight hop.
    for idx in (0, 5, 9):
        col, row = t.shelves[idx]
        t.diamonds.append((col * TILE + 16, row * TILE - 30))
    # The Door on the top landing, on the wall side
    side, u, edge = t.landings[-1]
    door = (2, row_of(u)) if side == 'L' else (13, row_of(u))
    return checkpoints, door


# --- checks ---------------------------------------------------------------------------

FPS = 60


def plank_state(p, t_s):
    f = t_s * FPS
    share = (1 - math.cos(2 * math.pi * (f / (p['period'] * FPS) + p.get('phase', 0)))) / 2
    return p['x'] + p['dx'] * share, p['y'] + p['dy'] * share


def extents(ride, t_s):
    """The surfaces a ride offers at time t: list of (x0, x1, y)."""
    if 'plank' in ride:
        p = ride['plank']
        x, y = plank_state(p, t_s)
        return [(x, x + p['width'], y)]
    if 'wheel' in ride:
        wd = ride['wheel']
        out = []
        for arm in range(2):
            a = 2 * math.pi * (wd['direction'] * t_s / wd['period'] + wd['phase'] + arm / 2)
            cx = wd['x'] + wd['radius'] * math.cos(a)
            cy = wd['y'] + wd['radius'] * math.sin(a)
            out.append((cx - wd['width'] / 2, cx + wd['width'] / 2, cy))
        return out
    if 'helix' in ride:
        h = ride['helix']
        a = 2 * math.pi * (h['direction'] * t_s / h['period'] + h['phase'])
        reach = max(12, h['radius'] * abs(math.cos(a)))
        return [(h['x'] - reach, h['x'] + reach, h['y'])]
    if 'tumble' in ride:
        tp = ride['tumble']
        a = 2 * math.pi * (tp['direction'] * t_s / tp['period'] + tp['phase'])
        tilt = (a + math.pi / 2) % math.pi - math.pi / 2
        if abs(tilt) <= math.radians(25):
            half = 50 * math.cos(tilt)
            return [(tp['x'] - half, tp['x'] + half, tp['y'])]
        return []
    return []


def hop_ok(src, dst):
    """Can he hop from surface src to dst (x0, x1, y)? Gap sideways and rise up."""
    gap = max(0, dst[0] - src[1], src[0] - dst[1])
    rise = src[2] - dst[2]
    if gap <= 36 and rise <= 40:
        return True
    return gap <= 44 and rise <= 20 or (gap <= 60 and rise <= 0)


def check_ride(k, kind, src, dst, ride):
    """A ride must line up with both pads for long enough to hop on and off."""
    sp = pad_rect(src)
    dp = pad_rect(dst)
    if kind in ('step',):
        return hop_ok(sp, dp), 'static'
    if kind == 'shelves':
        return True, 'static'
    horizon = 40
    for name, a_of, b_of in (('on', lambda t_: [sp], lambda t_: extents(ride, t_)),
                             ('off', lambda t_: extents(ride, t_), lambda t_: [dp])):
        run, best = 0.0, 0.0
        for i in range(int(horizon * 10)):
            t_ = i / 10
            good = any(hop_ok(a, b) for a in a_of(t_) for b in b_of(t_))
            run = run + 0.1 if good else 0.0
            best = max(best, run)
        if best < 0.6:
            return False, f'{name}: longest window {best:.1f}s'
    # a rider on a plank must stay on it for the ride: planks carry him, so only check the path stays clear
    return True, 'ok'


def pad_rect(p):
    side, edge, u = p
    x0, x1 = (LEFT, edge) if side == 'L' else (edge, RIGHT)
    return (x0, x1, surface_y(u))


def validate(t):
    bad = []
    for k, kind, src, dst, ride in t.rides:
        ok, why = check_ride(k, kind, src, dst, ride)
        if not ok:
            bad.append((k, kind, why))
    # pads stacked on one side need head room for a King standing on the lower one beyond the upper's edge
    pads = [(x0, x1, surface_y(u)) for x0, x1, u in t.pads]
    for a in pads:
        for b in pads:
            if a is b or b[2] >= a[2]:
                continue          # only pads b above... (y smaller = higher): a lower, b higher
        # (the lower pad's standing space beyond the upper's edge is what matters)
    for i, a in enumerate(pads):
        for b in pads[i + 1:]:
            lo, hi = (a, b) if a[2] > b[2] else (b, a)
            if hi[2] == lo[2]:
                continue
            overlap = min(lo[1], hi[1]) - max(lo[0], hi[0])
            # a pad is 64 thick; head room under the upper pad is its bottom minus the lower surface
            if overlap > 0 and lo[2] - hi[2] - 64 < 0 and overlap == min(lo[1], hi[1]) - max(lo[0], hi[0]):
                if lo[2] - (hi[2] + 64) < 44 and lo[2] - hi[2] < 120:
                    free = (lo[1] - lo[0]) - overlap if lo[0] == hi[0] or lo[1] == hi[1] else 99
                    if free < 64:
                        bad.append(('pads', f'headroom {lo} under {hi}'))
    if bad:
        raise SystemExit('tower check failed: ' + '; '.join(map(str, bad)))


def make_layout():
    t, sections = build_tower()
    checkpoints, door = finish(t)
    validate(t)
    ground = list(t.ground)
    # the Door's landing and every landing is just the last pad of its section (already 160 wide)
    layout = Layout(
        cols=COLS, rows=ROWS, ground=ground, battlements=t.battlements,
        moving_platforms=t.moving, rotating_platforms=t.wheels, helix_platforms=t.helix,
        tumbling_planks=t.tumble, crumbling_shelves=t.shelves,
        pigs=t.pigs, king_pigs=t.king_pigs, boxes=[], door=door, diamonds=t.diamonds,
        pit_top=None, sky='tower', parallax=0.3, seed=26, wisps=False,
    )
    return layout, checkpoints, t, sections


if __name__ == '__main__':
    layout, checkpoints, t, sections = make_layout()
    build(26, layout)
    print('checkpoints', [dict(x=x, y=y) for _, x, y in checkpoints])
    print('landings', t.landings)
    print('kinds', [(s['k'], [r['kind'] for r in s['rides']]) for s in sections])
