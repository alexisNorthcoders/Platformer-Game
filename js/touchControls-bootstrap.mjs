import { createTouchControls, syncHeldToKeys } from './touchControls.mjs'
import { onHeldInputKeysCleared } from './sessionReset.mjs'

// Thin DOM wiring for the touch controller (#42). Loaded after index.js, which
// declares the global `keys` that Player.handleInput reads. The controller is
// only shown on touch devices (CSS in index.html): below the game in portrait,
// overlaid on its bottom corners in landscape (#43). On desktop its elements
// are display:none and never receive pointer events.
//
// Manual check: on a phone in portrait the game sits on top with the controller
// below and no page scroll; ◀ ▶ run both ways and a thumb can slide between
// them; holding ▶ while tapping B jumps while running; holding A swings once.
// In landscape the game fills the height with the same controls semi-transparent
// in the bottom corners, clear of the HUD. Rotating while holding ▶ switches
// layout live and the player stops (no key stuck).
//
// Enter (#44): the door button above B shows only while the player stands at
// an open door (and input isn't blocked), in both layouts. Tapping it enters
// through the same canPlayerEnterDoor/enterDoor as keyboard ↑ (globals from
// eventListeners.js). B only ever jumps, even at a door.
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

for (const el of controller.querySelectorAll('[data-zone]:not([data-zone="enter"])')) {
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

const enterButton = controller.querySelector('[data-zone="enter"]')

enterButton.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    if (canPlayerEnterDoor()) enterDoor()
})

// Door overlap changes as the player moves, so re-check every frame. The check
// is a few rect comparisons; on desktop the button is inside a display:none
// controller, so toggling it costs nothing.
function syncEnterButton() {
    requestAnimationFrame(syncEnterButton)
    const hidden = !canPlayerEnterDoor()
    if (enterButton.hidden !== hidden) enterButton.hidden = hidden
}
syncEnterButton()

controller.addEventListener('contextmenu', (event) => event.preventDefault())

// Pause, level start and restart clear `keys`; drop touch state with them so a
// finger that was down then can't leave a key stuck.
onHeldInputKeysCleared(() => apply(controls.reset()))

// Rotating swaps layouts (portrait split <-> landscape overlay) under a finger
// that may be mid-press, so its up event can go missing; drop touch state so
// nothing stays held. Keyboard keys are untouched.
matchMedia('(orientation: portrait)').addEventListener('change', () => apply(controls.reset()))
