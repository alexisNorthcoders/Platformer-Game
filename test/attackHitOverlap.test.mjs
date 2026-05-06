/**
 * Player attack vs enemies uses ContactDamageHelpers.rectHitboxesOverlap on each
 * target hitbox (see Player.checkEnemyHitCollision). These cases mirror king vs pig
 * hitbox sizes from Enemy.updateHitbox configs.
 *
 * Manual check (#28): open a level with an enemyKing layer (e.g. Level 2 in
 * config/levels.js), attack the Goblin King facing left and right, confirm damage.
 * Bump the king to confirm contact damage still applies. Confirm pigs still react to swings.
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { rectHitboxesOverlap } from '../js/contactDamageHelpers.mjs'

const KING_HITBOX = { position: { x: 124, y: 130 }, width: 38, height: 28 }
const PIG_HITBOX = { position: { x: 123, y: 130 }, width: 37, height: 28 }

test('attack rect overlaps Goblin King hitbox (right-facing swing)', () => {
    const attackBox = { position: { x: 100, y: 100 }, width: 65, height: 75 }
    assert.equal(rectHitboxesOverlap(attackBox, KING_HITBOX), true)
})

test('attack rect overlaps Goblin King hitbox (left-facing swing)', () => {
    const attackBox = { position: { x: 80, y: 100 }, width: 65, height: 75 }
    assert.equal(rectHitboxesOverlap(attackBox, KING_HITBOX), true)
})

test('attack rect overlaps pig hitbox (same overlap rule as king)', () => {
    const attackBox = { position: { x: 100, y: 100 }, width: 65, height: 75 }
    assert.equal(rectHitboxesOverlap(attackBox, PIG_HITBOX), true)
})

test('attack rect separated from enemy hitbox does not overlap', () => {
    const attackBox = { position: { x: 0, y: 0 }, width: 65, height: 75 }
    assert.equal(rectHitboxesOverlap(attackBox, KING_HITBOX), false)
})
