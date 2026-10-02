import assert from 'node:assert/strict'
import test from 'node:test'
import { cameraFollow, isLongFall } from '../js/tower.mjs'

test('isLongFall: false up to a screen below the last footing, true beyond', () => {
    assert.equal(isLongFall(1000, 1000, 576), false)
    assert.equal(isLongFall(1000, 1576, 576), false)
    assert.equal(isLongFall(1000, 1577, 576), true)
    assert.equal(isLongFall(1000, 800, 576), false, 'above the footing is not a fall')
})

const VIEW = { w: 1024, h: 576 }

test('cameraFollow: a 9-row map never scrolls vertically', () => {
    assert.equal(cameraFollow({ x: 500, y: 300 }, VIEW, { w: 3200, h: 576 }).y, 0)
    assert.equal(cameraFollow({ x: 500, y: 9999 }, VIEW, { w: 3200, h: 576 }).y, 0)
})

test('cameraFollow: x is centred and clamped as before', () => {
    const map = { w: 3200, h: 576 }
    assert.equal(cameraFollow({ x: 100, y: 0 }, VIEW, map).x, 0)
    assert.equal(cameraFollow({ x: 2000, y: 0 }, VIEW, map).x, 1488)
    assert.equal(cameraFollow({ x: 3100, y: 0 }, VIEW, map).x, 2176)
})

test('cameraFollow: a tower is clamped at both ends and keeps the King about 60% down', () => {
    const map = { w: 1024, h: 7680 }
    assert.equal(cameraFollow({ x: 500, y: 100 }, VIEW, map).y, 0)
    assert.equal(cameraFollow({ x: 500, y: 7600 }, VIEW, map).y, 7680 - 576)
    assert.equal(cameraFollow({ x: 500, y: 3000 }, VIEW, map).y, Math.round(3000 - 576 * 0.6))
    assert.equal(cameraFollow({ x: 500, y: 3000 }, VIEW, map).x, 0)
})

test('cameraFollow: whole pixels', () => {
    const cam = cameraFollow({ x: 500.5, y: 3000.7 }, VIEW, { w: 1024, h: 7680 })
    assert.ok(Number.isInteger(cam.x) && Number.isInteger(cam.y))
})
