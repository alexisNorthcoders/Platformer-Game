/**
 * Fullscreen toggle for the pause menu (#46). Offered only on touch devices
 * whose browser supports the Fullscreen API (Android Chrome, not iPhone Safari);
 * desktop has F11. The whole page goes fullscreen so the touch controller comes
 * with the canvas; mobile-bootstrap.mjs refits both on `fullscreenchange`.
 */
export function isFullscreenAvailable(doc, isTouch) {
    return Boolean(isTouch && (doc.fullscreenEnabled || doc.webkitFullscreenEnabled))
}

export function isFullscreen(doc) {
    return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement)
}

export function toggleFullscreen(doc) {
    const el = doc.documentElement
    const result = isFullscreen(doc)
        ? (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(doc)
        : (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el)
    // Browsers may refuse (no user activation, policy); the menu just stays put.
    result?.catch?.(() => {})
}
