import assert from 'node:assert/strict'
import test from 'node:test'
import {
    CRUMBLING_SHELF, blocksReturn, createShelfState, isLandedOn, isSolid, resetShelf, shakeOffset, shelfAlpha, stepShelf,
} from '../js/crumblingShelf.mjs'

const HIDE_Y = 600
const shelf = () => createShelfState({ x: 100, y: 200, hideY: HIDE_Y })
const run = (state, frames, input = {}) => {
    const events = []
    for (let i = 0; i < frames; i++) {
        const { event } = stepShelf(state, input)
        if (event) events.push(event)
    }
    return events
}
const KING = { position: { x: 90, y: 200 - 53 - 0.01 }, width: 55, height: 53 }

test('a fresh shelf is whole and still', () => {
    const state = shelf()
    assert.equal(state.phase, 'whole')
    assert.equal(state.y, 200)
    assert.ok(isSolid(state))
    assert.equal(shelfAlpha(state), 1)
    assert.deepEqual(shakeOffset(state), 0)
})

test('an untouched shelf never crumbles', () => {
    const state = shelf()
    run(state, 1000)
    assert.equal(state.phase, 'whole')
})

test('landing on top counts; rising through from below or standing beside does not', () => {
    const surface = { x: 100, y: 200, width: CRUMBLING_SHELF.width }
    assert.ok(isLandedOn(KING, 0, surface))
    assert.ok(isLandedOn(KING, 0.5, surface))
    assert.ok(!isLandedOn(KING, -3, surface), 'jumping up through it')
    assert.ok(!isLandedOn({ ...KING, position: { x: 90, y: 200 } }, 0.5, surface), 'below it')
    assert.ok(!isLandedOn({ ...KING, position: { x: 400, y: 147 } }, 0, surface), 'beside it')
})

test('it shakes for 2 s from the first landing, then drops', () => {
    const state = shelf()
    stepShelf(state, { landed: true })
    assert.equal(state.phase, 'shaking')
    assert.ok(isSolid(state))
    const events = run(state, CRUMBLING_SHELF.crumbleFrames - 2)
    assert.equal(state.phase, 'shaking')
    assert.deepEqual(events, [])
    assert.deepEqual(run(state, 1), ['drop'])
    assert.equal(state.phase, 'falling')
})

test('hopping off does not stop the countdown, and landing again does not restart it', () => {
    const state = shelf()
    stepShelf(state, { landed: true })
    run(state, 60)
    stepShelf(state, { landed: true })
    run(state, 57)
    assert.equal(state.phase, 'shaking')
    run(state, 1)
    assert.equal(state.phase, 'falling')
})

test('it shakes while it counts down, and only then', () => {
    const state = shelf()
    stepShelf(state, { landed: true })
    const offsets = new Set()
    for (let i = 0; i < 60; i++) { stepShelf(state, {}); offsets.add(shakeOffset(state)) }
    assert.ok(offsets.size > 1)
    assert.ok([...offsets].every(o => Number.isInteger(o) && Math.abs(o) <= 3))
})

test('a dropping shelf falls with gravity, moving by dy each frame, and is gone out of sight', () => {
    const state = shelf()
    stepShelf(state, { landed: true })
    run(state, CRUMBLING_SHELF.crumbleFrames - 1)
    const y0 = state.y
    const first = stepShelf(state, {})
    assert.equal(first.dy, CRUMBLING_SHELF.gravity)
    const second = stepShelf(state, {})
    assert.equal(second.dy, 2 * CRUMBLING_SHELF.gravity)
    assert.equal(state.y, y0 + 3 * CRUMBLING_SHELF.gravity)
    assert.ok(isSolid(state), 'it falls whole, still carrying whatever is on it')
    let gone = false
    for (let i = 0; i < 300 && !gone; i++) { stepShelf(state, {}); gone = state.phase === 'gone' }
    assert.ok(gone)
    assert.ok(!isSolid(state))
    assert.ok(state.y >= HIDE_Y)
})

test('it fades back in where it was about 3 s after it fell', () => {
    const state = shelf()
    stepShelf(state, { landed: true })
    run(state, CRUMBLING_SHELF.crumbleFrames)
    while (state.phase !== 'gone') stepShelf(state, {})
    const events = run(state, CRUMBLING_SHELF.returnFrames - 1)
    assert.equal(state.phase, 'gone')
    assert.deepEqual(events, [])
    assert.deepEqual(run(state, 1), ['return'])
    assert.equal(state.phase, 'whole')
    assert.equal(state.y, 200)
    assert.ok(isSolid(state))
    assert.ok(shelfAlpha(state) < 1, 'starts see-through')
    run(state, CRUMBLING_SHELF.fadeFrames)
    assert.equal(shelfAlpha(state), 1)
})

test('it waits to come back while the King stands where it would be', () => {
    const state = shelf()
    stepShelf(state, { landed: true })
    run(state, CRUMBLING_SHELF.crumbleFrames)
    while (state.phase !== 'gone') stepShelf(state, {})
    run(state, CRUMBLING_SHELF.returnFrames + 200, { blocked: true })
    assert.equal(state.phase, 'gone')
    assert.deepEqual(run(state, 1, { blocked: false }), ['return'])
})

test('a reset makes it whole and still at once, from any phase', () => {
    for (const frames of [0, 30, CRUMBLING_SHELF.crumbleFrames + 10, CRUMBLING_SHELF.crumbleFrames + 400]) {
        const state = shelf()
        stepShelf(state, { landed: true })
        run(state, frames)
        resetShelf(state)
        assert.equal(state.phase, 'whole')
        assert.equal(state.y, 200)
        assert.equal(shelfAlpha(state), 1)
        assert.equal(shakeOffset(state), 0)
        run(state, 1000)
        assert.equal(state.phase, 'whole', 'and it is uncracked: no countdown left over')
    }
})

test('the King blocks its return while his body is on its strip, not while he is above or beside it', () => {
    const state = shelf()
    const at = (x, y) => ({ position: { x, y }, width: 55, height: 53 })
    assert.ok(blocksReturn(at(100, 180), state), 'overlapping the strip')
    assert.ok(blocksReturn(at(100, 200 - 53 - 0.01), state), 'feet on where the top would be')
    assert.ok(!blocksReturn(at(100, 100), state), 'high above')
    assert.ok(!blocksReturn(at(100, 210), state), 'below')
    assert.ok(!blocksReturn(at(200, 180), state), 'beside')
})
