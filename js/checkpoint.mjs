/**
 * Checkpoints: spots along a long level where the King comes back after
 * falling into the water, instead of at the level's start. Pure logic;
 * index.js keeps the current respawn point and draws the flags (through
 * globalThis.__checkpoint).
 *
 * A checkpoint is { x, y }: the King's position when he respawns there
 * (world px, as levels.js's playerPosition).
 */

/**
 * The respawn point after the King reaches `kingX`: the furthest checkpoint
 * at or behind him, if it is further than `current`; otherwise `current`.
 */
export function respawnPointAfter(checkpoints, current, kingX) {
    let best = current
    for (const checkpoint of checkpoints ?? []) {
        if (checkpoint.x <= kingX && checkpoint.x > best.x) best = checkpoint
    }
    return best
}

/** Whether `checkpoint` has been reached, given the current respawn point. */
export function isReached(checkpoint, respawnPoint) {
    return checkpoint.x <= respawnPoint.x
}
