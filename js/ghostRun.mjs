/**
 * Ghost Run store (#127): each level's Personal Best, kept in browser storage
 * (passed in, so tests use an in-memory one). One namespaced key per level; only
 * the faster run is kept. The record is JSON with `timeMs` plus any extra fields
 * a later save adds (frames), which reads leave untouched. Each record carries the
 * level fingerprint it was set on; a record whose fingerprint differs from the
 * level's current one (or has none) reads as no record.
 */

const KEY_PREFIX = 'kings-and-pigs:ghost-run:level-'

/**
 * Level fingerprint (#129): a stable string over what a run can interact with.
 * Fields (all from the level's raw map data and its levels.js entry):
 *   collisions, platforms_2   collision tile layers
 *   boxes, platforms, door, enemy (Pigs), enemyKing, enemyMatch, cannon
 *                             object positions
 *   movingPlatforms, helixPlatforms, tumblingPlanks, crumblingShelves
 *                             platform paths / positions
 *   playerPosition            the King's start
 *   checkpoints               levels.js Checkpoints
 * Art, decoration, diamonds, puddles and Weather are left out.
 */
const FINGERPRINT_FIELDS = [
    'collisions', 'platforms_2', 'boxes', 'platforms', 'door', 'enemy', 'enemyKing', 'enemyMatch',
    'cannon', 'movingPlatforms', 'helixPlatforms', 'tumblingPlanks', 'crumblingShelves',
]

export function levelFingerprint(assets, levelConfig = {}) {
    const parts = FINGERPRINT_FIELDS.map(name => assets?.[name] ?? [])
    parts.push(levelConfig?.playerPosition ?? null, levelConfig?.checkpoints ?? [])
    const text = JSON.stringify(parts)
    // FNV-1a, 32 bit.
    let hash = 0x811c9dc5
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i)
        hash = Math.imul(hash, 0x01000193)
    }
    return (hash >>> 0).toString(16).padStart(8, '0')
}

export function createGhostRunStore(storage) {
    const keyFor = level => `${KEY_PREFIX}${level}`

    // Parsed records by level, so the HUD can ask every frame; save() keeps it current.
    const cache = new Map()

    function readRaw(level) {
        if (cache.has(level)) return cache.get(level)
        let record = null
        try {
            record = JSON.parse(storage.getItem(keyFor(level)))
        } catch {
            // Unreadable: treated as no record.
        }
        if (!Number.isFinite(record?.timeMs)) record = null
        cache.set(level, record)
        return record
    }

    // A record from another layout (or from before fingerprints) is stale: none.
    function read(level, fingerprint) {
        const record = readRaw(level)
        return record && fingerprint != null && record.fingerprint === fingerprint ? record : null
    }

    return {
        /** The level's stored record ({ timeMs, ...extras }) for this layout, or null. */
        get: read,
        /** The level's Personal Best time in ms for this layout, or null. */
        personalBest(level, fingerprint) {
            return read(level, fingerprint)?.timeMs ?? null
        },
        /**
         * Keeps `timeMs` (with any `extra` fields) if the level has no record for
         * this layout or it is faster; a stale record is replaced. Returns true
         * when this save set a new Personal Best.
         */
        save(level, timeMs, fingerprint, extra = {}) {
            if (!Number.isFinite(timeMs) || timeMs <= 0 || fingerprint == null) return false
            const best = read(level, fingerprint)
            if (best && best.timeMs <= timeMs) return false
            const record = { ...extra, fingerprint, timeMs }
            try {
                storage.setItem(keyFor(level), JSON.stringify(record))
            } catch {
                // Storage full or blocked: nothing was persisted, so don't claim a best.
                cache.delete(level)
                return false
            }
            cache.set(level, record)
            return true
        },
    }
}
