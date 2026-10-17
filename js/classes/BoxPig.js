/**
 * The Box Pig (#143, #144): a Pig hiding among the Boxes. At rest it is a Box in
 * every pixel (the Box's Idle art, size and position, in the level's `boxTint`),
 * but it is never solid and hurts the King on touch. One hammer hit, a Squish or
 * a Bomb's blast shatters it into the four Box Pieces; it leaves no Diamond.
 * It doesn't move yet.
 */
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
            },
        })
        this.hitpoints = 1
        this.shattered = false
        this.breakPieces = []
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
    }

    draw(scale) {
        if (this.shattered) this.breakPieces.forEach(piece => piece.draw(scale))
        else super.draw(scale)
    }
}
