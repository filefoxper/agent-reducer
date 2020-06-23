export function isUndefined(data:any): data is undefined {
    return data === undefined;
}

export function isPromise(data:any): data is Promise<any> {
    if (!data) {
        return false;
    }
    return typeof data.then === 'function' && typeof data.catch === 'function';
}

export function createProxy<T extends object>(source: T, proxyHandler: ProxyHandler<T>): T {
    const proxy = new Proxy(source, proxyHandler);
    return proxy as T;
}

export function shallowCopy<T extends object>(source:T):T {
    return Object.create(Object.getPrototypeOf(source),Object.getOwnPropertyDescriptors(source));
}