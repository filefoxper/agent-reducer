import {generateAgent} from "./agent";
import {agentDependenciesKey} from "./defines";
import {middleWareAbleFunction} from "./useMiddleWare.type";
import {OriginAgent, Env, MiddleWare, LifecycleEnv, LifecycleMiddleWare} from './global.type';
import {AgentDependencies} from './agent.type';
import {applyMiddleWares} from "./applies";
import {createProxy} from "./util";

/**
 * @deprecated
 * @param agent
 * @param mdw
 */
export function branch<S, T extends OriginAgent<S>>(agent: T & { [agentDependenciesKey]?: AgentDependencies<S, T> }, mdw: MiddleWare | LifecycleMiddleWare): T {
    return useMiddleWare(agent, mdw);
}

export function useMiddleWare<S, T extends OriginAgent<S>>(agent: T & { [agentDependenciesKey]?: AgentDependencies<S, T> }, mdw: MiddleWare | LifecycleMiddleWare): T {

    let agentCloned: T;

    const invokeDependencies: undefined | AgentDependencies<S, T> = agent[agentDependenciesKey];
    if (!invokeDependencies) {
        throw new Error('An agent copy version should create on an agent object.');
    }

    const {entry, store, env, middleWare} = invokeDependencies;

    const reCloneAgentWithNewExpired = () => {
        agentCloned = cloneAgentWithNewExpired();
    };

    const cloneAgentWithNewExpired = () => {
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
        return generateAgent(entry, store, cloneEnvProxy, applyMiddleWares(mdw, middleWare), true);
    };

    agentCloned = cloneAgentWithNewExpired();

    return createProxy(agent, {
        set() {
            return false;
        },
        get(target: T, p: string | number): any {
            const source = agentCloned[p];
            if (typeof source === 'function') {
                return function replacedCall(...args: any[]) {
                    const currentSource = agentCloned[p];
                    return currentSource.apply(agentCloned, [...args]);
                }
            }
            return source;
        }
    });
}

export const middleWare = (callOrMiddleWare: MiddleWare | middleWareAbleFunction, mdw?: MiddleWare | middleWareAbleFunction) => {
    if (mdw) {
        (callOrMiddleWare as middleWareAbleFunction).middleWare = mdw;
        return (callOrMiddleWare as middleWareAbleFunction);
    }
    return function <T extends { [key: string]: any }>(target: T, p: string) {
        let call: middleWareAbleFunction = target[p];
        call.middleWare = callOrMiddleWare as MiddleWare;
        return call;
    } as middleWareAbleFunction;
}
