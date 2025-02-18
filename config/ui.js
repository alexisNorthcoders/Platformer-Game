const helloDialogue = new DialogBox({
    position: {
        x: player.position.x + 68,
        y: player.position.y - 68,
    },
    imageSrc: './Sprites/13-Dialogue Boxes/Hello In (24x8).png',
    frameRate: 3,
    frameBuffer: 18,
    autoplay: true,
    loop: false,
    animations: {
        helloIn: {
            imageSrc: './Sprites/13-Dialogue Boxes/Hello In (24x8).png',
            frameRate: 3,
            frameBuffer: 18,
            autoplay: true,
            loop: false,
        },
        helloOut: {
            frameRate: 3,
            frameBuffer: 18,
            autoplay: true,
            loop: false,
            imageSrc: './Sprites/13-Dialogue Boxes/Hello Out (24x8).png',
        }
    }
})

const life = new Sprite({
    position: {
        x: 0,
        y: 0
    },
    imageSrc: './img/Live Bar.png'
})

const heart_1 = new Sprite({
    position: {
        x: 22,
        y: 20
    },
    frameRate: 8,
    frameBuffer: 8,
    imageSrc: './Sprites/12-Live and Coins/Small Heart Idle (18x14).png'
})
const heart_2 = new Sprite({
    position: {
        x: 44,
        y: 20
    },
    frameRate: 8,
    frameBuffer: 8,
    imageSrc: './Sprites/12-Live and Coins/Small Heart Idle (18x14).png'
})
const heart_3 = new Sprite({
    position: {
        x: 66,
        y: 20
    },
    frameRate: 8,
    frameBuffer: 8,
    imageSrc: './Sprites/12-Live and Coins/Small Heart Idle (18x14).png'
})

const diamond_1 = new Sprite({
    position: {
        x: 22,
        y: 50
    },
    frameRate: 8,
    frameBuffer: 8,
    imageSrc: './Sprites/12-Live and Coins/Small Diamond (18x14).png'
})
let numberSprites = createNumberSprites(diamondCount);
let enemyNumberSprite = createNumberSprites(EnemyTracker.getEnemyCount(), { x: 50, y: 80 })
const enemy_face = new Sprite({
    position: {
        x: 12,
        y: 70
    },
    frameRate: 4,
    loop: false,
    autoplay: false,
    imageSrc: './Sprites/03-Pig/Dead (34x28).png'
})