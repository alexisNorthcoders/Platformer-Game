// doorEntry and levelTimer are globals set by their *-bootstrap.mjs modules,
// loaded before this script in index.html.
function canPlayerEnterDoor() {
    return doorEntry.canEnterDoor({ hitbox: player.hitbox, doors, doorClosed })
}

function enterDoor() {
    player.velocity.x = 0
    player.velocity.y = 0
    player.preventInput = true
    levelTransitioning = true
    levelTimer.stop(performance.now())
    player.switchSprite('enterDoor')
}

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (typeof handleEscapeMenu === 'function' && handleEscapeMenu()) {
            event.preventDefault()
            return
        }
    }

    if (player.gameOver && (event.key === 'r' || event.key === 'R')) {
        event.preventDefault()
        if (window.restartFromGameOver) window.restartFromGameOver()
        return
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
    }
})