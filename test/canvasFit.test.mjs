import assert from 'node:assert/strict'
import test from 'node:test'
import { controllerReservedHeight, fitCanvasSize } from '../js/canvasFit.mjs'

test('fitCanvasSize: never scales above native size on a large viewport', () => {
    assert.deepEqual(fitCanvasSize(1920, 1080, 1024, 576), { width: 1024, height: 576 })
})

test('fitCanvasSize: landscape phone is height-limited and keeps 16:9', () => {
    assert.deepEqual(fitCanvasSize(844, 390, 1024, 576), { width: 693, height: 390 })
})

test('fitCanvasSize: portrait phone is width-limited and keeps 16:9', () => {
    assert.deepEqual(fitCanvasSize(390, 844, 1024, 576), { width: 390, height: 219 })
})

test('fitCanvasSize: result always fits inside the viewport', () => {
    for (const [vw, vh] of [[320, 568], [568, 320], [1000, 600], [1023, 575], [777, 333]]) {
        const { width, height } = fitCanvasSize(vw, vh, 1024, 576)
        assert.ok(width <= vw && height <= vh, `${vw}x${vh} -> ${width}x${height}`)
    }
})

test('fitCanvasSize: degenerate viewport yields zero size', () => {
    assert.deepEqual(fitCanvasSize(0, 0, 1024, 576), { width: 0, height: 0 })
})

test('controllerReservedHeight: hidden controller reserves nothing', () => {
    assert.equal(controllerReservedHeight({ display: 'none', position: 'static', minHeight: '150px' }), 0)
})

test('controllerReservedHeight: portrait split reserves the panel min-height', () => {
    assert.equal(controllerReservedHeight({ display: 'flex', position: 'static', minHeight: '150.5px' }), 150.5)
})

test('controllerReservedHeight: landscape overlay reserves nothing so the game uses full height', () => {
    assert.equal(controllerReservedHeight({ display: 'flex', position: 'fixed', minHeight: '150px' }), 0)
})

test('controllerReservedHeight: unparseable min-height reserves nothing', () => {
    assert.equal(controllerReservedHeight({ display: 'flex', position: 'static', minHeight: 'auto' }), 0)
})
