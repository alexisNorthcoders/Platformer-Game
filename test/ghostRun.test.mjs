import assert from 'node:assert/strict'
import test from 'node:test'
import { createGhostRunStore, levelFingerprint } from '../js/ghostRun.mjs'

const FP = 'aaaa0001'

function memoryStorage() {
    const data = new Map()
    return { data, getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) }
}

test('a first save becomes the Personal Best and is a record', () => {
    const store = createGhostRunStore(memoryStorage())
    assert.equal(store.personalBest(1, FP), null)
    assert.equal(store.save(1, 5000, FP), true)
    assert.equal(store.personalBest(1, FP), 5000)
})

test('a slower save leaves the best and is not a record', () => {
    const store = createGhostRunStore(memoryStorage())
    store.save(1, 5000, FP)
    assert.equal(store.save(1, 6000, FP), false)
    assert.equal(store.save(1, 5000, FP), false)
    assert.equal(store.personalBest(1, FP), 5000)
})

test('a faster save replaces the best and is a record', () => {
    const store = createGhostRunStore(memoryStorage())
    store.save(1, 5000, FP)
    assert.equal(store.save(1, 4000, FP), true)
    assert.equal(store.personalBest(1, FP), 4000)
})

test('levels keep separate bests under namespaced keys, surviving a new store', () => {
    const storage = memoryStorage()
    const store = createGhostRunStore(storage)
    store.save(1, 5000, FP)
    store.save(2, 9000, FP)
    assert.equal(store.personalBest(1, FP), 5000)
    assert.equal(store.personalBest(2, FP), 9000)
    assert.equal(storage.data.size, 2)
    assert.ok([...storage.data.keys()].every(k => k.startsWith('kings-and-pigs:')))
    assert.equal(createGhostRunStore(storage).personalBest(2, FP), 9000)
})

test('extra fields are stored and read back; corrupt records read as none', () => {
    const storage = memoryStorage()
    const store = createGhostRunStore(storage)
    store.save(3, 7000, FP, { frames: [1, 2] })
    assert.deepEqual(store.get(3, FP), { frames: [1, 2], fingerprint: FP, timeMs: 7000 })
    storage.setItem('kings-and-pigs:ghost-run:level-4', 'nonsense')
    assert.equal(store.personalBest(4, FP), null)
    assert.equal(store.save(4, 100, FP), true)
})

test('a zero, negative or non-finite time is never saved', () => {
    const store = createGhostRunStore(memoryStorage())
    for (const bad of [0, -5, NaN, Infinity, undefined]) assert.equal(store.save(1, bad, FP), false)
    assert.equal(store.personalBest(1, FP), null)
})

test('a failed write is not cached or reported as a record', () => {
    const storage = { getItem: () => null, setItem: () => { throw new Error('full') } }
    const store = createGhostRunStore(storage)
    assert.equal(store.save(1, 5000, FP), false)
    assert.equal(store.personalBest(1, FP), null)
})

const assets = () => ({
    collisions: [0, 1, 0, 292], boxes: [[10, 20]], platforms: [[30, 40]], door: [[50, 60]],
    enemy: [[70, 80]], enemyKing: [], enemyMatch: [], cannon: [], movingPlatforms: [{ from: { x: 1, y: 2 } }],
    helixPlatforms: [], tumblingPlanks: [], crumblingShelves: [], platforms_2: [0],
})
const config = () => ({ playerPosition: { x: 50, y: 200 }, checkpoints: [{ x: 1, y: 2 }] })

test('the fingerprint is stable and changes with anything a run can touch', () => {
    const base = levelFingerprint(assets(), config())
    assert.equal(levelFingerprint(assets(), config()), base)
    const moved = [
        a => { a.enemy[0][0] += 2 },
        a => { a.collisions[1] = 2 },
        a => { a.platforms_2[0] = 5 },
        a => { a.boxes[0][1] += 2 },
        a => { a.platforms[0][0] += 2 },
        a => { a.movingPlatforms[0].from.x += 2 },
        a => { a.door[0][0] += 2 },
    ]
    for (const edit of moved) {
        const a = assets()
        edit(a)
        assert.notEqual(levelFingerprint(a, config()), base)
    }
    const c1 = config(); c1.checkpoints[0].x += 1
    assert.notEqual(levelFingerprint(assets(), c1), base)
    const c2 = config(); c2.playerPosition.x += 1
    assert.notEqual(levelFingerprint(assets(), c2), base)
})

test('art, decoration and Weather leave the fingerprint alone', () => {
    const base = levelFingerprint(assets(), config())
    const a = { ...assets(), diamonds: [[1, 1]], puddles: [{ x: 1 }], levelWidth: 99 }
    const c = { ...config(), weather: 'rain', backdrop: { sky: 'x.png' }, enemyTint: 'red' }
    assert.equal(levelFingerprint(a, c), base)
})

test('a best from another layout, or saved without a fingerprint, loads as nothing', () => {
    const storage = memoryStorage()
    storage.setItem('kings-and-pigs:ghost-run:level-1', JSON.stringify({ timeMs: 3000 }))
    const store = createGhostRunStore(storage)
    assert.equal(store.personalBest(1, FP), null)
    assert.equal(store.save(1, 9000, FP), true)
    assert.equal(store.personalBest(1, FP), 9000)
    assert.equal(store.personalBest(1, 'bbbb0002'), null)
    // A stale best is replaced even by a slower clear.
    assert.equal(store.save(1, 12000, 'bbbb0002'), true)
    assert.equal(store.personalBest(1, 'bbbb0002'), 12000)
    assert.equal(store.personalBest(1, FP), null)
})

test('an unknown fingerprint reads and saves as nothing', () => {
    const store = createGhostRunStore(memoryStorage())
    assert.equal(store.save(1, 5000, undefined), false)
    store.save(1, 5000, FP)
    assert.equal(store.personalBest(1, undefined), null)
})
