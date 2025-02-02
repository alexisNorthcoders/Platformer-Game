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

        const boxesLayer = jsonData.layers.find(layer => layer.name === "boxes");

        const boxesData = boxesLayer.objects.map(obj => ({ x: obj.x, y: obj.y }))

        return transformDataBox(boxesData)
    } else {
        console.error("Failed to load JSON");
        return [];
    }
}

const boxes_level_1 = loadBoxesSync(1)
const boxes_level_2 = loadBoxesSync(2)
const boxes_level_3 = loadBoxesSync(3)
const boxes_level_4 = loadBoxesSync(4)
const boxes_level_5 = loadBoxesSync(5)
const boxes_level_6 = loadBoxesSync(6)
const boxes_level_7 = loadBoxesSync(7)
const boxes_level_8 = loadBoxesSync(8)
const boxes_level_9 = loadBoxesSync(9)
