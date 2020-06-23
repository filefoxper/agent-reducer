import {createProxy, isPromise, isUndefined, shallowCopy} from "./utils";
import {agentDependenciesKey, DefaultActionType} from "./defines";
import {
    Action,
    AgentReducer,
    Dispatch,
    Env,
    AgentDependencies,
    OriginAgent,
    StateChange,
    Reducer,
    StoreSlot
} from "./reducer.type";
import {BranchApi} from "./branch.type";

function generateDispatchCall<S, T extends OriginAgent<S>>(invokeDependencies: AgentDependencies<S, T>) {
    const {entry, store, env} = invokeDependencies;
    const namespace = entry.namespace;
    return ({type, args}: Action) => {
        const {branchApi} = invokeDependencies;
        if (env.expired || (branchApi && branchApi.getStatus())) {
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

    const stateDispatch = <NS = S>(nextState: NS) => {
        dispatchCall({type, args: nextState});
    };

    return function caller(...args: any[]) {

        const nextState = source.apply(proxy, [...args]);

        const {branchApi} = invokeDependencies;

        if (branchApi) {
            const plugin = branchApi.getPlugin();
            return plugin(nextState, stateDispatch, branchApi);
        }

        if (isPromise(nextState) || isUndefined(nextState)) {
            return nextState;
        }

        stateDispatch(nextState);

        return nextState;
    };
}

export function generateAgent<S, T extends OriginAgent<S>>(entry: T, store: StoreSlot<S>, env: Env, branchApi?: BranchApi): T {

    const invokeDependencies: AgentDependencies<S, T> = {entry, store, env, branchApi};

    let proxy: T & { [agentDependenciesKey]?: AgentDependencies<S, T> } = createProxy(entry, {
        get(target: T, p: string & keyof T): any {
            const source = target[p];
            if (typeof source === 'function') {
                return createActionRunner(proxy, invokeDependencies, p, source);
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
    if (branchApi) {
        return proxy as T;
    }
    proxy[agentDependenciesKey] = invokeDependencies;
    return proxy as T;
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
    function parseActionType(actionType: string): [string | undefined, string] {
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

    let stateChanges: undefined | Array<StateChange<S>> = undefined;

    let entity = typeof originAgent === 'function' ? new originAgent() : shallowCopy(originAgent);

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
        agent: generateAgent(entity, storeSlot, env),
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
