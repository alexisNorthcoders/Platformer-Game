/**
 * Ghost Run store (#127): each level's Personal Best, kept in browser storage
 * (passed in, so tests use an in-memory one). One namespaced key per level; only
 * the faster run is kept. The record is JSON with `timeMs` plus any extra fields
 * a later save adds (fingerprint, frames), which reads leave untouched.
 */

const KEY_PREFIX = 'kings-and-pigs:ghost-run:level-'

export function createGhostRunStore(storage) {
    const keyFor = level => `${KEY_PREFIX}${level}`

    // Parsed records by level, so the HUD can ask every frame; save() keeps it current.
    const cache = new Map()

    function read(level) {
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

    return {
        /** The level's stored record ({ timeMs, ...extras }), or null. */
        get: read,
        /** The level's Personal Best time in ms, or null. */
        personalBest(level) {
            return read(level)?.timeMs ?? null
        },
        /**
         * Keeps `timeMs` (with any `extra` fields) if the level has no record or
         * it is faster. Returns true when this save set a new Personal Best.
         */
        save(level, timeMs, extra = {}) {
            if (!Number.isFinite(timeMs) || timeMs <= 0) return false
            const best = read(level)
            if (best && best.timeMs <= timeMs) return false
            const record = { ...extra, timeMs }
            try {
                storage.setItem(keyFor(level), JSON.stringify(record))
            } catch {
                // Storage full or blocked: the best lasts until the page closes.
            }
            cache.set(level, record)
            return true
        },
    }
}
