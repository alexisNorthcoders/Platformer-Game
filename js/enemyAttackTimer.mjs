/** Enemy attack scheduling: pure helpers (used by Enemy.js and node tests). */

/** Shortest gap between two attacks. */
export const ATTACK_MIN_MS = 2000

/** Random extra gap on top of the minimum (average gap is about 3.25 s). */
export const ATTACK_SPREAD_MS = 2500

/** A blocked attack is retried after RETRY_MIN_MS plus up to RETRY_SPREAD_MS. */
export const ATTACK_RETRY_MIN_MS = 100
export const ATTACK_RETRY_SPREAD_MS = 300

export function nextAttackAt(now, rng01) {
    return now + ATTACK_MIN_MS + rng01 * ATTACK_SPREAD_MS
}

export function attackRetryAt(now, rng01) {
    return now + ATTACK_RETRY_MIN_MS + rng01 * ATTACK_RETRY_SPREAD_MS
}
