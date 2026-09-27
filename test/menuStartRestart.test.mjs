import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import path from 'node:path'
import url from 'node:url'

const dir = path.dirname(url.fileURLToPath(import.meta.url))
const src = await fs.readFile(path.join(dir, '..', 'index.js'), 'utf8')

/** The body of `function name(...) {` up to the next top-level `}`. */
function functionBody(name) {
    const m = src.match(new RegExp(`function ${name}\\([^)]*\\) \\{\\n([\\s\\S]*?)\\n\\}\\n`))
    assert.ok(m, `index.js defines ${name}`)
    return m[1]
}

/**
 * Guards the PR requirement: PLAY on the Title Screen must always run
 * `startGame(...)` (full session reload), not only when `selectedLevel`
 * differs from `level`. `pauseMenuFromPlaying` must be cleared first so a
 * paused session cannot leak into the next run.
 */
test('Title Screen PLAY always calls startGame with the selected level (source contract)', () => {
    assert.match(functionBody('handleTitleScreenTarget'), /void startGame\(selectedLevel\)/)
    assert.match(
        src,
        /async function startGame\(levelToStart\) \{[\s\S]*?pauseMenuFromPlaying = false[\s\S]*?resetSession\(\)/,
        'startGame must clear pauseMenuFromPlaying, then reset the session, before loading',
    )
})

// Quit to Title (#65) and a new game share resetSession: hearts, diamonds,
// the Pig count and the timer all start over.
test('resetSession clears hearts, diamonds, Pig count, timer and level progress (source contract)', () => {
    const body = functionBody('resetSession')
    for (const call of [
        /diamondCount = 0/,
        /resetHearts\(\)/,
        /EnemyTracker\.resetSession\(\)/,
        /levelTimer\.reset\(\)/,
        /LevelProgressKeys\.clearAll\(\)/,
        /resetPlayerForNewLevelRun\(player\)/,
        /clearHeldInputKeys\(keys\)/,
    ]) {
        assert.match(body, call)
    }
})

test('applyGameFlowResult resets the session on Quit to Title (source contract)', () => {
    assert.match(functionBody('applyGameFlowResult'), /if \(result\.resetSession\) resetSession\(\)/)
})
