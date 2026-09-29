/**
 * A Moving Platform (movingPlatform.mjs): platform.png gliding along its path,
 * with a one-way collision block that moves with it. index.js calls step()
 * once a frame while playing, before the King moves.
 */
class MovingPlatform extends Sprite {
    constructor({ path, imageSrc = './Sprites/14-TileSets/platform.png' }) {
        const lib = globalThis.__movingPlatform
        const state = lib.createMovingPlatformState(path)
        super({
            position: { x: state.x + lib.MOVING_PLATFORM.spriteOffsetX, y: state.y + lib.MOVING_PLATFORM.spriteOffsetY },
            imageSrc,
        })
        this.state = state
        this.collisionBlocks = [new CollisionBlock({
            position: { x: state.x, y: state.y },
            width: lib.MOVING_PLATFORM.width,
            height: lib.MOVING_PLATFORM.height,
            type: 'platform',
        })]
    }

    /** The walkable surface's top-left, before this frame's step. */
    surface() {
        return { x: this.state.x, y: this.state.y }
    }

    /** A plank on a Rotating Platform hangs from its hub by an iron chain, drawn behind it. */
    draw(scale) {
        const { center } = this.state.path
        if (center) drawHubChain(center, { x: this.state.x + globalThis.__movingPlatform.MOVING_PLATFORM.width / 2, y: this.state.y })
        super.draw(scale)
    }

    /** Moves one frame along the path; returns { dx, dy }. */
    step() {
        const lib = globalThis.__movingPlatform
        const move = lib.stepMovingPlatform(this.state)
        const block = this.collisionBlocks[0]
        block.position.x = this.state.x
        block.position.y = this.state.y
        this.position.x = this.state.x + lib.MOVING_PLATFORM.spriteOffsetX
        this.position.y = this.state.y + lib.MOVING_PLATFORM.spriteOffsetY
        return move
    }
}

// Chain and hub, in 2× pixel-art px: square links on a whole-pixel grid, so
// they don't shimmer as the plank turns.
const HUB_CHAIN = { link: 4, gap: 10, hub: 20, outline: '#3f3851', iron: '#a1acad', rivet: '#dcf2ed' }

function drawHubChain(center, end) {
    const { link, gap, hub, outline, iron, rivet } = HUB_CHAIN
    const length = Math.hypot(end.x - center.x, end.y - center.y)
    const snap = v => Math.round(v / 2) * 2
    c.save()
    for (let d = hub / 2; d < length; d += gap) {
        const x = snap(center.x + (end.x - center.x) * d / length - link / 2)
        const y = snap(center.y + (end.y - center.y) * d / length - link / 2)
        c.fillStyle = outline
        c.fillRect(x - 2, y - 2, link + 4, link + 4)
        c.fillStyle = iron
        c.fillRect(x, y, link, link)
    }
    const x = snap(center.x - hub / 2)
    const y = snap(center.y - hub / 2)
    c.fillStyle = outline
    c.fillRect(x - 2, y - 2, hub + 4, hub + 4)
    c.fillStyle = iron
    c.fillRect(x, y, hub, hub)
    c.fillStyle = rivet
    c.fillRect(x + hub / 2 - 2, y + hub / 2 - 2, 4, 4)
    c.restore()
}
