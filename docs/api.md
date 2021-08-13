# API Reference

## create

Creates a `AgentReducer` function from `Model`. The `AgentReducer` function is a `reducer` function, it contains an `agent` object, a `connect` subscribe callback and a `disconnect` unsubscribe callback.

```typescript
function create<
    S,
    T extends Model<S> = Model<S>
    >(
    model: T | { new (): T },
    ...middleWares: (MiddleWare & { lifecycle?: boolean })[]
): AgentReducer<S, T>;
```

* model - the model class or object.
* middleWares - it is optional, you can put MiddleWares you need as default MiddleWares here, the system will make it as a MiddleWare chain.

Be careful, `LifecycleMiddleWare` can not work with this api directly. If you want to use one like `LifecycleMiddleWares.takeLatest`, you'd better set it with api [withMiddleWare](/api?id=withmiddleware) or [middleWare](/api?id=middleware).

#### Example

```typescript
import {create,Model} from 'agent-reducer';

describe('create',()=>{

    // this is a counter model,
    // we can increase or decrease its state
    class Counter implements Model<number> {

        state = 0;  // initial state

        // consider what the method returns as a next state for model
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    test('use `create` API',()=>{
        // use create api, you can create an `Agent` object from its `Model`
        const {agent,connect,disconnect} = create(Counter);
        // before call the methods,
        // you need to connect it first
        connect();
        // the result returned by method `agent.stepUp` will be next state
        agent.stepUp();
        // if there is no more work for `Agent`,
        // you should disconnect it.
        disconnect();
        expect(agent.state).toBe(1);
    });

});
```

To check more [details](/advanced?id=connect-with-another-state-changeable-library)

## connect

Creates an `AgentRunner` from `Model`. It is a shortcut usage of [create](/api?id=create) API.

```typescript
type AgentRunner<T> = {
    run:(callback:(agent:T)=>any)=>any
};

function connect<
    S,
    T extends Model<S> = Model<S>
    >(
    model: T | { new (): T },
    ...middleWares: (MiddleWare & { lifecycle?: boolean })[]
):AgentRunner<T>
```
* model - the model class or object.
* middleWares - it is optional, you can put MiddleWares you need as default MiddleWares here, the system will make it as a MiddleWare chain.

Be careful, `LifecycleMiddleWare` can not work with this api directly. If you want to use one like `LifecycleMiddleWares.takeLatest`, you'd better set it with api [withMiddleWare](/api?id=withmiddleware) or [middleWare](/api?id=middleware).

#### Example

```typescript
import {connect,Model} from 'agent-reducer';

describe('use shortcut of API `create`',()=>{

    // this is a counter model,
    // we can increase or decrease its state
    class Counter implements Model<number> {

        state = 0;  // initial state

        // consider what the method returns as a next state for model
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    test('use API `connect`',()=>{
        const {run} = connect(Counter);
        const state = run((agent)=>{
            agent.stepUp();
            return agent.state;
        });
        expect(state).toBe(1);
    });

});
```

## withMiddleWare

Copys an `Agent` object, and makes methods from the copy version run with the MiddleWares you set in.


```typescript
function withMiddleWare<S, T extends OriginAgent<S>>(
    agent: T,
    ...mdws: (MiddleWare | LifecycleMiddleWare)[]
): T;
```

* agent - `Agent` object, it is a property of `AgentReducer` function created by [create](/api?id=create).
* mdws - `MiddleWares` you want to effect on the copy `Agent` methods.

#### Example

```typescript
import {
  create,
  Model,
  withMiddleWare,
  MiddleWarePresets
  } from 'agent-reducer';

describe('withMiddleWare',()=>{

    // this is a counter model,
    // we can increase or decrease its state
    class Counter implements Model<number> {

        state = 0;  // initial state

        // consider what the method returns as a next state for model
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        async step(isUp: boolean):Promise<number>{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    test('use `withMiddleWare` API',()=>{
        // use create api, you can create an `Agent` object from its `Model`
        const {agent,connect,disconnect} = create(Counter);
        // before call the methods,
        // you need to connect it first
        connect();
        // use `withMiddleWare` to copy an `Agent` use the passed MiddleWare
        const copy = withMiddleWare(agent,MiddleWarePresets.takePromiseResolve());
        copy.step(true);
        disconnect();
        expect(agent.state).toBe(1);
    });

});
```

To check more [details](/guides?id=middleware-override)

## middleWare

Makes a Model method or Model class run with MiddleWares you want to effect on.

```typescript
const middleWare: <
    S,
    T extends Model<S>
    >(
    callOrMiddleWare: MiddleWare | LifecycleMiddleWare | MiddleWareAble<S, T>,
    ...mdw: (MiddleWare | LifecycleMiddleWare)[]
) => DecoratorCaller;
```

* callOrMiddleWare - Model instance, Model class, Model method or MiddleWare.
* mdws - `MiddleWares` you want to effect on.
  
It returns a function for ES6 decorator usage. 

If the first argument is a Model instance, it effects the rest arguments as a chained MiddleWare on this instance; if the first argument is a Model class, it effects the MiddleWares on the Model class; if the first argument is a Model method, it effects the MiddleWares on the Model method; If the first argument is a MiddleWare too, it chains all arguments together as a MiddleWare, and prepare for effecting this MiddleWare on a Model class or Model method by using ES6 decorator.

#### Example

```typescript
import {
  create,
  Model,
  middleWare,
  MiddleWarePresets
  } from 'agent-reducer';

describe('middleWare',()=>{

    // this is a counter model,
    // we can increase or decrease its state
    class Counter implements Model<number> {

        state = 0;  // initial state

        // consider what the method returns as a next state for model
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        @middleWare(MiddleWarePresets.takePromiseResolve())
        async step(isUp: boolean):Promise<number>{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    test('use `middleWare` API',async ()=>{
        // use create api, you can create an `Agent` object from its `Model`
        const {agent,connect,disconnect} = create(Counter);
        // before call the methods,
        // you need to connect it first
        connect();
        await agent.step(true);
        disconnect();
        expect(agent.state).toBe(1);
    });

});
```

To check more [details](/guides?id=middleware-override)

## applyMiddleWares

Chains MiddleWares together to be a final MiddleWare.

```typescript
function applyMiddleWares(
    ...middleWares: (MiddleWare | LifecycleMiddleWare)[]
): MiddleWare
```

* middleWares - MiddleWare callbacks.

Returns a final MiddleWare.

## MiddleWares

It is a set for storing official MiddleWares. These MiddleWares are atom MiddleWares, they have their own duties.

```typescript
class MiddleWares {
  static takeNothing(): MiddleWare;

  /**
     * @deprecated
     */
  static takeNone(): MiddleWare;

  static takePromiseResolve(): MiddleWare;

  static takeAssignable(): MiddleWare;

  /**
     * @deprecated
     */ 
  static takeBlock(blockMs?: number): MiddleWare;

  static takeUnstableBlock(blockMs?: number): MiddleWare;

  /**
   * @deprecated
   * @param waitMs
   */
  static takeThrottle(waitMs: number): MiddleWare;

  static takeUnstableThrottle(waitMs: number): MiddleWare;

  /**
   * @deprecated
   * @param waitMs
   * @param opt
   */
  static takeDebounce(waitMs: number, opt?: {
        leading?: boolean;
    }): MiddleWare;

  static takeUnstableDebounce(waitMs: number, opt?: {
        leading?: boolean;
    }): MiddleWare;
}
```

* takeNothing - stop state change happening.
* takePromiseResolve - take a promise resolve data to next.
* takeAssignable - take a data merge with Model state to next. It uses `Object.assign` to merge the data with Model.state.
* takeUnstableBlock - control a method running way. If the method has not finished, it can not run again, it is useful when the method is an `async method`. You can give it a block period as param, so if the block period is over, it still can be run again, no matter if this method has finished or not.
* takeUnstableThrottle - control a method running way. Make method runs with a `Throttle` feature. You can give it a period as param, and from the method runs as beginning, in the period time you set, it won't run.
* takeUnstableDebounce - control a method running way. Make method runs with a `Debounce` feature. You can give it a period as param, when the method is triggered, it will run delay after the period time, if there is another trigger during the period, it will redelay a period time. If you need a opposite feature about `Debounce`, set the `opt` param property `leading` to true.
* ~~takeNone~~ - old version `takeNothing`
* ~~takeBlock~~ - old version `takeUnstableBlock`
* ~~takeThrottle~~ - old version `takeUnstableThrottle`
* ~~takeDebounce~~ - old version `takeUnstableDebounce`

## LifecycleMiddleWares

It is a set for storing official lifecycle MiddleWare.

```typescript
class LifecycleMiddleWares {
  static takeLatest(): LifecycleMiddleWare;
}
```

* takeLatest - control `Agent` lifecycle. Reject the expired state change from the expired `Agent`, and keep the state change order.

## MiddleWarePresets

It is a set for storing official MiddleWare chains. These MiddleWares are often used.

```typescript
class MiddleWarePresets {
   static takeNothing(): typeof MiddleWares.takeNothing;

    /**
     * @deprecated
     */
    static takeNone: typeof MiddleWares.takeNothing;

    static takeAssignable: typeof MiddleWares.takeAssignable;

    static takePromiseResolve: typeof MiddleWares.takePromiseResolve;

    static takeLatest(): MiddleWare;

    /**
     * @deprecated
     * @param ms
     */
    static takeBlock(ms?: number): MiddleWare;

    static takeUnstableBlock(ms?: number):MiddleWare;

    /**
     * @deprecated
     * @param wait
     */
    static takeThrottle(wait: number): MiddleWare;

    static takeUnstableThrottle(wait: number): MiddleWare;

    /**
     * @deprecated
     * @param wait
     * @param opt
     */
    static takeDebounce(wait: number, opt?: {
        leading?: boolean;
    }): MiddleWare;

    static takeUnstableDebounce(wait: number, opt?: {
        leading?: boolean;
    }): MiddleWare;

    static takePromiseResolveAssignable(): MiddleWare;

    /**
     * @deprecated
     * @param ms
     */
    static takeLazyAssignable(ms: number): MiddleWare;

    static takeLatestAssignable(): MiddleWare;

    static takeBlockAssignable(ms?: number): MiddleWare;

    /**
     * @deprecated
     * @param wait
     */
    static takeThrottleAssignable(wait: number): MiddleWare;

    static takeUnstableThrottleAssignable(wait: number): MiddleWare;

    /**
     * @deprecated
     * @param wait
     * @param opt
     */
    static takeDebounceAssignable(wait: number, opt?: {
        leading?: boolean;
    }): MiddleWare;

    static takeUnstableDebounceAssignable(wait: number, opt?: {
        leading?: boolean;
    }): MiddleWare;
}
```

* takeNothing - MiddleWares.takeNothing
* takeAssignable - MiddleWares.takeAssignable
* takePromiseResolve - MiddleWares.takePromiseResolve
* takeLatest - LifecycleMiddleWares.takeLatest, MiddleWares.takePromiseResolve
* takeUnstableBlock - MiddleWares.takeUnstableBlock, MiddleWares.takePromiseResolve
* takeUnstableThrottle - MiddleWares.takeUnstableThrottle, MiddleWares.takePromiseResolve
* takeUnstableDebounce - MiddleWares.takeUnstableDebounce, MiddleWares.takePromiseResolve
* takePromiseResolveAssignable - MiddleWares.takePromiseResolve, MiddleWares.takeAssignable
* takeLatestAssignable - LifecycleMiddleWares.takeLatest, MiddleWares.takePromiseResolve, MiddleWares.takeAssignable
* takeBlockAssignable - MiddleWares.takeUnstableBlock, MiddleWares.takePromiseResolve, MiddleWares.takeAssignable
* takeUnstableThrottleAssignable - MiddleWares.takeUnstableThrottle, MiddleWares.takePromiseResolve, MiddleWares.takeAssignable
* takeUnstableDebounceAssignable - MiddleWares.takeUnstableDebounce, MiddleWares.takePromiseResolve, MiddleWares.takeAssignable
* ~~takeNone - MiddleWarePresets.takeNothing~~
* ~~takeBlock - MiddleWarePresets.takeUnstableBlock~~
* ~~takeThrottle - MiddleWarePresets.takeUnstableThrottle~~
* ~~takeDebounce - MiddleWarePresets.takeUnstableDebounce~~
* ~~takeLazyAssignable - MiddleWares.takeLazy, MiddleWares.takeAssignable~~
* ~~takeThrottleAssignable - MiddleWarePresets.takeUnstableThrottleAssignable~~
* ~~takeDebounceAssignable - MiddleWarePresets.takeUnstableDebounceAssignable~~

## Example

``` typescript
import {
  create,
  Model,
  middleWare,
  MiddleWarePresets
  } from 'agent-reducer';

describe('MiddleWarePresets',()=>{

    const delay = (ms:number)=>new Promise((r)=>setTimeout(r,ms));

    // this is a counter model,
    // we can increase or decrease its state
    class Counter implements Model<number> {

        state = 0;  // initial state

        @middleWare(MiddleWarePresets.takeUnstableDebounce(100))
        stepUp(): number{
            return  this.state + 1;
        }

        @middleWare(MiddleWarePresets.takeUnstableThrottleAssignable(100))
        stepDown(): number{
            return this.state - 1;
        }

        @middleWare(MiddleWarePresets.takeLatest())
        async step(isUp: boolean):Promise<number>{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    test('use `middleWare` API',async ()=>{
        // use create api, you can create an `Agent` object from its `Model`
        const {agent,connect,disconnect} = create(Counter);
        // before call the methods,
        // you need to connect it first
        connect();
        agent.stepUp();
        agent.stepUp();
        await delay(100);
        expect(agent.state).not.toBe(2);
        expect(agent.state).toBe(1);
        agent.stepDown();
        agent.stepDown();
        expect(agent.state).not.toBe(-1);
        expect(agent.state).toBe(0);
        disconnect();
    });

});
```

## toLifecycleMiddleWare

Change a MiddleWare to be a Lifecycle MiddleWare.

```typescript
const toLifecycleMiddleWare: (lifecycleMiddleWare: MiddleWare) => LifecycleMiddleWare;
```

* lifecycleMiddleWare - MiddleWare

## defaultMiddleWare

The default MiddleWare in system.

## sharing

Creates a sharable `Model instance` factory. It returns an object contains a `current` property for the current `Model instance`, and a `initial` callback for initialing the current `Model instance`.

The `current` from this `sharing` api can only be initialized once, then when you get it again, it will be fetched directly from the memory.

``` typescript
function sharing<
    S,
    T extends Model<S> = Model<S>
    >(factory:Factory<S, T>): SharingRef<S, T>;
```

* factory - a callback runs at the initial time for creating or recreating a Model instance.

It returns a `SharingRef` object contains property named `current` and `initial`.

```typescript
type SharingRef<
    S,
    T extends Model<S>= Model<S>,
    > = {
    current:T,
    initial:Factory<S, T>
};
```

To check more [details](/feature?id=model-sharing).

## weakSharing

Creates a sharable `Model instance` factory. It returns an object contains a `current` property for the current `Model instance`, and a `initial` callback for initialing the current `Model instance`.

The `current` will be destroyed when every usage about it is destroyed. And it will be reinitialized when the usage happens again.

``` typescript
function weakSharing<
    S,
    T extends Model<S>=Model<S>
    >(
    factory:Factory<S, T>,
):SharingRef<S, T>;
```

* factory - a callback runs at the initial time for creating or recreating a Model instance.

It returns a `SharingRef` object contains property named `current` and `initial`.

```typescript
type SharingRef<
    S,
    T extends Model<S>= Model<S>,
    > = {
    current:T,
    initial:Factory<S, T>
};
```

To check more [details](/feature?id=model-sharing).

## addEffect

Add a Effect callback for listening state change of a `Model instance` or a `Model method`.

``` typescript
function addEffect<S, T extends Model<S>>(
    callback:EffectCaller<S, T>,
    target:MethodCaller<T>|T,
):(()=>void);
```

* callback - a callback receives a `prevState`, a `currentState` and a `methodName` as params.
* target - a `Model instance` or a `Agent` object or a `Model method` or a `Agent method`.

It returns a unsubscribe callback, when you need to destroy it, you can call this unsubscribe callback.

To check more [details](/guides?id=effect).