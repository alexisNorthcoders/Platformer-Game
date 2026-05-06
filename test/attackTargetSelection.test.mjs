/**
 * Regression (#29): Goblin King must be in the player attack target list whenever
 * it exists as enemyKing — the old bug had contact damage from the king but no
 * hammer hits. This tests the selection helper, not the canvas loop.
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { collectAttackableEnemiesForPlayerAttack } from '../js/attackTargetSelection.mjs'

test('player attack targets include enemyKing alongside regular enemies', () => {
    const pig = { kind: 'pig' }
    const king = { kind: 'king' }
    const targets = collectAttackableEnemiesForPlayerAttack([pig], [king])
    assert.ok(targets.includes(pig))
    assert.ok(
        targets.includes(king),
        'enemyKing entries must be attackable when present (regression #29)'
    )
})

test('king-only level: attack targets still include the king', () => {
    const king = { kind: 'king' }
    const targets = collectAttackableEnemiesForPlayerAttack([], [king])
    assert.deepEqual(targets, [king])
})
