import {LifecycleRuntime, NextProcess, LifecycleMiddleWare, StateProcess} from "./global.type";
import {isPromise} from "./applies";

export const toLifecycleMiddleWare = (lifecycleMiddleWare: Omit<LifecycleMiddleWare,'lifecycle'>&{lifecycle?:boolean}):LifecycleMiddleWare => {
    lifecycleMiddleWare.lifecycle = true;
    return lifecycleMiddleWare as LifecycleMiddleWare;
}

export class LifecycleMiddleWares {

    static takeLatest(): LifecycleMiddleWare {

        const mdw = function <T>(runtime: LifecycleRuntime<T>): NextProcess {

            return function (next: StateProcess): StateProcess {

                return function (result: any) {
                    let {cache, env} = runtime;
                    if (!isPromise(result)) {
                        return next(result);
                    }
                    let version = cache.version || 0;
                    cache.version = version + 1;
                    result.finally(() => {
                        if (version + 1 === cache.version) {
                            env.rebuild();
                        }
                    });
                    return next(result);
                }

            }

        }
        return toLifecycleMiddleWare(mdw);
    }

    static takeBlock(blockMs?: number): LifecycleMiddleWare {

        const mdw = function <T>(runtime: LifecycleRuntime<T>): NextProcess | void {
            let {cache} = runtime;
            const now = new Date().getTime();
            if (cache.running && (blockMs === undefined || (now - cache.running < blockMs))) {
                return;
            }
            cache.running = now;
            return function (next: StateProcess) {

                return function (result: any): StateProcess {
                    if (isPromise(result)) {
                        result.finally(() => {
                            cache.running = undefined;
                        });
                        return next(result);
                    }
                    cache.running = undefined;
                    return next(result);
                }

            }

        }
        return toLifecycleMiddleWare(mdw);
    }

    static takeLazy(waitMs: number): LifecycleMiddleWare {

        function timeout<T>(runtime: LifecycleRuntime<T>) {
            const now = new Date().getTime();
            const {caller, args, target} = runtime;
            if ((now - runtime.cache.last || now) < waitMs) {
                return;
            }
            caller.apply(target, args || []);
        }

        const mdw = function <T>(runtime: LifecycleRuntime<T>): NextProcess | void {
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
        return toLifecycleMiddleWare(mdw);
    }

}

/**
 * @deprecated
 */
export const BranchResolvers = LifecycleMiddleWares;