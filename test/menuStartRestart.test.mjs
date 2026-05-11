import assert from 'node:assert/strict'
import test from 'node:test'

/**
 * Guards the PR requirement: choosing "Start Game" from the menu must always
 * run `startGame(...)` (full session reload), not only when `selectedLevel`
 * differs from `level`. `pauseMenuFromPlaying` must be cleared first so a
 * paused session cannot leak into the next run.
 */
test('menu click handler always calls startGame with selected level (source contract)', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const url = await import('node:url')
    const dir = path.dirname(url.fileURLToPath(import.meta.url))
    const src = await fs.readFile(path.join(dir, '..', 'index.js'), 'utf8')
    assert.match(
        src,
        /canvas\.addEventListener\('click'[\s\S]*?void startGame\(selectedLevel\)/,
        'Start Game click should invoke startGame(selectedLevel)',
    )
    assert.match(
        src,
        /async function startGame\(levelToStart\) \{[\s\S]*?pauseMenuFromPlaying = false/,
        'startGame must clear pauseMenuFromPlaying before loading',
    )
})
