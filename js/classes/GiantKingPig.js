/**
 * The Giant King Pig (#113): a King Pig drawn at 5× (190×140), the Boss Level's
 * fight. Reuses Enemy's sheets, gravity and collisions; the fight itself (what
 * he does when, his hit points) is js/boss.mjs, and what its events do to the
 * rest of the game (Bombs, the quake, the Door) is index.js's
 * onGiantKingPigEvent(). Draw him with draw(GiantKingPig.SCALE).
 */
class GiantKingPig extends Enemy {
    static SCALE = 5
    /** The wall-to-wall room the fight happens in, world px (Level 25). */
    static ARENA = { left: 80, right: 944, ceilingY: 120 }

    constructor(config) {
        super({ ...config, enemyVariant: 'giantKing' })
        const lib = globalThis.__boss
        this.hitpoints = lib.BOSS.maxHp
        this.defeated = false
        /** Whether his feet were on the floor after the last step. */
        this.onFloor = true
        this.boss = lib.createBossState({ x: 0, arena: GiantKingPig.ARENA, halfWidth: 45 })
        // He faces the King on the left. Flipped, the art is mirrored in its frame: 2 art px keep it centred.
        this.flip = false
        this.flipOffsetX = 2
    }

    /** One-way planks (type 'platform') don't stop him, nor do the room's Platforms (utils.js): he walks and leaps through them. */
    set collisionBlocks(blocks) {
        this._collisionBlocks = blocks.filter(block => block.type !== 'platform')
    }
    get collisionBlocks() {
        return this._collisionBlocks
    }

    centerX() {
        return this.hitbox.position.x + this.hitbox.width / 2
    }

    /** A hammer hit: 1 hit point. */
    hit() {
        this.damage(globalThis.__boss.BOSS.hammerDamage)
    }

    /** A Bomb's blast: 3 hit points. */
    blastHit() {
        this.damage(globalThis.__boss.BOSS.blastDamage)
    }

    damage(amount) {
        const events = globalThis.__boss.damageBoss(this.boss, amount)
        if (!events.length) return
        playHitSound()
        this.hitpoints = this.boss.hp
        this.velocity.x = 0
        events.forEach(event => onGiantKingPigEvent(event))
    }

    /** Squish and the plain Pig kill don't apply to him: only hit points do. */
    kill() {
        this.blastHit()
    }

    /**
     * Only showPhase() picks his sheet. Enemy's collision code switches a Pig to idle
     * on every landing and wall bump, which would restart his Run on each frame.
     */
    switchSprite() {}

    /** Takes the sheet for the current phase. */
    showPhase() {
        const name = globalThis.__boss.bossAnimation(this.boss, {
            walking: this.velocity.x !== 0,
            rising: this.velocity.y < 0,
        })
        super.switchSprite(name === 'run' ? 'runLeft' : name)
    }

    update() {
        const lib = globalThis.__boss
        this.updateHitbox()
        // The King's hitbox exists from his first frame; until then, he is where the fight started.
        const kingX = player.hitbox ? player.hitbox.position.x + player.hitbox.width / 2 : this.centerX()
        const events = lib.advanceBoss(this.boss, performance.now(), {
            kingX,
            x: this.centerX(),
            rand: Math.random,
            grounded: this.onFloor,
        })
        for (const event of events) {
            if (event.type === 'leap') {
                this.velocity.x = event.vx
                this.velocity.y = event.vy
            } else if (event.type === 'landed') this.velocity.x = 0
            onGiantKingPigEvent(event)
        }
        const phase = this.boss.phase
        if (phase === 'walk') {
            const dir = lib.walkDirection(this.centerX(), kingX)
            this.velocity.x = dir * lib.BOSS.walkSpeed
        } else if (phase !== 'air') this.velocity.x = 0
        if (phase === 'walk' || phase === 'bombWarn' || phase === 'crouch') this.flip = kingX > this.centerX()

        this.position.x += this.velocity.x
        this.updateHitbox()
        this.checkForHorizontalCollisions()
        this.velocity.y += this.gravity
        this.position.y += this.velocity.y
        this.updateHitbox()
        const falling = this.velocity.y > 0
        this.checkForVerticalCollisions()
        this.onFloor = falling && this.velocity.y === 0
        this.showPhase()
    }
}
