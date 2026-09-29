import { reduceEscapeKey, reducePauseMenuChoice, reduceGameOverChoice, reduceDeathProgress, gameOverMenuReady, gameOverDimAlpha } from './escapeMenuLogic.mjs'
import { clearHeldInputKeys, resetPlayerForNewLevelRun } from './sessionReset.mjs'

globalThis.__gameFlow = {
    reduceEscapeKey,
    reducePauseMenuChoice,
    reduceGameOverChoice,
    reduceDeathProgress,
    gameOverMenuReady,
    gameOverDimAlpha,
    clearHeldInputKeys,
    resetPlayerForNewLevelRun,
}
