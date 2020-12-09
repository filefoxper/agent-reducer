import {Runtime, NextProcess, MiddleWare, LifecycleMiddleWare, LifecycleRuntime} from "./global.type";

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

export function composeCallArray(calls: ((p: any) => any)[]) {
    const callList = [...calls].reverse();
    return function (p: any): any | void {
        return callList.reduce((result: any, call: (p: any) => any) => call(result), p);
    }
}

export function defaultMiddleWare<T>(runtime: Runtime<T>) {
    return function nextResolver(next: (result: any) => any) {
        return function stateResolver(result: any) {
            if (runtime.env.reduceOnly) {
                return next(result);
            }
            if (isPromise(result) || isUndefined(result)) {
                return result;
            }
            return next(result);
        }
    }
}

/**
 * @deprecated
 */
export const defaultResolver = defaultMiddleWare;

export function applyMiddleWares(...resolvers: (MiddleWare | LifecycleMiddleWare)[]) {

    function isAllValidated(nextResolvers: Array<NextProcess | void>): nextResolvers is Array<NextProcess> {
        return nextResolvers.every((nextResolver): nextResolver is NextProcess => !!nextResolver);
    }

    function isLifecycleMiddleWare(resolver: (MiddleWare | LifecycleMiddleWare)): resolver is LifecycleMiddleWare {
        return (resolver as LifecycleMiddleWare).lifecycle;
    }

    const shouldBeLifecycle = resolvers.some(isLifecycleMiddleWare);

    const mdw = function totalResolver<T>(cache: Runtime<T>) {
        const nextResolvers = [...resolvers].concat(defaultMiddleWare).map((resolver) => {
            if (isLifecycleMiddleWare(resolver)) {
                return resolver(cache as LifecycleRuntime<T>);
            }
            return resolver(cache);
        });
        if (!isAllValidated(nextResolvers)) {
            return;
        }
        return composeCallArray(nextResolvers);
    }
    mdw.lifecycle = shouldBeLifecycle;
    return mdw;
}

/**
 * @deprecated
 */
export const applyResolvers = applyMiddleWares;