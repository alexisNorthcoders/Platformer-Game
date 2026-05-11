/**
 * Central place for clearing per-run / per-level player state so level changes
 * cannot inherit stale movement, combat timers, or death flags.
 */
export function clearHeldInputKeys(keys) {
    if (!keys || typeof keys !== 'object') return
    for (const id of Object.keys(keys)) {
        const entry = keys[id]
        if (entry && typeof entry === 'object' && 'pressed' in entry) {
            entry.pressed = false
        }
    }
}

export function resetPlayerForNewLevelRun(player) {
    player.velocity.x = 0
    player.velocity.y = 0
    player.action = false
    player.attacking = false
    player.canAttack = true
    player.running = false
    player.hitCooldown = false
    player.hurtTint = null
    player.canJump = true
    player.dead = false
    player.gameOver = false
    player.isShowingHello = false
    player._restarting = false
    player.hitpoints = 3
    if (player.contactDamageTimeoutId) {
        clearTimeout(player.contactDamageTimeoutId)
        player.contactDamageTimeoutId = null
    }
}
