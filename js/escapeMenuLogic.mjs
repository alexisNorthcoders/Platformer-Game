/**
 * Pure Escape-key and Pause Menu handling. Game phases:
 * - menu: Title Screen (not opened from pause): Escape ignored
 * - menu + Pause Menu (opened from playing): Escape resumes
 * - loading: Escape ignored (do not interrupt init)
 * - playing + King dying (last heart lost, death still playing out): Escape ignored
 * - playing + game over overlay: Escape ignored (R is Try Again)
 * - playing + level transition (door → next level fade-in): Escape ignored
 * - playing + game over restart still loading the level: Escape ignored
 * - playing: Escape opens the Pause Menu
 *
 * Pause Menu buttons (#65), only while it is open:
 * - Resume: same as Escape
 * - Restart Level: loading → playing once the current level is rebuilt
 * - Quit to Title: back to the Title Screen with a clean session
 *
 * Game Over Screen buttons (#89): Try Again is Restart Level, Quit to Title
 * is the Pause Menu's, each the very same transition.
 */

const RESUME = Object.freeze({
    handled: true,
    gameState: 'playing',
    pauseMenuFromPlaying: false,
    clearKeys: true,
    playerPreventInput: false,
})

// Restart Level: shared by the Pause Menu button and Try Again after game over.
const RESTART_LEVEL = Object.freeze({
    handled: true,
    gameState: 'loading',
    pauseMenuFromPlaying: false,
    clearKeys: true,
    playerPreventInput: true,
    restartLevel: true,
})

function quitToTitle(currentLevel) {
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

export function reduceEscapeKey({
    gameState,
    pauseMenuFromPlaying,
    playerGameOver,
    playerDying = false,
    levelTransitioning = false,
    restarting = false,
}) {
    if (gameState === 'loading') {
        return { handled: false, reason: 'loading' }
    }

    if (gameState === 'playing' && playerDying) {
        return { handled: false, reason: 'dying' }
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
export function reducePauseMenuChoice({ choice, gameState, pauseMenuFromPlaying, currentLevel, playerDying = false }) {
    if (playerDying) {
        return { handled: false, reason: 'dying' }
    }

    if (gameState !== 'menu' || !pauseMenuFromPlaying) {
        return { handled: false, reason: 'noOverlay' }
    }

    if (choice === 'resume') return { ...RESUME }

    if (choice === 'restart') return { ...RESTART_LEVEL }

    if (choice === 'quit') return quitToTitle(currentLevel)

    return { handled: false, reason: 'notATransition' }
}

/** How long the level dims before the Game Over Screen's menu appears and takes input. */
export const GAME_OVER_MENU_DELAY_MS = 500

/** The level's dim overlay alpha when the Game Over Screen is fully up. */
export const GAME_OVER_DIM_ALPHA = 0.6

/**
 * True once GAME_OVER_MENU_DELAY_MS has elapsed since game over began
 * (`gameOverAt`, a performance.now() timestamp; null = not begun).
 */
export function gameOverMenuReady({ gameOverAt, now }) {
    if (gameOverAt == null) return false
    return now - gameOverAt >= GAME_OVER_MENU_DELAY_MS
}

/** Linear dim from 0 to GAME_OVER_DIM_ALPHA across the delay. */
export function gameOverDimAlpha({ gameOverAt, now }) {
    if (gameOverAt == null) return 0
    const t = Math.min(1, Math.max(0, (now - gameOverAt) / GAME_OVER_MENU_DELAY_MS))
    return t * GAME_OVER_DIM_ALPHA
}

/**
 * A Game Over Screen button: 'retry' (Try Again) | 'quit'. Only handled while
 * the game over screen is up: the King lost his last heart, his death has
 * played out, the menu has been revealed (input lockout over), and no restart
 * is already loading the level.
 */
export function reduceGameOverChoice({ choice, gameState, playerGameOver, playerDying = false, restarting = false, currentLevel, gameOverAt = null, now = 0 }) {
    if (gameState !== 'playing' || !playerGameOver || playerDying || restarting) {
        return { handled: false, reason: 'notGameOver' }
    }
    if (!gameOverMenuReady({ gameOverAt, now })) {
        return { handled: false, reason: 'menuLocked' }
    }
    if (choice === 'retry') return { ...RESTART_LEVEL }
    if (choice === 'quit') return quitToTitle(currentLevel)
    return { handled: false, reason: 'notATransition' }
}

/**
 * Dying → game over: the King has lost his last heart, and only once he is on
 * the ground with his Dead animation finished does the level freeze and the
 * restart prompt appear. A King lost out of sight in a pit has no death to play
 * out, so he goes straight to game over.
 */
export function reduceDeathProgress({ gameState, playerDying, playerGrounded, deathAnimationDone, outOfSight = false }) {
    if (gameState !== 'playing' || !playerDying) {
        return { handled: false, reason: 'notDying' }
    }
    if (outOfSight) return { handled: true, gameOver: true }
    if (!playerGrounded || !deathAnimationDone) {
        return { handled: false, reason: 'stillDying' }
    }
    return { handled: true, gameOver: true }
}
