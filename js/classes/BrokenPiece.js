class BrokenPiece extends Sprite {
    constructor({ position, imageSrc, velocity, rotation }) {
        super({ position, imageSrc });
        this.velocity = velocity;
        this.rotation = rotation;
        this.width = 10
        this.height = 10
        this.isGrounded = false
    }

    update() {

        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.velocity.y += 0.1;

        this.checkForVerticalCollisions()
    }

    draw(scale) {
        if (this.isGrounded) { super.draw(scale) }
        else {
            c.save();

            c.imageSmoothingEnabled = false;
            c.translate(this.position.x + 5 * scale, this.position.y + 5 * scale);
            c.rotate((this.rotation * Math.PI) / 180);
            c.drawImage(
                this.image,
                -5 * scale,
                -5 * scale,
                10 * scale,
                10 * scale
            );
            c.restore();
        }

    }

    checkForVerticalCollisions() {
        // check for vertical collisions
        for (let i = 0; i < this.collisionBlocks.length; i++) {
            const collisionBlock = this.collisionBlocks[i]

            if (collisionBlock.type === 'box') continue
            // if collision exists
            if (this.position.x <= collisionBlock.position.x + collisionBlock.width &&
                this.position.x + this.width >= collisionBlock.position.x &&
                this.position.y + this.height >= collisionBlock.position.y &&
                this.position.y <= collisionBlock.position.y + collisionBlock.height) {
                this.isGrounded = true
                if (this.velocity.y < 0) {
                    this.velocity.y = 0
                    this.velocity.x = 0
                    this.position.y = collisionBlock.position.y + collisionBlock.height - 10
                    setTimeout(() => this.fade(0.0005), 500)
                    break
                }
                if (this.velocity.y > 0) {
                    this.velocity.y = 0
                    this.velocity.x = 0

                    this.position.y = collisionBlock.position.y - 10
                    setTimeout(() => this.fade(0.0005), 500)
                    break
                }
            } else { this.isGrounded = false }
        }
    }
}