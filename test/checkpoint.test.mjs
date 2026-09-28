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
