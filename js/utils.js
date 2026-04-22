Array.prototype.parse2D = function () {
    let step;
    if (this.length === 144) step = 16
    else if (this.length === 288) step = 32
    else if (this.length === 432) step = 48
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

const LevelProgressKeys = (function () {
    const collectedDiamonds = new Set()
    const defeatedEnemies = new Set()

    function diamondKey(levelNum, x, y) {
        return `d:${levelNum}:${x},${y}`
    }

    function enemyKey(levelNum, kind, x, y) {
        return `e:${levelNum}:${kind}:${x},${y}`
    }

    return {
        markDiamondCollected(levelNum, x, y) {
            collectedDiamonds.add(diamondKey(levelNum, x, y))
        },
        markEnemyDefeated(levelNum, kind, x, y) {
            defeatedEnemies.add(enemyKey(levelNum, kind, x, y))
        },
        isDiamondCollected(levelNum, x, y) {
            return collectedDiamonds.has(diamondKey(levelNum, x, y))
        },
        isEnemyDefeated(levelNum, kind, x, y) {
            return defeatedEnemies.has(enemyKey(levelNum, kind, x, y))
        },
        clearAll() {
            collectedDiamonds.clear()
            defeatedEnemies.clear()
        }
    }
})()

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
function createEnemies(positions, levelNum) {
    return positions.map(position => new Enemy({
        position: { x: position[0], y: position[1] },
        spawnTrack: { levelId: levelNum, kind: 'pig', spawnX: position[0], spawnY: position[1] },
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
            }
        }
    }))
}
function createEnemiesWithMatch(positions, levelNum) {
    return positions.map(position => new Enemy({
        position: { x: position[0], y: position[1] - 5 },
        enemyVariant: 'match',
        spawnTrack: { levelId: levelNum, kind: 'match', spawnX: position[0], spawnY: position[1] },
        imageSrc: './Sprites/07-Pig With a Match/Match On (26x18).png',
        frameRate: 3,
        frameBuffer: 6,
        loop: true,
        autoplay: true,
        animations: {
            matchOn: {
                frameRate: 3,
                frameBuffer: 6,
                loop: true,
                imageSrc: './Sprites/07-Pig With a Match/Match On (26x18).png',
            },
            lightMatch: {
                frameRate: 3,
                frameBuffer: 6,
                loop: false,
                imageSrc: './Sprites/07-Pig With a Match/Lighting the Match (26x18).png',
            },
            lightCannon: {
                frameRate: 3,
                frameBuffer: 12,
                loop: false,
                imageSrc: './Sprites/07-Pig With a Match/Lighting the Cannon (26x18).png'
            }
        }
    }))
}
function createEnemyKing(positions, levelNum) {
    return positions.map(position => new Enemy({
        position: { x: position[0], y: position[1] },
        enemyVariant: 'king',
        spawnTrack: { levelId: levelNum, kind: 'king', spawnX: position[0], spawnY: position[1] },
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
function createDiamonds(positions, levelNum) {
    return positions.map(position => new Diamond({
        position: { x: position[0] - 10, y: position[1] + 10 },
        levelId: levelNum,
        spawnRawX: position[0],
        spawnRawY: position[1],
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
function createCannon(positions) {
    return positions.map(position => new Cannon({
        position: { x: position[0], y: position[1] - 26 },
        imageSrc: './Sprites/10-Cannon/Idle.png',
        animations: {
            idle:{
                imageSrc: './Sprites/10-Cannon/Idle.png',
            },
            shoot: {
                frameRate: 4,
                frameBuffer: 10,
                loop: false,
                imageSrc: './Sprites/10-Cannon/Shoot (44x28).png',
            }
        }
    }))
}

async function createAssets(level, options = {}) {
    const preserve = options.preserveCollectedProgress === true
    const { boxes, platforms, door, enemy, collisions, enemyKing, diamonds, platforms_2, levelWidth, cannon, enemyMatch } = await loadAssets(level, 2)
    const diamondPositions = preserve
        ? diamonds.filter(([x, y]) => !LevelProgressKeys.isDiamondCollected(level, x, y))
        : diamonds
    const enemyPositions = preserve
        ? enemy.filter(([x, y]) => !LevelProgressKeys.isEnemyDefeated(level, 'pig', x, y))
        : enemy
    const enemyKingPositions = preserve
        ? enemyKing.filter(([x, y]) => !LevelProgressKeys.isEnemyDefeated(level, 'king', x, y))
        : enemyKing
    const enemyMatchPositions = preserve
        ? enemyMatch.filter(([x, y]) => !LevelProgressKeys.isEnemyDefeated(level, 'match', x, y))
        : enemyMatch
    const platforms_2Collisiongs = platforms_2.parse2D()
    const platformsBlocks = platforms_2Collisiongs.createObjectsFrom2D(64, 5, 'platform')
    const parsedCollisions = collisions.parse2D()
    const collisionBlocks = parsedCollisions.createObjectsFrom2D()
    return {
        boxes: createBoxes(boxes),
        platforms: createPlatforms(platforms),
        doors: createDoor(door),
        enemies: createEnemies(enemyPositions, level),
        cannon: createCannon(cannon),
        enemyMatch: createEnemiesWithMatch(enemyMatchPositions, level),
        enemyKing: createEnemyKing(enemyKingPositions, level),
        collisionBlocks,
        platformsBlocks,
        background: createBackground(level),
        diamonds: createDiamonds(diamondPositions, level),
        levelWidth
    }
}
function applyCollisions(player, enemies, enemyKing, enemyMatch, collisionBlocks) {
    player.collisionBlocks = collisionBlocks
    enemies.forEach(enemy => enemy.collisionBlocks = collisionBlocks)
    enemyKing.forEach(king => king.collisionBlocks = collisionBlocks)
    enemyMatch.forEach(match => match.collisionBlocks = collisionBlocks)
}
async function initializeLevel(level, playerPosition, lastDirection, options = {}) {
    ({ boxes, platforms, doors, enemies, collisionBlocks, enemyKing, background, diamonds, platformsBlocks, levelWidth, cannon, enemyMatch } = await createAssets(level, options));

    collisionBlocks = collisionBlocks.concat(platformsBlocks,
        boxes.flatMap(box => box.collisionBlocks),
        platforms.flatMap(platform => platform.collisionBlocks)
    );

    applyCollisions(player, enemies, enemyKing, enemyMatch, collisionBlocks);

    if (player.contactDamageTimeoutId) {
        clearTimeout(player.contactDamageTimeoutId)
        player.contactDamageTimeoutId = null
    }
    player.hitCooldown = false

    player.setPosition(playerPosition)
    player.lastDirection = lastDirection
    EnemyTracker.initializeLevel(enemies.length)
    doorClosed = true

    mapWidth = levelWidth

    if (player.currentAnimation) player.currentAnimation.isActive = false;
    if (level === 1 && !options.skipLevelIntro) {
        setTimeout(() => {
            player.hello()
        }, 500);
    }
}
async function initLevel(levelNumber, options = {}) {
    const level = levels[levelNumber];
    if (!level) {
        console.error(`Level ${levelNumber} does not exist.`);
        return;
    }
    await initializeLevel(levelNumber, level.playerPosition, level.lastDirection, options);
}