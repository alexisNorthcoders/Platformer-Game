/**
 * Level timer (#33): counts from 0 when a level starts, freezes when the player
 * enters the door. Pure — callers pass the current time (ms), e.g. performance.now().
 * States: idle → running ⇄ paused → stopped; start() always resets to 0.
 */

export function formatLevelTime(ms) {
    const total = Math.max(0, Math.floor(ms))
    const minutes = Math.floor(total / 60_000)
    const seconds = Math.floor((total % 60_000) / 1000)
    const hundredths = Math.floor((total % 1000) / 10)
    const pad = n => String(n).padStart(2, '0')
    return `${pad(minutes)}:${pad(seconds)}:${pad(hundredths)}`
}

export function createLevelTimer() {
    let state = 'idle' // 'idle' | 'running' | 'paused' | 'stopped'
    let startedAt = 0
    let accumulated = 0

    return {
        reset() {
            state = 'idle'
            startedAt = 0
            accumulated = 0
        },
        start(now) {
            state = 'running'
            startedAt = now
            accumulated = 0
        },
        pause(now) {
            if (state !== 'running') return
            accumulated += now - startedAt
            state = 'paused'
        },
        resume(now) {
            if (state !== 'paused') return
            startedAt = now
            state = 'running'
        },
        stop(now) {
            if (state === 'running') accumulated += now - startedAt
            if (state === 'running' || state === 'paused') state = 'stopped'
        },
        elapsed(now) {
            return state === 'running' ? accumulated + (now - startedAt) : accumulated
        },
        isRunning() {
            return state === 'running'
        },
    }
}
