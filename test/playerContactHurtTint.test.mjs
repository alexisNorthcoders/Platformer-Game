import assert from 'node:assert/strict'
import test from 'node:test'
import {
    PLAYER_CONTACT_HURT_TINT,
    HURT_TINT_FLASH_INTERVAL_MS,
    applyPlayerContactHurtTint,
    clearPlayerHurtTint,
    isHurtTintFlashOn,
    playerHurtTintAt,
} from '../js/playerContactHurtTint.mjs'

test('PLAYER_CONTACT_HURT_TINT is the contact-damage sprite overlay', () => {
    assert.equal(PLAYER_CONTACT_HURT_TINT, 'rgba(255, 40, 40, 0.7)')
})

test('flash interval is 100ms', () => {
    assert.equal(HURT_TINT_FLASH_INTERVAL_MS, 100)
})

test('isHurtTintFlashOn: on at 0ms, off at 100ms, on at 200ms', () => {
    const start = 5000
    assert.equal(isHurtTintFlashOn(start, start), true)
    assert.equal(isHurtTintFlashOn(start, start + 99), true)
    assert.equal(isHurtTintFlashOn(start, start + 100), false)
    assert.equal(isHurtTintFlashOn(start, start + 199), false)
    assert.equal(isHurtTintFlashOn(start, start + 200), true)
    assert.equal(isHurtTintFlashOn(start, start + 800), true)
    assert.equal(isHurtTintFlashOn(start, start + 900), false)
})

test('applyPlayerContactHurtTint sets hurtTint and the hit start time', () => {
    const player = { hurtTint: null, hurtTintStartTime: null }
    applyPlayerContactHurtTint(player, 1234)
    assert.equal(player.hurtTint, PLAYER_CONTACT_HURT_TINT)
    assert.equal(player.hurtTintStartTime, 1234)
})

test('clearPlayerHurtTint clears hurtTint and the start time (cooldown expiry / resets)', () => {
    const player = { hurtTint: PLAYER_CONTACT_HURT_TINT, hurtTintStartTime: 1234 }
    clearPlayerHurtTint(player)
    assert.equal(player.hurtTint, null)
    assert.equal(player.hurtTintStartTime, null)
})

test('playerHurtTintAt flashes the tint from the hit start time', () => {
    const player = {}
    applyPlayerContactHurtTint(player, 1000)
    assert.equal(playerHurtTintAt(player, 1000), PLAYER_CONTACT_HURT_TINT)
    assert.equal(playerHurtTintAt(player, 1100), null)
    assert.equal(playerHurtTintAt(player, 1200), PLAYER_CONTACT_HURT_TINT)
})

test('playerHurtTintAt is null once the tint is cleared', () => {
    const player = {}
    applyPlayerContactHurtTint(player, 1000)
    clearPlayerHurtTint(player)
    assert.equal(playerHurtTintAt(player, 1000), null)
    assert.equal(playerHurtTintAt(player, 1200), null)
})

test('non-fatal damage keeps tint until cooldown cleanup; death clears it', () => {
    const surviving = { hurtTint: null, hitpoints: 2 }
    applyPlayerContactHurtTint(surviving, 0)
    surviving.hitpoints -= 1
    assert.equal(surviving.hurtTint, PLAYER_CONTACT_HURT_TINT)

    const dying = { hurtTint: null, hitpoints: 1 }
    applyPlayerContactHurtTint(dying, 0)
    dying.hitpoints -= 1
    if (!dying.hitpoints) clearPlayerHurtTint(dying)
    assert.equal(dying.hurtTint, null)
    assert.equal(dying.hurtTintStartTime, null)
})
