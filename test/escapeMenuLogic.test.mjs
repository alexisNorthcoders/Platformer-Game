import assert from 'node:assert/strict'
import test from 'node:test'
import { reduceDeathProgress, reduceEscapeKey, reduceGameOverRetry, reducePauseMenuChoice } from '../js/escapeMenuLogic.mjs'

test('Escape during loading is ignored', () => {
    const r = reduceEscapeKey({
        gameState: 'loading',
        pauseMenuFromPlaying: false,
        playerGameOver: false,
        currentLevel: 2,
    })
    assert.equal(r.handled, false)
    assert.equal(r.reason, 'loading')
})

test('Escape during game over does not open menu', () => {
    const r = reduceEscapeKey({
        gameState: 'playing',
        pauseMenuFromPlaying: false,
        playerGameOver: true,
        currentLevel: 1,
    })
    assert.equal(r.handled, false)
    assert.equal(r.reason, 'gameOver')
})

test('Escape during gameplay opens the Pause Menu', () => {
    const r = reduceEscapeKey({
        gameState: 'playing',
        pauseMenuFromPlaying: false,
        playerGameOver: false,
        currentLevel: 3,
    })
    assert.equal(r.handled, true)
    assert.equal(r.gameState, 'menu')
    assert.equal(r.pauseMenuFromPlaying, true)
    // Levels are picked on the Title Screen only (#65): pausing leaves the selection alone.
    assert.equal(r.selectedLevel, undefined)
    assert.equal(r.clearKeys, true)
    assert.equal(r.playerPreventInput, true)
})

test('Escape again resumes from pause menu', () => {
    const r = reduceEscapeKey({
        gameState: 'menu',
        pauseMenuFromPlaying: true,
        playerGameOver: false,
        currentLevel: 2,
    })
    assert.equal(r.handled, true)
    assert.equal(r.gameState, 'playing')
    assert.equal(r.pauseMenuFromPlaying, false)
    assert.equal(r.clearKeys, true)
    assert.equal(r.playerPreventInput, false)
})

test('Escape on title menu (not from pause) is ignored', () => {
    const r = reduceEscapeKey({
        gameState: 'menu',
        pauseMenuFromPlaying: false,
        playerGameOver: false,
        currentLevel: 1,
    })
    assert.equal(r.handled, false)
    assert.equal(r.reason, 'noOverlay')
})

test('Escape during a level transition (door → next level) is ignored', () => {
    const r = reduceEscapeKey({
        gameState: 'playing',
        pauseMenuFromPlaying: false,
        playerGameOver: false,
        levelTransitioning: true,
        currentLevel: 2,
    })
    assert.equal(r.handled, false)
    assert.equal(r.reason, 'levelTransition')
})

const PAUSED = { gameState: 'menu', pauseMenuFromPlaying: true, currentLevel: 4 }

test('Pause Menu Resume: same transition as Escape while paused', () => {
    const r = reducePauseMenuChoice({ ...PAUSED, choice: 'resume' })
    const esc = reduceEscapeKey({ ...PAUSED, playerGameOver: false })
    assert.deepEqual(r, esc)
})

test('Pause Menu Restart Level: closes the menu and reloads the current level', () => {
    const r = reducePauseMenuChoice({ ...PAUSED, choice: 'restart' })
    assert.equal(r.handled, true)
    // Loading until the level is rebuilt: Escape is ignored and the player can't move.
    assert.equal(r.gameState, 'loading')
    assert.equal(r.pauseMenuFromPlaying, false)
    assert.equal(r.clearKeys, true)
    assert.equal(r.playerPreventInput, true)
    assert.equal(r.restartLevel, true)
    assert.equal(r.resetSession, undefined)
})

test('Pause Menu Quit to Title: back to the Title Screen with a clean session', () => {
    const r = reducePauseMenuChoice({ ...PAUSED, choice: 'quit' })
    assert.equal(r.handled, true)
    assert.equal(r.gameState, 'menu')
    // Not paused any more, so the Title Screen (not the Pause Menu) shows.
    assert.equal(r.pauseMenuFromPlaying, false)
    assert.equal(r.clearKeys, true)
    assert.equal(r.playerPreventInput, true)
    assert.equal(r.resetSession, true)
    // The Title Screen opens on the level that was being played.
    assert.equal(r.selectedLevel, 4)
    assert.equal(r.restartLevel, undefined)
})

test('Escape on the Title Screen after Quit to Title is ignored', () => {
    const quit = reducePauseMenuChoice({ ...PAUSED, choice: 'quit' })
    const r = reduceEscapeKey({
        gameState: quit.gameState,
        pauseMenuFromPlaying: quit.pauseMenuFromPlaying,
        playerGameOver: false,
        currentLevel: 4,
    })
    assert.equal(r.handled, false)
    assert.equal(r.reason, 'noOverlay')
})

test('Escape while Restart Level is loading is ignored', () => {
    const restart = reducePauseMenuChoice({ ...PAUSED, choice: 'restart' })
    const r = reduceEscapeKey({
        gameState: restart.gameState,
        pauseMenuFromPlaying: restart.pauseMenuFromPlaying,
        playerGameOver: false,
        currentLevel: 4,
    })
    assert.equal(r.handled, false)
    assert.equal(r.reason, 'loading')
})

test('Pause Menu choices do nothing unless the Pause Menu is open', () => {
    for (const choice of ['resume', 'restart', 'quit']) {
        for (const state of [
            { gameState: 'menu', pauseMenuFromPlaying: false },
            { gameState: 'playing', pauseMenuFromPlaying: false },
            { gameState: 'loading', pauseMenuFromPlaying: false },
        ]) {
            const r = reducePauseMenuChoice({ ...state, currentLevel: 1, choice })
            assert.equal(r.handled, false, `${choice} in ${state.gameState}`)
            assert.equal(r.reason, 'noOverlay')
        }
    }
})

test('Pause Menu: unknown choices (e.g. Fullscreen, handled elsewhere) change no state', () => {
    for (const choice of ['fullscreen', null, 'play']) {
        const r = reducePauseMenuChoice({ ...PAUSED, choice })
        assert.equal(r.handled, false)
        assert.equal(r.reason, 'notATransition')
    }
})

test('Escape while a game over restart is still loading the level is ignored', () => {
    const r = reduceEscapeKey({
        gameState: 'playing',
        pauseMenuFromPlaying: false,
        playerGameOver: false,
        restarting: true,
    })
    assert.equal(r.handled, false)
    assert.equal(r.reason, 'restarting')
})

test('game over retry is the same transition as the Pause Menu Restart Level', () => {
    const retry = reduceGameOverRetry({ gameState: 'playing', playerGameOver: true })
    const restart = reducePauseMenuChoice({ ...PAUSED, choice: 'restart' })
    assert.deepEqual(retry, restart)
    assert.equal(retry.restartLevel, true)
})

test('game over retry only applies during game over, once', () => {
    assert.equal(reduceGameOverRetry({ gameState: 'playing', playerGameOver: false }).handled, false)
    assert.equal(reduceGameOverRetry({ gameState: 'menu', playerGameOver: true }).handled, false)
    assert.equal(reduceGameOverRetry({ gameState: 'playing', playerGameOver: true, restarting: true }).handled, false)
})

test('Escape while the King is dying is ignored', () => {
    const r = reduceEscapeKey({
        gameState: 'playing',
        pauseMenuFromPlaying: false,
        playerGameOver: false,
        playerDying: true,
    })
    assert.equal(r.handled, false)
    assert.equal(r.reason, 'dying')
})

test('R and taps (the game over retry) do nothing while the King is dying', () => {
    const r = reduceGameOverRetry({ gameState: 'playing', playerGameOver: false, playerDying: true })
    assert.equal(r.handled, false)
    const both = reduceGameOverRetry({ gameState: 'playing', playerGameOver: true, playerDying: true })
    assert.equal(both.handled, false)
})

test('Enter/Space (Pause Menu choices) do nothing while the King is dying', () => {
    for (const choice of ['resume', 'restart', 'quit']) {
        const r = reducePauseMenuChoice({
            choice,
            gameState: 'playing',
            pauseMenuFromPlaying: false,
            currentLevel: 1,
        })
        assert.equal(r.handled, false)
    }
})

test('a grounded King whose Dead animation has finished moves dying to game over', () => {
    const r = reduceDeathProgress({
        gameState: 'playing',
        playerDying: true,
        playerGrounded: true,
        deathAnimationDone: true,
    })
    assert.equal(r.handled, true)
    assert.equal(r.gameOver, true)
})

test('a mid-air death stays dying until the King lands, even with the animation done', () => {
    const r = reduceDeathProgress({
        gameState: 'playing',
        playerDying: true,
        playerGrounded: false,
        deathAnimationDone: true,
    })
    assert.equal(r.handled, false)
    assert.equal(r.reason, 'stillDying')
})

test('a grounded King stays dying while the Dead animation is still playing', () => {
    const r = reduceDeathProgress({
        gameState: 'playing',
        playerDying: true,
        playerGrounded: true,
        deathAnimationDone: false,
    })
    assert.equal(r.handled, false)
})

test('death progress only applies while playing and dying', () => {
    assert.equal(reduceDeathProgress({ gameState: 'playing', playerDying: false, playerGrounded: true, deathAnimationDone: true }).handled, false)
    assert.equal(reduceDeathProgress({ gameState: 'menu', playerDying: true, playerGrounded: true, deathAnimationDone: true }).handled, false)
})
