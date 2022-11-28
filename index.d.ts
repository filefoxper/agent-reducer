export type SharingType = 'hard'|'weak';

/** global * */
export interface OriginAgent<S = any> {
    state: S;
    [key: string]: any;
}

export type Model<S = any> = OriginAgent<S>;

export interface Env {
    expired?: boolean;
}

export declare type Runtime<T extends Record<string, any>=any> = {
    methodName: string|number;
    args?: any[];
    agent: T;
    model: T;
    env: Env;
    cache: { [key: string]: any };
    mapModel:(handler:ProxyHandler<T>)=>T;
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

export declare type Action<T=unknown> = {
    type: string;
    prevState:T;
    state: T;
    params:unknown[];
};

type Dispatch = (action: Action) => any;

export type Reducer<S, A> = (state: S, action: A) => S;

interface ReducerPadding<
    S = any,
    T extends OriginAgent<S> = OriginAgent<S>
    > {
    agent: T;
    connect: (dispatch?: Dispatch) => void;
    disconnect:()=>void
}

type AgentRunner<T> = {
    run:<R>(callback:(agent:T)=>any)=>R
};

export type AgentReducer<
    S = any,
    T extends OriginAgent<S> = any
    > = Reducer<S, Action> & ReducerPadding<S, T>;

export declare type Factory<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    > = (...args:any[])=>T|{new ():T};

export declare type SharingRef<
    S,
    T extends Model<S>= Model<S>,
    > = {
    current:T,
    initial:(...args:any[])=>T
};

export declare function sharing<
    S,
    T extends Model<S> = Model<S>
    >(factory:Factory<S, T>): SharingRef<S, T>;

export declare function weakSharing<
    S,
    T extends Model<S>=Model<S>
    >(
    factory:Factory<S, T>,
):SharingRef<S, T>;

export declare function create<
    S,
    T extends Model<S> = Model<S>
    >(
    model: T | { new (): T },
    ...middleWares: (MiddleWare & { lifecycle?: boolean })[]
): AgentReducer<S, T>;

export declare function connect<
    S,
    T extends Model<S> = Model<S>
    >(
    model: T | { new (): T },
    ...middleWares: (MiddleWare & { lifecycle?: boolean })[]
):AgentRunner<T>

export declare enum DefaultActionType {
    DX_MUTE_STATE = '@@AGENT_MUTE_STATE'
}

export declare function isAgent<T extends Record<string, any>>(data: T): boolean;

export declare function getSharingType<
    S,
    T extends Model<S>=Model<S>
    >(model:T):undefined|SharingType;

declare type MiddleWareAbleFunction = (...args: any[]) => any;

declare type MiddleWareAble<S, T extends OriginAgent<S>> =
    MiddleWareAbleFunction | T | ({ new (): T });

declare type DecoratorCaller = (target: any, p?: string)=>any;

declare type MethodDecoratorCaller = (target: any, p: string)=>any;

export declare function withMiddleWare<S, T extends OriginAgent<S>>(
    agent: T,
    ...mdws: (MiddleWare | LifecycleMiddleWare)[]
): T;

export declare const middleWare: <
    S,
    T extends Model<S>
    >(
    callOrMiddleWare: MiddleWare | LifecycleMiddleWare | MiddleWareAble<S, T>,
    ...mdw: (MiddleWare | LifecycleMiddleWare)[]
) => DecoratorCaller;

/** middleWares * */
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

export declare type EffectCallback<S> = (
    prevState:S, nextState:S, methodName:string|null, action:Action|null
)=>void|(()=>void);

declare type EffectWrap<S=any, T extends Model<S>=Model> = {
    unmount:()=>void,
    update:(nextCallback:EffectCallback<S>)=>void,
}

export declare function addEffect<S=any, T extends Model<S> = Model>(
    effectCallback:EffectCallback<S>,
    target:T,
    method?:keyof T|((...args:any[])=>any)|'*',
):EffectWrap<S, T>;

export declare function effect<S=any, T extends Model<S>=Model>(
    method:(()=>((...args:any[])=>any)|(((...args:any[])=>any)[]))|'*',
):MethodDecoratorCaller;

export type ErrorListener = (error:any, methodName:string)=>any;

export type Avatar<T extends Record<string, any>> = {
    current:T,
    implement:(impl:Partial<T>)=>()=>void;
};

export declare function avatar<
    T extends Record<string, unknown>
    >(interfaces:T):Avatar<T>;

export declare function experience():void;

export declare function strict():DecoratorCaller;

export type ActMethodDecoratorCaller = <S, T extends Model<S>>(
    target: T,
    p: string
) => TypedPropertyDescriptor<(...args: any[]) => T['state']>;

export declare function act():ActMethodDecoratorCaller;

export type LaunchHandler = {
    shouldLaunch?:()=>boolean,
    shouldUpdate?:()=>boolean,
    didLaunch?:(result:any)=>any,
    invoke?:(method:(...args:any[])=>any)=>((...args:any[])=>any);
}

export type FlowRuntime = {
    state:Record<string, any>,
    resolve:(result:any)=>any;
    reject:(error:any)=>any
};

export type WorkFlow = (runtime:FlowRuntime)=>LaunchHandler;

type BlockFlowConfig = {timeout?:number};

type DebounceFlowConfig = {time:number, leading?:boolean};

declare type FlowFn =((...flows:WorkFlow[])=>MethodDecoratorCaller)&{
    force:<S=any, T extends Model<S>=Model<S>>(target:T, ...workFlows:WorkFlow[])=>T,
    error:<
        S=any,
        T extends Model<S>=Model<S>
        >(model:T, listener:ErrorListener)=>(()=>void)
}

export declare const flow:FlowFn;

export class Flows {
  static promise():WorkFlow;

  static latest():WorkFlow;

  static debounce(ms:number|DebounceFlowConfig, leading?:boolean):WorkFlow;

  static block(timeout?:number|BlockFlowConfig):WorkFlow;
}

export class MiddleWares {
  static takeNothing(): MiddleWare;

  /**
     * @deprecated
     */
  static takeNone(): MiddleWare;

  static takePromiseResolve(): MiddleWare;

  static takeAssignable(): MiddleWare;

  /**
     * @deprecated
     */
  static takeBlock(blockMs?: number): MiddleWare;

  static takeUnstableBlock(blockMs?: number): MiddleWare;

  /**
   * @deprecated
   * @param waitMs
   */
  static takeThrottle(waitMs: number): MiddleWare;

  static takeUnstableThrottle(waitMs: number): MiddleWare;

  /**
   * @deprecated
   * @param waitMs
   * @param opt
   */
  static takeDebounce(waitMs: number, opt?: {
        leading?: boolean;
    }): MiddleWare;

  static takeUnstableDebounce(waitMs: number, opt?: {
        leading?: boolean;
    }): MiddleWare;
}

export class MiddleWarePresets {
  static takeNothing(): MiddleWare;

  /**
     * @deprecated
     */
  static takeNone(): MiddleWare;

  static takeAssignable(): MiddleWare;

  static takePromiseResolve(): MiddleWare;

  static takeLatest(): MiddleWare;

  /**
     * @deprecated
     * @param ms
     */
  static takeBlock(ms?: number): MiddleWare;

  static takeUnstableBlock(ms?: number):MiddleWare;

  /**
     * @deprecated
     * @param wait
     */
  static takeThrottle(wait: number): MiddleWare;

  static takeUnstableThrottle(wait: number): MiddleWare;

  /**
     * @deprecated
     * @param wait
     * @param opt
     */
  static takeDebounce(wait: number, opt?: {
        leading?: boolean;
    }): MiddleWare;

  static takeUnstableDebounce(wait: number, opt?: {
        leading?: boolean;
    }): MiddleWare;

  static takePromiseResolveAssignable(): MiddleWare;

  /**
     * @deprecated
     * @param ms
     */
  static takeLazyAssignable(ms: number): MiddleWare;

  static takeLatestAssignable(): MiddleWare;

  static takeBlockAssignable(ms?: number): MiddleWare;

  /**
     * @deprecated
     * @param wait
     */
  static takeThrottleAssignable(wait: number): MiddleWare;

  static takeUnstableThrottleAssignable(wait: number): MiddleWare;

  /**
     * @deprecated
     * @param wait
     * @param opt
     */
  static takeDebounceAssignable(wait: number, opt?: {
        leading?: boolean;
    }): MiddleWare;

  static takeUnstableDebounceAssignable(wait: number, opt?: {
        leading?: boolean;
    }): MiddleWare;
}
