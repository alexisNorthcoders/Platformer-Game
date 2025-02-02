class Player extends Sprite {
    constructor({ collisionBlocks = [], imageSrc, frameRate, animations, loop }) {
        super({ imageSrc, frameRate, animations, loop })
        this.hitCooldown = false
        this.action = false
        this.running = false
        this.hitCooldownDuration = 1000
        this.isShowingHello = false;
        this.position = {
            x: 200,
            y: 200
        }

        this.velocity = {
            x: 0,
            y: 0
        }

        this.sides = {
            bottom: this.position.y + this.height
        }
        this.gravity = 0.5

        this.collisionBlocks = collisionBlocks

    }

    hello() {
        this.isShowingHello = true;
        this.preventInput = true

        helloDialogue.switchSprite('helloIn')
        helloDialogue.currentFrame = 0
        helloDialogue.position.x = this.position.x + 68
        helloDialogue.position.y = this.position.y

        setTimeout(() => {
            helloDialogue.switchSprite('helloOut')
            helloDialogue.currentFrame = 0
        }, 2000);

        setTimeout(() => {
            this.preventInput = false
            this.isShowingHello = false;
        }, 3000);

    }

    update() {

        // blue box 
        //c.fillStyle = 'rgba(0,0,255,0)'
        // c.fillRect(this.position.x,this.position.y,this.width,this.height)
        this.position.x += this.velocity.x


        this.updateHitbox()

        this.checkForHorizontalCollisions()
        this.applyGravity()

        this.updateHitbox()
        // debug hitbox
        if (debugCollisions) {
            c.fillStyle = 'rgba(0, 0, 255, 0.76)'
            c.fillRect(
                this.hitbox.position.x,
                this.hitbox.position.y,
                this.hitbox.width,
                this.hitbox.height)
        }
        this.checkForVerticalCollisions()

    }

    handleInput(keys) {
        if (!keys.a.pressed && !keys.d.pressed) this.running = false
        if (this.preventInput) return

        this.velocity.x = 0

        if (keys.w.pressed) {

            this.switchSprite('jump')
        }

        if (keys.d.pressed) {
            this.running = true
            if (this.isGrounded === true && !this.action) this.switchSprite('runRight')
            this.velocity.x = 4
            this.lastDirection = 'right'
        }

        if (keys.a.pressed) {
            this.running = true
            if (this.isGrounded === true && !this.action) this.switchSprite('runLeft')
            this.velocity.x = -4
            this.lastDirection = 'left'
        }
        if (keys.space.pressed) {
            this.action = true
            this.lastDirection === 'right' ? this.switchSprite('attack') : this.switchSprite('attackLeft')
            setTimeout(() => {
                this.action = false;
            }, 300);
        }
        if (this.lastDirection === 'right' && this.isGrounded === true && !this.action && !this.running) this.switchSprite('idleRight')
        if (this.lastDirection === 'left' && this.isGrounded === true && !this.action && !this.running) this.switchSprite('idleLeft')
    }

    switchSprite(name) {

        if (this.image === this.animations[name].image) return
        if (name === 'hit') {
            this.currentFrame = 0
            this.image = this.animations[name].image
            this.frameRate = this.animations[name].frameRate
            this.frameBuffer = this.animations[name].frameBuffer
            this.loop = this.animations[name].loop
            this.currentAnimation = this.animations[name]
        }
        else if (!this.hitCooldown) {

            this.currentFrame = 0
            this.image = this.animations[name].image
            this.frameRate = this.animations[name].frameRate
            this.frameBuffer = this.animations[name].frameBuffer
            this.loop = this.animations[name].loop
            this.currentAnimation = this.animations[name]
        }
    }

    updateHitbox() {
        this.hitbox = {
            position: {
                x: this.position.x + 35,
                y: this.position.y + 34
            },
            width: 55,
            height: 53
        }
    }

    checkForHorizontalCollisions() {
        if (!this.hitCooldown && player.hitbox.position.x + player.hitbox.width >= enemy.hitbox.position.x &&
            player.hitbox.position.x <= enemy.hitbox.position.x + enemy.hitbox.width &&
            player.hitbox.position.y + player.hitbox.height >= enemy.hitbox.position.y) {

            kingPig.switchSprite('runLeft')
            kingPig.move()
            enemy.switchSprite('runLeft')
            enemy.move(-3)
            /*       this.switchSprite('hit')
                  this.velocity.y = -8
      
                  this.hitCooldown = true;
      
                  // Set a timer to reset the hitCooldown flag after a certain duration
                  setTimeout(() => {
                      this.hitCooldown = false;
      
      
                      // Reset animation or switch to another state after cooldown
                      this.switchSprite('idleRight');
                  }, this.hitCooldownDuration); */
        }


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
                this.isGrounded = true
                if (this.velocity.y < 0) {
                    this.velocity.y = 0
                    const offset = this.hitbox.position.y - this.position.y
                    this.position.y = collisionBlock.position.y + collisionBlock.height - offset + 0.01

                    break
                }
                if (this.velocity.y > 0) {
                    this.velocity.y = 0
                    const offset = this.hitbox.position.y - this.position.y + this.hitbox.height
                    this.position.y = collisionBlock.position.y - offset - 0.01

                    break
                }


            } else { this.isGrounded = false }
        }
    }
    applyGravity() {

        this.velocity.y += this.gravity
        this.position.y += this.velocity.y
    }
}

