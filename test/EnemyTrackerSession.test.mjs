import assert from 'node:assert/strict'
import test from 'node:test'
import EnemyTracker from '../js/EnemyTracker.mjs'

test('after resetSession, counters are zero (menu / new run)', () => {
    EnemyTracker.initializeLevel(10)
    EnemyTracker.increaseEnemyCount()
    EnemyTracker.increaseEnemyCount()
    assert.equal(EnemyTracker.getEnemyCount(), 2)
    EnemyTracker.resetSession()
    assert.equal(EnemyTracker.getEnemyCount(), 0)
    EnemyTracker.initializeLevel(4)
    assert.equal(EnemyTracker.isLevelHalfCleared(), false)
})

test('initializeLevel then half-killed pigs opens door threshold', () => {
    EnemyTracker.resetSession()
    EnemyTracker.initializeLevel(4)
    assert.equal(EnemyTracker.isLevelHalfCleared(), false)
    EnemyTracker.increaseEnemyCount()
    EnemyTracker.increaseEnemyCount()
    assert.equal(EnemyTracker.isLevelHalfCleared(), true)
    EnemyTracker.resetSession()
    EnemyTracker.initializeLevel(5)
    assert.equal(EnemyTracker.isLevelHalfCleared(), false)
    EnemyTracker.increaseEnemyCount()
    EnemyTracker.increaseEnemyCount()
    assert.equal(EnemyTracker.isLevelHalfCleared(), false)
    EnemyTracker.increaseEnemyCount()
    assert.equal(EnemyTracker.isLevelHalfCleared(), true)
})

test('simulated menu start then restart-style re-init keeps tracker consistent', () => {
    EnemyTracker.resetSession()
    EnemyTracker.initializeLevel(3)
    assert.equal(EnemyTracker.getEnemyCount(), 0)
    EnemyTracker.increaseEnemyCount()
    assert.equal(EnemyTracker.getEnemyCount(), 1)
    EnemyTracker.resetSession()
    EnemyTracker.initializeLevel(3)
    assert.equal(EnemyTracker.getEnemyCount(), 0)
    assert.equal(EnemyTracker.isLevelHalfCleared(), false)
})

test('switching level count re-baseline (no stale half-cleared from prior level)', () => {
    EnemyTracker.resetSession()
    EnemyTracker.initializeLevel(100)
    for (let i = 0; i < 60; i++) EnemyTracker.increaseEnemyCount()
    assert.equal(EnemyTracker.isLevelHalfCleared(), true)
    EnemyTracker.resetSession()
    EnemyTracker.initializeLevel(2)
    assert.equal(EnemyTracker.isLevelHalfCleared(), false)
})
