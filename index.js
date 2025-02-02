const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

canvas.width = 1024 // 64 * 16
canvas.height = 576 // 64 * 9

let parsedCollisions
let collisionBlocks
let background
let doors

const enemy = new Enemy({
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

})

const kingPig = new Enemy({
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

})

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
                        levels[level].init()
                        player.switchSprite('idleRight')

                        gsap.to(overlay, {
                            opacity: 0,
                        })
                        if (level != 1) {
                            setTimeout(() => {
                                player.hello()
                                player.preventInput = false
                            }, 500);
                        }

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

let level = 9
let levels = {
    1: {
        init: () => {
            parsedCollisions = collisionsLevel1.parse2D()
            collisionBlocks = parsedCollisions.createObjectsFrom2D()
            player.collisionBlocks = collisionBlocks
            enemy.collisionBlocks = collisionBlocks
            kingPig.collisionBlocks = collisionBlocks
            diamond.collisionBlocks = collisionBlocks
            kingPig.switchSprite('idle')
            kingPig.position.y = 200
            kingPig.position.x = 400
            player.position.x = 100
            player.position.y = 300
            enemy.position.y = 300

            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/Level1.png'
            })
            doors = [
                new Sprite({
                    position: {
                        x: 846,
                        y: 273
                    },
                    imageSrc: './Sprites/11-Door/Opening (46x56).png',
                    frameRate: 5,
                    frameBuffer: 5,
                    loop: false,
                    autoplay: false,
                })
            ]

            setTimeout(() => {
                player.hello()
            }, 500);

        }
    },
    2: {
        init: () => {
            parsedCollisions = collisionsLevel2.parse2D()
            collisionBlocks = parsedCollisions.createObjectsFrom2D()
            player.collisionBlocks = collisionBlocks
            enemy.collisionBlocks = collisionBlocks
            kingPig.collisionBlocks = collisionBlocks
            player.position.x = 40
            player.position.y = 30
            kingPig.velocity.x = 0
            kingPig.switchSprite('idle')
            enemy.velocity.x = 0
            kingPig.position.x = 400
            kingPig.position.y = 400
            enemy.position.x = 700
            enemy.position.y = 400

            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/Level2.png'
            })
            doors = [
                new Sprite({
                    position: {
                        x: 852,
                        y: 336
                    },
                    imageSrc: './Sprites/11-Door/Opening (46x56).png',
                    frameRate: 5,
                    frameBuffer: 5,
                    loop: false,
                    autoplay: false,
                })
            ]


        }
    },
    3: {
        init: () => {
            parsedCollisions = collisionsLevel3.parse2D()
            collisionBlocks = parsedCollisions.createObjectsFrom2D()
            player.collisionBlocks = collisionBlocks
            enemy.collisionBlocks = collisionBlocks
            kingPig.collisionBlocks = collisionBlocks
            kingPig.velocity.x = 0
            enemy.velocity.x = 0
            player.position.x = 770
            player.position.y = 100
            enemy.position.y = 200
            enemy.position.x = 380
            kingPig.position.y = 200
            kingPig.position.x = 500

            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/Level3.png'
            })
            doors = [
                new Sprite({
                    position: {
                        x: 154,
                        y: 335
                    },
                    imageSrc: './Sprites/11-Door/Opening (46x56).png',
                    frameRate: 5,
                    frameBuffer: 5,
                    loop: false,
                    autoplay: false,
                })
            ]
        }
    },
    4: {
        init: () => {
            parsedCollisions = collisionsLevel4.parse2D()
            collisionBlocks = parsedCollisions.createObjectsFrom2D()
            player.collisionBlocks = collisionBlocks
            enemy.collisionBlocks = collisionBlocks
            kingPig.collisionBlocks = collisionBlocks
            kingPig.velocity.x = 0
            enemy.velocity.x = 0
            player.position.x = 100
            player.position.y = 500
            enemy.position.x = 700
            enemy.position.y = 100
            kingPig.position.x = 500
            kingPig.position.y = 100

            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/Level4.png'
            })
            doors = [
                new Sprite({
                    position: {
                        x: 850,
                        y: 142
                    },
                    imageSrc: './Sprites/11-Door/Opening (46x56).png',
                    frameRate: 5,
                    frameBuffer: 5,
                    loop: false,
                    autoplay: false,
                })
            ]
        }
    },
    5: {
        init: () => {
            parsedCollisions = collisionsLevel5.parse2D()
            collisionBlocks = parsedCollisions.createObjectsFrom2D()
            player.collisionBlocks = collisionBlocks
            enemy.collisionBlocks = collisionBlocks
            kingPig.collisionBlocks = collisionBlocks
            kingPig.velocity.x = 0
            enemy.velocity.x = 0
            kingPig.position.x = 350
            kingPig.position.y = 100
            player.position.x = 30
            player.position.y = 400
            enemy.position.x = 600
            enemy.position.y = 100


            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/Level5.png'
            })
            doors = [
                new Sprite({
                    position: {
                        x: 858,
                        y: 145
                    },
                    imageSrc: './Sprites/11-Door/Opening (46x56).png',
                    frameRate: 5,
                    frameBuffer: 5,
                    loop: false,
                    autoplay: false,
                })
            ]
        }
    },
    6: {
        init: () => {
            parsedCollisions = collisionsLevel6.parse2D()
            collisionBlocks = parsedCollisions.createObjectsFrom2D()
            player.collisionBlocks = collisionBlocks
            enemy.collisionBlocks = collisionBlocks
            kingPig.collisionBlocks = collisionBlocks
            kingPig.velocity.x = 0
            enemy.velocity.x = 0
            kingPig.position.x = 350
            kingPig.position.y = 200
            player.position.x = 80
            player.position.y = 500
            enemy.position.x = 700
            enemy.position.y = 500

            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/Level6.png'
            })
            doors = [
                new Sprite({
                    position: {
                        x: 850,
                        y: 402
                    },
                    imageSrc: './Sprites/11-Door/Opening (46x56).png',
                    frameRate: 5,
                    frameBuffer: 5,
                    loop: false,
                    autoplay: false,
                })
            ]
        }
    },
    7: {
        init: () => {
            parsedCollisions = collisionsLevel7.parse2D()
            collisionBlocks = parsedCollisions.createObjectsFrom2D()
            player.collisionBlocks = collisionBlocks
            enemy.collisionBlocks = collisionBlocks
            kingPig.collisionBlocks = collisionBlocks
            kingPig.velocity.x = 0
            enemy.velocity.x = 0
            kingPig.position.x = 350
            kingPig.position.y = 200
            player.position.x = 50
            player.position.y = 100
            enemy.position.x = 700
            enemy.position.y = 500

            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/Level7.png'
            })
            doors = [
                new Sprite({
                    position: {
                        x: 850,
                        y: 402
                    },
                    imageSrc: './Sprites/11-Door/Opening (46x56).png',
                    frameRate: 5,
                    frameBuffer: 5,
                    loop: false,
                    autoplay: false,
                })
            ]
        }
    },
    8: {
        init: () => {
            parsedCollisions = collisionsLevel8.parse2D()
            collisionBlocks = parsedCollisions.createObjectsFrom2D()
            player.collisionBlocks = collisionBlocks
            enemy.collisionBlocks = collisionBlocks
            kingPig.collisionBlocks = collisionBlocks
            kingPig.velocity.x = 0
            enemy.velocity.x = 0
            kingPig.position.x = 750
            kingPig.position.y = 100
            player.position.x = 50
            player.position.y = 500
            enemy.position.x = 700
            enemy.position.y = 100

            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/Level8.png'
            })
            doors = [
                new Sprite({
                    position: {
                        x: 750,
                        y: 402
                    },
                    imageSrc: './Sprites/11-Door/Opening (46x56).png',
                    frameRate: 5,
                    frameBuffer: 5,
                    loop: false,
                    autoplay: false,
                })
            ]
        }
    },
    9: {
        init: () => {
            parsedCollisions = collisionsLevel9.parse2D()
            collisionBlocks = parsedCollisions.createObjectsFrom2D()
            player.collisionBlocks = collisionBlocks
            enemy.collisionBlocks = collisionBlocks
            kingPig.collisionBlocks = collisionBlocks
            diamond.collisionBlocks = collisionBlocks
            kingPig.switchSprite('idle')
            kingPig.position.y = 200
            kingPig.position.x = 700
            player.position.x = 800
            player.position.y = 300
            enemy.position.y = 300

            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/Level9.png'
            })
            doors = [
                new Sprite({
                    position: {
                        x: 137,
                        y: 273
                    },
                    imageSrc: './Sprites/11-Door/Opening (46x56).png',
                    frameRate: 5,
                    frameBuffer: 5,
                    loop: false,
                    autoplay: false,
                })
            ]

            box = new Box({
                position: {
                    x: 228,
                    y: 352
                },
                imageSrc: './Sprites/08-Box/Idle.png'
            })

            collisionBlocks = collisionBlocks.concat(box.collisionBlocks);
            player.collisionBlocks = collisionBlocks

            setTimeout(() => {
                player.hello()
            }, 500);

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

    box.draw(2)
    box.update()
    enemy.draw(2)
    kingPig.draw(2)
    enemy.update()
    kingPig.update()
    player.update()
    player.draw(2)
    if (player.isShowingHello) {

        helloDialogue.draw(2)
    }

    // debug collisionBlocks
    collisionBlocks.forEach(collisionBlock => {
        collisionBlock.draw()
    })


    c.save()
    c.globalAlpha = overlay.opacity
    c.fillStyle = "black"
    c.fillRect(0, 0, canvas.width, canvas.height)
    c.restore()
}
levels[level].init()
animate()

