/**
 * Quicksand: the sand along the bottom of an open-air level. The King is
 * caught the moment his feet touch it, sinks slowly out of sight, then loses
 * a heart and comes back at his last Checkpoint. Pure logic; Player.js runs
 * the sink (through globalThis.__quicksand).
 *
 * `sand` is a level's `sand` from levels.js: { top } (world px).
 */

/** How fast the King sinks, px per frame: the King's hitbox (53px) plus SUBMERGE_MARGIN in about 1.5s at 60fps. */
export const SINK_SPEED = 0.68

/** How far below the surface the top of his hitbox must be before he's out of sight (px), so no crown peeks out between the crest's heave. */
export const SUBMERGE_MARGIN = 8

/** Whether the King's feet have reached the Quicksand's surface (false on a level with no sand). */
export function touchesSand(feetY, sand) {
    return Boolean(sand) && feetY >= sand.top
}

/** The King's next `position.y` while he sinks, whatever his fall speed was. */
export function sinkStep(kingY, speed = SINK_SPEED) {
    return kingY + speed
}

/** Whether the top of his hitbox is far enough under the surface for him to come back at the Checkpoint. */
export function isSubmerged(hitboxTop, sand) {
    return Boolean(sand) && hitboxTop >= sand.top + SUBMERGE_MARGIN
}
