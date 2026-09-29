/**
 * Moving Platforms: planks that glide back and forth between two points,
 * easing to a stop at each end, carrying the King (and a Bomb resting on
 * them). A Rotating Platform's planks are the same, on a circular path round
 * its hub. Pure logic; MovingPlatform.js draws them and index.js steps them
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

/** A plank's surface length: its path's `width`, or the default 200 (Level 23's short planks are 128). */
export function plankWidth(path) {
    return path.width ?? MOVING_PLATFORM.width
}

/** Share of the way from `from` to `to` (0..1) at `frame`: a cosine ping-pong, starting at `from` when phase is 0. */
export function pathShareAt(frame, periodFrames, phase = 0) {
    const turn = frame / periodFrames + phase
    return (1 - Math.cos(2 * Math.PI * turn)) / 2
}

/**
 * A plank on a Rotating Platform's hub: the middle of its surface circles
 * `center` at `radius`, at a steady speed, and the plank stays level. It starts
 * right of the hub (turned on by `phase` of a turn) and goes clockwise on
 * screen, or anticlockwise with `direction` -1.
 */
function orbitPositionAt({ center, radius, periodFrames, phase = 0, direction = 1, width = MOVING_PLATFORM.width }, frame) {
    const angle = 2 * Math.PI * (direction * frame / periodFrames + phase)
    return {
        x: center.x + radius * Math.cos(angle) - width / 2,
        y: center.y + radius * Math.sin(angle),
    }
}

/** A platform's surface top-left at `frame`: on a ping-pong `from`–`to` path, or round a hub's `center`. */
export function pathPositionAt(path, frame) {
    if (path.center) return orbitPositionAt(path, frame)
    const { from, to, periodFrames, phase = 0 } = path
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
 * jumped leaves it). `surface.width` is the plank's length (default 200).
 */
export function isRiding(hitbox, velocityY, surface) {
    if (velocityY < 0) return false
    const feetY = hitbox.position.y + hitbox.height
    if (Math.abs(feetY - surface.y) > MOVING_PLATFORM.rideTolerancePx) return false
    return hitbox.position.x <= surface.x + (surface.width ?? MOVING_PLATFORM.width) &&
        hitbox.position.x + hitbox.width >= surface.x
}

/** Player lands the King this far above a block's top. */
const STANDING_GAP = 0.01

/**
 * How far a platform moving down by `dy` carries a rider with `hitbox`: no
 * lower than standing on a solid block ({ position, width, height }) under his
 * feet, 0.01 px above its top as Player lands him. A plank sinking past a ledge
 * he also stands on leaves him on the ledge, rather than dragging him into it
 * (where the side collision would push him back off it).
 */
export function carriedDrop(hitbox, dy, solidBlocks) {
    if (dy <= 0) return dy
    const feetY = hitbox.position.y + hitbox.height
    let drop = dy
    for (const block of solidBlocks) {
        const under = hitbox.position.x < block.position.x + block.width &&
            hitbox.position.x + hitbox.width > block.position.x &&
            block.position.y >= feetY
        if (under) drop = Math.min(drop, block.position.y - STANDING_GAP - feetY)
    }
    return Math.max(0, drop)
}

/** Whether a Bomb's base at (x, y) rests on `surface` (the platform before this frame's move). */
export function isResting(x, y, surface) {
    return Math.abs(y - surface.y) <= MOVING_PLATFORM.rideTolerancePx &&
        x >= surface.x && x <= surface.x + (surface.width ?? MOVING_PLATFORM.width)
}
