import assert from 'node:assert/strict'
import test from 'node:test'
import { createGhostRunStore } from '../js/ghostRun.mjs'

function memoryStorage() {
    const data = new Map()
    return { data, getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) }
}

test('a first save becomes the Personal Best and is a record', () => {
    const store = createGhostRunStore(memoryStorage())
    assert.equal(store.personalBest(1), null)
    assert.equal(store.save(1, 5000), true)
    assert.equal(store.personalBest(1), 5000)
})

test('a slower save leaves the best and is not a record', () => {
    const store = createGhostRunStore(memoryStorage())
    store.save(1, 5000)
    assert.equal(store.save(1, 6000), false)
    assert.equal(store.save(1, 5000), false)
    assert.equal(store.personalBest(1), 5000)
})

test('a faster save replaces the best and is a record', () => {
    const store = createGhostRunStore(memoryStorage())
    store.save(1, 5000)
    assert.equal(store.save(1, 4000), true)
    assert.equal(store.personalBest(1), 4000)
})

test('levels keep separate bests under namespaced keys, surviving a new store', () => {
    const storage = memoryStorage()
    const store = createGhostRunStore(storage)
    store.save(1, 5000)
    store.save(2, 9000)
    assert.equal(store.personalBest(1), 5000)
    assert.equal(store.personalBest(2), 9000)
    assert.equal(storage.data.size, 2)
    assert.ok([...storage.data.keys()].every(k => k.startsWith('kings-and-pigs:')))
    assert.equal(createGhostRunStore(storage).personalBest(2), 9000)
})

test('extra fields are stored and read back; corrupt records read as none', () => {
    const storage = memoryStorage()
    const store = createGhostRunStore(storage)
    store.save(3, 7000, { frames: [1, 2] })
    assert.deepEqual(store.get(3), { frames: [1, 2], timeMs: 7000 })
    storage.setItem('kings-and-pigs:ghost-run:level-4', 'nonsense')
    assert.equal(store.personalBest(4), null)
    assert.equal(store.save(4, 100), true)
})
