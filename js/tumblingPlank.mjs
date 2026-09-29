/**
 * Tumbling Planks: a plank that turns end over end round its own middle in the
 * plane of the screen, like a clock hand, slowly and without stopping. It never
 * moves from its spot. It lies flat twice a turn (both faces are usable); the
 * King can stand on it (one-way, landing on top) only while it is within
 * `flatWindow` of flat. Past that the surface is gone, so it drops him, and
 * while it is steep he passes through it. It never pushes or hurts him.
 * Pure logic; TumblingPlank.js draws them and index.js steps them once a frame
 * while playing (through globalThis.__tumblingPlank).
 *
 * Positions are world px. `center` is the middle of the plank's surface top,
 * the point it turns round. Its phase never resets: a respawn or restart
 * leaves it turning where it is.
 */

export const TUMBLING_PLANK = {
    /** The plank's length: platform.png's surface, as a Moving Platform. */
    length: 200,
    height: 16,
    /** Standable while within this many radians of flat (25 degrees). */
    flatWindow: 25 * Math.PI / 180,
}

/** The plank's angle at `frame`, radians: 0 when it lies flat. */
export function tumbleAngleAt({ periodFrames, phase = 0, direction = 1 }, frame) {
    return 2 * Math.PI * (direction * frame / periodFrames + phase)
}

/** How far `angle` is from the nearest flat (0 or a half turn), radians in [0, π/2]. */
export function deviationFromFlat(angle) {
    const d = Math.abs(angle) % Math.PI
    return Math.min(d, Math.PI - d)
}

/**
 * The walkable surface at `frame`: { x, y, width, standable }. While standable
 * it is as wide as the plank looks from above (length × cos of its tilt); when
 * it is not, the width is 0 and nothing stands on it.
 */
export function tumbleSurfaceAt(path, frame) {
    const deviation = deviationFromFlat(tumbleAngleAt(path, frame))
    const standable = deviation <= TUMBLING_PLANK.flatWindow
    const width = standable ? Math.round(TUMBLING_PLANK.length * Math.cos(deviation) * 100) / 100 : 0
    return { x: path.center.x - width / 2, y: path.center.y, width, standable }
}

/** A Tumbling Plank at frame 0. */
export function createTumbleState(path) {
    return { path, frame: 0, ...tumbleSurfaceAt(path, 0) }
}

/** Advances `state` one frame. */
export function stepTumble(state) {
    state.frame++
    Object.assign(state, tumbleSurfaceAt(state.path, state.frame))
}
