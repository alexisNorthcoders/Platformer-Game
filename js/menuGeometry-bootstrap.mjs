import * as menuArt from './menuArt.mjs'
import * as menuGeometry from './menuGeometry.mjs'
import * as menuLayout from './menuLayout.mjs'
import { nineSlice } from './nineSlice.mjs'

if (typeof globalThis !== 'undefined') {
    globalThis.__menuGeom = menuGeometry
    globalThis.__menuLayout = menuLayout
    globalThis.__menuArt = { ...menuArt, nineSlice }
}
