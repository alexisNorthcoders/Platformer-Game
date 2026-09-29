/**
 * Pure Escape-key and Pause Menu handling. Game phases:
 * - menu: Title Screen (not opened from pause): Escape ignored
 * - menu + Pause Menu (opened from playing): Escape resumes
 * - loading: Escape ignored (do not interrupt init)
 * - playing + game over overlay: Escape ignored (R restarts)
 * - playing + level transition (door → next level fade-in): Escape ignored
 * - playing + game over restart still loading the level: Escape ignored
 * - playing: Escape opens the Pause Menu
 *
 * Pause Menu buttons (#65), only while it is open:
 * - Resume: same as Escape
 * - Restart Level: loading → playing once the current level is rebuilt
 * - Quit to Title: back to the Title Screen with a clean session
 */

const RESUME = Object.freeze({
    handled: true,
    gameState: 'playing',
    pauseMenuFromPlaying: false,
    clearKeys: true,
    playerPreventInput: false,
})

// Restart Level: shared by the Pause Menu button and the retry after game over.
const RESTART_LEVEL = Object.freeze({
    handled: true,
    gameState: 'loading',
    pauseMenuFromPlaying: false,
    clearKeys: true,
    playerPreventInput: true,
    restartLevel: true,
})

export function reduceEscapeKey({
    gameState,
    pauseMenuFromPlaying,
    playerGameOver,
    levelTransitioning = false,
    restarting = false,
}) {
    if (gameState === 'loading') {
        return { handled: false, reason: 'loading' }
    }

    if (gameState === 'playing' && playerGameOver) {
        return { handled: false, reason: 'gameOver' }
    }

    if (gameState === 'playing' && levelTransitioning) {
        return { handled: false, reason: 'levelTransition' }
    }

    if (gameState === 'playing' && restarting) {
        return { handled: false, reason: 'restarting' }
    }

    if (gameState === 'playing') {
        return {
            handled: true,
            gameState: 'menu',
            pauseMenuFromPlaying: true,
            clearKeys: true,
            playerPreventInput: true,
        }
    }

    if (gameState === 'menu' && pauseMenuFromPlaying) {
        return { ...RESUME }
    }

    return { handled: false, reason: 'noOverlay' }
}

/**
 * A Pause Menu button: 'resume' | 'restart' | 'quit'. Anything else (e.g.
 * 'fullscreen', which changes no game state) is not a transition.
 */
export function reducePauseMenuChoice({ choice, gameState, pauseMenuFromPlaying, currentLevel }) {
    if (gameState !== 'menu' || !pauseMenuFromPlaying) {
        return { handled: false, reason: 'noOverlay' }
    }

    if (choice === 'resume') return { ...RESUME }

    if (choice === 'restart') return { ...RESTART_LEVEL }

    if (choice === 'quit') {
        return {
            handled: true,
            gameState: 'menu',
            pauseMenuFromPlaying: false,
            clearKeys: true,
            playerPreventInput: true,
            resetSession: true,
            selectedLevel: currentLevel,
        }
    }

    return { handled: false, reason: 'notATransition' }
}

/**
 * The retry (R, or a tap) after the King loses his last heart: Restart Level,
 * the same transition as the Pause Menu button.
 */
export function reduceGameOverRetry({ gameState, playerGameOver, restarting = false }) {
    if (gameState !== 'playing' || !playerGameOver || restarting) {
        return { handled: false, reason: 'notGameOver' }
    }
    return { ...RESTART_LEVEL }
}
