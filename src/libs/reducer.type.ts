import { Env, OriginAgent } from './global.type';

export declare type Action = {
  type: string;
  args?: any;
};

export type Dispatch = (action: Action) => any;

export type Change<S = any> = {
  type: string | number | symbol;
  state: S;
};

export type Factory<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    > = (...args:any[])=>T|{new ():T};

export type Ref<
    S,
    T extends OriginAgent<S> = OriginAgent<S>,
    > = {
  current: T | null,
  initial?: Factory<S, T>
}

export type SharingRef<
    S,
    T extends OriginAgent<S>= OriginAgent<S>,
    > = {
  current:T,
  initial:Factory<S, T>
}

export type Listener<S> = (nextState:S, action:Action)=>void;

export interface Store<S = any> {
  dispatch: Dispatch,
  getState(): S,
  subscribe(listener:Listener<S>):void
}

export interface StoreSlot<S = any> {
  dispatch: Dispatch,
  getState(): S
}

export type Reducer<S, A> = (state: S, action: A) => S;

export interface ReducerPadding<
  S = any,
  T extends OriginAgent<S> = OriginAgent<S>
> {
  initialState: S;
  namespace?: string;
  env: Env;
  agent: T;
  update: (state?: S, dispatch?: Dispatch) => void;
  recordChanges: () => () => Array<Change<S>>;
  reconnect:()=>void;
  destroy:()=>void
}

// inner interface
export type AgentReducer<
    S = any,
    T extends OriginAgent<S> = any
    > = Reducer<S, Action> & ReducerPadding<S, T>;
