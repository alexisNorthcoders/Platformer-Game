import { createTouchControls, syncHeldToKeys } from './touchControls.mjs'
import { onHeldInputKeysCleared } from './sessionReset.mjs'

// Thin DOM wiring for the touch controller (#42). Loaded after index.js, which
// declares the global `keys` that Player.handleInput reads. The controller is
// only shown on touch devices in portrait (CSS in index.html); on desktop its
// elements are display:none and never receive pointer events.
//
// Manual check: on a phone in portrait the game sits on top with the controller
// below and no page scroll; ◀ ▶ run both ways and a thumb can slide between
// them; holding ▶ while tapping B jumps while running; holding A swings once.
const controller = document.getElementById('touch-controller')
const controls = createTouchControls()
let held = controls.held()

const heldIndicators = controller.querySelectorAll('[data-held]')

function apply(next) {
    syncHeldToKeys(keys, held, next)
    held = next
    for (const el of heldIndicators) el.classList.toggle('is-held', held[el.dataset.held])
}

// Finger x as a fraction of the zone's width (see touchControls.mjs).
function zoneX(el, event) {
    const rect = el.getBoundingClientRect()
    return rect.width ? (event.clientX - rect.left) / rect.width : 0
}

for (const el of controller.querySelectorAll('[data-zone]')) {
    const zone = el.dataset.zone
    el.addEventListener('pointerdown', (event) => {
        event.preventDefault()
        // Keep receiving this pointer's move/up even after it slides off the zone.
        el.setPointerCapture(event.pointerId)
        apply(controls.pointerDown({ pointerId: event.pointerId, zone, x: zoneX(el, event) }))
    })
    el.addEventListener('pointermove', (event) => {
        apply(controls.pointerMove({ pointerId: event.pointerId, x: zoneX(el, event) }))
    })
    el.addEventListener('pointerup', (event) => {
        apply(controls.pointerUp({ pointerId: event.pointerId }))
    })
    for (const type of ['pointercancel', 'lostpointercapture']) {
        el.addEventListener(type, (event) => {
            apply(controls.pointerCancel({ pointerId: event.pointerId }))
        })
    }
}

controller.addEventListener('contextmenu', (event) => event.preventDefault())

// Pause, level start and restart clear `keys`; drop touch state with them so a
// finger that was down then can't leave a key stuck.
onHeldInputKeysCleared(() => apply(controls.reset()))
