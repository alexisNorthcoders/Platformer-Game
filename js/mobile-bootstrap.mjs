import { fitCanvasSize } from './canvasFit.mjs'
import { unlockAudioOnFirstGesture } from './audioUnlock.mjs'

// Loaded after index.js (canvas sized to native 1024×576) and audio.js
// (global `audioContext`).
const canvas = document.querySelector('canvas')

function fitCanvasToViewport() {
    const { width, height } = fitCanvasSize(window.innerWidth, window.innerHeight, canvas.width, canvas.height)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
}

fitCanvasToViewport()
window.addEventListener('resize', fitCanvasToViewport)
window.addEventListener('orientationchange', () => requestAnimationFrame(fitCanvasToViewport))
window.visualViewport?.addEventListener('resize', fitCanvasToViewport)

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
