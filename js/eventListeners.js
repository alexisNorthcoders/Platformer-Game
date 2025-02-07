window.addEventListener('keydown', (event) => {
    if (player.preventInput) return


    switch (event.key) {
        case 'ArrowUp':

            for (let i = 0; i < doors.length; i++) {
                const door = doors[i]
                if (player.hitbox.position.x + player.hitbox.width <= door.position.x + 2 * door.width &&
                    player.hitbox.position.x >= door.position.x &&
                    player.hitbox.position.y + player.hitbox.height >= door.position.y &&
                    player.hitbox.position.y <= door.position.y + 2 * door.height
                ) {
                    player.velocity.x = 0
                    player.velocity.y = 0
                    player.preventInput = true
                    player.switchSprite('enterDoor')
                    door.play()
                    return
                }

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