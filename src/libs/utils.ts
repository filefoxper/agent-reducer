export function isUndefined(data: any): data is undefined {
    return data === undefined;
}

export function isPromise(data: any): data is Promise<any> {
    if (!data) {
        return false;
    }
    const dataType = typeof data;
    return (dataType === 'object' || dataType === 'function') && typeof data.then === 'function';
}

export function createProxy<T extends object>(source: T, proxyHandler: ProxyHandler<T>): T {
    const proxy = new Proxy(source, proxyHandler);
    return proxy as T;
}

export function shallowCopy<T extends object>(source: T): T {
    return Object.create(Object.getPrototypeOf(source), Object.getOwnPropertyDescriptors(source));
}

export function composeCallArray(calls: ((p: any) => any)[]) {
    const callList = [...calls].reverse();
    return function (p: any): any | void {
        return callList.reduce((result: any, call: (p: any) => any) => call(result), p);
    }
}