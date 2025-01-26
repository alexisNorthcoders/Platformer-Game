const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

canvas.width = 1024 // 64 * 16
canvas.height = 576 // 64 * 9

let parsedCollisions
let collisionBlocks
let background
let doors
let helloDialogue

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
                        player.preventInput = false
                        gsap.to(overlay, {
                            opacity: 0,
                        })
                    }
                })
            },
        },

    }
})

let level = 1
let levels = {
    1: {
        init: () => {
            parsedCollisions = collisionsLevel1.parse2D()
            collisionBlocks = parsedCollisions.createObjectsFrom2D()
            player.collisionBlocks = collisionBlocks
            enemy.collisionBlocks = collisionBlocks
            kingPig.collisionBlocks = collisionBlocks
            kingPig.switchSprite('idle')
            kingPig.position.y = 200
            kingPig.position.x = 400
            player.position.x = 100
            player.position.y = 300
            enemy.position.y = 300

            helloDialogue = new Sprite({
                position: {
                    x: player.position.x + 68,
                    y: player.position.y - 68,
                },
                imageSrc: './Sprites/13-Dialogue Boxes/Hello In (24x8).png',
                frameRate: 3,
                frameBuffer: 18,
                autoplay: true,
                loop: false
            });

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
            ],
                life = new Sprite({
                    position: {
                        x: 0,
                        y: 0
                    },
                    imageSrc: './img/Live Bar.png'
                })

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
            ],
                life = new Sprite({
                    position: {
                        x: 0,
                        y: 0
                    },
                    imageSrc: './img/Live Bar.png'
                })
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
            ],
                life = new Sprite({
                    position: {
                        x: 0,
                        y: 0
                    },
                    imageSrc: './img/Live Bar.png'
                })
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
            ],
                life = new Sprite({
                    position: {
                        x: 0,
                        y: 0
                    },
                    imageSrc: './img/Live Bar.png'
                })
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
            ],
                life = new Sprite({
                    position: {
                        x: 0,
                        y: 0
                    },
                    imageSrc: './img/Live Bar.png'
                })
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
            ],
                life = new Sprite({
                    position: {
                        x: 0,
                        y: 0
                    },
                    imageSrc: './img/Live Bar.png'
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

    // debug collisionBlocks
    /* collisionBlocks.forEach(collisionBlock => {
      collisionBlock.draw()
  })   */
    doors.forEach(door => {
        door.draw(2)
    })


    player.handleInput(keys)


    enemy.draw(2)
    kingPig.draw(2)
    enemy.update()
    kingPig.update()
    player.update()
    player.draw(2)
    if (player.isShowingHello) {

        helloDialogue.draw(2)
    }



    c.save()
    c.globalAlpha = overlay.opacity
    c.fillStyle = "black"
    c.fillRect(0, 0, canvas.width, canvas.height)
    c.restore()
}
levels[level].init()
animate()

