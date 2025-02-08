class Diamond extends Sprite {
    constructor({ position, imageSrc, frameRate, animations, loop }) {
        super({ position, imageSrc, frameRate, animations, loop })
    }
    updateHitbox() {
        this.hitbox = {
            position: {
                x: this.position.x,
                y: this.position.y
            },
            width: 2 * this.width,
            height: 2 * this.height
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

    switchSprite(name) {

        if (this.image === this.animations[name].image) return

        else if (!this.hitCooldown) {

            this.currentFrame = 0
            this.image = this.animations[name].image
            this.frameRate = this.animations[name].frameRate
            this.frameBuffer = this.animations[name].frameBuffer
            this.loop = this.animations[name].loop
            this.currentAnimation = this.animations[name]
        }
    }
}

