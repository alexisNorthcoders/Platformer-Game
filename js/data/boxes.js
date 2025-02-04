function transformDataBox(data) {
    return data.map(obj => [
        2 * Math.round(obj.x),
        -32 + Math.round((2 * obj.y))
    ]);
}

function loadBoxesSync(level) {
    let request = new XMLHttpRequest();
    request.open("GET", `/kings-and-pigs/js/data/levels/Level_${level}.json`, false);
    request.send(null);

    if (request.status === 200) {
        const jsonData = JSON.parse(request.responseText);
        let platformsData = undefined
        let portaData = undefined
        let enemyData = undefined
        let kingData = undefined

        const layerNames = ["boxes", "porta", "platform", "enemy", "enemyKing"];
        const layers = jsonData.layers.reduce((acc, layer) => {
            if (layerNames.includes(layer.name)) {
                acc[layer.name] = layer;
            }
            return acc;
        }, {});

        const boxesLayer = layers["boxes"];
        const portaLayer = layers["porta"];
        const platformLayer = layers["platform"];
        const enemyLayer = layers["enemy"];
        const kingLayer = layers["enemyKing"];

        const boxesData = boxesLayer.objects.map(obj => ({ x: obj.x, y: obj.y }))
        if (portaLayer) {
            portaData = portaLayer.objects.map(obj => ({ x: obj.x, y: obj.y }))
        }
        if (platformLayer) {
            platformsData = platformLayer.objects.map(obj => ({ x: obj.x, y: obj.y }))
        }
        if (enemyLayer) {
            enemyData = enemyLayer.objects.map(obj => ({ x: obj.x, y: obj.y }))
        }
        if (kingLayer) {
            kingData = kingLayer.objects.map(obj => ({ x: obj.x, y: obj.y }))
        }

        return {
            enemy: enemyData ? transformDataBox(enemyData) : [],
            door: portaData ? transformDataBox(portaData) : [],
            boxes: transformDataBox(boxesData),
            platforms: platformsData ? transformDataBox(platformsData) : [],
            kingPig: kingData ? transformDataBox(kingData) : []
        }
    } else {
        console.error("Failed to load JSON");
        return [];
    }
}

let boxes = {};
let platforms = {};
let doors = {}
let enemies = {}
let kingPig = {}

