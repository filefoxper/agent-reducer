import { OriginAgent, Action, Dispatch } from './global.type';

export type Reducer<S, A> = (state: S, action: A) => S;

export interface ReducerPadding<
  S = any,
  T extends OriginAgent<S> = OriginAgent<S>
> {
  agent: T;
  connect: (dispatch?: Dispatch) => void;
  disconnect:()=>void
}

// inner interface
export type AgentReducer<
    S = any,
    T extends OriginAgent<S> = any
    > = Reducer<S, Action> & ReducerPadding<S, T>;

export type AgentRunner<T> = {
  run:<R>(callback:(agent:T)=>any)=>R
};
