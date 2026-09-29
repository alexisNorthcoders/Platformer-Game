/**
 * A Tumbling Plank (tumblingPlank.mjs): platform.png turning round its own
 * middle in the plane of the screen. It has a one-way collision block that
 * exists only while the plank is within its window of flat; otherwise the
 * block is parked out of the world, so the King drops through or passes
 * through it. index.js calls step() once a frame while playing. The plank
 * takes its turn from a frame count that is never reset (see `tumblingFrame`
 * in index.js), so it keeps turning where it is through a respawn or restart.
 */
class TumblingPlank extends Sprite {
    constructor({ path, imageSrc = './Sprites/14-TileSets/platform.png' }) {
        const lib = globalThis.__tumblingPlank
        const state = lib.createTumbleState(path)
        super({ position: { x: 0, y: 0 }, imageSrc })
        this.state = state
        this.collisionBlocks = [new CollisionBlock({
            position: { x: state.x, y: state.y },
            width: lib.TUMBLING_PLANK.length,
            height: lib.TUMBLING_PLANK.height,
            type: 'platform',
        })]
        this.step(tumblingFrame)
    }

    /** The walkable surface, or null while the plank is tipped past its window. */
    surface() {
        const { x, y, width, standable } = this.state
        return standable ? { x, y, width } : null
    }

    /** Turns to `frame` of the running clock and moves the collision block to match. */
    step(frame) {
        const lib = globalThis.__tumblingPlank
        this.state.frame = frame - 1
        lib.stepTumble(this.state)
        const block = this.collisionBlocks[0]
        block.position.x = this.state.x
        // Parked far below the world while the plank is steep: nothing can stand on it.
        block.position.y = this.state.standable ? this.state.y : 100000
        block.width = this.state.standable ? this.state.width : 0
    }

    /** The plank's angle now, radians (0 when flat). */
    angle() {
        return globalThis.__tumblingPlank.tumbleAngleAt(this.state.path, this.state.frame)
    }

    /** The sprite turned round its own middle; the surface's top-middle is (center.x, center.y). */
    draw() {
        if (!this.loaded) return
        const { center } = this.state.path
        const halfW = this.image.width, halfH = this.image.height // 2x: the sprite's half size in world px
        c.save()
        c.translate(center.x, center.y + 11)
        c.rotate(this.angle())
        c.drawImage(this.image, -halfW, -halfH, this.image.width * 2, this.image.height * 2)
        c.restore()
    }
}
