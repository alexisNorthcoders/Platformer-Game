const levels = {
    1: { playerPosition: { x: 50, y: 200 }, lastDirection: 'right' },
    2: { playerPosition: { x: 170, y: 41 }, lastDirection: 'right' },
    3: { playerPosition: { x: 770, y: 100 }, lastDirection: 'left' },
    4: { playerPosition: { x: 100, y: 500 }, lastDirection: 'right' },
    5: { playerPosition: { x: 30, y: 400 }, lastDirection: 'right' },
    6: { playerPosition: { x: 80, y: 500 }, lastDirection: 'right' },
    7: { playerPosition: { x: 170, y: 41 }, lastDirection: 'right' },
    8: { playerPosition: { x: 50, y: 500 }, lastDirection: 'right' },
    9: { playerPosition: { x: 800, y: 300 }, lastDirection: 'left' },
    10: { playerPosition: { x: 800, y: 100 }, lastDirection: 'left' },
    11: { playerPosition: { x: 34, y: 425 }, lastDirection: 'right' },
    12: { playerPosition: { x: 34, y: 325 }, lastDirection: 'right' },
    13: { playerPosition: { x: 34, y: 325 }, lastDirection: 'right' },
    14: { playerPosition: { x: 860, y: 70 }, lastDirection: 'left' },
    15: { playerPosition: { x: 50, y: 500 }, lastDirection: 'right' },
    16: { playerPosition: { x: 1890, y: 100 }, lastDirection: 'left' },
    17: { playerPosition: { x: 30, y: 400 }, lastDirection: 'right' },
    // Sky Moat (built by tools/levels/level_18.py): falling in the water sends
    // the King back to the last Checkpoint he passed.
    18: {
        playerPosition: { x: 100, y: 296 },
        lastDirection: 'right',
        water: { top: 496 },
        // The sky scrolls at `parallax` × the camera's speed behind the terrain.
        backdrop: { sky: './img/Level 18 sky.png', terrain: './img/Level 18 terrain.png', parallax: 0.3 },
        checkpoints: [
            { x: 1057, y: 232 },
            { x: 1790, y: 104 },
            { x: 2850, y: 232 },
            { x: 3521, y: 40 },
            { x: 4130, y: 232 },
            { x: 4642, y: 168 },
            { x: 5730, y: 40 },
        ],
    },
    // Sinking Sands (built by tools/levels/level_19.py): quicksand instead of
    // water, a low sun that stays put in the view, and red-tinted Pigs.
    19: {
        playerPosition: { x: 100, y: 296 },
        lastDirection: 'right',
        sand: { top: 496 },
        // `far` is drawn fixed to the view, behind the parallax sky.
        backdrop: {
            far: './img/Level 19 far.png',
            sky: './img/Level 19 sky.png',
            terrain: './img/Level 19 terrain.png',
            parallax: 0.3,
        },
        // A colour washed over every enemy sprite (source-atop), CSS syntax.
        enemyTint: 'rgba(230, 30, 20, 0.5)',
        checkpoints: [
            { x: 1250, y: 232 },
            { x: 2082, y: 232 },
            { x: 2790, y: 104 },
            { x: 3938, y: 168 },
            { x: 5300, y: 168 },
            { x: 5490, y: 104 },
            { x: 6178, y: 168 },
        ],
    },
    // Moonlit Thicket (built by tools/levels/level_20.py): a night forest, tall
    // grass instead of water, and a Rotating Platform over the first gap.
    20: {
        playerPosition: { x: 100, y: 296 },
        lastDirection: 'right',
        grass: { top: 496 },
        // `far` (night sky, stars and the moon) is drawn fixed to the view.
        backdrop: {
            far: './img/Level 20 far.png',
            sky: './img/Level 20 sky.png',
            terrain: './img/Level 20 terrain.png',
            parallax: 0.3,
        },
        checkpoints: [
            { x: 1570, y: 232 },
            { x: 2210, y: 232 },
            { x: 3554, y: 232 },
            { x: 4002, y: 104 },
            { x: 5218, y: 104 },
            { x: 6210, y: 40 },
            { x: 6882, y: 168 },
        ],
    },
    // Caldera (built by tools/levels/level_21.py): a lava floor under a smoky
    // sky and a volcano, two Rotating Platforms and two Helix Platforms.
    21: {
        playerPosition: { x: 100, y: 296 },
        lastDirection: 'right',
        lava: { top: 496 },
        // `far` (smoky sky and the volcano) is drawn fixed to the view.
        backdrop: {
            far: './img/Level 21 far.png',
            sky: './img/Level 21 sky.png',
            terrain: './img/Level 21 terrain.png',
            parallax: 0.3,
        },
        // Yellow Pigs, glowing hot; Boxes of grey iron ('color' blend keeps their shading).
        enemyTint: 'rgba(255, 200, 0, 0.75)',
        enemyGlow: 'rgba(255, 140, 20, 0.95)',
        boxTint: 'rgb(150, 158, 170)',
        checkpoints: [
            { x: 1320, y: 168 },
            { x: 1984, y: 168 },
            { x: 2620, y: 168 },
            { x: 3370, y: 168 },
            { x: 4040, y: 168 },
            { x: 4330, y: 104 },
            { x: 4960, y: 104 },
        ],
    },
};
