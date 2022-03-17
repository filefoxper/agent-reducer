import { copyWithMiddleWare } from './agent';
import { agentCallingMiddleWareKey } from './defines';
import {
  OriginAgent,
  MiddleWare,
  LifecycleMiddleWare,
  DecoratorCaller,
} from './global.type';
import { applyMiddleWares } from './applies';

type MiddleWareAbleFunction = ((...args: any[]) => any) & {
  [agentCallingMiddleWareKey]?: MiddleWare;
};

type MiddleWareAble<S, T extends OriginAgent<S>> =
    MiddleWareAbleFunction | T | ({ new (): T } & {[agentCallingMiddleWareKey]?:MiddleWare});

export function withMiddleWare<S, T extends OriginAgent<S>>(
  agent: T,
  ...mdws: (MiddleWare | LifecycleMiddleWare)[]
): T {
  return copyWithMiddleWare<S, T>(agent, applyMiddleWares(...mdws), 'copy');
}

export const middleWare = <
    S,
    T extends OriginAgent<S>
    >(
    callOrMiddleWare: MiddleWare | LifecycleMiddleWare | MiddleWareAble<S, T>,
    ...mdw: (MiddleWare | LifecycleMiddleWare)[]
  ):DecoratorCaller => {
  (callOrMiddleWare as MiddleWareAble<S, T>)[agentCallingMiddleWareKey] = mdw.length
    ? applyMiddleWares(...mdw)
    : undefined;
  return function callerWithMiddleWare(target: T, p?: string) {
    const call: MiddleWareAble<S, T> = p != null
      ? target[p]
      : (target as unknown as MiddleWareAble<S, T>);
    call[agentCallingMiddleWareKey] = applyMiddleWares(callOrMiddleWare as MiddleWare, ...mdw);
    return call;
  };
};
