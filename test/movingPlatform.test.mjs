import assert from 'node:assert/strict'
import test from 'node:test'
import {
    MOVING_PLATFORM,
    createMovingPlatformState,
    isResting,
    isRiding,
    pathPositionAt,
    pathShareAt,
    stepMovingPlatform,
} from '../js/movingPlatform.mjs'

const PATH = { from: { x: 100, y: 400 }, to: { x: 500, y: 200 }, periodFrames: 240 }

test('a path starts at from, reaches to at half a period and is back at from after one', () => {
    assert.deepEqual(pathPositionAt(PATH, 0), { x: 100, y: 400 })
    const half = pathPositionAt(PATH, 120)
    assert.ok(Math.abs(half.x - 500) < 1e-9 && Math.abs(half.y - 200) < 1e-9)
    const full = pathPositionAt(PATH, 240)
    assert.ok(Math.abs(full.x - 100) < 1e-9 && Math.abs(full.y - 400) < 1e-9)
})

test('a phase of 0.5 starts the platform at the far end', () => {
    assert.equal(pathShareAt(0, 240, 0.5), 1)
})

test('a platform eases: it moves slowest near the ends and fastest mid-way', () => {
    const state = createMovingPlatformState(PATH)
    const moves = []
    for (let i = 0; i < 120; i++) moves.push(Math.abs(stepMovingPlatform(state).dx))
    assert.ok(moves[0] < moves[60])
    assert.ok(moves[119] < moves[60])
})

test('stepping returns the move and keeps the state on the path', () => {
    const state = createMovingPlatformState(PATH)
    const before = { x: state.x, y: state.y }
    const { dx, dy } = stepMovingPlatform(state)
    assert.equal(state.frame, 1)
    assert.ok(Math.abs(state.x - (before.x + dx)) < 1e-9)
    assert.ok(Math.abs(state.y - (before.y + dy)) < 1e-9)
    assert.deepEqual({ x: state.x, y: state.y }, pathPositionAt(PATH, 1))
})

const SURFACE = { x: 1000, y: 384 }
const standingHitbox = (x, feetY = SURFACE.y - 0.01) => ({ position: { x, y: feetY - 53 }, width: 55, height: 53 })

test('the King rides a platform when his feet are on its top', () => {
    assert.equal(isRiding(standingHitbox(1050), 0.5, SURFACE), true)
})

test('the King overhanging either end still rides it', () => {
    assert.equal(isRiding(standingHitbox(1000 - 50), 0, SURFACE), true)
    assert.equal(isRiding(standingHitbox(1000 + MOVING_PLATFORM.width - 5), 0, SURFACE), true)
})

test('the King beside the platform, above it, or jumping off does not ride it', () => {
    assert.equal(isRiding(standingHitbox(1000 + MOVING_PLATFORM.width + 5), 0, SURFACE), false)
    assert.equal(isRiding(standingHitbox(1050, SURFACE.y - 20), 0, SURFACE), false)
    assert.equal(isRiding(standingHitbox(1050), -10, SURFACE), false)
})

test('a Bomb resting on the top is carried; one elsewhere is not', () => {
    assert.equal(isResting(1100, 384, SURFACE), true)
    assert.equal(isResting(1100, 300, SURFACE), false)
    assert.equal(isResting(900, 384, SURFACE), false)
})
