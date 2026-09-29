import assert from 'node:assert/strict'
import test from 'node:test'
import { STORM, boltAt, boltPoints, busiestSecond, flashAt, flashStarts, isDouble, strikeStart } from '../js/storm.mjs'

test('strikes come 5 to 10 s apart', () => {
    for (let n = 0; n < 200; n++) {
        const gap = strikeStart(n + 1) - strikeStart(n)
        assert.ok(gap >= STORM.gapMin && gap <= STORM.gapMax, `gap ${gap}`)
    }
})

test('the same moment always gives the same flash and bolt', () => {
    assert.equal(flashAt(7.3), flashAt(7.3))
    assert.deepEqual(boltAt(strikeStart(3) + 0.1), boltAt(strikeStart(3) + 0.1))
})

test('a flash is never more than 35% white', () => {
    let peak = 0
    for (let t = 0; t < 600; t += 1 / 60) peak = Math.max(peak, flashAt(t))
    assert.ok(peak > 0.2, 'flashes do show')
    assert.ok(peak <= 0.35, `peak ${peak}`)
})

test('respects the flash-rate limit: never more than 3 flashes begin in any second', () => {
    for (const seed of [0, 1, 2, 24, 99]) {
        assert.ok(busiestSecond(3600, seed) <= STORM.maxFlashesPerSecond, `seed ${seed}`)
    }
    assert.ok(STORM.flickerGap > 1 / 3, 'a double flicker stays under 3 a second')
})

test('no sustained strobing: at least 5 s of calm between strikes', () => {
    for (let n = 0; n < 100; n++) {
        const last = flashStarts(n).at(-1)
        assert.ok(strikeStart(n + 1) - last >= STORM.gapMin - STORM.flickerGap)
        assert.ok(strikeStart(n + 1) - last > 4)
    }
})

test('some strikes are double flickers, most are single', () => {
    const doubles = Array.from({ length: 300 }, (_, n) => isDouble(n)).filter(Boolean).length
    assert.ok(doubles > 40 && doubles < 160, `${doubles}`)
    const n = Array.from({ length: 50 }, (_, i) => i).find(i => isDouble(i))
    assert.equal(flashStarts(n).length, 2)
})

test('dark between strikes; a bolt shows only at the start of its strike', () => {
    assert.equal(flashAt(strikeStart(2) + 3), 0)
    assert.equal(boltAt(strikeStart(2) + 3), null)
    const bolt = boltAt(strikeStart(2) + 0.1)
    assert.ok(bolt && bolt.x >= 0.1 && bolt.x <= 0.9)
})

test('a bolt zigzags from the cloud down to where it ends', () => {
    const points = boltPoints({ seed: 5 }, 400, 20, 200)
    assert.equal(points[0].y, 20)
    assert.equal(points.at(-1).y, 200)
    assert.ok(points.every((p, i) => i === 0 || p.y > points[i - 1].y))
})
