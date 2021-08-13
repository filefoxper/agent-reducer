import { applyMiddleWares } from './applies';
import MiddleWares from './middleWares';
import { LifecycleMiddleWares } from './lifecycleMiddleWares';
import { MiddleWare } from './global.type';

export default class MiddleWarePresets {
  static takeNothing = MiddleWares.takeNothing;

  /**
   * @deprecated
   */
  static takeNone = MiddleWares.takeNothing;

  static takeAssignable = MiddleWares.takeAssignable;

  static takePromiseResolve = MiddleWares.takePromiseResolve;

  static takeLatest():MiddleWare {
    return applyMiddleWares(
      LifecycleMiddleWares.takeLatest(),
      MiddleWares.takePromiseResolve(),
    );
  }

  /**
   * @deprecated
   * @param ms
   */
  static takeBlock(ms?: number):MiddleWare {
    return MiddleWarePresets.takeUnstableBlock(ms);
  }

  static takeUnstableBlock(ms?: number):MiddleWare {
    return applyMiddleWares(
      MiddleWares.takeUnstableBlock(ms),
      MiddleWares.takePromiseResolve(),
    );
  }

  /**
   * @deprecated
   * @param wait
   */
  static takeThrottle(wait: number):MiddleWare {
    return MiddleWarePresets.takeUnstableThrottle(wait);
  }

  static takeUnstableThrottle(wait: number):MiddleWare {
    return applyMiddleWares(
      MiddleWares.takeUnstableThrottle(wait),
      MiddleWares.takePromiseResolve(),
    );
  }

  static takeUnstableDebounce(wait: number, opt?: { leading?: boolean }):MiddleWare {
    return applyMiddleWares(
      MiddleWares.takeUnstableDebounce(wait, opt),
      MiddleWares.takePromiseResolve(),
    );
  }

  /**
   * @deprecated
   * @param wait
   * @param opt
   */
  static takeDebounce(wait: number, opt?: { leading?: boolean }):MiddleWare {
    return MiddleWarePresets.takeUnstableDebounce(wait, opt);
  }

  static takePromiseResolveAssignable():MiddleWare {
    return applyMiddleWares(
      MiddleWares.takePromiseResolve(),
      MiddleWares.takeAssignable(),
    );
  }

  /**
   * @deprecated
   * @param ms
   */
  static takeLazyAssignable(ms: number):MiddleWare {
    return applyMiddleWares(
      MiddleWares.takeUnstableDebounce(ms),
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

  static takeUnstableBlockAssignable(ms?: number):MiddleWare {
    return applyMiddleWares(
      MiddleWares.takeUnstableBlock(ms),
      MiddleWares.takePromiseResolve(),
      MiddleWares.takeAssignable(),
    );
  }

  /**
   * @deprecated
   * @param ms
   */
  static takeBlockAssignable(ms?: number):MiddleWare {
    return MiddleWarePresets.takeUnstableBlockAssignable(ms);
  }

  static takeUnstableThrottleAssignable(wait: number):MiddleWare {
    return applyMiddleWares(
      MiddleWares.takeUnstableThrottle(wait),
      MiddleWares.takePromiseResolve(),
      MiddleWares.takeAssignable(),
    );
  }

  /**
   * @deprecated
   * @param wait
   */
  static takeThrottleAssignable(wait: number):MiddleWare {
    return MiddleWarePresets.takeUnstableThrottleAssignable(wait);
  }

  static takeUnstableDebounceAssignable(wait: number, opt?: { leading?: boolean }):MiddleWare {
    return applyMiddleWares(
      MiddleWares.takeUnstableDebounce(wait, opt),
      MiddleWares.takePromiseResolve(),
      MiddleWares.takeAssignable(),
    );
  }

  /**
   * @deprecated
   * @param wait
   * @param opt
   */
  static takeDebounceAssignable(wait: number, opt?: { leading?: boolean }):MiddleWare {
    return MiddleWarePresets.takeUnstableDebounceAssignable(wait, opt);
  }
}
