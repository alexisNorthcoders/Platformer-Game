/**
 * 9-slice drawing math (#63). A frame is a source rect in an image plus the
 * insets (source px) of its fixed border:
 *
 *   { x, y, w, h, left, top, right, bottom }
 *
 * Corners are drawn at their natural size times an integer `scale`; the edges
 * keep their thickness and only run along their length; the middle fills the
 * rest. Edges stretch by default (right for art whose edges are one flat
 * column or row); with `tileEdges` they repeat at natural size instead, the
 * last copy cropped (for patterned edges such as bricks).
 *
 * Returns the draw calls as `{ sx, sy, sw, sh, dx, dy, dw, dh }`, which cover
 * `dest` exactly. Pieces of zero size are left out.
 */
export function nineSlice(frame, dest, scale, { tileEdges = false } = {}) {
    const min = minNineSliceSize(frame, scale)
    if (dest.w < min.w || dest.h < min.h) {
        throw new RangeError(`9-slice needs at least ${min.w}×${min.h}, got ${dest.w}×${dest.h}`)
    }
    const { x, y, left, top, right, bottom } = frame
    const cw = frame.w - left - right
    const ch = frame.h - top - bottom

    // Columns and rows as [source start, source size, dest start, dest size].
    const midW = dest.w - (left + right) * scale
    const midH = dest.h - (top + bottom) * scale
    const cols = [
        [x, left, dest.x, left * scale],
        [x + left, cw, dest.x + left * scale, midW],
        [x + left + cw, right, dest.x + left * scale + midW, right * scale],
    ]
    const rows = [
        [y, top, dest.y, top * scale],
        [y + top, ch, dest.y + top * scale, midH],
        [y + top + ch, bottom, dest.y + top * scale + midH, bottom * scale],
    ]

    const pieces = []
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const [sx, sw, dx, dw] = cols[c]
            const [sy, sh, dy, dh] = rows[r]
            if (dw <= 0 || dh <= 0) continue
            const isEdge = (r === 1) !== (c === 1)
            if (!tileEdges || !isEdge) {
                pieces.push({ sx, sy, sw, sh, dx, dy, dw, dh })
                continue
            }
            // Repeat along the edge's length: across for top/bottom, down for left/right.
            const across = r !== 1
            const tile = (across ? sw : sh) * scale
            const length = across ? dw : dh
            for (let off = 0; off < length; off += tile) {
                const run = Math.min(tile, length - off)
                pieces.push(across
                    ? { sx, sy, sw: run / scale, sh, dx: dx + off, dy, dw: run, dh }
                    : { sx, sy, sw, sh: run / scale, dx, dy: dy + off, dw, dh: run })
            }
        }
    }
    return pieces
}

/** Smallest destination a frame can be drawn into at `scale`: its corners, with no middle. */
export function minNineSliceSize(frame, scale) {
    if (!Number.isInteger(scale) || scale < 1) {
        throw new RangeError(`9-slice scale must be a positive integer, got ${scale}`)
    }
    return {
        w: (frame.left + frame.right) * scale,
        h: (frame.top + frame.bottom) * scale,
    }
}
