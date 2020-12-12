import {agentDependenciesKey} from "./defines";
import {
    OriginAgent,
    Env,
    NextProcess,
    MiddleWare,
    StateProcess,
    LifecycleMiddleWare,
    LifecycleEnv, LifecycleRuntime
} from "./global.type";
import {AgentDependencies} from './agent.type';
import {MiddleActionsInterface, MiddleActionDependencies, AsyncInvokeDependencies} from "./middleActions.type";
import {createProxy} from "./util";
import {middleWareAbleFunction} from "./useMiddleWare.type";
import {generateAgent} from "./agent";

function through(): MiddleWare {

    return function (): NextProcess {

        return function (next: StateProcess) {

            return function (result: any) {
                next(result);
            }

        }

    }

}


function rebuildMiddleActionDependencies<T extends OriginAgent<S>, P extends MiddleActionsInterface<T,S>,S>(
    agent: T, source: middleWareAbleFunction, globalMiddleWare?: MiddleWare | LifecycleMiddleWare
): MiddleActionDependencies<T> {
    const invokeDependencies: AgentDependencies<S, T> = agent[agentDependenciesKey];
    const {entry, store, env, middleWare} = invokeDependencies;
    const {middleWare: cloneMiddleWare} = source;

    let branchAgent: MiddleActionDependencies<T>;

    const reCloneAgentWithNewExpired = () => {
        branchAgent = cloneAgentWithNewExpired();
    };

    const cloneAgentWithNewExpired = (): MiddleActionDependencies<T> => {
        let expired: boolean = false;
        let cloneEnv: LifecycleEnv = {
            ...env,
            expire: () => {
                expired = true;
            },
            rebuild: () => {
                expired = true;
                reCloneAgentWithNewExpired();
            }
        };
        const cloneEnvProxy = createProxy(cloneEnv, {
            set() {
                return false;
            },
            get(target: Env, property: keyof Env) {
                const source = target[property];
                if (property === 'expired') {
                    return env.expired || expired;
                }
                return source;
            }
        });
        return {
            agent: generateAgent(entry, store, cloneEnvProxy, middleWare, {sourceAgent:agent,type:'copy'}),
            middleWare: cloneMiddleWare ? cloneMiddleWare : globalMiddleWare ? globalMiddleWare : through(),
            agentEnv: cloneEnvProxy
        };
    };

    branchAgent = cloneAgentWithNewExpired();

    return createProxy(branchAgent, {
        get(target: MiddleActionDependencies<T>, p: keyof MiddleActionDependencies<T>): any {
            return branchAgent[p];
        }
    });
}

export function useMiddleActions<T extends OriginAgent<S>, P extends MiddleActions<T, S>=MiddleActions<T>, S = any>(
    agent: T,
    middleActions: { new(agent: T): P }|P,
    middleWare?: MiddleWare | LifecycleMiddleWare
): P {
    if (agent[agentDependenciesKey] === undefined) {
        throw new Error('`middleWareActions` should create on an agent.');
    }
    let invokeDependencies: AsyncInvokeDependencies = {
        cache: {},
        functionCache: {}
    };
    const sideByCallerInstance = typeof middleActions==='function'?new middleActions(agent):middleActions;
    const defaultMiddleWare = <T>(data: T) => data;
    const proxy = createProxy(sideByCallerInstance, {
        get(target: any, type: string): any {
            const source = target[type];
            if (type === 'agent' || typeof source !== 'function') {
                return target[type];
            }
            let {cache, functionCache} = invokeDependencies;

            cache[type] = cache[type] || {};

            if (functionCache[type]) {
                return functionCache[type];
            }
            const middleWareActionDependencies = rebuildMiddleActionDependencies(sideByCallerInstance.agent, source, middleWare);
            const caller = function caller(...args: any[]) {
                let runtime = cache[type];
                if (runtime) {
                    runtime.args = [...args];
                }
                const {agent, middleWare} = middleWareActionDependencies;
                const lifecycleMiddleWare = middleWare as LifecycleMiddleWare;
                const normalMiddleWare = middleWare as MiddleWare;
                const nextProcess = lifecycleMiddleWare.lifecycle ?
                    lifecycleMiddleWare(cache[type] as LifecycleRuntime) :
                    normalMiddleWare(cache[type]);
                if (!nextProcess) {
                    return;
                }
                let newCaller = Object.create(Object.getPrototypeOf(sideByCallerInstance), Object.getOwnPropertyDescriptors(sideByCallerInstance));
                newCaller.agent = agent;
                const nextState = source.apply(newCaller, args);
                const stateProcess = nextProcess(defaultMiddleWare);
                return stateProcess(nextState);
            }
            cache[type] = {
                caller,
                callerName: type,
                sourceCaller: source,
                source: sideByCallerInstance,
                target: proxy,
                env: middleWareActionDependencies.agentEnv,
                cache: {}
            };
            functionCache[type] = caller;
            return caller;
        }
    });
    return proxy;
}

export class MiddleActions<T extends OriginAgent<S>, S = any> {

    agent: T;

    constructor(agent: T) {
        this.agent = agent;
    }

}