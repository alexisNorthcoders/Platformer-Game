const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

canvas.width = 1024 // 64 * 16
canvas.height = 576 // 64 * 9

const SELECTED_LEVEL_STORAGE_KEY = 'platformerSelectedLevel'

function levelsKeyCount() {
    if (typeof levels === 'undefined' || levels == null) return 0
    return Object.keys(levels).length
}

function readStoredSelectedLevel() {
    try {
        const max = levelsKeyCount()
        if (max < 1) return 1
        const raw = localStorage.getItem(SELECTED_LEVEL_STORAGE_KEY)
        if (raw == null) return 1
        const n = parseInt(raw, 10)
        if (!Number.isFinite(n) || n < 1 || n > max) return 1
        return n
    } catch (_) {
        return 1
    }
}

/** High-level flow. Death uses `player.gameOver` while this stays `'playing'`. */
let gameState = 'menu' // 'menu' | 'loading' | 'playing'
let selectedLevel = 1
/** True while the Pause Menu is open (opened with Escape or the pause button during play). */
let pauseMenuFromPlaying = false
/** True from entering the door until the next level's fade-in completes. */
let levelTransitioning = false
/** Diamond and Pig counts on entering the current level, for Restart Level. */
let levelEntryCounts = { diamonds: 0, pigs: 0 }

function recordLevelEntry() {
    levelEntryCounts = { diamonds: diamondCount, pigs: EnemyTracker.getEnemyCount() }
}

// Layouts live in menuLayout.mjs (menuGeometry-bootstrap.mjs, loaded before
// this script).
const { TITLE_SCREEN, PAUSE_MENU } = globalThis.__menuLayout
const menuArt = globalThis.__menuArt

let collisionBlocks = []
let background = null
let boxes = []
let platforms = []
let movingPlatforms = []
/** Where the King comes back after falling into the water: the level start or the furthest Checkpoint reached. */
let respawnPoint = null
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
            flip: true,
            flipOffsetX: -15, // match the 15px shift baked into IdleLeft/RunLeft
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
            flip: true,
            flipOffsetX: -15, // match the 15px shift baked into IdleLeft/RunLeft
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
                        levelTimer.reset()
                        bombLib.clearBombs(bombs)
                        await initLevel(level)
                        recordLevelEntry()
                        const dir = levels[level].lastDirection
                        if (dir === 'left') player.switchSprite('idleLeft')
                        else player.switchSprite('idleRight')
                        gsap.to(overlay, {
                            opacity: 0,
                            onComplete: () => {
                                player.hello()
                                player.preventInput = false
                                levelTransitioning = false
                                startLevelTimer()
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
    },
    s: {
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

// Menu art (#63): plank buttons and brick frames 9-sliced from the tileset at
// the game's 2× pixel scale, and menu text in the pixel font.
const MENU_SCALE = menuArt.MENU_ART_SCALE
const MENU_TEXT = '#f5f0e6'
const PLANK_TEXT = menuArt.PANEL_FILL

function loadMenuImage(src) {
    const img = new Image()
    img.src = src
    return img
}

function menuImageReady(img) {
    return Boolean(img && img.complete && img.naturalWidth > 0)
}

const plankSheet = loadMenuImage('./Sprites/14-TileSets/platform.png')
const terrainSheet = loadMenuImage('./Sprites/14-TileSets/Terrain (32x32).png')

/** The plank button (menuArt.PLANK_SOURCE) as { idle, lit } canvases, once platform.png loads. */
let plankImages = null
plankSheet.addEventListener('load', () => {
    plankImages = { idle: buildPlankImage(false), lit: buildPlankImage(true) }
})

function buildPlankImage(lit) {
    const { y, h, columns } = menuArt.PLANK_SOURCE
    const out = document.createElement('canvas')
    out.width = menuArt.PLANK_FRAME.w
    out.height = h
    const g = out.getContext('2d')
    let dx = 0
    for (const col of columns) {
        g.drawImage(plankSheet, col.x, y, col.w, h, dx, 0, col.w, h)
        dx += col.w
    }
    if (lit) {
        // Lighten only the plank's own pixels (hover / pressed highlight).
        g.globalCompositeOperation = 'source-atop'
        g.fillStyle = 'rgba(255, 244, 214, 0.4)'
        g.fillRect(0, 0, out.width, out.height)
    }
    return out
}

function drawNineSlice(image, frame, rect, options) {
    c.imageSmoothingEnabled = false
    for (const p of menuArt.nineSlice(frame, rect, MENU_SCALE, options)) {
        c.drawImage(image, p.sx, p.sy, p.sw, p.sh, p.dx, p.dy, p.dw, p.dh)
    }
}

/** The brick-framed panel from the Terrain tiles, filling `rect`. */
function drawBrickPanel(rect) {
    if (menuImageReady(terrainSheet)) {
        drawNineSlice(terrainSheet, menuArt.BRICK_FRAME, rect, { tileEdges: true })
        return
    }
    c.fillStyle = menuArt.PANEL_FILL
    c.fillRect(rect.x, rect.y, rect.w, rect.h)
}

/** Menu button under the mouse, and the one held down by a pointer or key. */
let menuHover = null
let menuPressed = null
/**
 * True after menu keys, until the mouse moves: the button Enter would choose
 * shows as selected (PLAY on the Title Screen, pauseMenuFocus on the Pause Menu).
 */
let menuKeyboardFocus = false
/** The Pause Menu button ↑/↓ have moved to; Resume each time it opens. */
let pauseMenuFocus = 'resume'

function menuButtonState(target) {
    if (menuPressed === target) return 'pressed'
    if (menuHover === target) return 'hover'
    const focused = pauseMenuFromPlaying ? pauseMenuFocus : 'play'
    if (menuKeyboardFocus && target === focused) return 'hover'
    return 'idle'
}

/** Leaving a menu: no highlight is left behind for the next time one opens. */
function clearMenuHighlights() {
    menuHover = null
    menuPressed = null
    menuKeyboardFocus = false
}

/**
 * A plank button filling `rect`: lit on hover, lit and pushed down one art
 * pixel while pressed. Returns the rect it was drawn in, for its label.
 */
function drawPlankButton(rect, state = 'idle') {
    const r = state === 'pressed' ? { ...rect, y: rect.y + MENU_SCALE } : rect
    if (plankImages) {
        drawNineSlice(state === 'idle' ? plankImages.idle : plankImages.lit, menuArt.PLANK_FRAME, r)
    } else {
        c.fillStyle = menuArt.PLANK_FILL
        c.fillRect(r.x, r.y, r.w, r.h - menuArt.PLANK_FOOT_ROWS * MENU_SCALE)
    }
    return r
}

/** Pixel-font text centred on (x, y), snapped to whole pixels. */
function drawMenuText(text, x, y, size, color = MENU_TEXT) {
    c.font = menuArt.pixelFont(size)
    c.fillStyle = color
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(text, Math.round(x), Math.round(y))
}

function drawPlankButtonWithLabel(rect, target, label, size = 16) {
    const face = menuArt.plankFaceCentre(drawPlankButton(rect, menuButtonState(target)))
    drawMenuText(label, face.x, face.y, size, PLANK_TEXT)
}

/** A pixel ◀ (dir -1) or ▶ (dir 1) on the face of the plank button `target`. */
function drawPlankArrowButton(rect, target, dir) {
    const face = menuArt.plankFaceCentre(drawPlankButton(rect, menuButtonState(target)))
    const s = MENU_SCALE
    const steps = 6
    const left = Math.round(face.x - (steps * s) / 2)
    c.fillStyle = PLANK_TEXT
    for (let i = 0; i < steps; i++) {
        // Columns grow towards the arrow's back, one art pixel per step.
        const h = (2 * (dir < 0 ? i : steps - 1 - i) + 1) * s
        c.fillRect(left + i * s, Math.round(face.y - h / 2), s, h)
    }
}

let menuPreviewSprite = null

function levelPreviewImage() {
    const sp = menuPreviewSprite
    const img = sp?.image
    const imageReady = Boolean(
        sp && img && img.complete && img.naturalWidth > 0
        && (sp.loaded || img.naturalHeight > 0)
    )
    return imageReady ? img : null
}

/**
 * Level Preview: a centred crop of the level image drawn exactly into `rect`,
 * inside the stone border of the brick frame.
 */
function drawFramedLevelPreview(rect) {
    drawBrickPanel(menuArt.frameAround(rect, MENU_SCALE))
    c.fillStyle = menuArt.PANEL_FILL
    c.fillRect(rect.x, rect.y, rect.w, rect.h)
    const img = levelPreviewImage()
    if (!img) return
    const crop = globalThis.__menuGeom.coverSourceRect(img.naturalWidth, img.naturalHeight, rect.w, rect.h)
    c.imageSmoothingEnabled = false
    c.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, rect.x, rect.y, rect.w, rect.h)
}

function refreshMenuPreview() {
    menuPreviewSprite = new Sprite({
        position: { x: 0, y: 0 },
        imageSrc: `./img/Level ${selectedLevel}.png`,
        frameRate: 1,
        loop: true,
        autoplay: false,
    })
}

function syncMenuSelectionUI() {
    if (levelsKeyCount() < 1) return
    refreshMenuPreview()
    try {
        localStorage.setItem(SELECTED_LEVEL_STORAGE_KEY, String(selectedLevel))
    } catch (_) { /* ignore quota / private mode */ }
}

function drawMenuBackdrop() {
    c.imageSmoothingEnabled = false
    c.clearRect(0, 0, canvas.width, canvas.height)
    c.fillStyle = '#0d0d12'
    c.fillRect(0, 0, canvas.width, canvas.height)
}

// Title Scene (#64): Pigs on a strip of castle floor below the Title Screen's
// Level Preview and panel. Only stepped and drawn here, so it stops once play starts and isn't
// behind the Pause Menu. Silent, and it takes no input.
const titleSceneLib = globalThis.__titleScene
const titleScene = titleSceneLib.createTitleScene()
const titleSceneImages = new Map(
    Object.values(titleSceneLib.SHEETS).map(sheet => [sheet.src, loadMenuImage(`./${sheet.src}`)])
)

/** The floor strip, built once from the Terrain tiles. */
let titleSceneFloor = null
function titleSceneFloorImage() {
    if (titleSceneFloor || !menuImageReady(terrainSheet)) return titleSceneFloor
    const tiles = titleSceneLib.titleSceneFloorTiles()
    titleSceneFloor = document.createElement('canvas')
    titleSceneFloor.width = canvas.width
    titleSceneFloor.height = tiles[0].dh
    const g = titleSceneFloor.getContext('2d')
    g.imageSmoothingEnabled = false
    for (const p of tiles) g.drawImage(terrainSheet, p.sx, p.sy, p.sw, p.sh, p.dx, p.dy, p.dw, p.dh)
    return titleSceneFloor
}

/**
 * Draws a draw list (the Title Scene's, the Bombs') whose images are in
 * `images` by src, skipping any not loaded yet. Flipped entries are mirrored.
 */
function drawSpriteList(list, images) {
    for (const d of list) {
        const img = images.get(d.src)
        if (!menuImageReady(img)) continue
        if (!d.flip) {
            c.drawImage(img, d.sx, d.sy, d.sw, d.sh, d.dx, d.dy, d.dw, d.dh)
            continue
        }
        c.save()
        c.scale(-1, 1)
        c.drawImage(img, d.sx, d.sy, d.sw, d.sh, -d.dx - d.dw, d.dy, d.dw, d.dh)
        c.restore()
    }
}

function drawTitleScene() {
    titleSceneLib.advanceTitleScene(titleScene, performance.now())
    c.imageSmoothingEnabled = false
    const floor = titleSceneFloorImage()
    if (floor) c.drawImage(floor, 0, titleSceneLib.TITLE_SCENE.floorY)
    drawSpriteList(titleSceneLib.titleSceneDrawList(titleScene), titleSceneImages)
}

// Bombs (#73): the King drops one with S (Player.handleInput → dropBomb).
// Stepped only while playing, so a live Bomb freezes behind the Pause Menu.
const bombLib = globalThis.__bomb
const bombs = bombLib.createBombState()
const bombImages = new Map(
    Object.values(bombLib.BOMB_SHEETS).map(sheet => [sheet.src, loadMenuImage(`./${sheet.src}`)])
)

/** Where a falling Bomb lands (#75): on the level's collision blocks. */
function bombLandsAt(x, fromY, toY) {
    return bombLib.landsAtBlocks(player.collisionBlocks)(x, fromY, toY)
}

/**
 * Drops a Bomb with its base on `feet` (world px; halfWidth: the King's feet
 * span), unless one is already live. In mid-air it falls onto the collision
 * blocks below before its fuse starts.
 */
function dropBomb(feet) {
    // The game-over retry gives input back before the level reloads: no Bomb until it has.
    if (player._restarting) return
    bombLib.tryDropBomb(bombs, feet, bombLandsAt)
}

/**
 * A blast (#74) hits everyone caught in it once, through the hammer's hit
 * paths (Pigs die and Boxes break as from the hammer), with no knockback.
 */
function hitBlastVictims(rect) {
    player.updateHitbox()
    const victims = bombLib.findBlastVictims(rect, {
        king: player,
        pigs: ContactDamageHelpers.collectAttackableEnemiesForPlayerAttack(enemies, enemyKing),
        boxes,
    })
    if (victims.king) victims.king.takeBlastHit()
    victims.pigs.forEach(pig => pig.hit())
    victims.boxes.forEach(box => box.hit())
}

/** Steps and draws the Bombs; call inside the camera transform. */
function updateAndDrawBombs() {
    // A dead King's Bomb never goes off: Pigs it would beat stay beaten after the retry.
    if (player.gameOver) bombLib.defuseBombs(bombs)
    for (const event of bombLib.advanceBombs(bombs, performance.now(), bombLandsAt)) {
        if (event.type === 'explosion') hitBlastVictims(event.rect)
    }
    drawSpriteList(bombLib.bombDrawList(bombs), bombImages)
}

/**
 * Moves each Moving Platform one frame, carrying the King and a lit Bomb that
 * stand on it. Runs after the King's input and before he moves.
 */
function stepMovingPlatforms() {
    if (!movingPlatforms.length) return
    const lib = globalThis.__movingPlatform
    player.updateHitbox()
    for (const platform of movingPlatforms) {
        const surface = platform.surface()
        const { dx, dy } = platform.step()
        if (!player.gameOver && lib.isRiding(player.hitbox, player.velocity.y, surface)) {
            player.position.x += dx
            player.position.y += dy
            player.updateHitbox()
        }
        const bomb = bombs.bomb
        if (bomb && bomb.phase !== 'fall' && lib.isResting(bomb.x, bomb.y, surface)) {
            bomb.x += dx
            bomb.y += dy
        }
    }
}

function currentCheckpoints() {
    return levels[level]?.checkpoints ?? []
}

/** Moves the respawn point on as the King passes the level's Checkpoints. */
function reachCheckpoints() {
    if (!respawnPoint || player.gameOver) return
    respawnPoint = globalThis.__checkpoint.respawnPointAfter(currentCheckpoints(), respawnPoint, player.position.x)
}

/** The King falls into the water: back to the respawn point, standing still. */
function respawnKing() {
    player.setPosition(respawnPoint ?? levels[level].playerPosition)
    player.velocity.x = 0
    player.velocity.y = 0
}

// Checkpoint flag, in 2× pixel-art px: a pole with a pennant, grey until reached.
const CHECKPOINT_FLAG = { poleHeight: 76, poleWidth: 4, clothWidth: 28, clothHeight: 20 }

function drawCheckpoints() {
    const checkpoints = currentCheckpoints()
    if (!checkpoints.length || !respawnPoint) return
    const now = performance.now()
    const { poleHeight, poleWidth, clothWidth, clothHeight } = CHECKPOINT_FLAG
    c.save()
    for (const checkpoint of checkpoints) {
        // The King's feet are 88px below his position; the pole stands beside them.
        const baseX = Math.round(checkpoint.x + 30)
        const baseY = Math.round(checkpoint.y + 88)
        const reached = globalThis.__checkpoint.isReached(checkpoint, respawnPoint)
        c.fillStyle = '#3f3851'
        c.fillRect(baseX - 2, baseY - poleHeight - 2, poleWidth + 4, poleHeight + 2)
        c.fillStyle = '#a1acad'
        c.fillRect(baseX, baseY - poleHeight, poleWidth, poleHeight)
        c.fillStyle = '#fbcaae'
        c.fillRect(baseX - 2, baseY - poleHeight - 6, poleWidth + 4, 6)
        // Pennant: rows narrowing to a point, flapping by a pixel or two.
        const top = baseY - poleHeight + 4
        c.fillStyle = reached ? '#d25654' : '#6e5967'
        for (let row = 0; row < clothHeight; row += 2) {
            const taper = 1 - Math.abs(row - clothHeight / 2) / (clothHeight / 2)
            const wave = reached ? Math.round(Math.sin(now / 150 + row / 4) * 1.5) * 2 : 0
            c.fillRect(baseX + poleWidth, top + row, Math.max(2, Math.round((clothWidth * taper) / 2) * 2) + wave, 2)
        }
    }
    c.restore()
}

// Water along the bottom of levels with `water` in levels.js: painted on the
// level image too (for the Level Preview); drawn again over the King here so
// he sinks into it, with the waves moving.
const WATER = { deep: 'rgba(52, 78, 116, 0.82)', crest: '#98cbd8', foam: '#dcf2ed', pixel: 4 }

function drawWater() {
    const water = levels[level]?.water
    if (!water) return
    const { pixel } = WATER
    const now = performance.now()
    const left = Math.floor(camera.x / pixel) * pixel
    const right = camera.x + canvas.width
    c.save()
    c.fillStyle = WATER.deep
    c.fillRect(left, water.top + pixel, right - left, canvas.height - water.top)
    for (let x = left; x < right; x += pixel) {
        const wave = Math.sin(x / 38 + now / 420) + Math.sin(x / 17 - now / 610) * 0.5
        const lift = Math.round(wave * 1.5) * pixel
        c.fillStyle = WATER.crest
        c.fillRect(x, water.top - lift, pixel, pixel * 2 + lift)
        if (wave > 1.1) {
            c.fillStyle = WATER.foam
            c.fillRect(x, water.top - lift - pixel, pixel, pixel)
        }
    }
    // Glints drifting on the surface.
    c.fillStyle = WATER.foam
    for (let i = 0; i < 12; i++) {
        const gx = left + ((i * 331 + now / 30) % (right - left))
        const gy = water.top + pixel * (3 + (i * 7) % 12)
        c.fillRect(Math.round(gx / pixel) * pixel, gy, pixel * 3, pixel / 2)
    }
    c.restore()
}

function drawTitleScreen() {
    const layout = TITLE_SCREEN
    c.save()
    drawMenuBackdrop()
    drawTitleScene()
    drawFramedLevelPreview(layout.preview)
    drawBrickPanel(layout.panel)
    menuTitleSprite.draw(2)

    drawMenuText('LEVEL', layout.levelCaption.x, layout.levelCaption.y, 16)
    drawPlankArrowButton(layout.prevBtn, 'prev', -1)
    drawPlankArrowButton(layout.nextBtn, 'next', 1)
    const selectorCx = (layout.prevBtn.x + layout.prevBtn.w + layout.nextBtn.x) / 2
    const selectorCy = menuArt.plankFaceCentre(layout.prevBtn).y
    drawMenuText(String(selectedLevel).padStart(2, '0'), selectorCx, selectorCy, 32)
    drawPlankButtonWithLabel(layout.playBtn, 'play', 'PLAY', 24)
    c.restore()
}

/**
 * The last level frame drawn before the Pause Menu opened. Nothing is stepped
 * while paused, so the Pause Menu draws this copy (dimmed) as the frozen level.
 */
const pauseSnapshot = document.createElement('canvas')
pauseSnapshot.width = canvas.width
pauseSnapshot.height = canvas.height

function capturePauseSnapshot() {
    const g = pauseSnapshot.getContext('2d')
    g.clearRect(0, 0, pauseSnapshot.width, pauseSnapshot.height)
    g.drawImage(canvas, 0, 0)
}

function drawPauseMenu() {
    const layout = PAUSE_MENU
    c.save()
    drawMenuBackdrop()
    c.drawImage(pauseSnapshot, 0, 0)
    c.fillStyle = 'rgba(0, 0, 0, 0.6)'
    c.fillRect(0, 0, canvas.width, canvas.height)
    drawBrickPanel(layout.panel)
    drawMenuText('PAUSED', layout.caption.x, layout.caption.y, 24)
    drawPlankButtonWithLabel(layout.resumeBtn, 'resume', 'RESUME')
    drawPlankButtonWithLabel(layout.restartBtn, 'restart', 'RESTART LEVEL')
    drawPlankButtonWithLabel(layout.quitBtn, 'quit', 'QUIT TO TITLE')
    if (fullscreenAvailable) {
        const label = globalThis.__fullscreen?.isFullscreen(document) ? 'EXIT FULLSCREEN' : 'FULLSCREEN'
        drawPlankButtonWithLabel(layout.fullscreenBtn, 'fullscreen', label)
    }
    c.restore()
}

// fullscreen-bootstrap.mjs and gameOverRestart-bootstrap.mjs load before this
// script in index.html.
const isTouch = gameOverRestart.isTouchDevice()
const fullscreenAvailable = Boolean(globalThis.__fullscreen?.isFullscreenAvailable(document, isTouch))

function titleScreenHitTarget(x, y) {
    return globalThis.__menuGeom.titleScreenHitTarget(x, y, TITLE_SCREEN)
}

/** 'prev' | 'next' step the selected level (wrapping); 'play' starts it. */
function handleTitleScreenTarget(target) {
    if (target === 'play') {
        void startGame(selectedLevel)
        return
    }
    if (target === 'prev' || target === 'next') {
        const n = levelsKeyCount()
        if (n < 1) return
        selectedLevel = globalThis.__menuGeom.stepLevel(selectedLevel, target === 'next' ? 1 : -1, n)
        syncMenuSelectionUI()
    }
}

function pauseMenuHitTarget(x, y) {
    return globalThis.__menuGeom.pauseMenuHitTarget(x, y, PAUSE_MENU, { showFullscreen: fullscreenAvailable })
}

/**
 * Act on a Pause Menu button: Resume, Restart Level and Quit to Title go
 * through reducePauseMenuChoice; Fullscreen changes no game state. Called from
 * a click or keydown, which count as the user activation requestFullscreen needs.
 */
function handlePauseMenuTarget(target) {
    if (target === 'fullscreen') {
        globalThis.__fullscreen?.toggleFullscreen(document)
        return
    }
    const flow = globalThis.__gameFlow
    applyGameFlowResult(flow.reducePauseMenuChoice({
        choice: target,
        gameState,
        pauseMenuFromPlaying,
        currentLevel: level,
    }))
}

function canvasClickCoords(e) {
    const rect = canvas.getBoundingClientRect()
    const g = globalThis.__menuGeom
    if (g?.canvasLogicalCoords) {
        return g.canvasLogicalCoords(e.clientX, e.clientY, rect, canvas.width, canvas.height)
    }
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
    }
}

async function startGame(levelToStart) {
    const flow = globalThis.__gameFlow
    if (!flow?.clearHeldInputKeys || !flow?.resetPlayerForNewLevelRun) {
        console.error('gameFlow-bootstrap.mjs must load before index.js')
        return
    }
    pauseMenuFromPlaying = false
    gameState = 'loading'
    clearMenuHighlights()
    resetSession()
    overlay.opacity = 1
    level = levelToStart
    const levelCfg = levels[level]
    if (!levelCfg) {
        console.error(`Level ${levelToStart} does not exist`)
        gameState = 'menu'
        overlay.opacity = 0
        player.preventInput = true
        syncMenuSelectionUI()
        return
    }
    try {
        await initLevel(level)
    } catch (err) {
        console.error('initLevel failed', err)
        gameState = 'menu'
        overlay.opacity = 0
        player.preventInput = true
        syncMenuSelectionUI()
        return
    }
    recordLevelEntry()
    const ld = levelCfg.lastDirection
    if (ld === 'left') player.switchSprite('idleLeft')
    else player.switchSprite('idleRight')
    gameState = 'playing'
    gsap.to(overlay, {
        opacity: 0,
        onComplete: () => {
            // Paused during the fade-in: input comes back on Resume instead.
            if (gameState === 'playing') player.preventInput = false
            startLevelTimer()
        },
    })
}

/**
 * Stop a fade still running from the last start: it would otherwise finish
 * later and hand input back to the player.
 */
function cancelOverlayFade() {
    gsap.killTweensOf(overlay)
    overlay.opacity = 0
}

/** The step sound loops until stopped; nothing stops it once play stops. */
function stopPlayerSounds() {
    if (typeof stopStepSound === 'function') stopStepSound()
}

/**
 * A clean session, as before the first level: hearts, diamonds, the Pig
 * count, the level timer and which diamonds / Pigs are gone. Used when a game
 * starts and on Quit to Title.
 */
function resetSession() {
    const flow = globalThis.__gameFlow
    cancelOverlayFade()
    stopPlayerSounds()
    player.preventInput = true
    diamondCount = 0
    numberSprites = createNumberSprites(0)
    flow.clearHeldInputKeys(keys)
    flow.resetPlayerForNewLevelRun(player)
    levelTimer.reset()
    resetHearts()
    EnemyTracker.resetSession()
    enemyNumberSprite = createNumberSprites(EnemyTracker.getEnemyCount(), { x: 50, y: 80 })
    LevelProgressKeys.clearAll()
    bombLib.clearBombs(bombs)
}

// The only input route for the menu buttons, on touch too: taps synthesise a
// click (mobile-bootstrap.mjs never cancels touchstart), and tap-to-restart
// below only acts on game over.
canvas.addEventListener('click', (e) => {
    if (gameState !== 'menu') return
    const { x, y } = canvasClickCoords(e)
    if (!pauseMenuFromPlaying) {
        handleTitleScreenTarget(titleScreenHitTarget(x, y))
        return
    }
    const target = pauseMenuHitTarget(x, y)
    if (target) handlePauseMenuTarget(target)
})

// Title Screen keyboard: ←/→ change the level, Enter/Space play. Player input
// is off (preventInput) while on the Title Screen, so eventListeners.js
// ignores these keys there.
window.addEventListener('keydown', (e) => {
    if (gameState !== 'menu') return
    if (pauseMenuFromPlaying) {
        handlePauseMenuKey(e)
        return
    }
    const target = globalThis.__menuGeom.titleScreenKeyTarget(e.key)
    if (!target) return
    e.preventDefault()
    menuPressed = target
    menuKeyboardFocus = true
    // Holding Enter/Space must not start the level twice; holding ←/→ scrolls.
    if (target === 'play' && e.repeat) return
    handleTitleScreenTarget(target)
})

// Pause Menu keyboard (#65): ↑/↓ move the focus, Enter/Space choose it.
// Escape still closes it (eventListeners.js → handleEscapeMenu).
function handlePauseMenuKey(e) {
    const g = globalThis.__menuGeom
    const action = g.pauseMenuKeyAction(e.key)
    if (!action) return
    e.preventDefault()
    menuKeyboardFocus = true
    if (action === 'choose') {
        // Holding Enter/Space must not choose twice (e.g. Restart Level, then
        // again once the level is back and paused).
        if (e.repeat) return
        menuPressed = pauseMenuFocus
        handlePauseMenuTarget(pauseMenuFocus)
        return
    }
    const items = g.pauseMenuItems({ showFullscreen: fullscreenAvailable })
    pauseMenuFocus = g.stepMenuFocus(items, pauseMenuFocus, action === 'down' ? 1 : -1)
}

// Button highlights (#63): lit under the mouse, pressed while a pointer or
// key holds it. Purely visual; the click and keydown handlers above act.
function menuHitTarget(e) {
    if (gameState !== 'menu') return null
    const { x, y } = canvasClickCoords(e)
    return pauseMenuFromPlaying ? pauseMenuHitTarget(x, y) : titleScreenHitTarget(x, y)
}

canvas.addEventListener('pointermove', (e) => {
    menuHover = e.pointerType === 'mouse' ? menuHitTarget(e) : null
    menuKeyboardFocus = false
})
canvas.addEventListener('pointerleave', () => { menuHover = null })
canvas.addEventListener('pointerdown', (e) => { menuPressed = menuHitTarget(e) })
window.addEventListener('pointerup', () => { menuPressed = null })
window.addEventListener('pointercancel', () => { menuPressed = null })
window.addEventListener('keyup', (e) => {
    const g = globalThis.__menuGeom
    if (g.titleScreenKeyTarget(e.key) === menuPressed || g.pauseMenuKeyAction(e.key) === 'choose') menuPressed = null
})

if (isTouch) {
    gameOverRestart.bindTapToRestart(canvas, {
        isGameOver: () => player.gameOver,
        // Late-bound: restartFromGameOver is assigned further down this file.
        restart: () => window.restartFromGameOver(),
    })
}

function animate() {

    if (gameState === 'playing' && enemies.length) {
        enemies = enemies.filter(enemy => enemy.opacity)
    }
    c.imageSmoothingEnabled = false;
    window.requestAnimationFrame(animate)

    if (gameState === 'menu') {
        // Bombs freeze behind the Pause Menu and carry on after Resume.
        bombLib.pauseBombs(bombs)
        if (pauseMenuFromPlaying) {
            titleSceneLib.pauseTitleScene(titleScene)
            drawPauseMenu()
        } else drawTitleScreen()
        return
    }
    // Off the Title Screen: the Title Scene resumes where it was, not jumps ahead.
    titleSceneLib.pauseTitleScene(titleScene)

    if (gameState === 'loading') {
        bombLib.pauseBombs(bombs)
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
    stepMovingPlatforms()
    movingPlatforms.forEach(platform => platform.draw(2))
    drawCheckpoints()
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
    updateAndDrawBombs()
    if (diamonds) {
        diamonds.forEach(diamond => {
            if (diamond.loaded) {
                diamond.draw(2);
                diamond.update();
            }
        });
    }
    player.update();
    reachCheckpoints()
    drawWater()

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
    drawLevelTimer()


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
        c.fillText(gameOverRestart.gameOverPrompt(isTouch), canvas.width / 2, canvas.height / 2)
        c.restore()
    }
}

// Starts from 0; if Escape opened the menu mid-transition, start paused.
function startLevelTimer() {
    const now = performance.now()
    levelTimer.start(now)
    if (gameState !== 'playing') levelTimer.pause(now)
}

function drawLevelTimer() {
    c.save()
    c.font = 'bold 26px monospace'
    c.textAlign = 'center'
    c.textBaseline = 'top'
    c.lineWidth = 4
    c.strokeStyle = '#000000'
    c.fillStyle = '#f5f0e6'
    const text = formatLevelTime(levelTimer.elapsed(performance.now()))
    c.strokeText(text, canvas.width / 2, 16)
    c.fillText(text, canvas.width / 2, 16)
    c.restore()
}

/**
 * Rebuild the current level with the King back at its start and full hearts
 * (game over restart, and Restart Level on the Pause Menu). Diamonds taken and
 * Pigs beaten stay gone unless `beforeLoad` forgets them. `beforeLoad` runs
 * first, before the HUD counts are redrawn and the level loads.
 */
async function restartCurrentLevel(beforeLoad) {
    player._restarting = true
    try {
        beforeLoad?.()
        bombLib.clearBombs(bombs)
        globalThis.__gameFlow.clearHeldInputKeys(keys)
        player.gameOver = false
        player.dead = false
        player.hitpoints = 3
        // Old level is still active until createAssets() resolves; stay invulnerable.
        player.hitCooldown = true
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

window.restartFromGameOver = async () => {
    if (!player.gameOver || player._restarting) return
    await restartCurrentLevel(() => { player.preventInput = false })
    startLevelTimer()
}

/**
 * Restart Level (#65): the level as it was on entering it, with its diamonds
 * and Pigs back and the counts rolled back. The black loading screen shows
 * until it is rebuilt; if that fails, back to the Title Screen.
 */
async function restartLevelFromPauseMenu() {
    cancelOverlayFade()
    levelTimer.reset()
    try {
        await restartCurrentLevel(() => {
            LevelProgressKeys.clearLevel(level)
            diamondCount = levelEntryCounts.diamonds
            EnemyTracker.setEnemyCount(levelEntryCounts.pigs)
        })
    } catch (err) {
        console.error('initLevel failed', err)
        gameState = 'menu'
        resetSession()
        return
    }
    // Quit to Title can't happen while loading, so the run is still ours.
    gameState = 'playing'
    player.preventInput = false
    startLevelTimer()
}

// Escape (and the touch pause button, #45) opens/closes the Pause Menu
// (returns true if handled).
function handleEscapeMenu() {
    const flow = globalThis.__gameFlow
    if (!flow?.reduceEscapeKey) return false
    return applyGameFlowResult(flow.reduceEscapeKey({
        gameState,
        pauseMenuFromPlaying,
        playerGameOver: player.gameOver,
        levelTransitioning,
        restarting: Boolean(player._restarting),
    }))
}

/**
 * Apply a reduceEscapeKey / reducePauseMenuChoice result to the game. Returns
 * whether it changed anything.
 */
function applyGameFlowResult(result) {
    if (!result.handled) return false
    const flow = globalThis.__gameFlow
    const wasPaused = pauseMenuFromPlaying
    if (result.clearKeys) flow.clearHeldInputKeys(keys)
    if (result.pauseMenuFromPlaying && !wasPaused) {
        // The canvas still holds the last level frame: keep it as the frozen level.
        capturePauseSnapshot()
        levelTimer.pause(performance.now())
        // Freeze a live Bomb now, not on the next menu frame.
        bombLib.pauseBombs(bombs)
        stopPlayerSounds()
        pauseMenuFocus = 'resume'
    }
    if (wasPaused && !result.pauseMenuFromPlaying) clearMenuHighlights()
    if (result.gameState === 'playing') levelTimer.resume(performance.now())
    gameState = result.gameState
    pauseMenuFromPlaying = result.pauseMenuFromPlaying
    player.preventInput = result.playerPreventInput
    if (result.resetSession) resetSession()
    if (result.selectedLevel !== undefined) {
        selectedLevel = result.selectedLevel
        syncMenuSelectionUI()
    }
    if (result.restartLevel) void restartLevelFromPauseMenu()
    return true
}

queueMicrotask(async () => {
    selectedLevel = readStoredSelectedLevel()
    syncMenuSelectionUI()
    // Menu text is drawn in the pixel font, so wait for it rather than show
    // the fallback font on the first frames (#63).
    await menuArt.waitForPixelFont(document.fonts)
    animate()
})


