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

function loadSprite() {
    const spritePath = fileURLToPath(new URL('../js/classes/Sprite.js', import.meta.url))
    const src = readFileSync(spritePath, 'utf8')
    return new Function(`${src}\nreturn Sprite`)()
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
