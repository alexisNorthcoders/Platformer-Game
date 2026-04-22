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

/** True while overlap must not apply contact damage (cooldown after a hit, or dead). */
export function cannotTakeContactDamage({ dead, hitCooldown }) {
    return Boolean(dead || hitCooldown)
}

/** Horizontal knockback away from the enemy center (matches Player logic). */
export function contactKnockbackVelocityX(playerHitbox, enemyHitbox, knockbackSpeed = 10) {
    const playerCx = playerHitbox.position.x + playerHitbox.width / 2
    const enemyCx = enemyHitbox.position.x + enemyHitbox.width / 2
    return playerCx < enemyCx ? -knockbackSpeed : knockbackSpeed
}
