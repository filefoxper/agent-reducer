import { WorkFlow, FlowRuntime, LaunchHandler } from './global.type';
import { isPromise } from './util';

function promise():WorkFlow {
  return function process(runtime:FlowRuntime):LaunchHandler {
    return {
      invoke(method) {
        return function promiseMethod(...args:any[]) {
          try {
            const result = method(...args);
            if (!isPromise(result)) {
              runtime.resolve(result);
              return result;
            }
            return result.then(runtime.resolve, runtime.reject);
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
  static default():WorkFlow {
    return promise();
  }

  static latest():WorkFlow {
    return function process(runtime:FlowRuntime):LaunchHandler {
      const { state } = runtime;
      const version = (state.version || 0) + 1;
      state.version = version;
      return {
        shouldUpdate() {
          return state.version === version;
        },
      };
    };
  }

  static debounce(ms:number, leading?:boolean):WorkFlow {
    if (leading) {
      return function leadingProcess(runtime:FlowRuntime):LaunchHandler {
        const { state } = runtime;
        clearTimeout(state.id);
        state.active = false;
        state.id = setTimeout(() => {
          state.active = true;
        }, ms);
        return {
          shouldLaunch() {
            return state.active;
          },
        };
      };
    }
    return function process(runtime:FlowRuntime):LaunchHandler {
      const { state } = runtime;
      return {
        invoke(method) {
          return function debMethod(...args:any[]) {
            clearTimeout(state.id);
            state.id = setTimeout(() => {
              method(...args);
            }, ms);
          };
        },
      };
    };
  }
}

export const defaultFlow = promise();
