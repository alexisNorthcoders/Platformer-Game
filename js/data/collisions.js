const collisionsLevel1 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292,
    292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292,
    292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292,
    292, 292, 292, 0, 0, 0, 0, 0, 0, 292, 0, 0, 0, 0, 0, 292,
    292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

const collisionsLevel2 = [292, 292, 292, 292, 292, 292, 292, 292, 0, 0, 0, 0, 0, 0, 0, 0,
    292, 0, 0, 0, 0, 0, 0, 292, 0, 0, 0, 0, 0, 0, 0, 0,
    292, 0, 0, 0, 0, 0, 0, 292, 0, 0, 0, 0, 0, 0, 0, 0,
    292, 292, 292, 292, 292, 0, 0, 292, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 292, 0, 0, 292, 0, 0, 0, 0, 292, 292, 292, 292,
    0, 292, 292, 292, 292, 0, 0, 292, 292, 292, 292, 292, 292, 0, 0, 292,
    0, 292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292,
    0, 292, 0, 0, 0, 0, 292, 292, 0, 0, 0, 292, 292, 292, 292, 292,
    0, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 0, 0, 0, 0]

const collisionsLevel3 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292,
    0, 292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292,
    0, 292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292, 0, 0, 0, 292,
    0, 292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292, 292, 292, 292, 292,
    0, 292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292, 0,
    0, 292, 0, 0, 0, 0, 292, 0, 0, 0, 0, 0, 0, 0, 292, 0,
    0, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

const collisionsLevel4 = [292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292,
    292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292,
    292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292,
    292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292, 0, 0, 292,
    292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292, 292, 292, 292, 292,
    292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292, 292, 0, 0, 0, 0,
    292, 0, 0, 0, 0, 0, 0, 0, 0, 292, 292, 0, 0, 0, 0, 0,
    292, 0, 0, 0, 0, 0, 0, 0, 292, 292, 0, 0, 0, 0, 0, 0,
    292, 292, 292, 292, 292, 292, 292, 292, 292, 0, 0, 0, 0, 0, 0, 0]

const collisionsLevel5 = [292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292,
    292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292,
    292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292,
    292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292,
    292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292, 292, 292, 292,
    292, 0, 0, 0, 0, 0, 0, 0, 292, 292, 292, 0, 0, 0, 0, 292,
    292, 0, 0, 0, 292, 292, 292, 0, 0, 0, 0, 0, 0, 0, 0, 292,
    292, 0, 292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292,
    292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292]

const collisionsLevel6 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 0, 0, 0, 0, 0, 0,
    292, 0, 0, 292, 0, 0, 0, 0, 0, 292, 0, 0, 0, 0, 0, 0,
    292, 0, 0, 292, 0, 0, 0, 0, 0, 292, 0, 0, 0, 0, 0, 0,
    292, 0, 0, 0, 0, 0, 0, 0, 0, 292, 0, 0, 292, 292, 292, 292,
    292, 0, 0, 0, 0, 0, 0, 0, 0, 292, 292, 292, 292, 0, 0, 292,
    292, 0, 0, 0, 292, 0, 0, 292, 0, 0, 0, 0, 0, 0, 0, 292,
    292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292]

const collisionsLevel7 = [292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292,
    292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292,
    292, 292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292,
    292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292,
    292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292,
    292, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 292, 292, 292,
    292, 292, 292, 292, 0, 0, 0, 292, 0, 0, 0, 292, 0, 0, 0, 292,
    292, 0, 0, 0, 0, 0, 292, 292, 292, 292, 292, 292, 292, 0, 0, 292,
    292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292, 292]