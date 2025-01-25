Array.prototype.parse2D = function() {
    let step;
    if (this.length === 144) step = 16
    else step = 30

    const rows = []
    for (let i=0;i< this.length; i+= step){
        rows.push(this.slice(i, i+step))
    }
    return rows
}

Array.prototype.createObjectsFrom2D = function () {
    const objects = []
    this.forEach( (row,y) => {
    row.forEach( (symbol,x) => {
        if (symbol === 292) {
            // push a new collision into collisionBlocks array
            objects.push(new CollisionBlock({
                position:{
                    x:x * 64,
                    y: y * 64
                }
            }))
        }
    })
})
return objects }