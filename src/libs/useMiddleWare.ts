import { copyWithMiddleWare } from './agent';
import { agentDependenciesKey } from './defines';
import { MiddleWareAbleFunction } from './useMiddleWare.type';
import {
  OriginAgent,
  MiddleWare,
  LifecycleMiddleWare,
} from './global.type';
import { AgentDependencies } from './agent.type';
import { applyMiddleWares } from './applies';

export function useMiddleWare<S, T extends OriginAgent<S>>(
  agent: T & { [agentDependenciesKey]?: AgentDependencies<S, T> },
  ...mdws: (MiddleWare | LifecycleMiddleWare)[]
): T {
  return copyWithMiddleWare(agent, applyMiddleWares(...mdws), 'copy');
}

export const middleWare = (
  callOrMiddleWare: MiddleWare | MiddleWareAbleFunction,
  mdw?: MiddleWare | MiddleWareAbleFunction,
):MiddleWareAbleFunction => {
  if (mdw) {
    (callOrMiddleWare as MiddleWareAbleFunction).middleWare = mdw;
    return callOrMiddleWare as MiddleWareAbleFunction;
  }
  return function callerWithMiddleWare<T extends { [key: string]: any }>(target: T, p: string) {
    const call: MiddleWareAbleFunction = target[p];
    call.middleWare = callOrMiddleWare as MiddleWare;
    return call;
  } as MiddleWareAbleFunction;
};
