import assert from 'node:assert/strict'
import test from 'node:test'
import { RAIN, inPuddle, puddleRipples, rainAt, wallTops } from '../js/weather.mjs'

const block = (x, y, width = 64, height = 64) => ({ position: { x, y }, width, height })
const VIEW = { left: 0, right: 1024 }

test('wall tops merge a row of blocks and skip blocks with a block above', () => {
    const blocks = [block(0, 384), block(64, 384), block(128, 384), block(64, 320), block(0, 448), block(256, 384)]
    assert.deepEqual(wallTops(blocks), [
        { x1: 0, x2: 64, y: 384 },
        { x1: 128, x2: 192, y: 384 },
        { x1: 64, x2: 128, y: 320 },
        { x1: 256, x2: 320, y: 384 },
    ].sort((a, b) => a.y - b.y || a.x1 - b.x1))
})

test('rain is the same every time for the same moment', () => {
    const a = rainAt(3.2, VIEW, { tops: [], bottom: 496 })
    const b = rainAt(3.2, VIEW, { tops: [], bottom: 496 })
    assert.deepEqual(a, b)
})

test('rain is sparse and slanted', () => {
    let most = 0
    for (let t = 0; t < 20; t += 0.25) {
        const { streaks } = rainAt(t, VIEW, { tops: [], bottom: 496 })
        most = Math.max(most, streaks.length)
        for (const s of streaks) {
            assert.ok(s.tailX < s.x, 'the tail trails up and to the left')
            assert.ok(s.tailY < s.y)
            assert.ok(s.y <= 496, 'a drop stops at the bottom')
        }
    }
    assert.ok(most > 0)
    assert.ok(most <= 14, `at most ${most} streaks in a 1024-px view`)
})

test('a drop over a wall top splashes there, and never lower', () => {
    const tops = [{ x1: -4096, x2: 4096, y: 384 }]
    let splashes = []
    for (let t = 0; t < 10; t += 0.05) splashes = splashes.concat(rainAt(t, VIEW, { tops, bottom: 496 }).splashes)
    assert.ok(splashes.length > 0)
    for (const s of splashes) {
        assert.equal(s.y, 384)
        assert.ok(s.age >= 0 && s.age < 1)
    }
    for (let t = 0; t < 10; t += 0.05) {
        for (const streak of rainAt(t, VIEW, { tops, bottom: 496 }).streaks) assert.ok(streak.y <= 384)
    }
})

test('a drop that misses every wall falls to the bottom without a splash', () => {
    for (let t = 0; t < 10; t += 0.1) assert.deepEqual(rainAt(t, VIEW, { tops: [], bottom: 496 }).splashes, [])
})

test('a splash in a Puddle is marked, one beside it is not', () => {
    const puddles = [{ x: 100, y: 384, width: 60 }]
    assert.equal(inPuddle(130, 384, puddles), true)
    assert.equal(inPuddle(170, 384, puddles), false)
    assert.equal(inPuddle(130, 320, puddles), false)
})

test('a Puddle on a plank ripples: rings within its width, growing then gone', () => {
    let seen = 0
    for (let t = 0; t < 10; t += 0.05) {
        for (const ring of puddleRipples(t, 3, 40)) {
            seen++
            assert.ok(ring.dx >= 0 && ring.dx <= 40)
            assert.ok(ring.age >= 0 && ring.age < 1)
        }
    }
    assert.ok(seen > 0)
    assert.ok(puddleRipples(0, 3, 40).length <= RAIN.ripplesPerPuddle)
})
