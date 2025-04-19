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

let level = 17

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
    if (cannon) {
        cannon.forEach(x => {
            x.draw(2)
            x.update()
        })
    }
    if (enemyMatch) {
        enemyMatch.forEach(x => x.draw(2))
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

    hearts.forEach(heart => {
        if (heart.loaded) {
            heart.draw(2);
        }
    });

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


