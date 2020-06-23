import {BranchApi} from "./branch.type";

export interface OriginAgent<S = any> {
    state: S,
    namespace?: string,
    [key:string]:any
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
    recordStateChanges: () => () => Array<StateChange<S>>
}

export type AgentReducer<S = any, A = any, T extends OriginAgent<S> = any> = Reducer<S, A> & AgentData<S, T>;

//inner interface
export declare type Action = {
    type: string,
    args?: any
};

export type Dispatch = (action: Action) => any;

export interface Env {
    updateBy?: 'manual' | 'auto',
    expired?: boolean,
    strict?: boolean
}

export type StateChange<S = any> = {
    type: string | number | symbol,
    state: S
};

export type AgentDependencies<S, T extends OriginAgent<S>> = {
    entry: T,
    store: StoreSlot<S>,
    env: Env,
    branchApi?: BranchApi
};