import { ErrorListener, Model } from './global.type';
import { agentErrorConnectionKey } from './defines';

export function subscribeError<S, T extends Model<S>>(model:T, listener:ErrorListener):(()=>void) {
  const listeners = model[agentErrorConnectionKey] || [];
  model[agentErrorConnectionKey] = listeners;
  const hasListener = listeners.some((l) => l === listener);
  if (!hasListener) {
    listeners.push(listener);
  }
  return function unsubscribeError() {
    const ls = model[agentErrorConnectionKey] || [];
    const index = ls.findIndex((l) => l === listener);
    if (index < 0) {
      return;
    }
    ls.splice(index, 1);
  };
}

export function reject<S, T extends Model<S>>(model:T, error:unknown, methodName:string):void {
  const listeners = model[agentErrorConnectionKey] || [];
  model[agentErrorConnectionKey] = listeners;
  listeners.forEach((l) => {
    l(error, methodName);
  });
}

export function hasErrorListener<S, T extends Model<S>>(model:T):boolean {
  const listeners = model[agentErrorConnectionKey] || [];
  return listeners.length > 0;
}
