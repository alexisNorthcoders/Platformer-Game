import assert from 'node:assert/strict'
import test from 'node:test'
import { BOX_PIG, createBoxPigState, floorEdges, stepBoxPig } from '../js/boxPig.mjs'

const TILE = 64
const BODY = { left: 500, right: 544 }
const FLOOR = { left: 0, right: 1000 }

/** One step with sensible defaults: the King to the right, on the ground, on a wide floor. */
function step(state, input = {}) {
    return stepBoxPig(state, { dtMs: 16, kingDistance: 10 * TILE, kingDirection: 1, grounded: true, body: BODY, floor: FLOOR, ...input })
}
/** Steps until the hop starts; returns that step's result. */
function toTakeOff(input = {}) {
    let out = createBoxPigState()
    for (let i = 0; i < 300; i++) {
        out = step(out, { kingDistance: 2 * TILE, ...input })
        if (out.hop) return out
    }
    assert.fail('never hopped')
}
/** Steps `ms` of King distance `d`, returning the last result. */
function run(state, ms, input = {}) {
    let out = { ...state, sprite: null, hop: null }
    for (let t = 0; t < ms; t += 16) out = step(out, input)
    return out
}

test('hidden: the Box Pig keeps the Box Idle art while the King is far', () => {
    const out = step(createBoxPigState(), { kingDistance: 3 * TILE + 1 })
    assert.equal(out.mode, 'hidden')
    assert.equal(out.sprite, 'idle')
    assert.equal(out.hop, null)
})

test('peeks once the King is within 3 tiles', () => {
    const out = step(createBoxPigState(), { kingDistance: 3 * TILE })
    assert.equal(out.mode, 'lookingOut')
    assert.equal(out.sprite, 'lookingOut')
})

test('after peeking it winds up, then hops toward the King', () => {
    let out = run(createBoxPigState(), BOX_PIG.PEEK_MS + 16, { kingDistance: 2 * TILE })
    assert.equal(out.mode, 'anticipating')
    assert.equal(out.sprite, 'anticipation')
    out = run(out, BOX_PIG.WIND_UP_MS + 16, { kingDistance: 2 * TILE })
    assert.equal(out.mode, 'jumping')
    assert.equal(out.sprite, 'jump')
})

test('the hop leaves with an upward and a forward velocity, toward the King', () => {
    const hops = []
    let out = createBoxPigState()
    for (let i = 0; i < 200; i++) {
        out = step(out, { kingDistance: 2 * TILE, kingDirection: -1 })
        if (out.hop) hops.push(out.hop)
        if (hops.length) break
    }
    assert.equal(hops.length, 1)
    assert.ok(hops[0].y < 0)
    assert.ok(hops[0].x < 0)
    assert.equal(out.flip, false)
    const right = run(createBoxPigState(), 2000, { kingDistance: 2 * TILE, kingDirection: 1 })
    assert.equal(right.flip, true)
})

test('a hop shows Jump rising, Fall after the apex, Ground on landing, then hops again', () => {
    let out = toTakeOff()
    assert.equal(out.sprite, 'jump')
    out = run(out, BOX_PIG.RISE_MS, { kingDistance: 2 * TILE, grounded: false })
    assert.equal(out.sprite, 'fall')
    out = step(out, { kingDistance: 2 * TILE, grounded: true })
    assert.equal(out.mode, 'landing')
    assert.equal(out.sprite, 'ground')
    let hopped = false
    for (let t = 0; t <= BOX_PIG.LAND_MS + 16 && !hopped; t += 16) {
        out = step(out, { kingDistance: 2 * TILE })
        hopped = Boolean(out.hop)
    }
    assert.ok(hopped)
    assert.equal(out.sprite, 'jump')
})

test('a landing is not mistaken for the take-off frame', () => {
    const out = step(toTakeOff(), { kingDistance: 2 * TILE, grounded: true })
    assert.equal(out.mode, 'jumping')
})

test('past 5 tiles it hides again on the ground', () => {
    let out = run(createBoxPigState(), BOX_PIG.PEEK_MS + 16, { kingDistance: 2 * TILE })
    out = step(out, { kingDistance: 5 * TILE + 1 })
    assert.equal(out.mode, 'hidden')
    assert.equal(out.sprite, 'idle')
})

test('in the air it finishes the hop before hiding', () => {
    let out = toTakeOff()
    out = run(out, 64, { kingDistance: 6 * TILE, grounded: false })
    assert.equal(out.mode, 'jumping')
    out = step(out, { kingDistance: 6 * TILE, grounded: true })
    assert.equal(out.mode, 'hidden')
})

test('hysteresis: between 3 and 5 tiles the state never changes', () => {
    const hiddenStays = run(createBoxPigState(), 2000, { kingDistance: 4 * TILE })
    assert.equal(hiddenStays.mode, 'hidden')
    let out = run(createBoxPigState(), BOX_PIG.PEEK_MS + 16, { kingDistance: 2 * TILE })
    assert.equal(out.mode, 'anticipating')
    out = run(out, 5000, { kingDistance: 4 * TILE })
    assert.notEqual(out.mode, 'hidden')
    assert.notEqual(out.mode, undefined)
})

test('exactly 5 tiles away is still between: it does not hide', () => {
    const out = run(createBoxPigState(), BOX_PIG.PEEK_MS + 16, { kingDistance: 2 * TILE })
    assert.equal(step(out, { kingDistance: 5 * TILE }).mode, 'anticipating')
})

test('the edge clamp: a hop never carries it past the lip it is hopping toward', () => {
    const near = { left: 500, right: 544 }
    const floor = { left: 400, right: 560 }
    const hop = hopOf({ body: near, floor, kingDirection: 1 })
    assert.ok(hop.x >= 0)
    assert.ok(hop.x * BOX_PIG.HOP_FRAMES <= floor.right - near.right)
    const left = hopOf({ body: near, floor, kingDirection: -1 })
    assert.ok(-left.x * BOX_PIG.HOP_FRAMES <= near.left - floor.left)
})

test('at the lip the hop is in place', () => {
    const hop = hopOf({ body: { left: 516, right: 560 }, floor: { left: 400, right: 560 }, kingDirection: 1 })
    assert.equal(hop.x, 0)
    assert.ok(hop.y < 0)
})

test('with plenty of floor the hop has the full speed', () => {
    assert.equal(hopOf({}).x, BOX_PIG.HOP_SPEED)
})

test('without a floor to measure it hops in place', () => {
    assert.equal(hopOf({ floor: null }).x, 0)
})

function hopOf(input) {
    let out = createBoxPigState()
    for (let i = 0; i < 300; i++) {
        out = step(out, { kingDistance: 2 * TILE, ...input })
        if (out.hop) return out.hop
    }
    assert.fail('never hopped')
}

test('floorEdges: a run of blocks under the feet, to its ends', () => {
    const blocks = [0, 64, 128, 192].map(x => ({ position: { x, y: 512 }, width: 64, height: 64 }))
    blocks.push({ position: { x: 320, y: 512 }, width: 64, height: 64 })
    assert.deepEqual(floorEdges(blocks, { left: 100, right: 144, bottom: 512, height: 32 }), { left: 0, right: 256 })
})

test('floorEdges: a block standing on the floor is a wall', () => {
    const blocks = [0, 64, 128, 192].map(x => ({ position: { x, y: 512 }, width: 64, height: 64 }))
    blocks.push({ position: { x: 192, y: 480 }, width: 44, height: 32 }, { position: { x: 20, y: 448 }, width: 44, height: 64 })
    assert.deepEqual(floorEdges(blocks, { left: 100, right: 144, bottom: 512, height: 32 }), { left: 64, right: 192 })
})

test('floorEdges: no floor, or a shattered block, gives null / is skipped', () => {
    assert.equal(floorEdges([], { left: 100, right: 144, bottom: 512, height: 32 }), null)
    assert.equal(floorEdges([{ position: 0, width: 64, height: 64 }], { left: 100, right: 144, bottom: 512, height: 32 }), null)
})

test('the module uses no DOM, canvas or globals', async () => {
    const { readFileSync } = await import('node:fs')
    const source = readFileSync(new URL('../js/boxPig.mjs', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    assert.doesNotMatch(source, /\b(document|window|globalThis|canvas|Date)\b/)
})
