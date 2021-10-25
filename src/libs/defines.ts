export const agentDependenciesKey = '@@agent-reducer-dependencies';

export const agentIdentifyKey = '@@agent-reducer-identify';

export const agentListenerKey = '@@agent-reducer-listeners';

export const agentCallingMiddleWareKey = '@@agent-reducer-calling-middle-ware';

export const agentSharingMiddleWareKey = '@@agent-reducer-sharing-middle-ware';

export const agentSharingTypeKey = '@@agent-reducer-sharing-type';

export const agentActionsKey = '@@agent-reducer-actions';

export const agentModelResetKey = '@@agent-reducer-model-reset';

export const agentMethodName = '@@agent-method-name';

export enum DefaultActionType {
  DX_INITIAL_STATE = '@@AGENT_REDUCER_INITIAL_STATE',
  DX_MUTE_STATE = '@@AGENT_MUTE_STATE',
}

export function isAgent<T extends {[key:string]:any}>(data: T):boolean {
  const dataType = typeof data;
  return dataType === 'object' && data[agentIdentifyKey] === true;
}
