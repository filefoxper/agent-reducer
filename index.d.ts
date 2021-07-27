/** global * */
export interface OriginAgent<S = any> {
    state: S;
    [key: string]: any;
}

export type Model<S = any> = OriginAgent<S>;

export interface Env {
    updateBy?: 'manual' | 'auto';
    expired?: boolean;
    strict?: boolean;
    legacy?: boolean;
    nextExperience?: boolean;
}

export interface GlobalConfig {
    env?: Env;
    defaultMiddleWare?: MiddleWare;
}

declare type Caller = (...args: any[]) => any;

declare type SourcePropertyMapper<T> = ((value: any, instance: T, runtime: Runtime<T>) => any);

export declare type Runtime<T = any> = {
    caller: Caller;
    sourceCaller: Caller;
    callerName: keyof T;
    args?: any[];
    target: T;
    source: T;
    env: Env;
    cache: {
        [key: string]: any;
    };
    rollbacks: {
        [key in keyof T]?: T[key];
    };
    mapSourceProperty: (key: keyof T, caller: SourcePropertyMapper<T>) => Runtime<T>;
    rollback: () => Runtime<T>;
    tempCaller?: Caller;
};

export declare type StateProcess = <T = any>(result: any) => any;

export declare type NextProcess = (next: StateProcess) => StateProcess;

export declare type MiddleWare = <T>(runtime: Runtime<T>) => NextProcess | void;

export interface LifecycleEnv extends Env {
    expire: () => void;
    rebuild: () => void;
}

export interface LifecycleRuntime<T = any> extends Runtime<T> {
    env: LifecycleEnv;
}

export declare type LifecycleMiddleWare = (
    <T>(runtime: LifecycleRuntime<T>
    ) => NextProcess | void) & {
    lifecycle: true;
};

interface StoreSlot<S = any> {
    dispatch: Dispatch,
    getState(): S,
}

export type Reducer<S, A> = (state: S, action: A) => S;

interface ReducerPadding<
    S = any,
    T extends OriginAgent<S> = OriginAgent<S>
    > {
    initialState: S;
    namespace?: string;
    env: Env;
    agent: T;
    update: (state?: S, dispatch?: Dispatch) => void;
    useStoreSlot: (slot: StoreSlot) => void;
    recordChanges: () => () => Array<Change<S>>;
    destroy:()=>void
}

// inner interface
export declare type Action = {
    type: string;
    args?: any;
};

export type AgentReducer<
    S = any,
    T extends OriginAgent<S> = any
    > = Reducer<S, Action> & ReducerPadding<S, T>;

type Dispatch = (action: Action) => any;

type Change<S = any> = {
    type: string | number | symbol;
    state: S;
};

/**
 * Create a reducer function for a standard reducer system.
 * This reducer only returns state which is passed in by dispatching action.
 *
 * @param entry an instance of OriginAgent
 *
 * @return a reducer function
 */
declare function createReducer<S, T extends OriginAgent<S>>(entry: T): Reducer<S, Action>;

export declare function sharing<S, T extends OriginAgent<S> = OriginAgent<S>>(factory: () => T | {
    new (): T;
}): {
    current: T;
};
export declare function weakSharing<S, T extends OriginAgent<S> = OriginAgent<S>>(
    factory: (...args:any[]) => T | { new (): T; }
): {
    current: T;
    initial:(...args:any[])=>T;
};
export declare function createAgentReducer<S, T extends OriginAgent<S> = OriginAgent<S>>(
    originAgent: T | { new (): T; },
    middleWareOrEnv?: (MiddleWare & { lifecycle?: boolean; }) | Env, e?: Env
): AgentReducer<S, T>;

declare const agentDependenciesKey = '@@agent-reducer-dependencies';
declare const agentIdentifyKey = '@@agent-reducer-identify';
declare const agentListenerKey = '@@agent-reducer-listeners';
declare const agentModelResetKey = '@@agent-reducer-model-reset';
declare const agentNamespaceKey = '@@agent-reducer-namespace';
declare const agentGlobalScopeKey = '@@agent-reducer-global-scope';

export declare const getAgentNamespaceKey: () => string;

export declare enum DefaultActionType {
    DX_INITIAL_STATE = '@@AGENT_REDUCER_INITIAL_STATE',
    DX_MUTE_STATE = '@@AGENT_MUTE_STATE'
}

export declare function isAgent<T extends {
    [key: string]: any;
}>(data: T): boolean;

export declare const globalConfig: (config?: GlobalConfig | undefined) => GlobalConfig;

export declare const clearGlobalConfig: () => void;

declare type MiddleWareAbleFunction = ((...args: any[]) => any) & {
    middleWare?: MiddleWare;
};

declare type AgentDependencies<S, T extends OriginAgent<S>> = {
    entry: T;
    store: StoreSlot<S>;
    env: Env;
    cache: {
        [key: string]: Runtime<T>;
    };
    functionCache: any;
    middleWare: MiddleWare;
};

export declare function useMiddleWare<S, T extends OriginAgent<S>>(agent: T & {
    [agentDependenciesKey]?: AgentDependencies<S, T>;
}, ...mdws: (MiddleWare | LifecycleMiddleWare)[]): T;

export declare const middleWare: (
    callOrMiddleWare: MiddleWare | MiddleWareAbleFunction,
    mdw?: MiddleWare | MiddleWareAbleFunction | undefined
) => MiddleWareAbleFunction;

interface MiddleActionsInterface<T extends OriginAgent<S>, S> {
    agent?: T & {
        [agentDependenciesKey]?: AgentDependencies<S, T>;
    };
    [key: string]: any;
}

interface MiddleActionDependencies<T> {
    agent?: T;
    middleWare: MiddleWare | LifecycleMiddleWare;
    agentEnv?: Env;
}

declare type AsyncRuntime<T = any> = {
    caller: Caller;
    sourceCaller: Caller;
    callerName: string;
    args?: any[];
    target: T;
    source: T;
    env: Env;
    cache: {
        [key: string]: any;
    };
    rollbacks: {
        [key in keyof T]?: T[key];
    };
    mapSourceProperty: (
        key: keyof T,
        callback: (value: any, instance: T, runtime: AsyncRuntime<T>) => any
    ) => AsyncRuntime<T>;
    rollback: () => AsyncRuntime<T>;
    tempCaller?: Caller;
};

interface AsyncInvokeDependencies<T = any> {
    cache: {
        [key: string]: AsyncRuntime<T>;
    };
    functionCache: {
        [key: string]: (...args: any[]) => any;
    };
}

export declare function useMiddleActions<
    T extends OriginAgent<S>,
    P extends MiddleActionsInterface<T, S>,
    S = any
    >(middleActions: {
    new (agent: T): P;
} | P, ...middleWares: (T | MiddleWare | LifecycleMiddleWare)[]): P;

export declare class MiddleActions<T extends OriginAgent<S>, S = any> {
    agent: T;

    constructor(agent: T);
}

/** middleWares * */
declare function composeCallArray(calls: ((p: any) => any)[]): (p: any) => any;

export declare function defaultMiddleWare<T>(runtime: Runtime): NextProcess;

export declare function applyMiddleWares(
    ...middleWares: (MiddleWare | LifecycleMiddleWare)[]
): MiddleWare & {
    lifecycle: boolean;
};

export declare const toLifecycleMiddleWare: (lifecycleMiddleWare: Omit<LifecycleMiddleWare, 'lifecycle'> & {
    lifecycle?: boolean;
}) => LifecycleMiddleWare;

export declare class LifecycleMiddleWares {
  static takeLatest(): LifecycleMiddleWare;
}

export class MiddleWares {
  static takeNone(): MiddleWare;

  static takePromiseResolve(): MiddleWare;

  static takeAssignable(): MiddleWare;

  static takeBlock(blockMs?: number): MiddleWare;

  static takeLazy(waitMs: number): MiddleWare;

  static takeThrottle(waitMs: number): MiddleWare;

  static takeDebounce(waitMs: number, opt?: {
        leading?: boolean;
    }): MiddleWare;
}

export class MiddleWarePresets {
    static takeAssignable: typeof MiddleWares.takeAssignable;

    static takePromiseResolve: typeof MiddleWares.takePromiseResolve;

    static takeLazy(ms: number): MiddleWare;

    static takeLatest(): MiddleWare;

    static takeBlock(ms?: number): MiddleWare;

    static takeThrottle(wait: number): MiddleWare;

    static takeDebounce(wait: number, opt?: {
        leading?: boolean;
    }): MiddleWare;

    static takePromiseResolveAssignable(): MiddleWare;

    static takeLazyAssignable(ms: number): MiddleWare;

    static takeLatestAssignable(): MiddleWare;

    static takeBlockAssignable(ms?: number): MiddleWare;

    static takeThrottleAssignable(wait: number): MiddleWare;

    static takeDebounceAssignable(wait: number, opt?: {
        leading?: boolean;
    }): MiddleWare;
}
/** legacy api * */
/**
 * @deprecated
 */
export declare const branch: typeof useMiddleWare;
/**
 * @deprecated
 */
export declare class BranchResolvers {
    static takeLatest: typeof LifecycleMiddleWares.takeLatest;

    static takeBlock: typeof MiddleWares.takeBlock;

    static takeLazy: typeof MiddleWares.takeLazy;
}
