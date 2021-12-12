import {
  agentActionsKey,
  agentCallingMiddleWareKey,
  agentDependenciesKey,
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
  prevState?:any;
};

export type MethodCaller<T=any> = ((...args:any[])=>any)&{[agentMethodName]?:string, model?:T};

export type Dispatch = (action: Action) => any;

export type Listener<S> = (action:Action)=>void;

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
  notify:(action:Action, dispatch:(ac:Action)=>void)=>void,
  disconnect:()=>void
}

export type ConnectionFactory<S, T extends OriginAgent<S>> = ((entity:T)=>Connection<S>);
