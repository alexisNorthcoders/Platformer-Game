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
        calls: [],
        fillRectCalls: [],
        drawImageCalls: [],
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
            this.calls.push(['globalCompositeOperation', v])
        },
        get globalAlpha() {
            return state.globalAlpha
        },
        set globalAlpha(v) {
            state.globalAlpha = v
        },
        fillStyle: '',
        clearRect(...args) {
            this.calls.push(['clearRect', ...args])
        },
        drawImage(...args) {
            this.drawImageCalls.push(args)
            this.calls.push(['drawImage', ...args])
        },
        fillRect(...args) {
            this.fillRectCalls.push(args)
            this.calls.push(['fillRect', this.globalCompositeOperation, this.fillStyle, ...args])
        },
    }
    return mock
}

function createDocumentMock() {
    const canvases = []
    return {
        canvases,
        createElement(tag) {
            assert.equal(tag, 'canvas')
            const ctx = createCanvas2dLikeMock()
            const canvas = { width: 0, height: 0, getContext: () => ctx, ctx }
            canvases.push(canvas)
            return canvas
        },
    }
}

function loadSpriteWithCanvas(c, document = createDocumentMock()) {
    const spritePath = fileURLToPath(new URL('../js/classes/Sprite.js', import.meta.url))
    const src = readFileSync(spritePath, 'utf8')
    return new Function('_c', 'document', `const c = _c;\n${src}\nreturn Sprite`)(c, document)
}

function makeSprite(Sprite, { naturalWidth, naturalHeight, frameRate, position, hurtTint, flip, currentFrame = 0 }) {
    const s = Object.create(Sprite.prototype)
    s.loaded = true
    s.opacity = 1
    s.image = {
        complete: true,
        naturalWidth,
        naturalHeight,
        width: naturalWidth,
        height: naturalHeight,
    }
    s.position = position
    s.frameRate = frameRate
    s.height = naturalHeight
    s.currentFrame = currentFrame
    s.hurtTint = hurtTint
    s.flip = flip
    s.updateFrames = () => {}
    return s
}

test('Sprite.draw tints the frame off-screen and draws no tint rectangle on the main canvas', () => {
    const mockC = createCanvas2dLikeMock()
    const doc = createDocumentMock()
    const Sprite = loadSpriteWithCanvas(mockC, doc)
    const tint = 'rgba(255, 120, 145, 0.55)'
    const s = makeSprite(Sprite, {
        naturalWidth: 320,
        naturalHeight: 64,
        frameRate: 8,
        position: { x: 10, y: 20 },
        hurtTint: tint,
        flip: false,
        currentFrame: 2,
    })

    Sprite.prototype.draw.call(s, 2)

    assert.equal(doc.canvases.length, 1)
    const off = doc.canvases[0]
    assert.equal(off.width, 40)
    assert.equal(off.height, 64)
    assert.deepEqual(off.ctx.calls, [
        ['clearRect', 0, 0, 40, 64],
        ['drawImage', s.image, 80, 0, 40, 64, 0, 0, 40, 64],
        ['globalCompositeOperation', 'source-atop'],
        ['fillRect', 'source-atop', tint, 0, 0, 40, 64],
        ['globalCompositeOperation', 'source-over'],
    ])

    assert.deepEqual(mockC.fillRectCalls, [])
    assert.ok(!mockC.calls.some(([k]) => k === 'globalCompositeOperation'))
    assert.equal(mockC.globalCompositeOperation, 'source-over')
    assert.deepEqual(mockC.drawImageCalls, [[off, 0, 0, 40, 64, 10, 20, 80, 128]])
})

test('Sprite.draw flipped hurt tint lands at the flipped destination x', () => {
    const mockC = createCanvas2dLikeMock()
    const doc = createDocumentMock()
    const Sprite = loadSpriteWithCanvas(mockC, doc)
    const s = makeSprite(Sprite, {
        naturalWidth: 400,
        naturalHeight: 50,
        frameRate: 4,
        position: { x: 100, y: 5 },
        hurtTint: 'rgba(255, 0, 0, 0.4)',
        flip: true,
    })

    const scale = 1.5
    Sprite.prototype.draw.call(s, scale)

    const frameW = 400 / 4
    const frameH = 50
    const expectedX = -s.position.x - frameW * scale
    const off = doc.canvases[0]
    assert.deepEqual(mockC.fillRectCalls, [])
    assert.equal(mockC.globalCompositeOperation, 'source-over')
    assert.deepEqual(off.ctx.fillRectCalls, [[0, 0, frameW, frameH]])
    assert.deepEqual(mockC.drawImageCalls, [
        [off, 0, 0, frameW, frameH, expectedX, s.position.y, frameW * scale, frameH * scale],
    ])
})

test('Sprite.draw reuses one off-screen canvas across tinted draws', () => {
    const mockC = createCanvas2dLikeMock()
    const doc = createDocumentMock()
    const Sprite = loadSpriteWithCanvas(mockC, doc)
    const opts = {
        naturalWidth: 320,
        naturalHeight: 64,
        frameRate: 8,
        position: { x: 0, y: 0 },
        hurtTint: 'red',
        flip: false,
    }
    Sprite.prototype.draw.call(makeSprite(Sprite, opts), 1)
    Sprite.prototype.draw.call(makeSprite(Sprite, opts), 1)

    assert.equal(doc.canvases.length, 1)
})

test('Sprite.draw without hurt tint draws the image straight to the main canvas', () => {
    const mockC = createCanvas2dLikeMock()
    const doc = createDocumentMock()
    const Sprite = loadSpriteWithCanvas(mockC, doc)
    const s = makeSprite(Sprite, {
        naturalWidth: 320,
        naturalHeight: 64,
        frameRate: 8,
        position: { x: 10, y: 20 },
        hurtTint: null,
        flip: false,
        currentFrame: 1,
    })

    Sprite.prototype.draw.call(s, 2)

    assert.equal(doc.canvases.length, 0)
    assert.deepEqual(mockC.fillRectCalls, [])
    assert.deepEqual(mockC.drawImageCalls, [[s.image, 40, 0, 40, 64, 10, 20, 80, 128]])
})
