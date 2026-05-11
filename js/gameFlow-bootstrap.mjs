import { reduceEscapeKey } from './escapeMenuLogic.mjs'
import { clearHeldInputKeys, resetPlayerForNewLevelRun } from './sessionReset.mjs'

globalThis.__gameFlow = {
    reduceEscapeKey,
    clearHeldInputKeys,
    resetPlayerForNewLevelRun,
}
