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

            const start = new Date();
            const promises = [];
            for (let file of files) {
                const name = file.name;
                const stream = file.msDetachStream();
                const p = processImage(stream, name);
                promises.push(p);
            }
            await Promise.all(promises);
            const end = new Date();
            console.log(end - start);
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
            calcBounds.width,
            calcBounds.height,
            dpiX,
            dpiY,
            calcBounds.bytes
        );

        await encoder.flushAsync();
        stream && stream.close();
        outputStream && outputStream.close();
    }

    async function getPixelBounds(inputStream) {
        const decoder = await Windows.Graphics.Imaging.BitmapDecoder.createAsync(inputStream);
        const data = await decoder.getPixelDataAsync();

        const bytes = data.detachPixelData();

        const width = decoder.pixelWidth;
        const height = decoder.pixelHeight;

        return await sendToWorker(bytes, width, height);
    }

    function sendToWorker(bytes, width, height) {
        var w = new Worker('js/_worker_pixelProcessor.js');
        w.postMessage({ bytes, width, height });

        return new Promise((resolve, reject) => {
            w.onmessage = (event) => {
                const bytes = event.data.bytes;
                const width = event.data.width;
                const height = event.data.height;

                resolve({ bytes, width, height });
            }
        })
        
    }
})();