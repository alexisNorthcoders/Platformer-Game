import assert from 'node:assert/strict'
import test from 'node:test'
import {
    BOSS,
    advanceBoss,
    bombDropXs,
    bossAnimation,
    createBossState,
    damageBoss,
    pauseBoss,
    quakeHits,
    shakeOffset,
    stepBoss,
} from '../js/boss.mjs'
import { createBombState, stepBombs, tryDropBomb } from '../js/bomb.mjs'

const ARENA = { left: 64, right: 960, ceilingY: 80 }
const X = 800

/** A seeded 0..1 source (mulberry32). */
function seeded(seed) {
    let a = seed
    return () => {
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

const newBoss = () => createBossState({ x: X, arena: ARENA, halfWidth: 95 })

/** Steps in `step` ms slices; returns the events with the time (ms) each came at. */
function run(state, ms, { kingX = 200, rand = () => 0.9, step = 10 } = {}) {
    const out = []
    for (let t = step; t <= ms; t += step) {
        for (const event of stepBoss(state, step, { kingX, x: X, rand })) out.push({ ...event, at: t })
    }
    return out
}

/** rand() that picks the Bomb Drop first / the Ground Pound first. */
const BOMB_FIRST = () => 0.1
const POUND_FIRST = () => 0.9

test('he starts with 10 hit points, walking', () => {
    const boss = newBoss()
    assert.equal(boss.hp, 10)
    assert.equal(boss.phase, 'walk')
})

test('a hammer hit takes 1 and a Bomb blast 3', () => {
    const boss = newBoss()
    damageBoss(boss, BOSS.hammerDamage)
    assert.equal(boss.hp, 9)
    run(boss, BOSS.flinchMs + 10)
    damageBoss(boss, BOSS.blastDamage)
    assert.equal(boss.hp, 6)
})

test('hits during the flinch are ignored, and count again after it', () => {
    const boss = newBoss()
    assert.deepEqual(damageBoss(boss, 1).map(e => e.type), ['hit'])
    assert.equal(boss.phase, 'flinch')
    run(boss, BOSS.flinchMs - 10)
    assert.deepEqual(damageBoss(boss, 1), [])
    assert.equal(boss.hp, 9)
    run(boss, 20)
    assert.equal(boss.phase, 'walk')
    damageBoss(boss, 1)
    assert.equal(boss.hp, 8)
})

test('hit points clamp at 0 and defeated is emitted exactly once; damage after it is ignored', () => {
    const boss = newBoss()
    boss.hp = 2
    const events = damageBoss(boss, 3)
    assert.equal(boss.hp, 0)
    assert.deepEqual(events.map(e => e.type), ['hit', 'defeated'])
    assert.equal(boss.phase, 'dead')
    assert.deepEqual(damageBoss(boss, 3), [])
    run(boss, 2000)
    assert.deepEqual(damageBoss(boss, 3), [])
    assert.equal(boss.hp, 0)
})

test('dead plays Hit, then Dead', () => {
    const boss = newBoss()
    boss.hp = 1
    damageBoss(boss, 1)
    assert.equal(bossAnimation(boss), 'hit')
    run(boss, BOSS.flinchMs)
    assert.equal(bossAnimation(boss), 'dead')
})

test('the first attack starts after attackEveryMs, not before', () => {
    const boss = newBoss()
    run(boss, BOSS.attackEveryMs - 10, { rand: BOMB_FIRST })
    assert.equal(boss.phase, 'walk')
    run(boss, 10, { rand: BOMB_FIRST })
    assert.equal(boss.phase, 'bombWarn')
})

test('attacks alternate, the first picked at random', () => {
    const phases = rand => {
        const boss = newBoss()
        const seen = []
        for (let i = 0; i < 4; i++) {
            while (boss.phase === 'walk') run(boss, 10, { rand })
            seen.push(boss.phase)
            while (boss.phase !== 'walk') run(boss, 10, { rand })
        }
        return seen
    }
    assert.deepEqual(phases(BOMB_FIRST), ['bombWarn', 'crouch', 'bombWarn', 'crouch'])
    assert.deepEqual(phases(POUND_FIRST), ['crouch', 'bombWarn', 'crouch', 'bombWarn'])
})

test('at 5 hit points or fewer the gap is enragedAttackEveryMs', () => {
    const boss = newBoss()
    boss.hp = 5
    run(boss, BOSS.enragedAttackEveryMs - 10, { rand: BOMB_FIRST })
    assert.equal(boss.phase, 'walk')
    run(boss, 10, { rand: BOMB_FIRST })
    assert.equal(boss.phase, 'bombWarn')
})

test('no attack starts during a flinch or once he is dead', () => {
    const boss = newBoss()
    run(boss, 2000, { rand: BOMB_FIRST })
    damageBoss(boss, 1)
    run(boss, BOSS.flinchMs - 10, { rand: BOMB_FIRST })
    assert.equal(boss.phase, 'flinch')
    const dead = newBoss()
    dead.hp = 1
    damageBoss(dead, 1)
    assert.deepEqual(run(dead, 20000, { rand: BOMB_FIRST }), [])
    assert.equal(dead.phase, 'dead')
})

test('pause and advance do not skip time', () => {
    const boss = newBoss()
    const ctx = { kingX: 200, x: X, rand: BOMB_FIRST }
    advanceBoss(boss, 1000, ctx)
    advanceBoss(boss, 1050, ctx)
    pauseBoss(boss)
    advanceBoss(boss, 900000, ctx)
    assert.equal(boss.sinceAttackMs, 50)
    advanceBoss(boss, 900050, ctx)
    assert.equal(boss.sinceAttackMs, 100)
    // a hitch counts as at most maxStepMs
    advanceBoss(boss, 990000, ctx)
    assert.equal(boss.sinceAttackMs, 100 + BOSS.maxStepMs)
})

test('Bomb Drop: a warning, then 3 Bombs gapMs apart, the first over the King', () => {
    const boss = newBoss()
    const events = run(boss, BOSS.attackEveryMs + 2000, { kingX: 300, rand: BOMB_FIRST, step: 1 })
    const drops = events.filter(e => e.type === 'dropBomb')
    assert.equal(drops.length, 3)
    const { warnMs, gapMs } = BOSS.bombDrop
    assert.equal(drops[0].at, BOSS.attackEveryMs + warnMs + 1)
    assert.equal(drops[1].at - drops[0].at, gapMs)
    assert.equal(drops[2].at - drops[1].at, gapMs)
    assert.equal(drops[0].x, 300)
    assert.ok(drops.every(d => d.y === ARENA.ceilingY))
    assert.equal(boss.phase, 'walk')
})

test('Bomb Drop: every Bomb is inside the arena and minSpacingPx from the others', () => {
    for (let seed = 1; seed <= 200; seed++) {
        const rand = seeded(seed)
        const kingX = ARENA.left + rand() * (ARENA.right - ARENA.left)
        const xs = bombDropXs(kingX, ARENA, rand)
        assert.equal(xs.length, 3)
        assert.equal(xs[0], kingX)
        for (const x of xs) assert.ok(x >= ARENA.left && x <= ARENA.right)
        for (let i = 0; i < xs.length; i++) {
            for (let j = i + 1; j < xs.length; j++) assert.ok(Math.abs(xs[i] - xs[j]) >= BOSS.bombDrop.minSpacingPx, `seed ${seed}`)
        }
    }
})

test('Ground Pound: crouch, then leap, then landed, with the configured timings', () => {
    const boss = newBoss()
    const events = run(boss, BOSS.attackEveryMs + 1600, { kingX: 700, rand: POUND_FIRST, step: 1 })
    const { crouchMs, airMs } = BOSS.groundPound
    assert.deepEqual(events.map(e => e.type), ['leap', 'landed'])
    assert.equal(events[0].at, BOSS.attackEveryMs + crouchMs)
    assert.equal(events[1].at - events[0].at, airMs)
})

test('Ground Pound: the leap goes toward the King by up to maxLeapPx and stays in the arena', () => {
    const leapFor = (x, kingX) => {
        const boss = createBossState({ x, arena: ARENA, halfWidth: 95 })
        const [leap] = stepBoss(Object.assign(boss, { phase: 'crouch', t: BOSS.groundPound.crouchMs - 1 }), 1, { kingX, x, rand: POUND_FIRST })
        const frames = BOSS.groundPound.airMs / (1000 / 60)
        return { dx: leap.vx * frames, vy: leap.vy, frames }
    }
    assert.ok(Math.abs(leapFor(800, 100).dx + BOSS.groundPound.maxLeapPx) < 1e-6)
    assert.ok(Math.abs(leapFor(500, 600).dx - 100) < 1e-6)
    // against the right wall: no leaving the arena
    assert.ok(800 + leapFor(800, 960).dx + 95 <= ARENA.right + 1e-6)
    // vy and gravity bring him back to where he left after airMs
    const { vy, frames } = leapFor(500, 500)
    assert.ok(Math.abs(vy * frames + (BOSS.gravity * frames * frames) / 2) < 1e-6)
})

test('quakeHits: on the ground yes; in the air (rising or falling), dead or sinking no', () => {
    const king = { isGrounded: true, velocity: { y: 0 }, dead: false, sinking: false }
    assert.equal(quakeHits(king), true)
    assert.equal(quakeHits({ ...king, isGrounded: false, velocity: { y: 3 } }), false)
    assert.equal(quakeHits({ ...king, isGrounded: false, velocity: { y: -3 } }), false)
    assert.equal(quakeHits({ ...king, velocity: { y: -3 } }), false)
    assert.equal(quakeHits({ ...king, dead: true }), false)
    assert.equal(quakeHits({ ...king, sinking: true }), false)
})

test('shakeOffset: 0 before a landing, within maxPx while shaking, 0 after shake.ms', () => {
    const boss = newBoss()
    assert.deepEqual(shakeOffset(boss), { x: 0, y: 0 })
    run(boss, BOSS.attackEveryMs + BOSS.groundPound.crouchMs + BOSS.groundPound.airMs, { rand: POUND_FIRST, step: 5 })
    assert.notEqual(boss.shakeT, null)
    let moved = false
    while (boss.shakeT != null) {
        const { x, y } = shakeOffset(boss)
        assert.ok(Math.abs(x) <= BOSS.shake.maxPx && Math.abs(y) <= BOSS.shake.maxPx)
        if (x || y) moved = true
        run(boss, 5, { rand: POUND_FIRST, step: 5 })
    }
    assert.ok(moved)
    assert.deepEqual(shakeOffset(boss), { x: 0, y: 0 })
})

test('several Bombs: each of a list of Bomb states explodes on its own', () => {
    const states = [0, 1, 2].map(() => createBombState())
    states.forEach((s, i) => tryDropBomb(s, { x: 100 + i * 200, y: 300 }))
    // staggered: the second and third are lit 300 ms and 600 ms after the first
    const blasts = []
    for (let t = 0; t < 3000; t += 10) {
        if (t === 300) tryDropBomb(states[1], { x: 300, y: 300 })
        for (const [i, s] of states.entries()) {
            for (const e of stepBombs(s, 10)) blasts.push({ i, t, rect: e.rect })
        }
    }
    assert.equal(blasts.length, 3)
    assert.deepEqual(new Set(blasts.map(b => b.i)), new Set([0, 1, 2]))
})

test('the Giant King Pig is a hammer target and a contact-damage group, but is never squished', async () => {
    const { collectAttackableEnemiesForPlayerAttack } = await import('../js/attackTargetSelection.mjs')
    const { findSquishedPigs } = await import('../js/contactDamageHelpers.mjs')
    const giant = {
        enemyVariant: 'giantKing',
        loaded: true,
        hitpoints: 10,
        opacity: 1,
        hitbox: { position: { x: 500, y: 300 }, width: 180, height: 180 },
    }
    assert.deepEqual(collectAttackableEnemiesForPlayerAttack([], [], giant), [giant])
    const king = { position: { x: 540, y: 250 }, width: 55, height: 53 }
    assert.deepEqual(findSquishedPigs(king, 8, [giant]), [])
})
