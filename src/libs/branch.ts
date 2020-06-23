import {generateAgent} from "./reducer";
import {agentDependenciesKey} from "./defines";
import {createProxy} from "./utils";
import {BranchApi, BranchApiStatus, BranchPlugin} from "./branch.type";
import {AgentDependencies, OriginAgent} from "./reducer.type";

export function branch<S, T extends OriginAgent<S>>(agent: T & { [agentDependenciesKey]?: AgentDependencies<S, T> }, plugin: BranchPlugin): T {

    let branchAgent: undefined | T;

    const invokeDependencies: undefined | AgentDependencies<S, T> = agent[agentDependenciesKey];
    if (!invokeDependencies) {
        throw new Error('A `branch` should create on an agent.');
    }

    const {entry, store, env} = invokeDependencies;

    const rebuildBranchAgent = () => {
        branchAgent = buildBranchAgent();
    };

    const buildBranchAgent = () => {
        const stateDispatchPlugin = plugin({});
        let status: BranchApiStatus = undefined;
        let branchApi: BranchApi = {
            getPlugin: () => stateDispatchPlugin,
            discard: () => {
                status = 'discarded';
                rebuildBranchAgent();
            },
            getStatus: () => {
                return status;
            }
        };
        return generateAgent(entry, store, env, branchApi);
    };

    branchAgent = buildBranchAgent();

    return createProxy(agent, {
        set() {
            return false;
        },
        get(target: T, p: string | number): any {
            if (branchAgent === undefined) {
                throw new Error('branch is not prepared.');
            }
            return branchAgent[p];
        }
    });
}