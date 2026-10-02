import * as boss from './boss.mjs'

if (typeof globalThis !== 'undefined') {
    globalThis.__boss = boss
}
