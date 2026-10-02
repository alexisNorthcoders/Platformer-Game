/**
 * Pure helpers for contact damage (overlap, cooldown gate, knockback direction).
 * Used by the game via contactDamage-bootstrap.mjs and covered by node:test.
 */

/** Axis-aligned rectangle with position { x, y }, width, height */
export function rectHitboxesOverlap(a, b) {
    return (
        a.position.x + a.width >= b.position.x &&
        a.position.x <= b.position.x + b.width &&
        a.position.y + a.height >= b.position.y &&
        a.position.y <= b.position.y + b.height
    )
}

/** True while overlap must not apply contact damage (cooldown after a hit, dead, or sinking in Quicksand). */
export function cannotTakeContactDamage({ dead, hitCooldown, sinking }) {
    return Boolean(dead || hitCooldown || sinking)
}

/** Horizontal knockback away from the enemy center (matches Player logic). */
export function contactKnockbackVelocityX(playerHitbox, enemyHitbox, knockbackSpeed = 10) {
    const playerCx = playerHitbox.position.x + playerHitbox.width / 2
    const enemyCx = enemyHitbox.position.x + enemyHitbox.width / 2
    return playerCx < enemyCx ? -knockbackSpeed : knockbackSpeed
}

/** Upward speed the King gets from a Squish (a jump is -10). */
export const SQUISH_BOUNCE_VY = -7
/** How far below the Pig's top last frame's feet may be and still count as from above. */
export const SQUISH_TOLERANCE_PX = 6

/** Whether the King, falling at velocityY, lands on `pigHitbox` from above this frame (a Squish). */
export function isSquish(kingHitbox, velocityY, pigHitbox, tolerancePx = SQUISH_TOLERANCE_PX) {
    return (
        velocityY > 0 &&
        rectHitboxesOverlap(kingHitbox, pigHitbox) &&
        kingHitbox.position.y + kingHitbox.height - velocityY <= pigHitbox.position.y + tolerancePx
    )
}

/** The Pigs (live, loaded, fully opaque; never the Match Pig or the Giant King Pig, who can't be squished) the King squishes this frame. */
export function findSquishedPigs(kingHitbox, velocityY, pigs) {
    if (!Array.isArray(pigs)) return []
    return pigs.filter(
        (pig) =>
            pig.loaded &&
            pig.enemyVariant !== 'match' &&
            pig.enemyVariant !== 'giantKing' &&
            pig.hitpoints > 0 &&
            pig.opacity >= 1 &&
            isSquish(kingHitbox, velocityY, pig.hitbox)
    )
}
