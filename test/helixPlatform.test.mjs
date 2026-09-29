import assert from 'node:assert/strict'
import test from 'node:test'
import { HELIX_PLATFORM, createHelixState, helixSurfaceAt, stepHelix } from '../js/helixPlatform.mjs'

const HELIX = { center: { x: 1000, y: 300 }, radius: 180, periodFrames: 480 }

test('the blades span the full radius each side when they point across the view', () => {
    assert.deepEqual(helixSurfaceAt(HELIX, 0), { x: 820, y: 300, width: 360 })
    const half = helixSurfaceAt(HELIX, 240)
    assert.ok(Math.abs(half.x - 820) < 1e-9 && Math.abs(half.width - 360) < 1e-9)
})

test('turned towards the view, only the hub is left to stand on', () => {
    const surface = helixSurfaceAt(HELIX, 120)
    assert.equal(surface.width, HELIX_PLATFORM.hubWidth)
    assert.equal(surface.x, 1000 - HELIX_PLATFORM.hubWidth / 2)
})

test('the span stays centred on the hub as it shrinks', () => {
    for (let frame = 0; frame < 480; frame += 17) {
        const { x, width } = helixSurfaceAt(HELIX, frame)
        assert.ok(Math.abs(x + width / 2 - 1000) < 1e-9)
    }
})

test('a phase of a quarter turn starts the blades at the hub', () => {
    assert.equal(helixSurfaceAt({ ...HELIX, phase: 0.25 }, 0).width, HELIX_PLATFORM.hubWidth)
})

test('stepping moves the state on a frame', () => {
    const state = createHelixState(HELIX)
    stepHelix(state)
    assert.equal(state.frame, 1)
    assert.deepEqual({ x: state.x, y: state.y, width: state.width }, helixSurfaceAt(HELIX, 1))
})
