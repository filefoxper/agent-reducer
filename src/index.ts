/** main * */

export { createAgentReducer, sharing, weakSharing } from './libs/reducer';

export { useMiddleWare, middleWare } from './libs/useMiddleWare';

export { useMiddleActions, MiddleActions } from './libs/middleActions';

/** middleWares * */

export { defaultMiddleWare, applyMiddleWares } from './libs/applies';

export {
  LifecycleMiddleWares,
  toLifecycleMiddleWare,
} from './libs/lifecycleMiddleWares';

export { default as MiddleWares } from './libs/middleWares';

export { default as MiddleWarePresets } from './libs/middleWarePresets';

/** global set and defines * */

export {
  globalConfig,
  clearGlobalConfig,
  DefaultActionType,
  getAgentNamespaceKey,
  isAgent,
} from './libs/defines';

/** legacy api * */

export { branch, BranchResolvers } from './libs/branch';
