export type Loader = () => Promise<any>;

/**
 * gap default = 30ms
 * retryTime default = 1 , no retry
 */
export interface IExtraOption {
    gap: number,
    retryTime: number
}

export function batch(batchNumber: number, loaders: Loader[], option: IExtraOption): Promise<any[]> {
    const start = Date.now();
    let index = 0;
    let worker = 0;
    const resAll: any[] = [];

    return new Promise((resolve, reject) => {
        function loop() {
            const tmpIdx = index;
            retryCall(loaders[index], option.retryTime || 1, 1).then((res) => {
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
        }, option.gap || 30);
    })
}

export async function retryCall(loader: Loader, maxTimes: number, times = 1): Promise<any> {
    try {
        return await loader();
    } catch (ex) {
        console.warn(ex)
        console.warn('retry ', times)
        await sleep(20);
        if (times < maxTimes) {
            return await retryCall(loader, maxTimes, times + 1)
        } else {
            throw ex;
        }
    }
}

export function sleep(dur: number) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(true);
        }, dur)
    })
}

export function PromisWithTimeout<T>(promise: Promise<T>, dur: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const handle = setTimeout(() => {
            reject(new Error('timeout'));
        }, dur)
        promise.then((res) => {
            clearTimeout(handle)
            resolve(res)
        }).catch((err) => {
            clearTimeout(handle)
            reject(err)
        });
    })
}