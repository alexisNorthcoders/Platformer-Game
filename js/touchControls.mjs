/**
 * Touch controller core (#42): turns pointer events on the controller's zones
 * into held left / right / jump / attack / bomb. Pure; DOM wiring lives in
 * touchControls-bootstrap.mjs.
 *
 * Each pointer is tracked by pointerId, so multi-touch works and releasing or
 * cancelling one pointer only clears what that pointer held. On the movement
 * zone `x` is the finger's position as a fraction of the zone's width (0 = left
 * edge, 1 = right edge; values outside 0..1 are fine once the finger slides off),
 * so the thumb can slide from ◀ to ▶ without lifting.
 */

const ZONES = new Set(['move', 'jump', 'attack', 'bomb'])

// Held control -> entry in the game's `keys` object (see index.js).
const KEY_FOR = { left: 'a', right: 'd', jump: 'w', attack: 'space', bomb: 's' }

export function createTouchControls() {
    // pointerId -> { zone, x }
    const pointers = new Map()

    function held() {
        const state = Object.fromEntries(Object.keys(KEY_FOR).map(control => [control, false]))
        for (const { zone, x } of pointers.values()) {
            if (zone === 'move') state[x < 0.5 ? 'left' : 'right'] = true
            else state[zone] = true
        }
        return state
    }

    function release({ pointerId }) {
        pointers.delete(pointerId)
        return held()
    }

    return {
        held,
        pointerDown({ pointerId, zone, x = 0 }) {
            if (ZONES.has(zone)) pointers.set(pointerId, { zone, x })
            return held()
        },
        pointerMove({ pointerId, x }) {
            const pointer = pointers.get(pointerId)
            if (pointer) pointer.x = x
            return held()
        },
        pointerUp: release,
        pointerCancel: release,
        // Forget every pointer. Fingers still down stay ignored until lifted and
        // pressed again, so nothing sticks after pause / level start / restart.
        reset() {
            pointers.clear()
            return held()
        },
    }
}

/**
 * Write touch held state into the game's `keys`, touching only the keys whose
 * held state changed so keyboard input on the same device isn't clobbered.
 */
export function syncHeldToKeys(keys, prevHeld, nextHeld) {
    for (const [control, key] of Object.entries(KEY_FOR)) {
        if (prevHeld[control] !== nextHeld[control]) keys[key].pressed = nextHeld[control]
    }
}
