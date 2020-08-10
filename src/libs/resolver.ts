import {BranchApi, BranchResolver} from "./branch.type";
import {NextLink, Resolver, ResultProcessor} from "./resolver.type";
import {CallerCache} from "./reducer.type";

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

export function defaultResolver() {
    return function nextResolver(next: (result: any) => any) {
        return function stateResolver(result: any) {
            if (isPromise(result) || isUndefined(result)) {
                return result;
            }
            return next(result);
        }
    }
}

export function applyResolvers(...resolvers: Resolver[]) {

    function isAllValidated(nextResolvers: Array<NextLink | void>): nextResolvers is Array<NextLink> {
        return nextResolvers.every((nextResolver): nextResolver is NextLink => !!nextResolver);
    }

    return function totalResolver(cache: any) {
        const nextResolvers = [...resolvers].concat(defaultResolver).map((resolver) => resolver(cache));
        if (!isAllValidated(nextResolvers)) {
            return;
        }
        return composeCallArray(nextResolvers);
    }
}

export class BranchResolvers {

    static takeLatest(): BranchResolver {

        return function branchResolver(branchApi: BranchApi): Resolver {

            return function (cache: CallerCache): NextLink {

                return function (next: ResultProcessor) {

                    return function (result: any) {
                        if (!isPromise(result)) {
                            return next(result);
                        }
                        let version = cache.version || 0;
                        cache.version = version + 1;
                        result.finally(() => {
                            if (version + 1 === cache.version) {
                                branchApi.rebuild();
                            }
                        });
                        return next(result);
                    }

                }

            }

        }

    }

    static takeBlock(blockMs?: number): BranchResolver {

        return function branchResolver(): Resolver {

            return function (cache: CallerCache): NextLink | void {

                const now = new Date().getTime();

                if (cache.running && (blockMs === undefined || (now - cache.running < blockMs))) {
                    return;
                }

                cache.running = now;

                return function (next: ResultProcessor) {

                    return function (result: any) {
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

        }

    }

    static takeLazy(waitMs: number): BranchResolver {

        return function branchResolver(): Resolver {

            function timeout(cache: CallerCache) {
                const now = new Date().getTime();
                const {source, args, target} = cache.caller;
                if (now - cache.last||now < waitMs) {
                    return;
                }
                source.apply(target, args || []);
            }

            return function (cache: CallerCache): NextLink | void {

                const now = new Date().getTime();

                const last = cache.last || now;

                if (now - last < waitMs) {
                    setTimeout(() => timeout(cache), waitMs);
                    cache.last = now;
                    return;
                }

                cache.last = undefined;

                return function (next: ResultProcessor) {

                    return function (result: any) {
                        next(result);
                    }

                }

            }

        }

    }

}