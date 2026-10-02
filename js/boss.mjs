/**
 * The Giant King Pig's fight (#113), on the Boss Level: 10 hit points, a
 * flinch after every hit, and two attacks that alternate, the Bomb Drop
 * (Bombs fall from the ceiling) and the Ground Pound (a leap whose landing
 * shakes the screen and hurts a King who is not in the air).
 *
 * Pure: no DOM, canvas or globals. Time is stepped in ms. stepBoss() returns
 * the events the game applies (`dropBomb`, `leap`, `landed`), and index.js
 * steps it with advanceBoss() while playing (pauseBoss() otherwise, so the
 * fight freezes behind the Pause Menu), through globalThis.__boss
 * (boss-bootstrap.mjs).
 *
 * Positions are world px; `x` is the middle of the Giant King Pig's hitbox.
 */

export const BOSS = {
    maxHp: 10,
    /** What a hammer hit and a Bomb's blast cost him. */
    hammerDamage: 1,
    blastDamage: 3,
    /** After any hit he can't be hurt again for this long. */
    flinchMs: 500,
    /** Between the end of one attack and the start of the next. */
    attackEveryMs: 2500,
    /** The same, once he is at `enragedAtHp` or fewer. */
    enragedAttackEveryMs: 1800,
    enragedAtHp: 5,
    bombDrop: { warnMs: 500, count: 3, gapMs: 300, minSpacingPx: 120 },
    groundPound: { crouchMs: 600, airMs: 900, maxLeapPx: 200, landGraceMs: 600 },
    shake: { ms: 500, maxPx: 8 },
    /** Walking toward the King, px/frame. */
    walkSpeed: 0.6,
    /** His fall acceleration, px/frame² (Enemy's). The leap is worked out from it. */
    gravity: 0.4,
    /** Closer to the King than this (px) he stands still instead of shuffling. */
    walkDeadZonePx: 6,
    /** Longest frame gap advanceBoss() steps across (a hitch or hidden tab counts as this much). */
    maxStepMs: 100,
}

const FRAME_MS = 1000 / 60

/** The Giant King Pig at full health, standing at `x` (middle of his hitbox), walking. */
export function createBossState({ x, arena, halfWidth = 0 }) {
    return {
        hp: BOSS.maxHp,
        /** 'walk' | 'bombWarn' | 'bombDrop' | 'crouch' | 'air' | 'flinch' | 'dead' */
        phase: 'walk',
        /** Time in the current phase. */
        t: 0,
        /** Time walking since the last attack. */
        sinceAttackMs: 0,
        /** 'bombDrop' | 'groundPound': the next attack; null until the first is picked at random. */
        nextAttack: null,
        /** Time left in which he can't be hurt again. */
        invulnMs: 0,
        /** The Bomb Drop's x positions, and how many have fallen. */
        bombXs: [],
        bombsDropped: 0,
        /** Time since the last landing while the screen shakes, else null. */
        shakeT: null,
        arena,
        halfWidth,
        lastNow: null,
    }
}

/** Where the 3 Bombs of a Bomb Drop fall: the first over the King, the rest random, all `minSpacingPx` apart and inside the arena. */
export function bombDropXs(kingX, arena, rand) {
    const { count, minSpacingPx } = BOSS.bombDrop
    const clamp = x => Math.min(arena.right, Math.max(arena.left, x))
    const xs = [clamp(kingX)]
    while (xs.length < count) {
        let best = null
        let bestGap = -1
        for (let attempt = 0; attempt < 30; attempt++) {
            const x = arena.left + rand() * (arena.right - arena.left)
            const gap = Math.min(...xs.map(other => Math.abs(other - x)))
            if (gap >= minSpacingPx) {
                best = x
                break
            }
            if (gap > bestGap) {
                best = x
                bestGap = gap
            }
        }
        xs.push(best)
    }
    return xs
}

/** The gap between attacks now. */
function attackGapMs(state) {
    return state.hp <= BOSS.enragedAtHp ? BOSS.enragedAttackEveryMs : BOSS.attackEveryMs
}

function enter(state, phase) {
    state.phase = phase
    state.t = 0
}

/** The leap's sideways distance: toward the King by up to maxLeapPx, never out of the arena. */
function leapDistance(state, kingX, x) {
    const { maxLeapPx } = BOSS.groundPound
    const reach = state.halfWidth
    const lo = state.arena.left + reach - x
    const hi = state.arena.right - reach - x
    const toKing = Math.min(maxLeapPx, Math.max(-maxLeapPx, kingX - x))
    return Math.min(hi, Math.max(lo, toKing))
}

/** Starts the next attack: the Bomb Drop's warning or the Ground Pound's crouch. */
function startAttack(state) {
    state.sinceAttackMs = 0
    if (state.nextAttack === 'groundPound') {
        state.nextAttack = 'bombDrop'
        enter(state, 'crouch')
    } else {
        state.nextAttack = 'groundPound'
        enter(state, 'bombWarn')
    }
}

/**
 * Advances the fight by `dtMs`. `kingX` is the King's x and `x` the Giant King
 * Pig's own; `rand` is a 0..1 source; `grounded` (optional) is whether his feet are on the floor, so a leap ends on touchdown instead of on the clock. Returns the events, in order:
 * `{ type: 'dropBomb', x, y }`, `{ type: 'leap', vx, vy }` (px/frame) and
 * `{ type: 'landed' }` (the screen shakes: apply the quake).
 */
export function stepBoss(state, dtMs, ctx) {
    const { kingX, x, rand } = ctx
    const events = []
    if (state.phase === 'dead') {
        // Down for good; the time only tells bossAnimation() when Hit gives way to Dead.
        state.t += dtMs
        return events
    }
    state.invulnMs = Math.max(0, state.invulnMs - dtMs)
    if (state.shakeT != null) {
        state.shakeT += dtMs
        if (state.shakeT >= BOSS.shake.ms) state.shakeT = null
    }
    let left = dtMs
    // Each pass spends time up to the phase's end, so one long step crosses several phases.
    while (left > 0 && state.phase !== 'dead') {
        const spend = limit => {
            const used = Math.min(left, limit - state.t)
            state.t += used
            left -= used
            return state.t >= limit
        }
        switch (state.phase) {
            case 'walk': {
                const gap = attackGapMs(state)
                const used = Math.max(0, Math.min(left, gap - state.sinceAttackMs))
                state.sinceAttackMs += used
                left -= used
                if (state.sinceAttackMs >= gap) {
                    state.nextAttack ??= rand() < 0.5 ? 'bombDrop' : 'groundPound'
                    startAttack(state)
                }
                break
            }
            case 'bombWarn':
                if (spend(BOSS.bombDrop.warnMs)) {
                    state.bombXs = bombDropXs(kingX, state.arena, rand)
                    state.bombsDropped = 0
                    enter(state, 'bombDrop')
                }
                break
            case 'bombDrop': {
                const { count, gapMs } = BOSS.bombDrop
                // Bomb n falls n gaps in; the Drop ends one gap after the last.
                const nextAt = state.bombsDropped * gapMs
                if (state.bombsDropped < count) {
                    if (state.t >= nextAt) {
                        events.push({ type: 'dropBomb', x: state.bombXs[state.bombsDropped], y: state.arena.ceilingY })
                        state.bombsDropped++
                    } else if (spend(nextAt)) continue
                } else if (spend(count * gapMs)) {
                    state.sinceAttackMs = 0
                    enter(state, 'walk')
                }
                break
            }
            case 'crouch':
                if (spend(BOSS.groundPound.crouchMs)) {
                    const { airMs } = BOSS.groundPound
                    const frames = airMs / FRAME_MS
                    events.push({
                        type: 'leap',
                        vx: leapDistance(state, kingX, x) / frames,
                        vy: -(BOSS.gravity * frames) / 2,
                    })
                    enter(state, 'air')
                }
                break
            case 'air':
                // He lands when his feet touch the floor, but not before airMs and never later than the grace.
                if (spend(BOSS.groundPound.airMs + (ctx.grounded === false ? BOSS.groundPound.landGraceMs : 0))) {
                    events.push({ type: 'landed' })
                    state.shakeT = 0
                    state.sinceAttackMs = 0
                    enter(state, 'walk')
                }
                break
            case 'flinch':
                if (spend(BOSS.flinchMs)) enter(state, 'walk')
                break
        }
    }
    return events
}

/**
 * A hit of `amount` hit points (hammer or blast). Ignored while he flinches or
 * once he is dead. Returns the events: `{ type: 'hit', hp }`, then
 * `{ type: 'defeated' }` once, as he reaches 0.
 */
export function damageBoss(state, amount) {
    if (state.phase === 'dead' || state.invulnMs > 0) return []
    state.hp = Math.max(0, state.hp - amount)
    state.invulnMs = BOSS.flinchMs
    const events = [{ type: 'hit', hp: state.hp }]
    if (state.hp === 0) {
        events.push({ type: 'defeated' })
        enter(state, 'dead')
        return events
    }
    // A leap in the air carries on to its landing; any other attack is cut short.
    if (state.phase !== 'air') {
        state.sinceAttackMs = 0
        enter(state, 'flinch')
    }
    return events
}

/** Whether a Ground Pound landing hurts the King: only on the ground or a ledge, and not rising. */
export function quakeHits(king) {
    return Boolean(king.isGrounded && king.velocity.y >= 0 && !king.dead && !king.sinking)
}

/**
 * The screen's offset (px) for this frame: a decaying wobble for
 * BOSS.shake.ms after a landing, never more than BOSS.shake.maxPx; { 0, 0 }
 * otherwise. Looks only: no hitbox moves.
 */
export function shakeOffset(state) {
    if (state.shakeT == null) return { x: 0, y: 0 }
    const { ms, maxPx } = BOSS.shake
    const ease = 1 - state.shakeT / ms
    const amp = maxPx * ease
    return { x: amp * Math.sin(state.shakeT * 0.11), y: amp * Math.cos(state.shakeT * 0.17) }
}

/** Stops any screen shake (Restart Level, Quit to Title). */
export function stopShake(state) {
    state.shakeT = null
}

/** -1 (left), 0 or 1: which way he walks toward the King. */
export function walkDirection(x, kingX) {
    const gap = kingX - x
    return Math.abs(gap) <= BOSS.walkDeadZonePx ? 0 : Math.sign(gap)
}

/** The King Pig sheet to show: 'idle' | 'run' | 'attack' | 'ground' | 'jump' | 'fall' | 'hit' | 'dead'. */
export function bossAnimation(state, { walking = false, rising = false } = {}) {
    switch (state.phase) {
        case 'bombWarn':
        case 'bombDrop':
            return 'attack'
        case 'crouch':
            return 'ground'
        case 'air':
            return rising ? 'jump' : 'fall'
        case 'flinch':
            return 'hit'
        case 'dead':
            return state.t < BOSS.flinchMs ? 'hit' : 'dead'
        default:
            return walking ? 'run' : 'idle'
    }
}

/**
 * Advances the fight to the frame time `now` (ms, e.g. performance.now()) and
 * returns stepBoss()'s events. The first call after pauseBoss() only records the time.
 */
export function advanceBoss(state, now, ctx) {
    const dt = state.lastNow == null ? 0 : Math.min(BOSS.maxStepMs, Math.max(0, now - state.lastNow))
    state.lastNow = now
    return dt > 0 ? stepBoss(state, dt, ctx) : []
}

/** Call while the fight isn't stepped (Pause Menu, loading), so it resumes where it was. */
export function pauseBoss(state) {
    state.lastNow = null
}
