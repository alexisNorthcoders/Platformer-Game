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

        const boxesLayer = jsonData.layers.find(layer => layer.name === "boxes");

        const boxesData = boxesLayer.objects.map(obj => ({ x: obj.x, y: obj.y }))

        const platformLayer = jsonData.layers.find(layer => layer.name === "platform");

        if (platformLayer) {
            platformsData = platformLayer.objects.map(obj => ({ x: obj.x, y: obj.y }))
        }

        return { boxes: transformDataBox(boxesData), platforms: platformsData ? transformDataBox(platformsData) : [] }
    } else {
        console.error("Failed to load JSON");
        return [];
    }
}

const boxes_level_1 = loadBoxesSync(1).boxes
const boxes_level_2 = loadBoxesSync(2).boxes
const boxes_level_3 = loadBoxesSync(3).boxes
const boxes_level_4 = loadBoxesSync(4).boxes
const boxes_level_5 = loadBoxesSync(5).boxes
const boxes_level_6 = loadBoxesSync(6).boxes
const boxes_level_7 = loadBoxesSync(7).boxes

const boxes_level_8 = loadBoxesSync(8).boxes
const platforms_level_8 = loadBoxesSync(8).platforms

const boxes_level_9 = loadBoxesSync(9)
