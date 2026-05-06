import * as ContactDamageHelpers from './contactDamageHelpers.mjs'
import {
    collectAttackableEnemiesForPlayerAttack,
    findEnemiesHitByPlayerHammer,
} from './attackTargetSelection.mjs'

globalThis.ContactDamageHelpers = {
    ...ContactDamageHelpers,
    collectAttackableEnemiesForPlayerAttack,
    findEnemiesHitByPlayerHammer,
}
