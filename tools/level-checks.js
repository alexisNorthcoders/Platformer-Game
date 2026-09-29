// The new-level skill's browser checks, for any open-air level. Run with the
// level driver:  node tools/play.mjs --level N --file tools/level-checks.js
// Evaluated in the page as the body of an async function (see tools/play.mjs);
// it restarts the level between checks and returns a report with `ok` per check.

const N = level
const FEET = 87 // the King's feet are 87 px below his position (hitbox + 34, 53 tall)
const report = { level: N }
const solid = () => collisionBlocks.filter(block => block.type !== 'platform')

/** The first stretch of pit (no wall at any height) before `beforeX`, or null. */
function pitX(beforeX) {
    for (let x = 64; x < beforeX; x += 16) {
        const clear = xx => !solid().some(b => xx >= b.position.x && xx <= b.position.x + b.width)
        if (clear(x) && clear(x + 90)) return x
    }
    return null
}

// 1. A fall into the pit costs one heart and puts the King back at the start
//    (run first: placing him on checkpoints moves the respawn point on).
await play(N)
{
    const start = levels[N].playerPosition
    const x = pitX(levels[N].checkpoints?.[0]?.x ?? mapWidth)
    const hearts = player.hitpoints
    player.setPosition({ x: x - 35, y: 300 })
    let respawned = false
    for (let i = 0; i < 240 && !respawned; i++) {
        step(1)
        respawned = player.hitpoints < hearts
    }
    step(2)
    report.fall = {
        ok: respawned && player.hitpoints === hearts - 1 && Math.abs(player.position.x - start.x) < 1,
        pitX: x, heartsBefore: hearts, heartsAfter: player.hitpoints, at: { ...player.position },
    }
}

// 2. Every Pig and King Pig is still on its island after 900 frames.
await play(N)
{
    const pigs = [...enemies, ...enemyKing].map(pig => ({ pig, x: pig.position.x, y: pig.position.y }))
    step(900)
    const moved = pigs
        .map(({ pig, x, y }) => ({ from: { x, y }, to: { ...pig.position }, fell: pig.position.y > y + 40 }))
        .filter(p => p.fell)
    report.pigs = { ok: moved.length === 0, count: pigs.length, fell: moved }
}

// 3. The King rides every Moving Platform (Rotating Platform planks too):
//    feet gap about 0, and carried along with it.
await play(N)
report.rides = { ok: true, platforms: [] }
for (const [i, platform] of movingPlatforms.entries()) {
    const surface = platform.surface()
    player.setPosition({ x: surface.x + 100 - 62, y: surface.y - FEET - 0.01 })
    player.velocity.x = 0
    player.velocity.y = 0
    const offset = player.position.x - platform.state.x
    const heartsBefore = player.hitpoints
    step(100)
    const gap = player.position.y + FEET - platform.state.y
    const drift = player.position.x - platform.state.x - offset
    const ok = Math.abs(gap) < 1 && Math.abs(drift) < 2
    report.rides.platforms.push({ i, ok, gap: +gap.toFixed(3), drift: +drift.toFixed(3), lostHeart: player.hitpoints < heartsBefore })
    if (!ok) report.rides.ok = false
    player.hitpoints = heartsBefore
}

// 3b. Each Helix Platform: the King stands on its hub for a whole turn, and
//     one standing out at a blade's tip drops once the blades turn in.
await play(N)
report.helix = { ok: true, platforms: [] }
for (const [i, platform] of helixPlatforms.entries()) {
    const { center, periodFrames } = platform.state.path
    const heartsBefore = player.hitpoints
    player.setPosition({ x: center.x - 62, y: center.y - FEET - 0.01 })
    player.velocity.x = 0
    player.velocity.y = 0
    let worstGap = 0
    for (let f = 0; f < periodFrames; f++) {
        step(1)
        worstGap = Math.max(worstGap, Math.abs(player.position.y + FEET - center.y))
    }
    const onHub = worstGap < 1
    // Out near the tip (clear of the landing) while the blades point across,
    // then give them a quarter turn.
    while (platform.state.width < 2 * platform.state.path.radius - 2) step(1)
    player.setPosition({ x: platform.state.x + platform.state.width - 120, y: center.y - FEET - 0.01 })
    player.velocity.y = 0
    let dropped = false
    for (let f = 0; f < periodFrames / 4 && !dropped; f++) {
        step(1)
        dropped = player.position.y + FEET > center.y + 20 || player.hitpoints < heartsBefore
    }
    const ok = onHub && dropped
    report.helix.platforms.push({ i, ok, worstGap: +worstGap.toFixed(3), dropped })
    if (!ok) report.helix.ok = false
    player.hitpoints = heartsBefore
    respawnKing()
}

// 3c. Each Crumbling Shelf: rising up through it does not start the countdown;
//     landing does, and it runs 2 s from the landing even after he hops off;
//     it drops, comes back about 3 s later, and is whole after a respawn.
await play(N)
report.crumbling = { ok: true, shelves: [] }
for (const [i, shelf] of crumblingShelves.entries()) {
    const { x, y } = shelf.surface()
    const away = { ...levels[N].playerPosition }
    const heartsBefore = player.hitpoints
    const phase = () => shelf.state.phase
    // Rising through from just below it.
    player.setPosition({ x: x + 4 - 35, y: y + 30 - FEET })
    player.velocity.x = 0
    player.velocity.y = -6
    step(2)
    const risingCounts = phase() !== 'whole'
    // Landing on top, then off at once to somewhere safe.
    player.setPosition({ x: x + 4 - 35, y: y - FEET - 0.01 })
    player.velocity.y = 0
    step(1)
    const landed = phase() === 'shaking'
    player.setPosition(away)
    player.velocity.x = 0
    player.velocity.y = 0
    step(118)
    const stillShaking = phase() === 'shaking'
    step(1)
    const dropped = phase() === 'falling'
    let fallFrames = 0
    while (phase() === 'falling' && fallFrames < 600) { step(1); fallFrames++ }
    const gone = phase() === 'gone' && !crumblingShelves[i].collisionBlocks.some(b => b.position.y < canvas.height)
    step(179)
    const notYet = phase() === 'gone'
    step(1)
    const back = phase() === 'whole' && shelf.state.y === y
    // A second crumble, cut short by a respawn: whole and still at once.
    player.setPosition({ x: x + 4 - 35, y: y - FEET - 0.01 })
    player.velocity.y = 0
    step(60)
    respawnKing()
    const reset = phase() === 'whole' && shelf.state.y === y && shelf.collisionBlocks[0].position.y === y
    const countdownCleared = shelf.state.frame === 0 && shelf.state.vy === 0
    // Landing again starts a fresh 2 s countdown from zero, not the 60 frames left over.
    player.setPosition({ x: x + 4 - 35, y: y - FEET - 0.01 })
    player.velocity.y = 0
    step(1)
    const relanded = phase() === 'shaking' && shelf.state.frame === 1
    player.setPosition(away)
    player.velocity.x = 0
    player.velocity.y = 0
    step(118)
    const freshStillShaking = phase() === 'shaking'
    step(1)
    const wholeAfterReset = countdownCleared && relanded && freshStillShaking && phase() === 'falling'
    respawnKing()
    const ok = !risingCounts && landed && stillShaking && dropped && gone && notYet && back && reset && wholeAfterReset
    report.crumbling.shelves.push({ i, ok, risingCounts, landed, stillShaking, dropped, gone, notYet, back, reset, wholeAfterReset, fallFrames })
    if (!ok) report.crumbling.ok = false
    player.hitpoints = heartsBefore
    respawnKing()
}

// 3d. Each Tumbling Plank: it holds the King while within its window of flat,
//     drops him as it tips past, lets him through when it is on end, and a
//     keys-only crossing from the ledge before it to the ledge after works.
await play(N)
report.tumbling = { ok: true, planks: [] }
for (const [i, plank] of tumblingPlanks.entries()) {
    const { center } = plank.state.path
    const heartsBefore = player.hitpoints
    const standableAt = f => globalThis.__tumblingPlank.tumbleSurfaceAt(plank.state.path, f).standable
    const seek = (from, want) => { let f = from; while (standableAt(f) !== want) f++; return f }
    const settle = f => { tumblingFrame = f - 1; step(1) }
    // The ledges each side of the ditch, at the plank's height.
    const ledges = solid().filter(b => Math.abs(b.position.y - center.y) < 2)
    const left = Math.max(...ledges.filter(b => b.position.x + b.width <= center.x).map(b => b.position.x + b.width))
    const right = Math.min(...ledges.filter(b => b.position.x >= center.x).map(b => b.position.x))
    // (a) Carried while flat: stands on it, feet gap about 0, for a whole window (from its start).
    const windowStart = seek(seek(tumblingFrame, false), true)
    settle(windowStart)
    player.setPosition({ x: center.x - 35 - 20, y: center.y - FEET - 0.01 })
    player.velocity.x = 0
    player.velocity.y = 0
    let worstGap = 0, windowFrames = 0
    while (plank.state.standable && windowFrames < 200) {
        step(1)
        windowFrames++
        if (plank.state.standable) worstGap = Math.max(worstGap, Math.abs(player.position.y + FEET - center.y))
    }
    // (b) Dropped as it tips past the window: he falls clear of it.
    step(10)
    const dropped = player.position.y + FEET > center.y + 20
    respawnKing()
    // (c) On end: he passes through it, falling from above to below with no push sideways.
    settle(seek(windowStart + 20, false))
    let steepFrame = tumblingFrame
    while (Math.abs(Math.cos(globalThis.__tumblingPlank.tumbleAngleAt(plank.state.path, steepFrame))) > 0.1) steepFrame++
    settle(steepFrame)
    player.setPosition({ x: center.x - 35, y: center.y - 90 - FEET })
    player.velocity.x = 0
    player.velocity.y = 0
    const x0 = player.position.x
    step(30)
    const passedThrough = player.position.y + FEET > center.y + 20 && Math.abs(player.position.x - x0) < 1
    respawnKing()
    // (d) Keys only: walk from the ledge as the window opens, hold right to the far ledge.
    settle(seek(seek(tumblingFrame, true), false)) // just as it stops being standable
    player.setPosition({ x: left - 100, y: center.y - FEET - 0.01 })
    player.velocity.x = 0
    player.velocity.y = 0
    step(4)
    keys.d.pressed = false
    let crossed = false, walked = 0
    const hearts1 = player.hitpoints
    for (let f = 0; f < 700 && !crossed; f++) {
        // Creep to the ledge's very end (12 px of hitbox still on it), wait, and go the moment the window opens.
        const atEdge = player.hitbox.position.x >= left - 12
        keys.d.pressed = !atEdge || plank.state.standable || walked > 0
        // The far ledge may carry a battlement (a fort's end): jump as the plank runs out.
        keys.w.pressed = walked > 0 && player.hitbox.position.x + player.hitbox.width >= right - 40 && Math.abs(player.velocity.y) < 0.6
        if (keys.d.pressed && atEdge) walked++
        step(1)
        crossed = player.hitbox.position.x > right - 10 && player.position.y + FEET <= center.y + 3 && Math.abs(player.velocity.y) < 0.6
        if (player.hitpoints < hearts1) break
    }
    keys.d.pressed = false
    keys.w.pressed = false
    const keysOnly = crossed && player.hitpoints === hearts1
    const ok = worstGap < 1 && windowFrames >= 55 && dropped && passedThrough && keysOnly
    report.tumbling.planks.push({ i, ok, worstGap: +worstGap.toFixed(3), windowFrames, dropped, passedThrough, keysOnly, walked })
    if (!ok) report.tumbling.ok = false
    player.hitpoints = heartsBefore
    respawnKing()
}

// 4. The start and every checkpoint stand the King on solid ground.
await play(N)
report.standing = { ok: true, spots: [] }
for (const spot of [levels[N].playerPosition, ...(levels[N].checkpoints ?? [])]) {
    player.setPosition({ ...spot })
    player.velocity.x = 0
    player.velocity.y = 0
    step(30)
    const sank = player.position.y - spot.y
    const ok = Math.abs(sank) < 2 && player.velocity.y <= player.gravity + 0.01
    report.standing.spots.push({ spot, ok, sank: +sank.toFixed(2) })
    if (!ok) report.standing.ok = false
}

// 5. At the far end the camera is a whole number and the sky covers the view.
{
    const end = levels[N].checkpoints?.at(-1) ?? levels[N].playerPosition
    player.setPosition({ ...end, x: mapWidth - 150 })
    step(60)
    const skyRight = sky ? sky.position.x + sky.width * 2 : null
    const farRight = far ? far.position.x + far.width * 2 : null
    report.farEnd = {
        ok: Number.isInteger(camera.x) && camera.x === mapWidth - canvas.width &&
            (skyRight === null || skyRight >= camera.x + canvas.width) &&
            (farRight === null || farRight >= camera.x + canvas.width),
        camera: camera.x, mapWidth, skyRight, farRight,
    }
}

// 6. Weather never touches the King: 300 frames of the same keys with the Weather on
// and off leave him in the same place with the same hearts, and rain falls in view.
if (levels[N].weather) {
    const run = async weather => {
        const kept = levels[N].weather
        if (weather) levels[N].weather = weather
        else delete levels[N].weather
        await play(N)
        hold('d', 60)
        hold('space', 20)
        step(220)
        levels[N].weather = kept
        return { x: player.position.x, y: player.position.y, hearts: player.hitpoints }
    }
    const withWeather = await run(levels[N].weather)
    const without = await run(null)
    // A Storm's flashes stay soft: at most 35% white however long it runs.
    let peak = 0
    if (levels[N].weather === 'storm') for (let t = 0; t < 300; t += 1 / 30) peak = Math.max(peak, globalThis.__storm.flashAt(t, 24))
    const drops = globalThis.__weather.rainAt(performance.now() / 1000, { left: 0, right: 1024 }, { tops: rainTops, bottom: 496 })
    report.weather = {
        ok: withWeather.x === without.x && withWeather.y === without.y && withWeather.hearts === without.hearts && peak <= 0.35,
        stormPeakWhite: peak,
        withWeather, without, streaksInView: drops.streaks.length, splashesInView: drops.splashes.length,
    }
}

report.ok = ['fall', 'pigs', 'rides', 'helix', 'tumbling', 'crumbling', 'standing', 'farEnd', 'weather'].every(check => !report[check] || report[check].ok)
return report
