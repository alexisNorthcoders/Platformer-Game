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
