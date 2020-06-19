export interface OriginAgent<S = any> {
    state: S,
    namespace?: string
}

//out lib interface
export interface StoreSlot<S = any> {

    dispatch: Dispatch,

    getState(): S
}

export type Reducer<S, A> = (state: S, action: A) => S;

interface AgentData<S = any, T extends OriginAgent<S> = OriginAgent<S>> {
    initialState: S,
    namespace?: string,
    env: Env,
    agent: T,
    update: (nextState: S, dispatch: Dispatch) => void,
    recordStateChanges: () => () => Array<Record<S>>
}

export type AgentReducer<S = any, A = any, T extends OriginAgent<S> = any> = Reducer<S, A> & AgentData<S, T>;

//inner interface
export declare type Action = {
    type: string | number,
    args?: any
};

export type Dispatch = (action: Action) => any;

export type Unsubscribe = () => void;

export type Listener = () => void;

export type Subscribe = (listener: Listener) => Unsubscribe;

export interface Env {
    updateBy?: 'manual' | 'auto',
    expired?: boolean,
    strict?: boolean
}

export type Record<S = any> = {
    type: string | number | symbol,
    state: S
};