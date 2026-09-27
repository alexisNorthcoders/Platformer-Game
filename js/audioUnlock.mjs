// Browsers (mobile especially) start the AudioContext suspended until a user
// gesture. touchend/click are included because iOS Safari only counts those as
// activation for audio.
export const AUDIO_UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']

/**
 * Resume `audioContext` on the first user gesture on `target`, then stop
 * listening. Keeps listening while the context is still not running.
 */
export function unlockAudioOnFirstGesture(target, audioContext) {
    const detach = () => {
        for (const type of AUDIO_UNLOCK_EVENTS) target.removeEventListener(type, onGesture, true)
    }
    async function onGesture() {
        if (audioContext.state !== 'running') {
            try {
                await audioContext.resume()
            } catch {
                return
            }
        }
        if (audioContext.state === 'running') detach()
    }
    for (const type of AUDIO_UNLOCK_EVENTS) target.addEventListener(type, onGesture, true)
}
