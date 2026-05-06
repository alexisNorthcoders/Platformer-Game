import { rectHitboxesOverlap } from './contactDamageHelpers.mjs'

/**
 * Which entities the player hammer can damage (#28).
 * Keep in sync with contact damage: if a group can deal contact damage to the
 * player, it must be iterable here so attacks can hit back (see #29).
 */
export function collectAttackableEnemiesForPlayerAttack(enemies, enemyKing) {
    return [
        ...(Array.isArray(enemies) ? enemies : []),
        ...(Array.isArray(enemyKing) ? enemyKing : []),
    ]
}

/**
 * Same target set and overlap rules as Player.checkEnemyHitCollision (hammer vs enemies).
 * Pure helper for tests and a single implementation path in the player.
 */
export function findEnemiesHitByPlayerHammer({
    lastDirection,
    attackHitboxRight,
    attackHitboxLeft,
    enemies,
    enemyKing,
    rectHitboxesOverlap: overlapFn = rectHitboxesOverlap,
}) {
    const attackableEnemies = collectAttackableEnemiesForPlayerAttack(enemies, enemyKing)
    const attackBox = lastDirection === 'right' ? attackHitboxRight : attackHitboxLeft
    const attackOverlapsEnemy = (attackBoxInner, enemy) =>
        Boolean(
            enemy &&
            enemy.hitbox &&
            typeof enemy.hit === 'function' &&
            overlapFn(attackBoxInner, enemy.hitbox)
        )
    return attackableEnemies.filter((enemy) => attackOverlapsEnemy(attackBox, enemy))
}
