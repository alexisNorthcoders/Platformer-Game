/**
 * Tumbling Planks: a plank that turns end over end round its own middle in the
 * plane of the screen, like a clock hand, slowly and without stopping. It never
 * moves from its spot. Both faces are usable, so its tilt is counted from
 * whichever face is up. The King never falls through the top face: nearly flat
 * he stands on it; tilted past `slideFrom` he slides down it (and can still
 * jump); past `steepFrom` he slides off fast; only on end (`onEndFrom`) is
 * there no top face to land on. It never pushes or hurts him.
 * Pure logic; TumblingPlank.js draws them and index.js rides the King on them
 * once a frame while playing (through globalThis.__tumblingPlank).
 *
 * Positions are world px. `center` is the middle of the plank's flat surface
 * top; the plank turns round the middle of its thickness, `halfThickness`
 * below that, so the drawn top face is exactly the surface computed here.
 * Its phase never resets: a respawn or restart leaves it turning where it is.
 */

const DEG = Math.PI / 180

export const TUMBLING_PLANK = {
    /** The plank's length: platform.png's surface, as a Moving Platform. */
    length: 200,
    height: 16,
    /** The pivot sits this far below the flat surface (half the drawn wood's thickness). */
    halfThickness: 11,
    /** Tilt from which the King slides, slides off fast, and from which there is no top face. */
    slideFrom: 25 * DEG,
    steepFrom: 55 * DEG,
    onEndFrom: 80 * DEG,
    /** px/frame² along the slope at sin(tilt) = 1: the King's gravity along it. */
    slideAccel: 0.5,
    /** Steep slides are this much faster to speed up. */
    steepBoost: 1.5,
    /** px/frame² of friction in the Slide band (none when steep). */
    slideFriction: 0.04,
    /** px/frame² of braking while he runs uphill in the Slide band: less than the pull, so it slows but never stops. */
    uphillBrake: 0.12,
    /** Top slide speed, px/frame along the slope. */
    maxSlide: 10,
}

/** The plank's angle at `frame`, radians: 0 when it lies flat. */
export function tumbleAngleAt({ periodFrames, phase = 0, direction = 1 }, frame) {
    return 2 * Math.PI * (direction * frame / periodFrames + phase)
}

/** The signed tilt from flat, in (−π/2, π/2], counted from whichever face is up. */
export function plankTilt(angle) {
    const tilt = ((angle + Math.PI / 2) % Math.PI + Math.PI) % Math.PI - Math.PI / 2
    return tilt <= -Math.PI / 2 + 1e-12 ? Math.PI / 2 : tilt
}

/** 'stand' | 'slide' | 'steep' | 'onEnd' for a tilt in radians. */
export function slopeBand(tilt) {
    const t = Math.abs(tilt)
    if (t < TUMBLING_PLANK.slideFrom) return 'stand'
    if (t < TUMBLING_PLANK.steepFrom) return 'slide'
    if (t < TUMBLING_PLANK.onEndFrom) return 'steep'
    return 'onEnd'
}

/** The plank's tilt at `frame`. */
export function tiltAt(path, frame) {
    return plankTilt(tumbleAngleAt(path, frame))
}

/** The top face's y at world `x` at `frame`, or null outside the span or when the plank is on end. */
export function surfaceYAt(path, frame, x) {
    const tilt = tiltAt(path, frame)
    if (slopeBand(tilt) === 'onEnd') return null
    const { length, halfThickness } = TUMBLING_PLANK
    const u = x - path.center.x
    if (Math.abs(u - halfThickness * Math.sin(tilt)) > (length / 2) * Math.cos(tilt)) return null
    return path.center.y + u * Math.tan(tilt) - halfThickness * (1 / Math.cos(tilt) - 1)
}

/** The top face's line y at world `x` at (fractional) `frame`, ignoring the span. Null on end. */
function faceLineAt(path, frame, x) {
    const tilt = tiltAt(path, frame)
    if (slopeBand(tilt) === 'onEnd') return null
    const u = x - path.center.x
    return path.center.y + u * Math.tan(tilt) - TUMBLING_PLANK.halfThickness * (1 / Math.cos(tilt) - 1)
}

const SWEEP_STEPS = 16

/**
 * Whether a King whose feet go from `prevFeet` {x, y} (last frame) to `feet`
 * (this frame) meets the top face at `frame`. Sweeps his feet's segment against
 * the face as it moves from `frame - 1` to `frame`: he is on or above it at the
 * start and on or below it at the end, within its span where they cross. That
 * catches his fall and the wood rising through him as it turns. Returns
 * { x, y, tilt } (where he stands this frame) or null. A King below the face,
 * or going up through it, never lands.
 */
export function landsOnPlank(path, frame, prevFeet, feet) {
    const { length } = TUMBLING_PLANK
    const gapAt = t => {
        const x = prevFeet.x + (feet.x - prevFeet.x) * t
        const y = prevFeet.y + (feet.y - prevFeet.y) * t
        const line = faceLineAt(path, frame - 1 + t, x)
        return line == null ? null : { gap: y - line, x, t }
    }
    let prev = gapAt(0)
    for (let i = 1; i <= SWEEP_STEPS; i++) {
        const cur = gapAt(i / SWEEP_STEPS)
        if (prev && cur && prev.gap <= 0.01 && cur.gap >= 0) {
            // Cross at the linear root inside this step; he must be over the wood there.
            const span = prev.gap - cur.gap
            const k = span === 0 ? 1 : prev.gap / span
            const t = prev.t + (cur.t - prev.t) * Math.min(1, Math.max(0, k))
            const tilt = tiltAt(path, frame - 1 + t)
            const x = prevFeet.x + (feet.x - prevFeet.x) * t
            const u = x - path.center.x
            if (Math.abs(u - TUMBLING_PLANK.halfThickness * Math.sin(tilt)) <= (length / 2) * Math.cos(tilt)) {
                return { x: feet.x, y: faceLineAt(path, frame, feet.x) ?? feet.y, tilt: tiltAt(path, frame) }
            }
        }
        prev = cur
    }
    return null
}

/**
 * The next speed along the slope, px/frame, positive downhill. `runInput` is
 * his run direction on screen: −1 left, 0 none, 1 right. Stand: none. Slide:
 * the pull along the slope less a little friction; running uphill brakes it but
 * never stops it. Steep: a stronger pull, no friction, and running has no effect.
 */
export function slideStep(alongSpeed, tilt, runInput = 0) {
    const band = slopeBand(tilt)
    if (band === 'stand' || band === 'onEnd') return 0
    const P = TUMBLING_PLANK
    const pull = P.slideAccel * Math.abs(Math.sin(tilt))
    let next
    if (band === 'steep') {
        next = alongSpeed + pull * P.steepBoost
    } else {
        const uphill = runInput * Math.sign(tilt) < 0
        next = alongSpeed + pull - P.slideFriction - (uphill ? P.uphillBrake : 0)
    }
    return Math.max(0, Math.min(P.maxSlide, next))
}

/** A Tumbling Plank at frame 0. */
export function createTumbleState(path) {
    return { path, frame: 0, tilt: tiltAt(path, 0) }
}

/** Advances `state` one frame. */
export function stepTumble(state) {
    state.frame++
    state.tilt = tiltAt(state.path, state.frame)
}
