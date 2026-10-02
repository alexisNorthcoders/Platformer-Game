/**
 * Helix Platforms: two iron blades on a mast, turning flat like a helicopter's
 * rotor. Seen side-on, the blades stretch out to `radius` each side of the hub
 * as they turn across the view and shrink back to the hub as they turn
 * towards and away from it, twice a turn. The walkable surface is what the
 * blades cover: the hub always, the full span only while they point across.
 * The King is not carried: a blade shrinking out from under him drops him.
 * Pure logic; HelixPlatform.js draws them and index.js steps them once a frame
 * while playing (through globalThis.__helixPlatform).
 *
 * Positions are world px. `center` is the middle of the surface's top.
 */

export const HELIX_PLATFORM = {
    /** The hub's width: the surface never shrinks below this. */
    hubWidth: 48,
    height: 16,
}

/** The blades' angle at `frame`, radians: 0 when they point across the view. */
export function helixAngleAt({ periodFrames, phase = 0, direction = 1 }, frame) {
    return 2 * Math.PI * (direction * frame / periodFrames + phase)
}

/** The walkable surface at `frame`: { x, y, width }, x and y its top-left. */
export function helixSurfaceAt(path, frame) {
    const reach = Math.max(HELIX_PLATFORM.hubWidth / 2, path.radius * Math.abs(Math.cos(helixAngleAt(path, frame))))
    return { x: path.center.x - reach, y: path.center.y, width: 2 * reach }
}

/** A Helix Platform at frame 0. */
export function createHelixState(path) {
    return { path, frame: 0, ...helixSurfaceAt(path, 0) }
}

/** Advances `state` one frame. */
export function stepHelix(state) {
    state.frame++
    Object.assign(state, helixSurfaceAt(state.path, state.frame))
}

/** How far below the hub a mast reaches down to stand on a block; past that it is a short spindle. */
export const HELIX_MAST = { reach: 160, spindle: 48 }

/**
 * Where the mast under a hub at `center` (`halfWidth` each side) ends, as
 * { y, capped }: on the top of the first solid block below the hub when that
 * is within reach, a short capped spindle when the first block is further
 * down, or `mapHeight` with none (over a pit or lava, it runs out of the
 * world). One-way platforms don't hold it.
 */
export function mastFoot(center, halfWidth, blocks, mapHeight) {
    let block = Infinity
    for (const b of blocks) {
        if (b.type === 'platform') continue
        if (b.position.y <= center.y) continue
        if (b.position.x >= center.x + halfWidth || b.position.x + b.width <= center.x - halfWidth) continue
        block = Math.min(block, b.position.y)
    }
    if (block === Infinity) return { y: mapHeight, capped: false }
    if (block - center.y <= HELIX_MAST.reach) return { y: block, capped: false }
    return { y: center.y + HELIX_PLATFORM.height + HELIX_MAST.spindle, capped: true }
}
