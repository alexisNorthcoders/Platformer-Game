const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

canvas.width = 1024 // 64 * 16
canvas.height = 576 // 64 * 9

let parsedCollisions
let collisionBlocks
let background
let doors

const enemy = new Enemy({
    imageSrc: './img/enemy/Idle (34x28).png',
    frameRate: 11,
    loop: true,
    autoplay: true,

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
            frameBuffer: 3,
            loop: false,
            imageSrc: './img/king/Attack (78x58).png',
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
                        if (level === 4) level = 1
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

            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/backgroundLevel1.png'
            })
            doors = [
                new Sprite({
                    position: {
                        x: 774,
                        y: 272
                    },
                    imageSrc: './img/doorOpen.png',
                    frameRate: 5,
                    frameBuffer: 5,
                    loop: false,
                    autoplay: false,
                })
            ]

        }
    },
    2: {
        init: () => {
            parsedCollisions = collisionsLevel2.parse2D()
            collisionBlocks = parsedCollisions.createObjectsFrom2D()
            player.collisionBlocks = collisionBlocks
            enemy.collisionBlocks = collisionBlocks
            player.position.x = 40
            player.position.y = 30
            enemy.position.x = 700
            enemy.position.y = 300

            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/backgroundLevel2.png'
            })
            doors = [
                new Sprite({
                    position: {
                        x: 772,
                        y: 334
                    },
                    imageSrc: './img/doorOpen.png',
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
            player.position.x = 770
            player.position.y = 100

            if (player.currentAnimation) player.currentAnimation.isActive = false

            background = new Sprite({
                position: {
                    x: 0,
                    y: 0
                },
                imageSrc: './img/backgroundLevel3.png'
            })
            doors = [
                new Sprite({
                    position: {
                        x: 176,
                        y: 335
                    },
                    imageSrc: './img/doorOpen.png',
                    frameRate: 5,
                    frameBuffer: 5,
                    loop: false,
                    autoplay: false,
                })
            ]
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
    space:{
        pressed: false
    }

}
const overlay = {
    opacity: 0
}

function animate() {
    window.requestAnimationFrame(animate)

    background.draw()

    // debug collisionBlocks
    /*  collisionBlocks.forEach(collisionBlock => {
       collisionBlock.draw()
   })   */
    doors.forEach(door => {
        door.draw()
    })


    player.handleInput(keys)


    enemy.draw()
    enemy.update()
    player.update()
    player.draw()



    c.save()
    c.globalAlpha = overlay.opacity
    c.fillStyle = "black"
    c.fillRect(0, 0, canvas.width, canvas.height)
    c.restore()
}
levels[level].init()
animate()

