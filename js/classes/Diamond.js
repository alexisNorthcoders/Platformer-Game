class Diamond extends Sprite {
    constructor({ imageSrc, frameRate, animations, loop }) {
        super({ imageSrc, frameRate, animations, loop })

        this.position = {
            x: 500,
            y: 200
        }

        this.collisionBlocks = []

    }
    updateHitbox() {
        this.hitbox = {
            position: {
                x: this.position.x + 23,
                y: this.position.y + 30
            },
            width: 37,
            height: 28
        }
    }

    update() {
        // blue box 
        //c.fillStyle = 'rgba(0,0,255,0.3)'
        //c.fillRect(this.position.x,this.position.y,2*this.width,2*this.height)  


        this.updateHitbox()

        // debug hitbox
        if (debugCollisions) {
            c.fillStyle = 'rgba(248, 8, 120, 0.56)'
            c.fillRect(
                this.hitbox.position.x,
                this.hitbox.position.y,
                this.hitbox.width,
                this.hitbox.height)
        }
    }
}

