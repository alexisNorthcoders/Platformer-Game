const EnemyTracker = (function () {
    let enemyCount = 0;
    let levelEnemies = 0;
    let initialEnemies = 0;

    return {
        initializeLevel: (count) => {
            levelEnemies = count;
            initialEnemies = count;
        },
        increaseEnemyCount: () => {
            enemyCount++;
            levelEnemies--;
            return enemyCount
        },
        getEnemyCount: () => enemyCount,
        isLevelHalfCleared: () => levelEnemies <= initialEnemies / 2
    };
})();
