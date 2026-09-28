/**
 * Moving Platforms: planks that glide back and forth between two points,
 * easing to a stop at each end, carrying the King (and a Bomb resting on
 * them). Pure logic; MovingPlatform.js draws them and index.js steps them
 * once a frame while playing (through globalThis.__movingPlatform).
 *
 * Positions are world px. A path's `from` / `to` are the top-left of the
 * walkable surface (the collision block), not of the sprite.
 */

/** The collision block's size, and where it sits inside platform.png drawn at 2×. */
export const MOVING_PLATFORM = {
    width: 200,
    height: 16,
    spriteOffsetX: -4,
    spriteOffsetY: -11,
    /** Standing this close above the surface counts as riding it. */
    rideTolerancePx: 2,
}

/** Share of the way from `from` to `to` (0..1) at `frame`: a cosine ping-pong, starting at `from` when phase is 0. */
export function pathShareAt(frame, periodFrames, phase = 0) {
    const turn = frame / periodFrames + phase
    return (1 - Math.cos(2 * Math.PI * turn)) / 2
}

/** A platform's surface top-left at `frame`. */
export function pathPositionAt({ from, to, periodFrames, phase = 0 }, frame) {
    const share = pathShareAt(frame, periodFrames, phase)
    return {
        x: from.x + (to.x - from.x) * share,
        y: from.y + (to.y - from.y) * share,
    }
}

/** A platform at the start of its path (frame 0). */
export function createMovingPlatformState(path) {
    return { path, frame: 0, ...pathPositionAt(path, 0) }
}

/** Advances `state` one frame and returns how far it moved ({ dx, dy }). */
export function stepMovingPlatform(state) {
    state.frame++
    const next = pathPositionAt(state.path, state.frame)
    const move = { dx: next.x - state.x, dy: next.y - state.y }
    state.x = next.x
    state.y = next.y
    return move
}

/**
 * Whether a body with `hitbox` ({ position, width, height }) stands on the
 * surface whose top-left is `surface` (the platform before this frame's move):
 * feet on the top, overlapping it sideways, and not rising (a King who just
 * jumped leaves it).
 */
export function isRiding(hitbox, velocityY, surface) {
    if (velocityY < 0) return false
    const feetY = hitbox.position.y + hitbox.height
    if (Math.abs(feetY - surface.y) > MOVING_PLATFORM.rideTolerancePx) return false
    return hitbox.position.x <= surface.x + MOVING_PLATFORM.width &&
        hitbox.position.x + hitbox.width >= surface.x
}

/** Whether a Bomb's base at (x, y) rests on `surface` (the platform before this frame's move). */
export function isResting(x, y, surface) {
    return Math.abs(y - surface.y) <= MOVING_PLATFORM.rideTolerancePx &&
        x >= surface.x && x <= surface.x + MOVING_PLATFORM.width
}
