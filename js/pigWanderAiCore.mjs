/** Pig wander AI: pure helpers + state names (used by Enemy.js and node tests). */

export const PIG_AI_STATES = Object.freeze({
    IDLE: 'idle',
    WALK_LEFT: 'walkLeft',
    WALK_RIGHT: 'walkRight',
})

/** After a wall bounce, AI must not pick a new random mode until this window ends. */
export const WALL_STEER_MS = 280

/** Extra random delay layered on wall steer (matches previous collision behavior). */
export function wallSteerUntilFromNow(now, rng01) {
    return now + WALL_STEER_MS + rng01 * 500
}

export function isPigWanderEnemy(e) {
    return Boolean(e && e.enemyVariant === 'pig' && Number.isFinite(e.pigWalkSpeed))
}

export function isGroundedVerticalVelocity(velocityY) {
    return Math.abs(velocityY) < 0.15
}

/**
 * @param {number} r1 - jump roll [0,1)
 * @param {number} r2 - walk mode roll [0,1) (also scales jump delay tail)
 * @param {number} r3 - next decision delay roll [0,1)
 * @param {number} pigWalkSpeed
 */
export function planBehavior(r1, r2, r3, pigWalkSpeed) {
    if (r1 < 0.1) {
        return {
            kind: 'jump',
            nextDelayMs: 700 + r2 * 900,
        }
    }
    const nextDelayMs = 500 + r3 * 1500
    if (r2 < 0.38) {
        return {
            kind: 'walk',
            aiMode: PIG_AI_STATES.IDLE,
            velocityX: 0,
            flip: false,
            sprite: 'idle',
            nextDelayMs,
        }
    }
    if (r2 < 0.69) {
        return {
            kind: 'walk',
            aiMode: PIG_AI_STATES.WALK_LEFT,
            velocityX: -pigWalkSpeed,
            flip: false,
            sprite: 'runLeft',
            nextDelayMs,
        }
    }
    return {
        kind: 'walk',
        aiMode: PIG_AI_STATES.WALK_RIGHT,
        velocityX: pigWalkSpeed,
        flip: true,
        sprite: 'runLeft',
        nextDelayMs,
    }
}

/** Grounded movement: which sprite / flip to show (does not override attack / hit). */
export function syncSpriteFromHorizontalVelocity(velocityX, pigWalkSpeed) {
    if (Math.abs(velocityX) > 0.01) {
        return {
            sprite: 'runLeft',
            flip: velocityX > 0,
            aiMode: null,
        }
    }
    return {
        sprite: 'idle',
        flip: false,
        aiMode: PIG_AI_STATES.IDLE,
    }
}

/** Physics flipped us away from a wall while moving left into it. */
export function responseAfterLeftWallCollision(pigWalkSpeed) {
    return {
        velocityX: pigWalkSpeed,
        flip: true,
        sprite: 'runLeft',
        aiMode: PIG_AI_STATES.WALK_RIGHT,
    }
}

/** Physics flipped us away from a wall while moving right into it. */
export function responseAfterRightWallCollision(pigWalkSpeed) {
    return {
        velocityX: -pigWalkSpeed,
        flip: false,
        sprite: 'runLeft',
        aiMode: PIG_AI_STATES.WALK_LEFT,
    }
}
