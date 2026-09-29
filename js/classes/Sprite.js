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
        this.flipOffsetX = 0 // art px; negative moves flipped drawing left
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
        // After switchSprite(), this.image may point at a different sheet than the one
        // that fired the constructor onload. Wait for the active image and size the
        // crop from it so enemies (fall/jump/attack, etc.) render on a cold cache load.
        if (!this.image.complete || this.image.naturalWidth === 0) return

        this.width = this.image.naturalWidth / this.frameRate
        this.height = this.image.naturalHeight

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

        // Tint off-screen: on the main canvas source-atop would tint every opaque
        // pixel under the frame (background, tiles), not just the character.
        const tint = this.activeHurtTint()
        const source = tint
            ? this.tintedFrame(cropbox, tint)
            : { image: this.image, x: cropbox.position.x, y: cropbox.position.y }

        if (this.flip) c.scale(-1, 1)
        c.drawImage(
            source.image,
            source.x,
            source.y,
            cropbox.width,
            cropbox.height,
            this.flip ? -this.position.x - this.width * scale - this.flipOffsetX * scale : this.position.x,
            this.position.y,
            this.width * scale,
            this.height * scale
        )

        c.restore()
        this.updateFrames()
    }
    activeHurtTint() {
        return this.hurtTint
    }
    tintedFrame(cropbox, tint) {
        if (!Sprite.tintCanvas) Sprite.tintCanvas = document.createElement('canvas')
        const canvas = Sprite.tintCanvas
        // Canvas sizes are integers; round up so fractional frame widths still fit.
        const width = Math.ceil(cropbox.width)
        const height = Math.ceil(cropbox.height)
        if (canvas.width !== width) canvas.width = width
        if (canvas.height !== height) canvas.height = height

        const tintCtx = canvas.getContext('2d')
        tintCtx.clearRect(0, 0, cropbox.width, cropbox.height)
        tintCtx.drawImage(
            this.image,
            cropbox.position.x,
            cropbox.position.y,
            cropbox.width,
            cropbox.height,
            0,
            0,
            cropbox.width,
            cropbox.height
        )
        tintCtx.globalCompositeOperation = 'source-atop'
        tintCtx.fillStyle = tint
        tintCtx.fillRect(0, 0, cropbox.width, cropbox.height)
        tintCtx.globalCompositeOperation = 'source-over'

        return { image: canvas, x: 0, y: 0 }
    }
    playOnce() {
        this.runOnce = true
        this.autoplay = true
    }
    play() {
        this.autoplay = true
    }

    updateFrames() {
        if (Sprite.framesFrozen) return
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

        const animation = this.currentAnimation
        if (animation?.onComplete) {
            if (this.currentFrame === this.frameRate - 1 && !animation.isActive) {
                // Mark before calling: onComplete may start a follow-up animation,
                // which must keep its own flag clear so its onComplete can fire.
                animation.isActive = true
                animation.onComplete()
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

/** True once the level is over (game over): every animation holds its current frame. */
Sprite.framesFrozen = false
