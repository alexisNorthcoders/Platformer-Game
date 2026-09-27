import assert from 'node:assert/strict'
import test from 'node:test'
import { createTouchControls, syncHeldToKeys } from '../js/touchControls.mjs'

const NONE = { left: false, right: false, jump: false, attack: false }

test('nothing is held before any pointer goes down', () => {
    assert.deepEqual(createTouchControls().held(), NONE)
})

test('pressing the left or right half of the movement zone holds that direction', () => {
    const tc = createTouchControls()
    assert.deepEqual(tc.pointerDown({ pointerId: 1, zone: 'move', x: 0.2 }), { ...NONE, left: true })
    assert.deepEqual(tc.pointerUp({ pointerId: 1 }), NONE)
    assert.deepEqual(tc.pointerDown({ pointerId: 2, zone: 'move', x: 0.8 }), { ...NONE, right: true })
})

test('sliding across the movement zone switches direction without lifting', () => {
    const tc = createTouchControls()
    tc.pointerDown({ pointerId: 1, zone: 'move', x: 0.1 })
    assert.deepEqual(tc.pointerMove({ pointerId: 1, x: 0.9 }), { ...NONE, right: true })
    assert.deepEqual(tc.pointerMove({ pointerId: 1, x: 0.3 }), { ...NONE, left: true })
})

test('sliding past the edges of the movement zone keeps the nearest direction', () => {
    const tc = createTouchControls()
    tc.pointerDown({ pointerId: 1, zone: 'move', x: 0.6 })
    assert.deepEqual(tc.pointerMove({ pointerId: 1, x: 1.7 }), { ...NONE, right: true })
    assert.deepEqual(tc.pointerMove({ pointerId: 1, x: -0.4 }), { ...NONE, left: true })
})

test('jump and attack buttons hold their key while pressed', () => {
    const tc = createTouchControls()
    assert.deepEqual(tc.pointerDown({ pointerId: 1, zone: 'jump' }), { ...NONE, jump: true })
    assert.deepEqual(tc.pointerDown({ pointerId: 2, zone: 'attack' }), { ...NONE, jump: true, attack: true })
})

test('moving a button pointer does not change what it holds', () => {
    const tc = createTouchControls()
    tc.pointerDown({ pointerId: 1, zone: 'jump' })
    assert.deepEqual(tc.pointerMove({ pointerId: 1, x: 0.1 }), { ...NONE, jump: true })
})

test('multi-touch: hold right and tap jump, tracked independently', () => {
    const tc = createTouchControls()
    tc.pointerDown({ pointerId: 7, zone: 'move', x: 0.9 })
    assert.deepEqual(tc.pointerDown({ pointerId: 8, zone: 'jump' }), { ...NONE, right: true, jump: true })
    assert.deepEqual(tc.pointerUp({ pointerId: 8 }), { ...NONE, right: true })
    assert.deepEqual(tc.pointerDown({ pointerId: 9, zone: 'attack' }), { ...NONE, right: true, attack: true })
})

test('releasing a pointer clears only the keys that pointer held', () => {
    const tc = createTouchControls()
    tc.pointerDown({ pointerId: 1, zone: 'move', x: 0.2 })
    tc.pointerDown({ pointerId: 2, zone: 'jump' })
    tc.pointerDown({ pointerId: 3, zone: 'attack' })
    assert.deepEqual(tc.pointerUp({ pointerId: 1 }), { ...NONE, jump: true, attack: true })
    assert.deepEqual(tc.pointerUp({ pointerId: 3 }), { ...NONE, jump: true })
})

test('pointercancel clears only the cancelled pointer', () => {
    const tc = createTouchControls()
    tc.pointerDown({ pointerId: 1, zone: 'move', x: 0.9 })
    tc.pointerDown({ pointerId: 2, zone: 'attack' })
    assert.deepEqual(tc.pointerCancel({ pointerId: 1 }), { ...NONE, attack: true })
    assert.deepEqual(tc.pointerCancel({ pointerId: 2 }), NONE)
})

test('a key stays held while another pointer still holds it', () => {
    const tc = createTouchControls()
    tc.pointerDown({ pointerId: 1, zone: 'attack' })
    tc.pointerDown({ pointerId: 2, zone: 'attack' })
    assert.deepEqual(tc.pointerUp({ pointerId: 1 }), { ...NONE, attack: true })
})

test('reset releases everything, and pointers still down stay ignored until lifted', () => {
    const tc = createTouchControls()
    tc.pointerDown({ pointerId: 1, zone: 'move', x: 0.9 })
    tc.pointerDown({ pointerId: 2, zone: 'jump' })
    assert.deepEqual(tc.reset(), NONE)
    assert.deepEqual(tc.pointerMove({ pointerId: 1, x: 0.1 }), NONE)
    assert.deepEqual(tc.pointerUp({ pointerId: 2 }), NONE)
    assert.deepEqual(tc.pointerDown({ pointerId: 3, zone: 'jump' }), { ...NONE, jump: true })
})

test('events for unknown pointers or zones are ignored', () => {
    const tc = createTouchControls()
    assert.deepEqual(tc.pointerUp({ pointerId: 42 }), NONE)
    assert.deepEqual(tc.pointerMove({ pointerId: 42, x: 0.9 }), NONE)
    assert.deepEqual(tc.pointerDown({ pointerId: 1, zone: 'nope' }), NONE)
})

test('held() returns a copy the caller cannot mutate', () => {
    const tc = createTouchControls()
    tc.held().left = true
    assert.deepEqual(tc.held(), NONE)
})

test('syncHeldToKeys writes only the keys whose held state changed', () => {
    const keys = { a: { pressed: false }, d: { pressed: true }, w: { pressed: false }, space: { pressed: false } }
    // d was pressed by the keyboard; touch never held right, so it is left alone.
    syncHeldToKeys(keys, NONE, { ...NONE, left: true, jump: true })
    assert.deepEqual(keys, { a: { pressed: true }, d: { pressed: true }, w: { pressed: true }, space: { pressed: false } })
    syncHeldToKeys(keys, { ...NONE, left: true, jump: true }, { ...NONE, attack: true })
    assert.deepEqual(keys, { a: { pressed: false }, d: { pressed: true }, w: { pressed: false }, space: { pressed: true } })
})
