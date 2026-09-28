/**
 * Bombs (#73): the King drops a Bomb at his feet; it burns its fuse, explodes
 * and is gone. Only one Bomb can be live at a time.
 *
 * Pure: no DOM, canvas or globals. index.js drops Bombs on S, steps them with
 * advanceBombs() while playing (pauseBombs() otherwise, so they freeze while
 * paused) and draws bombDrawList() inside the camera transform (through
 * globalThis.__bomb, bomb-bootstrap.mjs).
 *
 * Positions are world px; a Bomb's (x, y) is its base, where the Bomb sits on
 * the floor. Sprites draw at the game's 2× pixel scale.
 */

import { BOMB_SHEETS, SPRITE_SCALE, loopFrame, onceFrame, playMs, spriteDrawRect } from './spriteAnimation.mjs'

export const BOMB = {
    /** The Bomb On animation played 3 times. */
    fuseMs: playMs(BOMB_SHEETS.bombOn, 3),
    /** The Boooooom animation played once. */
    boomMs: playMs(BOMB_SHEETS.boom),
    /**
     * Longest frame gap advanceBombs() steps across; a longer gap (a hitch or
     * hidden tab) counts as this much, so a Bomb never skips its fuse.
     */
    maxStepMs: 100,
    /**
     * The blast, in source px (drawn at SPRITE_SCALE): 52×56 with the Bomb's
     * base at (26, 39). Fixed here, not read from the Boooooom art, so the
     * explosion event's rect stays stable if the art changes.
     */
    blast: { w: 52, h: 56, anchorX: 26, anchorY: 39 },
}

/** No Bomb live. */
export function createBombState() {
    return { bomb: null, lastNow: null }
}

/**
 * Drops a Bomb with its base on `feet` ({ x, y }). Returns false, changing
 * nothing, while a Bomb is already live.
 */
export function tryDropBomb(state, feet) {
    if (state.bomb) return false
    state.bomb = { x: feet.x, y: feet.y, phase: 'fuse', t: 0 }
    return true
}

/**
 * The blast rect (BOMB.blast at SPRITE_SCALE) with its anchor on the Bomb's
 * base. Same shape as a hitbox ({ position, width, height }).
 */
function blastRect(bomb) {
    const { w, h, anchorX, anchorY } = BOMB.blast
    return {
        position: { x: bomb.x - anchorX * SPRITE_SCALE, y: bomb.y - anchorY * SPRITE_SCALE },
        width: w * SPRITE_SCALE,
        height: h * SPRITE_SCALE,
    }
}

/**
 * Advances Bombs by `dtMs` through fuse → boom → gone. Returns the events that
 * happened: `{ type: 'explosion', rect }` once, as the fuse runs out.
 */
export function stepBombs(state, dtMs) {
    const events = []
    const bomb = state.bomb
    if (!bomb) return events
    bomb.t += dtMs
    if (bomb.phase === 'fuse' && bomb.t >= BOMB.fuseMs) {
        bomb.phase = 'boom'
        bomb.t -= BOMB.fuseMs
        events.push({ type: 'explosion', rect: blastRect(bomb) })
    }
    if (bomb.phase === 'boom' && bomb.t >= BOMB.boomMs) state.bomb = null
    return events
}

/**
 * Advances Bombs to the frame time `now` (ms, e.g. performance.now()) and
 * returns stepBombs()'s events. The first call after pauseBombs() only records
 * the time.
 */
export function advanceBombs(state, now) {
    const dt = state.lastNow == null ? 0 : Math.min(BOMB.maxStepMs, Math.max(0, now - state.lastNow))
    state.lastNow = now
    return dt > 0 ? stepBombs(state, dt) : []
}

/** Removes any live Bomb, e.g. when a level is (re)built. */
export function clearBombs(state) {
    state.bomb = null
    state.lastNow = null
}

/** Call while Bombs aren't stepped (Pause Menu, loading), so they resume where they were. */
export function pauseBombs(state) {
    state.lastNow = null
}

/** Each phase's sheet: the fuse loops Bomb On, the boom plays Boooooom once. */
const PHASE_ART = {
    fuse: { sheet: 'bombOn', frameAt: loopFrame },
    boom: { sheet: 'boom', frameAt: onceFrame },
}

/** Everything to draw this frame: drawImage arguments plus the sheet name. */
export function bombDrawList(state) {
    const bomb = state.bomb
    if (!bomb) return []
    const { sheet, frameAt } = PHASE_ART[bomb.phase]
    const frame = frameAt(bomb.t, BOMB_SHEETS[sheet].frames)
    return [{ sheet, ...spriteDrawRect(BOMB_SHEETS[sheet], frame, bomb.x, bomb.y, false) }]
}
