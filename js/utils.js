Array.prototype.parse2D = function () {
    let step;
    if (this.length === 144) step = 16
    else step = 30

    const rows = []
    for (let i = 0; i < this.length; i += step) {
        rows.push(this.slice(i, i + step))
    }
    return rows
}

Array.prototype.createObjectsFrom2D = function () {
    const objects = []
    this.forEach((row, y) => {
        row.forEach((symbol, x) => {
            if (symbol === 292 || symbol === 291) {
                // push a new collision into collisionBlocks array
                objects.push(new CollisionBlock({
                    position: {
                        x: x * 64,
                        y: y * 64
                    }
                }))
            }
        })
    })
    return objects
}

function createNumberSprites(number, position = { x: 59, y: 55 }, frameRate = 10, imageSrc = './Sprites/12-Live and Coins/Numbers (6x8).png', spacing = 10) {
    const digits = String(number).split('');
    const sprites = [];

    digits.forEach((digit, index) => {

        const frame = digit === '0' ? 9 : parseInt(digit, 10) - 1;

        const sprite = new Sprite({
            position: {
                x: position.x + index * spacing,
                y: position.y
            },
            frameRate: frameRate,
            imageSrc: imageSrc,
            loop: false,
            autoplay: false,
        });

        sprite.currentFrame = frame;
        sprites.push(sprite);
    });

    return sprites;
}