import assert from 'node:assert/strict'
import test from 'node:test'
import { minNineSliceSize, nineSlice } from '../js/nineSlice.mjs'

// 20×10 source at (100, 50): 4px left, 2px top, 6px right, 3px bottom.
const FRAME = { x: 100, y: 50, w: 20, h: 10, left: 4, top: 2, right: 6, bottom: 3 }

const byPos = (pieces, dx, dy) => pieces.find(p => p.dx === dx && p.dy === dy)

test('nineSlice: corners keep their natural size times the scale', () => {
    const pieces = nineSlice(FRAME, { x: 10, y: 20, w: 100, h: 40 }, 2)
    assert.deepEqual(byPos(pieces, 10, 20), { sx: 100, sy: 50, sw: 4, sh: 2, dx: 10, dy: 20, dw: 8, dh: 4 })
    assert.deepEqual(byPos(pieces, 98, 20), { sx: 114, sy: 50, sw: 6, sh: 2, dx: 98, dy: 20, dw: 12, dh: 4 })
    assert.deepEqual(byPos(pieces, 10, 54), { sx: 100, sy: 57, sw: 4, sh: 3, dx: 10, dy: 54, dw: 8, dh: 6 })
    assert.deepEqual(byPos(pieces, 98, 54), { sx: 114, sy: 57, sw: 6, sh: 3, dx: 98, dy: 54, dw: 12, dh: 6 })
})

test('nineSlice: edges keep their thickness and stretch only along their length', () => {
    const pieces = nineSlice(FRAME, { x: 10, y: 20, w: 100, h: 40 }, 2)
    // top / bottom: full centre width of the source, stretched to fill across
    assert.deepEqual(byPos(pieces, 18, 20), { sx: 104, sy: 50, sw: 10, sh: 2, dx: 18, dy: 20, dw: 80, dh: 4 })
    assert.deepEqual(byPos(pieces, 18, 54), { sx: 104, sy: 57, sw: 10, sh: 3, dx: 18, dy: 54, dw: 80, dh: 6 })
    // left / right: stretched down
    assert.deepEqual(byPos(pieces, 10, 24), { sx: 100, sy: 52, sw: 4, sh: 5, dx: 10, dy: 24, dw: 8, dh: 30 })
    assert.deepEqual(byPos(pieces, 98, 24), { sx: 114, sy: 52, sw: 6, sh: 5, dx: 98, dy: 24, dw: 12, dh: 30 })
})

test('nineSlice: only the middle stretches on both axes', () => {
    const pieces = nineSlice(FRAME, { x: 10, y: 20, w: 100, h: 40 }, 2)
    assert.equal(pieces.length, 9)
    assert.deepEqual(byPos(pieces, 18, 24), { sx: 104, sy: 52, sw: 10, sh: 5, dx: 18, dy: 24, dw: 80, dh: 30 })
})

test('nineSlice: pieces cover the destination exactly, without gaps or overlap', () => {
    const dest = { x: 7, y: 3, w: 61, h: 33 }
    const pieces = nineSlice(FRAME, dest, 3)
    const area = pieces.reduce((sum, p) => sum + p.dw * p.dh, 0)
    assert.equal(area, dest.w * dest.h)
    for (const p of pieces) {
        assert.ok(p.dx >= dest.x && p.dx + p.dw <= dest.x + dest.w)
        assert.ok(p.dy >= dest.y && p.dy + p.dh <= dest.y + dest.h)
    }
})

test('nineSlice: at the minimum size the middle collapses to nothing', () => {
    const { w, h } = minNineSliceSize(FRAME, 2)
    assert.deepEqual({ w, h }, { w: 20, h: 10 })
    const pieces = nineSlice(FRAME, { x: 0, y: 0, w, h }, 2)
    assert.equal(pieces.length, 4)
})

test('nineSlice: smaller than the corners, or a non-integer scale, is refused', () => {
    assert.throws(() => nineSlice(FRAME, { x: 0, y: 0, w: 19, h: 40 }, 2), RangeError)
    assert.throws(() => nineSlice(FRAME, { x: 0, y: 0, w: 100, h: 9 }, 2), RangeError)
    assert.throws(() => nineSlice(FRAME, { x: 0, y: 0, w: 100, h: 40 }, 1.5), RangeError)
    assert.throws(() => nineSlice(FRAME, { x: 0, y: 0, w: 100, h: 40 }, 0), RangeError)
})

test('nineSlice tiled: edges repeat at natural size, the last copy cropped', () => {
    // centre of the source is 10×5; at scale 2 each edge tile is 20 long.
    const dest = { x: 0, y: 0, w: 8 + 50 + 12, h: 4 + 10 + 6 }
    const pieces = nineSlice(FRAME, dest, 2, { tileEdges: true })
    const top = pieces.filter(p => p.dy === 0 && p.dx >= 8 && p.dx < 58)
    assert.deepEqual(top, [
        { sx: 104, sy: 50, sw: 10, sh: 2, dx: 8, dy: 0, dw: 20, dh: 4 },
        { sx: 104, sy: 50, sw: 10, sh: 2, dx: 28, dy: 0, dw: 20, dh: 4 },
        { sx: 104, sy: 50, sw: 5, sh: 2, dx: 48, dy: 0, dw: 10, dh: 4 },
    ])
    const left = pieces.filter(p => p.dx === 0 && p.dy >= 4 && p.dy < 14)
    assert.deepEqual(left, [{ sx: 100, sy: 52, sw: 4, sh: 5, dx: 0, dy: 4, dw: 8, dh: 10 }])
    // the middle is still one stretched piece
    assert.deepEqual(byPos(pieces, 8, 4), { sx: 104, sy: 52, sw: 10, sh: 5, dx: 8, dy: 4, dw: 50, dh: 10 })
    const area = pieces.reduce((sum, p) => sum + p.dw * p.dh, 0)
    assert.equal(area, dest.w * dest.h)
})
