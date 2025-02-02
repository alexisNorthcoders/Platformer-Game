class CollisionBlock {
    constructor({ width = 64, height = 64, position }) {
        this.position = position
        this.width = width
        this.height = height
    }
    draw() {
        c.fillStyle = 'rgba(255, 0, 0, 0.5)'
        c.fillRect(this.position.x, this.position.y, this.width, this.height)
    }
}