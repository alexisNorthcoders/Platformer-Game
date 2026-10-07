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
if (levels[N].tower) {
    // A Tower Level has no pit: a Long Fall (feet more than a screen below his last footing) is the fall.
    const start = levels[N].playerPosition
    const hearts = player.hitpoints
    // In the air above the last Checkpoint, clear of the ledges: the first height up
    // with nothing to stand on within 120 px under his feet.
    const spot = levels[N].checkpoints.at(-1)
    const surfaces = [...collisionBlocks, ...movingPlatforms.flatMap(p => p.collisionBlocks)]
    const clearUnder = y => !surfaces.some(b => b.position.x < spot.x + 90 && b.position.x + b.width > spot.x + 35 &&
        b.position.y + b.height > y && b.position.y < y + FEET + 120)
    let airY = spot.y - 300
    while (!clearUnder(airY) && airY > 0) airY -= 16
    player.setPosition({ x: spot.x, y: airY })
    player.velocity.x = 0
    player.velocity.y = 0
    lastFootingY = player.feetPosition().y - canvas.height + 20
    step(1)
    const notYet = player.hitpoints === hearts // 556 px below the footing is still no Long Fall
    lastFootingY = player.feetPosition().y - canvas.height - 40
    step(2)
    report.fall = {
        ok: notYet && player.hitpoints === hearts - 1 && Math.abs(player.position.x - respawnPoint.x) < 1 && Math.abs(player.position.y - respawnPoint.y) < 2,
        heartsBefore: hearts, heartsAfter: player.hitpoints, at: { ...player.position },
    }
} else {
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
    // On a tall map rides stack in one shaft: wait until no other ride is within 90 px of this one's surface.
    const crowded = () => movingPlatforms.some((other, j) => j !== i &&
        Math.abs(other.state.y - platform.state.y) < 90 && Math.abs(other.state.x - platform.state.x) < 200)
    // One measurement per platform, from a clear start. If a neighbour sweeps through mid-ride, the result
    // is kept as measured and the neighbours are named, so a failure is told apart from a real one.
    for (let f = 0; f < 3000 && crowded(); f++) step(1)
    const surface = platform.surface()
    player.setPosition({ x: surface.x + 100 - 62, y: surface.y - FEET - 0.01 })
    player.velocity.x = 0
    player.velocity.y = 0
    const offset = player.position.x - platform.state.x
    const heartsBefore = player.hitpoints
    const neighbours = new Set()
    for (let f = 0; f < 100; f++) {
        step(1)
        movingPlatforms.forEach((other, j) => {
            if (j !== i && Math.abs(other.state.y - platform.state.y) < 90 && Math.abs(other.state.x - platform.state.x) < 200) neighbours.add(j)
        })
    }
    const gap = player.position.y + FEET - platform.state.y
    const drift = player.position.x - platform.state.x - offset
    const ok = Math.abs(gap) < 1 && Math.abs(drift) < 2
    const result = { i, ok, gap: +gap.toFixed(3), drift: +drift.toFixed(3), lostHeart: player.hitpoints < heartsBefore }
    if (!ok && neighbours.size) result.failure = 'interfered by neighbour'
    else if (!ok) result.failure = 'ride'
    if (neighbours.size) result.neighbours = [...neighbours]
    player.hitpoints = heartsBefore
    report.rides.platforms.push(result)
    if (!result.ok) report.rides.ok = false
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
    const gone = phase() === 'gone' && !crumblingShelves[i].collisionBlocks.some(b => b.position.y < mapHeight)
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

// 3d. Each Tumbling Plank: the King never falls through its top face. Standing
//     still from flat he is carried and slides off the low end before 80 degrees,
//     never below the face; a fall onto it at 0, 30 and 60 degrees lands on the
//     face; a jump from mid-slide works; and a keys-only crossing from the ledge
//     before it to the ledge after works.
await play(N)
report.tumbling = { ok: true, planks: [] }
const savedTumblingFrame = tumblingFrame
const plankLib = globalThis.__tumblingPlank
const DEG = Math.PI / 180
for (const [i, plank] of tumblingPlanks.entries()) {
    const { center } = plank.state.path
    const path = plank.state.path
    const heartsBefore = player.hitpoints
    const tiltAt = f => Math.abs(plankLib.tiltAt(path, f))
    const standableAt = f => tiltAt(f) < plankLib.TUMBLING_PLANK.slideFrom
    const seek = (from, want) => { let f = from; while (standableAt(f) !== want) f++; return f }
    /** The first frame at or after `from` where the plank has tilted `deg` degrees and is still turning away from flat. */
    const seekTilt = (from, deg) => { let f = from; while (!(tiltAt(f) >= deg * DEG && tiltAt(f + 1) > tiltAt(f))) f++; return f }
    const settle = f => { tumblingFrame = f - 1; step(1) }
    const faceAt = x => plankLib.surfaceYAt(path, plank.state.frame, x)
    const feetX = () => player.hitbox.position.x + player.hitbox.width / 2
    const feetY = () => player.position.y + FEET
    // The ledges each side of the ditch, at the plank's height.
    const ledges = solid().filter(b => Math.abs(b.position.y - center.y) < 2)
    const left = Math.max(...ledges.filter(b => b.position.x + b.width <= center.x).map(b => b.position.x + b.width))
    const right = Math.min(...ledges.filter(b => b.position.x >= center.x).map(b => b.position.x))
    const stand = (x, y) => {
        player.setPosition({ x: x - 62.5, y: y - FEET }) // x: where his feet are (his hitbox is 55 wide, 35 in)
        player.velocity.x = 0
        player.velocity.y = 0
    }
    // (a) Standing still from flat: never below the face while on it, off the low end before 80 degrees.
    const standing = []
    for (const dx of [-70, 0, 70]) {
        settle(seekTilt(seek(seek(tumblingFrame, false), true), 0.1) - 1) // from flat
        stand(center.x + dx, center.y - 0.01)
        let worstBelow = 0, worstGap = 0, ridden = 0, leftAt = null, leftVx = 0, airVx = null
        for (let f = 0; f < 240 && airVx == null; f++) {
            step(1)
            if (player.plankRide) {
                ridden++
                // Feet on the face every frame of the ride, across the whole tilt band.
                const gap = feetY() - faceAt(feetX())
                worstGap = Math.max(worstGap, Math.abs(gap))
                worstBelow = Math.max(worstBelow, gap)
            } else if (ridden) {
                if (leftAt == null) {
                    leftAt = +(tiltAt(plank.state.frame) / DEG).toFixed(1)
                    leftVx = player.velocity.x
                } else airVx = player.velocity.x
            }
        }
        // Off the end he is in the air, carried downhill at the slide speed, applied once (not doubled).
        const carried = leftAt != null && Math.sign(leftVx) === Math.sign(plank.state.tilt) && Math.abs(leftVx) <= plankLib.TUMBLING_PLANK.maxSlide + 0.01 &&
            airVx != null && Math.abs(airVx) <= Math.abs(leftVx) + 0.01
        standing.push({ dx, ridden, leftAt, worstBelow: +worstBelow.toFixed(3), worstGap: +worstGap.toFixed(3), carried })
        respawnKing()
    }
    const standingOk = standing.every(s => s.ridden > 20 && s.leftAt != null && s.leftAt < 80 && s.worstBelow < 1 && s.worstGap < 1 && s.carried)
    // (b) A fall onto the face at 0, 30 and 60 degrees lands on it, never through it.
    const falls = []
    for (const deg of [0, 30, 60]) {
        settle(seekTilt(seek(seek(tumblingFrame, false), true), Math.max(deg - 5, 0.1)))
        stand(center.x + 20, faceAt(center.x + 20) - 40)
        let landedAt = null, worstBelow = -Infinity
        for (let f = 0; f < 60 && landedAt == null; f++) {
            step(1)
            const face = faceAt(feetX())
            if (face != null) worstBelow = Math.max(worstBelow, feetY() - face)
            if (player.plankRide) landedAt = { tilt: +(tiltAt(plank.state.frame) / DEG).toFixed(1), gap: +(feetY() - face).toFixed(3), slid: player.slideSpeed }
        }
        falls.push({ deg, landedAt, worstBelow: +worstBelow.toFixed(2) })
        respawnKing()
    }
    const fallsOk = falls.every(r => r.landedAt && Math.abs(r.landedAt.gap) < 1 && r.worstBelow < 1) &&
        falls[1].landedAt?.slid > 0 && falls[2].landedAt?.slid > 0
    // (c) A jump from mid-slide leaves the plank at once, and carries him on downhill.
    settle(seekTilt(seek(seek(tumblingFrame, false), true), 38))
    stand(center.x, faceAt(center.x) - 0.01)
    step(3)
    const slidBefore = player.slideSpeed
    const y0 = feetY()
    hold('w', 1)
    let rose = 0
    for (let f = 0; f < 8; f++) { step(1); rose = Math.max(rose, y0 - feetY()) }
    const jumpVx = player.velocity.x
    const jumped = slidBefore > 0 && rose > 10 && !player.plankRide && Math.sign(jumpVx) === Math.sign(plank.state.tilt)
    respawnKing()
    // (d) Keys only: walk from the ledge as the plank tips out of its stand, hold right to the far ledge.
    settle(seek(seek(tumblingFrame, true), false)) // just as it stops being standable
    stand(left - 37.5, center.y - 0.01)
    step(4)
    keys.d.pressed = false
    let crossed = false, walked = 0
    const hearts1 = player.hitpoints
    for (let f = 0; f < 700 && !crossed; f++) {
        // Creep to the ledge's very end (12 px of hitbox still on it), wait, and go once it is within the stand, jumping onto the near end when it is raised (tilt > 0).
        const atEdge = player.hitbox.position.x >= left - 12
        keys.d.pressed = !atEdge || standableAt(plank.state.frame) || walked > 0
        // The far ledge may carry a battlement (a fort's end): jump as the plank runs out.
        keys.w.pressed = (walked > 0 && player.hitbox.position.x + player.hitbox.width >= right - 40 && Math.abs(player.velocity.y) < 0.6) ||
            (walked === 0 && atEdge && keys.d.pressed && plank.state.tilt > 0)
        if (keys.d.pressed && atEdge) walked++
        step(1)
        crossed = player.hitbox.position.x > right - 10 && player.position.y + FEET <= center.y + 3 && Math.abs(player.velocity.y) < 0.6
        if (player.hitpoints < hearts1) break
    }
    keys.d.pressed = false
    keys.w.pressed = false
    const keysOnly = crossed && player.hitpoints === hearts1
    const ok = standingOk && fallsOk && jumped && keysOnly
    report.tumbling.planks.push({ i, ok, standing, falls, jumped: { slidBefore: +slidBefore.toFixed(2), rose: +rose.toFixed(1) }, keysOnly, walked })
    if (!ok) report.tumbling.ok = false
    player.hitpoints = heartsBefore
    respawnKing()
}
tumblingFrame = savedTumblingFrame // leave the plank phase as this block found it
tumblingPlanks.forEach(p => p.step(tumblingFrame))

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

// 5b. A tall map: the camera is a whole number at the top and at the foot, never moves
// sideways, and the sky covers the view at both ends.
if (mapHeight > canvas.height) {
    const at = []
    for (const y of [60, levels[N].playerPosition.y]) {
        player.setPosition({ x: y === 60 ? 480 : levels[N].playerPosition.x, y })
        player.velocity.x = 0
        player.velocity.y = 0
        step(2)
        const skyBottom = sky ? sky.position.y + sky.height * 2 : null
        const covers = (sky === null || (sky.position.y <= camera.y && skyBottom >= camera.y + canvas.height)) &&
            (far === null || (far.position.y <= camera.y && far.position.y + far.height * 2 >= camera.y + canvas.height))
        at.push({ y, cameraY: camera.y, cameraX: camera.x, skyTop: sky?.position.y, skyBottom, covers })
    }
    report.tall = {
        ok: at.every(a => Number.isInteger(a.cameraY) && a.cameraX === 0 && a.covers) &&
            at[0].cameraY === 0 && at[1].cameraY === mapHeight - canvas.height,
        mapHeight, at,
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

report.ok = ['fall', 'pigs', 'rides', 'helix', 'tumbling', 'crumbling', 'standing', 'farEnd', 'tall', 'weather'].every(check => !report[check] || report[check].ok)
return report
