/**
 * A Helix Platform (helixPlatform.mjs): two iron blades turning flat on a mast
 * like a helicopter's rotor, drawn side-on, with a one-way collision block
 * that stretches and shrinks with the blades. index.js calls step() once a
 * frame while playing.
 */
class HelixPlatform {
    constructor({ path }) {
        const lib = globalThis.__helixPlatform
        this.state = lib.createHelixState(path)
        this.collisionBlocks = [new CollisionBlock({
            position: { x: this.state.x, y: this.state.y },
            width: this.state.width,
            height: lib.HELIX_PLATFORM.height,
            type: 'platform',
        })]
    }

    /** The walkable surface, before this frame's step. */
    surface() {
        return { x: this.state.x, y: this.state.y, width: this.state.width }
    }

    step() {
        globalThis.__helixPlatform.stepHelix(this.state)
        const block = this.collisionBlocks[0]
        block.position.x = this.state.x
        block.position.y = this.state.y
        block.width = this.state.width
    }

    /** Back blade, mast, hub, front blade: the blade turned towards the view goes over the mast. */
    draw() {
        const lib = globalThis.__helixPlatform
        const { path, frame } = this.state
        const angle = lib.helixAngleAt(path, frame)
        const reach = path.radius * Math.cos(angle)
        // sin > 0: the blade reaching right (cos > 0) is the one nearer the view.
        const near = Math.sin(angle) >= 0 ? reach : -reach
        const { x, y } = path.center
        drawHelixBlade(x, y, -near, HELIX_BLADE.back)
        // The level's blocks are all in place by the first draw, and never move.
        this.mastFoot ??= lib.mastFoot(path.center, HELIX_MAST.width / 2, collisionBlocks, mapHeight)
        drawHelixMast(x, y, this.mastFoot)
        drawHelixBlade(x, y, near, HELIX_BLADE.front)
        drawHelixHub(x, y)
    }
}

// Blades, mast and hub, in 2× pixel-art px on a whole-pixel grid, so they
// don't shimmer as the blades turn.
const HELIX_BLADE = {
    height: 16,
    outline: '#3f3851',
    front: { face: '#a1acad', edge: '#dcf2ed', tip: '#e8703a' },
    back: { face: '#6e6f7a', edge: '#a1acad', tip: '#a8502e' },
}
const HELIX_MAST = { width: 16, iron: '#6e6f7a', shade: '#4a4a58', hub: 28, cap: '#a1acad', rivet: '#dcf2ed' }

function snap2(v) {
    return Math.round(v / 2) * 2
}

/** A blade from the hub at (x, y) reaching `reach` px (negative: to the left). */
function drawHelixBlade(x, y, reach, colours) {
    const length = snap2(Math.abs(reach))
    if (length < 4) return
    const left = reach < 0 ? snap2(x) - length : snap2(x)
    const top = snap2(y)
    const { height, outline } = HELIX_BLADE
    c.save()
    c.fillStyle = outline
    c.fillRect(left - 2, top - 2, length + 4, height + 4)
    c.fillStyle = colours.face
    c.fillRect(left, top, length, height)
    c.fillStyle = colours.edge
    c.fillRect(left, top, length, 4)
    // A glowing tip, hot from the lava below.
    c.fillStyle = colours.tip
    c.fillRect(reach < 0 ? left : left + length - Math.min(8, length), top, Math.min(8, length), height)
    c.restore()
}

/** The mast, from under the hub down to `foot` (helixPlatform.mjs mastFoot): a block, the bottom of the world, or a capped spindle. */
function drawHelixMast(x, y, { y: foot, capped }) {
    const { width, iron, shade } = HELIX_MAST
    const left = snap2(x - width / 2)
    const top = snap2(y + HELIX_BLADE.height)
    c.save()
    c.fillStyle = HELIX_BLADE.outline
    c.fillRect(left - 2, top, width + 4, foot - top)
    c.fillStyle = iron
    c.fillRect(left, top, width, foot - top)
    c.fillStyle = shade
    c.fillRect(left + width - 6, top, 6, foot - top)
    for (let band = top + 24; band < foot; band += 40) {
        c.fillStyle = HELIX_BLADE.outline
        c.fillRect(left, band, width, 4)
    }
    if (capped) {
        // A rounded iron cap, like the hub's, closing off the spindle.
        c.fillStyle = HELIX_BLADE.outline
        c.fillRect(left - 4, foot - 2, width + 8, 10)
        c.fillStyle = HELIX_MAST.cap
        c.fillRect(left - 2, foot, width + 4, 6)
    }
    c.restore()
}

function drawHelixHub(x, y) {
    const { hub, cap, rivet } = HELIX_MAST
    const left = snap2(x - hub / 2)
    const top = snap2(y)
    c.save()
    c.fillStyle = HELIX_BLADE.outline
    c.fillRect(left - 2, top - 2, hub + 4, HELIX_BLADE.height + 8)
    c.fillStyle = cap
    c.fillRect(left, top, hub, HELIX_BLADE.height + 4)
    c.fillStyle = rivet
    c.fillRect(left + 4, top + 6, 4, 4)
    c.fillRect(left + hub - 8, top + 6, 4, 4)
    c.restore()
}
