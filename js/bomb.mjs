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

import { BOMB_SHEETS, loopFrame, onceFrame, playMs, spriteDrawRect } from './spriteAnimation.mjs'

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
 * The blast: the Boooooom frame (52×56 source px, drawn at 2×) with its anchor
 * on the Bomb's base, so it matches the visible explosion. Same shape as a
 * hitbox ({ position, width, height }).
 */
function blastRect(bomb) {
    const r = spriteDrawRect(BOMB_SHEETS.boom, 0, bomb.x, bomb.y, false)
    return { position: { x: r.dx, y: r.dy }, width: r.dw, height: r.dh }
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

/** Call while Bombs aren't stepped (Pause Menu, loading), so they resume where they were. */
export function pauseBombs(state) {
    state.lastNow = null
}

/** Everything to draw this frame: drawImage arguments plus the sheet name. */
export function bombDrawList(state) {
    const bomb = state.bomb
    if (!bomb) return []
    const sheet = bomb.phase === 'fuse' ? 'bombOn' : 'boom'
    const { frames } = BOMB_SHEETS[sheet]
    const frame = bomb.phase === 'fuse' ? loopFrame(bomb.t, frames) : onceFrame(bomb.t, frames)
    return [{ sheet, ...spriteDrawRect(BOMB_SHEETS[sheet], frame, bomb.x, bomb.y, false) }]
}
