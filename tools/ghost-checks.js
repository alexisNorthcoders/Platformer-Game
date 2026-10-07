// Ghost King checks (#130). Run with the level driver:
//   node tools/play.mjs --level 1 --file tools/ghost-checks.js
// Records a run to the Door, then replays the level with the Ghost King: it must
// be drawn, vanish after its end, and leave the Pig and diamond counts as they
// are without it. Returns a report with `ok` per check.

const N = level
const report = {}
const realNow = performance.now.bind(performance)
let clock = 100000
performance.now = () => clock
const keyOf = n => `kings-and-pigs:ghost-run:level-${n}`

async function fresh() {
    const { createGhostRunStore } = await import('/kings-and-pigs/js/ghostRun.mjs')
    globalThis.ghostRunStore = createGhostRunStore(localStorage)
    await play(N)
    levelTransitioning = false
    clock += 1000
    levelTimer.start(clock)
}

/** Holds Right for `frames` frames of 16 ms each. */
function run(frames) {
    keys.d.pressed = true
    for (let i = 0; i < frames; i++) { clock += 16; step(1) }
    keys.d.pressed = false
}

/** Plays 120 frames of walking; returns the Pigs and diamonds it changed. */
function walk() {
    const before = { pigs: EnemyTracker.getEnemyCount(), diamonds: diamondCount } // play() carries counts over
    run(120)
    return { pigs: EnemyTracker.getEnemyCount() - before.pigs, diamonds: diamondCount - before.diamonds }
}

try {
    localStorage.clear()
    await fresh()
    const without = walk() // no record yet, so no ghost

    await fresh()
    run(60)
    clock += 16
    doorClosed = false
    player.preventInput = false
    player.hitbox.position.x = doors[0].position.x + 2
    player.hitbox.position.y = doors[0].position.y + 2
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    const raw = JSON.parse(localStorage.getItem(keyOf(N)))
    report.saved = { bytes: JSON.stringify(raw).length, ok: !!raw?.run?.d?.length && JSON.stringify(raw).length < 60000 }

    // With the ghost.
    await fresh()
    let drawn = 0
    const draw = c.drawImage.bind(c)
    c.drawImage = (...a) => { if (c.globalAlpha === 0.35) drawn++; return draw(...a) }
    const withGhost = walk()
    c.drawImage = draw
    report.drawn = { drawn, ok: drawn > 0 }

    // Past the end of the run the ghost is gone.
    clock += 60000
    step(1)
    let late = 0
    c.drawImage = (...a) => { if (c.globalAlpha === 0.35) late++; return draw(...a) }
    step(1)
    c.drawImage = draw
    report.gone = { late, ok: late === 0 }

    report.same = { withGhost, without, ok: JSON.stringify(withGhost) === JSON.stringify(without) }
} finally {
    performance.now = realNow
    localStorage.clear()
}

report.ok = Object.values(report).every(r => r.ok)
return report
