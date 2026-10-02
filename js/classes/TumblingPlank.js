/**
 * A Tumbling Plank (tumblingPlank.mjs): platform.png turning round its own
 * middle in the plane of the screen. It has no collision block: index.js
 * (stepTumblingPlanks) rides the King on its tilted top face, so he can never
 * fall through it. index.js calls step() once a frame while playing. The plank
 * takes its turn from a frame count that is never reset (see `tumblingFrame`
 * in index.js), so it keeps turning where it is through a respawn or restart.
 */
class TumblingPlank extends Sprite {
    constructor({ path, imageSrc = './Sprites/14-TileSets/platform.png' }) {
        const lib = globalThis.__tumblingPlank
        const state = lib.createTumbleState(path)
        super({ position: { x: 0, y: 0 }, imageSrc })
        this.state = state
        this.collisionBlocks = []
        this.step(tumblingFrame)
    }

    /** The top face now: { y at x }-style query `yAt(x)`, or null while the plank is on end. */
    surface() {
        const lib = globalThis.__tumblingPlank
        if (lib.slopeBand(this.state.tilt) === 'onEnd') return null
        return { tilt: this.state.tilt, yAt: x => lib.surfaceYAt(this.state.path, this.state.frame, x) }
    }

    /** Turns to `frame` of the running clock. */
    step(frame) {
        this.state.frame = frame - 1
        globalThis.__tumblingPlank.stepTumble(this.state)
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
