/**
 * A Crumbling Shelf (crumblingShelf.mjs): a short, thin, cracked plank with a
 * one-way collision block. It shakes while it counts down, then falls with
 * its block, and fades back in where it was. index.js calls step() once a
 * frame while playing, before the King moves.
 */
class CrumblingShelf {
    constructor({ position, hideY }) {
        const lib = globalThis.__crumblingShelf
        this.state = lib.createShelfState({ x: position.x, y: position.y, hideY })
        this.collisionBlocks = [new CollisionBlock({
            position: { x: position.x, y: position.y },
            width: lib.CRUMBLING_SHELF.width,
            height: lib.CRUMBLING_SHELF.height,
            type: 'platform',
        })]
    }

    /** The walkable surface, before this frame's step. */
    surface() {
        return { x: this.state.x, y: this.state.y, width: globalThis.__crumblingShelf.CRUMBLING_SHELF.width }
    }

    /** Moves one frame; `input` is { landed, blocked }. Returns { dy, event }. */
    step(input) {
        const result = globalThis.__crumblingShelf.stepShelf(this.state, input)
        this.syncBlock()
        return result
    }

    /** Whole and still again, at once. */
    reset() {
        globalThis.__crumblingShelf.resetShelf(this.state)
        this.syncBlock()
    }

    /** The block follows the shelf; while it is out of sight it is parked far below. */
    syncBlock() {
        const lib = globalThis.__crumblingShelf
        const block = this.collisionBlocks[0]
        block.position.x = this.state.x
        block.position.y = lib.isSolid(this.state) ? this.state.y : 1e6
    }

    draw() {
        const lib = globalThis.__crumblingShelf
        const alpha = lib.shelfAlpha(this.state)
        if (alpha <= 0) return
        const { thickness, rim, brick, shade, crack } = SHELF
        const x = this.state.x + lib.shakeOffset(this.state)
        const y = Math.round(this.state.y)
        const width = lib.CRUMBLING_SHELF.width
        c.save()
        c.globalAlpha = alpha
        c.fillStyle = brick
        c.fillRect(x, y, width, thickness)
        c.fillStyle = rim
        c.fillRect(x, y, width, 4)
        c.fillStyle = shade
        c.fillRect(x, y + thickness - 4, width, 4)
        // Cracks, zigzagging down from the rim.
        c.fillStyle = crack
        for (const [cx, cy] of SHELF_CRACKS) c.fillRect(x + cx, y + cy, 2, 2)
        c.restore()
    }
}

// Drawn in 2x px, equal to paint_shelf in tools/levelgen.py.
const SHELF = { thickness: 14, brick: '#cb766a', rim: '#fbcaae', shade: '#965258', crack: '#3f3851' }
const SHELF_CRACKS = [[14, 2], [16, 4], [14, 6], [16, 8], [18, 10], [40, 0], [38, 2], [40, 4], [42, 6], [40, 8], [28, 6], [30, 8]]
