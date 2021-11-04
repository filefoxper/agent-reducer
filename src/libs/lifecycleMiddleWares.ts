import {
  LifecycleRuntime,
  NextProcess,
  LifecycleMiddleWare,
  StateProcess,
} from './global.type';
import { isPromise, noop } from './util';

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
          const source = runtime.model as T&{[modelCacheKey]?:Record<string, unknown>};
          if (!source[modelCacheKey]) {
            source[modelCacheKey] = {};
          }
          const data = next(result);
          if (isPromise(data)) {
            const cache = source[modelCacheKey] || {};
            const version:number = (cache.version as undefined|number) || 0;
            cache.version = version + 1;
            data.then(noop, noop).then(() => {
              if (version + 1 === cache.version) {
                env.rebuild();
              }
            });
          }
          return data;
        };
      };
    };
    return toLifecycleMiddleWare(mdw);
  }
}
