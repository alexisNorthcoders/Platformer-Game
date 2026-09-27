import * as fullscreen from './fullscreen.mjs'

if (typeof globalThis !== 'undefined') {
    globalThis.__fullscreen = fullscreen
}
