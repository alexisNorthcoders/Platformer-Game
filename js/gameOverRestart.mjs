/**
 * Game over restart (#41): touch devices restart with a tap instead of R.
 * Both paths call the same restart function (window.restartFromGameOver).
 */

export function isTouchDevice(matchMedia = globalThis.matchMedia) {
    return Boolean(matchMedia?.('(pointer: coarse)').matches)
}

export function gameOverPrompt(isTouch) {
    return isTouch ? 'Tap to restart' : 'Press R to restart'
}

/**
 * Restart on a tap while `isGameOver()` is true. `restart` must guard against
 * re-entry itself (restartFromGameOver clears gameOver and checks
 * player._restarting), which is what stops repeated taps double restarting.
 */
export function bindTapToRestart(target, { isGameOver, restart }) {
    target.addEventListener('pointerdown', (event) => {
        if (!isGameOver()) return
        event.preventDefault()
        restart()
    })
}
