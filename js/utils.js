Array.prototype.parse2D = function () {
    let step;
    if (this.length === 144) step = 16
    else if (this.length === 288) step = 32
    else step = 30

    const rows = []
    for (let i = 0; i < this.length; i += step) {
        rows.push(this.slice(i, i + step))
    }
    return rows
}

Array.prototype.createObjectsFrom2D = function (width, height, type) {
    const objects = []
    this.forEach((row, y) => {
        row.forEach((symbol, x) => {
            if (symbol === 292 || symbol === 291 || symbol === 260) {
                // push a new collision into collisionBlocks array
                objects.push(new CollisionBlock({
                    position: {
                        x: x * 64,
                        y: y * 64
                    },
                    width,
                    height,
                    type
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
function createBoxes(positions) {
    return positions.map(position => new Box(
        {
            position: { x: position[0], y: position[1] },
            animations: {
                hit: {
                    frameRate: 1,
                    frameBuffer: 1,
                    loop: false,
                    imageSrc: './Sprites/08-Box/Hit.png',
                },
                idle: {
                    frameRate: 1,
                    frameBuffer: 1,
                    loop: false,
                    imageSrc: './Sprites/08-Box/Idle.png',
                }
            }
        }))
}
function createEnemies(positions) {
    return positions.map(position => new Enemy({
        position: { x: position[0], y: position[1] },
        imageSrc: './Sprites/03-Pig/Idle (34x28).png',
        frameRate: 11,
        loop: true,
        autoplay: true,
        animations: {
            idle: {
                frameRate: 11,
                frameBuffer: 2,
                loop: true,
                imageSrc: './Sprites/03-Pig/Idle (34x28).png',
            },
            runLeft: {
                frameRate: 6,
                frameBuffer: 6,
                loop: true,
                imageSrc: './Sprites/03-Pig/Run (34x28).png',
            },
            hit: {
                frameRate: 2,
                frameBuffer: 12,
                loop: false,
                imageSrc: './Sprites/03-Pig/Hit (34x28).png'
            },
            dead: {
                frameRate: 4,
                frameBuffer: 12,
                loop: false,
                imageSrc: './Sprites/03-Pig/Dead (34x28).png'
            },
            attack: {
                frameRate: 5,
                frameBuffer: 12,
                loop: false,
                imageSrc: './Sprites/03-Pig/Attack (34x28).png'
            },
            jump: {
                frameRate: 1,
                loop: false,
                imageSrc: './Sprites/03-Pig/Jump (34x28).png'
            },
            fall: {
                frameRate: 1,
                loop: false,
                imageSrc: './Sprites/03-Pig/Fall (34x28).png'
            },

        }

    }))
}
function createEnemyKing(positions) {
    return positions.map(position => new Enemy({
        position: { x: position[0], y: position[1] },
        imageSrc: './Sprites/02-King Pig/Idle (38x28).png',
        frameRate: 12,
        loop: true,
        autoplay: true,
        animations: {
            idle: {
                frameRate: 12,
                frameBuffer: 6,
                loop: true,
                imageSrc: './Sprites/02-King Pig/Idle (38x28).png',
            },
            runLeft: {
                frameRate: 6,
                frameBuffer: 6,
                loop: true,
                imageSrc: './Sprites/02-King Pig/Run (38x28).png',
            }
        }
    }))
}
function createPlatforms(positions) {
    return positions.map(position => new Platform({ position: { x: position[0], y: position[1] - 13 } }))
}
function createDoor(positions) {
    return positions.map(position => new Sprite({
        position: { x: position[0], y: position[1] - 56 - 23 },
        imageSrc: './Sprites/11-Door/Opening (46x56).png',
        frameRate: 5,
        frameBuffer: 5,
        loop: false,
        autoplay: false,
    }))
}
function createBackground(level) {
    return new Sprite({
        position: {
            x: 0,
            y: 0
        },
        imageSrc: `./img/Level ${level}.png`
    })
}
function createDiamonds(positions) {
    return positions.map(position => new Diamond({
        position: { x: position[0] - 10, y: position[1] + 10 },
        autoplay: false,
        loop: false,
        frameRate: 10,
        frameBuffer: 10,
        random: true,
        imageSrc: './Sprites/12-Live and Coins/Big Diamond Idle (18x14).png',
        animations: {
            hit: {
                frameRate: 2,
                frameBuffer: 18,
                loop: false,
                imageSrc: './Sprites/12-Live and Coins/Big Diamond Hit (18x14).png',
            }
        }
    }))
}

async function createAssets(level) {
    const { boxes, platforms, door, enemy, collisions, enemyKing, diamonds, platforms_2, levelWidth } = await loadAssets(level, 2)
    const platforms_2Collisiongs = platforms_2.parse2D()
    const platformsBlocks = platforms_2Collisiongs.createObjectsFrom2D(64, 5, 'platform')
    const parsedCollisions = collisions.parse2D()
    const collisionBlocks = parsedCollisions.createObjectsFrom2D()
    return {
        boxes: createBoxes(boxes),
        platforms: createPlatforms(platforms),
        doors: createDoor(door),
        enemies: createEnemies(enemy),
        enemyKing: createEnemyKing(enemyKing),
        collisionBlocks,
        platformsBlocks,
        background: createBackground(level),
        diamonds: createDiamonds(diamonds),
        levelWidth
    }
}
function applyCollisions(player, enemies, enemyKing, collisionBlocks) {
    player.collisionBlocks = collisionBlocks
    enemies.forEach(enemy => enemy.collisionBlocks = collisionBlocks)
    enemyKing.forEach(king => king.collisionBlocks = collisionBlocks)
}
async function initializeLevel(level, playerPosition, lastDirection) {
    ({ boxes, platforms, doors, enemies, collisionBlocks, enemyKing, background, diamonds, platformsBlocks, levelWidth } = await createAssets(level));

    collisionBlocks = collisionBlocks.concat(platformsBlocks,
        boxes.flatMap(box => box.collisionBlocks),
        platforms.flatMap(platform => platform.collisionBlocks)
    );

    applyCollisions(player, enemies, enemyKing, collisionBlocks);

    player.setPosition(playerPosition)
    player.lastDirection = lastDirection
    EnemyTracker.initializeLevel(enemies.length)
    doorClosed = true

    mapWidth = levelWidth

    if (player.currentAnimation) player.currentAnimation.isActive = false;
    if (level === 1) {
        setTimeout(() => {
            player.hello()
        }, 500);
    }
}
async function initLevel(levelNumber) {
    const level = levels[levelNumber];
    if (!level) {
        console.error(`Level ${levelNumber} does not exist.`);
        return;
    }
    await initializeLevel(levelNumber, level.playerPosition, level.lastDirection);
}