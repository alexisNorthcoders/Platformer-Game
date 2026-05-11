import assert from 'node:assert/strict'
import test from 'node:test'
import { clearHeldInputKeys, resetPlayerForNewLevelRun } from '../js/sessionReset.mjs'

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

test('resetPlayerForNewLevelRun clears run/combat/death state', () => {
    let cleared = false
    const player = {
        velocity: { x: 4, y: -3 },
        action: true,
        attacking: true,
        canAttack: false,
        running: true,
        hitCooldown: true,
        hurtTint: 'rgba(255, 0, 0, 0.5)',
        canJump: false,
        dead: true,
        gameOver: true,
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
    assert.equal(player.running, false)
    assert.equal(player.hitCooldown, false)
    assert.equal(player.hurtTint, null)
    assert.equal(player.canJump, true)
    assert.equal(player.dead, false)
    assert.equal(player.gameOver, false)
    assert.equal(player.isShowingHello, false)
    assert.equal(player._restarting, false)
    assert.equal(player.hitpoints, 3)
    assert.equal(player.contactDamageTimeoutId, null)
    clearTimeout(prevId)
})
