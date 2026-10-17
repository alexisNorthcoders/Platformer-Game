/**
 * Box Pig behaviour (#143, #145): pure helpers, no DOM, canvas or globals (used by
 * js/classes/BoxPig.js and node tests).
 *
 * A Box Pig hides as a Box until the King comes within 3 tiles, peeks out, winds
 * up and hops after him in short leaps. Once he is more than 5 tiles away it
 * settles and hides again where it stands. Between 3 and 5 tiles it carries on
 * as it was, so it never flickers. It never leaves the floor it hides on.
 */

const TILE = 64

export const BOX_PIG = Object.freeze({
    PEEK_DISTANCE: 3 * TILE,
    HIDE_DISTANCE: 5 * TILE,
    /** Looking Out, then Jump Anticipation, then a hop. */
    PEEK_MS: 500,
    WIND_UP_MS: 250,
    /** Jump while rising, Fall after the apex. */
    RISE_MS: 250,
    /** Time on the ground between landing and the next hop. */
    LAND_MS: 150,
    /** A landing is ignored for this long after take-off (the feet are still on the floor). */
    MIN_AIR_MS: 50,
    HOP_SPEED: 1.5,
    HOP_JUMP: -6,
    GRAVITY: 0.4,
    /** Frames a hop is airborne at most (it lands on frame 29 of the arc above). */
    HOP_FRAMES: 30,
})

export const BOX_PIG_STATES = Object.freeze({
    HIDDEN: 'hidden',
    LOOKING_OUT: 'lookingOut',
    ANTICIPATING: 'anticipating',
    JUMPING: 'jumping',
    LANDING: 'landing',
})

export function createBoxPigState() {
    return { mode: BOX_PIG_STATES.HIDDEN, elapsedMs: 0, flip: false }
}

/** The art for a mode: the Box's Idle while hidden, else one of the Pig sheets. */
function spriteFor(mode, elapsedMs) {
    switch (mode) {
        case BOX_PIG_STATES.LOOKING_OUT: return 'lookingOut'
        case BOX_PIG_STATES.ANTICIPATING: return 'anticipation'
        case BOX_PIG_STATES.JUMPING: return elapsedMs < BOX_PIG.RISE_MS ? 'jump' : 'fall'
        case BOX_PIG_STATES.LANDING: return 'ground'
        default: return 'idle'
    }
}

/** The hop leaving the floor toward the King, its sideways run held inside the floor. */
function hopToward(direction, body, floor) {
    const margin = !floor ? 0 : direction > 0 ? floor.right - body.right : body.left - floor.left
    const speed = Math.min(BOX_PIG.HOP_SPEED, Math.max(0, margin - 0.5) / BOX_PIG.HOP_FRAMES)
    return { x: direction * speed || 0, y: BOX_PIG.HOP_JUMP }
}

/**
 * One step of the Box Pig.
 * @param {{mode: string, elapsedMs: number, flip: boolean}} state
 * @param {object} input
 * @param {number} input.dtMs - time since the last step
 * @param {number} input.kingDistance - distance to the King, world px
 * @param {number} input.kingDirection - -1 if the King is to the left, 1 to the right
 * @param {boolean} input.grounded - standing on its floor
 * @param {{left: number, right: number}} input.body - the Box Pig's left and right edges
 * @param {{left: number, right: number}|null} input.floor - the floor's edges
 * @returns {{mode: string, elapsedMs: number, flip: boolean, sprite: string, hop: {x: number, y: number}|null}}
 *   `hop` is the velocity to leave the floor with, only on the step a hop starts.
 */
export function stepBoxPig(state, { dtMs, kingDistance, kingDirection, grounded, body, floor }) {
    const { HIDDEN, LOOKING_OUT, ANTICIPATING, JUMPING, LANDING } = BOX_PIG_STATES
    let mode = state.mode
    let elapsedMs = state.elapsedMs + dtMs
    let flip = state.flip
    let hop = null
    const enter = next => {
        mode = next
        elapsedMs = 0
    }

    if (mode === HIDDEN) {
        elapsedMs = 0
        if (kingDistance <= BOX_PIG.PEEK_DISTANCE) {
            flip = kingDirection > 0
            enter(LOOKING_OUT)
        }
    } else if (kingDistance > BOX_PIG.HIDE_DISTANCE && grounded && (mode !== JUMPING || elapsedMs >= BOX_PIG.MIN_AIR_MS)) {
        enter(HIDDEN)
    } else if (mode === LOOKING_OUT) {
        flip = kingDirection > 0
        if (elapsedMs >= BOX_PIG.PEEK_MS) enter(ANTICIPATING)
    } else if (mode === ANTICIPATING) {
        flip = kingDirection > 0
        if (elapsedMs >= BOX_PIG.WIND_UP_MS) {
            enter(JUMPING)
            hop = hopToward(kingDirection, body, floor)
        }
    } else if (mode === JUMPING) {
        if (grounded && elapsedMs >= BOX_PIG.MIN_AIR_MS) enter(LANDING)
    } else if (mode === LANDING) {
        if (elapsedMs >= BOX_PIG.LAND_MS) {
            flip = kingDirection > 0
            enter(JUMPING)
            hop = hopToward(kingDirection, body, floor)
        }
    }

    return { mode, elapsedMs, flip, sprite: spriteFor(mode, elapsedMs), hop }
}

/**
 * The left and right edges of the floor a body stands on: the run of blocks
 * whose top is at its feet, stopped short by any block standing on that floor
 * in the body's way (a Box, a wall). Null when nothing is under its feet.
 * @param {{position: {x: number, y: number}, width: number, height: number}[]} blocks
 * @param {{left: number, right: number, bottom: number, height: number}} body
 */
export function floorEdges(blocks, { left, right, bottom, height }) {
    const solid = blocks.filter(b => b.position && typeof b.position === 'object')
    const floor = solid.filter(b => Math.abs(b.position.y - bottom) <= 1)
    const under = floor.filter(b => b.position.x < right && b.position.x + b.width > left)
    if (!under.length) return null

    let edgeLeft = Math.min(...under.map(b => b.position.x))
    let edgeRight = Math.max(...under.map(b => b.position.x + b.width))
    for (let grew = true; grew;) {
        grew = false
        for (const b of floor) {
            if (b.position.x < edgeLeft && b.position.x + b.width >= edgeLeft - 1) {
                edgeLeft = b.position.x
                grew = true
            }
            if (b.position.x + b.width > edgeRight && b.position.x <= edgeRight + 1) {
                edgeRight = b.position.x + b.width
                grew = true
            }
        }
    }

    // Anything standing on this floor within the body's height blocks the way.
    for (const b of solid) {
        if (b.position.y >= bottom - 1 || b.position.y + b.height <= bottom - height) continue
        if (b.position.x >= right - 0.5 && b.position.x < edgeRight) edgeRight = b.position.x
        if (b.position.x + b.width <= left + 0.5 && b.position.x + b.width > edgeLeft) edgeLeft = b.position.x + b.width
    }
    return { left: edgeLeft, right: edgeRight }
}
