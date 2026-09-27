import assert from 'node:assert/strict'
import test from 'node:test'
import { canEnterDoor, isHitboxAtDoor } from '../js/doorEntry.mjs'

// Door sprites are 2x scaled, so the enter zone spans 2 * width by 2 * height.
const DOOR = { position: { x: 100, y: 200 }, width: 46, height: 56 }
const hitboxAt = (x, y) => ({ position: { x, y }, width: 20, height: 30 })

test('hitbox fully inside the door zone is at the door', () => {
    assert.equal(isHitboxAtDoor(hitboxAt(120, 220), DOOR), true)
})

test('hitbox touching the door zone edges is still at the door', () => {
    assert.equal(isHitboxAtDoor(hitboxAt(100, 200), DOOR), true)
    assert.equal(isHitboxAtDoor(hitboxAt(100 + 92 - 20, 200 + 112), DOOR), true)
    assert.equal(isHitboxAtDoor(hitboxAt(120, 200 - 30), DOOR), true)
})

test('hitbox poking out left or right of the door zone is not at the door', () => {
    assert.equal(isHitboxAtDoor(hitboxAt(99, 220), DOOR), false)
    assert.equal(isHitboxAtDoor(hitboxAt(100 + 92 - 19, 220), DOOR), false)
})

test('hitbox above or below the door zone is not at the door', () => {
    assert.equal(isHitboxAtDoor(hitboxAt(120, 200 - 31), DOOR), false)
    assert.equal(isHitboxAtDoor(hitboxAt(120, 200 + 113), DOOR), false)
})

test('canEnterDoor is true only when at a door and the door is open', () => {
    const hitbox = hitboxAt(120, 220)
    assert.equal(canEnterDoor({ hitbox, doors: [DOOR], doorClosed: false }), true)
    assert.equal(canEnterDoor({ hitbox, doors: [DOOR], doorClosed: true }), false)
})

test('canEnterDoor is false away from every door, even when open', () => {
    const hitbox = hitboxAt(500, 220)
    assert.equal(canEnterDoor({ hitbox, doors: [DOOR], doorClosed: false }), false)
})

test('canEnterDoor is false when the level has no doors', () => {
    assert.equal(canEnterDoor({ hitbox: hitboxAt(120, 220), doors: [], doorClosed: false }), false)
})

test('canEnterDoor checks every door, not just the first', () => {
    const farDoor = { position: { x: 800, y: 200 }, width: 46, height: 56 }
    const hitbox = hitboxAt(120, 220)
    assert.equal(canEnterDoor({ hitbox, doors: [farDoor, DOOR], doorClosed: false }), true)
})
