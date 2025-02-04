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
        let enemyData = undefined
        let kingData = undefined

        const layerNames = ["collisions", "boxes", "porta", "platform", "enemy", "enemyKing"];
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
        const collisionsLayer = layers["collisions"];

        const boxesData = boxesLayer.objects.map(obj => ({ x: obj.x, y: obj.y }))
        const portaData = portaLayer.objects.map(obj => ({ x: obj.x, y: obj.y }))

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
            collisions: collisionsLayer.data,
            boxes: transformDataBox(boxesData),
            door: transformDataBox(portaData),
            enemy: enemyData ? transformDataBox(enemyData) : [],
            platforms: platformsData ? transformDataBox(platformsData) : [],
            kingPig: kingData ? transformDataBox(kingData) : []
        }
    } else {
        console.error("Failed to load JSON");
        return [];
    }
}