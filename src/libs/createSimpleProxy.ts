export const createSimpleProxy = <T extends object>(target: T, handler: ProxyHandler<T>):T => {
    return new Proxy(target,handler);
};