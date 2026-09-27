import assert from 'node:assert/strict'
import test from 'node:test'
import { canvasLogicalCoords, menuHitTarget, pointInRect } from '../js/menuGeometry.mjs'

const MENU_START = { x: 287, y: 330, w: 450, h: 52 }

test('pointInRect: inclusive edges (boundary clicks)', () => {
    assert.equal(pointInRect(MENU_START.x, MENU_START.y + MENU_START.h / 2, MENU_START), true)
    assert.equal(pointInRect(MENU_START.x + MENU_START.w, MENU_START.y + MENU_START.h / 2, MENU_START), true)
    assert.equal(pointInRect(MENU_START.x + MENU_START.w / 2, MENU_START.y, MENU_START), true)
    assert.equal(pointInRect(MENU_START.x + MENU_START.w / 2, MENU_START.y + MENU_START.h, MENU_START), true)
})

test('pointInRect: just outside each edge', () => {
    const midY = MENU_START.y + MENU_START.h / 2
    assert.equal(pointInRect(MENU_START.x - 0.5, midY, MENU_START), false)
    assert.equal(pointInRect(MENU_START.x + MENU_START.w + 0.5, midY, MENU_START), false)
    const midX = MENU_START.x + MENU_START.w / 2
    assert.equal(pointInRect(midX, MENU_START.y - 0.5, MENU_START), false)
    assert.equal(pointInRect(midX, MENU_START.y + MENU_START.h + 0.5, MENU_START), false)
})

test('canvasLogicalCoords: maps display rect to internal canvas size (letterboxed / scaled)', () => {
    const boundingRect = { left: 100, top: 50, width: 512, height: 288 }
    const canvasWidth = 1024
    const canvasHeight = 576
    const p = canvasLogicalCoords(100, 50, boundingRect, canvasWidth, canvasHeight)
    assert.deepEqual(p, { x: 0, y: 0 })
    const q = canvasLogicalCoords(100 + 512, 50 + 288, boundingRect, canvasWidth, canvasHeight)
    assert.deepEqual(q, { x: 1024, y: 576 })
})

test('canvasLogicalCoords: center of half-sized CSS canvas', () => {
    const boundingRect = { left: 0, top: 0, width: 512, height: 288 }
    const p = canvasLogicalCoords(256, 144, boundingRect, 1024, 576)
    assert.deepEqual(p, { x: 512, y: 288 })
})

const MENU = {
    startBtn: { x: 287, y: 330, w: 450, h: 52 },
    levelBtn: { x: 287, y: 392, w: 450, h: 52 },
    fullscreenBtn: { x: 794, y: 20, w: 210, h: 52 },
}

test('menuHitTarget: Start and Level hit their buttons', () => {
    assert.equal(menuHitTarget(300, 350, MENU), 'start')
    assert.equal(menuHitTarget(300, 410, MENU), 'level')
})

test('menuHitTarget: misses return null', () => {
    assert.equal(menuHitTarget(10, 10, MENU), null)
    assert.equal(menuHitTarget(300, 388, MENU), null)
})

test('menuHitTarget: Fullscreen only hits while shown', () => {
    assert.equal(menuHitTarget(900, 40, MENU, { showFullscreen: true }), 'fullscreen')
    assert.equal(menuHitTarget(900, 40, MENU, { showFullscreen: false }), null)
    assert.equal(menuHitTarget(900, 40, MENU), null)
})

test('menuHitTarget: Fullscreen edges are inclusive, like the other buttons', () => {
    const r = MENU.fullscreenBtn
    assert.equal(menuHitTarget(r.x, r.y, MENU, { showFullscreen: true }), 'fullscreen')
    assert.equal(menuHitTarget(r.x + r.w, r.y + r.h, MENU, { showFullscreen: true }), 'fullscreen')
    assert.equal(menuHitTarget(r.x + r.w / 2, r.y + r.h + 0.5, MENU, { showFullscreen: true }), null)
})
