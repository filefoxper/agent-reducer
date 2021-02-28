import { GlobalConfig } from "./global.type";
import { getScope } from "./util";

export const agentDependenciesKey = "@@agent-reducer-dependencies";

export const agentIdentifyKey = "@@agent-reducer-identify";

export const agentNamespaceKey = "@@agent-reducer-namespace";

export const agentGlobalScopeKey = "@@agent-reducer-global-scope";

export const getAgentNamespaceKey = () => {
  return agentNamespaceKey;
};

export enum DefaultActionType {
  DX_INITIAL_STATE = "@@AGENT_REDUCER_INITIAL_STATE",
}

export function isAgent(data: any) {
  const dataType = typeof data;
  return dataType === "object" && data[agentIdentifyKey] === true;
}

export const globalConfig = (config?: GlobalConfig) => {
  let scope: any = getScope();
  if(!scope&&!config){
    return {};
  }
  if(!scope&&config){
    throw new Error('Cannot find "window","self" or "global"');
  }
  if (config !== undefined) {
    Object.defineProperty(scope, agentGlobalScopeKey, {
      value: config,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  } else {
    return scope[agentGlobalScopeKey];
  }
};

export const clearGlobalConfig = () => {
  let scope: any = getScope();
  Object.defineProperty(scope, agentGlobalScopeKey, {
    value: undefined,
    writable: true,
    configurable: true,
    enumerable: true,
  });
};
