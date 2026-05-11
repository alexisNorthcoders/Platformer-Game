import assert from 'node:assert/strict'
import test from 'node:test'
import { reduceEscapeKey } from '../js/escapeMenuLogic.mjs'

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

test('Escape during gameplay opens pause menu for current level', () => {
    const r = reduceEscapeKey({
        gameState: 'playing',
        pauseMenuFromPlaying: false,
        playerGameOver: false,
        currentLevel: 3,
    })
    assert.equal(r.handled, true)
    assert.equal(r.gameState, 'menu')
    assert.equal(r.pauseMenuFromPlaying, true)
    assert.equal(r.selectedLevel, 3)
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
    assert.equal(r.resyncMenuSelectionToLevel, true)
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
