import assert from 'node:assert/strict'
import test from 'node:test'
import { createGhostRecorder, ghostFrameAt, packRun, unpackRun } from '../js/ghostRecorder.mjs'

const pose = (over = {}) => ({ x: 10, y: 20, key: 'idleRight', frame: 0, flip: false, ...over })

test('frames are stamped with the elapsed time and positions rounded to whole pixels', () => {
    const rec = createGhostRecorder()
    rec.record(0, pose({ x: 10.4, y: 19.6 }))
    rec.record(16.7, pose({ x: 12.5, key: 'runRight', frame: 1 }))
    assert.deepEqual(rec.frames(), [
        { t: 0, x: 10, y: 20, key: 'idleRight', frame: 0, flip: false },
        { t: 17, x: 13, y: 20, key: 'runRight', frame: 1, flip: false },
    ])
})

test('consecutive identical frames are dropped, a change in any field keeps one', () => {
    const rec = createGhostRecorder()
    rec.record(0, pose())
    rec.record(16, pose({ x: 10.2 }))
    rec.record(32, pose())
    assert.equal(rec.frames().length, 1)
    for (const [i, change] of [{ y: 21 }, { key: 'jump' }, { frame: 3 }, { flip: true }].entries()) {
        rec.record(100 + i, pose(change))
        rec.record(200 + i, pose())
    }
    assert.equal(rec.frames().length, 1 + 8)
})

test('a frame without an animation key is not recorded', () => {
    const rec = createGhostRecorder()
    rec.record(0, pose({ key: undefined }))
    assert.deepEqual(rec.frames(), [])
})

test('clear forgets the run', () => {
    const rec = createGhostRecorder()
    rec.record(0, pose())
    rec.clear()
    assert.deepEqual(rec.frames(), [])
})

const run = [
    { t: 100, x: 0, y: 0, key: 'a', frame: 0, flip: false },
    { t: 200, x: 5, y: 0, key: 'b', frame: 1, flip: true },
    { t: 400, x: 9, y: 3, key: 'a', frame: 2, flip: false },
]

test('playback shows the latest frame at or before the time, holding between frames', () => {
    assert.equal(ghostFrameAt(run, 100, 500), run[0])
    assert.equal(ghostFrameAt(run, 199, 500), run[0])
    assert.equal(ghostFrameAt(run, 200, 500), run[1])
    assert.equal(ghostFrameAt(run, 399, 500), run[1])
    assert.equal(ghostFrameAt(run, 450, 500), run[2])
})

test('playback shows nothing before the first frame or after the end', () => {
    assert.equal(ghostFrameAt(run, 99, 500), null)
    assert.equal(ghostFrameAt(run, 500, 500), run[2])
    assert.equal(ghostFrameAt(run, 501, 500), null)
    assert.equal(ghostFrameAt([], 0, 500), null)
    assert.equal(ghostFrameAt(undefined, 0, 500), null)
})

test('a packed run unpacks to the same frames', () => {
    assert.deepEqual(unpackRun(JSON.parse(JSON.stringify(packRun(run)))), run)
    assert.deepEqual(unpackRun(packRun([])), [])
})

test('malformed packed runs unpack to nothing', () => {
    assert.deepEqual(unpackRun(null), [])
    assert.deepEqual(unpackRun({ keys: ['a'], d: [1, 2, 3] }), [])
    assert.deepEqual(unpackRun({ keys: ['a'], d: [1, 2, 3, 5, 0] }), [])
})

test('a busy 60-second run stores in tens of KB at most', () => {
    const rec = createGhostRecorder()
    for (let i = 0; i < 3600; i++) {
        rec.record(i * 16.67, pose({ x: i * 3 + (i % 2), y: 400 + ((i * 7) % 60), key: i % 3 ? 'runRight' : 'jump', frame: i % 8, flip: i % 5 === 0 }))
    }
    const size = JSON.stringify(packRun(rec.frames())).length
    assert.ok(size < 60_000, `size ${size}`)
})
