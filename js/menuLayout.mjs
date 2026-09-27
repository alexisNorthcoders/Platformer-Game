/**
 * Menu layouts in logical canvas px (1024×576; CSS scaling keeps the
 * proportions). The Title Screen and Pause Menu each own theirs, so one can
 * change without moving the other (#61).
 *
 * Buttons are plank 9-slices at 2× (#63), so each must be at least the plank's
 * corners (70×28) and have even sides; menuArt.test.mjs checks this.
 */

// Title Screen (#62, #63): Level Preview in its stone frame on the left, the
// brick panel with the level selector and PLAY on the right. The logo sits
// above both at y 28–56.
export const TITLE_SCREEN = {
    // 16:9 like the level images; its frame runs 20px outside it.
    preview: { x: 52, y: 116, w: 448, h: 252 },
    panel: { x: 544, y: 96, w: 448, h: 292 },
    // "LEVEL" caption above the selector, centred on the panel.
    levelCaption: { x: 768, y: 176 },
    prevBtn: { x: 606, y: 200, w: 72, h: 52 },
    nextBtn: { x: 858, y: 200, w: 72, h: 52 },
    playBtn: { x: 658, y: 270, w: 220, h: 60 },
}

export const PAUSE_MENU = {
    preview: { x: 227, y: 96, w: 570, h: 208 },
    startBtn: { x: 287, y: 344, w: 450, h: 52 },
    levelBtn: { x: 287, y: 406, w: 450, h: 52 },
    // Touch devices with the Fullscreen API only (#46). Top right: the
    // landscape touch controller (pause button included) overlays the bottom
    // of the canvas, so a button under Level would sit beneath it.
    fullscreenBtn: { x: 684, y: 12, w: 320, h: 52 },
}
