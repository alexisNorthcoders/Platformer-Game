import { reduceEscapeKey, reducePauseMenuChoice, reduceGameOverRetry } from './escapeMenuLogic.mjs'
import { clearHeldInputKeys, resetPlayerForNewLevelRun } from './sessionReset.mjs'

globalThis.__gameFlow = {
    reduceEscapeKey,
    reducePauseMenuChoice,
    reduceGameOverRetry,
    clearHeldInputKeys,
    resetPlayerForNewLevelRun,
}
