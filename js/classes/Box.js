class Box extends Sprite {
    constructor({ position, imageSrc, frameRate, animations, loop }) {
        super({ position, imageSrc, frameRate, animations, loop })

        this.collisionBlocks = [new CollisionBlock({ width: 22 * 2, height: 16 * 2, position })]
        console.log(this.collisionBlocks)

    }
    updateHitbox(scale = 2) {
        this.hitbox = {
            position: {
                x: this.position.x,
                y: this.position.y
            },
            width: 22 * scale,
            height: 16 * scale
        }
    }

    update(scale) {
        // blue box 
        // position debug
        /* c.fillStyle = 'rgba(0,0,255,0.3)'
        c.fillRect(this.position.x, this.position.y, this.width, this.height) */


        this.updateHitbox(scale)

        this.updateHitbox()
        // debug hitbox
        /* c.fillStyle = 'rgba(255, 0, 255, 0.33)'
        c.fillRect(
            this.hitbox.position.x,
            this.hitbox.position.y,
            this.hitbox.width,
            this.hitbox.height) */
    }


}

