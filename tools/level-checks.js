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
    step(130)
    const wholeAfterReset = phase() === 'whole'
    const ok = !risingCounts && landed && stillShaking && dropped && gone && notYet && back && reset && wholeAfterReset
    report.crumbling.shelves.push({ i, ok, risingCounts, landed, stillShaking, dropped, gone, notYet, back, reset, wholeAfterReset, fallFrames })
    if (!ok) report.crumbling.ok = false
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

report.ok = ['fall', 'pigs', 'rides', 'helix', 'crumbling', 'standing', 'farEnd'].every(check => report[check].ok)
return report
