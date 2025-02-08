function getAssetsPositions(data) {
    return data.map(obj => [
        2 * Math.round(obj.x),
        -32 + Math.round((2 * obj.y))
    ]);
}

async function loadAssets(level) {
    try {
        const response = await fetch(`/kings-and-pigs/js/data/levels/Level_${level}.json`);
        if (!response.ok) {
            throw new Error("Failed to load JSON");
        }

        const jsonData = await response.json();
        let platformsData = undefined;
        let enemyData = undefined;
        let kingData = undefined;

        const layerNames = ["collisions", "boxes", "porta", "platform", "enemy", "enemyKing", "diamonds"];
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
        const diamondsLayer = layers["diamonds"];

        const boxesData = boxesLayer.objects.map(obj => ({ x: obj.x, y: obj.y }));
        const portaData = portaLayer.objects.map(obj => ({ x: obj.x, y: obj.y }));
        const diamondsData = diamondsLayer.objects.map(obj => ({ x: obj.x, y: obj.y }));

        if (platformLayer) {
            platformsData = platformLayer.objects.map(obj => ({ x: obj.x, y: obj.y }));
        }
        if (enemyLayer) {
            enemyData = enemyLayer.objects.map(obj => ({ x: obj.x, y: obj.y }));
        }
        if (kingLayer) {
            kingData = kingLayer.objects.map(obj => ({ x: obj.x, y: obj.y }));
        }

        return {
            collisions: collisionsLayer.data,
            boxes: getAssetsPositions(boxesData),
            door: getAssetsPositions(portaData),
            enemy: enemyData ? getAssetsPositions(enemyData) : [],
            platforms: platformsData ? getAssetsPositions(platformsData) : [],
            enemyKing: kingData ? getAssetsPositions(kingData) : [],
            diamonds:  getAssetsPositions(diamondsData)
        };
    } catch (error) {
        console.error(error.message);
        return [];
    }
}
