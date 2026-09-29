/**
 * Crumbling Shelves: short, thin, cracked planks the King can jump up through
 * and land on. Landing on top starts a 2 s countdown that runs on whether he
 * stays or not; the shelf shakes throughout, then drops whole with gravity
 * (carrying whatever still stands on it) out of sight, and fades back in where
 * it was about 3 s later, once the King is not standing where it would be.
 * Pure logic; CrumblingShelf.js draws them and index.js steps them once a
 * frame while playing (through globalThis.__crumblingShelf).
 *
 * Positions are world px. `x` and `y` are the top-left of the walkable surface.
 */

export const CRUMBLING_SHELF = {
    width: 64,
    height: 5,
    /** Landing to drop: 2 s at 60 fps. */
    crumbleFrames: 120,
    /** Out of sight to back: 3 s at 60 fps. */
    returnFrames: 180,
    /** How long it takes to fade back in. */
    fadeFrames: 30,
    /** Fall acceleration, px/frame²: the King's gravity (Player.js). */
    gravity: 0.5,
    /** Standing this close above the surface counts as landed on it. */
    landTolerancePx: 2,
    /** Most a shaking shelf strays from its place, px. */
    shakePx: 2,
}

/**
 * A whole shelf. `hideY` is how far down it must have fallen to be out of
 * sight (under the Cloud Bank's surface).
 */
export function createShelfState({ x, y, hideY }) {
    return { homeY: y, hideY, x, y, phase: 'whole', frame: 0, vy: 0, fade: CRUMBLING_SHELF.fadeFrames }
}

/** Back to whole and still, e.g. when the King comes back at a Checkpoint. */
export function resetShelf(state) {
    Object.assign(state, { y: state.homeY, phase: 'whole', frame: 0, vy: 0, fade: CRUMBLING_SHELF.fadeFrames })
}

/** Whether the King can stand on it: whole, shaking or still falling with him. Not while out of sight. */
export function isSolid(state) {
    return state.phase !== 'gone'
}

/**
 * Whether a body with `hitbox` has landed on top of `surface` ({ x, y, width },
 * the shelf before this frame's step): feet on it, overlapping sideways, and
 * not rising, so jumping up through it from below does not count.
 */
export function isLandedOn(hitbox, velocityY, surface) {
    if (velocityY < 0) return false
    const feetY = hitbox.position.y + hitbox.height
    if (Math.abs(feetY - surface.y) > CRUMBLING_SHELF.landTolerancePx) return false
    return hitbox.position.x <= surface.x + surface.width &&
        hitbox.position.x + hitbox.width >= surface.x
}

/**
 * Advances `state` one frame. `landed`: the King landed on it (this frame or
 * still standing). `blocked`: he stands where it would come back. Returns
 * { dy, event }: how far it moved, and 'drop' or 'return' on the frame that
 * happens.
 */
export function stepShelf(state, { landed = false, blocked = false } = {}) {
    let dy = 0
    let event = null
    if (state.phase === 'whole') {
        if (state.fade < CRUMBLING_SHELF.fadeFrames) state.fade++
        // The landing frame is the first of the countdown.
        if (landed) Object.assign(state, { phase: 'shaking', frame: 1 })
    } else if (state.phase === 'shaking') {
        state.frame++
        if (state.frame >= CRUMBLING_SHELF.crumbleFrames) {
            Object.assign(state, { phase: 'falling', frame: 0, vy: 0 })
            event = 'drop'
        }
    }
    if (state.phase === 'falling' && event === null) {
        state.vy += CRUMBLING_SHELF.gravity
        dy = state.vy
        state.y += dy
        if (state.y >= state.hideY) Object.assign(state, { phase: 'gone', frame: 0 })
    } else if (state.phase === 'gone') {
        // Once the timer is out it polls `blocked` on every frame and comes
        // back only on one where the spot is clear.
        if (state.frame < CRUMBLING_SHELF.returnFrames) state.frame++
        if (state.frame >= CRUMBLING_SHELF.returnFrames && !blocked) {
            Object.assign(state, { y: state.homeY, phase: 'whole', frame: 0, vy: 0, fade: 0 })
            event = 'return'
        }
    }
    return { dy, event }
}

/**
 * Whether the King's `hitbox` is where the shelf would come back (its strip,
 * and a couple of px above it): it waits until he is clear.
 */
export function blocksReturn(hitbox, state) {
    const top = state.homeY - CRUMBLING_SHELF.landTolerancePx
    const bottom = state.homeY + CRUMBLING_SHELF.height
    return hitbox.position.x < state.x + CRUMBLING_SHELF.width &&
        hitbox.position.x + hitbox.width > state.x &&
        hitbox.position.y + hitbox.height > top &&
        hitbox.position.y < bottom
}

/** How see-through it is while fading back in (1 once whole again). */
export function shelfAlpha(state) {
    if (state.phase === 'gone') return 0
    return state.phase === 'whole' ? state.fade / CRUMBLING_SHELF.fadeFrames : 1
}

/** Sideways offset of the sprite while it shakes, in whole px. */
export function shakeOffset(state) {
    if (state.phase !== 'shaking') return 0
    return Math.round(Math.sin(state.frame * 2.3) * CRUMBLING_SHELF.shakePx)
}
