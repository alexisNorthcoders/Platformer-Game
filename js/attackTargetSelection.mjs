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
