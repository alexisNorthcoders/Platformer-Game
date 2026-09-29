import { reduceEscapeKey, reducePauseMenuChoice, reduceGameOverChoice, reduceDeathProgress } from './escapeMenuLogic.mjs'
import { clearHeldInputKeys, resetPlayerForNewLevelRun } from './sessionReset.mjs'

globalThis.__gameFlow = {
    reduceEscapeKey,
    reducePauseMenuChoice,
    reduceGameOverChoice,
    reduceDeathProgress,
    clearHeldInputKeys,
    resetPlayerForNewLevelRun,
}
