/**
 * Regression (#56): when an animation's onComplete starts a follow-up animation,
 * Sprite.updateFrames must mark the animation that just ended as finished, not
 * the follow-up. Otherwise the follow-up's onComplete never fires (Hello bubble
 * stuck after "Hello Out").
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

function readClass(name) {
    return readFileSync(fileURLToPath(new URL(`../js/classes/${name}.js`, import.meta.url)), 'utf8')
}

function loadSprite() {
    return new Function(`${readClass('Sprite')}\nreturn Sprite`)()
}

function loadEnemy() {
    return new Function(`${readClass('Sprite')}\n${readClass('Enemy')}\nreturn Enemy`)()
}

function makeSprite(Sprite) {
    const s = Object.create(Sprite.prototype)
    s.autoplay = true
    s.loop = false
    s.runOnce = false
    s.elapsedFrames = 0
    s.frameBuffer = 1
    s.frameRate = 3
    s.currentFrame = 0
    return s
}

function tick(sprite, times) {
    for (let i = 0; i < times; i++) sprite.updateFrames()
}

function start(sprite, animation) {
    sprite.currentFrame = 0
    sprite.currentAnimation = animation
}

test('chained animations each fire their onComplete exactly once', () => {
    const Sprite = loadSprite()
    const s = makeSprite(Sprite)
    const calls = { first: 0, second: 0 }

    const second = { onComplete: () => { calls.second++ } }
    const first = {
        onComplete: () => {
            calls.first++
            start(s, second)
        },
    }
    start(s, first)

    tick(s, 20)

    assert.deepEqual(calls, { first: 1, second: 1 })
})

test('a shared animation replayed after reset fires onComplete each time', () => {
    const Sprite = loadSprite()
    const s = makeSprite(Sprite)
    const idle = {}
    let completions = 0
    const attack = {
        onComplete: () => {
            completions++
            start(s, idle)
        },
    }

    for (let i = 0; i < 2; i++) {
        attack.isActive = false
        start(s, attack)
        tick(s, 20)
    }

    assert.equal(completions, 2)
})

test('a pig attacks several times in a row and returns to idle after each', () => {
    const Enemy = loadEnemy()
    const pig = Object.create(Enemy.prototype)
    Object.assign(pig, {
        enemyVariant: 'pig', hitpoints: 2, playerHit: false, attacking: false,
        velocity: { x: 0, y: 0 }, autoplay: true, runOnce: false, elapsedFrames: 0,
        currentFrame: 0,
    })
    pig.animations = {
        idle: { image: {}, frameRate: 11, frameBuffer: 1, loop: true },
        attack: { image: {}, frameRate: 5, frameBuffer: 1, loop: false },
    }
    pig.switchSprite('idle')

    for (let swing = 1; swing <= 3; swing++) {
        pig.attack()
        assert.equal(pig.currentAnimation, pig.animations.attack, `swing ${swing} starts`)
        tick(pig, 20)
        assert.equal(pig.attacking, false, `swing ${swing} finishes`)
        assert.equal(pig.currentAnimation, pig.animations.idle, `swing ${swing} back to idle`)
    }
})
