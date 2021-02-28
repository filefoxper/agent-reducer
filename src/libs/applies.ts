import {
  Runtime,
  NextProcess,
  MiddleWare,
  LifecycleMiddleWare,
  LifecycleRuntime,
} from "./global.type";
import { isPromise } from "./util";

export function composeCallArray(calls: ((p: any) => any)[]) {
  const callList = [...calls].reverse();
  return function (p: any): any | void {
    return callList.reduce(
      (result: any, call: (p: any) => any) => call(result),
      p
    );
  };
}

export function defaultMiddleWare<T>(runtime: Runtime) {
  // 支持1.+.+版本
  if (runtime.env&&runtime.env.legacy) {
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
) {
  function isAllValidated(
    nextProcesses: Array<NextProcess | void>
  ): nextProcesses is Array<NextProcess> {
    return nextProcesses.every(
      (nextProcess): nextProcess is NextProcess => !!nextProcess
    );
  }

  function isLifecycleMiddleWare(
    middleWare: MiddleWare | LifecycleMiddleWare
  ): middleWare is LifecycleMiddleWare {
    return (middleWare as LifecycleMiddleWare).lifecycle;
  }

  const shouldBeLifecycle = middleWares.some(isLifecycleMiddleWare);

  const mdw = function finalMiddleWare<T>(runtime: Runtime<T>) {
    const nextProcesses = middleWares
      .concat(defaultMiddleWare)
      .map((middleWare) => {
        if (isLifecycleMiddleWare(middleWare)) {
          return middleWare(runtime as LifecycleRuntime<T>);
        }
        return middleWare(runtime);
      });
    if (!isAllValidated(nextProcesses)) {
      return;
    }
    return composeCallArray(nextProcesses);
  };
  mdw.lifecycle = shouldBeLifecycle;
  return mdw;
}
