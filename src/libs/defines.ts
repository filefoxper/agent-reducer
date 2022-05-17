export const agentDependenciesKey = '@@agent-reducer-dependencies';

export const agentIdentifyKey = '@@agent-reducer-identify';

export const agentListenerKey = '@@agent-reducer-listeners';

export const agentIsEffectAgentKey = '@@agent-is-effect-agent';

export const agentActMethodAgentLevelKey = '@@agent-act-method-agent-level';

export const agentActMethodAgentLaunchHandlerKey = '@@agent-act-method-agent-launch-handler';

export const agentFlowForceWorkFlow = '@@agent-flow-force-work-flow';

export const agentErrorConnectionKey = '@@agent-error-connection';

export const agentCallingMiddleWareKey = '@@agent-reducer-calling-middle-ware';

export const agentCallingEffectTargetKey = '@@agent-reducer-calling-effect-target';

export const agentSharingMiddleWareKey = '@@agent-reducer-sharing-middle-ware';

export const agentSharingTypeKey = '@@agent-reducer-sharing-type';

export const agentActionKey = '@@agent-reducer-action';

export const agentModelResetKey = '@@agent-reducer-model-reset';

export const agentMethodName = '@@agent-method-name';

export const agentEffectsKey = '@@agent-effects';

export const agentRunningEffectsKey = '@@agent-running-effects';

export const agentModelWorking = '@@agent-model-working';

export const agentModelFlowMethodKey = '@@agent-model-flow-method';

export const agentConnectorKey = '@@agent-connector';

export const agentModelMethodsCacheKey = '@@agent-model-methods-cache';

export const agentModelInstanceInitialedKey = '@@agent-model-instance-initialed';

export const agentStrictModelKey = '@@agent-strict-model';

export const agentStrictModelActMethodKey = '@@agent-strict-model-act-method';

export enum DefaultActionType {
  DX_INITIAL_STATE = '@@AGENT_REDUCER_INITIAL_STATE',
  DX_MUTE_STATE = '@@AGENT_MUTE_STATE',
}

export function isAgent<T extends {[key:string]:any}>(data: T):boolean {
  const dataType = typeof data;
  return dataType === 'object' && data[agentIdentifyKey] === true;
}

export const effectModelTargetPlacement = 'EFFECT_MODEL_TARGET_PLACEMENT';
