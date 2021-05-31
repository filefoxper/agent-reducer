import { applyMiddleWares } from './applies';
import MiddleWares from './middleWares';
import { LifecycleMiddleWares } from './lifecycleMiddleWares';
import { MiddleWare } from './global.type';

export default class MiddleWarePresets {
  static takeNone = MiddleWares.takeNone;

  static takeAssignable = MiddleWares.takeAssignable;

  static takePromiseResolve = MiddleWares.takePromiseResolve;

  static takeLazy(ms: number):MiddleWare {
    return applyMiddleWares(
      MiddleWares.takeLazy(ms),
      MiddleWares.takePromiseResolve(),
    );
  }

  static takeLatest():MiddleWare {
    return applyMiddleWares(
      LifecycleMiddleWares.takeLatest(),
      MiddleWares.takePromiseResolve(),
    );
  }

  static takeBlock(ms?: number):MiddleWare {
    return applyMiddleWares(
      MiddleWares.takeBlock(ms),
      MiddleWares.takePromiseResolve(),
    );
  }

  static takeThrottle(wait: number):MiddleWare {
    return applyMiddleWares(
      MiddleWares.takeThrottle(wait),
      MiddleWares.takePromiseResolve(),
    );
  }

  static takeDebounce(wait: number, opt?: { leading?: boolean }):MiddleWare {
    return applyMiddleWares(
      MiddleWares.takeDebounce(wait, opt),
      MiddleWares.takePromiseResolve(),
    );
  }

  static takePromiseResolveAssignable():MiddleWare {
    return applyMiddleWares(
      MiddleWares.takePromiseResolve(),
      MiddleWares.takeAssignable(),
    );
  }

  static takeLazyAssignable(ms: number):MiddleWare {
    return applyMiddleWares(
      MiddleWares.takeLazy(ms),
      MiddleWares.takePromiseResolve(),
      MiddleWares.takeAssignable(),
    );
  }

  static takeLatestAssignable():MiddleWare {
    return applyMiddleWares(
      LifecycleMiddleWares.takeLatest(),
      MiddleWares.takePromiseResolve(),
      MiddleWares.takeAssignable(),
    );
  }

  static takeBlockAssignable(ms?: number):MiddleWare {
    return applyMiddleWares(
      MiddleWares.takeBlock(ms),
      MiddleWares.takePromiseResolve(),
      MiddleWares.takeAssignable(),
    );
  }

  static takeThrottleAssignable(wait: number):MiddleWare {
    return applyMiddleWares(
      MiddleWares.takeThrottle(wait),
      MiddleWares.takePromiseResolve(),
      MiddleWares.takeAssignable(),
    );
  }

  static takeDebounceAssignable(wait: number, opt?: { leading?: boolean }):MiddleWare {
    return applyMiddleWares(
      MiddleWares.takeDebounce(wait, opt),
      MiddleWares.takePromiseResolve(),
      MiddleWares.takeAssignable(),
    );
  }
}
