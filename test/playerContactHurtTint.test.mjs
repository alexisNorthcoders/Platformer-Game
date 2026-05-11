import assert from 'node:assert/strict'
import test from 'node:test'
import {
    PLAYER_CONTACT_HURT_TINT,
    applyPlayerContactHurtTint,
    clearPlayerHurtTint,
} from '../js/playerContactHurtTint.mjs'

test('PLAYER_CONTACT_HURT_TINT is the contact-damage sprite overlay', () => {
    assert.equal(PLAYER_CONTACT_HURT_TINT, 'rgba(255, 120, 145, 0.55)')
})

test('applyPlayerContactHurtTint sets hurtTint', () => {
    const player = { hurtTint: null }
    applyPlayerContactHurtTint(player)
    assert.equal(player.hurtTint, PLAYER_CONTACT_HURT_TINT)
})

test('clearPlayerHurtTint clears hurtTint (cooldown expiry / resets)', () => {
    const player = { hurtTint: PLAYER_CONTACT_HURT_TINT }
    clearPlayerHurtTint(player)
    assert.equal(player.hurtTint, null)
})

test('non-fatal damage keeps tint until cooldown cleanup; death clears it', () => {
    const surviving = { hurtTint: null, hitpoints: 2 }
    applyPlayerContactHurtTint(surviving)
    surviving.hitpoints -= 1
    assert.equal(surviving.hurtTint, PLAYER_CONTACT_HURT_TINT)

    const dying = { hurtTint: null, hitpoints: 1 }
    applyPlayerContactHurtTint(dying)
    dying.hitpoints -= 1
    if (!dying.hitpoints) clearPlayerHurtTint(dying)
    assert.equal(dying.hurtTint, null)
})
