class Box extends Sprite {
    constructor({ position, imageSrc = './Sprites/08-Box/Idle.png', frameRate, animations, loop }) {
        super({ position, imageSrc, frameRate, animations, loop })

        this.collisionBlocks = [new CollisionBlock({ width: 22 * 2, height: 16 * 2, position })]
    }
}

