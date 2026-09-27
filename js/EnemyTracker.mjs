const EnemyTracker = (function () {
    let enemyCount = 0
    let levelEnemies = 0
    let initialEnemies = 0

    return {
        resetSession: () => {
            enemyCount = 0
            levelEnemies = 0
            initialEnemies = 0
        },
        initializeLevel: (count) => {
            levelEnemies = count
            initialEnemies = count
        },
        increaseEnemyCount: () => {
            enemyCount++
            levelEnemies--
            return enemyCount
        },
        getEnemyCount: () => enemyCount,
        /** Back to the count on entering the level (Restart Level). */
        setEnemyCount: (count) => {
            enemyCount = count
        },
        isLevelHalfCleared: () => levelEnemies <= initialEnemies / 2,
    }
})()

if (typeof globalThis !== 'undefined') {
    globalThis.EnemyTracker = EnemyTracker
}

export default EnemyTracker
