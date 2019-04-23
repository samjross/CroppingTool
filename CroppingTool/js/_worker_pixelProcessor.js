importScripts('lodash.js');

onmessage = function (event) {
    if (event.data.bytes) {
        processBytes(event.data.bytes, event.data.width, event.data.height);
    }
};

function processBytes(bytes, width, height) {
    const byteChunks = _.chunk(bytes, 4);
    // const alphaBytes = byteChunks.map(chunk => chunk[3]);

    //const byteArrayArray = [[]];
    //alphaBytes.forEach(byte => {
    //    let lastArray = byteArrayArray[byteArrayArray.length - 1];
    //    if (lastArray.length === width) {
    //        lastArray = [];
    //        byteArrayArray.push(lastArray);
    //    }
    //    lastArray.push(byte);
    //});

    const byteRows = _.chunk(byteChunks, width);

    let leftBound = width;
    let rightBound = 0;

    byteRows.forEach(arr => {
        arr.forEach((byte, index) => {
            if (byte[3] !== 0) { // this is the alpha pixel
                leftBound = Math.min(leftBound, index);
                rightBound = Math.max(rightBound, index);
            }
        });
    });

    const newPixels = byteRows.map(arr => {
        return arr.filter((byte, index) => {
            return (index >= leftBound) && (index <= rightBound);
        });
    });

    const newHeight = newPixels.length;
    const newWidth = newPixels[0].length;

    const px = _.flattenDeep(newPixels);
    this.postMessage({ bytes: px, width: newWidth, height: newHeight });
}
