import assert from 'node:assert/strict'
import test from 'node:test'
import {
    canvasLogicalCoords,
    coverSourceRect,
    pauseMenuHitTarget,
    pointInRect,
    stepLevel,
    titleScreenHitTarget,
    titleScreenKeyTarget,
} from '../js/menuGeometry.mjs'

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
    prevBtn: { x: 632, y: 170, w: 52, h: 52 },
    nextBtn: { x: 896, y: 170, w: 52, h: 52 },
    playBtn: { x: 680, y: 262, w: 220, h: 60 },
}

const PAUSE_MENU = {
    startBtn: { x: 287, y: 330, w: 450, h: 52 },
    levelBtn: { x: 287, y: 392, w: 450, h: 52 },
    fullscreenBtn: { x: 794, y: 20, w: 210, h: 52 },
}

test('titleScreenHitTarget: ◀, ▶ and PLAY hit their buttons', () => {
    assert.equal(titleScreenHitTarget(658, 196, TITLE_SCREEN), 'prev')
    assert.equal(titleScreenHitTarget(922, 196, TITLE_SCREEN), 'next')
    assert.equal(titleScreenHitTarget(790, 292, TITLE_SCREEN), 'play')
})

test('titleScreenHitTarget: edges are inclusive for every button', () => {
    for (const [name, target] of [['prevBtn', 'prev'], ['nextBtn', 'next'], ['playBtn', 'play']]) {
        const r = TITLE_SCREEN[name]
        assert.equal(titleScreenHitTarget(r.x, r.y, TITLE_SCREEN), target)
        assert.equal(titleScreenHitTarget(r.x + r.w, r.y + r.h, TITLE_SCREEN), target)
        assert.equal(titleScreenHitTarget(r.x - 0.5, r.y + r.h / 2, TITLE_SCREEN), null)
        assert.equal(titleScreenHitTarget(r.x + r.w / 2, r.y + r.h + 0.5, TITLE_SCREEN), null)
    }
})

test('titleScreenHitTarget: misses return null (level label, preview, blank space)', () => {
    assert.equal(titleScreenHitTarget(790, 196, TITLE_SCREEN), null)
    assert.equal(titleScreenHitTarget(300, 240, TITLE_SCREEN), null)
    assert.equal(titleScreenHitTarget(10, 10, TITLE_SCREEN), null)
})

test('titleScreenHitTarget: never reports Pause Menu buttons', () => {
    assert.equal(titleScreenHitTarget(300, 350, PAUSE_MENU), null)
    assert.equal(titleScreenHitTarget(900, 40, PAUSE_MENU), null)
})

test('titleScreenHitTarget: letterboxed click maps through canvasLogicalCoords', () => {
    // Canvas shown at half size, offset by letterbox bars.
    const boundingRect = { left: 40, top: 20, width: 512, height: 288 }
    const r = TITLE_SCREEN.playBtn
    const clientX = 40 + (r.x + r.w / 2) / 2
    const clientY = 20 + (r.y + r.h / 2) / 2
    const p = canvasLogicalCoords(clientX, clientY, boundingRect, 1024, 576)
    assert.equal(titleScreenHitTarget(p.x, p.y, TITLE_SCREEN), 'play')
    const q = canvasLogicalCoords(40 + (r.x - 4) / 2, clientY, boundingRect, 1024, 576)
    assert.equal(titleScreenHitTarget(q.x, q.y, TITLE_SCREEN), null)
})

test('titleScreenKeyTarget: ←/→ step, Enter/Space play, others ignored', () => {
    assert.equal(titleScreenKeyTarget('ArrowLeft'), 'prev')
    assert.equal(titleScreenKeyTarget('ArrowRight'), 'next')
    assert.equal(titleScreenKeyTarget('Enter'), 'play')
    assert.equal(titleScreenKeyTarget(' '), 'play')
    assert.equal(titleScreenKeyTarget('ArrowUp'), null)
    assert.equal(titleScreenKeyTarget('Escape'), null)
    assert.equal(titleScreenKeyTarget('a'), null)
})

test('stepLevel: steps forward and backward inside the range', () => {
    assert.equal(stepLevel(3, 1, 17), 4)
    assert.equal(stepLevel(3, -1, 17), 2)
})

test('stepLevel: wraps at both ends (1 ↔ 17)', () => {
    assert.equal(stepLevel(17, 1, 17), 1)
    assert.equal(stepLevel(1, -1, 17), 17)
})

test('stepLevel: a full lap in either direction returns to the start', () => {
    let n = 5
    for (let i = 0; i < 17; i++) n = stepLevel(n, 1, 17)
    assert.equal(n, 5)
    for (let i = 0; i < 17; i++) n = stepLevel(n, -1, 17)
    assert.equal(n, 5)
})

test('stepLevel: no levels leaves the selection alone', () => {
    assert.equal(stepLevel(1, 1, 0), 1)
})

function assertCropInsideImage(crop, sw, sh) {
    assert.ok(crop.sx >= 0 && crop.sy >= 0, 'crop starts inside the image')
    assert.ok(crop.sx + crop.sw <= sw + 1e-9 && crop.sy + crop.sh <= sh + 1e-9, 'crop ends inside the image')
}

test('coverSourceRect: crop keeps the frame aspect ratio, so it fills the frame exactly', () => {
    const frame = { w: 512, h: 288 }
    // Every Level Preview image size shipped in img/.
    for (const [sw, sh] of [[512, 288], [513, 289], [1025, 289], [1537, 289]]) {
        const crop = coverSourceRect(sw, sh, frame.w, frame.h)
        assertCropInsideImage(crop, sw, sh)
        assert.ok(Math.abs(crop.sw / crop.sh - frame.w / frame.h) < 1e-9, `${sw}x${sh} aspect`)
    }
})

test('coverSourceRect: wide images are cropped to their centre, full height', () => {
    const crop = coverSourceRect(1537, 289, 512, 288)
    assert.equal(crop.sh, 289)
    assert.ok(Math.abs(crop.sx - (1537 - crop.sw) / 2) < 1e-9)
    assert.equal(crop.sy, 0)
})

test('coverSourceRect: tall images are cropped to their centre, full width', () => {
    const crop = coverSourceRect(100, 400, 200, 100)
    assert.deepEqual(crop, { sx: 0, sy: 175, sw: 100, sh: 50 })
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
