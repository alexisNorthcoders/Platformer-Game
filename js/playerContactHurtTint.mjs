/** Player contact damage: visual tint applied over the existing sprite (#32). */
export const PLAYER_CONTACT_HURT_TINT = 'rgba(255, 120, 145, 0.55)'

export function applyPlayerContactHurtTint(player) {
    player.hurtTint = PLAYER_CONTACT_HURT_TINT
}

export function clearPlayerHurtTint(player) {
    player.hurtTint = null
}
