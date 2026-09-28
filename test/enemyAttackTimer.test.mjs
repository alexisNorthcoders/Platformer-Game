import assert from 'node:assert/strict'
import test from 'node:test'
import {
    ATTACK_MIN_MS,
    ATTACK_SPREAD_MS,
    ATTACK_RETRY_MIN_MS,
    ATTACK_RETRY_SPREAD_MS,
    attackRetryAt,
    nextAttackAt,
} from '../js/enemyAttackTimer.mjs'

test('nextAttackAt: rng 0 gives the minimum gap', () => {
    assert.equal(nextAttackAt(1000, 0), 1000 + ATTACK_MIN_MS)
})

test('nextAttackAt: rng near 1 approaches min + spread', () => {
    const t = nextAttackAt(1000, 0.999999)
    assert.ok(t < 1000 + ATTACK_MIN_MS + ATTACK_SPREAD_MS)
    assert.ok(t > 1000 + ATTACK_MIN_MS + ATTACK_SPREAD_MS - 1)
})

test('nextAttackAt: different rolls give different times', () => {
    assert.notEqual(nextAttackAt(0, 0.2), nextAttackAt(0, 0.7))
})

test('nextAttackAt: average gap stays close to the old 3 s', () => {
    const mean = nextAttackAt(0, 0.5)
    assert.ok(Math.abs(mean - 3000) <= 500)
})

test('attackRetryAt: bounds', () => {
    assert.equal(attackRetryAt(500, 0), 500 + ATTACK_RETRY_MIN_MS)
    assert.ok(attackRetryAt(500, 0.999999) < 500 + ATTACK_RETRY_MIN_MS + ATTACK_RETRY_SPREAD_MS)
})
