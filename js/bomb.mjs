/**
 * Bombs (#73): the King drops a Bomb at his feet; it burns its fuse, explodes
 * and is gone. Only one Bomb can be live at a time. Dropped in mid-air (#75),
 * it first falls unlit until it lands, and only then lights its fuse.
 *
 * Pure: no DOM, canvas or globals. Collisions come from the caller as a
 * lands-at query, `landsAt(x, fromY, toY, halfWidth = 0)`: the y of the first
 * floor under x (± halfWidth) that a fall from fromY down to toY meets, or
 * null (landsAtBlocks() builds one from collision blocks). index.js drops Bombs on S, steps them with
 * advanceBombs() while playing (pauseBombs() otherwise, so they freeze while
 * paused), hits findBlastVictims() for each explosion and draws bombDrawList()
 * inside the camera transform (through globalThis.__bomb, bomb-bootstrap.mjs).
 *
 * Positions are world px; a Bomb's (x, y) is its base, where the Bomb sits on
 * the floor. Sprites draw at the game's 2× pixel scale.
 */

import { rectHitboxesOverlap } from './contactDamageHelpers.mjs'
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
    /** Fall acceleration, px/ms²: the King's gravity (0.5 px/frame², Player.js) at 60 fps. */
    gravity: 0.5 / (1000 / 60) ** 2,
    /** Fastest fall, px/ms (15 px/frame at 60 fps). */
    maxFallSpeed: 0.9,
    /** A drop this close above a floor is on the ground: it lands at once. */
    groundSnapPx: 1,
    /** A Bomb still falling after this long has left the level and is gone. */
    maxFallMs: 3000,
}

/** No Bomb live. */
export function createBombState() {
    return { bomb: null, lastNow: null }
}

/** The lands-at query for a drop with no query given: always on the ground. */
const onTheGround = (x, fromY) => fromY

/** A lit Bomb sitting at (x, y): its fuse starts now. */
function litBomb(x, y) {
    return { x, y, phase: 'fuse', t: 0 }
}

/**
 * Drops a Bomb with its base on `feet` ({ x, y, halfWidth? }). On the ground
 * (a floor within BOMB.groundSnapPx below any of the feet's width, by
 * `landsAt`) it sits on that floor and its fuse starts now, even at a ledge's
 * edge; otherwise it falls first. A falling Bomb is live too. Returns false,
 * changing nothing, while a Bomb is already live.
 */
export function tryDropBomb(state, feet, landsAt = onTheGround) {
    if (state.bomb) return false
    const floorY = landsAt(feet.x, feet.y, feet.y + BOMB.groundSnapPx, feet.halfWidth ?? 0)
    state.bomb = floorY == null ? { x: feet.x, y: feet.y, phase: 'fall', t: 0, vy: 0 } : litBomb(feet.x, floorY)
    return true
}

/**
 * A lands-at query over collision blocks ({ position, width, height }, with
 * position their top-left corner, as CollisionBlock draws and Player collides
 * them): the top of the highest block spanning x (± halfWidth) whose top lies
 * in [fromY, toY]. Blocks without a position (a broken Box's) are skipped.
 */
export function landsAtBlocks(blocks) {
    return (x, fromY, toY, halfWidth = 0) => {
        let floorY = null
        for (const block of blocks) {
            const top = block.position?.y
            if (typeof top !== 'number' || top < fromY || top > toY) continue
            if (x + halfWidth < block.position.x || x - halfWidth > block.position.x + block.width) continue
            if (floorY == null || top < floorY) floorY = top
        }
        return floorY
    }
}

/**
 * Moves a falling Bomb `dtMs` under gravity, sweeping its whole path this step
 * so it can't pass through a floor. On meeting one it sits there, lit, and
 * the rest of the step is returned for its fuse; otherwise returns 0.
 */
function fall(state, dtMs, landsAt) {
    const bomb = state.bomb
    bomb.t += dtMs
    bomb.vy = Math.min(BOMB.maxFallSpeed, bomb.vy + BOMB.gravity * dtMs)
    const toY = bomb.y + bomb.vy * dtMs
    const floorY = landsAt(bomb.x, bomb.y, toY)
    if (floorY != null) {
        // Constant speed within a step: landing came this share of the way through it.
        const share = toY > bomb.y ? Math.min(1, Math.max(0, (floorY - bomb.y) / (toY - bomb.y))) : 0
        state.bomb = litBomb(bomb.x, floorY)
        return dtMs * (1 - share)
    }
    if (bomb.t >= BOMB.maxFallMs) state.bomb = null
    else bomb.y = toY
    return 0
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

/** The lands-at query for a step with no query given: no floors. */
const noFloor = () => null

/**
 * Advances Bombs by `dtMs` through fall → fuse → boom → gone, a falling Bomb
 * landing where `landsAt` says. Returns the events that happened:
 * `{ type: 'explosion', rect }` once, as the fuse runs out.
 */
export function stepBombs(state, dtMs, landsAt = noFloor) {
    const events = []
    if (state.bomb?.phase === 'fall') {
        dtMs = fall(state, dtMs, landsAt)
        if (dtMs <= 0) return events
    }
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
export function advanceBombs(state, now, landsAt) {
    const dt = state.lastNow == null ? 0 : Math.min(BOMB.maxStepMs, Math.max(0, now - state.lastNow))
    state.lastNow = now
    return dt > 0 ? stepBombs(state, dt, landsAt) : []
}

/**
 * Who a blast `rect` (an explosion event's) catches (#74): the King (or null)
 * and the Pigs and Boxes whose hitboxes overlap it. Dead Pigs and broken
 * Boxes are left out; the King's hitCooldown is his own hit path's to check.
 */
export function findBlastVictims(rect, { king, pigs, boxes }) {
    const caught = entity => rectHitboxesOverlap(rect, entity.hitbox)
    return {
        king: king && caught(king) ? king : null,
        pigs: pigs.filter(pig => pig.hitpoints > 0 && caught(pig)),
        boxes: boxes.filter(box => !box.isBreaking && caught(box)),
    }
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

/**
 * Each phase's sheet: a falling Bomb is unlit (Bomb Off), the fuse loops
 * Bomb On, the boom plays Boooooom once.
 */
const PHASE_ART = {
    fall: { sheet: 'bombOff', frameAt: loopFrame },
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
