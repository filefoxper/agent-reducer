# API 文档

## create

根据 `模型` 创建一个带有可操作属性的 reducer function，该 function 带有一个 `agent` 代理对象，一个 `connect` 监听连接接口，一个 `disconnect` 销毁监听接口。具体参考连接第三方库中的[说明](/zh/advanced?id=连接其他第三方库)。

```typescript
function create<
    S,
    T extends Model<S> = Model<S>
    >(
    model: T | { new (): T },
    ...middleWares: (MiddleWare & { lifecycle?: boolean })[]
): AgentReducer<S, T>;
```

* model - class 或 object 模型。
* middleWares - 可选项，MiddleWare，系统将自动将它们串联成一个 MiddleWare 。

注意，`LifecycleMiddleWare` 不能与该 API 方法联用。你需要使用 API [withMiddleWare](/zh/api?id=withmiddleware) 或 [middleWare](/zh/api?id=middleware) 。

#### 例子

```typescript
import {create,Model} from 'agent-reducer';

describe('create',()=>{

    // 这时个计数器模型，
    // 我们可以增加或减少 state 值
    class Counter implements Model<number> {

        state = 0;  // 初始化 state 值

        // 返回值将成为下一个 state
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    test('使用 `create` API',()=>{
        // 使用 `create` API 为 `模型` 创建一个 `代理`
        const {agent,connect,disconnect} = create(Counter);
        // 开始前，你需要先进行模型到代理的连接
        connect();
        // `agent.stepUp` 的返回值将成为下一个 state
        agent.stepUp();
        // 如果代理和模型实例已经不再具备利用价值，
        // 需要通过 disconnect 销毁链接
        disconnect();
        expect(agent.state).toBe(1);
    });

});
```

参考更多[细节](/zh/advanced?id=连接其他第三方库)

## connect

[create](/zh/api?id=create) API 的快捷用法。

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
* model - class 或 object 模型。
* middleWares - 可选项，MiddleWare，系统将自动将它们串联成一个 MiddleWare 。

注意，`LifecycleMiddleWare` 不能与该 API 方法联用。你需要使用 API [withMiddleWare](/zh/api?id=withmiddleware) 或 [middleWare](/zh/api?id=middleware) 。

#### 例子

```typescript
import {connect,Model} from 'agent-reducer';

describe('API `create` 的快捷用法',()=>{

    // 这时个计数器模型，
    // 我们可以增加或减少 state 值
    class Counter implements Model<number> {

        state = 0;  // 初始化 state 值

        // 返回值将成为下一个 state
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    test('使用 API `connect`',()=>{
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

复制一个 `代理`，该复制品方法上的 MiddleWare 可覆盖原代理上的 MiddleWare。

```typescript
function withMiddleWare<S, T extends OriginAgent<S>>(
    agent: T,
    ...mdws: (MiddleWare | LifecycleMiddleWare)[]
): T;
```

* agent - `代理`对象。
* mdws - MiddleWare，系统将自动将它们串联成一个 MiddleWare。

#### 例子

```typescript
import {
  create,
  Model,
  withMiddleWare,
  MiddleWarePresets
  } from 'agent-reducer';

describe('withMiddleWare',()=>{

    // 这时个计数器模型，
    // 我们可以增加或减少 state 值
    class Counter implements Model<number> {

        state = 0;  // 初始化 state 值

        // 返回值将成为下一个 state
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    test('使用 `withMiddleWare` API',async ()=>{
        // 使用 `create` API 为 `模型` 创建一个 `代理`
        const {agent,connect,disconnect} = create(Counter);
        // 开始前，你需要先进行模型到代理的连接
        connect();
        // 使用 `withMiddleWare` 复制 `代理`，
        // 并传入 MiddleWare，覆盖原代理方法上的 MiddleWare
        const copy = withMiddleWare(agent,MiddleWarePresets.takePromiseResolve());
        await copy.step(true);
        disconnect();
        expect(agent.state).toBe(1);
    });

});
```

查看更多[细节](/zh/guides?id=middleware-覆盖作用)

## middleWare

为模型 class 或模型方法预加 MiddleWare。

```typescript
const middleWare: <
    S,
    T extends Model<S>
    >(
    callOrMiddleWare: MiddleWare | LifecycleMiddleWare | MiddleWareAble<S, T>,
    ...mdw: (MiddleWare | LifecycleMiddleWare)[]
) => DecoratorCaller;
```

* callOrMiddleWare - `模型实例`， `模型 class`， `模型方法` 或 MiddleWare。
* mdws - MiddleWare
  
该API返回一个 ES6 decorator 定义 function。

当第一个参数为 `模型实例` 时，剩余 MiddleWare 参数将被自行串联起来，并作用于当前 `模型实例` 对应的 `代理方法` 上；当第一个参数为 `模型 class` 时，剩余 MiddleWare 参数将被自行串联起来，作用于由该模型生成的 `代理方法` 上；当第一个参数为 `模型方法` 时，剩余 MiddleWare 参数将被自行串联起来，作用于由该模型方法对应的 `代理方法` 上。如所有参数都为 MiddleWare，则需要将返回 function 用与 decorator 修饰。

#### 例子

```typescript
import {
  create,
  Model,
  middleWare,
  MiddleWarePresets
  } from 'agent-reducer';

describe('middleWare',()=>{

    class Counter implements Model<number> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        // decorator 用法
        @middleWare(MiddleWarePresets.takePromiseResolve())
        async step(isUp: boolean):Promise<number>{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    test('使用 `middleWare` API',async ()=>{
        const {agent,connect,disconnect} = create(Counter);
        connect();
        await agent.step(true);
        disconnect();
        expect(agent.state).toBe(1);
    });

});
```

查看更多[细节](/zh/guides?id=middleware-覆盖作用)

## applyMiddleWares

用于将多个 MiddleWare 串联成一个包含所有项功能的 MiddleWare。

```typescript
function applyMiddleWares(
    ...middleWares: (MiddleWare | LifecycleMiddleWare)[]
): MiddleWare
```

* middleWares - MiddleWare

返回一个包含所有项功能的 MiddleWare。

## MiddleWares

官方 MiddleWare 的原子集合，包含了很多功能单一的常用 MiddleWare 。

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

阻断 MiddleWare 传递 state 数据。通常用在不希望发生 state 变更的方法上。

#### takePromiseResolve

将 promise 返回值 resolve 的数据传递给下一个 MiddleWare。如果返回值非 promise 对象，则直接传递给下一个 MiddleWare。

#### takeAssignable

将 object 返回值与模型实例 state 合并成一个新数据，并传递给下一个 MiddleWare（使用 Object.assign({},currentState,data)）。如果被加工数据为基本类型，如 `number` 、 `string` 等，则直接不进行加工，直接传递给下一个 MiddleWare。

#### takeUnstableBlock

* blockMs - 阻塞时间（毫秒），可选参数

控制方法运行方式。如果方法没有结束就不能再次运行，这对异步方法非常有用。同时我们可以传入一个阻塞`时间`，如果超出阻塞时间，依然没有方法依然结束，方法重新进入可运行状态。

#### takeUnstableThrottle

* waitMs - 等待`时间`

控制方法运行方式。以 `Throttle` 的方式运行当前方法，自上次调用时开始，设定的`时间`内不能再运行该方法。

#### takeUnstableDebounce

* waitMs - 等待`时间`
* opt - 可选参数，`opt.leading` 为 true 时为前防模式，否则为后防模式

控制方法运行方式。以 `Debounce` 模式运行当前方法，即防抖，默认为后防模式。后防模式指方法触发时并不马上运行，等待设定`时间`到来时才运行，若在等待`时间`内再次触发，则以当前触发点开始继续延时等待。前防模式则正好相反。

#### ~~takeNone~~

老版本的 `takeNothing`

#### ~~takeBlock~~

老版本的 `takeUnstableBlock`

#### ~~takeThrottle~~

老版本的 `takeUnstableThrottle`

#### ~~takeDebounce~~

老版本的 `takeUnstableDebounce`

## LifecycleMiddleWares

官方的 lifecycle MiddleWare 集合。

```typescript
class LifecycleMiddleWares {
  static takeLatest(): LifecycleMiddleWare;
}
```

#### takeLatest

控制`代理`复制版的生命周期. 当复制版`代理`过期时，将不再具备修改 state 的能力。

## MiddleWarePresets

常用官方 MiddleWare 的串联集合。

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

#### 例子

``` typescript
import {
  create,
  Model,
  middleWare,
  MiddleWarePresets
  } from 'agent-reducer';

describe('MiddleWarePresets',()=>{

    const delay = (ms:number)=>new Promise((r)=>setTimeout(r,ms));

    class Counter implements Model<number> {

        state = 0;

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
        const {agent,connect,disconnect} = create(Counter);
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

将一个自定义 MiddleWare 转换成一个 LifecycleMiddleWare.

```typescript
const toLifecycleMiddleWare: (lifecycleMiddleWare: MiddleWare) => LifecycleMiddleWare;
```

* lifecycleMiddleWare - MiddleWare

## defaultMiddleWare

系统默认 MiddleWare ，即将方法返回值传递给下一个 MiddleWare，或 state 修改器。

## sharing

创建一个强共享的 `模型实例` 工厂。包含 `current` 属性，当前 `模型实例`；`initial` 属性，初始化回调函数。

强共享 `模型实例` 工厂中的 `current` 只会被初始化一次，并常驻内存，不能自动销毁。

``` typescript
function sharing<
    S,
    T extends Model<S> = Model<S>
    >(factory:Factory<S, T>): SharingRef<S, T>;
```

* factory - 用于创建 `模型实例` 的回调函数

返回一个 `SharingRef` 工厂对象

```typescript
type SharingRef<
    S,
    T extends Model<S>= Model<S>,
    > = {
    current:T,
    initial:Factory<S, T>
};
```

查看更多[细节](/zh/feature?id=模型共享)。

## weakSharing

创建一个弱共享的 `模型实例` 工厂。包含 `current` 属性，当前 `模型实例`；`initial` 属性，初始化回调函数。

弱共享中的 `current` 属性会在 `模型实例` 的 `代理` 全部销毁时被销毁。再次用于创建 `代理` 时，会重新初始化。

``` typescript
function weakSharing<
    S,
    T extends Model<S>=Model<S>
    >(
    factory:Factory<S, T>,
):SharingRef<S, T>;
```

* factory - 用于创建 `模型实例` 的回调函数

返回一个 `SharingRef` 工厂对象

```typescript
type SharingRef<
    S,
    T extends Model<S>= Model<S>,
    > = {
    current:T,
    initial:Factory<S, T>
};
```

查看更多[细节](/zh/feature?id=模型共享)。

## getSharingType

获取模型实例上的共享类型。

```typescript
export declare function getSharingType<
    S,
    T extends Model<S>=Model<S>
    >(model:T):undefined|SharingType;
```

* model - 模型实例

返回 'weak', 'hard' or undefined.

## addEffect

用于监听模型 state 变化，并处理相应的副作用。

```typescript
export declare function addEffect<S=any, T extends Model<S> = Model>(
    effectCallback:EffectCallback<S>,
    target:T,
    method?:keyof T|((...args:any[])=>any)|'*',
):EffectWrap<S, T>;
```

* effectCallback - 副作用回调函数，可返回一个销毁函数，用于承接副作用回调函数中加入需要销毁的功能。销毁函数会在副作用回调函数再次调用前被调用。
* model - 副作用目标，可以是模型实例，也可以是模型代理（等效于加在模型实例上）。
* method - 可选，副作用目标方法，可以是模型实例方法，也可以是模型代理方法（等效于加在模型实例方法上）。当该参数为 `*` 时，监听所有方法引起的 state 变更。

返回一个`副作用对象`，该对象包含了`update`（更新副作用回调函数）方法和`unmount`（手动卸载副作用）方法。

查看更多[细节](/zh/guides?id=effect)。

## flow

用于标识一个工作流方法，工作流方法中的关键词 `this` 是一个 agent 代理对象。通过给 `@flow(...)` 传入不通的 `WorkFlow` 工作模式，可以选择不通的方法运行模式。如：`@flow(Flows.latest())`。

```typescript
export type WorkFlow = (runtime:FlowRuntime)=>LaunchHandler;

declare type FlowFn =((...flows:WorkFlow[])=>MethodDecoratorCaller)&{
    force:<S, T extends Model<S>>(target:T, workFlow?:WorkFlow)=>T,
    error:<
        S=any,
        T extends Model<S>=Model<S>
        >(model:T, listener:ErrorListener)=>(()=>void)
}

export declare const flow:FlowFn;
```

* flow.force - 在工作流方法中强制其他被调用工作流方法的工作模式，如：`flow.force(this, Flows.latest()).flowMethod()`，如不提供工作模式，则作为当前工作流方法的一部分工作，如：：`flow.force(this).flowMethod()`。
* flow.error - 用于监听模型中的工作流方法异常。`flow.error(model, (error:any)=>{......})`

返回一个 decorator function。

## Flows

工作模式集合。

```typescript
type BlockFlowConfig = {timeout?:number};

type DebounceFlowConfig = {time:number, leading?:boolean};

export class Flows {

  static default():WorkFlow;

  static latest():WorkFlow;

  static debounce(ms:number|DebounceFlowConfig, leading?:boolean):WorkFlow;

  static block(timeout?:number|BlockFlowConfig):WorkFlow;
}
```

* Flows.default - 默认工作模式，和无传参的 `@flow()` 等效。
* Flows.latest - 只允许最新工作流方法产生的 state 变更生效.
* Flows.debounce - 使工作流方法以 debounce 防抖模式运行. 
* Flows.block - 工作流方法以原子性特性运行。如一个方法没有结束，则不能再次运行。多用于Promise返回类型的异步方法。

## effect

[addEffect](/zh/api?id=addeffect) API 的 `ES6 decorator` 模式。添加该 decorator 装饰器的模型方法会被当作`副作用回调函数`，监听目标默认为当前模型实例，而 `effect` 入参函数返回的`模型方法`将被当作被监听的目标方法。

```typescript
export declare function effect<S=any, T extends Model<S>=Model>(
    method?:()=>(...args:any[])=>any,
):MethodDecoratorCaller
```

* method - 可选，返回被监听的目标方法的回调函数，必须为当前模型方法。

查看更多[细节](/zh/guides?id=副作用-decorator-装饰器用法)。

## avatar

维护一个替身接口对象，在使用时，根据已分配的实现接口运行。若接口已实现，则运行已经实现的接口，否则运行默认接口。

```typescript
export type Avatar<T extends Record<string, any>> = {
    current:T,
    implement:(impl:Partial<T>)=>()=>void;
};

export declare function avatar<
    T extends Record<string, unknown>
    >(interfaces:T):Avatar<T>;
```

* interfaces - 默认接口对象。

返回 Avatar 对象：

* current - 默认接口与实现接口合并后的接口集合。
* implement - 实现方法，传入的 `impl` 对象作为实现接口。

该方法主要用作平台接口与模型的交接。

## experience

用于开启体验模式。

```typescript
export declare function experience():void;
```
