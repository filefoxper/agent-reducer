import { Model } from './global.type';
import { agentListenerKey, agentSharingTypeKey } from './defines';

export function isConnecting<
    S,
    T extends Model<S> = Model<S>
    >(modelInstance: T):boolean {
  const listeners = modelInstance[agentListenerKey] || [];
  return listeners.length !== 0;
}

export function stateUpdatable<
    S,
    T extends Model<S> = Model<S>
    >(modelInstance:T):boolean {
  return isConnecting<S, T>(modelInstance) || modelInstance[agentSharingTypeKey] === 'hard';
}
