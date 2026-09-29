import assert from 'node:assert/strict'
import test from 'node:test'
import {
    MOVING_PLATFORM,
    createMovingPlatformState,
    isResting,
    isRiding,
    carriedDrop,
    pathPositionAt,
    pathShareAt,
    plankWidth,
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

// A Rotating Platform's plank circles a hub, staying level: its surface's
// middle runs round the circle.
const ORBIT = { center: { x: 1000, y: 300 }, radius: 128, periodFrames: 400 }
const middle = position => ({ x: position.x + MOVING_PLATFORM.width / 2, y: position.y })
const near = (a, b) => Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9

test('a plank on a hub starts at its right, turns clockwise and is back after one period', () => {
    assert.ok(near(middle(pathPositionAt(ORBIT, 0)), { x: 1128, y: 300 }))
    assert.ok(near(middle(pathPositionAt(ORBIT, 100)), { x: 1000, y: 428 }), 'a quarter turn later it is under the hub')
    assert.ok(near(middle(pathPositionAt(ORBIT, 400)), { x: 1128, y: 300 }))
})

test('a phase turns the plank further round; direction -1 turns it anticlockwise', () => {
    assert.ok(near(middle(pathPositionAt({ ...ORBIT, phase: 0.5 }, 0)), { x: 872, y: 300 }))
    assert.ok(near(middle(pathPositionAt({ ...ORBIT, direction: -1 }, 100)), { x: 1000, y: 172 }))
})

test('a plank on a hub moves at a steady speed', () => {
    const state = createMovingPlatformState(ORBIT)
    const speeds = []
    for (let i = 0; i < 400; i++) {
        const { dx, dy } = stepMovingPlatform(state)
        speeds.push(Math.hypot(dx, dy))
    }
    assert.ok(Math.max(...speeds) - Math.min(...speeds) < 1e-6)
})

// A plank sinking past a ledge the King also stands on leaves him on the ledge.
const LEDGE = { position: { x: 1200, y: 320 }, width: 64, height: 64 }

test('a sinking plank carries the King down when nothing else holds him', () => {
    assert.equal(carriedDrop(standingHitbox(1050, 300), 1.5, [LEDGE]), 1.5)
})

test('a sinking plank carries the King no lower than a ledge under him', () => {
    assert.equal(carriedDrop(standingHitbox(1180, 319.99), 1.5, [LEDGE]), 0)
    assert.ok(Math.abs(carriedDrop(standingHitbox(1180, 319), 1.5, [LEDGE]) - 0.99) < 1e-9)
})

test('a ledge beside the King, or one he is already below, does not hold him', () => {
    assert.equal(carriedDrop(standingHitbox(1100, 319.99), 1.5, [LEDGE]), 1.5)
    assert.equal(carriedDrop(standingHitbox(1180, 330), 1.5, [LEDGE]), 1.5)
})

test('a rising plank always carries the King up', () => {
    assert.equal(carriedDrop(standingHitbox(1180, 319.99), -1.5, [LEDGE]), -1.5)
})

// A short plank (`width`, Level 23) is shorter to stand on and to circle by.
test('a plank is 200 wide unless its path gives a width', () => {
    assert.equal(plankWidth(PATH), 200)
    assert.equal(plankWidth({ ...PATH, width: 128 }), 128)
})

test('the King overhanging a short plank\'s end rides it; beyond that he does not', () => {
    const short = { ...SURFACE, width: 128 }
    assert.equal(isRiding(standingHitbox(1000 + 128 - 5), 0, short), true)
    assert.equal(isRiding(standingHitbox(1000 + 128 + 5), 0, short), false)
})

test('a short plank on a hub still has the middle of its surface on the circle', () => {
    const short = { ...ORBIT, width: 128 }
    const position = pathPositionAt(short, 0)
    assert.ok(near({ x: position.x + 64, y: position.y }, { x: 1128, y: 300 }))
})
