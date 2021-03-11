# MiddleWares

MiddleWares 是一个用于存储多个常用 MiddleWare 的 class 集合。

## MiddleWares.takeNone()

这个 MiddleWare 可以拦截所有的 state 变化。 

```typescript
class MiddleWares{
    static takeNone(): MiddleWare
}
```

## MiddleWares.takePromiseResolve()

当前 MiddleWare 用于处理 promise 返回值，它将 promise resolve 的数据传递给下一个 MiddleWare 数据处理器。如果待处理数据并非 promise ，该 MiddleWare 会跳过处理，直接将数据透传给下一个 MiddleWare。

```typescript
class MiddleWares{
    static takePromiseResolve(): MiddleWare
}
```

## MiddleWares.takeAssignable()

当前 MiddleWare 用于处理不完整的 state 返回值，它将返回数据传与当前 state 合并成一个新数据递给下一个 MiddleWare 数据处理器。如果待处理数据并非可合并的 object ，该 MiddleWare 会跳过处理，直接将数据透传给下一个 MiddleWare。

```typescript
class MiddleWares{
    static takeAssignable(): MiddleWare
}
```

## MiddleWares.takeThrottle(waitMs)

当前 MiddleWare 用于控制 `Agent` 方法以 throttle 节流的模式运行。 

```typescript
class MiddleWares{
    static takeThrottle(waitMs: number): MiddleWare
}
```

* waitMs - 节流限时
  
## MiddleWares.takeDebounce(waitMs, opt)

当前 MiddleWare 用于控制 `Agent` 方法以 debounce 防抖的模式运行。

```typescript
class MiddleWares{
    static takeDebounce(waitMs: number, opt?: { leading?: boolean }): MiddleWare
}
```
* waitMs - 防抖等待时长
* opt - 可选参数, 通过设置 `leading` 为 true，可以控制防抖模式为前防模式

## MiddleWares.takeLazy(waitMs)

`MiddleWares.takeDebounce`的早期版本，没有可选配置。
```typescript
class MiddleWares{
    static takeLazy(waitMs: number): MiddleWare
}
```
* waitMs - 防抖等待时长

## MiddleWares.takeBlock(blockMs)

当前 MiddleWare 的使用特征：方法完全结束时，如果返回值为 promise ，则必须等待至 promise resolve 或 reject 之后，才能再次运行该方法。

```typescript
class MiddleWares{
    static takeBlock(blockMs?: number): MiddleWare
}
```
* blockMs - 可选参数，阻滞时间，如果距上次调用时长超过设置时间，无论 promise 是否完成，都可以再次运行该方法。  

单元测试[源码](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/api/middleWares.spec.ts)。

返回 [API Reference](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/index.md)