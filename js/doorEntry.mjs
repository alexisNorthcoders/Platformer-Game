/**
 * Door entry (#39): decides whether the player can enter a door. Pure — used by
 * keyboard ↑ and meant to be reused by touch controls (#38).
 * Door sprites are drawn at 2x, so the enter zone spans 2 * width by 2 * height.
 * Bounds are copied verbatim from the original ↑ handler: the hitbox must sit
 * horizontally inside the zone and vertically overlap it, with edges inclusive.
 */

export function isHitboxAtDoor(hitbox, door) {
    return hitbox.position.x + hitbox.width <= door.position.x + 2 * door.width &&
        hitbox.position.x >= door.position.x &&
        hitbox.position.y + hitbox.height >= door.position.y &&
        hitbox.position.y <= door.position.y + 2 * door.height
}

export function canEnterDoor({ hitbox, doors, doorClosed }) {
    return !doorClosed && doors.some(door => isHitboxAtDoor(hitbox, door))
}
