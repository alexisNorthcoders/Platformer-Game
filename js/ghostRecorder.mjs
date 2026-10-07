/**
 * Ghost King recorder and playback (#130). Pure: no DOM or canvas.
 *
 * A run is a list of frames { t, x, y, key, frame, flip }: the King's sprite
 * position in whole pixels, animation key, animation frame and facing, stamped
 * with the level timer's elapsed ms. Playback matches by that time, not by
 * frame count, so it keeps step with the timer at any refresh rate.
 */

export function createGhostRecorder() {
    let frames = []

    return {
        clear() {
            frames = []
        },
        /** Records the King at `elapsedMs`; a frame identical to the last one is dropped. */
        record(elapsedMs, { x, y, key, frame, flip }) {
            if (typeof key !== 'string') return
            x = Math.round(x)
            y = Math.round(y)
            flip = Boolean(flip)
            const last = frames[frames.length - 1]
            if (last && last.x === x && last.y === y && last.key === key && last.frame === frame && last.flip === flip) return
            frames.push({ t: Math.round(elapsedMs), x, y, key, frame, flip })
        },
        frames() {
            return frames.slice()
        },
    }
}

/** The frame showing at `elapsedMs`, or null before the run starts or after it ends at `endMs`. */
export function ghostFrameAt(frames, elapsedMs, endMs) {
    if (!frames?.length || elapsedMs > endMs || elapsedMs < frames[0].t) return null
    let lo = 0
    let hi = frames.length - 1
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if (frames[mid].t <= elapsedMs) lo = mid
        else hi = mid - 1
    }
    return frames[lo]
}

/**
 * Compact form for storage: animation keys once, then a flat list of deltas
 * (dt, dx, dy, key index, frame * 2 + flip) per frame.
 */
export function packRun(frames) {
    const keys = []
    const d = []
    let t = 0
    let x = 0
    let y = 0
    for (const f of frames) {
        let k = keys.indexOf(f.key)
        if (k < 0) k = keys.push(f.key) - 1
        d.push(f.t - t, f.x - x, f.y - y, k, f.frame * 2 + (f.flip ? 1 : 0))
        t = f.t
        x = f.x
        y = f.y
    }
    return { keys, d }
}

/** Frames from packRun's output; a malformed run gives no frames. */
export function unpackRun(packed) {
    const { keys, d } = packed ?? {}
    if (!Array.isArray(keys) || !Array.isArray(d) || d.length % 5 !== 0 || !d.every(Number.isFinite)) return []
    const frames = []
    let t = 0
    let x = 0
    let y = 0
    for (let i = 0; i < d.length; i += 5) {
        t += d[i]
        x += d[i + 1]
        y += d[i + 2]
        const key = keys[d[i + 3]]
        if (typeof key !== 'string') return []
        frames.push({ t, x, y, key, frame: d[i + 4] >> 1, flip: (d[i + 4] & 1) === 1 })
    }
    return frames
}
