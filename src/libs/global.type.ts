export interface OriginAgent<S = any> {
  state: S;
  [key: string]: any;
}

export interface Env {
  updateBy?: 'manual' | 'auto';
  expired?: boolean;
  strict?: boolean;
  legacy?: boolean;
  nextExperience?:boolean;
}

export type ComposeCaller = (p: any) => any;

export type Caller = (...args: any[]) => any;

type SourcePropertyMapper<T, R> = (value:any, instance:T, runtime:R)=>any

export type Runtime<T = any> = {
  caller: Caller;
  sourceCaller: Caller;
  callerName: keyof T;
  args?: any[];
  target: T;
  source: T;
  env: Env;
  cache: { [key: string]: any };
  rollbacks:{[key in keyof T]?:T[key]};
  mapSourceProperty:(key:keyof T, caller:SourcePropertyMapper<T, Runtime<T>>)=>Runtime<T>;
  rollback:()=>Runtime<T>;
  tempCaller?: Caller;
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

export interface GlobalConfig {
  env?: Env;
  defaultMiddleWare?: MiddleWare;
}

export type SharingType = 'hard'|'weak';
