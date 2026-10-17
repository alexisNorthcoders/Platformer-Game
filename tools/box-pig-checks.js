// Box Pig checks (#144), for Level 17:  node tools/play.mjs --level 17 --file tools/box-pig-checks.js
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

report.ok = Object.values(report).every(check => !check || typeof check !== 'object' || check.ok !== false)
return report
