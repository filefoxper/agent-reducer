/** main **/

export {createAgentReducer} from './libs/reducer';

export {useMiddleWare, middleWare} from './libs/useMiddleWare';

export {useMiddleActions, MiddleActions} from './libs/middleActions';

/** middleWares **/

export {defaultMiddleWare, applyMiddleWares} from './libs/applies';

export {LifecycleMiddleWares, toLifecycleMiddleWare} from './libs/lifecycleMiddleWares';

export {MiddleWares} from './libs/middleWares';

export {MiddleWarePresets} from './libs/middleWarePresets';

/** global set and defines **/

export {globalConfig, clearGlobalConfig, DefaultActionType, getAgentNamespaceKey,isAgent} from './libs/defines';

/** types **/

export {
    OriginAgent,
    Env,
    Runtime,
    MiddleWare,
    NextProcess,
    StateProcess,
    LifecycleRuntime,
    LifecycleEnv
} from './libs/global.type';

export {Reducer, Action, AgentReducer} from './libs/reducer.type';
