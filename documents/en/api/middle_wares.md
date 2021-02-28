# MiddleWares

MiddleWares is a class which contains some static MiddleWare properties. It is a set of often using MiddleWare.

## MiddleWares.takePromiseResolve()

This MiddleWare helps for waiting a promise object which is returned by an `Agent` method or passed from a previous MiddleWare, and passes the promise resolved data to next process. This is a very common MiddleWare, and it just process a promise object, if the object passed in is not a promise, it will be passed to a next process immediately.

```typescript
class MiddleWares{
    static takePromiseResolve(): MiddleWare
}
```

## MiddleWares.takeAssignable()

This MiddleWare helps for merging object which is returned by an `Agent` method or passed from a previous MiddleWare with current `Agent` state, and passes the merged state to next process. If the object passed in or current `Agent` state is not an plain object, it will be passed to a next process immediately.

```typescript
class MiddleWares{
    static takeAssignable(): MiddleWare
}
```

## MiddleWares.takeThrottle(waitMs)

This MiddleWare makes an `Agent` method working with a throttle mode. 

```typescript
class MiddleWares{
    static takeThrottle(waitMs: number): MiddleWare
}
```

* waitMs - the blank waiting time for throttle mode
  
## MiddleWares.takeDebounce(waitMs, opt)

This MiddleWare makes an `Agent` method working with a debounce mode.

```typescript
class MiddleWares{
    static takeDebounce(waitMs: number, opt?: { leading?: boolean }): MiddleWare
}
```
* waitMs - the blank waiting time for debounce mode
* opt - optional param, you can config `leading` in it, and make a leading debounce mode.

## MiddleWares.takeLazy(waitMs)

It is `MiddleWares.takeDebounce`, but without param `opt`.
```typescript
class MiddleWares{
    static takeLazy(waitMs: number): MiddleWare
}
```
* waitMs - the blank waiting time for debounce mode

## MiddleWares.takeBlock(blockMs)

This MiddleWare rule on method: Only previous running promise has resolved or rejected, the current running can be allowed.
```typescript
class MiddleWares{
    static takeBlock(blockMs?: number): MiddleWare
}
```
* blockMs - this param makes a block time, if you set it, MiddleWare will resume method running allowed after method promise resolved( reject ), or  after the block time.  

You can check the [usage](https://github.com/filefoxper/agent-reducer/blob/master/test/en/api/middleWares.spec.ts) about these MiddleWares.

Go back to [API Reference](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/index.md)