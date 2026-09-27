/**
 * Title Scene (#64): the ambient Pig animation behind the Title Screen, on a
 * strip of castle floor below the menu. Bomb Pigs patrol and throw bombs, the
 * King Pig struts or idles, and a Pig with a Match now and then lights a
 * cannon.
 *
 * Scripted and purely decorative: it keeps its own state, never touches game
 * state or the gameplay enemy classes, and plays no sound. index.js steps it
 * with advanceTitleScene() and draws titleSceneDrawList() while the Title
 * Screen shows (through globalThis.__titleScene, menuGeometry-bootstrap.mjs).
 *
 * Positions are logical canvas px (1024×576); a pig's (x, y) is the middle of
 * its feet. Sprites draw at the game's 2× pixel scale.
 */

export const SCENE_SCALE = 2

export const TITLE_SCENE = {
    width: 1024,
    /** Top of the floor strip, where the pigs stand. The menu ends at y 388. */
    floorY: 512,
    /** The Terrain tile repeated along the floor: the plain middle of the one-tile brick bar. */
    floorTile: { x: 64, y: 160, w: 32, h: 32 },
    /** Keeps the whole Bomb Pig on screen and clear of the cannon on the right. */
    bombPigPatrol: { minX: 60, maxX: 780 },
    kingPatrol: { minX: 120, maxX: 720 },
    /** Where thrown bombs may land. */
    throwBounds: { minX: 40, maxX: 800 },
    /** A new patrol target is at least this far away, so a pig always walks somewhere. */
    minPatrolStep: 80,
    throwDistance: { min: 110, max: 230 },
    throwPeak: 70,
    bombPigSpeed: 0.09, // px per ms
    kingSpeed: 0.05,
    /** Cannon (facing left) on the right, with the Match Pig behind it. */
    cannonX: 872,
    matchPigX: 938,
    /** Cannon balls land this far left of the muzzle. */
    shotDistance: { min: 260, max: 520 },
    shotPeak: 36,
    /** Longest step advanceTitleScene() takes, so a hidden tab doesn't jump. */
    maxStepMs: 100,
}

const S = 'Sprites/'

/** Sprite sheets: frame size and the anchor (source px) placed on an actor's (x, y). */
export const SHEETS = {
    bombPigIdle: { src: `${S}05-Pig Thowing a Bomb/Idle (26x26).png`, frames: 10, w: 26, h: 26, anchorX: 13, anchorY: 26 },
    bombPigRun: { src: `${S}05-Pig Thowing a Bomb/Run (26x26).png`, frames: 6, w: 26, h: 26, anchorX: 13, anchorY: 26 },
    bombPigPick: { src: `${S}05-Pig Thowing a Bomb/Picking Bomb (26x26).png`, frames: 4, w: 26, h: 26, anchorX: 13, anchorY: 26 },
    bombPigThrow: { src: `${S}05-Pig Thowing a Bomb/Throwing Boom (26x26).png`, frames: 5, w: 26, h: 26, anchorX: 13, anchorY: 26 },
    kingIdle: { src: `${S}02-King Pig/Idle (38x28).png`, frames: 12, w: 38, h: 28, anchorX: 19, anchorY: 28 },
    kingRun: { src: `${S}02-King Pig/Run (38x28).png`, frames: 6, w: 38, h: 28, anchorX: 19, anchorY: 28 },
    matchOn: { src: `${S}07-Pig With a Match/Match On (26x18).png`, frames: 3, w: 26, h: 18, anchorX: 13, anchorY: 18 },
    matchLight: { src: `${S}07-Pig With a Match/Lighting the Match (26x18).png`, frames: 3, w: 26, h: 18, anchorX: 13, anchorY: 18 },
    matchCannon: { src: `${S}07-Pig With a Match/Lighting the Cannon (26x18).png`, frames: 3, w: 26, h: 18, anchorX: 13, anchorY: 18 },
    // The cannon's wheels end 3px above its frame's bottom.
    cannonIdle: { src: `${S}10-Cannon/Idle.png`, frames: 1, w: 44, h: 28, anchorX: 29, anchorY: 25 },
    cannonShoot: { src: `${S}10-Cannon/Shoot (44x28).png`, frames: 4, w: 44, h: 28, anchorX: 29, anchorY: 25 },
    cannonBall: { src: `${S}10-Cannon/Cannon Ball.png`, frames: 1, w: 44, h: 28, anchorX: 29, anchorY: 25 },
    // Bomb frames: the bomb's base is at (26, 39); explosions centre on it.
    bombOff: { src: `${S}09-Bomb/Bomb Off.png`, frames: 1, w: 52, h: 56, anchorX: 26, anchorY: 39 },
    bombOn: { src: `${S}09-Bomb/Bomb On (52x56).png`, frames: 4, w: 52, h: 56, anchorX: 26, anchorY: 39 },
    boom: { src: `${S}09-Bomb/Boooooom (52x56).png`, frames: 6, w: 52, h: 56, anchorX: 26, anchorY: 39 },
}

const FRAME_MS = 100
/** Throwing Boom lets go of the bomb on this frame. */
const THROW_RELEASE_FRAME = 3
const FUSE_MS = 4 * FRAME_MS * 3
const LIGHT_CANNON_MS = 3 * FRAME_MS * 2

const bombPigTimes = {
    pick: SHEETS.bombPigPick.frames * FRAME_MS,
    throw: SHEETS.bombPigThrow.frames * FRAME_MS,
}

/** Frame index `ms` into a looping animation. */
export function loopFrame(ms, frames, frameMs = FRAME_MS) {
    return Math.floor(ms / frameMs) % frames
}

/** Frame index `ms` into a play-once animation (holds the last frame). */
export function onceFrame(ms, frames, frameMs = FRAME_MS) {
    return Math.min(frames - 1, Math.floor(ms / frameMs))
}

/** `x` moved towards `target` at `speed` px/ms for `dtMs`, stopping on it. */
export function stepToward(x, target, speed, dtMs) {
    const step = speed * dtMs
    if (Math.abs(target - x) <= step) return target
    return x + Math.sign(target - x) * step
}

function between(rng, min, max) {
    return min + rng() * (max - min)
}

/**
 * A patrol target inside `bounds`, at least minPatrolStep from `x` (on
 * whichever sides have room), so a pig never gets a target it is already on.
 */
export function pickPatrolTarget(rng, bounds, x) {
    const step = TITLE_SCENE.minPatrolStep
    const left = { min: bounds.minX, max: x - step }
    const right = { min: x + step, max: bounds.maxX }
    const sides = [left, right].filter(side => side.max >= side.min)
    if (!sides.length) return x - bounds.minX > bounds.maxX - x ? bounds.minX : bounds.maxX
    const room = sides.reduce((sum, side) => sum + side.max - side.min, 0)
    let r = rng() * room
    for (const side of sides) {
        const w = side.max - side.min
        if (r <= w) return side.min + r
        r -= w
    }
    return sides[sides.length - 1].max
}

/**
 * Where a Bomb Pig at `x` throws: towards the side with more room, landing
 * inside throwBounds. `dir` is -1 (left) or 1 (right).
 */
export function throwTarget(rng, x) {
    const { throwBounds, throwDistance } = TITLE_SCENE
    const dir = x - throwBounds.minX >= throwBounds.maxX - x ? -1 : 1
    const distance = between(rng, throwDistance.min, throwDistance.max)
    const landX = Math.min(throwBounds.maxX, Math.max(throwBounds.minX, x + dir * distance))
    return { dir, landX }
}

/**
 * A point `s` (0..1) along a throw from `from` to `to`, rising `peak` px above
 * the straight line between them at the middle.
 */
export function arcPoint(from, to, peak, s) {
    const t = Math.min(1, Math.max(0, s))
    return {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t - 4 * peak * t * (1 - t),
    }
}

/**
 * drawImage arguments for `frame` of `sheet` with its anchor on (x, y),
 * mirrored when `flip` (the pack's sprites face left). Whole pixels.
 */
export function spriteDrawRect(sheet, frame, x, y, flip, scale = SCENE_SCALE) {
    const anchorX = flip ? sheet.w - sheet.anchorX : sheet.anchorX
    return {
        src: sheet.src,
        sx: frame * sheet.w,
        sy: 0,
        sw: sheet.w,
        sh: sheet.h,
        dx: Math.round(x - anchorX * scale),
        dy: Math.round(y - sheet.anchorY * scale),
        dw: sheet.w * scale,
        dh: sheet.h * scale,
        flip,
    }
}

function idleFor(rng, min, max) {
    return { state: 'idle', t: 0, until: between(rng, min, max) }
}

function createBombPig(rng, x) {
    const pig = { x, dir: -1, target: x, bombThrown: false, ...idleFor(rng, 200, 1800) }
    return pig
}

/** A fresh scene. `rng` drives every choice (Math.random in the game). */
export function createTitleScene({ rng = Math.random } = {}) {
    const { bombPigPatrol: b, kingPatrol: k, floorY } = TITLE_SCENE
    const w = b.maxX - b.minX
    return {
        rng,
        time: 0,
        lastNow: null,
        bombPigs: [0.12, 0.45, 0.8].map(f => createBombPig(rng, b.minX + w * f)),
        king: { x: (k.minX + k.maxX) / 2, dir: 1, target: 0, ...idleFor(rng, 500, 2000) },
        matchPig: { state: 'wait', t: 0, until: between(rng, 1500, 3500) },
        cannon: { shooting: false, t: 0 },
        projectiles: [],
        floorY,
    }
}

function throwBomb(scene, pig) {
    const { floorY, throwPeak } = TITLE_SCENE
    const from = { x: pig.x + pig.dir * 8, y: floorY - 40 }
    const to = { x: pig.landX, y: floorY }
    scene.projectiles.push({
        kind: 'bomb', phase: 'fly', t: 0, from, to, peak: throwPeak,
        flightMs: 500 + Math.abs(to.x - from.x) * 1.5, pos: { ...from },
    })
}

function fireCannon(scene) {
    const { floorY, cannonX, shotDistance, shotPeak } = TITLE_SCENE
    const rng = scene.rng
    const from = { x: cannonX - 22, y: floorY - 24 }
    const to = { x: from.x - between(rng, shotDistance.min, shotDistance.max), y: floorY - 6 }
    scene.projectiles.push({
        kind: 'ball', phase: 'fly', t: 0, from, to, peak: shotPeak,
        flightMs: Math.abs(to.x - from.x) * 1.4, pos: { ...from },
    })
    scene.cannon = { shooting: true, t: 0 }
}

function stepBombPig(scene, pig, dt) {
    const rng = scene.rng
    const bounds = TITLE_SCENE.bombPigPatrol
    pig.t += dt
    switch (pig.state) {
        case 'run':
            pig.x = stepToward(pig.x, pig.target, TITLE_SCENE.bombPigSpeed, dt)
            if (pig.x === pig.target) {
                if (rng() < 0.6) {
                    const { dir, landX } = throwTarget(rng, pig.x)
                    Object.assign(pig, { state: 'pick', t: 0, dir, landX, bombThrown: false })
                } else {
                    Object.assign(pig, idleFor(rng, 500, 1800))
                }
            }
            break
        case 'idle':
            if (pig.t >= pig.until) {
                pig.target = pickPatrolTarget(rng, bounds, pig.x)
                pig.dir = Math.sign(pig.target - pig.x)
                Object.assign(pig, { state: 'run', t: 0 })
            }
            break
        case 'pick':
            if (pig.t >= bombPigTimes.pick) Object.assign(pig, { state: 'throw', t: 0 })
            break
        case 'throw':
            if (!pig.bombThrown && pig.t >= THROW_RELEASE_FRAME * FRAME_MS) {
                pig.bombThrown = true
                throwBomb(scene, pig)
            }
            if (pig.t >= bombPigTimes.throw) Object.assign(pig, idleFor(rng, 400, 1200))
            break
    }
}

function stepKing(scene, dt) {
    const king = scene.king
    const rng = scene.rng
    king.t += dt
    if (king.state === 'run') {
        king.x = stepToward(king.x, king.target, TITLE_SCENE.kingSpeed, dt)
        if (king.x === king.target) Object.assign(king, idleFor(rng, 1500, 4000))
    } else if (king.t >= king.until) {
        king.target = pickPatrolTarget(rng, TITLE_SCENE.kingPatrol, king.x)
        king.dir = Math.sign(king.target - king.x)
        Object.assign(king, { state: 'run', t: 0 })
    }
}

/** Match Pig: waits with its match lit, lights the cannon, then relights its match. */
function stepMatchPig(scene, dt) {
    const pig = scene.matchPig
    pig.t += dt
    if (pig.state === 'wait' && pig.t >= pig.until) {
        Object.assign(pig, { state: 'light', t: 0 })
    } else if (pig.state === 'light' && pig.t >= LIGHT_CANNON_MS) {
        fireCannon(scene)
        Object.assign(pig, { state: 'relight', t: 0 })
    } else if (pig.state === 'relight' && pig.t >= SHEETS.matchLight.frames * FRAME_MS) {
        Object.assign(pig, { state: 'wait', t: 0, until: between(scene.rng, 3000, 7000) })
    }

    const cannon = scene.cannon
    cannon.t += dt
    if (cannon.shooting && cannon.t >= SHEETS.cannonShoot.frames * FRAME_MS) {
        scene.cannon = { shooting: false, t: 0 }
    }
}

/** Bombs fly, fuse and explode; cannon balls fly and explode where they land. */
function stepProjectile(p, dt) {
    p.t += dt
    if (p.phase === 'fly') {
        p.pos = arcPoint(p.from, p.to, p.peak, p.t / p.flightMs)
        if (p.t >= p.flightMs) {
            p.pos = { ...p.to }
            p.phase = p.kind === 'bomb' ? 'fuse' : 'boom'
            p.t = 0
        }
    } else if (p.phase === 'fuse' && p.t >= FUSE_MS) {
        p.phase = 'boom'
        p.t = 0
    } else if (p.phase === 'boom' && p.t >= SHEETS.boom.frames * FRAME_MS) {
        p.phase = 'done'
    }
}

/** Advances the scene by `dtMs`. */
export function stepTitleScene(scene, dtMs) {
    scene.time += dtMs
    for (const pig of scene.bombPigs) stepBombPig(scene, pig, dtMs)
    stepKing(scene, dtMs)
    stepMatchPig(scene, dtMs)
    for (const p of scene.projectiles) stepProjectile(p, dtMs)
    scene.projectiles = scene.projectiles.filter(p => p.phase !== 'done')
}

/**
 * Advances the scene to the frame time `now` (ms, e.g. performance.now()).
 * Steps are capped at maxStepMs; the first call after pauseTitleScene() only
 * records the time.
 */
export function advanceTitleScene(scene, now) {
    if (scene.lastNow != null) {
        stepTitleScene(scene, Math.min(TITLE_SCENE.maxStepMs, Math.max(0, now - scene.lastNow)))
    }
    scene.lastNow = now
}

/** Call when the Title Screen stops showing, so the scene resumes where it left off. */
export function pauseTitleScene(scene) {
    scene.lastNow = null
}

function draw(sheetName, frame, x, y, flip = false) {
    return { sheet: sheetName, ...spriteDrawRect(SHEETS[sheetName], frame, x, y, flip) }
}

function bombPigSprite(pig, y) {
    // Sprites face left; flip when walking or throwing right.
    const flip = pig.dir > 0
    switch (pig.state) {
        case 'run': return draw('bombPigRun', loopFrame(pig.t, 6), pig.x, y, flip)
        case 'pick': return draw('bombPigPick', onceFrame(pig.t, 4), pig.x, y, flip)
        case 'throw': return draw('bombPigThrow', onceFrame(pig.t, 5), pig.x, y, flip)
        default: return draw('bombPigIdle', loopFrame(pig.t, 10), pig.x, y, flip)
    }
}

function projectileSprite(p) {
    const { x, y } = p.pos
    if (p.phase === 'boom') return draw('boom', onceFrame(p.t, 6), x, y)
    if (p.kind === 'ball') {
        // Ball.png holds the ball at (29, 19); centre it on the flight path.
        return draw('cannonBall', 0, x, y + 6 * SCENE_SCALE)
    }
    if (p.phase === 'fuse') return draw('bombOn', loopFrame(p.t, 4), x, y)
    return draw('bombOff', 0, x, y)
}

/**
 * Everything to draw this frame, back to front: drawImage arguments plus the
 * sheet name. The floor strip is drawn separately (titleSceneFloorTiles).
 */
export function titleSceneDrawList(scene) {
    const { floorY, cannonX, matchPigX } = TITLE_SCENE
    const list = []
    const cannon = scene.cannon.shooting
        ? draw('cannonShoot', onceFrame(scene.cannon.t, 4), cannonX, floorY)
        : draw('cannonIdle', 0, cannonX, floorY)
    list.push(cannon)
    const mp = scene.matchPig
    if (mp.state === 'light') list.push(draw('matchCannon', loopFrame(mp.t, 3), matchPigX, floorY))
    else if (mp.state === 'relight') list.push(draw('matchLight', onceFrame(mp.t, 3), matchPigX, floorY))
    else list.push(draw('matchOn', loopFrame(mp.t, 3), matchPigX, floorY))

    const king = scene.king
    list.push(king.state === 'run'
        ? draw('kingRun', loopFrame(king.t, 6, 140), king.x, floorY, king.dir > 0)
        : draw('kingIdle', loopFrame(king.t, 12), king.x, floorY, king.dir > 0))
    for (const pig of scene.bombPigs) list.push(bombPigSprite(pig, floorY))
    for (const p of scene.projectiles) list.push(projectileSprite(p))
    return list
}

/** Destination rects for the floor tiles, left to right across the canvas. */
export function titleSceneFloorTiles() {
    const { width, floorY, floorTile } = TITLE_SCENE
    const size = floorTile.w * SCENE_SCALE
    const tiles = []
    for (let x = 0; x < width; x += size) tiles.push({ x, y: floorY, w: size, h: floorTile.h * SCENE_SCALE })
    return tiles
}
