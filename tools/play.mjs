#!/usr/bin/env node
/**
 * Drives the game in headless Chromium for scripted level checks, with no npm
 * dependencies (Node 22+ and a Chromium on the PATH). It serves the repo under
 * /kings-and-pigs/, opens index.html, and runs the steps given on the command
 * line in order:
 *
 *   node tools/play.mjs --level 20 \
 *       --eval 'player.setPosition({ x: 900, y: 296 }); step(60); return player.position' \
 *       --shot /tmp/l20.png
 *
 *   --level N     start level N (fade-in skipped, input on)
 *   --eval JS     run JS in the page as the body of an async function; its
 *                 return value is printed as JSON. Page globals (player,
 *                 camera, movingPlatforms, keys, ...) are in scope.
 *   --file PATH   like --eval, with the body read from a file
 *   --shot PATH   save a PNG of the canvas as the game last drew it
 *
 * requestAnimationFrame is switched off, so the game only moves when a script
 * steps it: step(n) runs n frames. Frames are deterministic between calls.
 * Helpers in the page: step(n), hold(key, frames) for 'a' | 'd' | 'w' | 'space'
 * | 's', and play(level). Set CHROMIUM to pick a browser binary.
 */

import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PREFIX = '/kings-and-pigs/'
const TYPES = {
    '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
    '.png': 'image/png', '.css': 'text/css', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.svg': 'image/svg+xml',
}

// In the page before any game script: no animation loop of its own, plus the
// step helpers. gsap ticks on requestAnimationFrame too, so fades never run;
// play() skips the fade-in by hand.
const PAGE_SETUP = `
window.requestAnimationFrame = () => 0
window.step = n => { for (let i = 0; i < (n ?? 1); i++) animate() }
window.hold = (key, frames) => { keys[key].pressed = true; step(frames); keys[key].pressed = false }
window.play = async level => {
    await startGame(level)
    // Sprites draw nothing until their image has loaded.
    const layers = () => [background, sky, far, ...movingPlatforms].filter(Boolean)
    for (let i = 0; i < 200 && !layers().every(s => s.loaded); i++) await new Promise(r => setTimeout(r, 50))
    overlay.opacity = 0
    player.preventInput = false
    step(1)
}
`

function parseArgs(argv) {
    const steps = []
    for (let i = 0; i < argv.length; i++) {
        const flag = argv[i]
        const value = argv[++i]
        if (value === undefined) throw new Error(`${flag} needs a value`)
        if (flag === '--level') steps.push({ eval: `await play(${Number(value)})` })
        else if (flag === '--eval') steps.push({ eval: value })
        else if (flag === '--file') steps.push({ file: value })
        else if (flag === '--shot') steps.push({ shot: value })
        else throw new Error(`unknown flag ${flag}`)
    }
    return steps
}

function serve() {
    const server = createServer(async (req, res) => {
        const url = decodeURIComponent(new URL(req.url, 'http://x').pathname)
        const file = path.join(ROOT, url.startsWith(PREFIX) ? url.slice(PREFIX.length) : url)
        if (!file.startsWith(ROOT)) return res.writeHead(403).end()
        try {
            const body = await readFile(file)
            res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' }).end(body)
        } catch {
            res.writeHead(404).end()
        }
    })
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)))
}

async function launchChromium(profile) {
    const binary = process.env.CHROMIUM ?? 'chromium'
    const proc = spawn(binary, [
        '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
        '--mute-audio', '--autoplay-policy=no-user-gesture-required', '--window-size=1100,700', 'about:blank',
    ], { stdio: ['ignore', 'ignore', 'pipe'] })
    const wsUrl = await new Promise((resolve, reject) => {
        let log = ''
        const timer = setTimeout(() => reject(new Error(`Chromium did not start:\n${log}`)), 30000)
        proc.stderr.on('data', chunk => {
            log += chunk
            const match = log.match(/DevTools listening on (ws:\S+)/)
            if (match) {
                clearTimeout(timer)
                resolve(match[1])
            }
        })
        proc.on('exit', code => reject(new Error(`Chromium exited (${code}):\n${log}`)))
    })
    return { proc, wsUrl }
}

/** A minimal DevTools protocol client over one browser WebSocket. */
async function connect(wsUrl) {
    const ws = new WebSocket(wsUrl)
    await new Promise((resolve, reject) => {
        ws.onopen = resolve
        ws.onerror = reject
    })
    let nextId = 1
    const pending = new Map()
    const listeners = []
    ws.onmessage = ({ data }) => {
        const msg = JSON.parse(data)
        if (msg.id && pending.has(msg.id)) {
            const { resolve, reject } = pending.get(msg.id)
            pending.delete(msg.id)
            msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
        } else if (msg.method) {
            listeners.forEach(listener => listener(msg))
        }
    }
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
        const id = nextId++
        pending.set(id, { resolve, reject })
        ws.send(JSON.stringify({ id, method, params, sessionId }))
    })
    const once = (method, sessionId) => new Promise(resolve => {
        listeners.push(function listener(msg) {
            if (msg.method === method && msg.sessionId === sessionId) {
                listeners.splice(listeners.indexOf(listener), 1)
                resolve(msg.params)
            }
        })
    })
    return { send, once, listeners, close: () => ws.close() }
}

async function main() {
    const steps = parseArgs(process.argv.slice(2))
    const server = await serve()
    const profile = await mkdtemp(path.join(tmpdir(), 'play-chromium-'))
    const { proc, wsUrl } = await launchChromium(profile)
    let failed = false
    try {
        const cdp = await connect(wsUrl)
        const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
        const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
        const page = (method, params) => cdp.send(method, params, sessionId)
        cdp.listeners.push(msg => {
            if (msg.sessionId !== sessionId) return
            if (msg.method === 'Runtime.exceptionThrown') console.error('page error:', msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text)
            if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
                console.error('console.error:', msg.params.args.map(a => a.value ?? a.description).join(' '))
            }
        })
        await page('Runtime.enable')
        await page('Page.enable')
        await page('Emulation.setDeviceMetricsOverride', { width: 1100, height: 700, deviceScaleFactor: 1, mobile: false })
        await page('Page.addScriptToEvaluateOnNewDocument', { source: PAGE_SETUP })
        const loaded = cdp.once('Page.loadEventFired', sessionId)
        await page('Page.navigate', { url: `http://127.0.0.1:${server.address().port}${PREFIX}index.html` })
        await loaded
        await evaluate(page, `
            for (let i = 0; i < 200 && !(typeof startGame === 'function' && globalThis.__movingPlatform && globalThis.__gameFlow); i++) {
                await new Promise(r => setTimeout(r, 50))
            }`)

        for (const s of steps) {
            if (s.shot) {
                const { data } = await page('Page.captureScreenshot', { format: 'png', clip: await canvasClip(page) })
                await writeFile(s.shot, Buffer.from(data, 'base64'))
                console.log(`saved ${s.shot}`)
                continue
            }
            const body = s.file ? await readFile(s.file, 'utf8') : s.eval
            const value = await evaluate(page, body)
            if (value !== undefined) console.log(JSON.stringify(value, null, 1))
        }
    } catch (err) {
        console.error(err.message)
        failed = true
    } finally {
        proc.kill()
        server.close()
        await rm(profile, { recursive: true, force: true }).catch(() => {})
    }
    process.exit(failed ? 1 : 0)
}

async function evaluate(page, body) {
    const { result, exceptionDetails } = await page('Runtime.evaluate', {
        expression: `(async () => { ${body}\n})()`,
        awaitPromise: true,
        returnByValue: true,
    })
    if (exceptionDetails) {
        throw new Error(`in page: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`)
    }
    return result.value
}

async function canvasClip(page) {
    const rect = await evaluate(page, `const r = document.querySelector('canvas').getBoundingClientRect()
        return { x: r.x, y: r.y, width: r.width, height: r.height }`)
    return { ...rect, scale: 1 }
}

main()
