import {generateAgent} from "./reducer";
import {agentDependenciesKey} from "./defines";
import {BranchApi, BranchResolver} from "./branch.type";
import {AgentDependencies, Env, OriginAgent} from "./reducer.type";
import {Resolver} from "./resolver.type";
import {applyResolvers} from "./resolver";

/**
 * The function branch is designed for resolving your function returns manually, it returns a result which is a copy of your agent.
 * And this copied agent will prevent you reassign any property in it.
 * When the branch is created, you can use branchApi in resolvePlugin to stop it, or resolve it.
 * When you call branchApi.stop(), the current branch will be stopped, and all dispatch functions in current branch will not dispatching actions.
 * When you call branchApi.resolve(), the current branch will be stopped, and all dispatch functions in this branch will not dispatching actions,
 *  and the current branch will be rebuilt, the stopped branch will be a discarded previous branch.
 *
 * @param agent from an AgentReducer.agent
 * @param branchResolver optional param, it is used for resolving your function returns manually. If you don't set this param, the copy agent will work just like the source agent.
 *
 * @return a copy of your agent working with resolvePlugin.
 */
export function branch<S, T extends OriginAgent<S>>(agent: T & { [agentDependenciesKey]?: AgentDependencies<S, T> }, branchResolver: BranchResolver): T {

    let branchAgent: T;

    const invokeDependencies: undefined | AgentDependencies<S, T> = agent[agentDependenciesKey];
    if (!invokeDependencies) {
        throw new Error('A `branch` should create on an agent.');
    }

    const {entry, store, env, resolver} = invokeDependencies;

    const rebuildBranchAgent = () => {
        branchAgent = buildBranchAgent();
    };

    const buildBranchAgent = () => {
        let expired: boolean = false;
        const branchEnv = new Proxy(env, {
            set() {
                return false;
            },
            get(target: Env, property: keyof Env) {
                const source = target[property];
                if (property === 'expired') {
                    return source || expired;
                }
                return source;
            }
        });
        const branchApi: BranchApi = {
            reject: () => {
                expired = true;
            },
            rebuild: () => {
                expired = true;
                rebuildBranchAgent();
            }
        };
        const apiResolver: Resolver = branchResolver(branchApi);
        return generateAgent(entry, store, branchEnv, applyResolvers(apiResolver,resolver));
    };

    branchAgent = buildBranchAgent();

    return new Proxy(agent, {
        set() {
            return false;
        },
        get(target: T, p: string | number): any {
            const source = branchAgent[p];
            if (typeof source === 'function') {
                return function replacedCall(...args: any[]) {
                    const currentSource = branchAgent[p];
                    return currentSource.apply(branchAgent, [...args]);
                }
            }
            return source;
        }
    });
}