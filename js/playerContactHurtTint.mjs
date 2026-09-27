/** Player contact damage: visual tint flashed over the existing sprite (#32, #58). */
export const PLAYER_CONTACT_HURT_TINT = 'rgba(255, 40, 40, 0.7)'
export const HURT_TINT_FLASH_INTERVAL_MS = 100

/** The flash starts on at the hit and toggles every HURT_TINT_FLASH_INTERVAL_MS. */
export function isHurtTintFlashOn(startTime, now) {
    return Math.floor((now - startTime) / HURT_TINT_FLASH_INTERVAL_MS) % 2 === 0
}

export function applyPlayerContactHurtTint(player, now) {
    player.hurtTint = PLAYER_CONTACT_HURT_TINT
    player.hurtTintStartTime = now
}

export function clearPlayerHurtTint(player) {
    player.hurtTint = null
    player.hurtTintStartTime = null
}

/** Tint to draw at `now`, or null while the flash is off or no tint is applied. */
export function playerHurtTintAt(player, now) {
    if (!player.hurtTint || player.hurtTintStartTime == null) return null
    return isHurtTintFlashOn(player.hurtTintStartTime, now) ? player.hurtTint : null
}
