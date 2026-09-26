import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

function createCanvas2dLikeMock() {
    const defaults = () => ({
        globalCompositeOperation: 'source-over',
        globalAlpha: 1,
    })
    let state = defaults()
    const stack = []
    const mock = {
        fillRectCalls: [],
        saveCalls: 0,
        restoreCalls: 0,
        save() {
            this.saveCalls++
            stack.push({ ...state })
        },
        restore() {
            this.restoreCalls++
            const popped = stack.pop()
            state = popped || defaults()
        },
        scale() {},
        get globalCompositeOperation() {
            return state.globalCompositeOperation
        },
        set globalCompositeOperation(v) {
            state.globalCompositeOperation = v
        },
        get globalAlpha() {
            return state.globalAlpha
        },
        set globalAlpha(v) {
            state.globalAlpha = v
        },
        fillStyle: '',
        drawImage() {},
        fillRect(dx, dy, dw, dh) {
            this.fillRectCalls.push([dx, dy, dw, dh])
        },
    }
    return mock
}

function loadSpriteWithCanvas(c) {
    const spritePath = fileURLToPath(new URL('../js/classes/Sprite.js', import.meta.url))
    const src = readFileSync(spritePath, 'utf8')
    return new Function('_c', `const c = _c;\n${src}\nreturn Sprite`)(c)
}

test('Sprite.draw nests hurt tint in save/restore so composite resets', () => {
    const mockC = createCanvas2dLikeMock()
    const Sprite = loadSpriteWithCanvas(mockC)
    const s = Object.create(Sprite.prototype)
    s.loaded = true
    s.opacity = 1
    s.image = {
        complete: true,
        naturalWidth: 320,
        naturalHeight: 64,
        width: 320,
        height: 64,
    }
    s.position = { x: 10, y: 20 }
    s.frameRate = 8
    s.height = s.image.naturalHeight
    s.currentFrame = 0
    s.hurtTint = 'rgba(255, 120, 145, 0.55)'
    s.flip = false
    s.updateFrames = () => {}

    Sprite.prototype.draw.call(s, 2)

    assert.equal(mockC.globalCompositeOperation, 'source-over')
    assert.deepEqual(mockC.fillRectCalls, [[10, 20, (320 / 8) * 2, s.height * 2]])
})

test('Sprite.draw flipped hurt tint aligns with flipped draw destination x', () => {
    const mockC = createCanvas2dLikeMock()
    const Sprite = loadSpriteWithCanvas(mockC)
    const s = Object.create(Sprite.prototype)
    s.loaded = true
    s.opacity = 1
    const frameRate = 4
    s.image = {
        complete: true,
        naturalWidth: 400,
        naturalHeight: 50,
        width: 400,
        height: 50,
    }
    const naturalWPerFrame = 400 / frameRate
    s.position = { x: 100, y: 5 }
    s.frameRate = frameRate
    s.height = s.image.naturalHeight
    s.currentFrame = 0
    s.hurtTint = 'rgba(255, 0, 0, 0.4)'
    s.flip = true
    s.updateFrames = () => {}

    const scale = 1.5
    Sprite.prototype.draw.call(s, scale)
    const expectedX = -s.position.x - naturalWPerFrame * scale
    assert.deepEqual(mockC.fillRectCalls, [
        [expectedX, s.position.y, naturalWPerFrame * scale, s.height * scale],
    ])
})
