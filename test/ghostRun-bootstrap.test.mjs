import assert from 'node:assert/strict'
import test from 'node:test'

test('ghostRun-bootstrap puts the store on globalThis.ghostRunStore', async () => {
    delete globalThis.ghostRunStore
    await import('../js/ghostRun-bootstrap.mjs')
    const store = globalThis.ghostRunStore
    assert.ok(store)
    assert.equal(typeof store.save, 'function')
    assert.equal(typeof store.personalBest, 'function')
    assert.equal(store.save(1, 1234), true)
    assert.equal(store.personalBest(1), 1234)
})
