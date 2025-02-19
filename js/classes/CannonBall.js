class CannonBall extends Sprite {
    constructor({ position, animations, imageSrc = './Sprites/10-Cannon/Cannon Ball.png', velocity, rotation }) {
        super({ position, animations, imageSrc });
        this.velocity = velocity;
        this.rotation = rotation;
        this.isGrounded = false
        this.gravity = 0.2
        this.bomb
    }

    updateHitbox() {
        this.hitbox = {
            position: {
                x: this.position.x + 45,
                y: this.position.y + 23
            },
            width: 28,
            height: 28
        }
    }

    update() {

        this.updateHitbox()

        if (debugCollisions) {
            c.fillStyle = 'rgba(248, 8, 120, 0.56)'
            c.fillRect(
                this.hitbox.position.x,
                this.hitbox.position.y,
                this.hitbox.width,
                this.hitbox.height)
        }

        this.position.x += this.velocity.x;
        if (!this.isGrounded) this.applyGravity()

        this.checkForVerticalCollisions()
    }

    draw(scale) {
        if (this.exploded && this.bomb) {
            this.bomb.draw(scale);
        } else if (!this.exploded) {
            super.draw(scale);
        }
    }
    explosion() {
        this.bomb = new Sprite({
            position: {
                x: this.position.x + 5,
                y: this.position.y - 20
            },
            frameRate: 6,
            frameBuffer: 8,
            loop: false,
            imageSrc: './Sprites/09-Bomb/Boooooom (52x56).png',
            animations: {
                explode: {
                    imageSrc: './Sprites/09-Bomb/Boooooom (52x56).png',
                    frameRate: 6,
                    loop: false,
                    onComplete: () => {
                        this.bomb = null;
                    }
                }
            }
        });

        this.bomb.currentAnimation = this.bomb.animations.explode;

    }

    checkForVerticalCollisions() {
        // check for vertical collisions
        for (let i = 0; i < this.collisionBlocks.length; i++) {
            const collisionBlock = this.collisionBlocks[i]
            // if collision exists
            if (this.hitbox.position.x <= collisionBlock.position.x + collisionBlock.width &&
                this.hitbox.position.x + this.hitbox.width >= collisionBlock.position.x &&
                this.hitbox.position.y + this.hitbox.height >= collisionBlock.position.y &&
                this.hitbox.position.y <= collisionBlock.position.y + collisionBlock.height) {
                this.isGrounded = true

                if (this.velocity.y > 0) {
                    this.velocity.y = 0
                    this.velocity.x = 0


                    if (!this.exploded) {
                        this.explosion()
                        setTimeout(() => this.fade(0.0005), 500)
                    }
                    this.exploded = true

                    break
                }
            }
        }
    }

    applyGravity() {
        this.velocity.y += this.gravity;
        this.position.y += this.velocity.y;
    }
}