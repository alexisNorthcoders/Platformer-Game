class Sprite {
    constructor({
        position,
        imageSrc,
        frameRate = 1,
        animations,
        frameBuffer = 2,
        loop = true,
        autoplay = true,
        width,
        random = false,
        randomInterval = [0, 15000]
    }) {
        this.position = position
        this.width = width
        this.image = new Image()
        this.image.onload = () => {
            this.loaded = true
            this.width = this.image.width / this.frameRate
            this.height = this.image.height

        }
        this.image.src = imageSrc
        this.loaded = false
        this.frameRate = frameRate
        this.currentFrame = 0
        this.elapsedFrames = 0
        this.frameBuffer = frameBuffer
        this.animations = animations
        this.loop = loop
        this.autoplay = autoplay
        this.currentAnimation
        this.opacity = 1
        this.runOnce = false
        this.randomInterval = randomInterval
        this.random = random

        if (this.random) {
            this.scheduleRandomAnimation();
        }

        if (this.animations) {
            for (let key in this.animations) {
                const image = new Image()
                image.src = this.animations[key].imageSrc
                this.animations[key].image = image
            }

        }
    }

    scheduleRandomAnimation() {
        const delay = Math.random() * (this.randomInterval[1] - this.randomInterval[0]) + this.randomInterval[0];
        setTimeout(() => {
            this.playOnce();
            this.scheduleRandomAnimation();
        }, delay);
    }

    draw(scale = 1) {
        if (!this.loaded || this.opacity <= 0) return

        const cropbox = {
            position: {
                x: this.width * this.currentFrame,
                y: 0
            },
            width: this.width,
            height: this.height
        }

        c.save()
        c.globalAlpha = this.opacity;

        if (this.flip) {
            c.scale(-1, 1)
            c.drawImage(
                this.image,
                cropbox.position.x,
                cropbox.position.y,
                cropbox.width,
                cropbox.height,
                -this.position.x - this.width * scale + 30,
                this.position.y,
                this.width * scale,
                this.height * scale
            )
        } else {
            c.drawImage(
                this.image,
                cropbox.position.x,
                cropbox.position.y,
                cropbox.width,
                cropbox.height,
                this.position.x,
                this.position.y,
                this.width * scale,
                this.height * scale
            )
        }

        c.restore()
        this.updateFrames()
    }
    playOnce() {
        this.runOnce = true
        this.autoplay = true
    }
    play() {
        this.autoplay = true
    }

    updateFrames() {
        if (!this.autoplay) return
        this.elapsedFrames++
        if (this.elapsedFrames % this.frameBuffer === 0) {
            if (this.currentFrame < this.frameRate - 1) this.currentFrame++
            else if (this.loop || this.runOnce) {
                if (this.runOnce) {
                    this.runOnce = false
                    this.autoplay = false
                }

                this.currentFrame = 0
            }
        }

        if (this.currentAnimation?.onComplete) {
            if (this.currentFrame === this.frameRate - 1 && !this.currentAnimation.isActive) {
                this.currentAnimation.onComplete()
                this.currentAnimation.isActive = true
            }
        }
    }
    fade(speed = 0.05) {
        const fadeInterval = setInterval(() => {
            this.opacity -= speed;
            if (this.opacity <= 0) {
                this.opacity = 0;
                this.loaded = false;
                clearInterval(fadeInterval);
            }
        }, 50);
    }
}