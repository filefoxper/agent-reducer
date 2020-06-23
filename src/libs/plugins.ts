import {isPromise, isUndefined} from "./utils";
import {BranchApi, BranchPlugin, ResultProcessor, StateDispatch} from "./branch.type";

export class Plugins {

    static takeLatest(): BranchPlugin {
        return function plugin(cache: any): ResultProcessor {
            return function (result: any, stateDispatch: StateDispatch, branchApi: BranchApi) {
                let version = cache.version || 0;
                cache.version = (cache.version || 0) + 1;
                if (isPromise(result)) {
                    result.finally(() => {
                        if (version + 1 === cache.version) {
                            branchApi.discard();
                        }
                    });
                }
                if (isPromise(result) || isUndefined(result)) {
                    return result;
                }
                stateDispatch(result);
                return result;
            }
        }
    }

}