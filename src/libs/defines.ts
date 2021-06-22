import { GlobalConfig } from './global.type';
import { getScope } from './util';

export const agentDependenciesKey = '@@agent-reducer-dependencies';

export const agentIdentifyKey = '@@agent-reducer-identify';

export const agentListenerKey = '@@agent-reducer-listeners';

export const agentSharingMiddleWareKey = '@@agent-sharing-middle-ware';

export const agentSharingTypeKey = '@@agent-sharing-type';

export const agentModelResetKey = '@@agent-reducer-model-reset';

export const agentNamespaceKey = '@@agent-reducer-namespace';

export const agentGlobalScopeKey = '@@agent-reducer-global-scope';

export const getAgentNamespaceKey = ():string => agentNamespaceKey;

export enum DefaultActionType {
  DX_INITIAL_STATE = '@@AGENT_REDUCER_INITIAL_STATE',
  DX_MUTE_STATE = '@@AGENT_MUTE_STATE',
}

export function isAgent<T extends {[key:string]:any}>(data: T):boolean {
  const dataType = typeof data;
  return dataType === 'object' && data[agentIdentifyKey] === true;
}

export const globalConfig = (config?: GlobalConfig):GlobalConfig => {
  const scope: any = getScope();
  if (!scope && !config) {
    return {};
  }
  if (!scope && config) {
    throw new Error('Cannot find "window","self" or "global"');
  }
  if (config !== undefined) {
    Object.defineProperty(scope, agentGlobalScopeKey, {
      value: config,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    return config;
  }
  return scope[agentGlobalScopeKey];
};

export const clearGlobalConfig = ():void => {
  const scope: any = getScope();
  Object.defineProperty(scope, agentGlobalScopeKey, {
    value: undefined,
    writable: true,
    configurable: true,
    enumerable: true,
  });
};
