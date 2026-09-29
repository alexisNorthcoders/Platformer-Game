import { reduceEscapeKey, reducePauseMenuChoice, reduceGameOverRetry, reduceDeathProgress } from './escapeMenuLogic.mjs'
import { clearHeldInputKeys, resetPlayerForNewLevelRun } from './sessionReset.mjs'

globalThis.__gameFlow = {
    reduceEscapeKey,
    reducePauseMenuChoice,
    reduceGameOverRetry,
    reduceDeathProgress,
    clearHeldInputKeys,
    resetPlayerForNewLevelRun,
}
