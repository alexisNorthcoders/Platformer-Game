/**
 * The Box Pig (#143, #144): a Pig hiding among the Boxes. At rest it is a Box in
 * every pixel (the Box's Idle art, size and position, in the level's `boxTint`),
 * but it is never solid and hurts the King on touch. One hammer hit, a Squish or
 * a Bomb's blast shatters it into the four Box Pieces; it leaves no Diamond.
 *
 * It comes alive when the King is near (js/boxPig.mjs decides how): the box lifts
 * and two eyes peek out, it winds up and hops after him, and once he is far it
 * settles and hides again where it stands. It never leaves its floor.
 */
const BOX_PIG_PIG_SHEETS = './Sprites/06-Pig Hide in the Box/'
const BOX_PIG_FRAME_MS = 1000 / 60
// The Box is 22×16 art px, the Pig sheets 26×20: anchored at the bottom centre, the box lifts in place.
const BOX_PIG_BOX_WIDTH = 44
const BOX_PIG_BOX_HEIGHT = 32
const BOX_PIG_SHEET_WIDTH = 52
const BOX_PIG_SHEET_HEIGHT = 40

class BoxPig extends Enemy {
    constructor({ position, spawnTrack }) {
        super({
            position,
            spawnTrack,
            enemyVariant: 'boxPig',
            imageSrc: './Sprites/08-Box/Idle.png',
            frameRate: 1,
            loop: false,
            animations: {
                idle: { frameRate: 1, frameBuffer: 1, loop: false, imageSrc: './Sprites/08-Box/Idle.png' },
                lookingOut: { frameRate: 3, frameBuffer: 10, loop: false, imageSrc: `${BOX_PIG_PIG_SHEETS}Looking Out (26x20).png` },
                anticipation: { frameRate: 2, frameBuffer: 8, loop: false, imageSrc: `${BOX_PIG_PIG_SHEETS}Jump Anticipation (26x20).png` },
                jump: { frameRate: 2, frameBuffer: 8, loop: false, imageSrc: `${BOX_PIG_PIG_SHEETS}Jump (26x20).png` },
                fall: { frameRate: 1, frameBuffer: 1, loop: false, imageSrc: `${BOX_PIG_PIG_SHEETS}Fall (26x20).png` },
                ground: { frameRate: 1, frameBuffer: 1, loop: false, imageSrc: `${BOX_PIG_PIG_SHEETS}Ground (26x20).png` },
            },
        })
        this.hitpoints = 1
        this.shattered = false
        this.breakPieces = []
        this.ai = __boxPig.createBoxPigState()
        // It stays on the floor it hides on: the Box's feet at spawn.
        this.floorY = this.position.y + BOX_PIG_BOX_HEIGHT
        this.airborne = false
        this.hopX = 0
        this.updateHitbox()
    }

    /** Horizontal pixels between the King and this Box Pig (centre to centre), and which side he is on. */
    kingRange() {
        // The King has no hitbox until his first update: nobody is near yet.
        if (!player?.hitbox) return { distance: Infinity, direction: 1 }
        const dx = player.hitbox.position.x + player.hitbox.width / 2 - (this.position.x + BOX_PIG_BOX_WIDTH / 2)
        return { distance: Math.abs(dx), direction: dx < 0 ? -1 : 1 }
    }

    /** One step of the hide / peek / hop behaviour, then the hop's physics. */
    tickBehavior() {
        const body = { left: this.position.x, right: this.position.x + BOX_PIG_BOX_WIDTH }
        const { distance, direction } = this.kingRange()
        const out = __boxPig.stepBoxPig(this.ai, {
            dtMs: BOX_PIG_FRAME_MS,
            kingDistance: distance,
            kingDirection: direction,
            grounded: !this.airborne,
            body,
            // Only a hop needs the floor, and a hop starts from winding up or from landing.
            floor: this.ai.mode === 'anticipating' || this.ai.mode === 'landing' ? this.floor(body) : null,
        })
        this.ai = { mode: out.mode, elapsedMs: out.elapsedMs, flip: out.flip }
        this.switchSprite(out.sprite)
        this.flip = out.flip
        if (out.hop) {
            this.velocity.y = out.hop.y
            this.hopX = out.hop.x
            this.airborne = true
        }
        if (this.airborne) this.applyHop()
    }

    /** The edges of the floor under the Box Pig, null when nothing is there. */
    floor(body) {
        return __boxPig.floorEdges(collisionBlocks, { ...body, bottom: this.floorY, height: BOX_PIG_BOX_HEIGHT })
    }

    applyHop() {
        this.velocity.y += __boxPig.BOX_PIG.GRAVITY
        this.position.x += this.hopX
        this.position.y += this.velocity.y
        if (this.velocity.y > 0 && this.position.y + BOX_PIG_BOX_HEIGHT >= this.floorY) {
            this.position.y = this.floorY - BOX_PIG_BOX_HEIGHT
            this.velocity.y = 0
            this.hopX = 0
            this.airborne = false
        }
        this.updateHitbox()
    }

    /** The Box's own hitbox: 22×16 art px at 2×. */
    updateHitbox() {
        this.hitbox = { position: { x: this.position.x, y: this.position.y }, width: 44, height: 32 }
    }

    hit() {
        this.shatter()
    }

    kill() {
        this.shatter()
    }

    shatter() {
        if (this.shattered) return
        this.shattered = true
        this.hitpoints = 0
        playHitSound()
        for (let i = 0; i < 4; i++) {
            const piece = new BrokenPiece({
                position: { x: this.position.x, y: this.position.y },
                imageSrc: breakImages[i],
                velocity: { x: (Math.random() - 0.5) * 2, y: -Math.random() * 2 },
                rotation: Math.random() * 360,
            })
            piece.collisionBlocks = collisionBlocks
            piece.tint = this.tint
            piece.tintMode = this.tintMode
            this.breakPieces.push(piece)
        }
        // The shared death step: the Pig counter and the defeated mark.
        this.die()
    }

    update() {
        if (!this.loaded) {
            // Faded out after the shared death step: nothing left to update or draw.
            this.breakPieces.length = 0
            return
        }
        this.breakPieces.forEach(piece => {
            piece.opacity = this.opacity
            piece.update()
        })
        if (!this.shattered) this.tickBehavior()
    }

    draw(scale) {
        if (this.shattered) {
            this.breakPieces.forEach(piece => piece.draw(scale))
            return
        }
        // The Pig sheets are bigger than the Box: line them up on its bottom centre,
        // shifting only the drawing so the world position and hitbox stay put.
        this.drawOffset = this.ai.mode === 'hidden'
            ? null
            : { x: (BOX_PIG_BOX_WIDTH - BOX_PIG_SHEET_WIDTH) / 2, y: BOX_PIG_BOX_HEIGHT - BOX_PIG_SHEET_HEIGHT }
        super.draw(scale)
    }
}
