import assert from 'node:assert/strict'
import test from 'node:test'
import {
    cannotTakeContactDamage,
    contactKnockbackVelocityX,
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
