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
            width: lib.plankWidth(path),
            height: lib.MOVING_PLATFORM.height,
            type: 'platform',
        })]
    }

    /** The walkable surface's top-left, before this frame's step. */
    surface() {
        return { x: this.state.x, y: this.state.y, width: this.collisionBlocks[0].width }
    }

    /** A plank on a Rotating Platform hangs from its hub by an iron chain, drawn behind it. */
    draw(scale) {
        const { center } = this.state.path
        if (center) drawHubChain(center, { x: this.state.x + this.collisionBlocks[0].width / 2, y: this.state.y })
        this.drawPlank(scale)
    }

    /**
     * The plank sprite; a short plank (`width` under the default) keeps the
     * sprite's two ends and drops its middle.
     */
    drawPlank(scale) {
        const surface = this.collisionBlocks[0].width
        if (surface >= globalThis.__movingPlatform.MOVING_PLATFORM.width || !this.loaded) return super.draw(scale)
        const { spriteOffsetX } = globalThis.__movingPlatform.MOVING_PLATFORM
        // Art px across the whole plank (surface plus the sprite's margin each side), cut from the sprite's two ends.
        const total = Math.min(this.width, Math.round((surface - 2 * spriteOffsetX) / scale))
        const left = Math.floor(total / 2)
        const right = total - left
        c.save()
        c.drawImage(this.image, 0, 0, left, this.height, this.position.x, this.position.y, left * scale, this.height * scale)
        c.drawImage(this.image, this.width - right, 0, right, this.height, this.position.x + left * scale, this.position.y, right * scale, this.height * scale)
        c.restore()
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
