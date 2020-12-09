export interface OriginAgent<S = any> {
    state: S,
    [key: string]: any
}

export interface Env {
    updateBy?: 'manual' | 'auto',
    expired?: boolean,
    strict?: boolean,
    reduceOnly?:boolean
}



export interface GlobalConfig {
    env?:Env,
    defaultMiddleWare:MiddleWare
}

type Caller = (...args: any[]) => any;

export type Runtime<T=any> = {
    caller: Caller,
    sourceCaller:Caller,
    callerName:string,
    args?: any[],
    target: T,
    source:T,
    env:Env,
    cache: { [key:string]:any }
};

export type StateProcess = <T = any>(result: any) => any;

/**
 * @deprecated
 */
export type ResultProcessor = StateProcess;

export type NextProcess = (next: StateProcess) => StateProcess;

/**
 * @deprecated
 */
export type NextLink = NextProcess;

export type MiddleWare = <T>(runtime: Runtime<T>) => NextProcess | void;

/**
 * @deprecated
 */
export type Resolver = MiddleWare;

export interface LifecycleEnv extends Env{
    expire: () => void,
    rebuild: () => void
}

export interface LifecycleRuntime<T=any> extends Runtime<T>{
    env:LifecycleEnv
}

export type LifecycleMiddleWare = (<T>(runtime: LifecycleRuntime<T>) => NextProcess | void)&{lifecycle:true};