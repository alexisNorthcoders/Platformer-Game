/**
 * Tower Level rules (levels.js `tower: true`): the Long Fall and the camera
 * that follows the King up. Pure logic; index.js and Player.js reach it
 * through globalThis.__tower.
 */

/** Where the King sits in the view, as a share of its height from the top: a little below the middle. */
export const CAMERA_KING_SHARE = 0.6

/**
 * A Long Fall: airborne with his feet more than a screen below the last place
 * he had footing (world y, down is bigger). Exactly a screen is not yet one.
 */
export function isLongFall(lastFootingY, feetY, screenHeight) {
    return feetY - lastFootingY > screenHeight
}

/**
 * The camera (top-left of the view, whole pixels) that follows the King:
 * centred sideways, about 60% down the view vertically, clamped to the map.
 * `king` is his position { x, y }; `view` and `map` are { w, h } in px.
 */
export function cameraFollow(king, view, map) {
    const clamp = (v, max) => Math.round(Math.max(0, Math.min(v, max)))
    return {
        x: clamp(king.x - view.w / 2, map.w - view.w),
        y: clamp(king.y - view.h * CAMERA_KING_SHARE, map.h - view.h),
    }
}
