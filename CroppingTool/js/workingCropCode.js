(() => {
    window.workingCropCode = () => {
        const $el = document.getElementById('drop-work');

        $el.ondragover = ev => {
            ev.preventDefault();
        }

        $el.ondrop = async ev => {
            ev.preventDefault();

            let files = Array.from(ev.dataTransfer.files)
                .filter(f => f.name.endsWith('.png'));

            for (let file of files) {
                const name = file.name;
                const stream = file.msDetachStream();
                await processImage(stream, name);
            }
        }
    }

    async function processImage(stream, filename) {
        const calcBounds = await getPixelBounds(stream.cloneStream());

        const decoder = await Windows.Graphics.Imaging.BitmapDecoder.createAsync(stream);

        const pixelFormat = decoder.bitmapPixelFormat;
        const alphaMode = decoder.bitmapAlphaMode;
        const dpiX = decoder.dpiX;
        const dpiY = decoder.dpiY;

        const encoderId = Windows.Graphics.Imaging.BitmapEncoder.pngEncoderId;

        const folder = Windows.Storage.ApplicationData.current.localFolder;
        const outputFile =
            await folder.createFileAsync(filename,
                Windows.Storage.CreationCollisionOption.openIfExists);

        const outputStream = await outputFile.openAsync(Windows.Storage.FileAccessMode.readWrite);
        outputStream.size = 0;
        const encoder = await Windows.Graphics.Imaging.BitmapEncoder.createAsync(encoderId, outputStream);
        encoder.setPixelData(
            pixelFormat,
            alphaMode,
            calcBounds.rightBound - calcBounds.leftBound,
            calcBounds.height,
            dpiX,
            dpiY,
            calcBounds.pixels
        );

        await encoder.flushAsync();
        stream && stream.close();
        outputStream && outputStream.close();
    }

    async function getPixelBounds(inputStream) {
        const decoder = await Windows.Graphics.Imaging.BitmapDecoder.createAsync(inputStream);
        const data = await decoder.getPixelDataAsync();

        const bytes = data.detachPixelData();

        const byteChunks = _.chunk(bytes, 4);

        const alphaBytes = byteChunks.map(chunk => chunk[3]);

        const width = decoder.pixelWidth;
        const height = decoder.pixelHeight;

        const byteArrayArray = [[]];
        alphaBytes.forEach(byte => {
            let lastArray = byteArrayArray[byteArrayArray.length - 1];
            if (lastArray.length === width) {
                lastArray = [];
                byteArrayArray.push(lastArray);
            }
            lastArray.push(byte);
        });

        let leftBound = width;
        let rightBound = 0;

        byteArrayArray.forEach(arr => {
            arr.forEach((byte, index) => {
                if (byte !== 0) {
                    leftBound = Math.min(leftBound, index);
                    rightBound = Math.max(rightBound, index);
                }
            });
        });

        const byteRows = _.chunk(byteChunks, width);

        const newPixels = byteRows.map(arr => {
            return arr.filter((byte, index) => {
                return (index >= leftBound) && (index <= rightBound);
            });
        })
            .reduce((acc, arr) => acc.concat(arr), [])
            .reduce((acc, arr) => acc.concat(arr), []);

        return {
            leftBound, rightBound: rightBound + 1, width, height, pixels: newPixels
        }
    }
})();