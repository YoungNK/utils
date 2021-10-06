export type Loader = () => Promise<any>;

const defaultGap = 30;

/**
 * gap default = 30ms
 */
export interface IExtraOption {
    gap: number,
}

export interface FixedExtraOption extends IExtraOption {
    cbkGap: number,
}

export function batch(batchNumber: number, loaders: Loader[], option: IExtraOption): Promise<any[]> {
    const start = Date.now();
    let index = 0;
    let worker = 0;
    const resAll: any[] = [];

    return new Promise((resolve, reject) => {
        function loop() {
            const tmpIdx = index;
            loaders[tmpIdx]().then((res) => {
                resAll[tmpIdx] = res;
                if (index < loaders.length) {
                    loop();
                    index++;
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
            if (worker >= batchNumber || worker >= loaders.length) {
                clearInterval(handle)
            }
        }, option.gap || defaultGap);
    })
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

type CBK = (res: any[]) => void
/**
 * 固定频率发送
 * @param loaders 
 * @param option 
 */
export async function btachFixedGap(loaders: Loader[], option: FixedExtraOption, cbk: CBK) {
    let i = 0;
    const res: any[] = [];
    let done = 0;
    let start = Date.now();
    let cbkIdx = 0;
    function callCbk() {
        const idx = (Date.now() - start) / option.cbkGap;
        if (idx > cbkIdx) {
            cbkIdx = idx;
            cbk(res);
        }
    }
    while (i < loaders.length) {
        const tmp = i;
        loaders[i]().then((res) => {
            res[tmp] = res;
            done++;
        }).catch((err) => {
            throw err;
        })
        sleep(option.gap || defaultGap)
        callCbk()
    }
    while (done < loaders.length) {
        sleep(option.cbkGap);
        callCbk();
    }
    cbk(res);
    return res;
}