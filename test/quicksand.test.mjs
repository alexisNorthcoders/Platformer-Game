import assert from 'node:assert/strict'
import test from 'node:test'
import { SINK_SPEED, SUBMERGE_MARGIN, isSubmerged, sinkFloor, sinkStep, touchesSand } from '../js/quicksand.mjs'
import { resetPlayerForNewLevelRun } from '../js/sessionReset.mjs'

const SAND = { top: 496 }
const HITBOX_HEIGHT = 53

test('touchesSand is false above the surface and true at and below it', () => {
    assert.equal(touchesSand(495.9, SAND), false)
    assert.equal(touchesSand(496, SAND), true)
    assert.equal(touchesSand(520, SAND), true)
})

test('touchesSand is false on a level with no sand', () => {
    assert.equal(touchesSand(9999, undefined), false)
})

test('sinkStep moves down by exactly the sink speed', () => {
    assert.equal(sinkStep(100, SINK_SPEED), 100 + SINK_SPEED)
    assert.equal(sinkStep(100), 100 + SINK_SPEED)
})

test('isSubmerged is false until the hitbox top reaches sand.top + margin', () => {
    assert.equal(isSubmerged(SAND.top + SUBMERGE_MARGIN - 0.1, SAND), false)
    assert.equal(isSubmerged(SAND.top + SUBMERGE_MARGIN, SAND), true)
    assert.equal(isSubmerged(SAND.top + 100, SAND), true)
})

test('the sink from first touch to submerged takes about 1.5s at 60fps', () => {
    let hitboxTop = SAND.top - HITBOX_HEIGHT
    let frames = 0
    while (!isSubmerged(hitboxTop, SAND)) {
        hitboxTop = sinkStep(hitboxTop)
        frames++
    }
    assert.ok(frames >= 85 && frames <= 95, `took ${frames} frames`)
})

test('sinkFloor returns the Quicksand, Water, Thicket or Lava floor', () => {
    for (const key of ['sand', 'water', 'grass', 'lava']) {
        assert.deepEqual(sinkFloor({ [key]: SAND }), SAND)
    }
})

test('sinkFloor is null for Cloud Bank, Spike Ditches, no floor and no level', () => {
    assert.equal(sinkFloor({ cloudBank: { top: 496 } }), null)
    assert.equal(sinkFloor({ spikes: { top: 496 } }), null)
    assert.equal(sinkFloor({}), null)
    assert.equal(sinkFloor(undefined), null)
})

for (const key of ['sand', 'water', 'grass', 'lava']) {
    test(`the ${key} floor catches the King at its top and he sinks out in about 1.5s`, () => {
        const floor = sinkFloor({ [key]: SAND })
        assert.equal(touchesSand(495.9, floor), false)
        assert.equal(touchesSand(496, floor), true)
        let hitboxTop = floor.top - HITBOX_HEIGHT
        let frames = 0
        while (!isSubmerged(hitboxTop, floor)) {
            hitboxTop = sinkStep(hitboxTop)
            frames++
        }
        assert.ok(frames >= 85 && frames <= 95, `took ${frames} frames`)
    })
}

test('session reset clears sinking', () => {
    const player = { velocity: {}, sinking: true, sinkLockedInput: true }
    resetPlayerForNewLevelRun(player)
    assert.equal(player.sinking, false)
    assert.equal(player.sinkLockedInput, false)
})
