import assert from 'node:assert/strict'
import test from 'node:test'
import { CAMERA_BAND, CAMERA_KING_SHARE, cameraFollow, isLongFall } from '../js/tower.mjs'

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

// A tall map and the camera settled on a King standing at y 3000.
const TOWER = { w: 1024, h: 7680 }
const SETTLED_Y = Math.round(3000 - 576 * CAMERA_KING_SHARE)
const settled = () => cameraFollow({ x: 500, y: 3000, grounded: true }, VIEW, TOWER)

/** Runs the camera over a list of King positions, one a frame; returns each frame's camera. */
function film(kings, cam = settled()) {
    return kings.map(king => (cam = cameraFollow(king, VIEW, TOWER, cam)))
}

/** A jump from y 3000: up 100 px and back down, as the King's -10 jump and 0.5 gravity give. */
function hop() {
    const kings = []
    for (let vy = -10, y = 3000; ; vy += 0.5) {
        y = Math.min(3000, y + vy)
        kings.push({ x: 500, y, grounded: y === 3000 && vy > 0 })
        if (y === 3000 && vy > 0) return kings
    }
}

test('cameraFollow: with no previous camera it snaps to the King', () => {
    assert.equal(settled().y, SETTLED_Y)
})

test('cameraFollow: a hop on the same footing does not move the camera', () => {
    for (const cam of film(hop())) assert.equal(cam.y, SETTLED_Y)
})

test('cameraFollow: landing higher up glides the camera there over several frames, never past it', () => {
    const higher = { x: 500, y: 2900, grounded: true }
    const frames = film(Array(90).fill(higher))
    const goal = Math.round(2900 - 576 * CAMERA_KING_SHARE)
    assert.ok(frames[0].y < SETTLED_Y && frames[0].y > goal, 'moves a part of the way on the first frame')
    for (let i = 1; i < frames.length; i++) {
        assert.ok(frames[i].y <= frames[i - 1].y && frames[i].y >= goal, 'eases one way, no overshoot')
    }
    assert.equal(frames.at(-1).y, goal)
})

test('cameraFollow: a King in the air past the band edges is held at the edge', () => {
    const cam = settled()
    const falling = cameraFollow({ x: 500, y: 3000 + 576, grounded: false }, VIEW, TOWER, cam)
    assert.equal(3000 + 576 - falling.y, Math.round(576 * CAMERA_BAND.bottom), 'a fall is followed at the bottom edge')
    const rising = cameraFollow({ x: 500, y: 3000 - 576, grounded: false }, VIEW, TOWER, cam)
    assert.equal(3000 - 576 - rising.y, Math.round(576 * CAMERA_BAND.top), 'a rise is followed at the top edge')
})

test('cameraFollow: the following camera stays in whole pixels and inside the map', () => {
    for (const cam of film([{ x: 500.5, y: 2950.3, grounded: true }, { x: 500, y: 100, grounded: false }, { x: 500, y: 7600, grounded: true }])) {
        assert.ok(Number.isInteger(cam.y) && cam.y >= 0 && cam.y <= TOWER.h - VIEW.h)
    }
})
