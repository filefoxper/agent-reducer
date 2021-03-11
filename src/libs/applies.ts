import {
  Runtime,
  NextProcess,
  MiddleWare,
  LifecycleMiddleWare,
  LifecycleRuntime,
} from './global.type';
import { assignWith, createProxy, isPromise } from './util';

export function composeCallArray(calls: ((p: any) => any)[]):(p:any)=>any {
  const callList = [...calls].reverse();
  return function composed(p: any): any | void {
    return callList.reduce(
      (result: any, call: (p: any) => any) => call(result),
      p,
    );
  };
}

export function defaultMiddleWare<T>(runtime: Runtime):NextProcess {
  // 支持1.+.+版本
  if (runtime.env && runtime.env.legacy) {
    return function nextResolver(next: (result: any) => any) {
      return function stateResolver(result: any) {
        if (isPromise(result) || result === undefined) {
          return result;
        }
        return next(result);
      };
    };
  }
  return function nextProcess(next: (result: any) => any) {
    return function stateProcess(result: any) {
      return next(result);
    };
  };
}

export function applyMiddleWares(
  ...middleWares: (MiddleWare | LifecycleMiddleWare)[]
):MiddleWare&{lifecycle:boolean} {
  function isAllValidated(
    nextProcesses: Array<NextProcess | void>,
  ): nextProcesses is Array<NextProcess> {
    return nextProcesses.every(
      (nextProcess): nextProcess is NextProcess => !!nextProcess,
    );
  }

  function isLifecycleMiddleWare(
    middleWare: MiddleWare | LifecycleMiddleWare,
  ): middleWare is LifecycleMiddleWare {
    return (middleWare as LifecycleMiddleWare).lifecycle;
  }

  const shouldBeLifecycle = middleWares.some(isLifecycleMiddleWare);

  const mdw = function finalMiddleWare<T>(runtime: Runtime<T>) {
    const { middleWareCaches } = runtime.cache;
    if (!middleWareCaches) {
      runtime.cache.middleWareCaches = middleWares.map(() => ({}));
    }
    const nextProcesses = middleWares
      .concat(defaultMiddleWare)
      .map((middleWare, i) => {
        const middleWareCache = runtime.cache.middleWareCaches[i];
        const middleWareRuntime = createProxy(runtime, {
          get(target: Runtime<T>, p: keyof Runtime<T>, receiver: any): any {
            if (p === 'cache') {
              return middleWareCache;
            }
            return target[p];
          },
        });
        if (isLifecycleMiddleWare(middleWare)) {
          return middleWare(middleWareRuntime as LifecycleRuntime<T>);
        }
        return middleWare(middleWareRuntime);
      });
    if (!isAllValidated(nextProcesses)) {
      return undefined;
    }
    return composeCallArray(nextProcesses);
  };
  mdw.lifecycle = shouldBeLifecycle;
  return mdw;
}
