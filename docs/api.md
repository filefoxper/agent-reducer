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

Presets MiddleWares onto Model class or Model methods.

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

#### takeNothing

Stop state change happening. If you don't want any state change happens after the method finished, you can use this MiddleWare.

#### takePromiseResolve

Take a promise resolve data to next MiddleWare. If the method returns a promise, it always waits, and pass the promise resolve data to next MiddleWare. If not, this MiddleWare passes the data to next MiddleWare directly.

#### takeAssignable

It merges returning data with `this.state` to be a new data, then pass it to next one. If the method returns a primary data like `string`, `number` or `function`, it passes this data to next directly.

#### takeUnstableBlock

* blockMs - Setting the block time (millisecond), it is a optional param.

Control method running way, make the method runs blockly. If the nethod calling is not finished, it can not be started again, this is useful for controlling an async method calling.

If you have set a block time for it, this MiddleWare will enabled after this time period, no matter if last calling about this method is finished.

#### takeUnstableThrottle

* waitMs - Setting the throttle time (millisecond).

Control method running way, make the method runs with a `Throttle` feature that only invokes method at most once per every wait milliseconds. 

#### takeUnstableDebounce

* waitMs - Setting the debounce time (millisecond).
* opt - Optional config, if `opt.leading` is true, the method invokes on the leading edge of the wait timeout.

Control method running way, make the method runs with a `Debounce` feature  that delays invoking method until after wait milliseconds have elapsed since the last time the debounced method was invoked. Provide options to indicate whether func should be invoked on the leading or trailing edge of the wait timeout.

#### ~~takeNone~~

old version of `takeNothing`.

#### ~~takeBlock~~

old version of `takeUnstableBlock`.

#### ~~takeThrottle~~

old version of `takeUnstableThrottle`.

#### ~~takeDebounce~~

old version of `takeUnstableDebounce`.

## LifecycleMiddleWares

It is a set for storing official lifecycle MiddleWare.

```typescript
class LifecycleMiddleWares {
  static takeLatest(): LifecycleMiddleWare;
}
```

#### takeLatest

control `Agent` lifecycle. Reject the expired state change from the expired `Agent`, and keep the state change order.

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

#### Example

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

## getSharingType

Get the sharing type from a model instance, it should be 'weak', 'hard' or undefined.

```typescript
export declare function getSharingType<
    S,
    T extends Model<S>=Model<S>
    >(model:T):undefined|SharingType;
```

* model - model instance

returns 'weak', 'hard' or undefined.

## addEffect

Listen the model state change, and do something to complete work.

```typescript
export declare function addEffect<S=any, T extends Model<S> = Model>(
    effectCallback:EffectCallback<S>,
    target:T,
    method?:keyof T|((...args:any[])=>any),
):EffectWrap<S, T>;
```

* effectCallback - the function to process the effect of state change, the function returns void or a destroy function which is always called before the effectCallback works again or when the effect is unmounted.
* target - a model instance or agent as a listening target.
* method - optional, if you want filter the state change from specific method, you can add it.

It returns a `effect` object, which provides `update` and `unmount` methods. The `update` method can be used to update effectCallback, and the `unmount` method can be used to unmount effect manually from model instance.

To check more [details](/guides?id=effect).
