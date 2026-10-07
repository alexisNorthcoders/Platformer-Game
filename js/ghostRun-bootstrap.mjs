import { createGhostRecorder, ghostFrameAt, packRun, unpackRun } from './ghostRecorder.mjs'
import { createGhostRunStore, levelFingerprint } from './ghostRun.mjs'

let storage = null
try {
    storage = globalThis.localStorage ?? null
} catch {
    // Storage blocked: Personal Bests last only until the page closes.
}
if (!storage) {
    const memory = new Map()
    storage = {
        getItem: key => memory.get(key) ?? null,
        setItem: (key, value) => memory.set(key, String(value)),
    }
}

globalThis.ghostRunStore = createGhostRunStore(storage)
globalThis.levelFingerprint = levelFingerprint

globalThis.ghostRecorder = createGhostRecorder()
globalThis.ghostPlayback = { ghostFrameAt, packRun, unpackRun }
