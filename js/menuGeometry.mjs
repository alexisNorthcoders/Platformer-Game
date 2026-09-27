/**
 * Logical canvas coordinates from a pointer event and the canvas layout rect.
 * Matches index.js menu hit-testing when the canvas is CSS-scaled.
 *
 * Manual check (no automated browser harness here): resize the window so the
 * canvas letterboxes, click just inside each button edge on both axes, and
 * confirm Start / Level still register; clicks a few px outside should not.
 */
export function pointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h
}

export function canvasLogicalCoords(clientX, clientY, boundingRect, canvasWidth, canvasHeight) {
    const scaleX = canvasWidth / boundingRect.width
    const scaleY = canvasHeight / boundingRect.height
    return {
        x: (clientX - boundingRect.left) * scaleX,
        y: (clientY - boundingRect.top) * scaleY,
    }
}

/**
 * Which menu button a logical point hits: 'start' | 'level' | 'fullscreen' | null.
 * The Fullscreen button (#46) only exists while `showFullscreen` is true (pause
 * menu on a touch device that supports the Fullscreen API).
 */
export function menuHitTarget(px, py, menu, { showFullscreen = false } = {}) {
    if (pointInRect(px, py, menu.startBtn)) return 'start'
    if (pointInRect(px, py, menu.levelBtn)) return 'level'
    if (showFullscreen && pointInRect(px, py, menu.fullscreenBtn)) return 'fullscreen'
    return null
}
