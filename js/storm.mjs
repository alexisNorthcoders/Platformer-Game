/**
 * Storm: Weather of lightning without rain, for looks alone. Nothing here
 * touches the King, the Pigs or Bombs; index.js draws what these functions
 * work out (through globalThis.__storm), switched on by `weather: 'storm'` in
 * config/levels.js.
 *
 * The sky is cut into strikes. Each strike happens at a random time 5 to 10 s
 * after the last, from a fixed seed, so the same moment always gives the same
 * flash. A strike is one flash, or one time in three a double flicker (two
 * flashes 0.35 s apart, so never more than 2 in any second and, with the pause
 * after them, never a sustained strobe). A flash is at most 35% white. Its
 * bolt is a jagged line in the sky drawn behind everything, lit for the first
 * part of the strike. Time is seconds.
 */

export const STORM = {
    gapMin: 5,
    gapMax: 10,
    /** A strike's flash: rises quickly and fades slowly. */
    riseSeconds: 0.06,
    fadeSeconds: 0.5,
    /** The peak of a flash: the most white washed over the view (never above 0.35). */
    maxWhite: 0.32,
    /** A double flicker's second flash comes this long after the first begins. */
    flickerGap: 0.35,
    doubleShare: 1 / 3,
    /** The bolt is drawn for this long from the start of a strike. */
    boltSeconds: 0.32,
    /** No more than this many flashes may begin in any one second. */
    maxFlashesPerSecond: 3,
}

/** Some fixed number in [0, 1) for a pair of integers. */
export function hash01(a, b) {
    let h = Math.imul(a | 0, 0x9E3779B1) ^ Math.imul((b | 0) + 0x7F4A7C15, 0x85EBCA6B)
    h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D)
    h = Math.imul(h ^ (h >>> 12), 0x297A2D39)
    return ((h ^ (h >>> 15)) >>> 0) / 4294967296
}

/** When strike `n` begins, in seconds: strikes are 5 to 10 s apart, the first a few seconds in. */
export function strikeStart(n, seed = 0) {
    let t = 2 + 3 * hash01(seed, 999)
    for (let i = 1; i <= n; i++) t += STORM.gapMin + (STORM.gapMax - STORM.gapMin) * hash01(seed, i)
    return t
}

/** Whether strike `n` is a double flicker. */
export function isDouble(n, seed = 0) {
    return hash01(seed, n + 5000) < STORM.doubleShare
}

/** The start times of the flashes of strike `n`: one, or two for a double flicker. */
export function flashStarts(n, seed = 0) {
    const t = strikeStart(n, seed)
    return isDouble(n, seed) ? [t, t + STORM.flickerGap] : [t]
}

function flashLevel(age, scale) {
    const { riseSeconds, fadeSeconds } = STORM
    if (age < 0 || age > riseSeconds + fadeSeconds) return 0
    return scale * (age < riseSeconds ? age / riseSeconds : 1 - (age - riseSeconds) / fadeSeconds)
}

/** How white the whole view is washed at `seconds`: 0 to STORM.maxWhite. */
export function flashAt(seconds, seed = 0) {
    let n = 0
    while (strikeStart(n + 1, seed) <= seconds) n++
    let white = 0
    for (const m of [n - 1, n, n + 1]) {
        if (m < 0) continue
        flashStarts(m, seed).forEach((start, i) => {
            white = Math.max(white, flashLevel(seconds - start, i === 0 ? STORM.maxWhite : STORM.maxWhite * 0.7))
        })
    }
    return white
}

/**
 * The strike showing at `seconds`, or null: { n, age (seconds since it began),
 * x (0..1 across the sky: where the bolt comes down), seed for its jags }.
 */
export function boltAt(seconds, seed = 0) {
    let n = 0
    while (strikeStart(n + 1, seed) <= seconds) n++
    const age = seconds - strikeStart(n, seed)
    if (age < 0 || age > STORM.boltSeconds) return null
    return { n, age, x: 0.1 + 0.8 * hash01(seed, n + 9000), seed: n * 7919 + seed }
}

/**
 * A bolt's zigzag from a cloud at (x, top) down to `bottom`, as points
 * [{ x, y }], leaning by chance, with a short branch. Fixed for a strike.
 */
export function boltPoints(strike, x, top, bottom, segments = 9) {
    const points = [{ x, y: top }]
    let px = x
    for (let i = 1; i <= segments; i++) {
        px += (hash01(strike.seed, i) - 0.5) * 50
        points.push({ x: Math.round(px), y: Math.round(top + (bottom - top) * i / segments) })
    }
    return points
}

/** The flashes that begin in each 1-second window of [0, seconds]: the largest count. */
export function busiestSecond(seconds, seed = 0) {
    const starts = []
    for (let n = 0; strikeStart(n, seed) <= seconds; n++) starts.push(...flashStarts(n, seed))
    let most = 0
    for (const s of starts) most = Math.max(most, starts.filter(t => t >= s && t < s + 1).length)
    return most
}
