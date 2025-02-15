class Enemy extends Sprite {
    constructor({ position, collisionBlocks = [], imageSrc, frameRate, animations, loop }) {
        super({ position, imageSrc, frameRate, animations, loop })

        this.velocity = {
            x: 0,
            y: 0
        }
        this.gravity = 0.4
        this.hitpoints = 3
        this.playerHit = false
        this.attacking = false

        this.collisionBlocks = collisionBlocks

        this.attackInterval = setInterval(() => this.attack(), 3000);
    }

    move(runSpeed = -1) {
        this.velocity.x = runSpeed
    }
    hit() {
        if (!this.playerHit) {
            playHitSound()
            if (this.hitpoints === 0) {
                this.playerHit = true
                clearInterval(this.attackInterval);
                return

            } if (this.hitpoints > 0) {
                this.playerHit = true
                this.hitpoints--
                this.switchSprite('hit');
                if (this.hitpoints === 0) {
                    this.currentAnimation = {
                        onComplete: () => {
                            this.switchSprite('dead')
                            setTimeout(() => this.fade(), 2000)
                        }
                    }
                }
                else {
                    this.currentAnimation = {
                        onComplete: () => {
                            this.switchSprite('idle');
                            this.playerHit = false
                        }
                    }
                }
            }
        }
    }

    attack() {
        if (!this.attacking && this.hitpoints) {
            this.attacking = true;
            this.switchSprite('attack');
            this.currentAnimation = {
                onComplete: () => {
                    this.attacking = false;
                }
            };
        }
    }

    jump() {
        this.switchSprite('jump')
        this.velocity.y = -10
    }

    switchSprite(name) {

        if (!this.animations[name] || this.image === this.animations[name].image) return

        else if (!this.hitCooldown) {

            this.currentFrame = 0
            this.image = this.animations[name].image
            this.frameRate = this.animations[name].frameRate
            this.frameBuffer = this.animations[name].frameBuffer
            this.loop = this.animations[name].loop
            this.currentAnimation = this.animations[name]
        }
    }

    update() {
        // blue box 
        // debug position
        /*  c.fillStyle = 'rgba(0,0,255,0.3)'
         c.fillRect(this.position.x,this.position.y,this.width,this.height)   */
        this.position.x += this.velocity.x

        this.updateHitbox()

        this.checkForHorizontalCollisions()
        this.applyGravity()

        this.updateHitbox()
        // debug hitbox
        if (debugCollisions) {
            c.fillStyle = 'rgba(255, 217, 0, 0.83)'
            c.fillRect(
                this.hitbox.position.x,
                this.hitbox.position.y,
                this.hitbox.width,
                this.hitbox.height)
        }

        this.checkForVerticalCollisions()
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

    checkForHorizontalCollisions() {
        for (let i = 0; i < this.collisionBlocks.length; i++) {
            const collisionBlock = this.collisionBlocks[i]
            // if collision exists
            if (this.hitbox.position.x <= collisionBlock.position.x + collisionBlock.width &&
                this.hitbox.position.x + this.hitbox.width >= collisionBlock.position.x &&
                this.hitbox.position.y + this.hitbox.height >= collisionBlock.position.y &&
                this.hitbox.position.y <= collisionBlock.position.y + collisionBlock.height) {
                // collision on x axis going left
                if (this.velocity.x < 0) {
                    const offset = this.hitbox.position.x - this.position.x
                    this.position.x = collisionBlock.position.x + collisionBlock.width - offset + 0.01
                    if (!this.attacking) this.switchSprite('idle')
                    break
                }
                if (this.velocity.x > 0) {
                    const offset = this.hitbox.position.x - this.position.x + this.hitbox.width
                    this.position.x = collisionBlock.position.x - offset - 0.01
                    break
                }


            }
        }
    }
    checkForVerticalCollisions() {
        // check for vertical collisions
        for (let i = 0; i < this.collisionBlocks.length; i++) {

            const collisionBlock = this.collisionBlocks[i]
            // if collision exists
            if (this.hitbox.position.x <= collisionBlock.position.x + collisionBlock.width &&
                this.hitbox.position.x + this.hitbox.width >= collisionBlock.position.x &&
                this.hitbox.position.y + this.hitbox.height >= collisionBlock.position.y &&
                this.hitbox.position.y <= collisionBlock.position.y + collisionBlock.height) {

                if (this.velocity.y < 0) {
                    this.velocity.y = 0
                    const offset = this.hitbox.position.y - this.position.y
                    this.position.y = collisionBlock.position.y + collisionBlock.height - offset + 0.01
                    break
                }
                if (this.velocity.y > 0) {
                    if (this.currentAnimation !== this.animations.idle && !this.playerHit) {
                        if (!this.attacking) this.switchSprite('idle')
                    }
                    this.velocity.y = 0
                    const offset = this.hitbox.position.y - this.position.y + this.hitbox.height
                    this.position.y = collisionBlock.position.y - offset - 0.01
                    break
                }

            }
        }
    }
    applyGravity() {
        if (this.velocity.y > 0) {
            this.switchSprite('fall')
        }
        this.velocity.y += this.gravity
        this.position.y += this.velocity.y
    }
}

