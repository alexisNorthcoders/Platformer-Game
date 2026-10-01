import assert from 'node:assert/strict'
import test from 'node:test'
import {
    cannotTakeContactDamage,
    contactKnockbackVelocityX,
    findSquishedPigs,
    isSquish,
    rectHitboxesOverlap,
} from '../js/contactDamageHelpers.mjs'

test('rectHitboxesOverlap: separated on x', () => {
    const a = { position: { x: 0, y: 0 }, width: 10, height: 10 }
    const b = { position: { x: 20, y: 0 }, width: 10, height: 10 }
    assert.equal(rectHitboxesOverlap(a, b), false)
})

test('rectHitboxesOverlap: touching edges counts as overlap (inclusive)', () => {
    const a = { position: { x: 0, y: 0 }, width: 10, height: 10 }
    const b = { position: { x: 10, y: 0 }, width: 10, height: 10 }
    assert.equal(rectHitboxesOverlap(a, b), true)
})

test('rectHitboxesOverlap: full overlap', () => {
    const a = { position: { x: 5, y: 5 }, width: 20, height: 20 }
    const b = { position: { x: 10, y: 10 }, width: 5, height: 5 }
    assert.equal(rectHitboxesOverlap(a, b), true)
})

test('cannotTakeContactDamage: true while hitCooldown (no repeated damage)', () => {
    assert.equal(cannotTakeContactDamage({ dead: false, hitCooldown: true }), true)
})

test('cannotTakeContactDamage: true when dead', () => {
    assert.equal(cannotTakeContactDamage({ dead: true, hitCooldown: false }), true)
})

test('cannotTakeContactDamage: false when alive and not on cooldown', () => {
    assert.equal(cannotTakeContactDamage({ dead: false, hitCooldown: false }), false)
})

test('contactKnockbackVelocityX: pushes left when player center is left of enemy', () => {
    const playerHitbox = { position: { x: 0, y: 0 }, width: 10, height: 10 }
    const enemyHitbox = { position: { x: 100, y: 0 }, width: 10, height: 10 }
    assert.equal(contactKnockbackVelocityX(playerHitbox, enemyHitbox, 10), -10)
})

test('contactKnockbackVelocityX: pushes right when player center is right of enemy', () => {
    const playerHitbox = { position: { x: 200, y: 0 }, width: 10, height: 10 }
    const enemyHitbox = { position: { x: 0, y: 0 }, width: 10, height: 10 }
    assert.equal(contactKnockbackVelocityX(playerHitbox, enemyHitbox, 10), 10)
})

test('contactKnockbackVelocityX: aligned centers picks non-negative branch (>= enemy)', () => {
    const playerHitbox = { position: { x: 0, y: 0 }, width: 10, height: 10 }
    const enemyHitbox = { position: { x: 0, y: 0 }, width: 10, height: 10 }
    assert.equal(contactKnockbackVelocityX(playerHitbox, enemyHitbox, 7), 7)
})

const box = (x, y, w = 20, h = 20) => ({ position: { x, y }, width: w, height: h })
const pigAt = (y, extra = {}) => ({ loaded: true, hitpoints: 2, opacity: 1, hitbox: box(0, y), ...extra })

test('isSquish: true when falling onto a Pig whose top was under last frame\'s feet', () => {
    // feet now 105, last frame 100 (vy 5); Pig top 100
    assert.equal(isSquish(box(0, 85), 5, box(0, 100)), true)
})

test('isSquish: true within the tolerance', () => {
    // last frame's feet 104, 4px below the Pig's top
    assert.equal(isSquish(box(0, 89), 5, box(0, 100)), true)
})

test('isSquish: false when moving up, even with overlap', () => {
    assert.equal(isSquish(box(0, 85), -5, box(0, 100)), false)
    assert.equal(isSquish(box(0, 85), 0, box(0, 100)), false)
})

test('isSquish: false from the side (feet well below the Pig top last frame)', () => {
    assert.equal(isSquish(box(0, 95), 1, box(10, 100)), false)
})

test('isSquish: false with no overlap', () => {
    assert.equal(isSquish(box(100, 85), 5, box(0, 100)), false)
})

test('findSquishedPigs: returns every Pig squished at once', () => {
    const pigs = [pigAt(100), pigAt(100)]
    assert.equal(findSquishedPigs(box(0, 85), 5, pigs).length, 2)
})

test('findSquishedPigs: skips dead, fading and unloaded Pigs', () => {
    const pigs = [pigAt(100, { hitpoints: 0 }), pigAt(100, { opacity: 0.5 }), pigAt(100, { loaded: false })]
    assert.deepEqual(findSquishedPigs(box(0, 85), 5, pigs), [])
})

test('findSquishedPigs: nothing for an empty or missing list', () => {
    assert.deepEqual(findSquishedPigs(box(0, 85), 5, []), [])
    assert.deepEqual(findSquishedPigs(box(0, 85), 5, undefined), [])
})
