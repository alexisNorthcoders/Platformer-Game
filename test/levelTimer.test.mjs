import assert from 'node:assert/strict'
import test from 'node:test'
import { createLevelTimer, formatLevelTime } from '../js/levelTimer.mjs'

test('formatLevelTime renders MM:SS:CC (minutes, seconds, hundredths)', () => {
    assert.equal(formatLevelTime(0), '00:00:00')
    assert.equal(formatLevelTime(1234), '00:01:23')
    assert.equal(formatLevelTime(61_990), '01:01:99')
    assert.equal(formatLevelTime(10 * 60_000 + 5_050), '10:05:05')
})

test('formatLevelTime keeps counting minutes past 99 and clamps negatives', () => {
    assert.equal(formatLevelTime(100 * 60_000), '100:00:00')
    assert.equal(formatLevelTime(-50), '00:00:00')
})

test('a fresh timer reads 0 and does not count until started', () => {
    const t = createLevelTimer()
    assert.equal(t.elapsed(5_000), 0)
    assert.equal(t.isRunning(), false)
})

test('start counts from 0 at the given time', () => {
    const t = createLevelTimer()
    t.start(1_000)
    assert.equal(t.isRunning(), true)
    assert.equal(t.elapsed(1_000), 0)
    assert.equal(t.elapsed(3_500), 2_500)
})

test('stop (entering the door) freezes the time', () => {
    const t = createLevelTimer()
    t.start(0)
    t.stop(4_200)
    assert.equal(t.isRunning(), false)
    assert.equal(t.elapsed(9_999), 4_200)
    t.stop(12_000)
    assert.equal(t.elapsed(20_000), 4_200)
})

test('starting again (new level) resets to 0', () => {
    const t = createLevelTimer()
    t.start(0)
    t.stop(4_200)
    t.start(10_000)
    assert.equal(t.elapsed(10_000), 0)
    assert.equal(t.elapsed(10_750), 750)
})

test('pause/resume excludes time spent paused (Escape menu)', () => {
    const t = createLevelTimer()
    t.start(0)
    t.pause(1_000)
    assert.equal(t.elapsed(5_000), 1_000)
    t.resume(5_000)
    assert.equal(t.elapsed(6_000), 2_000)
})

test('resume without a prior pause does nothing; resume after stop stays stopped', () => {
    const t = createLevelTimer()
    t.start(0)
    t.resume(500)
    assert.equal(t.elapsed(1_000), 1_000)
    t.stop(1_000)
    t.resume(2_000)
    assert.equal(t.isRunning(), false)
    assert.equal(t.elapsed(3_000), 1_000)
})

test('pause after stop does not un-freeze or change the time', () => {
    const t = createLevelTimer()
    t.start(0)
    t.stop(800)
    t.pause(900)
    t.resume(2_000)
    assert.equal(t.elapsed(3_000), 800)
})

test('reset returns to 0 and idle (level loading, before control is handed over)', () => {
    const t = createLevelTimer()
    t.start(0)
    t.stop(4_200)
    t.reset()
    assert.equal(t.isRunning(), false)
    assert.equal(t.elapsed(9_000), 0)
})
