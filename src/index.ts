export type Loader = () => Promise<any>;

export function batch(batchNumber: number, loaders: Loader[], gap = 30) {
    const start = Date.now();
    let index = 0;
    let worker = 0;
    const resAll: any[] = [];

    return new Promise((resolve, reject) => {
        function loop() {
            const tmpIdx = index;
            loaders[index]().then((res) => {
                if (index < loaders.length) {
                    loop();
                    index++;
                    resAll[tmpIdx] = res;
                } else {
                    worker--;
                    if (worker === 0) {
                        resolve(resAll)
                        console.info('用时', (Date.now() - start) / 1000, '秒')
                    }
                }
            }).catch((ex) => {
                reject({ index: tmpIdx, error: ex })
            })
        }

        const handle = setInterval(() => {
            loop();
            index++;
            worker++;
            if (worker >= batchNumber) {
                clearInterval(handle)
            }
        }, gap);
    })
}