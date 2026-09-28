import * as bomb from './bomb.mjs'
import { BOMB_SHEETS } from './spriteAnimation.mjs'

if (typeof globalThis !== 'undefined') {
    globalThis.__bomb = { ...bomb, BOMB_SHEETS }
}
