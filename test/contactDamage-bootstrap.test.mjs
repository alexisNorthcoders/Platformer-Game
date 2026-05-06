/**
 * Guard: Player.checkEnemyHitCollision expects ContactDamageHelpers.findEnemiesHitByPlayerHammer
 * after contactDamage-bootstrap.mjs runs — not a stray global-only script (#29 review).
 */

import assert from 'node:assert/strict'
import test from 'node:test'

test('contactDamage-bootstrap wires hammer target helpers onto ContactDamageHelpers', async () => {
    await import('../js/contactDamage-bootstrap.mjs')
    const H = globalThis.ContactDamageHelpers
    assert.ok(H, 'bootstrap must set globalThis.ContactDamageHelpers')
    assert.equal(typeof H.rectHitboxesOverlap, 'function')
    assert.equal(typeof H.collectAttackableEnemiesForPlayerAttack, 'function')
    assert.equal(typeof H.findEnemiesHitByPlayerHammer, 'function')
})
