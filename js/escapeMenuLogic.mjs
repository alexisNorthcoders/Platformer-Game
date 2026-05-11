/**
 * Pure Escape-key handling. Game phases:
 * - menu: title / level picker (not opened from pause): Escape ignored
 * - menu + pause overlay (opened from playing): Escape resumes
 * - loading: Escape ignored (do not interrupt init)
 * - playing + game over overlay: Escape ignored (R restarts)
 * - playing: Escape opens menu bound to the current level
 */

export function reduceEscapeKey({
    gameState,
    pauseMenuFromPlaying,
    playerGameOver,
    currentLevel,
}) {
    if (gameState === 'loading') {
        return { handled: false, reason: 'loading' }
    }

    if (gameState === 'playing' && playerGameOver) {
        return { handled: false, reason: 'gameOver' }
    }

    if (gameState === 'playing') {
        return {
            handled: true,
            gameState: 'menu',
            pauseMenuFromPlaying: true,
            selectedLevel: currentLevel,
            clearKeys: true,
            playerPreventInput: true,
        }
    }

    if (gameState === 'menu' && pauseMenuFromPlaying) {
        return {
            handled: true,
            gameState: 'playing',
            pauseMenuFromPlaying: false,
            clearKeys: true,
            playerPreventInput: false,
            resyncMenuSelectionToLevel: true,
        }
    }

    return { handled: false, reason: 'noOverlay' }
}
