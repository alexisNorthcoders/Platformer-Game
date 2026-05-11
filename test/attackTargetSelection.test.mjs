/**
 * Regression (#29): Goblin King must be in hammer collision target set — the old bug
 * had contact damage from the king but swings only iterated `enemies`, not enemyKing.
 * Tests exercise findEnemiesHitByPlayerHammer (same overlap rules as Player.checkEnemyHitCollision).
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import {
    collectAttackableEnemiesForPlayerAttack,
    findEnemiesHitByPlayerHammer,
} from '../js/attackTargetSelection.mjs'

const ATTACK_BOX_RIGHT = { position: { x: 100, y: 100 }, width: 65, height: 75 }
const ATTACK_BOX_LEFT = { position: { x: 80, y: 100 }, width: 65, height: 75 }

const KING_HITBOX = { position: { x: 124, y: 130 }, width: 38, height: 28 }

test('collectAttackable includes enemyKing alongside regular enemies', () => {
    const pig = { kind: 'pig' }
    const king = { kind: 'king' }
    const targets = collectAttackableEnemiesForPlayerAttack([pig], [king])
    assert.ok(targets.includes(pig))
    assert.ok(targets.includes(king))
})

test('king-only level: collectAttackable returns the king', () => {
    const king = { kind: 'king' }
    assert.deepEqual(collectAttackableEnemiesForPlayerAttack([], [king]), [king])
})

test('hammer hit detection includes Goblin King when only enemyKing is populated (#29)', () => {
    const hits = []
    const king = {
        hitbox: KING_HITBOX,
        hit: () => hits.push('king'),
    }
    const found = findEnemiesHitByPlayerHammer({
        lastDirection: 'right',
        attackHitboxRight: ATTACK_BOX_RIGHT,
        attackHitboxLeft: ATTACK_BOX_LEFT,
        enemies: [],
        enemyKing: [king],
    })
    assert.deepEqual(found, [king])
    king.hit()
    assert.deepEqual(hits, ['king'])
})

test('hammer hit detection includes king on left-facing swing when boxes overlap (#29)', () => {
    const king = {
        hitbox: KING_HITBOX,
        hit() {},
    }
    const found = findEnemiesHitByPlayerHammer({
        lastDirection: 'left',
        attackHitboxRight: ATTACK_BOX_RIGHT,
        attackHitboxLeft: ATTACK_BOX_LEFT,
        enemies: [],
        enemyKing: [king],
    })
    assert.ok(
        found.includes(king),
        'enemyKing targets must use the left attack hitbox like Player.checkEnemyHitCollision'
    )
})
