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

function deferred() {
    let resolve
    const promise = new Promise(r => { resolve = r })
    return { promise, resolve }
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
    assert.equal(isTouchDevice(undefined), false)
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

test('repeated taps while a restart is in flight restart only once', async () => {
    const target = fakeTarget()
    const pending = deferred()
    let restarts = 0
    // isGameOver stays true to prove the tap guard alone prevents a double restart.
    bindTapToRestart(target, { isGameOver: () => true, restart: () => { restarts++; return pending.promise } })
    target.tap()
    target.tap()
    target.tap()
    assert.equal(restarts, 1)
    pending.resolve()
    await new Promise(r => setImmediate(r))
    target.tap()
    assert.equal(restarts, 2, 'a later game over can be restarted again')
})

test('a failed restart does not block the next tap', async () => {
    const target = fakeTarget()
    let restarts = 0
    bindTapToRestart(target, {
        isGameOver: () => true,
        restart: () => { restarts++; return Promise.reject(new Error('boom')) },
    })
    target.tap()
    await new Promise(r => setImmediate(r))
    target.tap()
    assert.equal(restarts, 2)
})
