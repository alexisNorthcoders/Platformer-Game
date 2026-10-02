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
 * On a Tower Level pass the King's position as `tower` ({ x, y }): "furthest"
 * is then the highest (smallest y) Checkpoint he has reached by height.
 */
export function respawnPointAfter(checkpoints, current, kingX, tower) {
    let best = current
    for (const checkpoint of checkpoints ?? []) {
        if (tower) {
            if (isReachedByHeight(checkpoint, tower) && checkpoint.y < best.y) best = checkpoint
        } else if (checkpoint.x <= kingX && checkpoint.x > best.x) best = checkpoint
    }
    return best
}

/** How close (px) to a Checkpoint's x the King must be to reach it on a Tower Level. */
export const TOWER_REACH_X = 100
/** Slack (px) on "at or above" so a bobbing ride under the King doesn't flicker. */
export const TOWER_REACH_Y = 4

/**
 * On a Tower Level a Checkpoint is reached by height: `tower` is the King's
 * position { x, y }; he must stand at or above its y, within TOWER_REACH_X of its x.
 */
export function isReachedByHeight(checkpoint, tower) {
    return Math.abs(tower.x - checkpoint.x) <= TOWER_REACH_X && tower.y <= checkpoint.y + TOWER_REACH_Y
}

/**
 * Whether `checkpoint` has been reached, given the current respawn point: by
 * x, or on a Tower Level (`tower`) by height, where higher means a smaller y.
 */
export function isReached(checkpoint, respawnPoint, tower) {
    return tower ? checkpoint.y >= respawnPoint.y : checkpoint.x <= respawnPoint.x
}
