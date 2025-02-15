class Box extends Sprite {
    constructor({ position, imageSrc = './Sprites/08-Box/Idle.png', frameRate, animations, loop }) {
        super({ position, imageSrc, frameRate, animations, loop });

        this.collisionBlocks = [new CollisionBlock({ width: 22 * 2, height: 16 * 2, position, type: 'box' })];
        this.hitpoints = 2;
        this.hitbox = {
            position: { x: this.position.x, y: this.position.y },
            width: 44,
            height: 32
        };

        this.isBreaking = false;
        this.breakPieces = [];
    }

    hit() {
        this.hitpoints--;

        if (this.hitpoints > 0) {
            this.switchSprite('hit');
            this.currentAnimation = {
                onComplete: () => {
                    setTimeout(() => this.switchSprite('idle'), 120);
                }
            };
        } else {
            this.startBreaking();
        }
    }

    startBreaking() {
        this.isBreaking = true;
        for (let i = 0; i < 4; i++) {
            this.breakPieces.push(new BrokenPiece({
                position: { x: this.position.x, y: this.position.y },
                imageSrc: breakImages[i],
                velocity: { x: (Math.random() - 0.5) * 2, y: -Math.random() * 2 },
                rotation: Math.random() * 360
            }));
            this.breakPieces[i].collisionBlocks = collisionBlocks
        }
        setTimeout(() => {
            this.collisionBlocks[0].position = 0;
            this.fade()
        }, 100); 
    }

    update() {
        if (this.isBreaking) {
            this.breakPieces.forEach(piece => piece.update());
        }
    }


    switchSprite(name) {

        if (!this.animations[name] || this.image === this.animations[name].image) return

        else if (!this.hitCooldown) {

            this.currentFrame = 0
            this.image = this.animations[name].image
            this.frameRate = this.animations[name].frameRate
            this.frameBuffer = this.animations[name].frameBuffer
            this.loop = this.animations[name].loop
            this.currentAnimation = this.animations[name]
        }
    }

    draw(scale) {
        if (this.isBreaking) {
            this.breakPieces.forEach(piece => piece.draw(scale));
        } else {
            super.draw(scale);
        }
    }
}

