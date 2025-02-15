class BrokenPiece extends Sprite {
    constructor({ position, imageSrc, velocity, rotation }) {
        super({ position, imageSrc });
        this.velocity = velocity;
        this.rotation = rotation;
    }

    update() {
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.velocity.y += 0.1;
    }

    draw(scale) {
        c.save();
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