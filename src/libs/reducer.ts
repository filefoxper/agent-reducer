import {
    Action,
    AgentDependencies,
    AgentEnv,
    AgentReducer,
    Dispatch,
    Env,
    OriginAgent,
    Reducer,
    StateChange,
    StoreSlot
} from "./reducer.type";
import {Resolver} from "./resolver.type";
import {agentDependenciesKey, DefaultActionType} from "./defines";
import {defaultResolver} from "./resolver";
import {createSimpleProxy} from "@/libs/createSimpleProxy";

/**
 *
 * @param invokeDependencies
 */
function generateDispatchCall<S, T extends OriginAgent<S>>(invokeDependencies: AgentDependencies<S, T>) {
    const {entry, store, env} = invokeDependencies;
    const namespace = entry.namespace;
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

    let {cache, functionCache, resolver} = invokeDependencies;

    cache[type] = cache[type] || {};

    if (functionCache[type]) {
        return functionCache[type];
    }

    function caller(...args: any[]) {

        let callerCache = cache[type].caller;
        if (callerCache) {
            callerCache.args = [...args];
        }

        const nextResolver = resolver(cache[type]);

        if (!nextResolver) {
            return;
        }

        const nextState = source.apply(proxy, [...args]);

        const stateResolver = nextResolver(defaultStateResolver);

        return stateResolver(nextState);
    }

    cache[type].caller = {
        source: caller,
        target: proxy
    };

    functionCache[type] = caller;

    return caller;
}

/**
 * use proxy to reset the features of entry properties, use entry.state as state,
 * set function which returns object (not undefined or promise) a dispatch function. (dispatch the next state before returned),
 * set function which returns promise or undefined a normal function.
 *
 * @param entry OriginAgent instance
 * @param store an object with dispatch function and getState function
 * @param env   run env
 * @param resolver  this param is set by a branch function, which copy an agent, and you can use this param to resolve function returns manually
 */
export function generateAgent<S, T extends OriginAgent<S>>(entry: T & { [agentDependenciesKey]?: AgentDependencies<S, T> }, store: StoreSlot<S>, env: AgentEnv, resolver: Resolver): T {

    let invokeDependencies: AgentDependencies<S, T> = {entry, store, env, cache: {}, functionCache: {}, resolver};

    if (!(agentDependenciesKey in entry)) {
        entry[agentDependenciesKey] = undefined;
    }

    let proxy: T & { [agentDependenciesKey]?: AgentDependencies<S, T> } = createSimpleProxy(entry, {
        get(target: T, p: string & keyof T,receiver:T): any {
            const source = target[p];
            if (typeof source === 'function') {
                return createActionRunner(receiver, invokeDependencies, p, source);
            }
            return entry[p];
        },
        set(target: T, p: string & keyof T, value: any): boolean {
            const source = target[p];
            if (p !== 'state' && typeof source !== 'function') {
                entry[p] = value;
                return true;
            }
            return false;
        }
    });
    const all = Object.getOwnPropertyDescriptors(entry);
    const it = Object.entries(all);
    const array = [...it].filter(([key, {value}]) => key !== undefined && typeof value === 'function');
    const withProxy: Array<[string, PropertyDescriptor]> = array.map(([key, desc]) => [
        key,
        desc.writable ? {
                ...desc,
                value: proxy[key],
                writable: false
            } :
            desc
    ]);
    const descHandler = withProxy.reduce((res, [key, desc]) => ({...res, [key]: desc}), {});
    Object.defineProperties(entry, descHandler);
    if (env.isBranch) {
        proxy[agentDependenciesKey] = undefined;
        return proxy as T;
    }
    proxy[agentDependenciesKey] = invokeDependencies;
    return proxy as T;
}

/**
 * Create a true reducer function which can use in a standard reducer system.
 * For the actual state has been produced by agent, this reducer only returns state which is passed by a dispatched action.
 *
 * @param entry an instance of OriginAgent
 *
 * @return a reducer function
 */
export function createReducer<S, T extends OriginAgent<S>>(entry: T): Reducer<S, Action> {

    /**
     * parse an action type
     *
     * @param actionType  can be a property name of entry, or made by entry.namespace+':'+(a property name of entry)
     *
     * @return [namespace,type]
     */
    function parseActionType(actionType: string): [string | undefined, string] {
        const [namespaceOrType, type] = actionType.split(':');
        const namespace = type === undefined ? undefined : namespaceOrType;
        const actualType = type === undefined ? namespaceOrType : type;
        return [namespace, actualType];
    }

    /**
     * create a simple, but useful reducer
     */
    return function (state: S = entry.state, action: Action = {type: DefaultActionType.DX_INITIAL_STATE}) {
        const [namespace, type] = parseActionType(action.type);
        //if reducer receive an action with namespace in action.type, then check if entry.namespace matches namespace
        if (entry.namespace && namespace !== entry.namespace) {
            return state;
        }
        //if reducer receive an action with a initial state type, then return the action.args as next state
        if (type === DefaultActionType.DX_INITIAL_STATE && action.args !== undefined) {
            return action.args;
        }
        const reduce = entry[type];
        //if the type can be found in entry as a property, and the value is a function, then return the action.args as next state
        if (typeof reduce === 'function') {
            return action.args;
        }
        return state;
    }
}

export function createAgentReducer<S, T extends OriginAgent<S> = OriginAgent<S>>(originAgent: T | { new(): T }, resolver?: Resolver | Env, e?: Env): AgentReducer<S, Action, T> {

    const defaultEnv = typeof resolver !== 'function' ? {...resolver, ...e} : {...e};

    const resultResolver = typeof resolver === 'function' ? resolver : defaultResolver;

    let env: Env = {expired: false, strict: true, updateBy: 'auto', ...defaultEnv};

    let stateChanges: undefined | Array<StateChange<S>> = undefined;

    let entity = typeof originAgent === 'function' ? new originAgent() : originAgent;

    const initialState = entity.state;

    const reducer = createReducer<S, T>(entity);

    let storeSlot: StoreSlot<S> = {
        getState() {
            return entity.state;
        },
        dispatch(action: Action) {
            if (env.updateBy !== 'auto') {
                return;
            }
            const nextState = reducer(this.getState(), action);
            entity.state = nextState;
            if (stateChanges) {
                stateChanges.push({type: action.type, state: nextState});
            }
        }
    };

    const transition = {
        initialState,
        namespace: entity.namespace,
        env,
        agent: generateAgent(entity, storeSlot, env, resultResolver),
        update(nextState: S, dispatch: Dispatch) {
            if (env.updateBy === 'auto') {
                throw new Error('You should set env.updateBy to be `manual` before updating state and dispatch from outside.');
            }
            entity.state = nextState;
            storeSlot.dispatch = dispatch;
        },
        recordStateChanges() {
            if (env.updateBy !== 'auto') {
                throw new Error('You should set env.updateBy to be `auto` before record.');
            }
            stateChanges = [];
            return function getStateChanges(): Array<StateChange<S>> {
                const result = stateChanges !== undefined ? [...stateChanges] : [];
                stateChanges = undefined;
                return result;
            }
        }
    };

    return Object.assign(reducer, transition);

}
