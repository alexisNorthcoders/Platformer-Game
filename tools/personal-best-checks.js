// Personal Best checks (#127). Run with the level driver:
//   node tools/play.mjs --level 1 --file tools/personal-best-checks.js
// Covers first, slower and faster clears through the Door, and that a death or
// Quit to Title saves nothing. Returns a report with `ok` per check.

const N = level
const report = {}
const realNow = performance.now.bind(performance)
let clock = 100000
performance.now = () => clock
const keyOf = n => `kings-and-pigs:ghost-run:level-${n}`
const stored = () => ghostRunStore.personalBest(N)

/** Fresh run of the level with an empty store; the clock starts at the timer. */
async function fresh() {
    localStorage.clear()
    await play(N)
    levelTransitioning = false
    clock += 1000
    levelTimer.start(clock)
}

/** Clears the level in `ms`: the Door opens, the King walks in. */
function clearIn(ms, { loseHeart = false } = {}) {
    if (loseHeart) player.loseHP()
    clock += ms
    doorClosed = false
    player.preventInput = false
    player.hitbox.position.x = doors[0].position.x + 2
    player.hitbox.position.y = doors[0].position.y + 2
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    return newBestFlash
}

try {
    await fresh()
    report.first = { flashed: clearIn(5000), best: stored() }
    report.first.ok = report.first.flashed === true && report.first.best === 5000
    report.persisted = { ok: JSON.parse(localStorage.getItem(keyOf(N))).timeMs === 5000 }

    await play(N)
    levelTimer.start(clock)
    report.hud = { ok: ghostRunStore.personalBest(N) === 5000 && newBestFlash === false }
    report.slower = { flashed: clearIn(7000), best: stored() }
    report.slower.ok = report.slower.flashed === false && report.slower.best === 5000

    await play(N)
    levelTimer.start(clock)
    report.faster = { flashed: clearIn(3000), best: stored() }
    report.faster.ok = report.faster.flashed === true && report.faster.best === 3000

    await fresh()
    report.hurt = { flashed: clearIn(4000, { loseHeart: true }), best: stored() }
    report.hurt.ok = report.hurt.flashed === true && report.hurt.best === 4000

    await fresh()
    clock += 2000
    while (!player.dead) player.loseHP()
    step(5)
    report.death = { best: stored(), ok: stored() === null }

    await fresh()
    clock += 2000
    const paused = handleEscapeMenu() && pauseMenuFromPlaying
    handlePauseMenuTarget('quit')
    report.quit = { paused, best: stored(), gameState, ok: paused && !pauseMenuFromPlaying && gameState === 'menu' && stored() === null }
} finally {
    performance.now = realNow
    localStorage.clear()
}

report.ok = Object.values(report).every(r => r.ok)
return report
