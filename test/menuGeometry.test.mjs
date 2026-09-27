import assert from 'node:assert/strict'
import test from 'node:test'
import { canvasLogicalCoords, pauseMenuHitTarget, pointInRect, titleScreenHitTarget } from '../js/menuGeometry.mjs'

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

const TITLE_SCREEN = {
    startBtn: { x: 287, y: 330, w: 450, h: 52 },
    levelBtn: { x: 287, y: 392, w: 450, h: 52 },
}

const PAUSE_MENU = {
    startBtn: { x: 287, y: 330, w: 450, h: 52 },
    levelBtn: { x: 287, y: 392, w: 450, h: 52 },
    fullscreenBtn: { x: 794, y: 20, w: 210, h: 52 },
}

test('titleScreenHitTarget: Start and Level hit their buttons', () => {
    assert.equal(titleScreenHitTarget(300, 350, TITLE_SCREEN), 'start')
    assert.equal(titleScreenHitTarget(300, 410, TITLE_SCREEN), 'level')
})

test('titleScreenHitTarget: misses return null', () => {
    assert.equal(titleScreenHitTarget(10, 10, TITLE_SCREEN), null)
    assert.equal(titleScreenHitTarget(300, 388, TITLE_SCREEN), null)
})

test('titleScreenHitTarget: never reports Fullscreen, even where the Pause Menu has it', () => {
    assert.equal(titleScreenHitTarget(900, 40, PAUSE_MENU), null)
})

test('titleScreenHitTarget: uses its own layout, not the Pause Menu one', () => {
    const moved = { startBtn: { x: 0, y: 0, w: 100, h: 50 }, levelBtn: { x: 0, y: 60, w: 100, h: 50 } }
    assert.equal(titleScreenHitTarget(50, 25, moved), 'start')
    assert.equal(titleScreenHitTarget(50, 85, moved), 'level')
    assert.equal(titleScreenHitTarget(300, 350, moved), null)
})

test('pauseMenuHitTarget: Start and Level hit their buttons', () => {
    assert.equal(pauseMenuHitTarget(300, 350, PAUSE_MENU), 'start')
    assert.equal(pauseMenuHitTarget(300, 410, PAUSE_MENU), 'level')
})

test('pauseMenuHitTarget: misses return null', () => {
    assert.equal(pauseMenuHitTarget(10, 10, PAUSE_MENU), null)
    assert.equal(pauseMenuHitTarget(300, 388, PAUSE_MENU), null)
})

test('pauseMenuHitTarget: Fullscreen only hits while shown', () => {
    assert.equal(pauseMenuHitTarget(900, 40, PAUSE_MENU, { showFullscreen: true }), 'fullscreen')
    assert.equal(pauseMenuHitTarget(900, 40, PAUSE_MENU, { showFullscreen: false }), null)
    assert.equal(pauseMenuHitTarget(900, 40, PAUSE_MENU), null)
})

test('pauseMenuHitTarget: Fullscreen edges are inclusive, like the other buttons', () => {
    const r = PAUSE_MENU.fullscreenBtn
    assert.equal(pauseMenuHitTarget(r.x, r.y, PAUSE_MENU, { showFullscreen: true }), 'fullscreen')
    assert.equal(pauseMenuHitTarget(r.x + r.w, r.y + r.h, PAUSE_MENU, { showFullscreen: true }), 'fullscreen')
    assert.equal(pauseMenuHitTarget(r.x + r.w / 2, r.y + r.h + 0.5, PAUSE_MENU, { showFullscreen: true }), null)
})
