const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

canvas.width = 1024 // 64 * 16
canvas.height = 576 // 64 * 9

let collisionBlocks
let background
let debugCollisions = false
let diamondCount = 0
let mapWidth
let doorClosed = true

const breakImages = [
    './Sprites/08-Box/Box Pieces 1.png',
    './Sprites/08-Box/Box Pieces 2.png',
    './Sprites/08-Box/Box Pieces 3.png',
    './Sprites/08-Box/Box Pieces 4.png'
];



const player = new Player({

    imageSrc: './img/king/IdleRight.png',
    frameRate: 11,
    animations: {
        idleRight: {
            frameRate: 11,
            frameBuffer: 2,
            loop: true,
            imageSrc: './img/king/IdleRight.png',
        },
        hit: {
            frameRate: 2,
            frameBuffer: 8,
            loop: true,
            imageSrc: './img/king/Hit (78x58).png',

        },
        jump: {
            frameRate: 1,
            frameBuffer: 2,
            loop: true,
            imageSrc: './img/king/Jump (78x58).png',
        },
        jumpLeft: {
            frameRate: 1,
            frameBuffer: 2,
            loop: true,
            imageSrc: './img/king/Jump (78x58).png',
            flip: true
        },

        idleLeft: {
            frameRate: 11,
            frameBuffer: 2,
            loop: true,
            imageSrc: './img/king/IdleLeft.png',
        },
        runRight: {
            frameRate: 8,
            frameBuffer: 5,
            loop: true,
            imageSrc: './img/king/RunRight.png',
        },
        runLeft: {
            frameRate: 8,
            frameBuffer: 5,
            loop: true,
            imageSrc: './img/king/RunLeft.png',
        },
        attack: {
            frameRate: 3,
            frameBuffer: 6,
            loop: false,
            imageSrc: './img/king/Attack (78x58).png',
        },
        attackLeft: {
            frameRate: 3,
            frameBuffer: 6,
            loop: false,
            imageSrc: './img/king/Attack (78x58).png',
            flip: true
        },
        enterDoor: {
            frameRate: 8,
            frameBuffer: 5,
            loop: false,
            imageSrc: './img/king/Door In (78x58).png',
            onComplete: async () => {
                gsap.to(overlay, {
                    opacity: 1,
                    onComplete: async () => {
                        level++
                        if (level === Object.keys(levels).length + 1) level = 1
                        await initLevel(level)
                        player.switchSprite('idleRight')
                        gsap.to(overlay, {
                            opacity: 0,
                            onComplete: () => {
                                player.hello()
                                player.preventInput = false
                            }
                        })
                    }
                })
            },
        },

    }
})

const helloDialogue = new DialogBox({
    position: {
        x: player.position.x + 68,
        y: player.position.y - 68,
    },
    imageSrc: './Sprites/13-Dialogue Boxes/Hello In (24x8).png',
    frameRate: 3,
    frameBuffer: 18,
    autoplay: true,
    loop: false,
    animations: {
        helloIn: {
            imageSrc: './Sprites/13-Dialogue Boxes/Hello In (24x8).png',
            frameRate: 3,
            frameBuffer: 18,
            autoplay: true,
            loop: false,
        },
        helloOut: {
            frameRate: 3,
            frameBuffer: 18,
            autoplay: true,
            loop: false,
            imageSrc: './Sprites/13-Dialogue Boxes/Hello Out (24x8).png',
        }
    }
})

const life = new Sprite({
    position: {
        x: 0,
        y: 0
    },
    imageSrc: './img/Live Bar.png'
})

const heart_1 = new Sprite({
    position: {
        x: 22,
        y: 20
    },
    frameRate: 8,
    frameBuffer: 8,
    imageSrc: './Sprites/12-Live and Coins/Small Heart Idle (18x14).png'
})
const heart_2 = new Sprite({
    position: {
        x: 44,
        y: 20
    },
    frameRate: 8,
    frameBuffer: 8,
    imageSrc: './Sprites/12-Live and Coins/Small Heart Idle (18x14).png'
})
const heart_3 = new Sprite({
    position: {
        x: 66,
        y: 20
    },
    frameRate: 8,
    frameBuffer: 8,
    imageSrc: './Sprites/12-Live and Coins/Small Heart Idle (18x14).png'
})

const diamond_1 = new Sprite({
    position: {
        x: 22,
        y: 50
    },
    frameRate: 8,
    frameBuffer: 8,
    imageSrc: './Sprites/12-Live and Coins/Small Diamond (18x14).png'
})
let numberSprites = createNumberSprites(diamondCount);
let enemyNumberSprite = createNumberSprites(EnemyTracker.getEnemyCount(), { x: 50, y: 80 })
const enemy_face = new Sprite({
    position: {
        x: 12,
        y: 70
    },
    frameRate: 4,
    loop: false,
    autoplay: false,
    imageSrc: './Sprites/03-Pig/Dead (34x28).png'
})

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

let level = 1
const levels = {
    1: { playerPosition: { x: 50, y: 200 }, lastDirection: 'right' },
    2: { playerPosition: { x: 170, y: 41 }, lastDirection: 'right' },
    3: { playerPosition: { x: 770, y: 100 }, lastDirection: 'left' },
    4: { playerPosition: { x: 100, y: 500 }, lastDirection: 'right' },
    5: { playerPosition: { x: 30, y: 400 }, lastDirection: 'right' },
    6: { playerPosition: { x: 80, y: 500 }, lastDirection: 'right' },
    7: { playerPosition: { x: 170, y: 41 }, lastDirection: 'right' },
    8: { playerPosition: { x: 50, y: 500 }, lastDirection: 'right' },
    9: { playerPosition: { x: 800, y: 300 }, lastDirection: 'left' },
    10: { playerPosition: { x: 800, y: 100 }, lastDirection: 'left' },
    11: { playerPosition: { x: 34, y: 425 }, lastDirection: 'right' },
    12: { playerPosition: { x: 34, y: 325 }, lastDirection: 'right' },
};

const keys = {
    w: {
        pressed: false
    },
    a: {
        pressed: false
    },
    d: {
        pressed: false
    },
    space: {
        pressed: false
    }

}
const overlay = {
    opacity: 0
}

let camera = {
    x: 0,
    y: 0
}

function animate() {

    if (enemies.length) {
        enemies = enemies.filter(enemy => enemy.opacity)
    }
    c.imageSmoothingEnabled = false;
    window.requestAnimationFrame(animate)

    if (doorClosed && EnemyTracker.isLevelHalfCleared()) {
        doorClosed = false
        doors[0].play()
    }



    // Clear canvas
    c.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate camera position
    let playerCenterX = player.position.x - canvas.width / 2;
    let maxCameraX = mapWidth - canvas.width;

    // Clamp camera position
    camera.x = Math.max(0, Math.min(playerCenterX, maxCameraX));

    // Apply camera transformation
    c.save();
    c.translate(-camera.x, 0);  // Move everything relative to camera

    // Draw background & UI elements
    background.draw(2);

    doors.forEach(door => {
        door.draw(2);
    });

    player.handleInput(keys);

    boxes.forEach(box => {
        box.draw(2);
        box.update();
    });

    if (platforms) {
        platforms.forEach(platform => {
            platform.draw(2);
        });
    }
    if (enemies) {
        enemies.forEach(enemy => {
            enemy.draw(2);
            enemy.update();
        });
    }
    if (enemyKing) {
        enemyKing.forEach(king => {
            king.draw(2);
            king.update();
        });
    }

    player.draw(2);
    if (diamonds) {
        diamonds.forEach(diamond => {
            if (diamond.loaded) {
                diamond.draw(2);
                diamond.update();
            }
        });
    }
    player.update();

    if (player.isShowingHello) {
        helloDialogue.draw(2);
    }

    // debug collisionBlocks
    if (debugCollisions) {
        collisionBlocks.forEach(collisionBlock => {
            collisionBlock.draw();
        });
    }

    c.restore(); // Restore canvas to default state


    // static life bar
    life.draw(2);
    heart_1.draw(2);
    heart_2.draw(2);
    heart_3.draw(2);
    diamond_1.draw(2);
    enemy_face.draw(1)
    numberSprites.forEach(sprite => {
        sprite.draw(2);
    });
    enemyNumberSprite.forEach(sprite => {
        sprite.draw(2);
    });


    // Overlay effect
    c.save();
    c.globalAlpha = overlay.opacity;
    c.fillStyle = "black";
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.restore();
}

initLevel(level).then(() => animate())


