import assert from 'node:assert/strict'
import test from 'node:test'
import { unlockAudioOnFirstGesture, AUDIO_UNLOCK_EVENTS } from '../js/audioUnlock.mjs'

function fakeTarget() {
    const listeners = new Map()
    return {
        addEventListener(type, fn) { listeners.set(type, fn) },
        removeEventListener(type, fn) { if (listeners.get(type) === fn) listeners.delete(type) },
        fire(type) { return listeners.get(type)?.() },
        listeners,
    }
}

function fakeAudioContext(state = 'suspended', { resumeSucceeds = true } = {}) {
    const ctx = {
        state,
        resumeCalls: 0,
        resume() {
            ctx.resumeCalls++
            if (resumeSucceeds) ctx.state = 'running'
            return Promise.resolve()
        },
    }
    return ctx
}

test('listens for pointer and key gestures', () => {
    assert.ok(AUDIO_UNLOCK_EVENTS.includes('pointerdown'))
    assert.ok(AUDIO_UNLOCK_EVENTS.includes('keydown'))
    const target = fakeTarget()
    unlockAudioOnFirstGesture(target, fakeAudioContext())
    for (const type of AUDIO_UNLOCK_EVENTS) assert.ok(target.listeners.has(type), type)
})

test('first gesture resumes a suspended context and removes all listeners', async () => {
    const target = fakeTarget()
    const ctx = fakeAudioContext()
    unlockAudioOnFirstGesture(target, ctx)
    await target.fire('pointerdown')
    assert.equal(ctx.resumeCalls, 1)
    assert.equal(ctx.state, 'running')
    assert.equal(target.listeners.size, 0)
})

test('keeps listening if resume did not take effect', async () => {
    const target = fakeTarget()
    const ctx = fakeAudioContext('suspended', { resumeSucceeds: false })
    unlockAudioOnFirstGesture(target, ctx)
    await target.fire('keydown')
    assert.equal(ctx.resumeCalls, 1)
    assert.equal(target.listeners.size, AUDIO_UNLOCK_EVENTS.length)
    ctx.state = 'running'
    await target.fire('touchend')
    assert.equal(target.listeners.size, 0)
})

test('does not resume an already running context', async () => {
    const target = fakeTarget()
    const ctx = fakeAudioContext('running')
    unlockAudioOnFirstGesture(target, ctx)
    await target.fire('pointerdown')
    assert.equal(ctx.resumeCalls, 0)
    assert.equal(target.listeners.size, 0)
})

test('a rejected resume does not throw and keeps listening', async () => {
    const target = fakeTarget()
    const ctx = fakeAudioContext()
    ctx.resume = () => { ctx.resumeCalls++; return Promise.reject(new Error('nope')) }
    unlockAudioOnFirstGesture(target, ctx)
    await target.fire('pointerdown')
    assert.equal(ctx.resumeCalls, 1)
    assert.equal(target.listeners.size, AUDIO_UNLOCK_EVENTS.length)
})
