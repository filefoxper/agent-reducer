import {
    MiddleWare,
    NextProcess,
    OriginAgent,
    Runtime,
    StateProcess
} from "./global.type";
import {isObject, isPromise} from "./util";
import {isAgent} from "./defines";

export class MiddleWares {

    static takePromiseResolve(): MiddleWare {

        return function () {

            return function (next: StateProcess): StateProcess {

                return function (result: any) {
                    if (!isPromise(result)) {
                        return next(result);
                    }
                    return result.then((data: any) => {
                        return next(data);
                    });
                }
            }
        }

    }

    static takeAssignable(): MiddleWare {

        return function (runtime: Runtime) {
            const {target} = runtime;
            const state = (target as OriginAgent).state;
            return function (next: StateProcess): StateProcess {

                return function (result: any) {
                    if (!isAgent(target) || !isObject(result) || !isObject(state)) {
                        return next(result);
                    }
                    const copy = Object.create(Object.getPrototypeOf(state), Object.getOwnPropertyDescriptors(state));
                    return next(Object.assign(copy, result));
                }
            }
        }
    }

    static takeBlock(blockMs?: number): MiddleWare {

        return function <T>(runtime: Runtime<T>): NextProcess | void {
            let {cache} = runtime;
            const now = new Date().getTime();
            if (cache.running && (blockMs === undefined || (now - cache.running < blockMs))) {
                return;
            }
            cache.running = now;
            return function (next: StateProcess) {

                return function (result: any): StateProcess {
                    if (isPromise(result)) {
                        const data = next(result);
                        result.finally(() => {
                            cache.running = undefined;
                        });
                        return data;
                    }
                    cache.running = undefined;
                    return next(result);
                }

            }

        }
    }

    static takeLazy(waitMs: number): MiddleWare {
        return MiddleWares.takeDebounce(waitMs);
    }

    static takeThrottle(waitMs: number): MiddleWare {

        return function <T>(runtime: Runtime<T>): NextProcess | void {

            function timeout(lastCallerInfo: { caller: Function, args: any[], target: T }) {
                if (!lastCallerInfo) {
                    return;
                }
                const {caller, args, target} = lastCallerInfo;
                caller.apply(target, args || []);
            }

            let {cache, caller, args, target} = runtime;
            const {lastTime} = cache;
            if (lastTime !== undefined) {
                cache.lastCallerInfo = {caller, args, target};
                return;
            }
            cache.lastTime = new Date().getTime();
            setTimeout(() => {
                cache.lastTime = undefined;
                timeout(cache.lastCallerInfo);
                cache.lastCallerInfo = undefined;
            }, waitMs);
            return function (next: StateProcess): StateProcess {

                return function (result: any) {
                    return next(result);
                }

            }

        }

    }

    static takeDebounce(waitMs: number, opt?: { leading?: boolean }): MiddleWare {

        const {leading} = opt || {};

        function timeout<T>(runtime: Runtime<T>) {
            const now = new Date().getTime();
            const {cache, caller, target, args} = runtime;
            const last = cache.last;
            if (now - (last === undefined ? now : last) < waitMs) {
                return;
            }
            caller.apply(target, args || []);
        }

        return leading ?
            function <T>(runtime: Runtime<T>): NextProcess | void {
                let {cache, caller, args, target} = runtime;
                const now = new Date().getTime();
                const last = cache.last;
                if (last === undefined) {
                    cache.last = now;
                    return function (next: StateProcess): StateProcess {

                        return function (result: any) {
                            return next(result);
                        }

                    }
                }
                if (now - last < waitMs) {
                    cache.last = now;
                } else {
                    cache.last = undefined;
                    caller.apply(target, args || []);
                }
            }
            :
            function <T>(runtime: Runtime<T>): NextProcess | void {
                let {cache} = runtime;
                const now = new Date().getTime();
                const last = cache.last;
                if (now - (last === undefined ? now : last) < waitMs) {
                    setTimeout(() => timeout(runtime), waitMs);
                    cache.last = now;
                    return;
                }
                cache.last = undefined;
                return function (next: StateProcess): StateProcess {

                    return function (result: any) {
                        return next(result);
                    }

                }

            }

    }

}