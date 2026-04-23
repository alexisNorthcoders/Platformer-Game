import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
    PIG_AI_STATES,
    isGroundedVerticalVelocity,
    isPigWanderEnemy,
    planBehavior,
    responseAfterLeftWallCollision,
    responseAfterRightWallCollision,
    syncSpriteFromHorizontalVelocity,
    wallSteerUntilFromNow,
    WALL_STEER_MS,
} from '../js/pigWanderAiCore.mjs'

test('isPigWanderEnemy: standard pig with walk speed', () => {
    assert.equal(isPigWanderEnemy({ enemyVariant: 'pig', pigWalkSpeed: 1 }), true)
})

test('isPigWanderEnemy: king and match are excluded (no wander fields)', () => {
    assert.equal(isPigWanderEnemy({ enemyVariant: 'king', pigWalkSpeed: undefined }), false)
    assert.equal(isPigWanderEnemy({ enemyVariant: 'match', pigWalkSpeed: undefined }), false)
})

test('isPigWanderEnemy: pig without pigWalkSpeed is excluded (guard for non-standard variants)', () => {
    assert.equal(isPigWanderEnemy({ enemyVariant: 'pig' }), false)
    assert.equal(isPigWanderEnemy({ enemyVariant: 'pig', pigWalkSpeed: NaN }), false)
})

test('planBehavior: over many decisions yields idle, both walks, and jumps (wandering variety)', () => {
    const kinds = new Set()
    let i = 0
    while (i < 400 && kinds.size < 4) {
        const r1 = (i % 97) / 97
        const r2 = (i % 89) / 89
        const r3 = (i % 83) / 83
        const p = planBehavior(r1, r2, r3, 1)
        kinds.add(p.kind === 'jump' ? 'jump' : p.aiMode)
        i++
    }
    assert.ok(kinds.has(PIG_AI_STATES.IDLE))
    assert.ok(kinds.has(PIG_AI_STATES.WALK_LEFT))
    assert.ok(kinds.has(PIG_AI_STATES.WALK_RIGHT))
    assert.ok(kinds.has('jump'))
})

test('wall bounce responses are opposite horizontal speeds (symmetric magnitudes)', () => {
    const speed = 1.25
    const leftHit = responseAfterLeftWallCollision(speed)
    const rightHit = responseAfterRightWallCollision(speed)
    assert.equal(leftHit.velocityX, speed)
    assert.equal(rightHit.velocityX, -speed)
    assert.equal(leftHit.velocityX, -rightHit.velocityX)
    assert.equal(leftHit.aiMode, PIG_AI_STATES.WALK_RIGHT)
    assert.equal(rightHit.aiMode, PIG_AI_STATES.WALK_LEFT)
})

test('wallSteerUntilFromNow is always in the future and bounded', () => {
    const now = 1_000_000
    const t0 = wallSteerUntilFromNow(now, 0)
    const t1 = wallSteerUntilFromNow(now, 1)
    assert.ok(t0 >= now + WALL_STEER_MS)
    assert.ok(t1 <= now + WALL_STEER_MS + 500 + 1e-6)
    assert.ok(t1 >= t0)
})

test('syncSpriteFromHorizontalVelocity: maps velocity to runLeft + flip or idle', () => {
    const m = syncSpriteFromHorizontalVelocity(0.5, 1)
    assert.equal(m.sprite, 'runLeft')
    assert.equal(m.flip, true)
    const idle = syncSpriteFromHorizontalVelocity(0, 1)
    assert.equal(idle.sprite, 'idle')
    assert.equal(idle.flip, false)
    assert.equal(idle.aiMode, PIG_AI_STATES.IDLE)
})

test('isGroundedVerticalVelocity matches Enemy threshold', () => {
    assert.equal(isGroundedVerticalVelocity(0), true)
    assert.equal(isGroundedVerticalVelocity(0.14), true)
    assert.equal(isGroundedVerticalVelocity(0.16), false)
})

test('non-regression: attack() only zeroes velocity.x for pig variant (source guard)', () => {
    const path = fileURLToPath(new URL('../js/classes/Enemy.js', import.meta.url))
    const src = readFileSync(path, 'utf8')
    assert.ok(
        /if\s*\(\s*this\.enemyVariant\s*===\s*['"]pig['"]\s*\)\s*this\.velocity\.x\s*=\s*0/.test(src),
        'Expected pig-only velocity clear in attack()'
    )
})

test('non-regression: match-specific attack early return unchanged', () => {
    const path = fileURLToPath(new URL('../js/classes/Enemy.js', import.meta.url))
    const src = readFileSync(path, 'utf8')
    assert.ok(
        /if\s*\(\s*this\.state\s*===\s*['"]matchOn['"]\s*\)\s*return/.test(src),
        'Expected matchOn guard at start of attack()'
    )
})
