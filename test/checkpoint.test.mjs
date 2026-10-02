import assert from 'node:assert/strict'
import test from 'node:test'
import { isReached, respawnPointAfter } from '../js/checkpoint.mjs'

const START = { x: 100, y: 300 }
const CHECKPOINTS = [{ x: 1200, y: 230 }, { x: 3000, y: 100 }, { x: 5000, y: 170 }]

test('before any checkpoint the King respawns at the start', () => {
    assert.equal(respawnPointAfter(CHECKPOINTS, START, 800), START)
})

test('passing checkpoints moves the respawn point to the furthest one reached', () => {
    assert.equal(respawnPointAfter(CHECKPOINTS, START, 1200), CHECKPOINTS[0])
    assert.equal(respawnPointAfter(CHECKPOINTS, START, 4000), CHECKPOINTS[1])
})

test('walking back never moves the respawn point back', () => {
    assert.equal(respawnPointAfter(CHECKPOINTS, CHECKPOINTS[1], 1500), CHECKPOINTS[1])
})

test('a level without checkpoints keeps the start', () => {
    assert.equal(respawnPointAfter(undefined, START, 9000), START)
})

test('checkpoints at or behind the respawn point are reached', () => {
    assert.equal(isReached(CHECKPOINTS[0], CHECKPOINTS[1]), true)
    assert.equal(isReached(CHECKPOINTS[1], CHECKPOINTS[1]), true)
    assert.equal(isReached(CHECKPOINTS[2], CHECKPOINTS[1]), false)
})

// Tower Level: Checkpoints count by height (smaller y is higher).
const TOWER_START = { x: 480, y: 7000 }
const TOWER = [{ x: 400, y: 6400 }, { x: 560, y: 5600 }, { x: 300, y: 4800 }]

test('tower: a Checkpoint is reached standing at or above it, near its x', () => {
    assert.equal(respawnPointAfter(TOWER, TOWER_START, 0, { x: 420, y: 6400 }), TOWER[0])
    assert.equal(respawnPointAfter(TOWER, TOWER_START, 0, { x: 420, y: 6300 }), TOWER[0])
    assert.equal(respawnPointAfter(TOWER, TOWER_START, 0, { x: 420, y: 6600 }), TOWER_START)
    assert.equal(respawnPointAfter(TOWER, TOWER_START, 0, { x: 900, y: 6300 }), TOWER_START, 'too far sideways')
})

test('tower: a higher Checkpoint replaces a lower one', () => {
    assert.equal(respawnPointAfter(TOWER, TOWER[0], 0, { x: 560, y: 5500 }), TOWER[1])
})

test('tower: a lower Checkpoint never replaces a higher one', () => {
    assert.equal(respawnPointAfter(TOWER, TOWER[1], 0, { x: 400, y: 6400 }), TOWER[1])
})

test('tower: a Checkpoint is reached when it is no higher than the respawn point', () => {
    assert.equal(isReached(TOWER[0], TOWER[1], true), true)
    assert.equal(isReached(TOWER[1], TOWER[1], true), true)
    assert.equal(isReached(TOWER[2], TOWER[1], true), false)
})
