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
 * Restart on a tap while `isGameOver()` is true. Taps while a restart is still
 * in flight are ignored, so tapping repeatedly restarts once.
 */
export function bindTapToRestart(target, { isGameOver, restart }) {
    let restarting = false
    target.addEventListener('pointerdown', (event) => {
        if (restarting || !isGameOver()) return
        event.preventDefault()
        restarting = true
        new Promise(resolve => resolve(restart()))
            .catch(err => console.error('Restart from game over failed', err))
            .finally(() => { restarting = false })
    })
}
