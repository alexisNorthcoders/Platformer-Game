// Box Pig checks (#144, #145), for Level 17:  node tools/play.mjs --level 17 --file tools/box-pig-checks.js
// Evaluated in the page like tools/level-checks.js; the level is restarted between checks.

const N = level
const FEET = 87 // the King's feet are 87 px below his position
const FLOOR = 512
const report = { level: N }
const spawns = () => boxPigs.map(p => ({ x: p.position.x, y: p.position.y }))
const onFloor = () => boxPigs.filter(p => p.position.y + 32 === FLOOR)
/** The King on the floor `dx` px left of the Box Pig, facing it. */
const standBeside = (pig, dx = 110) => {
    player.setPosition({ x: pig.position.x - dx, y: FLOOR - FEET - 0.01 })
    player.velocity.x = 0
    player.velocity.y = 0
    player.lastDirection = 'right'
    step(2)
}

// 1. At rest a Box Pig is a Box: same art, size, position grid and tint, never the Pig tint.
await play(N)
{
    const box = boxes[0]
    const alike = boxPigs.map(p => ({
        art: p.image.src === box.image.src,
        size: p.hitbox.width === box.hitbox.width && p.hitbox.height === box.hitbox.height,
        grid: p.position.x % 32 === box.position.x % 32 && p.position.y % 32 === box.position.y % 32,
        tint: p.tint === box.tint && p.tintMode === box.tintMode && !p.glow,
        solid: !collisionBlocks.some(b => b.position.x === p.position.x && b.position.y === p.position.y),
    }))
    report.look = { ok: boxPigs.length >= 2 && boxPigs.length <= 3 && alike.every(a => Object.values(a).every(Boolean)), count: boxPigs.length, alike }
}

// 2. The King never stands on a Box Pig (he sinks past its top), and touching it costs a heart.
await play(N)
{
    const pig = onFloor()[0]
    // Feet 8 px into it (no hurt, so the knock-back doesn't muddy it): a Box would hold him up, a Box Pig lets him drop to the floor under it.
    const startY = pig.position.y + 8 - FEET
    player.setPosition({ x: pig.position.x + 22 - 62, y: startY })
    player.velocity.x = 0
    player.velocity.y = 0
    player.hitCooldown = true
    step(8)
    const sank = player.position.y > startY + 16 && !pig.shattered
    await play(N)
    const target = onFloor()[0]
    standBeside(target, 130)
    const before = player.hitpoints
    hold('d', 60)
    report.contact = { ok: sank && player.hitpoints === before - 1 && !target.shattered, sank, heartsBefore: before, heartsAfter: player.hitpoints }
}

// 3. A hammer hit shatters it: the Pig counter up by one, no Diamond.
await play(N)
{
    const pig = onFloor()[0]
    const count = EnemyTracker.getEnemyCount()
    const diamondsBefore = diamonds.length
    standBeside(pig, 90)
    player.canAttack = true
    player.attack()
    step(120)
    report.hammer = {
        ok: pig.shattered && pig.breakPieces.length === 4 && EnemyTracker.getEnemyCount() === count + 1 && diamonds.length === diamondsBefore,
        shattered: pig.shattered, counter: EnemyTracker.getEnemyCount() - count, diamonds: diamonds.length - diamondsBefore,
    }
}

// 4. A Squish shatters it too, and the King bounces off unhurt.
await play(N)
{
    const pig = boxPigs[0]
    const count = EnemyTracker.getEnemyCount()
    const diamondsBefore = diamonds.length
    const hearts = player.hitpoints
    player.setPosition({ x: pig.position.x + 22 - 62, y: pig.position.y - FEET - 30 })
    player.velocity.x = 0
    player.velocity.y = 6
    step(8)
    report.squish = {
        ok: pig.shattered && EnemyTracker.getEnemyCount() === count + 1 && diamonds.length === diamondsBefore && player.hitpoints === hearts,
        shattered: pig.shattered, counter: EnemyTracker.getEnemyCount() - count, heartsLost: hearts - player.hitpoints,
    }
}

// 5. A Bomb's blast shatters every Box Pig in it.
await play(N)
{
    const pig = boxPigs[0]
    const count = EnemyTracker.getEnemyCount()
    const diamondsBefore = diamonds.length
    hitBlastVictims({ position: { ...pig.hitbox.position }, width: pig.hitbox.width, height: pig.hitbox.height })
    report.blast = {
        ok: pig.shattered && EnemyTracker.getEnemyCount() === count + 1 && diamonds.length === diamondsBefore,
        shattered: pig.shattered, counter: EnemyTracker.getEnemyCount() - count,
    }
}

// 6. A defeated Box Pig stays defeated through a Door (the session remembers it); Restart Level brings every one back.
await play(N)
{
    const spawnList = spawns()
    const pig = boxPigs[0]
    const { x, y } = spawnList[0]
    pig.kill()
    const remembered = LevelProgressKeys.isEnemyDefeated(N, 'boxPig', x, y)
    const count = EnemyTracker.getEnemyCount()
    await restartLevel()
    step(2)
    report.restart = {
        ok: boxPigs.length === spawnList.length && boxPigs.every((p, i) => !p.shattered && p.hitpoints > 0 && p.position.x === spawnList[i].x && p.position.y === spawnList[i].y) && EnemyTracker.getEnemyCount() === count - 1,
        remembered, back: boxPigs.length, counter: EnemyTracker.getEnemyCount(),
    }
    report.defeatedMark = { ok: remembered }
}

// 7. Peek, hop toward the King, give up (#145): the box lifts in place, hops stay on the floor, and it hides where it stopped.
await play(N)
{
    const pig = onFloor()[0]
    const spawn = { x: pig.position.x, y: pig.position.y }
    const sheet = () => decodeURIComponent(pig.image.src.split('/').pop())
    const farX = pig.position.x - 600 // well past 5 tiles (320 px)
    const keepKing = (x, frames) => {
        for (let i = 0; i < frames; i++) {
            player.setPosition({ x, y: FLOOR - FEET - 0.01 })
            player.velocity.x = 0
            player.velocity.y = 0
            player.hitCooldown = true // contact must not knock him about or cost hearts here
            step(1)
        }
    }
    keepKing(farX, 30)
    const hiddenFar = pig.ai.mode === 'hidden' && sheet() === 'Idle.png'

    // 4 tiles away: between 3 and 5, so still hidden
    keepKing(spawn.x + 22 - 62 - 256, 30)
    const hiddenBetween = pig.ai.mode === 'hidden'

    // 2 tiles away on the left: it peeks, and the box lifts in place (no sideways shift).
    keepKing(spawn.x + 22 - 62 - 128, 4)
    const peek = { mode: pig.ai.mode, sheet: sheet(), x: pig.position.x, y: pig.position.y }
    const peeked = pig.ai.mode === 'lookingOut' && peek.sheet.startsWith('Looking Out') && peek.x === spawn.x && peek.y === spawn.y

    // It winds up, then hops toward him, always back down on its own floor.
    const sheets = new Set()
    let leftFloor = false
    let maxAirborne = 0
    for (let i = 0; i < 240; i++) {
        keepKing(spawn.x + 22 - 62 - 128, 1)
        sheets.add(sheet().replace(/ \(.*/, ''))
        if (pig.position.y + 32 > FLOOR + 0.5 || pig.position.y + 32 < FLOOR - 80) leftFloor = true
        if (pig.position.y + 32 < FLOOR - 0.5) maxAirborne = Math.max(maxAirborne, FLOOR - pig.position.y - 32)
    }
    const hopped = pig.position.x < spawn.x - 20 && maxAirborne > 10 && !leftFloor
    const allSheets = ['Jump Anticipation', 'Jump', 'Fall', 'Ground'].every(name => sheets.has(name))
    const stoppedAt = { x: pig.position.x, y: pig.position.y }

    // Past 5 tiles it settles and hides where it stopped, not at its spawn.
    keepKing(stoppedAt.x + 22 - 62 - 600, 240)
    const gaveUp = pig.ai.mode === 'hidden' && sheet() === 'Idle.png' && Math.abs(pig.position.x - stoppedAt.x) < 120 && pig.position.x !== spawn.x && pig.position.y + 32 === FLOOR
    report.peekHopGiveUp = {
        ok: hiddenFar && hiddenBetween && peeked && hopped && allSheets && gaveUp,
        hiddenFar, hiddenBetween, peeked, hopped, allSheets, gaveUp, sheets: [...sheets], spawn, stoppedAt, now: { x: pig.position.x, y: pig.position.y },
    }
}

// 8. A hop toward an edge never takes it off its floor.
await play(N)
{
    const pig = onFloor()[0]
    const body = { left: pig.position.x, right: pig.position.x + 44 }
    const edges = __boxPig.floorEdges(collisionBlocks, { ...body, bottom: FLOOR, height: 32 })
    const lip = pig.position.x - edges.left < edges.right - body.right ? 'left' : 'right'
    let minX = Infinity
    let maxX = -Infinity
    let lowest = -Infinity
    for (let i = 0; i < 900; i++) {
        // The King stands 100 px past the lip (his position is 62 px left of his centre), on the lip's side.
        const x = (lip === 'left' ? edges.left - 100 : edges.right + 100) - 62
        player.setPosition({ x, y: FLOOR - FEET - 0.01 })
        player.velocity.x = 0
        player.velocity.y = 0
        player.hitCooldown = true
        step(1)
        minX = Math.min(minX, pig.position.x)
        maxX = Math.max(maxX, pig.position.x + 44)
        lowest = Math.max(lowest, pig.position.y + 32)
    }
    report.edgeClamp = {
        ok: edges && minX >= edges.left - 0.01 && maxX <= edges.right + 0.01 && lowest <= FLOOR + 0.01 && pig.ai.mode !== 'hidden',
        lip, edges, minX, maxX, lowest, mode: pig.ai.mode,
    }
}

report.ok = Object.values(report).every(check => !check || typeof check !== 'object' || check.ok !== false)
return report
