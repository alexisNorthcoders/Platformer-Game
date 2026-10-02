// doorEntry and levelTimer are globals set by their *-bootstrap.mjs modules,
// loaded before this script in index.html; bombLib and bombs come from
// index.js. Shared by keyboard ↑ and the touch
// controller's Enter button (touchControls-bootstrap.mjs).
function canPlayerEnterDoor() {
    return doorEntry.canEnterDoor({ hitbox: player.hitbox, doors, doorClosed, preventInput: player.preventInput })
}

function enterDoor() {
    player.velocity.x = 0
    player.velocity.y = 0
    player.preventInput = true
    levelTransitioning = true
    levelTimer.stop(performance.now())
    player.switchSprite('enterDoor')
    // Nothing goes off or carries over while the King walks through.
    bombLib.clearBombs(bombs)
    bossBombs.length = 0
}

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (typeof handleEscapeMenu === 'function' && handleEscapeMenu()) {
            event.preventDefault()
            return
        }
    }

    if (player.preventInput) return


    switch (event.key) {
        case 'ArrowUp':
            if (canPlayerEnterDoor()) {
                enterDoor()
                return
            }
            keys.w.pressed = true;
            break
        case 'ArrowLeft':
            // move left
            keys.a.pressed = true
            break
        case 'ArrowRight':
            // move right
            keys.d.pressed = true
            break
        case ' ':
            // hit
            keys.space.pressed = true;
            break;
        case 's':
        case 'S':
            // drop a Bomb
            keys.s.pressed = true
            break
        case '+':
            // hit
            debugCollisions = true;
            break;
        case '-':
            // hit
            debugCollisions = false;
            break;
        case 'h':
            // hello
            player.hello()
    }
})
window.addEventListener('keyup', (event) => {

    switch (event.key) {
        case 'ArrowLeft':
            // move left
            keys.a.pressed = false
            break
        case 'ArrowRight':
            // move right
            keys.d.pressed = false
            break
        case 'ArrowUp':
            // jump
            keys.w.pressed = false
            break
        case ' ':
            // hit
            keys.space.pressed = false
            break
        case 's':
        case 'S':
            keys.s.pressed = false
            break
    }
})