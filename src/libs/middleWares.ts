import {
  MiddleWare,
  NextProcess,
  OriginAgent,
  Runtime,
  StateProcess,
} from './global.type';
import { isObject, isPromise } from './util';
import { isAgent } from './defines';

export default class MiddleWares {
  static takeNone():MiddleWare {
    return function noneMiddleWare() {
      return function nextProcess():StateProcess {
        return function stateProcess(result:any) {
          return result;
        };
      };
    };
  }

  static takePromiseResolve(): MiddleWare {
    return function promiseMiddleWare() {
      return function nextProcess(next: StateProcess): StateProcess {
        return function stateProcess(result: any) {
          if (!isPromise(result)) {
            return next(result);
          }
          return result.then((data: any) => next(data));
        };
      };
    };
  }

  static takeAssignable(): MiddleWare {
    return function assignableMiddleWare(runtime: Runtime) {
      const { target } = runtime;
      const { state } = target as OriginAgent;
      return function nextProcess(next: StateProcess): StateProcess {
        return function stateProcess(result: any) {
          if (!isAgent(target) || !isObject(result) || !isObject(state)) {
            return next(result);
          }
          const copy = Object.create(
            Object.getPrototypeOf(state),
            Object.getOwnPropertyDescriptors(state),
          );
          return next(Object.assign(copy, result));
        };
      };
    };
  }

  static takeBlock(blockMs?: number): MiddleWare {
    return function blockMiddleWare <T>(runtime: Runtime<T>): NextProcess | void {
      const { cache } = runtime;
      const now = new Date().getTime();
      if (
        cache.running
        && (blockMs === undefined || now - cache.running < blockMs)
      ) {
        return undefined;
      }
      cache.running = now;
      return function nextProcess(next: StateProcess) {
        return function stateProcess(result: any): StateProcess {
          if (isPromise(result)) {
            const data = next(result);
            result.finally(() => {
              cache.running = undefined;
            });
            return data;
          }
          cache.running = undefined;
          return next(result);
        };
      };
    };
  }

  static takeLazy(waitMs: number): MiddleWare {
    return MiddleWares.takeDebounce(waitMs);
  }

  static takeThrottle(waitMs: number): MiddleWare {
    return function throttleMiddleWare<T>(runtime: Runtime<T>): NextProcess | void {
      function timeout(lastCallerInfo: {
        caller: (...args: any[]) => any;
        args: any[];
        target: T;
      }) {
        if (!lastCallerInfo) {
          return;
        }
        const { caller, args, target } = lastCallerInfo;
        caller.apply(target, args || []);
      }

      const {
        cache, caller, args, target,
      } = runtime;
      const { lastTime } = cache;
      if (lastTime !== undefined) {
        cache.lastCallerInfo = { caller, args, target };
        return undefined;
      }
      cache.lastTime = new Date().getTime();
      setTimeout(() => {
        cache.lastTime = undefined;
        timeout(cache.lastCallerInfo);
        cache.lastCallerInfo = undefined;
      }, waitMs);
      return function nextProcess(next: StateProcess): StateProcess {
        return function stateProcess(result: any) {
          return next(result);
        };
      };
    };
  }

  static takeDebounce(waitMs: number, opt?: { leading?: boolean }): MiddleWare {
    const { leading } = opt || {};

    return leading
      ? function leadingDebounceMiddleWare <T>(runtime: Runtime<T>): NextProcess | void {
        const {
          caller, args, target, cache,
        } = runtime;
        const now = new Date().getTime();
        const { last } = cache;
        if (last === undefined) {
          cache.last = now;
          return function nextProcess(next: StateProcess): StateProcess {
            return function stateProcess(result: any) {
              return next(result);
            };
          };
        }
        if (now - last < waitMs) {
          cache.last = now;
        } else {
          cache.last = undefined;
          caller.apply(target, args || []);
        }
        return undefined;
      }
      : function debounceMiddleWare <T>(runtime: Runtime<T>): NextProcess | void {
        function call(rt: Runtime<T>) {
          const {
            caller, target, args, cache,
          } = rt;
          cache.debtimeout = null;
          caller.apply(target, args || []);
        }

        const { cache } = runtime;
        const { debtimeout } = cache;
        if (debtimeout === undefined || debtimeout !== null) {
          clearTimeout(debtimeout);
          cache.debtimeout = setTimeout(() => call(runtime), waitMs);
          return undefined;
        }
        cache.debtimeout = undefined;
        return function nextProcess(next: StateProcess): StateProcess {
          return function stateProcess(result: any) {
            return next(result);
          };
        };
      };
  }
}
