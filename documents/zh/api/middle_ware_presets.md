# MiddleWarePresets

这个 class 包含了一些常用的 MiddleWare 串行供日常使用。
```typescript
import { applyMiddleWares } from "./applies";
import { MiddleWares } from "./middleWares";
import { LifecycleMiddleWares } from "./lifecycleMiddleWares";

export class MiddleWarePresets {
  static takeAssignable = MiddleWares.takeAssignable;

  static takePromiseResolve = MiddleWares.takePromiseResolve;

  static takeLazy(ms: number) {
    return applyMiddleWares(
      MiddleWares.takeLazy(ms),
      MiddleWares.takePromiseResolve()
    );
  }

  static takeLatest() {
    return applyMiddleWares(
      LifecycleMiddleWares.takeLatest(),
      MiddleWares.takePromiseResolve()
    );
  }

  static takeBlock(ms?: number) {
    return applyMiddleWares(
      MiddleWares.takeBlock(ms),
      MiddleWares.takePromiseResolve()
    );
  }

  static takeThrottle(wait: number) {
    return applyMiddleWares(
      MiddleWares.takeThrottle(wait),
      MiddleWares.takePromiseResolve()
    );
  }

  static takeDebounce(wait: number, opt?: { leading?: boolean }) {
    return applyMiddleWares(
      MiddleWares.takeDebounce(wait, opt),
      MiddleWares.takePromiseResolve()
    );
  }

  static takePromiseResolveAssignable() {
    return applyMiddleWares(
      MiddleWares.takePromiseResolve(),
      MiddleWares.takeAssignable()
    );
  }

  static takeLazyAssignable(ms: number) {
    return applyMiddleWares(
      MiddleWares.takeLazy(ms),
      MiddleWares.takePromiseResolve(),
      MiddleWares.takeAssignable()
    );
  }

  static takeLatestAssignable() {
    return applyMiddleWares(
      LifecycleMiddleWares.takeLatest(),
      MiddleWares.takePromiseResolve(),
      MiddleWares.takeAssignable()
    );
  }

  static takeBlockAssignable(ms?: number) {
    return applyMiddleWares(
      MiddleWares.takeBlock(ms),
      MiddleWares.takePromiseResolve(),
      MiddleWares.takeAssignable()
    );
  }

  static takeThrottleAssignable(wait: number) {
    return applyMiddleWares(
      MiddleWares.takeThrottle(wait),
      MiddleWares.takePromiseResolve(),
      MiddleWares.takeAssignable()
    );
  }

  static takeDebounceAssignable(wait: number, opt?: { leading?: boolean }) {
    return applyMiddleWares(
      MiddleWares.takeDebounce(wait, opt),
      MiddleWares.takePromiseResolve(),
      MiddleWares.takeAssignable()
    );
  }
}
```
你可以选择一个合适的 MiddleWare 串行直接使用，也可以在此基础上串入其他需要的 MiddleWare 。

返回 [API Reference](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/index.md)