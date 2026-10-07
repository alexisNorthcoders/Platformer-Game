/**
 * Ghost Run store (#127): each level's Personal Best, kept in browser storage
 * (passed in, so tests use an in-memory one). One namespaced key per level; only
 * the faster run is kept. The record is JSON with `timeMs` plus any extra fields
 * a later save adds (fingerprint, frames), which reads leave untouched.
 */

const KEY_PREFIX = 'kings-and-pigs:ghost-run:level-'

export function createGhostRunStore(storage) {
    const keyFor = level => `${KEY_PREFIX}${level}`

    function read(level) {
        try {
            const record = JSON.parse(storage.getItem(keyFor(level)))
            return Number.isFinite(record?.timeMs) ? record : null
        } catch {
            return null
        }
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
            const best = read(level)
            if (best && best.timeMs <= timeMs) return false
            try {
                storage.setItem(keyFor(level), JSON.stringify({ ...extra, timeMs }))
            } catch {
                return false
            }
            return true
        },
    }
}
