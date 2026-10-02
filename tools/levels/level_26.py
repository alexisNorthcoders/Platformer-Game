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
 1   First Steps       step, side, shelves, side, lift                     side
 2   Twin Lifts        shelves, lift, wheel, side, lift                    lift
 3   Don't Stop        shelves, diag, wheel, side, shelves                 shelves
 4   The Wheel         diag, wheel, lift, wheel, shelves                   wheel
 5   Crossing Paths    side, diag, diag, lift, helix                       diag
 6   Iron Rotor        helix, shelves, helix, helix, shelves, side         helix
 7   Side to Side      lift, side, diag, helix, side, side                 side
 8   The Mixed Run     lift, helix, lift, wheel, side                      lift
 9   Tumble Stairs     diag, tumble, shelves, side, lift, tumble           tumble
 10  Teeth and Turns   shelves, diag, diag, diag, wheel                    diag
 11  Wheel Gauntlet    diag, wheel, lift, wheel, side                      wheel
 12  The Door          diag, helix, side, side, lift, tumble               side

Adjacent sections differ in main ride, no two sections share a sequence, and no
ride runs more than 3 times in a row. The build asserts the rise of each section.
The orders above are the ones that fit; when a listed order does not, the solver
tries the section's other orders (`orders`).

Only the very first ride is a step: a step back over any other crossing puts its
pad in that crossing's air (see below), so later sections have none.

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
enough (at least 0.6 s) for a hop within these limits.

HEAD ROOM. Pads are one row of brick (PAD). Every crossing has an air zone
(`air_zone`): STAND map px over everywhere he stands or rides, JUMP over where he
takes off, and a sweep (`ride_sweep`): where its planks, blades or shelves pass. No
pad may hang into another crossing's air or sweep, and no plank may pass through a
helix, tumbling plank or shelf. The planner keeps to this and `validate` checks it
over the whole tower, so the King never hits a ceiling mid-jump.
"""

import functools
import itertools
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
PAD = 32                         # a pad's thickness: one row of brick, leaving head room under it
SINK = 4                         # a rising plank (lift, diag) starts this far below its pad, so he can walk on


def row_of(u):
    return FOOT_ROW - u // TILE


def surface_y(u):
    return row_of(u) * TILE


def mirror_x(x, w=0):
    return 512 - x - w


# --- the sections -----------------------------------------------------------------

# type: (rise options, S options). rise in map px; S = the gap between two pads' inner edges.
SECTIONS = [
    ('First Steps', ['step', 'side', 'shelves', 'side', 'lift']),
    ('Twin Lifts', ['shelves', 'lift', 'wheel', 'side', 'lift']),
    ("Don't Stop", ['shelves', 'diag', 'wheel', 'side', 'shelves']),
    ('The Wheel', ['diag', 'wheel', 'lift', 'wheel', 'shelves']),
    ('Crossing Paths', ['side', 'diag', 'diag', 'lift', 'helix']),
    ('Iron Rotor', ['helix', 'shelves', 'helix', 'helix', 'shelves', 'side']),
    ('Side to Side', ['lift', 'side', 'diag', 'helix', 'side', 'side']),
    ('The Mixed Run', ['lift', 'helix', 'lift', 'wheel', 'side']),
    ('Tumble Stairs', ['diag', 'tumble', 'shelves', 'side', 'lift', 'tumble']),
    ('Teeth and Turns', ['shelves', 'diag', 'diag', 'diag', 'wheel']),
    ('Wheel Gauntlet', ['diag', 'wheel', 'lift', 'wheel', 'side']),
    ('The Door', ['diag', 'helix', 'side', 'side', 'lift', 'tumble']),
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
    """A new pad (side, inner edge, u) must not sit level with a lower pad on the same side
    (the two would run together). Head room round pads is the air zones' job."""
    return not any(hside == side and hu == u for hside, hedge, hu, *_ in history)


# The King's head room (map px; REFERENCE.md: hitbox 53 world px tall, a jump rises ~100).
STAND = 40        # above a surface he stands or rides on
JUMP = 80         # above a surface he jumps from
MARGIN = 32       # how far a crossing's air reaches onto the pads each side of its gap
KEEP = 6          # pads (and their crossings) the planner remembers below the current one
PLANS_TRIED = 2   # plans per ride order the solver tries for a section
CANDIDATES = 6    # plans in all the solver tries for a section before backtracking


def pad_x(side, edge):
    return (LEFT, edge) if side == 'L' else (edge, RIGHT)


def plank_widths(k, kind, S):
    """The narrowest and widest plank build_tower can give this ride in section k."""
    if (kind in ('side', 'diag') and S == 128) or (kind == 'wheel' and S == 192):
        return (64, 64)
    if kind == 'lift':
        return (100, 100)
    return (max(64, round(100 - 36 * (k - 1) / (SECTIONS_N - 1) - 8)), 100)


def ride_height(k, kind, S, e_s, u_s, u_d, x):
    """The highest u a ride's surface reaches over x (forward frame), or None where it never
    passes. Worked out for every plank width the ride may get."""
    best = None
    for w in plank_widths(k, kind, S):
        h = None
        if kind in ('side', 'helix'):
            h = u_s if e_s <= x <= e_s + S else None
        elif kind == 'lift':
            h = u_d - HOP if e_s <= x <= e_s + S else None
        elif kind == 'diag':
            x_lo, dx = e_s + 12, S - 24 - w
            if x_lo <= x <= x_lo + dx + w:
                share = min(1, max(0, (x - x_lo) / dx)) if dx > 0 else 1
                h = u_s + (u_d - HOP - u_s) * share
        elif kind == 'wheel':
            r, hub = (S - 16 - w) / 2, e_s + S / 2
            off = max(0, abs(x - hub) - w / 2)
            h = u_s + math.sqrt(r * r - off * off) if off <= r else None
        elif kind == 'tumble':
            h = u_s + 22 if e_s <= x <= e_s + S else None   # an end, tilted 25° from flat
        if h is not None:
            best = h if best is None else max(best, h)
    return best


@functools.lru_cache(maxsize=None)
def air_zone(k, kind, S, side, edge, u_s, u_d):
    """The space a crossing needs free of brick, as rectangles (x0, x1, lo, hi) in map px
    with u heights (a pad occupies u in (top - PAD, top]): room to stand on the pads by the
    gap and on the ride all the way across, room to jump where he takes off, and the space
    a wheel or tumbling plank sweeps below the pads' level. Worked out left to right from
    the source pad's inner edge, then mirrored for a crossing that starts on the right."""
    e_s = edge if side == 'L' else mirror_x(edge)
    e_d, lo = e_s + S, min(u_s, u_d)
    rects = []
    if kind == 'step':
        rects.append((e_s - MARGIN, e_d + MARGIN, lo, max(u_s + JUMP, u_d + STAND)))
    elif kind == 'shelves':
        # a hop from each step of the staircase (the pad, then each shelf) to the next
        n = (u_d - u_s) // HOP - 1
        for i in range(n + 1):
            x0 = e_s - MARGIN if i == 0 else e_s + 64 * i - 32
            x1 = e_d + MARGIN if i == n else e_s + 64 * (i + 1)
            rects.append((x0, x1, lo, u_s + HOP * i + JUMP))
    else:
        rects.append((e_s - MARGIN, e_s, lo, u_s + STAND))
        rects.append((e_d, e_d + MARGIN, lo, u_d + STAND))
        for x in range(e_s, e_d, 16):
            h = max((ride_height(k, kind, S, e_s, u_s, u_d, x_) for x_ in (x, x + 16)
                     if ride_height(k, kind, S, e_s, u_s, u_d, x_) is not None), default=None)
            if h is not None:
                rects.append((x, x + 16, lo, h + STAND))
        if kind != 'tumble':
            # he jumps off the ride's far end, from its level there, up to the far pad
            jump_from = {'diag': u_d - HOP, 'lift': u_d - HOP}.get(kind, u_s)
            rects.append((e_d - 64, e_d + MARGIN, lo, jump_from + JUMP))
        if kind == 'wheel':
            w = plank_widths(k, kind, S)[0]
            r = (S - 16 - w) / 2
            rects.append((e_s, e_d, u_s - r - 8, u_s))    # the planks' lower half-turn
        if kind == 'tumble':
            mid = e_s + S / 2
            rects.append((mid - 50, mid + 50, u_s - 22, u_s + 22))   # the plank while solid (25° either side of flat)
    if side == 'R':
        rects = [(mirror_x(x1), mirror_x(x0), a, b) for x0, x1, a, b in rects]
    return tuple(rects)


@functools.lru_cache(maxsize=None)
def ride_sweep(k, kind, S, side, edge, u_s, u_d):
    """The space a crossing's planks, blades or shelves pass through, as rectangles like an
    air zone's (planks are 8 map px thick). No pad may stand in it. Returned with whether
    the surface stays put (a helix hub, a tumbling plank, shelves): no plank may pass
    through one of those, as it would lift the King off. Two planks may pass, as a wheel
    rising through the crossing above it does."""
    e_s = edge if side == 'L' else mirror_x(edge)
    e_d = e_s + S
    rects = []
    if kind == 'shelves':
        for i in range((u_d - u_s) // HOP - 1):
            x = e_s + 64 * (i + 1) - 32
            rects.append((x, x + TILE, u_s + HOP * (i + 1) - 8, u_s + HOP * (i + 1)))
    elif kind == 'wheel':
        w = plank_widths(k, kind, S)[0]
        r, hub = (S - 16 - w) / 2, e_s + S / 2
        for x in range(e_s, e_d, 16):
            off = max(0, min(abs(x - hub), abs(x + 16 - hub)) - w / 2)
            if off <= r:
                h = math.sqrt(r * r - off * off)
                rects.append((x, x + 16, u_s - h - 8, u_s + h))
    elif kind == 'tumble':
        mid = e_s + S / 2
        rects.append((mid - 50, mid + 50, u_s - 22, u_s + 22))
    elif kind != 'step':
        for x in range(e_s, e_d, 16):
            hs = [ride_height(k, kind, S, e_s, u_s, u_d, x_) for x_ in (x, x + 16)]
            hs = [h for h in hs if h is not None]
            if hs:
                sink = SINK if kind in ('diag', 'lift') else 0
                rects.append((x, x + 16, u_s - sink - 8, max(hs)))
    if side == 'R':
        rects = [(mirror_x(x1), mirror_x(x0), a, b) for x0, x1, a, b in rects]
    return tuple(rects), kind in FIXED


FIXED = ('helix', 'tumble', 'shelves')


def sweeps_clash(a, b):
    """Do two crossings' sweeps (rects, fixed) clash: one fixed, and they meet?"""
    return (a[1] or b[1]) and rects_meet(a[0], b[0])


def rects_meet(a, b):
    return any(ax0 < bx1 and ax1 > bx0 and alo < bhi and ahi > blo
               for ax0, ax1, alo, ahi in a for bx0, bx1, blo, bhi in b)


def intrudes(pad, zone):
    """Does a pad (side, edge, top u) hang into any rectangle of an air zone?"""
    side, edge, u = pad[:3]
    x0, x1 = pad_x(side, edge)
    return any(x0 < zx1 and x1 > zx0 and u - PAD < hi and u > lo for zx0, zx1, lo, hi in zone)


def plan_section(k, types, start, history=()):
    """Yields plans: a (S, rise, side, edge) per ride so that the pad edges stay inside
    the tower, the rises make 320 and the section ends on a rest landing at least 128
    map px wide, with no pad crowding another. `start` = (side, inner edge of the
    starting pad); `history` the pads below it as (side, edge, u, zone, sweep) with u
    relative to it, zone and sweep those of the crossing that reached the pad (None for
    the foot)."""
    rng = random.Random(1000 + k)
    n = len(types)
    memo = {}

    def landing_ok(side, edge):
        # wide enough (6 columns) for a Pig pen and room to land beside it
        return (side == 'L' and 192 <= edge <= 256) or (side == 'R' and 256 <= edge <= 320)

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
            # no pad hangs into a crossing's air: neither an older pad into the new one's,
            # nor the new pad into an older one's
            zone = air_zone(k, types[i], s, side, edge, used, used + r)
            sweep = ride_sweep(k, types[i], s, side, edge, used, used + r)
            ends = {(side, edge, used), (nside, new_edge, used + r)}
            if any(h[:3] not in ends and intrudes(h, zone + sweep[0]) for h in hist):
                continue
            if any(h[3] and intrudes((nside, new_edge, used + r), h[3] + h[4][0]) for h in hist):
                continue
            # nor does a plank pass through a helix, a tumbling plank or a shelf
            if any(h[4] and sweeps_clash(sweep, h[4]) for h in hist):
                continue
            yield (s, r, nside, new_edge)

    def push(i, side, edge, used, hist, o):
        s, r, nside, new_edge = o
        zone = air_zone(k, types[i], s, side, edge, used, used + r)
        sweep = ride_sweep(k, types[i], s, side, edge, used, used + r)
        return (hist + ((nside, new_edge, used + r, zone, sweep),))[-KEEP:]

    def feasible(i, side, edge, used, hist):
        if i == n:
            return used == RISE and landing_ok(side, edge)
        key = (i, side, edge, used, hist)
        if key not in memo:
            memo[key] = any(feasible(i + 1, o[2], o[3], used + o[1], push(i, side, edge, used, hist, o))
                            for o in steps(i, side, edge, used, hist))
        return memo[key]

    def search(i, side, edge, used, hist, acc):
        if i == n:
            yield list(acc)
            return
        options = [o for o in steps(i, side, edge, used, hist)
                   if feasible(i + 1, o[2], o[3], used + o[1], push(i, side, edge, used, hist, o))]
        rng.shuffle(options)
        for o in options:
            yield from search(i + 1, o[2], o[3], used + o[1], push(i, side, edge, used, hist, o), acc + [o])

    starts = [start[1]] if k > 1 else [224, 256, 288, 320, 352]
    for edge in starts:
        hist = tuple(history) if history else ((start[0], edge, 0, None, None),)
        if feasible(0, start[0], edge, 0, hist[-KEEP:]):
            for plan in search(0, start[0], edge, 0, hist[-KEEP:], []):
                yield ([('start', edge)] if k == 1 else []) + plan


_solved = {}


def tail_history(k, types, first_side, first_edge, body):
    """The last pads of a section, as (side, edge, u, zone, sweep) relative to the landing at its top."""
    pads, used, side, edge = [(first_side, first_edge, 0, None, None)], 0, first_side, first_edge
    for kind, (s, r, nside, new_edge) in zip(types, body):
        pads.append((nside, new_edge, used + r, air_zone(k, kind, s, side, edge, used, used + r),
                     ride_sweep(k, kind, s, side, edge, used, used + r)))
        used, side, edge = used + r, nside, new_edge

    def shift(zone):
        return zone and tuple((x0, x1, lo - RISE, hi - RISE) for x0, x1, lo, hi in zone)

    return tuple((side, edge, u - RISE, shift(zone), sweep and (shift(sweep[0]), sweep[1]))
                 for side, edge, u, zone, sweep in pads[-KEEP:])


def orders(types):
    """A section's rides in the order listed, then every other order: the listed one
    may not fit the pads it starts from."""
    yield list(types)
    for p in sorted(set(itertools.permutations(types))):
        if list(p) != list(types):
            yield list(p)


def candidates(k, side, edge, history):
    """(ride order, plan) pairs for section k, a few plans per order: when one leads
    nowhere, its near twins usually don't either."""
    for types in orders(SECTIONS[k - 1][1]):
        for plan in itertools.islice(plan_section(k, types, (side, edge), history), PLANS_TRIED):
            yield types, plan


def solve(k, side, edge, history=()):
    """The plans of sections k.. as a list, or None."""
    if k > SECTIONS_N:
        return []
    key = (k, side, edge, history)
    if key in _solved:
        return _solved[key]
    result = None
    for types, plan in itertools.islice(candidates(k, side, edge, history), CANDIDATES):
        first = plan[0][1] if k == 1 else edge
        body = plan[1:] if k == 1 else plan
        last = body[-1]
        rest = solve(k + 1, last[2], last[3], tail_history(k, types, side, first, body))
        if rest is not None:
            result = [(first, types, body)] + rest
            break
    _solved[key] = result
    return result


# --- building -----------------------------------------------------------------------

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
        self.ground.append((x0 // TILE, x1 // TILE - 1, row_of(u), row_of(u) + PAD // TILE - 1))
        self.pads.append((x0, x1, u))


def build_tower():
    t = Tower()
    side, edge, u = 'L', 288, 0           # the foot: a virtual pad edge, the ground runs the width
    sections = []
    plans = solve(1, 'L', 288)
    if plans is None:
        raise SystemExit('no layout fits the sections')
    sequence = [kind for _, types, _ in plans for kind in types]
    for i in range(len(sequence) - 3):
        if len(set(sequence[i:i + 4])) == 1:
            raise SystemExit(f'{sequence[i]} runs 4 times in a row')
    if len({tuple(types) for _, types, _ in plans}) < SECTIONS_N:
        raise SystemExit('two sections share a ride order')
    for k, (name, _) in enumerate(SECTIONS, start=1):
        d = (k - 1) / (SECTIONS_N - 1)    # difficulty 0..1
        edge, types, plan = plans[k - 1]
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
                fwd = dict(x=e_s + 12, y=surface_y(u) + SINK, dx=dx, dy=-du - SINK, period=period + 1, phase=0, width=w)
            elif kind == 'lift':
                w = 100
                du = rise - HOP
                fwd = dict(x=e_s + 14, y=surface_y(u) + SINK, dx=0, dy=-du - SINK, period=round(period + du / 40, 1), phase=0, width=w)
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
    # no pad hangs into the air a crossing needs (the planner's rule, checked on the whole tower)
    pads = [('L' if x0 == LEFT else 'R', x1 if x0 == LEFT else x0, u) for x0, x1, u in t.pads]
    sweeps = []
    for k, kind, src, dst, ride in t.rides:
        side, edge, u = src
        zone = air_zone(k, kind, ride['S'], side, edge, u, dst[2])
        sweep = ride_sweep(k, kind, ride['S'], side, edge, u, dst[2])
        for pad in pads:
            if pad not in (src, dst) and intrudes(pad, zone + sweep[0]):
                bad.append((k, kind, f'pad {pad} in the air over {src} -> {dst}'))
        for ok_, okind, osrc in sweeps:
            if sweeps_clash(sweep, ok_):
                bad.append((k, kind, f'crosses the {okind} from {osrc}'))
        sweeps.append((sweep, kind, src))
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
