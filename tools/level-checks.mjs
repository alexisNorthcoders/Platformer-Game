#!/usr/bin/env node
/**
 * Runs the new-level skill's browser checks (tools/level-checks.js) on every
 * open-air level, one line per level, and exits 1 if any check fails:
 *
 *   npm run level-checks             all open-air levels
 *   npm run level-checks -- --level 24   one level
 *
 * A level is open-air when config/levels.js gives it Checkpoints and a
 * backdrop, so a new level is picked up without touching this file. Each level
 * runs in its own tools/play.mjs process, which honours CHROMIUM.
 */

import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const run = promisify(execFile)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** The level numbers config/levels.js marks open-air, in order. */
export async function openAirLevels() {
    const source = await readFile(path.join(ROOT, 'config/levels.js'), 'utf8')
    const levels = vm.runInNewContext(`${source}\nlevels`)
    return Object.keys(levels).map(Number)
        .filter(n => levels[n].checkpoints?.length && levels[n].backdrop)
}

/** The names of the checks that failed in a level's report. */
export function failedChecks(report) {
    return Object.entries(report)
        .filter(([, check]) => check && typeof check === 'object' && check.ok === false)
        .map(([name]) => name)
}

async function checkLevel(n) {
    try {
        const { stdout } = await run(process.execPath, [
            path.join(ROOT, 'tools/play.mjs'), '--level', String(n), '--file', path.join(ROOT, 'tools/level-checks.js'),
        ], { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 })
        const report = JSON.parse(stdout)
        const failed = failedChecks(report)
        return { n, failed, error: report.ok || failed.length ? null : 'report not ok' }
    } catch (err) {
        return { n, failed: [], error: (err.stderr || err.message).trim().split('\n').at(-1) }
    }
}

async function main() {
    const args = process.argv.slice(2)
    let levels = await openAirLevels()
    if (args.length) {
        if (args[0] !== '--level' || !/^\d+$/.test(args[1] ?? '') || args.length > 2) {
            console.error('usage: level-checks [--level N]')
            process.exit(2)
        }
        const n = Number(args[1])
        if (!levels.includes(n)) {
            console.error(`Level ${n} is not an open-air level (open-air: ${levels.join(', ')})`)
            process.exit(2)
        }
        levels = [n]
    }
    let bad = 0
    for (const n of levels) {
        const { failed, error } = await checkLevel(n)
        if (failed.length || error) bad++
        const verdict = error ? `ERROR ${error}` : failed.length ? `FAIL ${failed.join(', ')}` : 'ok'
        console.log(`Level ${n}: ${verdict}`)
    }
    console.log(bad ? `${bad} of ${levels.length} levels failed` : `all ${levels.length} levels passed`)
    process.exit(bad ? 1 : 0)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
