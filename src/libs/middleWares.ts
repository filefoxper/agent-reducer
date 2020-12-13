import {
    MiddleWare,
    NextProcess,
    OriginAgent,
    Runtime,
    StateProcess
} from "./global.type";
import {isObject, isPromise} from "./util";

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
                    if (!isObject(result)) {
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

        function timeout<T>(runtime: Runtime<T>) {
            const now = new Date().getTime();
            const {caller, args, target} = runtime;
            if ((now - runtime.cache.last || now) < waitMs) {
                return;
            }
            caller.apply(target, args || []);
        }

        return function <T>(runtime: Runtime<T>): NextProcess | void {
            let {cache} = runtime;
            const now = new Date().getTime();
            const last = cache.last || now;
            if (now - last < waitMs) {
                setTimeout(() => timeout(runtime), waitMs);
                cache.last = now;
                return;
            }
            cache.last = undefined;
            return function (next: StateProcess): StateProcess {

                return function (result: any) {
                    next(result);
                }

            }

        }
    }

}