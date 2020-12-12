import {Action, StoreSlot} from "./reducer.type";
import {Env, MiddleWare} from './global.type';
import {agentDependenciesKey, agentNamespaceKey} from "./defines";
import {createProxy} from "./util";
import {decorateWithMiddleWare, useMiddleWare} from "./useMiddleWare";
import {AgentDependencies} from './agent.type';
import {OriginAgent} from "./global.type";

/**
 *
 * @param invokeDependencies
 */
function generateDispatchCall<S, T extends OriginAgent<S>>(invokeDependencies: AgentDependencies<S, T>) {
    const {entry, store, env} = invokeDependencies;
    const namespace = entry[agentNamespaceKey];
    return ({type, args}: Action) => {
        if (env.expired) {
            return args;
        }
        const newType = namespace === undefined ? type : (namespace + ':' + type);
        const nextState = args;
        if (nextState !== undefined && !env.strict) {
            entry.state = nextState;
        }
        return store.dispatch({type: newType, args});
    };
}

function createActionRunner<S, T extends OriginAgent<S>>(
    proxy: T,
    invokeDependencies: AgentDependencies<S, T>,
    type: string,
    source: Function
) {

    const dispatchCall = generateDispatchCall(invokeDependencies);

    const defaultStateResolver = <NS = S>(nextState: NS): NS => {
        dispatchCall({type, args: nextState});
        return nextState;
    };

    let {cache, functionCache, middleWare, entry} = invokeDependencies;

    cache[type] = cache[type] || {};

    if (functionCache[type]) {
        return functionCache[type];
    }

    function caller(...args: any[]) {

        const {env} = invokeDependencies;
        let runtime = cache[type];
        if (runtime) {
            runtime.args = [...args];
            runtime.env = env;
        }

        const nextProcess = middleWare(runtime);

        if (!nextProcess) {
            return;
        }

        const nextState = env.reduceOnly ? runtime.sourceCaller.apply(entry, [...args]) : runtime.sourceCaller.apply(proxy, [...args]);
        const stateProcess = nextProcess(defaultStateResolver);
        return stateProcess(nextState);
    }

    cache[type] = {
        caller,
        callerName: type,
        sourceCaller: source as (...args: any[]) => any,
        target: proxy,
        source: entry,
        env: invokeDependencies.env,
        cache: {}
    };

    functionCache[type] = caller;

    return caller;
}

export function generateAgent<S, T extends OriginAgent<S>>(
    entry: T & { [agentDependenciesKey]?: AgentDependencies<S, T> },
    store: StoreSlot<S>,
    env: Env,
    middleWare: MiddleWare,
    copyInfo?: {
        sourceAgent: T & { [agentDependenciesKey]?: AgentDependencies<S, T> },
        type: 'copy' | 'decorator'
    }
): T {

    let invokeDependencies: AgentDependencies<S, T> = {entry, store, env, cache: {}, functionCache: {}, middleWare};

    let methodWithMiddleWares: { [key in keyof T]?: any } = {};

    let cache = {
        methodWithMiddleWares,
        invokeDependencies: undefined
    }

    let {type: copyType, sourceAgent} = copyInfo || {};

    let proxy: T & { [agentDependenciesKey]?: AgentDependencies<S, T> } = createProxy(entry, {
        get(target: T, p: string & keyof T): any {
            const source = target[p];
            if (typeof source === 'function' && methodWithMiddleWares[p]) {
                return methodWithMiddleWares[p];
            }
            if (typeof source === 'function' && source.middleWare && copyType !== 'decorator') {
                const methodWithMiddleWare = decorateWithMiddleWare(sourceAgent || proxy, source.middleWare)[p];
                methodWithMiddleWares[p] = methodWithMiddleWare;
                return methodWithMiddleWare;
            }

            if (typeof source === 'function') {
                return createActionRunner(proxy, invokeDependencies, p, source);
            }
            if (p === agentDependenciesKey) {
                return cache.invokeDependencies;
            }
            return entry[p];
        },
        set(target: T, p: string & keyof T, value: any): boolean {
            const source = entry[p];
            if (typeof source === 'function') {
                return false;
            }
            if (p === agentDependenciesKey) {
                cache.invokeDependencies = value;
            } else {
                entry[p] = value;
            }
            return true;
        }
    });
    if (copyInfo) {
        proxy[agentDependenciesKey] = undefined;
        return proxy as T;
    }
    proxy[agentDependenciesKey] = invokeDependencies;
    return proxy as T;
}