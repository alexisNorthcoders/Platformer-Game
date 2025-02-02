const data_box_level_1 = [
    {
        "x": 75.0833333333333,
        "y": 192
    },
    {
        "x": 96.8333333333333,
        "y": 192.25
    },
    {
        "x": 84.5833333333333,
        "y": 177
    },
    {
        "x": 321.333333333333,
        "y": 192.5
    },
    {
        "x": 341.583333333333,
        "y": 193
    },
    {
        "x": 330.833333333333,
        "y": 177.5
    }]

function transformDataBox(data) {
    return data.map(obj => [
        2 * Math.round(obj.x),
        -32 + Math.round((2 * obj.y))
    ]);
}

const boxes_level_1 = transformDataBox(data_box_level_1);

console.log(boxes_level_1)
const boxes_level_9 = [[112.609022556391 * 2, 576 - 32 - 192.157894736842]]