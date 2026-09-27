/**
 * CSS display size for the canvas: the largest size that fits the viewport at
 * the canvas's native aspect ratio, never larger than native (so desktop stays
 * at 1024×576). Only the displayed size changes; the drawing buffer stays native
 * and menu hit-testing maps back via canvasLogicalCoords.
 */
export function fitCanvasSize(viewportWidth, viewportHeight, nativeWidth, nativeHeight) {
    const scale = Math.max(0, Math.min(1, viewportWidth / nativeWidth, viewportHeight / nativeHeight))
    return {
        width: Math.floor(nativeWidth * scale),
        height: Math.floor(nativeHeight * scale),
    }
}

/**
 * Viewport height the touch controller takes away from the canvas, given its
 * computed style. In the portrait split it sits in the page flow below the game
 * and reserves its min-height; in the landscape overlay it is position:fixed
 * over the game and reserves nothing; hidden (desktop) reserves nothing.
 */
export function controllerReservedHeight({ display, position, minHeight }) {
    if (display === 'none' || position === 'fixed' || position === 'absolute') return 0
    return parseFloat(minHeight) || 0
}
