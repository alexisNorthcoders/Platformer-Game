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

        const boxesLayer = jsonData.layers.find(layer => layer.name === "boxes");
        const portaLayer = jsonData.layers.find(layer => layer.name === "porta");
        const platformLayer = jsonData.layers.find(layer => layer.name === "platform");

        const boxesData = boxesLayer.objects.map(obj => ({ x: obj.x, y: obj.y }))
        if (portaLayer) {
            portaData = portaLayer.objects.map(obj => ({ x: obj.x, y: obj.y }))
        }

        if (platformLayer) {
            platformsData = platformLayer.objects.map(obj => ({ x: obj.x, y: obj.y }))
        }


        return { door: portaData ? transformDataBox(portaData) : [], boxes: transformDataBox(boxesData), platforms: platformsData ? transformDataBox(platformsData) : [] }
    } else {
        console.error("Failed to load JSON");
        return [];
    }
}

let boxes = {};
let platforms = {};
let doors = {}

for (let i = 1; i <= 9; i++) {
    const { boxes: b, platforms: p, door: d } = loadBoxesSync(i);
    boxes[`level_${i}`] = b;
    platforms[`level_${i}`] = p;
    doors[`level_${i}`] = d;
}

