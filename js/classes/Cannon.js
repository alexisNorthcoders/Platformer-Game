class Cannon extends Sprite {
    constructor({ autoplay, frameBuffer, position, imageSrc, frameRate, animations, loop }) {
        super({ frameBuffer, position, imageSrc, frameRate, animations, loop, autoplay })

        this.ball
    }

    switchSprite(name) {

        if (this.image === this.animations[name].image) return

        else {

            this.currentFrame = 0
            this.image = this.animations[name].image
            this.frameRate = this.animations[name].frameRate
            this.frameBuffer = this.animations[name].frameBuffer
            this.loop = this.animations[name].loop
            this.currentAnimation = this.animations[name]
        }
    }

    shoot() {
        this.switchSprite('shoot')
        this.cannonBall()
        this.currentAnimation = {
            onComplete: () => {
                this.switchSprite('idle')
            }
        };
    }

    cannonBall() {
        this.ball = new CannonBall({
            position: { x: this.position.x - 20, y: this.position.y - 7 },
            velocity: { x: -7, y: 0 },
            rotation: Math.random() * 360
        });
        this.ball.collisionBlocks = collisionBlocks

    }

    update() {
        if (this.ball) {
            this.ball.update()
        }
    }

    draw(scale) {
        super.draw(scale);
        if (this.ball) {
            this.ball.draw(scale)
        }

    }
}
