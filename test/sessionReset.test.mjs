import assert from 'node:assert/strict'
import test from 'node:test'
import { PLAYER_CONTACT_HURT_TINT } from '../js/playerContactHurtTint.mjs'
import { clearHeldInputKeys, onHeldInputKeysCleared, resetPlayerForNewLevelRun } from '../js/sessionReset.mjs'

test('clearHeldInputKeys clears every .pressed entry on the keys bag', () => {
    const keys = {
        w: { pressed: true },
        a: { pressed: true },
        d: { pressed: false },
        space: { pressed: true },
        future: { pressed: true },
    }
    clearHeldInputKeys(keys)
    assert.equal(keys.w.pressed, false)
    assert.equal(keys.a.pressed, false)
    assert.equal(keys.d.pressed, false)
    assert.equal(keys.space.pressed, false)
    assert.equal(keys.future.pressed, false)
})

test('clearHeldInputKeys also runs every registered listener (e.g. touch controller reset)', () => {
    const calls = []
    const offA = onHeldInputKeysCleared(() => calls.push('a'))
    const offB = onHeldInputKeysCleared(() => calls.push('b'))
    clearHeldInputKeys({ w: { pressed: true } })
    assert.deepEqual(calls, ['a', 'b'])
    offA()
    offB()
    clearHeldInputKeys({})
    assert.deepEqual(calls, ['a', 'b'], 'unsubscribed listeners are not called')
})

test('resetPlayerForNewLevelRun clears run/combat/death state', () => {
    let cleared = false
    const player = {
        velocity: { x: 4, y: -3 },
        action: true,
        attacking: true,
        canAttack: false,
        canDropBomb: false,
        running: true,
        hitCooldown: true,
        hurtTint: PLAYER_CONTACT_HURT_TINT,
        hurtTintStartTime: 1234,
        canJump: false,
        dead: true,
        gameOver: true,
        gameOverAt: 1234,
        deathAnimationDone: true,
        diedOutOfSight: true,
        isShowingHello: true,
        _restarting: true,
        hitpoints: 0,
        contactDamageTimeoutId: setTimeout(() => {}, 9999),
    }
    const prevId = player.contactDamageTimeoutId
    resetPlayerForNewLevelRun(player)
    assert.equal(player.velocity.x, 0)
    assert.equal(player.velocity.y, 0)
    assert.equal(player.action, false)
    assert.equal(player.attacking, false)
    assert.equal(player.canAttack, true)
    assert.equal(player.canDropBomb, true)
    assert.equal(player.running, false)
    assert.equal(player.hitCooldown, false)
    assert.equal(player.hurtTint, null)
    assert.equal(player.hurtTintStartTime, null)
    assert.equal(player.canJump, true)
    assert.equal(player.dead, false)
    assert.equal(player.gameOver, false)
    assert.equal(player.gameOverAt, null)
    assert.equal(player.deathAnimationDone, false)
    assert.equal(player.diedOutOfSight, false)
    assert.equal(player.isShowingHello, false)
    assert.equal(player._restarting, false)
    assert.equal(player.hitpoints, 3)
    assert.equal(player.contactDamageTimeoutId, null)
    clearTimeout(prevId)
})
