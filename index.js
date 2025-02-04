const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

canvas.width = 1024 // 64 * 16
canvas.height = 576 // 64 * 9

let parsedCollisions
let collisionBlocks
let background
let debugCollisions = false

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
            imageSrc: './img/king/AttackLeft (78x58).png',
        },
        enterDoor: {
            frameRate: 8,
            frameBuffer: 5,
            loop: false,
            imageSrc: './img/king/Door In (78x58).png',
            onComplete: () => {
                gsap.to(overlay, {
                    opacity: 1,
                    onComplete: () => {
                        level++
                        if (level === Object.keys(levels).length + 1) level = 1
                        levels[level].init(level)
                        player.switchSprite('idleRight')

                        gsap.to(overlay, {
                            opacity: 0,
                        })
                        setTimeout(() => {
                            player.hello()
                        }, 500);
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
            frameBuffer: 9,
            autoplay: true,
            loop: false,
        },
        helloOut: {
            frameRate: 3,
            frameBuffer: 9,
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
const numberSprites = createNumberSprites(
    1,
    { x: 59, y: 55 },
    10,
    './Sprites/12-Live and Coins/Numbers (6x8).png',
    10
);

const diamond = new Diamond({
    position: {
        x: 200,
        y: 200
    },
    frameRate: 10,
    frameBuffer: 4,
    imageSrc: './Sprites/12-Live and Coins/Big Diamond Idle (18x14).png'
})

function createBoxes(positions) {
    return positions.map(position => new Box({ position: { x: position[0], y: position[1] } }))
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
                frameBuffer: 11,
                loop: true,
                imageSrc: './Sprites/03-Pig/Idle (34x28).png',
            },
            runLeft: {
                frameRate: 6,
                frameBuffer: 6,
                loop: true,
                imageSrc: './Sprites/03-Pig/Run (34x28).png',
            }
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
    return positions.map(position => new Platform({ position: { x: position[0], y: position[1] } }))
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
function createAssets(level) {
    const { boxes, platforms, door, enemy } = loadBoxesSync(level)
    return {
        boxes: createBoxes(boxes), platforms: createPlatforms(platforms), doors: createDoor(door), enemies: createEnemies(enemy)
    }
}

let level = 1
let levels = {
    1: {
        init: (level) => {
            // load assets
            ({ boxes, platforms, doors, enemies } = createAssets(level))

            parsedCollisions = collisionsLevel1.parse2D()
            collisionBlocks = parsedCollisions.createObjectsFrom2D()
            collisionBlocks = collisionBlocks.concat(boxes.flatMap(box => box.collisionBlocks), platforms.flatMap(platform => platform.collisionBlocks));

            player.collisionBlocks = collisionBlocks
            enemies.forEach(enemy => enemy.collisionBlocks = collisionBlocks)

            diamond.collisionBlocks = collisionBlocks
            player.position.x = 50
            player.position.y = 200

            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/Level 1.png'
            })
        }
    },
    2: {
        init: (level) => {
            ({ boxes, platforms, doors, enemies } = createAssets(level))

            parsedCollisions = collisionsLevel2.parse2D()
            collisionBlocks = parsedCollisions.createObjectsFrom2D()
            collisionBlocks = collisionBlocks.concat(boxes.flatMap(box => box.collisionBlocks), platforms.flatMap(platform => platform.collisionBlocks));

            player.collisionBlocks = collisionBlocks
            enemies.forEach(enemy => enemy.collisionBlocks = collisionBlocks)
            player.position.x = 40
            player.position.y = 30

            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/Level 2.png'
            })
        }
    },
    3: {
        init: (level) => {
            ({ boxes, platforms, doors, enemies } = createAssets(level))

            parsedCollisions = collisionsLevel3.parse2D()
            collisionBlocks = parsedCollisions.createObjectsFrom2D()
            collisionBlocks = collisionBlocks.concat(boxes.flatMap(box => box.collisionBlocks), platforms.flatMap(platform => platform.collisionBlocks));

            player.collisionBlocks = collisionBlocks
            enemies.forEach(enemy => enemy.collisionBlocks = collisionBlocks)
            player.position.x = 770
            player.position.y = 100


            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/Level 3.png'
            })
        }
    },
    4: {
        init: (level) => {
            ({ boxes, platforms, doors, enemies } = createAssets(level))

            parsedCollisions = collisionsLevel4.parse2D()
            collisionBlocks = parsedCollisions.createObjectsFrom2D()
            collisionBlocks = collisionBlocks.concat(boxes.flatMap(box => box.collisionBlocks), platforms.flatMap(platform => platform.collisionBlocks));

            player.collisionBlocks = collisionBlocks
            enemies.forEach(enemy => enemy.collisionBlocks = collisionBlocks)
            player.position.x = 100
            player.position.y = 500

            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/Level 4.png'
            })
        }
    },
    5: {
        init: (level) => {
            ({ boxes, platforms, doors, enemies } = createAssets(level))

            parsedCollisions = collisionsLevel5.parse2D()
            collisionBlocks = parsedCollisions.createObjectsFrom2D()
            collisionBlocks = collisionBlocks.concat(boxes.flatMap(box => box.collisionBlocks), platforms.flatMap(platform => platform.collisionBlocks));

            player.collisionBlocks = collisionBlocks
            enemies.forEach(enemy => enemy.collisionBlocks = collisionBlocks)
            player.position.x = 30
            player.position.y = 400

            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/Level 5.png'
            })
        }
    },
    6: {
        init: (level) => {
            ({ boxes, platforms, doors, enemies } = createAssets(level))

            parsedCollisions = collisionsLevel6.parse2D()
            collisionBlocks = parsedCollisions.createObjectsFrom2D()
            collisionBlocks = collisionBlocks.concat(boxes.flatMap(box => box.collisionBlocks), platforms.flatMap(platform => platform.collisionBlocks));

            player.collisionBlocks = collisionBlocks
            enemies.forEach(enemy => enemy.collisionBlocks = collisionBlocks)
            player.position.x = 80
            player.position.y = 500

            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/Level 6.png'
            })
        }
    },
    7: {
        init: (level) => {

            ({ boxes, platforms, doors, enemies } = createAssets(level))

            parsedCollisions = collisionsLevel7.parse2D()
            collisionBlocks = parsedCollisions.createObjectsFrom2D()
            collisionBlocks = collisionBlocks.concat(boxes.flatMap(box => box.collisionBlocks), platforms.flatMap(platform => platform.collisionBlocks));

            player.collisionBlocks = collisionBlocks
            enemies.forEach(enemy => enemy.collisionBlocks = collisionBlocks)
            player.position.x = 50
            player.position.y = 100

            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/Level 7.png'
            })
        }
    },
    8: {
        init: (level) => {

            ({ boxes, platforms, doors, enemies } = createAssets(level))

            parsedCollisions = collisionsLevel8.parse2D()
            collisionBlocks = parsedCollisions.createObjectsFrom2D()

            collisionBlocks = collisionBlocks.concat(boxes.flatMap(box => box.collisionBlocks), platforms.flatMap(platform => platform.collisionBlocks));

            player.collisionBlocks = collisionBlocks
            enemies.forEach(enemy => enemy.collisionBlocks = collisionBlocks)

            player.position.x = 50
            player.position.y = 500


            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/Level 8.png'
            })
        }
    },
    9: {
        init: (level) => {
           ({ boxes, platforms, doors, enemies } = createAssets(level))

            parsedCollisions = collisionsLevel9.parse2D()
            collisionBlocks = parsedCollisions.createObjectsFrom2D()

            collisionBlocks = collisionBlocks.concat(boxes.flatMap(box => box.collisionBlocks), platforms.flatMap(platform => platform.collisionBlocks));

            player.collisionBlocks = collisionBlocks
            enemies.forEach(enemy => enemy.collisionBlocks = collisionBlocks)
            diamond.collisionBlocks = collisionBlocks

            player.position.x = 800
            player.position.y = 300

            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/Level 9.png'
            })
        }
    },
}

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

function animate() {
    c.imageSmoothingEnabled = false;
    window.requestAnimationFrame(animate)

    background.draw(2)
    life.draw(2)
    heart_1.draw(2)
    heart_2.draw(2)
    heart_3.draw(2)
    diamond_1.draw(2)
    numberSprites.forEach(sprite => {
        sprite.draw(2);
    });
    diamond.draw(2)
    diamond.update()

    doors.forEach(door => {
        door.draw(2)
    })


    player.handleInput(keys)

    boxes.forEach(box => {
        box.draw(2)
    })
    if (platforms) {
        platforms.forEach(platform => {
            platform.draw(2)
        })
    }
    if (enemies) {
        enemies.forEach(enemy => {
            enemy.draw(2)
            enemy.update()
        })
    }

    player.update()
    player.draw(2)
    if (player.isShowingHello) {

        helloDialogue.draw(2)
    }

    // debug collisionBlocks
    if (debugCollisions) {
        collisionBlocks.forEach(collisionBlock => {
            collisionBlock.draw()
        })
    }

    c.save()
    c.globalAlpha = overlay.opacity
    c.fillStyle = "black"
    c.fillRect(0, 0, canvas.width, canvas.height)
    c.restore()
}
levels[level].init(level)
animate()

