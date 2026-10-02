class Player extends Sprite {
    constructor({ collisionBlocks = [], imageSrc, frameRate, animations, loop }) {
        super({ imageSrc, frameRate, animations, loop })
        this.hitpoints = 3
        this.preventInput = false
        /** Caught in the Quicksand, Water, Thicket or Lava and sinking out of sight (no way out). */
        this.sinking = false
        /** Whether the sinking, not a door/menu, turned preventInput on (so only it turns it off). */
        this.sinkLockedInput = false
        this.isGrounded = true
        /** On a Tumbling Plank (index.js stepTumblingPlanks): { yAt(x) } for the face under his feet, else null. */
        this.plankRide = null
        /** Speed along a Tumbling Plank's slope, px/frame, positive downhill. */
        this.slideSpeed = 0
        /** Horizontal slide speed he keeps in the air after jumping or sliding off a plank. */
        this.slideVx = 0
        this.hitCooldown = false
        this.action = false
        this.canAttack = true
        this.canDropBomb = true
        this.running = false
        this.hitCooldownDuration = 1000
        this.contactDamageTimeoutId = null
        this.hurtTint = null
        this.hurtTintStartTime = null
        this.gameOver = false
        /** performance.now() when game over began; the Game Over Screen's menu waits GAME_OVER_MENU_DELAY_MS after it. */
        this.gameOverAt = null
        this.deathAnimationDone = false
        /** Lost the last heart to a pit: stays out of sight, no Dead animation, straight to game over. */
        this.diedOutOfSight = false
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
                helloDialogue.currentAnimation = {
                    ...helloDialogue.animations.helloOut,
                    onComplete: () => {
                        this.isShowingHello = false
                        helloDialogue.currentFrame = 0
                    }
                }
            }
        }
    }

    /** Lost the last heart but still playing out the death; not yet game over. */
    get dying() {
        return this.dead && !this.gameOver
    }

    /** Once on the ground, plays the Dead animation once, facing the way he was facing. */
    playDeathAnimation() {
        if (!this.isGrounded || this.deathStarted) return
        this.deathStarted = true
        this.switchSprite(this.lastDirection === 'left' ? 'deadLeft' : 'dead')
        this.currentAnimation = {
            onComplete: () => {
                this.deathAnimationDone = true
            },
            isActive: false
        }
    }

    /** The only way into game over: the Dead animation has finished while dying. */
    finishDeath() {
        if (!this.dying || !(this.deathAnimationDone || this.diedOutOfSight)) return false
        this.gameOver = true
        return true
    }

    update() {

        if (this.isGrounded && this.running) playStepSound()
        if (!this.running || !this.isGrounded) stopStepSound()

        if (this.gameOver || this.diedOutOfSight) return

        if (this.sinking) {
            this.sinkStep()
            return
        }

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

        if (enemies?.length || enemyKing?.length || enemyMatch?.length || giantKingPig) {
            if (!this.checkSquish()) this.checkEnemyContactDamage()
        }

        if (this.gameOver) return

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
        this.snapToPlank()

        if (this.dying) this.playDeathAnimation()
    }

    /** Caught: stops dead, input locked, idle, sinking slowly (Quicksand, Water, Thicket or Lava). */
    startSinking() {
        if (this.sinking) return
        this.sinking = true
        this.sinkLockedInput = !this.preventInput
        this.preventInput = true
        this.velocity.x = 0
        this.velocity.y = 0
        this.running = false
        this.action = false
        this.attacking = false
        this.isGrounded = false
        this.switchSprite(this.lastDirection === 'left' ? 'idleLeft' : 'idleRight')
    }

    /** Gives back only the input the sinking took. */
    stopSinking() {
        if (!this.sinking) return
        this.sinking = false
        if (this.sinkLockedInput) this.preventInput = false
        this.sinkLockedInput = false
    }

    /** One frame of the sink; once fully under, loses a heart and comes back at the Checkpoint. */
    sinkStep() {
        this.position.y = globalThis.__quicksand.sinkStep(this.position.y)
        this.updateHitbox()
        if (!globalThis.__quicksand.isSubmerged(this.hitbox.position.y, globalThis.__quicksand.sinkFloor(levels[level]))) return
        this.stopSinking()
        this.fallIntoPit()
    }

    /** Lost to a pit: a heart gone, then back at the Checkpoint, or, on the last heart, straight to game over. */
    fallIntoPit() {
        this.loseHP()
        if (this.dead) this.dieOutOfSight()
        else respawnKing()
    }

    /** Dies where he is, out of sight: no gravity, no collisions, no Dead animation to wait for. */
    dieOutOfSight() {
        this.velocity.x = 0
        this.velocity.y = 0
        this.diedOutOfSight = true
        this.deathAnimationDone = true
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

        if (this.dead) return

        if (!keys.a.pressed && !keys.d.pressed) this.running = false;
        if (!keys.space.pressed) this.canAttack = true;
        if (!keys.s.pressed) this.canDropBomb = true
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
        // Each press of S drops at most one Bomb, on the ground or in mid-air
        // (where it falls first); the King's animation carries on (index.js's
        // dropBomb places it).
        if (keys.s.pressed && this.canDropBomb) {
            this.canDropBomb = false
            dropBomb({ ...this.feetPosition(), halfWidth: this.hitbox.width / 2 })
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

        // Off a Tumbling Plank he keeps the slide sideways until he lands.
        if (!this.plankRide) this.velocity.x += this.slideVx

        if (this.lastDirection === 'right' && this.isGrounded === true && !this.action && !this.running) this.switchSprite('idleRight')
        if (this.lastDirection === 'left' && this.isGrounded === true && !this.action && !this.running) this.switchSprite('idleLeft')
    }

    /** The middle of the King's feet (bottom centre of his hitbox), in world px. */
    feetPosition() {
        this.updateHitbox()
        return {
            x: this.hitbox.position.x + this.hitbox.width / 2,
            y: this.hitbox.position.y + this.hitbox.height,
        }
    }

    switchSprite(name) {
        const anim = this.animations[name]
        if (!this.hitCooldown || this.dead) {
            if (this.currentAnimation === anim) return
            this.currentFrame = 0
            this.image = anim.image
            this.frameRate = anim.frameRate
            this.frameBuffer = anim.frameBuffer
            this.loop = anim.loop
            this.currentAnimation = anim
            this.flip = anim.flip || false
            this.flipOffsetX = anim.flipOffsetX || 0
        }
    }

    activeHurtTint() {
        return playerContactHurtTint.playerHurtTintAt(this, performance.now())
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
            const hitEnemies = ContactDamageHelpers.findEnemiesHitByPlayerHammer({
                lastDirection: this.lastDirection,
                attackHitboxRight: this.attackHitboxRight,
                attackHitboxLeft: this.attackHitboxLeft,
                enemies,
                enemyKing,
                giantKingPig,
            })
            hitEnemies.forEach((enemy) => {
                enemy.hit()
            })

            if (this.lastDirection === 'right') {
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

    /**
     * A Squish: landing on Pigs from above kills them and bounces the King, unhurt.
     * Runs before applyGravity(), so velocity.y is still last frame's fall speed.
     * Returns true when it squished (the overlap must not also be contact damage).
     */
    checkSquish() {
        if (this.dead || this.sinking || this.gameOver) return false
        const targets = ContactDamageHelpers.collectAttackableEnemiesForPlayerAttack(enemies, enemyKing)
        // findSquishedPigs excludes the Match Pig by variant, whatever the list holds
        const squished = ContactDamageHelpers.findSquishedPigs(this.hitbox, this.velocity.y, targets)
        if (!squished.length) return false
        squished.forEach(pig => pig.kill())
        this.velocity.y = ContactDamageHelpers.SQUISH_BOUNCE_VY
        this.isGrounded = false
        playHitSound()
        this.switchSprite(this.lastDirection === 'right' ? 'jump' : 'jumpLeft')
        return true
    }

    checkEnemyContactDamage() {
        if (ContactDamageHelpers.cannotTakeContactDamage({ dead: this.dead, hitCooldown: this.hitCooldown, sinking: this.sinking })) return

        const groups = [enemies, enemyKing, enemyMatch, giantKingPig ? [giantKingPig] : []]
        for (let g = 0; g < groups.length; g++) {
            const group = groups[g]
            if (!group?.length) continue
            for (let i = 0; i < group.length; i++) {
                const enemy = group[i]
                if (!enemy.loaded || enemy.hitpoints <= 0 || enemy.opacity < 1) continue

                const e = enemy.hitbox
                const p = this.hitbox
                if (ContactDamageHelpers.rectHitboxesOverlap(p, e)) {
                    this.takeContactDamageFromEnemy(enemy)
                    return
                }
            }
        }
    }

    takeContactDamageFromEnemy(enemyForKnockback) {
        this.takeHit(enemyForKnockback)
    }

    /** Caught in a Bomb's blast (#74): a hit with no knockback, unless in hitCooldown or dead. */
    takeBlastHit() {
        if (ContactDamageHelpers.cannotTakeContactDamage({ dead: this.dead, hitCooldown: this.hitCooldown, sinking: this.sinking })) return
        this.takeHit(null)
    }

    /** The Giant King Pig's Ground Pound landing (#113): a hit with no knockback but a small hop, so it reads. */
    takeQuakeHit() {
        if (ContactDamageHelpers.cannotTakeContactDamage({ dead: this.dead, hitCooldown: this.hitCooldown, sinking: this.sinking })) return
        this.takeHit(null)
        if (!this.dead) {
            this.velocity.y = -4
            this.isGrounded = false
        }
    }

    /** Loses a hitpoint and starts hitCooldown with the hurt tint; knocked away from `knockbackFrom` if given. */
    takeHit(knockbackFrom) {
        this.action = false
        this.attacking = false
        this.hitCooldown = true
        playHitSound()
        playerContactHurtTint.applyPlayerContactHurtTint(this, performance.now())
        this.loseHP()

        if (!this.dead && knockbackFrom) {
            const knockbackSpeed = 10
            this.velocity.x = ContactDamageHelpers.contactKnockbackVelocityX(
                this.hitbox,
                knockbackFrom.hitbox,
                knockbackSpeed
            )
            this.velocity.y = Math.min(this.velocity.y, -4)
        }

        if (!this.dead) {
            this.contactDamageTimeoutId = setTimeout(() => {
                this.contactDamageTimeoutId = null
                this.hitCooldown = false
                playerContactHurtTint.clearPlayerHurtTint(this)
                if (!this.dead) {
                    this.velocity.x = 0
                }
                if (!this.dead && !this.action && !this.attacking) {
                    if (this.lastDirection === 'right') this.switchSprite('idleRight')
                    else this.switchSprite('idleLeft')
                }
            }, this.hitCooldownDuration)
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
        if (this.hitpoints <= 0) return
        this.hitpoints--
        hearts.pop()
        if (!this.hitpoints) {
            this.dead = true
            this.deathAnimationDone = false
            this.diedOutOfSight = false
            this.deathStarted = false
            playerContactHurtTint.clearPlayerHurtTint(this)
            levelTimer.stop(performance.now())
            this.preventInput = true
            this.velocity.x = 0
            this.velocity.y = 0
            this.running = false
            if (this.contactDamageTimeoutId) {
                clearTimeout(this.contactDamageTimeoutId)
                this.contactDamageTimeoutId = null
            }
            this.hitCooldown = true
        }
    }
    checkForVerticalCollisions() {

        if (globalThis.__quicksand.touchesSand(this.feetPosition().y, globalThis.__quicksand.sinkFloor(levels[level]))) {
            this.startSinking()
            return
        }
        if (player.position.y > canvas.height) {
            this.fallIntoPit()
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

    /**
     * On a Tumbling Plank (no collision block): feet exactly on the tilted face
     * under him. Off its span he is in the air again.
     */
    snapToPlank() {
        if (!this.plankRide) return
        this.updateHitbox()
        const y = this.plankRide.yAt(this.hitbox.position.x + this.hitbox.width / 2)
        if (y == null) {
            this.plankRide = null
            return
        }
        this.position.y += y - (this.hitbox.position.y + this.hitbox.height)
        this.velocity.y = 0
        this.isGrounded = true
        this.updateHitbox()
    }

    applyGravity() {

        this.velocity.y += this.gravity
        this.position.y += this.velocity.y
    }
}

