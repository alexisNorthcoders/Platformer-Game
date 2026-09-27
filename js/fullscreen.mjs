/**
 * Fullscreen toggle for the pause menu (#46). Offered only on touch devices
 * whose browser supports the Fullscreen API (Android Chrome, not iPhone Safari);
 * desktop has F11. The whole page goes fullscreen so the touch controller comes
 * with the canvas; mobile-bootstrap.mjs refits both on `fullscreenchange`.
 */
export function isFullscreenAvailable(doc, isTouch) {
    if (!isTouch) return false
    const enabled = doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled
    // An explicit flag wins (iPhone Safari reports false); older prefixed
    // browsers expose only the methods, so fall back to those.
    if (enabled !== undefined) return Boolean(enabled)
    const el = doc.documentElement
    return Boolean(
        (el?.requestFullscreen || el?.webkitRequestFullscreen) &&
        (doc.exitFullscreen || doc.webkitExitFullscreen)
    )
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
