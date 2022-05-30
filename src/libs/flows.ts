import {
  WorkFlow, FlowRuntime, LaunchHandler, BlockFlowConfig, DebounceFlowConfig,
} from './global.type';
import { isPromise, noop } from './util';

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
      let version:number|null = null;
      return {
        shouldUpdate() {
          return state.version === version;
        },
        invoke(method) {
          return function latestMethod(...args:any[]) {
            version = (state.version || 0) + 1;
            state.version = version;
            return method(...args);
          };
        },
      };
    };
  }

  static debounce(time:number|DebounceFlowConfig, lead?:boolean):WorkFlow {
    const ms = typeof time === 'number' ? time : time.time;
    const leading = typeof time === 'number' ? lead : time.leading;
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

  static block(config?:number|BlockFlowConfig):WorkFlow {
    const timeout = (function computeTimeout() {
      if (config == null) {
        return undefined;
      }
      if (typeof config === 'number') {
        return config;
      }
      return config.timeout;
    }());
    function processPromiseFinished(rt:Promise<unknown>, time?:number):Promise<unknown> {
      const mainPromise = Promise.resolve(rt).then(noop, noop);
      const timeoutPromise = time == null
        ? mainPromise : new Promise<void>((r) => setTimeout(r, time));
      return Promise.race([mainPromise, timeoutPromise]);
    }
    return function process(runtime:FlowRuntime):LaunchHandler {
      const { state } = runtime;
      return {
        invoke(method) {
          return function blockMethod(...args:any[]) {
            if (state.running) {
              return state.result;
            }
            state.running = true;
            const result = method(...args);
            state.result = result;
            if (!isPromise(result)) {
              state.running = false;
              return state.result;
            }
            processPromiseFinished(result, timeout).then(() => {
              state.running = false;
            });
            return state.result;
          };
        },
      };
    };
  }
}

export const defaultFlow = promise();
