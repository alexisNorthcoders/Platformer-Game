import assert from 'node:assert/strict'
import test from 'node:test'
import { bindTapToRestart, gameOverPrompt, isTouchDevice } from '../js/gameOverRestart.mjs'

function fakeTarget() {
    const listeners = new Map()
    return {
        addEventListener(type, fn) { listeners.set(type, fn) },
        tap() {
            const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true } }
            listeners.get('pointerdown')?.(event)
            return event
        },
    }
}

test('touch devices are prompted to tap, desktop to press R', () => {
    assert.equal(gameOverPrompt(true), 'Tap to restart')
    assert.equal(gameOverPrompt(false), 'Press R to restart')
})

test('isTouchDevice follows the coarse pointer media query', () => {
    const queries = []
    const matchMedia = (matches) => (q) => { queries.push(q); return { matches } }
    assert.equal(isTouchDevice(matchMedia(true)), true)
    assert.equal(isTouchDevice(matchMedia(false)), false)
    assert.deepEqual(queries, ['(pointer: coarse)', '(pointer: coarse)'])
    assert.equal(isTouchDevice(null), false, 'no matchMedia API means not touch')
})

test('a tap during game over restarts', () => {
    const target = fakeTarget()
    let restarts = 0
    bindTapToRestart(target, { isGameOver: () => true, restart: () => { restarts++ } })
    const event = target.tap()
    assert.equal(restarts, 1)
    assert.equal(event.defaultPrevented, true)
})

test('taps outside game over do nothing', () => {
    const target = fakeTarget()
    let restarts = 0
    bindTapToRestart(target, { isGameOver: () => false, restart: () => { restarts++ } })
    const event = target.tap()
    assert.equal(restarts, 0)
    assert.equal(event.defaultPrevented, false)
})

test('repeated taps restart once, because restarting ends game over', () => {
    const target = fakeTarget()
    // Mirrors restartFromGameOver, which clears gameOver synchronously.
    let gameOver = true
    let restarts = 0
    bindTapToRestart(target, { isGameOver: () => gameOver, restart: () => { restarts++; gameOver = false } })
    target.tap()
    target.tap()
    target.tap()
    assert.equal(restarts, 1)
    gameOver = true
    target.tap()
    assert.equal(restarts, 2, 'a later game over can be restarted again')
})
