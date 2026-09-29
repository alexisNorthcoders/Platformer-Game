import assert from 'node:assert/strict'
import test from 'node:test'
import { TUMBLING_PLANK, createTumbleState, deviationFromFlat, stepTumble, tumbleAngleAt, tumbleSurfaceAt } from '../js/tumblingPlank.mjs'

const PLANK = { center: { x: 1000, y: 300 }, periodFrames: 480 }

test('flat at frame 0: standable, the full length, centred', () => {
    assert.deepEqual(tumbleSurfaceAt(PLANK, 0), { x: 900, y: 300, width: 200, standable: true })
})

test('it turns once every 8 s and is flat twice a turn', () => {
    assert.ok(Math.abs(tumbleAngleAt(PLANK, 480) - 2 * Math.PI) < 1e-9)
    assert.equal(tumbleSurfaceAt(PLANK, 240).standable, true) // half a turn: flat the other way up
    assert.equal(tumbleSurfaceAt(PLANK, 120).standable, false) // on end
})

test('deviation from flat folds every half turn', () => {
    assert.ok(Math.abs(deviationFromFlat(Math.PI) - 0) < 1e-9)
    assert.ok(Math.abs(deviationFromFlat(-Math.PI / 2) - Math.PI / 2) < 1e-9)
    assert.ok(Math.abs(deviationFromFlat(Math.PI * 0.9) - Math.PI * 0.1) < 1e-9)
})

test('standable within about 25 degrees of flat: a window of about 1.1 s every 4 s', () => {
    let standable = 0
    for (let f = 0; f < 240; f++) if (tumbleSurfaceAt(PLANK, f).standable) standable++
    // 50 of every 180 degrees, over 240 frames: about 67 frames (1.1 s).
    assert.ok(standable >= 64 && standable <= 70, `${standable} frames`)
    assert.ok(standable / 60 >= 1.05 && standable / 60 <= 1.2)
    assert.ok(standable / 60 > 0.85, 'long enough to walk the plank (0.85 s)')
})

test('the surface is gone past the window: width 0', () => {
    const tipped = tumbleSurfaceAt(PLANK, 40) // 30 degrees
    assert.equal(tipped.standable, false)
    assert.equal(tipped.width, 0)
})

test('a tilted plank is narrower from above, and never moves from its spot', () => {
    const edge = tumbleSurfaceAt(PLANK, 33) // just inside the window
    if (edge.standable) assert.ok(edge.width < TUMBLING_PLANK.length)
    for (let f = 0; f < 480; f += 7) {
        const s = tumbleSurfaceAt(PLANK, f)
        assert.equal(s.y, 300)
        assert.ok(Math.abs(s.x + s.width / 2 - 1000) < 1e-9)
    }
})

test('phase and direction shift and reverse the turn', () => {
    assert.equal(tumbleSurfaceAt({ ...PLANK, phase: 0.25 }, 0).standable, false)
    assert.equal(tumbleAngleAt({ ...PLANK, direction: -1 }, 120), -tumbleAngleAt(PLANK, 120))
})

test('stepping follows the surface and the phase keeps running', () => {
    const state = createTumbleState(PLANK)
    for (let i = 0; i < 300; i++) stepTumble(state)
    assert.equal(state.frame, 300)
    const expected = tumbleSurfaceAt(PLANK, 300)
    assert.deepEqual({ x: state.x, y: state.y, width: state.width, standable: state.standable }, expected)
})
