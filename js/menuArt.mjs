/**
 * Menu art from the Kings and Pigs pack and the menu pixel font (#63).
 * Drawn by index.js through globalThis.__menuArt (menuArt-bootstrap.mjs).
 */

/** Every menu piece is drawn at the game's 2× pixel scale. */
export const MENU_ART_SCALE = 2

/**
 * Columns of Sprites/14-TileSets/platform.png (rows 5–19) that make the plank
 * button: the left cap and foot, one plain plank column, the right foot and
 * cap. index.js copies them side by side into a 36×15 image, the source of
 * PLANK_FRAME, so the plank's middle is that single column.
 */
export const PLANK_SOURCE = {
    y: 5,
    h: 15,
    columns: [
        { x: 3, w: 17 },
        { x: 29, w: 1 },
        { x: 81, w: 18 },
    ],
}

/**
 * The plank button as a 9-slice of the 36×15 image. Its middle row (row 10 of
 * platform.png) sits between the rivets on the caps; the bottom inset keeps
 * the shading, shadow and feet.
 */
export const PLANK_FRAME = { x: 0, y: 0, w: 36, h: 15, left: 17, top: 5, right: 18, bottom: 9 }

/** Rows under the plank's face (outline, shadow, feet); text centres above them. */
export const PLANK_FOOT_ROWS = 5

/**
 * The brick frame from Sprites/14-TileSets/Terrain (32x32).png: the 3×3 tile
 * room at (32, 32), with 32px corners and one-tile edges repeated along the
 * sides. From the outside in: the pale stone border, a red brick ring, then
 * the dark wall that fills the middle.
 */
export const BRICK_FRAME = { x: 32, y: 32, w: 96, h: 96, left: 32, top: 32, right: 32, bottom: 32 }

/** Source px of BRICK_FRAME's pale stone border; the Level Preview covers the rest. */
export const BRICK_BORDER = 10

/** Source px from BRICK_FRAME's outside to its dark middle, where panel content sits. */
export const BRICK_INSET = 25

/** The dark wall inside BRICK_FRAME. */
export const PANEL_FILL = '#3f3851'

export const PIXEL_FONT_FAMILY = 'Press Start 2P'

/** Canvas font for the pixel font; `size` should be a multiple of 8 to stay crisp. */
export function pixelFont(size) {
    return `${size}px "${PIXEL_FONT_FAMILY}"`
}

/**
 * Resolves once the pixel font can be drawn (true), or after `timeoutMs`
 * without it (false), so a missing font never stops the game from starting.
 */
export function waitForPixelFont(fontFaceSet, { timeoutMs = 3000, setTimer = setTimeout } = {}) {
    if (!fontFaceSet?.load) return Promise.resolve(false)
    const loaded = fontFaceSet.load(pixelFont(16)).then(
        faces => faces.length > 0,
        () => false,
    )
    const timedOut = new Promise(resolve => setTimer(() => resolve(false), timeoutMs))
    return Promise.race([loaded, timedOut])
}

/** Centre of a plank button's face (above its shadow and feet) in `rect`. */
export function plankFaceCentre(rect, scale = MENU_ART_SCALE) {
    return {
        x: rect.x + rect.w / 2,
        y: rect.y + (rect.h - PLANK_FOOT_ROWS * scale) / 2,
    }
}

/** Where to draw BRICK_FRAME so its stone border runs just outside `rect`. */
export function frameAround(rect, scale = MENU_ART_SCALE) {
    const b = BRICK_BORDER * scale
    return { x: rect.x - b, y: rect.y - b, w: rect.w + b * 2, h: rect.h + b * 2 }
}
