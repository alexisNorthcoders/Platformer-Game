import test from 'node:test'
import assert from 'node:assert/strict'
import { openAirLevels, failedChecks } from '../tools/level-checks.mjs'

test('open-air levels are 18-24 and 26, read from the level config', async () => {
    assert.deepEqual(await openAirLevels(), [18, 19, 20, 21, 22, 23, 24, 26])
})

test('failedChecks names each check whose ok is false', () => {
    const report = { level: 26, fall: { ok: true }, rides: { ok: false }, tumbling: { ok: false }, ok: false }
    assert.deepEqual(failedChecks(report), ['rides', 'tumbling'])
    assert.deepEqual(failedChecks({ level: 1, fall: { ok: true }, ok: true }), [])
})
