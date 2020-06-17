import {Action, AgentReducer, Dispatch, Env, OriginAgent, Reducer, StoreSlot, Record} from "./reducer.type";

export enum DefaultActionType {
    DX_INITIAL_STATE = '@DX_INITIAL_STATE'
}

function createProxy<S, T extends OriginAgent<S>>(entry: T, proxyHandler: ProxyHandler<T>): T {
    const proxy = new Proxy(entry, proxyHandler);
    return proxy as T;
}

function isVoid(data) {
    return data === undefined || data === null;
}

function isPromise(data) {
    if (!data) {
        return false;
    }
    return typeof data.then === 'function';
}

function createActionRunner<S, T extends OriginAgent<S>>(
    proxy: T,
    entity: T,
    type: string | number,
    source: Function,
    dispatch: Dispatch,
    env: Env
) {

    return function caller(...args) {

        const nextState = source.apply(proxy, [...args]);

        if (isPromise(nextState) || isVoid(nextState)) {
            return nextState;
        }

        dispatch({type, args: nextState});

        if (nextState !== undefined && !env.strict) {
            entity.state = nextState;
        }

        return nextState;
    }
}

export function generateAgent<S, T extends OriginAgent<S>>(entry: T, store: StoreSlot<S>, env: Env): T {

    const namespace = entry.namespace;

    const dispatchCall = ({type, args}: Action) => {
        const newType = namespace === undefined ? type : (namespace + ':' + type);
        return store.dispatch({type: newType, args});
    };

    const proxy = createProxy(entry, {
        get(target: T, p: string | number): any {
            const value = target[p];
            if (typeof value === 'function') {
                return createActionRunner(proxy, entry, p, value, dispatchCall, env);
            }
            return entry[p];
        },
        set(target: T, p: string | number | symbol, value: any): boolean {
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
    const array = [...it].filter(([key, {value}]) => typeof value === 'function');
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
    return proxy;
}

/**
 * 创建一个真正的reducer，用于介入各种reducer系统
 *
 * @param entry Agent实例
 */
export function createReducer<S, T extends OriginAgent<S>>(entry: T): Reducer<S, Action> {

    /**
     * 解析一个actionType
     *
     * @param actionType    可能有object的一个属性或namespace+':'+属性组成
     */
    function parseActionType(actionType) {
        const [namespaceOrType, type] = actionType.split(':');
        const namespace = type === undefined ? undefined : namespaceOrType;
        const actualType = type === undefined ? namespaceOrType : type;
        return [namespace, actualType];
    }

    /**
     * 创建的reducer
     */
    return function (state: S = entry.state, action: Action = {type: DefaultActionType.DX_INITIAL_STATE}) {
        const [namespace, type] = parseActionType(action.type);
        if (entry.namespace && namespace !== entry.namespace) {
            return state;
        }
        if (type === DefaultActionType.DX_INITIAL_STATE && action.args !== undefined) {
            return action.args;
        }
        const reduce = entry[type];
        if (typeof reduce === 'function') {
            return action.args;
        }
        return state;
    }
}

export function createAgentReducer<S, T extends OriginAgent<S> = OriginAgent<S>>(originAgent: T | { new(): T }, e?: Env): AgentReducer<S, Action, T> {

    let env: Env = {expired: false, strict: true, updateBy: 'auto', ...e};

    let records: undefined | Array<Record<S>> = undefined;

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
            if (records) {
                records.push({type: action.type, state: nextState});
            }
        }
    };

    const transition = {
        initialState,
        namespace: entity.namespace,
        env,
        agent: generateAgent(entity, storeSlot, env),
        update(nextState: S, dispatch: Dispatch) {
            if (env.updateBy === 'auto') {
                throw new Error('You should set env.updateBy to be `manual` before updating state and dispatch from outside.');
            }
            entity.state = nextState;
            storeSlot.dispatch = dispatch;
        },
        record() {
            if (env.updateBy !== 'auto') {
                throw new Error('You should set env.updateBy to be `auto` before record.');
            }
            records = [];
            return function endRecord(): Array<Record<S>> {
                const result = [...records];
                records = undefined;
                return result;
            }
        }
    };

    return Object.assign(reducer, transition);

}
