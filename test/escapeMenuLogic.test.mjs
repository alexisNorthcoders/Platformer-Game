import assert from 'node:assert/strict'
import test from 'node:test'
import { GAME_OVER_DIM_ALPHA, GAME_OVER_MENU_DELAY_MS, gameOverDimAlpha, gameOverMenuReady, reduceDeathProgress, reduceEscapeKey, reduceGameOverChoice, reducePauseMenuChoice } from '../js/escapeMenuLogic.mjs'

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

const GAME_OVER = { gameState: 'playing', playerGameOver: true, currentLevel: 3, gameOverAt: 1000, now: 1000 + GAME_OVER_MENU_DELAY_MS }

test('Try Again is the same transition as the Pause Menu Restart Level', () => {
    const retry = reduceGameOverChoice({ ...GAME_OVER, choice: 'retry' })
    const restart = reducePauseMenuChoice({ ...PAUSED, choice: 'restart' })
    assert.deepEqual(retry, restart)
    assert.equal(retry.restartLevel, true)
})

test('Quit to Title on the Game Over Screen is the same transition as the Pause Menu one', () => {
    const quit = reduceGameOverChoice({ ...GAME_OVER, choice: 'quit' })
    const paused = reducePauseMenuChoice({ ...PAUSED, choice: 'quit', currentLevel: 3 })
    assert.deepEqual(quit, paused)
    assert.equal(quit.resetSession, true)
    assert.equal(quit.selectedLevel, 3)
})

test('Game Over Screen choices are not handled outside game over, or twice', () => {
    for (const choice of ['retry', 'quit']) {
        assert.equal(reduceGameOverChoice({ ...GAME_OVER, choice, playerGameOver: false }).handled, false)
        assert.equal(reduceGameOverChoice({ ...GAME_OVER, choice, gameState: 'menu' }).handled, false)
        assert.equal(reduceGameOverChoice({ ...GAME_OVER, choice, restarting: true }).handled, false)
    }
    assert.equal(reduceGameOverChoice({ ...GAME_OVER, choice: 'resume' }).handled, false)
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

test('Game Over Screen choices do nothing while the King is dying', () => {
    const r = reduceGameOverChoice({ choice: 'retry', gameState: 'playing', playerGameOver: false, playerDying: true })
    assert.equal(r.handled, false)
    const both = reduceGameOverChoice({ choice: 'retry', gameState: 'playing', playerGameOver: true, playerDying: true })
    assert.equal(both.handled, false)
})

test('Enter/Space (Pause Menu choices) do nothing while the King is dying', () => {
    for (const choice of ['resume', 'restart', 'quit']) {
        const r = reducePauseMenuChoice({
            choice,
            gameState: 'playing',
            pauseMenuFromPlaying: false,
            currentLevel: 1,
            playerDying: true,
        })
        assert.equal(r.handled, false)
        assert.equal(r.reason, 'dying')
        // Even with the Pause Menu open, a dying King blocks the choice.
        assert.equal(reducePauseMenuChoice({ choice, gameState: 'menu', pauseMenuFromPlaying: true, currentLevel: 1, playerDying: true }).handled, false)
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

test('a King lost out of sight in a pit goes straight to game over, grounded or not', () => {
    const r = reduceDeathProgress({
        gameState: 'playing',
        playerDying: true,
        playerGrounded: false,
        deathAnimationDone: false,
        outOfSight: true,
    })
    assert.equal(r.handled, true)
    assert.equal(r.gameOver, true)
})

test('death progress only applies while playing and dying', () => {
    assert.equal(reduceDeathProgress({ gameState: 'playing', playerDying: false, playerGrounded: true, deathAnimationDone: true }).handled, false)
    assert.equal(reduceDeathProgress({ gameState: 'menu', playerDying: true, playerGrounded: true, deathAnimationDone: true }).handled, false)
})

test('Game Over Screen choices are refused until the menu is revealed', () => {
    for (const choice of ['retry', 'quit']) {
        const locked = reduceGameOverChoice({ ...GAME_OVER, choice, now: 1000 + GAME_OVER_MENU_DELAY_MS - 1 })
        assert.equal(locked.handled, false)
        assert.equal(locked.reason, 'menuLocked')
        assert.equal(reduceGameOverChoice({ ...GAME_OVER, choice, gameOverAt: null }).handled, false)
        assert.equal(reduceGameOverChoice({ ...GAME_OVER, choice }).handled, true)
    }
})

test('The menu delay is exactly GAME_OVER_MENU_DELAY_MS', () => {
    assert.equal(GAME_OVER_MENU_DELAY_MS, 500)
    assert.equal(gameOverMenuReady({ gameOverAt: 200, now: 200 + GAME_OVER_MENU_DELAY_MS - 1 }), false)
    assert.equal(gameOverMenuReady({ gameOverAt: 200, now: 200 + GAME_OVER_MENU_DELAY_MS }), true)
    assert.equal(gameOverMenuReady({ gameOverAt: 200, now: 9999 }), true)
    assert.equal(gameOverMenuReady({ gameOverAt: null, now: 9999 }), false)
})

test('The dim eases linearly from 0 to the overlay darkness across the delay', () => {
    assert.equal(gameOverDimAlpha({ gameOverAt: null, now: 500 }), 0)
    assert.equal(gameOverDimAlpha({ gameOverAt: 100, now: 100 }), 0)
    assert.equal(gameOverDimAlpha({ gameOverAt: 100, now: 100 + GAME_OVER_MENU_DELAY_MS / 2 }), GAME_OVER_DIM_ALPHA / 2)
    assert.equal(gameOverDimAlpha({ gameOverAt: 100, now: 100 + GAME_OVER_MENU_DELAY_MS }), GAME_OVER_DIM_ALPHA)
    assert.equal(gameOverDimAlpha({ gameOverAt: 100, now: 99999 }), GAME_OVER_DIM_ALPHA)
})
