/**
 * Logical canvas coordinates from a pointer event and the canvas layout rect.
 * Matches index.js menu hit-testing when the canvas is CSS-scaled.
 *
 * Manual check (no automated browser harness here): resize the window so the
 * canvas letterboxes, click just inside each button edge on both axes, and
 * confirm ◀ / ▶ / PLAY (Title Screen) and Start / Level (Pause Menu) still
 * register; clicks a few px outside should not.
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

/** Which Title Screen control a logical point hits: 'prev' | 'next' | 'play' | null. */
export function titleScreenHitTarget(px, py, layout) {
    if (layout.prevBtn && pointInRect(px, py, layout.prevBtn)) return 'prev'
    if (layout.nextBtn && pointInRect(px, py, layout.nextBtn)) return 'next'
    if (layout.playBtn && pointInRect(px, py, layout.playBtn)) return 'play'
    return null
}

/** Title Screen keyboard: ←/→ step the level, Enter/Space play. Same targets as the hit-test. */
export function titleScreenKeyTarget(key) {
    if (key === 'ArrowLeft') return 'prev'
    if (key === 'ArrowRight') return 'next'
    if (key === 'Enter' || key === ' ') return 'play'
    return null
}

/** Level `delta` steps from `current` in 1..`count`, wrapping at both ends. */
export function stepLevel(current, delta, count) {
    if (count < 1) return current
    return ((((current - 1 + delta) % count) + count) % count) + 1
}

/**
 * Centred source crop of an `sw`×`sh` image with the aspect ratio of a
 * `dw`×`dh` frame, so drawing it into the frame covers it without spilling out.
 */
export function coverSourceRect(sw, sh, dw, dh) {
    const scale = Math.max(dw / sw, dh / sh)
    const cw = dw / scale
    const ch = dh / scale
    return { sx: (sw - cw) / 2, sy: (sh - ch) / 2, sw: cw, sh: ch }
}

/**
 * Which Pause Menu button a logical point hits: 'start' | 'level' | 'fullscreen' | null.
 * The Fullscreen button (#46) only exists while `showFullscreen` is true (a
 * touch device that supports the Fullscreen API).
 */
export function pauseMenuHitTarget(px, py, layout, { showFullscreen = false } = {}) {
    if (pointInRect(px, py, layout.startBtn)) return 'start'
    if (pointInRect(px, py, layout.levelBtn)) return 'level'
    if (showFullscreen && pointInRect(px, py, layout.fullscreenBtn)) return 'fullscreen'
    return null
}
