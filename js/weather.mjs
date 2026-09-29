/**
 * Weather: effects across an open-air level for looks alone. Nothing here
 * touches the King, the Pigs or Bombs; index.js draws what these functions
 * work out (through globalThis.__weather), switched on by `weather: 'rain'`
 * in config/levels.js.
 *
 * Rain: each lane of the world has a drop that falls, slanted, from the top of
 * the view and starts again a little later somewhere else in the lane. The
 * same moment always gives the same drops, so where a drop lands and when its
 * splash begins can be checked. Positions are world px, time is seconds.
 */

export const RAIN = {
    /** Width of a lane: one drop falls in each. Wide, so the rain stays sparse. */
    laneWidth: 80,
    /** Sideways px per px of fall. */
    slant: 0.22,
    /** Fall speed, px per second. */
    speed: 700,
    /** How long a streak is, along its fall. */
    tail: 30,
    /** Where a drop starts, above the view. */
    startY: -30,
    /** A lane's next drop starts this many seconds after the last one (between). */
    periodMin: 1.4,
    periodMax: 2.2,
    splashSeconds: 0.4,
    rippleSeconds: 0.9,
    ripplesPerPuddle: 2,
}

/** Some fixed number in [0, 1) for a pair of integers. */
export function hash01(a, b) {
    let h = Math.imul(a | 0, 0x9E3779B1) ^ Math.imul((b | 0) + 0x7F4A7C15, 0x85EBCA6B)
    h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D)
    h = Math.imul(h ^ (h >>> 12), 0x297A2D39)
    return ((h ^ (h >>> 15)) >>> 0) / 4294967296
}

/**
 * The tops a drop can splash on: for each solid block ({ position, width,
 * height }) with no block directly above it, a span { x1, x2, y }. Sorted from
 * the highest down.
 */
export function wallTops(blocks) {
    const solid = new Set(blocks.map(b => `${b.position.x},${b.position.y}`))
    return blocks
        .filter(b => !solid.has(`${b.position.x},${b.position.y - b.height}`))
        .map(b => ({ x1: b.position.x, x2: b.position.x + b.width, y: b.position.y }))
        .sort((a, b) => a.y - b.y || a.x1 - b.x1)
}

/** Whether a splash at (x, y) lands in one of the level's painted Puddles ({ x, y, width }: y is the wall top). */
export function inPuddle(x, y, puddles) {
    return puddles.some(p => p.y === y && x >= p.x && x <= p.x + p.width)
}

/**
 * The drops at `seconds` over the world between view.left and view.right:
 * `streaks` in flight ({ x, y } the head, { tailX, tailY } the tail) and
 * `splashes` ({ x, y, age 0..1 }) where drops have just landed on a top. A
 * drop that misses every top falls on to `bottom` (the pit's surface) and
 * vanishes there, with no splash.
 */
export function rainAt(seconds, view, { tops, bottom }) {
    const { laneWidth, slant, speed, tail, startY, periodMin, periodMax, splashSeconds } = RAIN
    const streaks = []
    const splashes = []
    const fromLane = Math.floor((view.left - (bottom - startY) * slant) / laneWidth)
    const toLane = Math.ceil(view.right / laneWidth)
    for (let lane = fromLane; lane <= toLane; lane++) {
        const period = periodMin + (periodMax - periodMin) * hash01(lane, 1)
        const clock = seconds + period * hash01(lane, 2)
        const cycle = Math.floor(clock / period)
        const since = clock - cycle * period
        const x0 = (lane + hash01(lane, cycle + 10)) * laneWidth
        let land = null
        for (const top of tops) {
            const x = x0 + slant * (top.y - startY)
            if (top.y > startY && x >= top.x1 && x <= top.x2 && top.y < bottom) { land = { x, y: top.y }; break }
        }
        const endY = land ? land.y : bottom
        const fall = (endY - startY) / speed
        if (since < fall) {
            const y = startY + speed * since
            const tailY = Math.max(startY, y - tail)
            streaks.push({ x: x0 + slant * (y - startY), y, tailX: x0 + slant * (tailY - startY), tailY })
        } else if (land && since - fall < splashSeconds) {
            splashes.push({ x: land.x, y: land.y, age: (since - fall) / splashSeconds })
        }
    }
    return { streaks, splashes }
}

/**
 * The ripple rings of a Puddle on a plank at `seconds`: each ring
 * ({ dx, age 0..1 }, dx across the puddle) grows and fades as it ages. `seed`
 * keeps two puddles from rippling in step.
 */
export function puddleRipples(seconds, seed, width) {
    const { rippleSeconds, ripplesPerPuddle } = RAIN
    const rings = []
    for (let slot = 0; slot < ripplesPerPuddle; slot++) {
        const period = 1.2 + 0.8 * hash01(seed, slot + 20)
        const clock = seconds + period * hash01(seed, slot + 40)
        const cycle = Math.floor(clock / period)
        const since = clock - cycle * period
        if (since < rippleSeconds) {
            rings.push({ dx: Math.round(width * (0.15 + 0.7 * hash01(seed * 31 + slot, cycle))), age: since / rippleSeconds })
        }
    }
    return rings
}
