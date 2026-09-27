import assert from 'node:assert/strict'
import test from 'node:test'
import {
    SHEETS,
    TITLE_SCENE,
    advanceTitleScene,
    arcPoint,
    createTitleScene,
    loopFrame,
    onceFrame,
    pauseTitleScene,
    pickPatrolTarget,
    spriteDrawRect,
    stepTitleScene,
    stepToward,
    throwTarget,
    titleSceneDrawList,
} from '../js/titleScene.mjs'
import { TITLE_SCREEN } from '../js/menuLayout.mjs'
import { frameAround } from '../js/menuArt.mjs'

/** Deterministic RNG (mulberry32) so scene runs are repeatable. */
function seeded(seed) {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** Runs `scene` for `ms` in 16ms steps, calling `each` after every step. */
function run(scene, ms, each = () => {}) {
    for (let t = 0; t < ms; t += 16) {
        stepTitleScene(scene, 16)
        each(scene)
    }
}

test('loopFrame / onceFrame: frame index from elapsed ms', () => {
    assert.equal(loopFrame(0, 4, 100), 0)
    assert.equal(loopFrame(250, 4, 100), 2)
    assert.equal(loopFrame(450, 4, 100), 0)
    assert.equal(onceFrame(250, 4, 100), 2)
    assert.equal(onceFrame(9999, 4, 100), 3)
})

test('stepToward: moves at speed and never overshoots', () => {
    assert.equal(stepToward(100, 200, 0.1, 100), 110)
    assert.equal(stepToward(100, 20, 0.1, 100), 90)
    assert.equal(stepToward(195, 200, 0.1, 100), 200)
    assert.equal(stepToward(205, 200, 0.1, 100), 200)
})

test('pickPatrolTarget: inside the bounds and a real step away from x', () => {
    const rng = seeded(1)
    const bounds = { minX: 60, maxX: 780 }
    for (let i = 0; i < 2000; i++) {
        const x = bounds.minX + rng() * (bounds.maxX - bounds.minX)
        const target = pickPatrolTarget(rng, bounds, x)
        assert.ok(target >= bounds.minX && target <= bounds.maxX, `${target}`)
        assert.ok(Math.abs(target - x) >= TITLE_SCENE.minPatrolStep, `${x} -> ${target}`)
    }
    // Pinned at either end it still walks away.
    assert.ok(pickPatrolTarget(() => 0, bounds, bounds.minX) > bounds.minX)
    assert.ok(pickPatrolTarget(() => 0.999, bounds, bounds.maxX) < bounds.maxX)
})

test('arcPoint: starts and ends on its points, peaks mid-flight', () => {
    const from = { x: 100, y: 470 }
    const to = { x: 300, y: 510 }
    assert.deepEqual(arcPoint(from, to, 80, 0), from)
    assert.deepEqual(arcPoint(from, to, 80, 1), to)
    const mid = arcPoint(from, to, 80, 0.5)
    assert.equal(mid.x, 200)
    assert.equal(mid.y, 490 - 80)
    // Clamped outside 0..1.
    assert.deepEqual(arcPoint(from, to, 80, 2), to)
})

test('throwTarget: throws towards the side with more room, landing inside the strip', () => {
    const rng = seeded(2)
    const { throwBounds } = TITLE_SCENE
    for (let i = 0; i < 2000; i++) {
        const x = TITLE_SCENE.bombPigPatrol.minX + rng() * (TITLE_SCENE.bombPigPatrol.maxX - TITLE_SCENE.bombPigPatrol.minX)
        const { dir, landX } = throwTarget(rng, x)
        assert.ok(landX >= throwBounds.minX && landX <= throwBounds.maxX, `${landX}`)
        assert.equal(Math.sign(landX - x), dir)
    }
    assert.equal(throwTarget(() => 0.5, TITLE_SCENE.bombPigPatrol.minX).dir, 1)
    assert.equal(throwTarget(() => 0.5, TITLE_SCENE.bombPigPatrol.maxX).dir, -1)
})

test('spriteDrawRect: anchors the frame on (x, y) at 2×, mirrored when flipped', () => {
    const sheet = { src: 'a.png', frames: 4, w: 26, h: 26, anchorX: 10, anchorY: 26 }
    assert.deepEqual(spriteDrawRect(sheet, 2, 100, 500, false), {
        src: 'a.png', sx: 52, sy: 0, sw: 26, sh: 26, dx: 80, dy: 448, dw: 52, dh: 52, flip: false,
    })
    // Flipped, the anchor column mirrors: 26 - 10 = 16 source px left of x.
    assert.equal(spriteDrawRect(sheet, 0, 100, 500, true).dx, 68)
    // Whole pixels even for fractional positions.
    assert.equal(spriteDrawRect(sheet, 0, 100.4, 500.6, false).dx, 80)
})

test('scene: pigs stay on the strip and keep patrolling, throwing and detonating', () => {
    for (const seed of [1, 7, 42]) {
        const scene = createTitleScene({ rng: seeded(seed) })
        const thrown = new Map()
        const lastMoved = new Map()
        let now = 0
        let bombsThrown = 0
        let explosions = 0
        run(scene, 180_000, s => {
            now += 16
            for (const pig of s.bombPigs) {
                const b = TITLE_SCENE.bombPigPatrol
                assert.ok(pig.x >= b.minX && pig.x <= b.maxX, `bomb pig at ${pig.x}`)
                if (pig.x !== pig.lastX) lastMoved.set(pig, now)
                pig.lastX = pig.x
                // Never idle or mid-throw for long: at most ~6 s without moving.
                assert.ok(now - (lastMoved.get(pig) ?? 0) < 6000, `pig stuck at ${pig.x}`)
            }
            const k = TITLE_SCENE.kingPatrol
            assert.ok(s.king.x >= k.minX && s.king.x <= k.maxX, `king at ${s.king.x}`)
            for (const p of s.projectiles) {
                if (p.kind === 'bomb' && !thrown.has(p)) { thrown.set(p, true); bombsThrown++ }
                if (p.kind === 'bomb' && p.phase === 'boom' && !p.counted) { p.counted = true; explosions++ }
                assert.ok(p.pos.x >= 0 && p.pos.x <= TITLE_SCENE.width, `projectile at ${p.pos.x}`)
            }
        })
        assert.ok(bombsThrown >= 20, `seed ${seed}: only ${bombsThrown} bombs`)
        // Every bomb explodes, bar the few still in the air or fusing at the end.
        assert.ok(explosions >= bombsThrown - scene.bombPigs.length, `seed ${seed}: ${explosions} booms for ${bombsThrown} bombs`)
        // Finished explosions are dropped, so the list stays short.
        assert.ok(scene.projectiles.length < 10)
    }
})

test('scene: the Match Pig lights the cannon, which fires cannon balls', () => {
    const scene = createTitleScene({ rng: seeded(3) })
    const balls = new Set()
    let lit = 0
    let prev = scene.matchPig.state
    run(scene, 60_000, s => {
        if (s.matchPig.state === 'light' && prev !== 'light') lit++
        prev = s.matchPig.state
        for (const p of s.projectiles) if (p.kind === 'ball') balls.add(p)
    })
    assert.ok(lit >= 4, `lit ${lit} times`)
    assert.ok(balls.size >= 4, `${balls.size} cannon balls`)
})

test('scene: King Pig both struts and idles', () => {
    const scene = createTitleScene({ rng: seeded(5) })
    const seen = new Set()
    run(scene, 30_000, s => seen.add(s.king.state))
    assert.deepEqual([...seen].sort(), ['idle', 'run'])
})

test('draw list: every sprite is a known sheet frame, below the menu', () => {
    const scene = createTitleScene({ rng: seeded(9) })
    const frame = frameAround(TITLE_SCREEN.preview)
    const menuBottom = Math.max(TITLE_SCREEN.panel.y + TITLE_SCREEN.panel.h, frame.y + frame.h)
    const sources = new Set(Object.values(SHEETS).map(s => s.src))
    run(scene, 60_000, s => {
        for (const d of titleSceneDrawList(s)) {
            assert.ok(sources.has(d.src), d.src)
            assert.ok(d.sx >= 0 && d.sx + d.sw <= SHEETS[d.sheet].w * SHEETS[d.sheet].frames)
            // Sprite frames carry transparent padding, so compare the drawn
            // frame's lower half: the scene never climbs into the menu.
            assert.ok(d.dy + d.dh / 2 > menuBottom, `${d.sheet} at ${d.dy}`)
        }
    })
})

test('advanceTitleScene: real-time steps are clamped, and pausing forgets the last frame', () => {
    const scene = createTitleScene({ rng: seeded(4) })
    advanceTitleScene(scene, 1000)
    assert.equal(scene.time, 0)
    advanceTitleScene(scene, 1016)
    assert.equal(scene.time, 16)
    // A long gap (tab hidden, or playing a level) advances at most maxStepMs.
    advanceTitleScene(scene, 60_000)
    assert.equal(scene.time, 16 + TITLE_SCENE.maxStepMs)
    pauseTitleScene(scene)
    advanceTitleScene(scene, 120_000)
    assert.equal(scene.time, 16 + TITLE_SCENE.maxStepMs)
})
