import {
  agentActionsKey,
  agentCallingMiddleWareKey,
  agentDependenciesKey,
  agentEffectKey,
  agentIdentifyKey,
  agentListenerKey,
  agentMethodName,
  agentModelResetKey,
  agentSharingMiddleWareKey,
  agentSharingTypeKey,
} from './defines';

export type SharingType = 'hard'|'weak';

export type Action = {
  type: string;
  state?: any;
};

export type MethodCaller<T=any> = ((...args:any[])=>any)&{[agentMethodName]?:string, model?:T};

export type Dispatch = (action: Action) => any;

export type Listener<S> = (nextState:S, action:Action)=>void;

export interface Store<S = any> {
  dispatch: Dispatch,
  getState(): S,
  subscribe(listener:Listener<S>):void
}

export type AgentDependencies<S, T extends OriginAgent<S> = OriginAgent<S>> = {
  entry: T;
  store: Store<S>;
  env: Env;
  cache: { [key: string]: Runtime<T> };
  functionCache: any;
  middleWare: MiddleWare;
};

export type SharingMiddleWareMethods = Record<string, (...args: any[]) => any>;

export type EffectRunnerCallback<S> = (prev:S, current:S, ac:Action)=>void;

export type EffectRunner<S> = {
  update:EffectRunnerCallback<S>,
  disconnect:()=>void
}

export type EffectCaller<S, T extends OriginAgent<S>> = (
    prev:S,
    next:S,
    actionType?:keyof T
) => (()=>void)|void;

export type EffectWrap<S, T extends OriginAgent<S>> = {
  callback:EffectCaller<S, T>,
  methods?:keyof T|MethodCaller|((keyof T|MethodCaller)[]),
  unEffect:()=>void,
  destroy?:()=>void
};

export interface OriginAgent<S = any> {
  state: S;
  [key: string]: any;
  [agentDependenciesKey]?: AgentDependencies<S, any>;
  [agentIdentifyKey]?: true;
  [agentListenerKey]?:((s:S)=>any)[];
  [agentSharingMiddleWareKey]?:SharingMiddleWareMethods;
  [agentSharingTypeKey]?:SharingType;
  [agentActionsKey]?:Action[];
  [agentModelResetKey]?:()=>void;
  [agentCallingMiddleWareKey]?:MiddleWare;
  [agentEffectKey]?:EffectWrap<S, any>[]
}

export type MethodEffectOption<T> = {
  model?:T,
  methods?:keyof T|MethodCaller|((keyof T|MethodCaller)[])
}

export type DecoratorCaller = (target: any, p?: string)=>any;

export type Model<S=any> = OriginAgent<S>;

export interface Env {
  expired?: boolean;
}

export type ComposeCaller = (p: any) => any;

export type Runtime<T extends Record<string, any>=any> = {
  methodName: string|number;
  args?: any[];
  agent: T;
  model: T;
  env: Env;
  cache: { [key: string]: any };
  mappedModel:null|T;
  mapModel:(handler:ProxyHandler<T>)=>T;
};

export type StateProcess = <T = any>(result: any) => any;

export type NextProcess = (next: StateProcess) => StateProcess;

export type MiddleWare = <T>(runtime: Runtime<T>) => NextProcess | void;

export interface LifecycleEnv extends Env {
  expire: () => void;
  rebuild: () => void;
}

export interface LifecycleRuntime<T = any> extends Runtime<T> {
  env: LifecycleEnv;
}

export type LifecycleMiddleWare = (<T>(
  runtime: LifecycleRuntime<T>
) => NextProcess | void) & { lifecycle: true };

export type Connection<S> = {
  connect:(...args:any[])=>void,
  notify:(nextState:S, action:Action, dispatch:(ac:Action)=>void)=>void,
  disconnect:()=>void
}

export type ConnectionFactory<S, T extends OriginAgent<S>> = ((entity:T)=>Connection<S>);
