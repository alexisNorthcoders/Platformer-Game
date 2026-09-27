import assert from 'node:assert/strict'
import test from 'node:test'
import {
    BOMB,
    advanceBombs,
    bombDrawList,
    createBombState,
    pauseBombs,
    stepBombs,
    tryDropBomb,
} from '../js/bomb.mjs'
import { BOMB_SHEETS, SPRITE_SCALE, spriteDrawRect } from '../js/spriteAnimation.mjs'

const FEET = { x: 300, y: 400 }

/** Steps `state` for `ms` in `step`ms steps and returns every event emitted. */
function run(state, ms, step = 10) {
    const events = []
    for (let t = 0; t < ms; t += step) events.push(...stepBombs(state, step))
    return events
}

function explosions(events) {
    return events.filter(e => e.type === 'explosion')
}

test('fuse is Bomb On ×4 frames played 3 times at 100ms per frame; boom is the 6-frame Boooooom', () => {
    assert.equal(BOMB.fuseMs, 1200)
    assert.equal(BOMB.boomMs, 600)
})

test('a drop places a Bomb with its base on the given feet position', () => {
    const state = createBombState()
    assert.equal(tryDropBomb(state, FEET), true)
    const [sprite] = bombDrawList(state)
    assert.deepEqual(sprite, { sheet: 'bombOn', ...spriteDrawRect(BOMB_SHEETS.bombOn, 0, 300, 400, false) })
})

test('an empty state draws nothing', () => {
    assert.deepEqual(bombDrawList(createBombState()), [])
})

test('only one Bomb can be live: a second drop is refused and changes nothing', () => {
    const state = createBombState()
    tryDropBomb(state, FEET)
    stepBombs(state, 500)
    assert.equal(tryDropBomb(state, { x: 900, y: 100 }), false)
    const list = bombDrawList(state)
    assert.equal(list.length, 1)
    assert.deepEqual(list[0], { sheet: 'bombOn', ...spriteDrawRect(BOMB_SHEETS.bombOn, 1, 300, 400, false) })
})

test('a drop is refused through the boom and allowed again once the Bomb has gone', () => {
    const state = createBombState()
    tryDropBomb(state, FEET)
    stepBombs(state, 1200)
    assert.equal(tryDropBomb(state, FEET), false, 'still exploding')
    stepBombs(state, 599)
    assert.equal(tryDropBomb(state, FEET), false, 'last boom frame')
    stepBombs(state, 1)
    assert.deepEqual(bombDrawList(state), [])
    assert.equal(tryDropBomb(state, { x: 50, y: 60 }), true)
    assert.equal(bombDrawList(state)[0].sheet, 'bombOn')
})

test('the fuse lasts exactly 1.2s: no explosion at 1199ms, one at 1200ms', () => {
    const state = createBombState()
    tryDropBomb(state, FEET)
    assert.deepEqual(explosions(run(state, 1190)), [])
    assert.deepEqual(explosions(stepBombs(state, 9)), [])
    assert.equal(bombDrawList(state)[0].sheet, 'bombOn')
    assert.equal(explosions(stepBombs(state, 1)).length, 1)
    assert.equal(bombDrawList(state)[0].sheet, 'boom')
})

test('the explosion event fires exactly once and carries the 52×56 blast rect centred on the base', () => {
    const state = createBombState()
    tryDropBomb(state, FEET)
    const events = explosions(run(state, 3000, 16))
    assert.equal(events.length, 1)
    const s = SPRITE_SCALE
    assert.deepEqual(events[0], {
        type: 'explosion',
        rect: {
            position: { x: 300 - 26 * s, y: 400 - 39 * s },
            width: 52 * s,
            height: 56 * s,
        },
    })
})

test('one large step across the whole fuse still explodes once and carries the overshoot into the boom', () => {
    const state = createBombState()
    tryDropBomb(state, FEET)
    assert.equal(explosions(stepBombs(state, 1350)).length, 1)
    const [sprite] = bombDrawList(state)
    assert.deepEqual(sprite, { sheet: 'boom', ...spriteDrawRect(BOMB_SHEETS.boom, 1, 300, 400, false) })
})

test('draw list: Bomb On loops through its 4 frames during the fuse', () => {
    const state = createBombState()
    tryDropBomb(state, FEET)
    const frames = []
    for (let t = 0; t < 1200; t += 100) {
        frames.push(bombDrawList(state)[0].sx / BOMB_SHEETS.bombOn.w)
        stepBombs(state, 100)
    }
    assert.deepEqual(frames, [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3])
})

test('draw list: Boooooom plays its 6 frames once, then the Bomb is gone', () => {
    const state = createBombState()
    tryDropBomb(state, FEET)
    stepBombs(state, 1200)
    const frames = []
    for (let t = 0; t < 600; t += 100) {
        const [sprite] = bombDrawList(state)
        assert.equal(sprite.sheet, 'boom')
        assert.equal(sprite.src, BOMB_SHEETS.boom.src)
        frames.push(sprite.sx / BOMB_SHEETS.boom.w)
        stepBombs(state, 100)
    }
    assert.deepEqual(frames, [0, 1, 2, 3, 4, 5])
    assert.deepEqual(bombDrawList(state), [])
})

test('advanceBombs steps by the frame time; after pauseBombs the next frame only records the time', () => {
    const state = createBombState()
    tryDropBomb(state, FEET)
    advanceBombs(state, 1000)
    advanceBombs(state, 1100)
    assert.equal(bombDrawList(state)[0].sx, BOMB_SHEETS.bombOn.w, '100ms in: frame 1')

    pauseBombs(state)
    advanceBombs(state, 60_000) // resumed a minute later
    assert.equal(bombDrawList(state)[0].sx, BOMB_SHEETS.bombOn.w, 'frozen while paused')

    const events = []
    for (let now = 60_000; now < 61_100; now += 50) events.push(...advanceBombs(state, now + 50))
    assert.equal(explosions(events).length, 1, 'the remaining 1100ms of fuse burn after resuming')
})

test('advanceBombs caps a long frame gap so a hitch cannot skip the fuse', () => {
    const state = createBombState()
    tryDropBomb(state, FEET)
    advanceBombs(state, 0)
    assert.deepEqual(explosions(advanceBombs(state, 5000)), [])
    assert.equal(bombDrawList(state)[0].sheet, 'bombOn')
})
