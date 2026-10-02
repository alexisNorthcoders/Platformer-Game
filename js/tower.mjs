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
 * The band of the view the King may move in while in the air without the
 * camera following, as shares of its height from the top. Past an edge, the
 * camera keeps him on it.
 */
export const CAMERA_BAND = { top: 0.25, bottom: 0.75 }

/** The share of the way to its goal the camera moves each frame. */
export const CAMERA_EASE = 0.1

/**
 * The camera (top-left of the view, whole pixels) that follows the King:
 * centred sideways, and clamped to the map. `king` is { x, y, grounded } (his
 * position, and whether he has footing); `view` and `map` are { w, h } in px.
 *
 * Vertically it keeps him about 60% down the view, but it only aims there
 * once he has footing, so a hop doesn't bob the whole view: in the air the
 * camera holds still while he stays inside CAMERA_BAND. It eases to its goal
 * over several frames. With no `previous` camera (a level start, a respawn)
 * it snaps to him.
 */
export function cameraFollow(king, view, map, previous) {
    const clamp = (v, max) => Math.round(Math.max(0, Math.min(v, max)))
    const maxY = map.h - view.h
    const x = clamp(king.x - view.w / 2, map.w - view.w)
    const goalY = clamp(king.y - view.h * CAMERA_KING_SHARE, maxY)
    if (!previous) return { x, y: goalY, goalY }

    const aimY = king.grounded ? goalY : previous.goalY
    const gap = aimY - previous.y
    let y = previous.y + Math.sign(gap) * Math.max(1, Math.round(Math.abs(gap) * CAMERA_EASE))
    if (Math.abs(gap) <= 1) y = aimY
    // Never let him leave the band, however far behind the easing is.
    y = Math.max(king.y - view.h * CAMERA_BAND.bottom, Math.min(y, king.y - view.h * CAMERA_BAND.top))
    return { x, y: clamp(y, maxY), goalY: aimY }
}
