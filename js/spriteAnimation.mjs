/**
 * Sprite-sheet animation shared by the Title Scene and the Bomb module: the
 * Bomb sheets and the frame-timing helpers. Pure: no DOM or canvas.
 *
 * A sheet is one row of `frames` frames, each w×h source px, with an anchor
 * (source px) that is placed on an actor's (x, y).
 */

/** The game draws its sprites at 2× pixel scale. */
export const SPRITE_SCALE = 2

/** Every sheet in the pack plays at this rate. */
export const FRAME_MS = 100

/** Bomb frames: the Bomb's base is at (26, 39); explosions centre on it. */
export const BOMB_SHEETS = {
    bombOff: { src: 'Sprites/09-Bomb/Bomb Off.png', frames: 1, w: 52, h: 56, anchorX: 26, anchorY: 39 },
    bombOn: { src: 'Sprites/09-Bomb/Bomb On (52x56).png', frames: 4, w: 52, h: 56, anchorX: 26, anchorY: 39 },
    boom: { src: 'Sprites/09-Bomb/Boooooom (52x56).png', frames: 6, w: 52, h: 56, anchorX: 26, anchorY: 39 },
}

/** How long `loops` plays of `sheet`'s animation take. */
export function playMs(sheet, loops = 1) {
    return sheet.frames * FRAME_MS * loops
}

/** Frame index `ms` into a looping animation. */
export function loopFrame(ms, frames, frameMs = FRAME_MS) {
    return Math.floor(ms / frameMs) % frames
}

/** Frame index `ms` into a play-once animation (holds the last frame). */
export function onceFrame(ms, frames, frameMs = FRAME_MS) {
    return Math.min(frames - 1, Math.floor(ms / frameMs))
}

/**
 * drawImage arguments for `frame` of `sheet` with its anchor on (x, y),
 * mirrored when `flip` (the pack's sprites face left). Whole pixels.
 */
export function spriteDrawRect(sheet, frame, x, y, flip, scale = SPRITE_SCALE) {
    const anchorX = flip ? sheet.w - sheet.anchorX : sheet.anchorX
    return {
        src: sheet.src,
        sx: frame * sheet.w,
        sy: 0,
        sw: sheet.w,
        sh: sheet.h,
        dx: Math.round(x - anchorX * scale),
        dy: Math.round(y - sheet.anchorY * scale),
        dw: sheet.w * scale,
        dh: sheet.h * scale,
        flip,
    }
}
