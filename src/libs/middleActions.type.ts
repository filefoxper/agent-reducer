import {agentDependenciesKey} from "./defines";
import {AgentDependencies} from "./agent.type";
import {Env, OriginAgent, MiddleWare, LifecycleMiddleWare} from "./global.type";

export interface MiddleActionsInterface<T extends OriginAgent<S>,S> {
    agent: T & { [agentDependenciesKey]?: AgentDependencies<S, T> },

    [key: string]: any
}

export interface MiddleActionDependencies<T> {
    agent: T,
    middleWare: MiddleWare | LifecycleMiddleWare,
    agentEnv: Env
}

type Caller = (...args: any[]) => any;

export type AsyncRuntime<T> = {
    caller: Caller,
    sourceCaller: Caller,
    callerName: string,
    args?: any[],
    target: T,
    source: T,
    env: Env,
    cache: { [key: string]: any }
};

export interface AsyncInvokeDependencies<T = any> {
    cache: { [key: string]: AsyncRuntime<T> },
    functionCache: { [key: string]: Function }
}