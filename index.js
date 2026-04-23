const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

canvas.width = 1024 // 64 * 16
canvas.height = 576 // 64 * 9

const SELECTED_LEVEL_STORAGE_KEY = 'platformerSelectedLevel'

function readStoredSelectedLevel() {
    try {
        const raw = localStorage.getItem(SELECTED_LEVEL_STORAGE_KEY)
        if (raw == null) return 1
        const n = parseInt(raw, 10)
        if (!Number.isFinite(n)) return 1
        const max = Object.keys(levels).length
        if (n < 1 || n > max) return 1
        return n
    } catch (_) {
        return 1
    }
}

let gameState = 'menu' // 'menu' | 'loading' | 'playing'
let selectedLevel = readStoredSelectedLevel()

const MENU = {
    preview: { x: 207, y: 88, w: 610, h: 220 },
    startBtn: { x: 287, y: 330, w: 450, h: 52 },
    levelBtn: { x: 287, y: 392, w: 450, h: 52 },
}

let collisionBlocks = []
let background = null
let boxes = []
let platforms = []
let doors = []
let enemies = []
let enemyKing = []
let enemyMatch = []
let cannon = []
let diamonds = []
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
                        if (level === Object.keys(levels).length + 1) {
                            level = 1
                            LevelProgressKeys.clearAll()
                        }
                        await initLevel(level)
                        const dir = levels[level].lastDirection
                        if (dir === 'left') player.switchSprite('idleLeft')
                        else player.switchSprite('idleRight')
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

player.preventInput = true

let level = 1

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

const menuTitleSprite = new Sprite({
    position: { x: 378, y: 28 },
    imageSrc: './Sprites/Kings and Pigs.png',
    frameRate: 1,
    loop: true,
    autoplay: false,
})

const menuButtonSprite = new Sprite({
    position: { x: 0, y: 0 },
    imageSrc: './Sprites/14-TileSets/platform.png',
    frameRate: 1,
    loop: true,
    autoplay: false,
})

let menuPreviewSprite = null
let menuStartDigitSprites = []
let menuLevelSelectDigitSprites = []

function drawMenuButtonBackground(rect) {
    if (!menuButtonSprite.loaded) return
    const img = menuButtonSprite.image
    if (!img.complete || img.naturalWidth === 0) return
    const tw = img.naturalWidth / menuButtonSprite.frameRate
    const th = img.naturalHeight
    c.imageSmoothingEnabled = false
    c.drawImage(img, 0, 0, tw, th, rect.x, rect.y, rect.w, rect.h)
}

function drawMenuPreviewCover() {
    const sp = menuPreviewSprite
    if (!sp || !sp.loaded || !sp.image.complete || sp.image.naturalWidth === 0) {
        c.fillStyle = '#1a1a2e'
        c.fillRect(MENU.preview.x, MENU.preview.y, MENU.preview.w, MENU.preview.h)
        return
    }
    const img = sp.image
    const sw = img.naturalWidth
    const sh = img.naturalHeight
    const { x: dx, y: dy, w: dw, h: dh } = MENU.preview
    const scale = Math.max(dw / sw, dh / sh)
    const rw = sw * scale
    const rh = sh * scale
    const ox = dx + (dw - rw) / 2
    const oy = dy + (dh - rh) / 2
    c.imageSmoothingEnabled = false
    c.drawImage(img, 0, 0, sw, sh, ox, oy, rw, rh)
}

function refreshMenuDigits() {
    c.save()
    c.font = 'bold 22px sans-serif'
    const startLabel = 'Start Game – Level '
    const startLabelW = c.measureText(startLabel).width
    const levelLabel = 'Level: '
    const levelLabelW = c.measureText(levelLabel).width
    c.restore()
    menuStartDigitSprites = createNumberSprites(selectedLevel, {
        x: MENU.startBtn.x + 24 + startLabelW,
        y: MENU.startBtn.y + 16,
    }, 10, './Sprites/12-Live and Coins/Numbers (6x8).png', 10)
    menuLevelSelectDigitSprites = createNumberSprites(selectedLevel, {
        x: MENU.levelBtn.x + 24 + levelLabelW,
        y: MENU.levelBtn.y + 16,
    }, 10, './Sprites/12-Live and Coins/Numbers (6x8).png', 10)
}

function refreshMenuPreview() {
    menuPreviewSprite = new Sprite({
        position: { x: MENU.preview.x, y: MENU.preview.y },
        imageSrc: `./img/Level ${selectedLevel}.png`,
        frameRate: 1,
        loop: true,
        autoplay: false,
    })
    refreshMenuDigits()
}

function syncMenuSelectionUI() {
    refreshMenuPreview()
    try {
        localStorage.setItem(SELECTED_LEVEL_STORAGE_KEY, String(selectedLevel))
    } catch (_) { /* ignore quota / private mode */ }
}

function drawMenu() {
    c.save()
    c.imageSmoothingEnabled = false
    c.clearRect(0, 0, canvas.width, canvas.height)
    c.fillStyle = '#0d0d12'
    c.fillRect(0, 0, canvas.width, canvas.height)

    drawMenuPreviewCover()

    menuTitleSprite.draw(2)

    drawMenuButtonBackground(MENU.startBtn)
    drawMenuButtonBackground(MENU.levelBtn)

    c.fillStyle = '#f5f0e6'
    c.font = 'bold 22px sans-serif'
    c.textAlign = 'left'
    c.textBaseline = 'middle'
    const startCy = MENU.startBtn.y + MENU.startBtn.h / 2
    const levelCy = MENU.levelBtn.y + MENU.levelBtn.h / 2
    c.fillText('Start Game – Level ', MENU.startBtn.x + 24, startCy)
    c.fillText('Level: ', MENU.levelBtn.x + 24, levelCy)

    menuStartDigitSprites.forEach(s => s.draw(2))
    menuLevelSelectDigitSprites.forEach(s => s.draw(2))
    c.restore()
}

function pointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h
}

function canvasClickCoords(e) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
    }
}

async function startGame(levelToStart) {
    gameState = 'loading'
    player.preventInput = true
    overlay.opacity = 1
    diamondCount = 0
    numberSprites = createNumberSprites(0)
    resetHearts()
    EnemyTracker.resetSession()
    enemyNumberSprite = createNumberSprites(EnemyTracker.getEnemyCount(), { x: 50, y: 80 })
    LevelProgressKeys.clearAll()
    level = levelToStart
    await initLevel(level)
    const ld = levels[level].lastDirection
    if (ld === 'left') player.switchSprite('idleLeft')
    else player.switchSprite('idleRight')
    gameState = 'playing'
    gsap.to(overlay, {
        opacity: 0,
        onComplete: () => {
            player.preventInput = false
        },
    })
}

canvas.addEventListener('click', (e) => {
    if (gameState !== 'menu') return
    const { x, y } = canvasClickCoords(e)
    if (pointInRect(x, y, MENU.startBtn)) {
        startGame(selectedLevel)
        return
    }
    if (pointInRect(x, y, MENU.levelBtn)) {
        const n = Object.keys(levels).length
        selectedLevel = selectedLevel >= n ? 1 : selectedLevel + 1
        syncMenuSelectionUI()
    }
})

function animate() {

    if (gameState === 'playing' && enemies.length) {
        enemies = enemies.filter(enemy => enemy.opacity)
    }
    c.imageSmoothingEnabled = false;
    window.requestAnimationFrame(animate)

    if (gameState === 'menu') {
        drawMenu()
        return
    }

    if (gameState === 'loading') {
        c.clearRect(0, 0, canvas.width, canvas.height)
        c.fillStyle = '#000000'
        c.fillRect(0, 0, canvas.width, canvas.height)
        return
    }

    if (doorClosed && doors.length && EnemyTracker.isLevelHalfCleared()) {
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
        enemyMatch.forEach(x => {
            x.draw(2)
            x.update()
        })
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

    if (player.gameOver) {
        c.save()
        c.fillStyle = 'rgba(0, 0, 0, 0.45)'
        c.fillRect(0, 0, canvas.width, canvas.height)
        c.fillStyle = '#f5f0e6'
        c.font = 'bold 28px sans-serif'
        c.textAlign = 'center'
        c.textBaseline = 'middle'
        c.fillText('Press R to restart', canvas.width / 2, canvas.height / 2)
        c.restore()
    }
}

window.restartFromGameOver = async () => {
    if (!player.gameOver || player._restarting) return
    player._restarting = true
    try {
        keys.w.pressed = false
        keys.a.pressed = false
        keys.d.pressed = false
        keys.space.pressed = false
        player.gameOver = false
        player.dead = false
        player.hitpoints = 3
        player.preventInput = false
        player.hitCooldown = false
        player.isShowingHello = false
        if (player.contactDamageTimeoutId) {
            clearTimeout(player.contactDamageTimeoutId)
            player.contactDamageTimeoutId = null
        }
        resetHearts()
        player.velocity.x = 0
        player.velocity.y = 0
        numberSprites = createNumberSprites(diamondCount)
        enemyNumberSprite = createNumberSprites(EnemyTracker.getEnemyCount(), { x: 50, y: 80 })
        await initLevel(level, { preserveCollectedProgress: true, skipLevelIntro: true })
        if (player.lastDirection === 'left') player.switchSprite('idleLeft')
        else player.switchSprite('idleRight')
    } finally {
        player._restarting = false
    }
}

queueMicrotask(() => {
    syncMenuSelectionUI()
    animate()
})


