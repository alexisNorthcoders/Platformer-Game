import assert from 'node:assert/strict'
import test from 'node:test'
import {
    BRICK_FRAME,
    MENU_ART_SCALE,
    PLANK_FRAME,
    PLANK_SOURCE,
    frameAround,
    pixelFont,
    plankFaceCentre,
    waitForPixelFont,
} from '../js/menuArt.mjs'
import { PAUSE_MENU, TITLE_SCREEN } from '../js/menuLayout.mjs'
import { minNineSliceSize, nineSlice } from '../js/nineSlice.mjs'

const BUTTONS = [
    ['Title Screen ◀', TITLE_SCREEN.prevBtn],
    ['Title Screen ▶', TITLE_SCREEN.nextBtn],
    ['Title Screen PLAY', TITLE_SCREEN.playBtn],
    ['Pause Menu Start', PAUSE_MENU.startBtn],
    ['Pause Menu Level', PAUSE_MENU.levelBtn],
    ['Pause Menu Fullscreen', PAUSE_MENU.fullscreenBtn],
]

test('plank: the copied columns make up the 9-slice source, with a one-column middle', () => {
    const width = PLANK_SOURCE.columns.reduce((sum, col) => sum + col.w, 0)
    assert.equal(width, PLANK_FRAME.w)
    assert.equal(PLANK_SOURCE.h, PLANK_FRAME.h)
    assert.equal(PLANK_SOURCE.columns[0].w, PLANK_FRAME.left)
    assert.equal(PLANK_SOURCE.columns[1].w, 1)
    assert.equal(PLANK_SOURCE.columns[2].w, PLANK_FRAME.right)
    assert.equal(PLANK_FRAME.h - PLANK_FRAME.top - PLANK_FRAME.bottom, 1)
})

for (const [name, rect] of BUTTONS) {
    test(`${name}: plank corners and edges draw at whole-pixel 2× scale`, () => {
        const min = minNineSliceSize(PLANK_FRAME, MENU_ART_SCALE)
        assert.ok(rect.w >= min.w && rect.h >= min.h, `${rect.w}×${rect.h} is under ${min.w}×${min.h}`)
        // Even sides keep the stretched middle a whole number of art pixels.
        assert.equal(rect.w % MENU_ART_SCALE, 0)
        assert.equal(rect.h % MENU_ART_SCALE, 0)
        for (const p of nineSlice(PLANK_FRAME, rect, MENU_ART_SCALE)) {
            for (const v of [p.dx, p.dy, p.dw, p.dh]) assert.ok(Number.isInteger(v), `${name}: ${v}`)
            // Anything that is not the middle column / row keeps its natural size.
            if (p.sw > 1) assert.equal(p.dw, p.sw * MENU_ART_SCALE)
            if (p.sh > 1) assert.equal(p.dh, p.sh * MENU_ART_SCALE)
        }
    })
}

test('brick panel and Level Preview frames fit the brick corners', () => {
    const min = minNineSliceSize(BRICK_FRAME, MENU_ART_SCALE)
    for (const rect of [TITLE_SCREEN.panel, frameAround(TITLE_SCREEN.preview), frameAround(PAUSE_MENU.preview)]) {
        assert.ok(rect.w >= min.w && rect.h >= min.h)
        const pieces = nineSlice(BRICK_FRAME, rect, MENU_ART_SCALE, { tileEdges: true })
        for (const p of pieces) {
            for (const v of [p.dx, p.dy, p.dw, p.dh]) assert.ok(Number.isInteger(v))
        }
    }
})

test('frameAround: the stone border (10 source px) runs just outside the rect', () => {
    assert.deepEqual(frameAround({ x: 52, y: 116, w: 448, h: 252 }), { x: 32, y: 96, w: 488, h: 292 })
    assert.deepEqual(frameAround({ x: 10, y: 10, w: 100, h: 50 }, 1), { x: 0, y: 0, w: 120, h: 70 })
})

test('plankFaceCentre: text centres on the plank face, above the shadow and feet', () => {
    // 52 tall at 2×: the bottom 10px are shadow and feet.
    assert.deepEqual(plankFaceCentre({ x: 100, y: 200, w: 220, h: 52 }), { x: 210, y: 221 })
})

test('pixelFont: the canvas font string for the pixel font', () => {
    assert.equal(pixelFont(16), '16px "Press Start 2P"')
})

const noTimer = () => {}

test('waitForPixelFont: true once the font has loaded', async () => {
    const requested = []
    const fonts = { load: async font => { requested.push(font); return [{}] } }
    assert.equal(await waitForPixelFont(fonts, { setTimer: noTimer }), true)
    assert.deepEqual(requested, ['16px "Press Start 2P"'])
})

test('waitForPixelFont: loads the declared face explicitly and waits for the set to be ready', async () => {
    const calls = []
    const face = { family: '"Press Start 2P"', load: async () => { calls.push('face.load'); return face } }
    const other = { family: 'Other', load: async () => { calls.push('other.load') } }
    const fonts = {
        *[Symbol.iterator]() { yield face; yield other },
        load: async () => { calls.push('set.load'); return [] },
        get ready() { calls.push('ready'); return Promise.resolve() },
    }
    assert.equal(await waitForPixelFont(fonts, { setTimer: noTimer }), true)
    assert.deepEqual(calls, ['set.load', 'face.load', 'ready'])
})

test('waitForPixelFont: false when no face matched or loading failed', async () => {
    assert.equal(await waitForPixelFont({ load: async () => [] }, { setTimer: noTimer }), false)
    assert.equal(await waitForPixelFont({ load: async () => { throw new Error('404') } }, { setTimer: noTimer }), false)
})

test('waitForPixelFont: gives up after the timeout so the game still starts', async () => {
    const fonts = { load: () => new Promise(() => {}) }
    const result = waitForPixelFont(fonts, { timeoutMs: 1234, setTimer: (fn, ms) => { assert.equal(ms, 1234); fn() } })
    assert.equal(await result, false)
})

test('waitForPixelFont: false without a FontFaceSet', async () => {
    assert.equal(await waitForPixelFont(undefined), false)
})
