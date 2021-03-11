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
    const mdw = function takeLatestMiddleWare <T>(runtime: LifecycleRuntime<T>): NextProcess {
      return function takeLatestNextProcess(next: StateProcess): StateProcess {
        return function takeLatestStateProcess(result: any):any {
          const { cache, env } = runtime;
          if (!isPromise(result)) {
            return next(result);
          }
          const version = cache.version || 0;
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
