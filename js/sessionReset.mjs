/**
 * Central place for clearing per-run / per-level player state so level changes
 * cannot inherit stale movement, combat timers, or death flags.
 */
import { clearPlayerHurtTint } from './playerContactHurtTint.mjs'

const heldInputKeysClearedListeners = new Set()

/**
 * Run `listener` whenever clearHeldInputKeys runs (pause, level start, restart),
 * so other input sources such as the touch controller drop their held state too.
 * Returns an unsubscribe function.
 */
export function onHeldInputKeysCleared(listener) {
    heldInputKeysClearedListeners.add(listener)
    return () => heldInputKeysClearedListeners.delete(listener)
}

export function clearHeldInputKeys(keys) {
    for (const listener of heldInputKeysClearedListeners) listener()
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
    player.canDropBomb = true
    player.running = false
    player.hitCooldown = false
    clearPlayerHurtTint(player)
    player.canJump = true
    player.sinking = false
    player.sinkLockedInput = false
    player.dead = false
    player.gameOver = false
    player.gameOverAt = null
    player.deathAnimationDone = false
    player.diedOutOfSight = false
    player.isShowingHello = false
    player._restarting = false
    player.hitpoints = 3
    if (player.contactDamageTimeoutId) {
        clearTimeout(player.contactDamageTimeoutId)
        player.contactDamageTimeoutId = null
    }
}
