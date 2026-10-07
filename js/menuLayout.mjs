/**
 * Menu layouts in logical canvas px (1024×576; CSS scaling keeps the
 * proportions). The Title Screen, Pause Menu and Game Over Screen each own theirs, so one can
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
    // Personal Best line, centred along the bottom edge inside the Level Preview.
    previewBest: { x: 276, y: 344 },
    panel: { x: 544, y: 96, w: 448, h: 292 },
    // "LEVEL" caption above the selector, centred on the panel.
    levelCaption: { x: 768, y: 176 },
    prevBtn: { x: 606, y: 200, w: 72, h: 52 },
    nextBtn: { x: 858, y: 200, w: 72, h: 52 },
    playBtn: { x: 658, y: 270, w: 220, h: 60 },
}

// Pause Menu (#65): a brick panel centred over the dimmed, frozen level with
// a "PAUSED" caption and the three buttons stacked in keyboard order.
export const PAUSE_MENU = {
    panel: { x: 288, y: 100, w: 448, h: 364 },
    caption: { x: 512, y: 190 },
    resumeBtn: { x: 360, y: 218, w: 304, h: 52 },
    restartBtn: { x: 360, y: 278, w: 304, h: 52 },
    quitBtn: { x: 360, y: 338, w: 304, h: 52 },
    // Touch devices with the Fullscreen API only (#46). Top right: the
    // landscape touch controller (pause button included) overlays the bottom
    // of the canvas, so a button under the others would sit beneath it.
    fullscreenBtn: { x: 684, y: 12, w: 320, h: 52 },
}

// Game Over Screen (#89): the Pause Menu's brick panel and planks over the
// dimmed, frozen level, with the "GAME OVER" heading, the level's name and the
// two buttons stacked in keyboard order. No Fullscreen button.
export const GAME_OVER_SCREEN = {
    panel: { x: 288, y: 120, w: 448, h: 300 },
    caption: { x: 512, y: 190 },
    levelName: { x: 512, y: 226 },
    retryBtn: { x: 360, y: 258, w: 304, h: 52 },
    quitBtn: { x: 360, y: 318, w: 304, h: 52 },
}
