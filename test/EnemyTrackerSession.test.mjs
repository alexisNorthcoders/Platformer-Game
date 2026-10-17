import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import EnemyTracker from '../js/EnemyTracker.mjs'

// LevelProgressKeys is a classic-script const in utils.js: run just its IIFE.
const utilsSource = readFileSync(new URL('../js/utils.js', import.meta.url), 'utf8')
const progressSource = utilsSource.slice(utilsSource.indexOf('const LevelProgressKeys'), utilsSource.indexOf('})()', utilsSource.indexOf('const LevelProgressKeys')) + 4)
const newProgressKeys = () => vm.runInNewContext(`${progressSource}\nLevelProgressKeys`)

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

test('setEnemyCount rolls the session count back (Restart Level)', () => {
    EnemyTracker.resetSession()
    EnemyTracker.initializeLevel(4)
    EnemyTracker.increaseEnemyCount()
    const atLevelStart = EnemyTracker.getEnemyCount()
    EnemyTracker.increaseEnemyCount()
    EnemyTracker.increaseEnemyCount()
    EnemyTracker.setEnemyCount(atLevelStart)
    assert.equal(EnemyTracker.getEnemyCount(), 1)
    EnemyTracker.initializeLevel(4)
    assert.equal(EnemyTracker.isLevelHalfCleared(), false)
    EnemyTracker.resetSession()
})

test('a defeated Box Pig survives a Door and back, and Restart Level clears it (#144)', () => {
    EnemyTracker.resetSession()
    const progress = newProgressKeys()
    EnemyTracker.initializeLevel(4)
    const atLevelStart = EnemyTracker.getEnemyCount()
    // Shattered: the Pig counter up by one, and the spawn marked defeated (Enemy.die)
    EnemyTracker.increaseEnemyCount()
    progress.markEnemyDefeated(17, 'boxPig', 2496, 480)
    // Through a Door and back: the level is entered again, the session stays
    EnemyTracker.initializeLevel(4)
    assert.equal(EnemyTracker.getEnemyCount(), atLevelStart + 1)
    assert.equal(progress.isEnemyDefeated(17, 'boxPig', 2496, 480), true)
    assert.equal(progress.isEnemyDefeated(17, 'pig', 2496, 480), false)
    // Restart Level rolls the Pig count back to the level's entry
    EnemyTracker.setEnemyCount(atLevelStart)
    assert.equal(EnemyTracker.getEnemyCount(), atLevelStart)
    // a new session forgets the defeat
    progress.clearAll()
    assert.equal(progress.isEnemyDefeated(17, 'boxPig', 2496, 480), false)
    EnemyTracker.resetSession()
})
