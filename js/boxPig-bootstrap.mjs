import * as boxPig from './boxPig.mjs'

if (typeof globalThis !== 'undefined') {
    globalThis.__boxPig = boxPig
}
