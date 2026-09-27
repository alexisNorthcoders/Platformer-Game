import { reduceEscapeKey, reducePauseMenuChoice } from './escapeMenuLogic.mjs'
import { clearHeldInputKeys, resetPlayerForNewLevelRun } from './sessionReset.mjs'

globalThis.__gameFlow = {
    reduceEscapeKey,
    reducePauseMenuChoice,
    clearHeldInputKeys,
    resetPlayerForNewLevelRun,
}
