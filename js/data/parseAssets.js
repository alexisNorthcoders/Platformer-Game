function getAssetsPositions(data) {
    return data.map(obj => [
        2 * Math.round(obj.x),
        -32 + Math.round((2 * obj.y))
    ]);
}

/**
 * A Moving Platform's path from its object in the "moving_platform" layer: a
 * rectangle object whose (x, y) is the surface's top-left at the start, with
 * properties dx / dy (travel, map px), period (seconds for a round trip at
 * 60 fps) and optional phase (0..1).
 */
function getMovingPlatformPath(obj, scale) {
    const props = Object.fromEntries((obj.properties ?? []).map(p => [p.name, p.value]))
    const from = { x: scale * obj.x, y: scale * obj.y }
    return {
        from,
        to: { x: from.x + scale * (props.dx ?? 0), y: from.y + scale * (props.dy ?? 0) },
        periodFrames: Math.round((props.period ?? 4) * 60),
        phase: props.phase ?? 0,
    }
}

/**
 * The planks of a Rotating Platform from its object in the "rotating_platform"
 * layer: an object whose (x, y) is the hub, with properties radius (map px),
 * period (seconds a turn at 60 fps), arms (planks, evenly spaced; default 2),
 * optional phase (0..1 of a turn) and direction (1 clockwise, -1 anticlockwise).
 */
function getRotatingPlatformPaths(obj, scale) {
    const props = Object.fromEntries((obj.properties ?? []).map(p => [p.name, p.value]))
    const arms = props.arms ?? 2
    return Array.from({ length: arms }, (_, arm) => ({
        center: { x: scale * obj.x, y: scale * obj.y },
        radius: scale * (props.radius ?? 64),
        periodFrames: Math.round((props.period ?? 8) * 60),
        phase: (props.phase ?? 0) + arm / arms,
        direction: props.direction ?? 1,
    }))
}

async function loadAssets(level, scale) {
    try {
        const response = await fetch(`/kings-and-pigs/js/data/levels/Level_${level}.json`);
        if (!response.ok) {
            throw new Error("Failed to load JSON");
        }

        const jsonData = await response.json();
        let platformsData = undefined;
        let diamondsData = undefined;
        let enemyData = undefined;
        let kingData = undefined;
        let cannonData = undefined;
        let enemyMatchData = undefined;

        const layerNames = ["collisions", "boxes", "porta", "platform", "enemy", "enemyKing", "diamonds", "platform_2", "cannon", "enemy_match", "moving_platform", "rotating_platform"];
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
        const platforms_2Layer = layers["platform_2"];
        const diamondsLayer = layers["diamonds"];
        const cannonLayer = layers["cannon"];
        const enemyMatchLayer = layers["enemy_match"];
        const movingPlatformLayer = layers["moving_platform"];
        const rotatingPlatformLayer = layers["rotating_platform"];

        const boxesData = boxesLayer.objects.map(obj => ({ x: obj.x, y: obj.y }));
        const portaData = portaLayer.objects.map(obj => ({ x: obj.x, y: obj.y }));

        if (platformLayer) {
            platformsData = platformLayer.objects.map(obj => ({ x: obj.x, y: obj.y }));
        }
        if (diamondsLayer) {
            diamondsData = diamondsLayer.objects.map(obj => ({ x: obj.x, y: obj.y }));
        }
        if (enemyLayer) {
            enemyData = enemyLayer.objects.map(obj => ({ x: obj.x, y: obj.y }));
        }
        if (kingLayer) {
            kingData = kingLayer.objects.map(obj => ({ x: obj.x, y: obj.y }));
        }
        if (cannonLayer) {
            cannonData = cannonLayer.objects.map(obj => ({ x: obj.x, y: obj.y }));
        }
        if (enemyMatchLayer) {
            enemyMatchData = enemyMatchLayer.objects.map(obj => ({ x: obj.x, y: obj.y }));
        }

        return {
            platforms_2: platforms_2Layer ? platforms_2Layer.data : [],
            collisions: collisionsLayer.data,
            boxes: getAssetsPositions(boxesData),
            door: getAssetsPositions(portaData),
            enemy: enemyData ? getAssetsPositions(enemyData) : [],
            platforms: platformsData ? getAssetsPositions(platformsData) : [],
            enemyKing: kingData ? getAssetsPositions(kingData) : [],
            diamonds: diamondsData ? getAssetsPositions(diamondsData) : [],
            mapColumns: jsonData.width,
            levelWidth: jsonData.width * scale * 32,
            cannon: cannonData ? getAssetsPositions(cannonData) : [],
            enemyMatch: enemyMatchData ? getAssetsPositions(enemyMatchData) : [],
            movingPlatforms: [
                ...(movingPlatformLayer ? movingPlatformLayer.objects.map(obj => getMovingPlatformPath(obj, scale)) : []),
                ...(rotatingPlatformLayer ? rotatingPlatformLayer.objects.flatMap(obj => getRotatingPlatformPaths(obj, scale)) : []),
            ],
        };
    } catch (error) {
        console.error(error.message);
        return [];
    }
}
