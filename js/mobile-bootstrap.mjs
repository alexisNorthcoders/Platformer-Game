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
const cancel = (e) => e.preventDefault()
document.addEventListener('contextmenu', cancel)
document.addEventListener('dblclick', cancel)
document.addEventListener('selectstart', cancel)
document.addEventListener('gesturestart', cancel)
document.addEventListener('gesturechange', cancel)
document.addEventListener('touchmove', cancel, { passive: false })

if (typeof audioContext !== 'undefined') unlockAudioOnFirstGesture(window, audioContext)
