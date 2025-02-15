class CollisionBlock {
    constructor({ width = 64, height = 64, position, type = 'default' }) {
        this.position = position
        this.width = width
        this.height = height
        this.type = type
    }
    draw() {
        c.fillStyle = 'rgba(255, 0, 0, 0.5)'
        c.fillRect(this.position.x, this.position.y, this.width, this.height)
    }
}