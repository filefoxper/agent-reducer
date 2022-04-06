import { WorkFlow, FlowRuntime, LaunchHandler } from './global.type';
import { isPromise } from './util';

function promise():WorkFlow {
  return function process(runtime:FlowRuntime):LaunchHandler {
    return {
      reLaunch(method) {
        return function promiseMethod(...args:any[]) {
          try {
            const result = method(...args);
            if (!isPromise(result)) {
              runtime.resolve(result);
              return result;
            }
            Promise.resolve(result).then(runtime.resolve, runtime.reject);
            return result;
          } catch (e) {
            runtime.reject(e);
            return undefined;
          }
        };
      },
    };
  };
}

export class Flows {
  static latest():WorkFlow {
    return function process(runtime:FlowRuntime):LaunchHandler {
      const { cache } = runtime;
      const version = (cache.version || 0) + 1;
      cache.version = version;
      return {
        shouldUpdate() {
          return cache.version === version;
        },
      };
    };
  }

  static debounce(ms:number, leading?:boolean):WorkFlow {
    if (leading) {
      return function leadingProcess(runtime:FlowRuntime):LaunchHandler {
        const { cache } = runtime;
        clearTimeout(cache.id);
        cache.active = false;
        cache.id = setTimeout(() => {
          cache.active = true;
        }, ms);
        return {
          shouldLaunch() {
            return cache.active;
          },
        };
      };
    }
    return function process(runtime:FlowRuntime):LaunchHandler {
      const { cache } = runtime;
      return {
        reLaunch(method) {
          return function debMethod(...args:any[]) {
            clearTimeout(cache.id);
            cache.id = setTimeout(() => {
              method(...args);
            }, ms);
          };
        },
      };
    };
  }
}

export const defaultFlow = promise();
