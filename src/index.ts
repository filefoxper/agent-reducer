/** main **/

export {createAgentReducer} from './libs/reducer';

export {branch, useMiddleWare, middleWare} from './libs/useMiddleWare';

export {useMiddleActions, MiddleActions} from './libs/middleActions';

/** middleWares **/

export {defaultResolver, defaultMiddleWare, applyResolvers, applyMiddleWares} from './libs/applies';

export {BranchResolvers, LifecycleMiddleWares,toLifecycleMiddleWare} from './libs/lifecycleMiddleWares';

/** global set and defines **/

export {globalConfig, clearGlobalConfig, DefaultActionType, getAgentNamespaceKey} from './libs/defines';

/** types **/

export {
    OriginAgent,
    Env,
    Runtime,
    Resolver,
    MiddleWare,
    NextLink,
    NextProcess,
    ResultProcessor,
    StateProcess,
    LifecycleRuntime,
    LifecycleEnv
} from './libs/global.type';

export {Reducer, Action, AgentReducer} from './libs/reducer.type';
