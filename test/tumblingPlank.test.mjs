import assert from 'node:assert/strict'
import test from 'node:test'
import {
    TUMBLING_PLANK, createTumbleState, landsOnPlank, plankTilt, slideStep, slopeBand, stepTumble, surfaceYAt, tiltAt,
    tumbleAngleAt,
} from '../js/tumblingPlank.mjs'

const PLANK = { center: { x: 1000, y: 300 }, periodFrames: 480 }
const DEG = Math.PI / 180
const HALF = TUMBLING_PLANK.length / 2
/** The frame at which the plank has tilted `deg` degrees (period 480: 0.75 degrees a frame). */
const frameAt = deg => Math.round(deg / 0.75)

test('it turns once every 8 s', () => {
    assert.ok(Math.abs(tumbleAngleAt(PLANK, 480) - 2 * Math.PI) < 1e-9)
})

test('plankTilt: 0 at flat, the same either side of a half turn, never outside (-90, 90]', () => {
    assert.equal(plankTilt(0), 0)
    assert.ok(Math.abs(plankTilt(Math.PI)) < 1e-9)
    assert.ok(Math.abs(plankTilt(30 * DEG) - plankTilt(30 * DEG + Math.PI)) < 1e-9)
    assert.ok(Math.abs(plankTilt(-30 * DEG) + 30 * DEG) < 1e-9)
    for (let a = -10; a < 10; a += 0.037) {
        const t = plankTilt(a)
        assert.ok(t > -Math.PI / 2 && t <= Math.PI / 2, `${a} -> ${t}`)
    }
    assert.ok(Math.abs(plankTilt(Math.PI / 2) - Math.PI / 2) < 1e-9)
    assert.ok(Math.abs(plankTilt(-Math.PI / 2) - Math.PI / 2) < 1e-9)
})

test('slopeBand', () => {
    const bands = [0, 24, 26, 54, 56, 79, 81].map(d => slopeBand(d * DEG))
    assert.deepEqual(bands, ['stand', 'stand', 'slide', 'slide', 'steep', 'steep', 'onEnd'])
    assert.equal(slopeBand(-30 * DEG), 'slide')
})

test('surfaceYAt: the middle at flat, the ends off by half the length times sin, null past the span or on end', () => {
    assert.equal(surfaceYAt(PLANK, 0, 1000), 300)
    assert.equal(surfaceYAt(PLANK, 0, 900), 300)
    assert.equal(surfaceYAt(PLANK, 0, 899), null)
    assert.equal(surfaceYAt(PLANK, 0, 1101), null)
    const frame = Math.round(20 / 0.75)
    const t = tiltAt(PLANK, frame)
    const lowEnd = 1000 + 11 * Math.sin(t) + HALF * Math.cos(t)
    assert.ok(Math.abs(surfaceYAt(PLANK, frame, lowEnd - 0.01) - (300 + HALF * Math.sin(t))) < 1)
    assert.equal(surfaceYAt(PLANK, frame, lowEnd + 1), null)
    assert.equal(surfaceYAt(PLANK, 120, 1000), null) // on end
    assert.equal(surfaceYAt(PLANK, frameAt(85), 1000), null)
})

test('the other face counts: the same line half a turn later', () => {
    assert.ok(Math.abs(surfaceYAt(PLANK, 30, 1050) - surfaceYAt(PLANK, 270, 1050)) < 1e-6)
})

test('landsOnPlank: catches a fast fall onto a 30 degree face', () => {
    const frame = frameAt(30)
    const x = 1000
    const face = surfaceYAt(PLANK, frame, x)
    const hit = landsOnPlank(PLANK, frame, { x, y: face - 10 }, { x, y: face + 5 }) // 15 px/frame
    assert.ok(hit)
    assert.equal(hit.y, face)
    assert.equal(landsOnPlank(PLANK, frame, { x, y: face - 40 }, { x, y: face - 25 }), null)
})

test('landsOnPlank: catches the face rising through still feet as the plank turns', () => {
    const x = 1060 // on the end that is rising (negative tilt) or falling
    let caught = 0
    for (const direction of [1, -1]) {
        const path = { ...PLANK, direction }
        for (let f = 1; f < 300; f++) {
            const before = surfaceYAt(path, f - 1, x), now = surfaceYAt(path, f, x)
            if (before == null || now == null || now >= before) continue // only where the wood is rising
            const feet = { x, y: before + 0.2 } // standing still just under last frame's face... caught only if above it
            assert.ok(landsOnPlank(path, f, { x, y: before }, { x, y: before }), `frame ${f}`)
            assert.equal(landsOnPlank(path, f, feet, feet), null, 'already below: passes through')
            caught++
        }
    }
    assert.ok(caught > 20)
})

test('landsOnPlank: ignores a King below the face or moving up through it', () => {
    const x = 1000, frame = 0
    assert.equal(landsOnPlank(PLANK, frame, { x, y: 330 }, { x, y: 310 }), null)
    assert.equal(landsOnPlank(PLANK, frame, { x, y: 340 }, { x, y: 301 }), null)
    assert.equal(landsOnPlank(PLANK, frameAt(85), { x, y: 200 }, { x, y: 400 }), null) // on end
})

test('slideStep: nothing in Stand; speeds up in Slide; uphill slows but never stops it', () => {
    assert.equal(slideStep(0, 10 * DEG, 0), 0)
    assert.equal(slideStep(3, 20 * DEG, 0), 0)
    const t = 30 * DEG
    assert.ok(slideStep(0, t, 0) > 0)
    assert.ok(slideStep(2, t, 0) > 2)
    const free = slideStep(2, t, 0), braked = slideStep(2, t, -1)
    assert.ok(braked < free)
    // Uphill on a positive tilt is left; on a negative tilt, right.
    assert.equal(slideStep(2, -t, 1), braked)
    assert.equal(slideStep(2, t, 1), free)
    let along = 0
    for (let i = 0; i < 200; i++) along = slideStep(along, 26 * DEG, -1)
    assert.ok(along > 0)
})

test('slideStep: faster in Steep and unaffected by input; capped', () => {
    const slide = slideStep(2, 50 * DEG, 0) - 2
    const steep = slideStep(2, 60 * DEG, 0) - 2
    assert.ok(steep > slide)
    assert.equal(slideStep(2, 60 * DEG, -1), slideStep(2, 60 * DEG, 1))
    assert.equal(slideStep(TUMBLING_PLANK.maxSlide, 70 * DEG, 0), TUMBLING_PLANK.maxSlide)
})

test('stepping follows the tilt and the phase keeps running', () => {
    const state = createTumbleState(PLANK)
    for (let i = 0; i < 300; i++) stepTumble(state)
    assert.equal(state.frame, 300)
    assert.equal(state.tilt, tiltAt(PLANK, 300))
})

/** A King standing still from flat: carried by the wood (his feet are the face's y while inside the span, never below it), sliding by slideStep until he leaves the span. */
function standStill(path, startX, startFrame) {
    let frame = startFrame, x = startX, along = 0
    let left = null
    while (frame < startFrame + 240) {
        frame++
        const tilt = tiltAt(path, frame)
        along = slideStep(along, tilt, 0)
        x += along * Math.cos(tilt) * Math.sign(tilt)
        const y = surfaceYAt(path, frame, x)
        if (y == null) {
            left = { frame, tilt }
            break
        }
    }
    return { left }
}

test('headline: standing still from flat, he slides off the low end before 80 degrees, never below the face', () => {
    for (const direction of [1, -1]) {
        for (const startX of [905, 950, 1000, 1050, 1095]) {
            const path = { ...PLANK, direction }
            const { left } = standStill(path, startX, 0)
            assert.ok(left, `x=${startX} dir=${direction}: still on the plank`)
            assert.ok(Math.abs(left.tilt) < 80 * DEG, `left at ${(left.tilt / DEG).toFixed(1)} degrees`)
        }
    }
})
