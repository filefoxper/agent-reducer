import {
  agentCallingMiddleWareKey,
  agentDependenciesKey,
  agentIdentifyKey,
  agentListenerKey,
  agentMethodName,
  agentModelResetKey,
  agentSharingMiddleWareKey,
  agentSharingTypeKey,
  agentEffectsKey,
  agentModelWorking,
  agentRunningEffectsKey,
  agentActionKey,
  agentCallingEffectTargetKey,
  agentIsEffectMethodAgentKey,
  agentErrorConnectionKey,
} from './defines';

export type SharingType = 'hard'|'weak';

export type Action = {
  type: string;
  state?: any;
  prevState?:any;
};

export type ActionWrap={
  current:Action,
  next?:ActionWrap,
  last?:ActionWrap
}

export type MethodCaller<T=any> = ((...args:any[])=>any)&{[agentMethodName]?:string};

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

export type ModelInstanceMethod<S=any, T extends Model<S>=Model> = ((...args:any[])=>any)&
    {[agentMethodName]?:string};

export type EffectCallback<S=any, T extends Model<S>=Model> = (
    prevState:S,
    state:S,
    methodName:string|null,
)=>void|(()=>void);

export type EffectTarget<S=any, T extends Model<S>=Model> = (ModelInstanceMethod<S, T>)|T;

export type Effect<S=any, T extends Model<S>=Model> = {
  callback: EffectCallback<S>,
  destroy:null|(()=>void)
  mount:()=>void,
  unmount:()=>void,
  update:(nextCallback:EffectCallback<S>)=>void,
  methodName:string|null,
  initialed:boolean
};

export type EffectWrap<S=any, T extends Model<S>=Model> = {
  unmount:()=>void,
  update:(nextCallback:EffectCallback<S>)=>void,
}

export type ErrorListener = (error:any, methodName:string)=>any;

export interface OriginAgent<S = any> {
  state: S;
  [key: string]: any;
  [agentDependenciesKey]?: AgentDependencies<S, any>;
  [agentIdentifyKey]?: true;
  [agentListenerKey]?:((s:S)=>any)[];
  [agentSharingMiddleWareKey]?:SharingMiddleWareMethods;
  [agentSharingTypeKey]?:SharingType;
  [agentActionKey]?:ActionWrap;
  [agentModelResetKey]?:()=>void;
  [agentCallingMiddleWareKey]?:MiddleWare;
  [agentEffectsKey]?: Effect[],
  [agentRunningEffectsKey]?:Effect[],
  [agentErrorConnectionKey]?:ErrorListener[],
  [agentModelWorking]?:boolean,
  [agentIsEffectMethodAgentKey]?:boolean,
}

export type DecoratorCaller = (target: any, p?: string)=>any;

export type MethodDecoratorCaller = (target: any, p: string)=>any;

export type EffectDecoratorTargetMethod = ()=>((...args:any[])=>any);

export type EffectDecoratorCallback<S=any, T extends Model<S>=Model> = (
    (...args:any[])=>any
    )&{
  [agentMethodName]:string,
  [agentCallingMiddleWareKey]?:MiddleWare,
  [agentCallingEffectTargetKey]?:Array<EffectDecoratorTargetMethod|string>
};

export type EffectMethod<S=any, T extends Model<S>=Model> = EffectDecoratorCallback<S, T>;

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
  reject:(error:any)=>any
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
