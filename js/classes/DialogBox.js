class DialogBox extends Sprite {
    constructor({ imageSrc, frameRate, animations, loop }) {
        super({ imageSrc, frameRate, animations, loop })

        this.position = {
            x: 500,
            y: 200
        }

    }

    switchSprite(name) {

        if (this.image === this.animations[name].image) return

        this.currentFrame = 0
        this.image = this.animations[name].image
        this.frameRate = this.animations[name].frameRate
        this.frameBuffer = this.animations[name].frameBuffer
        this.loop = this.animations[name].loop
        this.currentAnimation = this.animations[name]
    }

}

