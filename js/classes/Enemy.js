class Enemy extends Sprite {
    constructor({ position, collisionBlocks = [], imageSrc, frameRate, frameBuffer, animations, loop, spawnTrack, enemyVariant = 'pig' }) {
        super({ position, imageSrc, frameRate, animations, frameBuffer,loop })
        this.spawnTrack = spawnTrack || null
        this.enemyVariant = enemyVariant
        this.state = 'idle'
        this.velocity = {
            x: 0,
            y: 0
        }
        this.gravity = 0.4
        this.hitpoints = 2
        this.playerHit = false
        this.attacking = false

        this.collisionBlocks = collisionBlocks

        this.attackInterval = setInterval(() => this.attack(), 3000);

        if (enemyVariant === 'pig') {
            this.pigWalkSpeed = 1
            this.aiMode = 'idle'
            this.aiNextDecisionAt = Date.now() + 500 + Math.random() * 1500
            this.pigWallSteerUntil = 0
        }
    }

    pigAiDeferDecision(ms) {
        this.aiNextDecisionAt = Date.now() + ms
    }

    pigPickNextBehavior() {
        const core = globalThis.pigWanderAiCore
        if (!core) return
        const plan = core.planBehavior(Math.random(), Math.random(), Math.random(), this.pigWalkSpeed)
        if (plan.kind === 'jump') {
            this.jump()
            this.velocity.x = 0
            this.aiMode = core.PIG_AI_STATES.IDLE
            this.pigAiDeferDecision(plan.nextDelayMs)
            return
        }
        this.aiMode = plan.aiMode
        this.velocity.x = plan.velocityX
        this.flip = plan.flip
        this.switchSprite(plan.sprite)
        this.pigAiDeferDecision(plan.nextDelayMs)
    }

    pigTickAi() {
        const core = globalThis.pigWanderAiCore
        if (!core || !core.isPigWanderEnemy(this)) return

        if (this.playerHit || this.hitpoints <= 0) {
            this.velocity.x = 0
            return
        }

        const inAttack =
            this.attacking ||
            (this.animations &&
                this.animations.attack &&
                this.currentAnimation === this.animations.attack)

        if (inAttack) {
            this.velocity.x = 0
            return
        }

        const now = Date.now()
        let grounded = core.isGroundedVerticalVelocity(this.velocity.y)

        if (now >= this.aiNextDecisionAt) {
            if (!grounded) {
                this.pigAiDeferDecision(200)
            } else if (now < this.pigWallSteerUntil) {
                this.pigAiDeferDecision(Math.max(50, this.pigWallSteerUntil - now + 20))
            } else {
                this.pigPickNextBehavior()
            }
        }

        grounded = core.isGroundedVerticalVelocity(this.velocity.y)
        if (!grounded) return

        const sync = core.syncSpriteFromHorizontalVelocity(this.velocity.x, this.pigWalkSpeed)
        this.switchSprite(sync.sprite)
        this.flip = sync.flip
        if (sync.aiMode) this.aiMode = sync.aiMode
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
                            enemyNumberSprite = createNumberSprites(EnemyTracker.increaseEnemyCount(), { x: 50, y: 80 });
                            if (this.spawnTrack) {
                                LevelProgressKeys.markEnemyDefeated(
                                    this.spawnTrack.levelId,
                                    this.spawnTrack.kind,
                                    this.spawnTrack.spawnX,
                                    this.spawnTrack.spawnY
                                )
                            }
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
    matchOn(){
        this.state = 'matchOn'
        this.switchSprite('matchOn')
    }
    shoot(){
        this.state = 'matchOn'
        this.switchSprite('lightCannon')
        this.currentAnimation = {
            onComplete: () => {
                this.matchOn()
                cannon[0].shoot()
            }
        };
       
    }
    idle(){
        this.state = 'idle'
        this.switchSprite('idle')
    }

    attack() {
        if (this.state === 'matchOn') return
        if (!this.attacking && this.hitpoints > 0 && !this.playerHit) {
            this.attacking = true;
            if (this.enemyVariant === 'pig') this.velocity.x = 0
            this.switchSprite('attack');

            if (this.currentAnimation) {
                this.currentAnimation.onComplete = () => {
                    this.attacking = false;
                    this.switchSprite('idle');
                };
            }
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
        this.pigTickAi()
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
        if (!this.loaded) {
            this.hitbox = {
                position: { x: this.position.x, y: this.position.y },
                width: 0,
                height: 0
            }
            return
        }
        const configs = {
            pig: { ox: 23, oy: 30, w: 37, h: 28 },
            king: { ox: 24, oy: 30, w: 38, h: 28 },
            match: { ox: 6, oy: 8, w: 20, h: 12 }
        }
        const cfg = configs[this.enemyVariant] || configs.pig
        this.hitbox = {
            position: {
                x: this.position.x + cfg.ox,
                y: this.position.y + cfg.oy
            },
            width: cfg.w,
            height: cfg.h
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
                    const core = globalThis.pigWanderAiCore
                    if (core && core.isPigWanderEnemy(this) && !this.attacking && !this.playerHit && this.hitpoints > 0) {
                        const r = core.responseAfterLeftWallCollision(this.pigWalkSpeed)
                        this.velocity.x = r.velocityX
                        this.flip = r.flip
                        this.switchSprite(r.sprite)
                        this.aiMode = r.aiMode
                        this.pigWallSteerUntil = core.wallSteerUntilFromNow(Date.now(), Math.random())
                        this.aiNextDecisionAt = Math.max(this.aiNextDecisionAt, this.pigWallSteerUntil + 20)
                    } else if (!this.attacking) this.switchSprite('idle')
                    break
                }
                if (this.velocity.x > 0) {
                    const offset = this.hitbox.position.x - this.position.x + this.hitbox.width
                    this.position.x = collisionBlock.position.x - offset - 0.01
                    const core = globalThis.pigWanderAiCore
                    if (core && core.isPigWanderEnemy(this) && !this.attacking && !this.playerHit && this.hitpoints > 0) {
                        const r = core.responseAfterRightWallCollision(this.pigWalkSpeed)
                        this.velocity.x = r.velocityX
                        this.flip = r.flip
                        this.switchSprite(r.sprite)
                        this.aiMode = r.aiMode
                        this.pigWallSteerUntil = core.wallSteerUntilFromNow(Date.now(), Math.random())
                        this.aiNextDecisionAt = Math.max(this.aiNextDecisionAt, this.pigWallSteerUntil + 20)
                    } else if (!this.attacking) this.switchSprite('idle')
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
                        if (!this.attacking && this.state !== 'matchOn') this.switchSprite('idle')
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
        if (this.velocity.y > 0 && this.hitpoints !== 0 && !this.playerHit && !this.attacking) {
            this.switchSprite('fall');
        }
        this.velocity.y += this.gravity;
        this.position.y += this.velocity.y;
    }
}

