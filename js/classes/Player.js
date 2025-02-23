class Player extends Sprite {
    constructor({ collisionBlocks = [], imageSrc, frameRate, animations, loop }) {
        super({ imageSrc, frameRate, animations, loop })
        this.hitpoints = 3
        this.preventInput = false
        this.isGrounded = true
        this.hitCooldown = false
        this.action = false
        this.canAttack = true
        this.running = false
        this.hitCooldownDuration = 1000
        this.isShowingHello = false
        this.canJump = true
        this.attacking = false
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
    setPosition(position) {
        this.position = { ...position }
    }

    hello() {
        this.isShowingHello = true;

        helloDialogue.switchSprite('helloIn')
        helloDialogue.currentFrame = 0
        helloDialogue.position.x = this.position.x + 68
        helloDialogue.position.y = this.position.y

        helloDialogue.currentAnimation = {
            onComplete: () => {
                helloDialogue.switchSprite('helloOut')
            }
        }
    }

    update() {

        if (this.isGrounded && this.running) playStepSound()
        if (!this.running || !this.isGrounded) stopStepSound()

        // blue box 
        //c.fillStyle = 'rgba(0,0,255,0)'
        // c.fillRect(this.position.x,this.position.y,this.width,this.height)
        this.position.x += this.velocity.x
        helloDialogue.position.x = this.position.x + 68
        helloDialogue.position.y = this.position.y


        this.updateHitbox()

        this.checkForHorizontalCollisions()

        if (diamonds.length) {
            this.checkDiamondHitCollision()
        }

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
            if (this.lastDirection === 'right') {
                c.fillStyle = 'rgba(81, 255, 0, 0.76)';
                c.fillRect(
                    this.attackHitboxRight.position.x,
                    this.attackHitboxRight.position.y,
                    this.attackHitboxRight.width,
                    this.attackHitboxRight.height
                );
            } else {
                c.fillStyle = 'rgba(81, 255, 0, 0.76)';
                c.fillRect(
                    this.attackHitboxLeft.position.x,
                    this.attackHitboxLeft.position.y,
                    this.attackHitboxLeft.width,
                    this.attackHitboxLeft.height
                );
            }


        }
        this.checkForVerticalCollisions()

    }

    jump() {
        if (this.isGrounded && this.canJump) {
            playJumpSound()
            this.canJump = false
            this.velocity.y = -10
            this.isGrounded = false;
            this.switchSprite(this.lastDirection === 'right' ? 'jump' : 'jumpLeft');
        }
    }

    attack() {
        if (this.canAttack) {
            playHammerSound()
            this.action = true;
            this.attacking = true;
            this.switchSprite(this.lastDirection === 'right' ? 'attack' : 'attackLeft');
            this.canAttack = false

            this.currentAnimation = {
                onComplete: () => {
                    this.checkEnemyHitCollision();
                    this.action = false;
                    this.attacking = false;
                    this.canAttack = false;
                },
                isActive: false
            };
        }
    }

    handleInput(keys) {

        if (!keys.a.pressed && !keys.d.pressed) this.running = false;
        if (!keys.space.pressed) this.canAttack = true;
        if (!keys.w.pressed) this.canJump = true
        if (this.preventInput || this.action) return;

        if (!keys.a.pressed && !keys.d.pressed) {
            this.velocity.x = 0;
        }

        if (keys.w.pressed && this.isGrounded && this.canJump) {
            this.jump()
        }
        if (keys.space.pressed && this.canAttack) {
            this.attack()
        }

        // Running
        if (keys.d.pressed && !keys.a.pressed) {
            this.running = true;
            if (this.isGrounded && !this.action) this.switchSprite('runRight');
            this.velocity.x = 4;
            this.lastDirection = 'right';
        }

        if (keys.a.pressed && !keys.d.pressed) {
            this.running = true;
            if (this.isGrounded && !this.action) this.switchSprite('runLeft');
            this.velocity.x = -4;
            this.lastDirection = 'left';
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
            this.flip = this.animations[name].flip || false
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
        this.attackHitboxRight = {
            position: {
                x: this.position.x + 80,
                y: this.position.y + 10
            },
            width: 65,
            height: 75
        }
        this.attackHitboxLeft = {
            position: {
                x: this.position.x + 80 - 1.25 * this.width,
                y: this.position.y + 10
            },
            width: 65,
            height: 75
        }
    }

    checkEnemyHitCollision() {
        if (this.attacking) {
            if (this.lastDirection === 'right') {
                enemies.forEach((enemy) => {
                    if (this.attackHitboxRight.position.x + this.attackHitboxRight.width >= enemy.hitbox.position.x &&
                        this.attackHitboxRight.position.x <= enemy.hitbox.position.x + enemy.hitbox.width &&
                        this.attackHitboxRight.position.y + this.attackHitboxRight.height >= enemy.hitbox.position.y &&
                        this.attackHitboxRight.position.y <= enemy.hitbox.position.y + enemy.hitbox.height) {

                        enemy.hit()

                    }
                })
                boxes.forEach((box) => {
                    if (box.isBreaking) return
                    if (this.attackHitboxRight.position.x + this.attackHitboxRight.width >= box.hitbox.position.x &&
                        this.attackHitboxRight.position.x <= box.hitbox.position.x + box.hitbox.width &&
                        this.attackHitboxRight.position.y + this.attackHitboxRight.height >= box.hitbox.position.y &&
                        this.attackHitboxRight.position.y <= box.hitbox.position.y + box.hitbox.height) {

                        box.hit()

                    }
                })
            }
            else {
                enemies.forEach((enemy) => {
                    if (this.attackHitboxLeft.position.x + this.attackHitboxLeft.width >= enemy.hitbox.position.x &&
                        this.attackHitboxLeft.position.x <= enemy.hitbox.position.x + enemy.hitbox.width &&
                        this.attackHitboxLeft.position.y + this.attackHitboxLeft.height >= enemy.hitbox.position.y &&
                        this.attackHitboxLeft.position.y <= enemy.hitbox.position.y + enemy.hitbox.height) {

                        enemy.hit()
                    }
                })
                boxes.forEach((box) => {
                    if (box.isBreaking) return
                    if (this.attackHitboxLeft.position.x + this.attackHitboxLeft.width >= box.hitbox.position.x &&
                        this.attackHitboxLeft.position.x <= box.hitbox.position.x + box.hitbox.width &&
                        this.attackHitboxLeft.position.y + this.attackHitboxLeft.height >= box.hitbox.position.y &&
                        this.attackHitboxLeft.position.y <= box.hitbox.position.y + box.hitbox.height) {

                        box.hit()
                    }
                })
            }

        }
    }

    checkDiamondHitCollision() {

        diamonds.forEach((diamond) => {
            if (diamond.loaded) {
                if (this.hitbox.position.x + this.hitbox.width >= diamond.hitbox.position.x &&
                    this.hitbox.position.x <= diamond.hitbox.position.x + diamond.hitbox.width &&
                    this.hitbox.position.y + this.hitbox.height >= diamond.hitbox.position.y &&
                    this.hitbox.position.y <= diamond.hitbox.position.y + diamond.hitbox.height) {

                    diamond.hit()
                }
            }
        })
    }

    checkForHorizontalCollisions() {

        for (let i = 0; i < this.collisionBlocks.length; i++) {
            const collisionBlock = this.collisionBlocks[i]
            if (collisionBlock.type === 'platform') continue
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
    loseHP() {
        this.hitpoints--
        hearts.pop()
        if (!this.hitpoints) {
            this.dead = true
        }
    }
    checkForVerticalCollisions() {

        if (player.position.y > canvas.height) {
            this.loseHP()
            if (this.dead) {
                console.log('Game Over') // TODO gameover screen
            }
            else {
                this.setPosition(levels[level].playerPosition)
            }
        }
        for (let i = 0; i < this.collisionBlocks.length; i++) {
            const collisionBlock = this.collisionBlocks[i]

            if (
                this.hitbox.position.x <= collisionBlock.position.x + collisionBlock.width &&
                this.hitbox.position.x + this.hitbox.width >= collisionBlock.position.x &&
                this.hitbox.position.y + this.hitbox.height >= collisionBlock.position.y &&
                this.hitbox.position.y <= collisionBlock.position.y + collisionBlock.height
            ) {
                this.isGrounded = true;

                if (collisionBlock.type === "platform") {
                    // Ignore collision if moving UP (jumping through)
                    if (this.velocity.y < 0) {
                        continue; // Ignore platform when going up
                    }

                    // If moving DOWN, allow landing only if feet are above the platform
                    if (this.velocity.y > 0) {
                        if (this.hitbox.position.y + this.hitbox.height - this.velocity.y <= collisionBlock.position.y) {
                            this.velocity.y = 0;
                            const offset = this.hitbox.position.y - this.position.y + this.hitbox.height;
                            this.position.y = collisionBlock.position.y - offset - 0.01;
                            break;
                        }
                    }

                    continue;
                }

                if (this.velocity.y < 0) {
                    this.velocity.y = 0;
                    const offset = this.hitbox.position.y - this.position.y;
                    this.position.y = collisionBlock.position.y + collisionBlock.height - offset + 0.01;
                    break;
                }

                if (this.velocity.y > 0) {
                    this.velocity.y = 0;
                    const offset = this.hitbox.position.y - this.position.y + this.hitbox.height;
                    this.position.y = collisionBlock.position.y - offset - 0.01;
                    break;
                }
            } else {
                this.isGrounded = false;
            }
        }
    }

    applyGravity() {

        this.velocity.y += this.gravity
        this.position.y += this.velocity.y
    }
}

