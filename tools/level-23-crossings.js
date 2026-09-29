// Level 23's scripted crossings, keys only: a short-plank Rotating Platform, then the precision stretch.
// Run: node tools/play.mjs --level 23 --file tools/level-23-crossings.js
await play(23)
const front = () => player.hitbox.position.x + player.hitbox.width
const feetY = () => player.hitbox.position.y + player.hitbox.height
const solidUnder = x => collisionBlocks.some(b => x >= b.position.x && x <= b.position.x + b.width && Math.abs(b.position.y - feetY()) < 3)
const out = {}
// 1. Short-plank wheel (Rotating Platform 2): from the island before it to the island after.
player.setPosition({ x: 6720 - 100, y: 320 - 88 }); player.velocity.x = 0; player.velocity.y = 0; step(20)
const hearts0 = player.hitpoints
const planks = movingPlatforms.filter(p => p.state.path.center && p.collisionBlocks[0].width === 128)
let boarded = false, arrived = false
for (let f = 0; f < 1500 && !arrived; f++) {
    keys.d.pressed = false
    const onIsland = player.position.x < 6720 - 60
    const onRight = player.position.x > 7104 - 40
    if (!boarded) {
        // walk on when a plank is level with the ledge, within reach
        const near = planks.find(p => Math.abs(p.state.x - 6720) < 40 && p.state.y > 318 && p.state.y < 345)
        if (near || front() > 6720 - 5) keys.d.pressed = true
        if (player.velocity.y === 0 && planks.some(p => player.hitbox.position.x < p.state.x + 128 && front() > p.state.x && Math.abs(feetY() - p.state.y) < 3)) boarded = true
    } else {
        const p = planks.find(p => player.hitbox.position.x < p.state.x + 128 && front() > p.state.x && Math.abs(feetY() - p.state.y) < 4) 
        if (p && p.state.x + 128 > 7104 - 30 && Math.abs(p.state.y - 320) < 12) keys.d.pressed = true
        if (!p && player.position.x > 7000) keys.d.pressed = true
    }
    step(1)
    if (player.position.x > 7104 && Math.abs(feetY() - 320) < 3) arrived = true
    if (player.hitpoints < hearts0) break
}
keys.d.pressed = false
out.wheel = { boarded, arrived, hearts: player.hitpoints, x: player.position.x }
// 2. The precision stretch, keys only: run right, jump at every edge.
player.setPosition({ x: 7110, y: 320 - 88 }); player.velocity.x = 0; player.velocity.y = 0; step(20)
const h1 = player.hitpoints
let jumps = 0, frames = 0, prevJump = 0
for (; frames < 1200; frames++) {
    keys.d.pressed = true
    keys.w.pressed = false
    const grounded = Math.abs(player.velocity.y) < 0.6
    if (grounded && frames - prevJump > 12 && !solidUnder(front() + 6) && !solidUnder(front() - 2) ) { keys.w.pressed = true; jumps++; prevJump = frames }
    step(1)
    if (player.position.x > 8128 + 10 && Math.abs(feetY() - 3 * 64) < 3) break
    if (player.hitpoints < h1) break
}
keys.d.pressed = false; keys.w.pressed = false
out.stretch = { hearts: player.hitpoints, x: player.position.x, feet: feetY(), jumps, frames, ok: player.position.x > 8128 && player.hitpoints === h1 }
return out
