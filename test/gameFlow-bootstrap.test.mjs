import assert from 'node:assert/strict'
import test from 'node:test'

test('gameFlow-bootstrap wires session + escape helpers onto globalThis.__gameFlow', async () => {
    delete globalThis.__gameFlow
    await import('../js/gameFlow-bootstrap.mjs')
    const flow = globalThis.__gameFlow
    assert.ok(flow)
    assert.equal(typeof flow.reduceEscapeKey, 'function')
    assert.equal(typeof flow.clearHeldInputKeys, 'function')
    assert.equal(typeof flow.resetPlayerForNewLevelRun, 'function')
})
