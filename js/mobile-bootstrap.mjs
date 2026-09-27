import { controllerReservedHeight, fitCanvasSize } from './canvasFit.mjs'
import { unlockAudioOnFirstGesture } from './audioUnlock.mjs'

// Loaded after index.js (canvas sized to native 1024×576) and audio.js
// (global `audioContext`).
const canvas = document.querySelector('canvas')
const touchController = document.getElementById('touch-controller')

function fitCanvasToViewport() {
    // Touch portrait: the controller sits below the game, so keep its height free.
    // Touch landscape: it overlays the game, which gets the full height.
    const reserved = touchController ? controllerReservedHeight(getComputedStyle(touchController)) : 0
    const availableHeight = window.innerHeight - reserved
    const { width, height } = fitCanvasSize(window.innerWidth, availableHeight, canvas.width, canvas.height)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
}

fitCanvasToViewport()
window.addEventListener('resize', fitCanvasToViewport)
window.addEventListener('orientationchange', () => requestAnimationFrame(fitCanvasToViewport))
window.visualViewport?.addEventListener('resize', fitCanvasToViewport)
// Entering or leaving fullscreen (#46), including via the system back gesture,
// changes the viewport; most browsers also fire resize, but not reliably before
// the new size settles, so refit on the change itself too.
//
// Manual check (#46), Android Chrome: pause, tap Fullscreen (top right) and the
// browser UI hides with canvas and controller refitted in both orientations;
// tap Exit Fullscreen, and separately leave via the back gesture, and both
// refit back. On iPhone Safari and desktop the button never appears.
document.addEventListener('fullscreenchange', fitCanvasToViewport)
document.addEventListener('webkitfullscreenchange', fitCanvasToViewport)

// Stop the page behaving like a web page under touch. CSS touch-action /
// overscroll-behavior cover most browsers; iOS Safari ignores user-scalable=no
// and needs its gesture events and touchmove cancelled.
//
// Manual check (#40): on a phone, the whole canvas is visible with no scroll;
// pinch, double-tap, long-press and pull-down do nothing; rotating rescales;
// Start / Level taps register; sound plays after the first tap.
//
// Only the bare page (html, body, canvas) is suppressed. Menu hit-testing maps
// taps back to logical coords via canvasLogicalCoords (menuGeometry.mjs), and
// any future overlay or control element keeps its own touch behaviour.
const BROWSER_DEFAULTS_TO_SUPPRESS = ['contextmenu', 'selectstart', 'gesturestart', 'gesturechange', 'touchmove']
const PAGE_ROOT = new Set([document.documentElement, document.body, canvas])
const suppressBrowserDefault = (e) => {
    if (PAGE_ROOT.has(e.target)) e.preventDefault()
}
for (const type of BROWSER_DEFAULTS_TO_SUPPRESS) {
    document.addEventListener(type, suppressBrowserDefault, { passive: false })
}

if (typeof audioContext !== 'undefined') unlockAudioOnFirstGesture(window, audioContext)
