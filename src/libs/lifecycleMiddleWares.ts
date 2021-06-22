import {
  LifecycleRuntime,
  NextProcess,
  LifecycleMiddleWare,
  StateProcess,
} from './global.type';
import { isPromise } from './util';

export const toLifecycleMiddleWare = (
  lifecycleMiddleWare: Omit<LifecycleMiddleWare, 'lifecycle'> & {
    lifecycle?: boolean;
  },
): LifecycleMiddleWare => {
  lifecycleMiddleWare.lifecycle = true;
  return lifecycleMiddleWare as LifecycleMiddleWare;
};

export class LifecycleMiddleWares {
  static takeLatest(): LifecycleMiddleWare {
    const modelCacheKey = '@agent-reducer-middle-ware-takeLatest-cache';
    const mdw = function takeLatestMiddleWare <T>(runtime: LifecycleRuntime<T>): NextProcess {
      return function takeLatestNextProcess(next: StateProcess): StateProcess {
        return function takeLatestStateProcess(result: any):any {
          const { env } = runtime;
          const source = runtime.source as T&{[modelCacheKey]?:Record<string, unknown>};
          if (!source[modelCacheKey]) {
            source[modelCacheKey] = {};
          }
          const cache = source[modelCacheKey] || {};
          const version:number = (cache.version as undefined|number) || 0;
          cache.version = version + 1;
          const data = next(result);
          Promise.resolve(data).finally(() => {
            if (version + 1 === cache.version) {
              env.rebuild();
            }
          });
          return data;
        };
      };
    };
    return toLifecycleMiddleWare(mdw);
  }
}
