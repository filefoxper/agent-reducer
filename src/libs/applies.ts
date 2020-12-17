import {Runtime, NextProcess, MiddleWare, LifecycleMiddleWare, LifecycleRuntime} from "./global.type";
import {isPromise} from "./util";

export function composeCallArray(calls: ((p: any) => any)[]) {
    const callList = [...calls].reverse();
    return function (p: any): any | void {
        return callList.reduce((result: any, call: (p: any) => any) => call(result), p);
    }
}

export function defaultMiddleWare<T>(runtime: Runtime) {
    // 支持1.+.+版本
    if (runtime.env.legacy) {
        return function nextResolver(next: (result: any) => any) {
            return function stateResolver(result: any) {
                if (isPromise(result) || result === undefined) {
                    return result;
                }
                return next(result);
            }
        }
    }
    return function nextProcess(next: (result: any) => any) {
        return function stateProcess(result: any) {
            return next(result);
        }
    }
}

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