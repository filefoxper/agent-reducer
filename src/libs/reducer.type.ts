import { Env, OriginAgent } from './global.type';

export interface StoreSlot<S = any> {
  dispatch: Dispatch,
  getState(): S,
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

export type Dispatch = (action: Action) => any;

export type Change<S = any> = {
  type: string | number | symbol;
  state: S;
};
