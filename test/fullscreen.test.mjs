import assert from 'node:assert/strict'
import test from 'node:test'
import { isFullscreen, isFullscreenAvailable, toggleFullscreen } from '../js/fullscreen.mjs'

function fakeDocument({ enabled = true, prefix = '', fullscreenElement = null } = {}) {
    const calls = []
    const documentElement = {}
    const doc = { documentElement, calls }
    if (prefix === 'webkit') {
        doc.webkitFullscreenEnabled = enabled
        doc.webkitFullscreenElement = fullscreenElement
        documentElement.webkitRequestFullscreen = () => { calls.push('request') }
        doc.webkitExitFullscreen = () => { calls.push('exit') }
    } else {
        doc.fullscreenEnabled = enabled
        doc.fullscreenElement = fullscreenElement
        documentElement.requestFullscreen = () => { calls.push('request'); return Promise.resolve() }
        doc.exitFullscreen = () => { calls.push('exit'); return Promise.resolve() }
    }
    return doc
}

test('isFullscreenAvailable: touch device with the Fullscreen API', () => {
    assert.equal(isFullscreenAvailable(fakeDocument(), true), true)
})

test('isFullscreenAvailable: webkit-prefixed API counts', () => {
    assert.equal(isFullscreenAvailable(fakeDocument({ prefix: 'webkit' }), true), true)
})

test('isFullscreenAvailable: prefixed methods without an enabled flag count', () => {
    const doc = fakeDocument({ prefix: 'webkit' })
    delete doc.webkitFullscreenEnabled
    assert.equal(isFullscreenAvailable(doc, true), true)
})

test('isFullscreenAvailable: hidden on desktop', () => {
    assert.equal(isFullscreenAvailable(fakeDocument(), false), false)
})

test('isFullscreenAvailable: hidden where the API is missing or disabled (e.g. iPhone Safari)', () => {
    assert.equal(isFullscreenAvailable({ documentElement: {} }, true), false)
    assert.equal(isFullscreenAvailable(fakeDocument({ enabled: false }), true), false)
})

test('isFullscreen: reflects the (prefixed) fullscreen element', () => {
    assert.equal(isFullscreen(fakeDocument()), false)
    assert.equal(isFullscreen(fakeDocument({ fullscreenElement: {} })), true)
    assert.equal(isFullscreen(fakeDocument({ prefix: 'webkit', fullscreenElement: {} })), true)
})

test('toggleFullscreen: enters on the whole page when not fullscreen', () => {
    const doc = fakeDocument()
    toggleFullscreen(doc)
    assert.deepEqual(doc.calls, ['request'])
})

test('toggleFullscreen: exits when already fullscreen', () => {
    const doc = fakeDocument({ fullscreenElement: {} })
    toggleFullscreen(doc)
    assert.deepEqual(doc.calls, ['exit'])
})

test('toggleFullscreen: uses webkit-prefixed methods when unprefixed are missing', () => {
    const entering = fakeDocument({ prefix: 'webkit' })
    toggleFullscreen(entering)
    assert.deepEqual(entering.calls, ['request'])
    const exiting = fakeDocument({ prefix: 'webkit', fullscreenElement: {} })
    toggleFullscreen(exiting)
    assert.deepEqual(exiting.calls, ['exit'])
})

test('toggleFullscreen: a rejected request does not throw', async () => {
    const doc = fakeDocument()
    doc.documentElement.requestFullscreen = () => Promise.reject(new Error('denied'))
    assert.doesNotThrow(() => toggleFullscreen(doc))
    await new Promise((r) => setImmediate(r))
})
