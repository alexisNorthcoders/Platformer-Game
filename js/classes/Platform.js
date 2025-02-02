class Platform extends Sprite {
    constructor({ position, imageSrc = './Sprites/14-TileSets/platform.png', frameRate, animations, loop }) {
        super({ position, imageSrc, frameRate, animations, loop })

        this.collisionBlocks = [new CollisionBlock({ width: 104 * 2 - 14, height: 16 * 2 - 10, position: { x: position.x + 4, y: position.y + 11 } })]
    }
}

