import {LifecycleRuntime, NextProcess, LifecycleMiddleWare, StateProcess} from "./global.type";
import {isPromise} from "./util";

export const toLifecycleMiddleWare = (lifecycleMiddleWare: Omit<LifecycleMiddleWare, 'lifecycle'> & { lifecycle?: boolean }): LifecycleMiddleWare => {
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
                    const data = next(result);
                    result.finally(() => {
                        if (version + 1 === cache.version) {
                            env.rebuild();
                        }
                    });
                    return data;
                }

            }

        }
        return toLifecycleMiddleWare(mdw);
    }



}