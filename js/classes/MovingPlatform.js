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
