# 引导

## 中间件 MiddleWare

MiddleWare 是一种特殊的 function ，它可以用作修改系统默认的 state 变更策略（取返回值为最新的 state 值），也可用来控制方法的运行特征（如添加防抖 debounce 特征）。它可以被单独使用，也可以跟其他 MiddleWare 串行使用。如果需要组合使用多个不同的 MiddleWare 特性，我们可以使用 API [applyMiddleWares](/zh/api?id=applymiddlewares) 进行串联。

MiddleWare 的结构如下:

```typescript
// `MiddleWare` 是一个 function，
// 在方法准备开始调用时，会预先运行最终作用于方法的 `MiddleWare`。
// 参数 `Runtime` 是一个非常有用的 API 对象，
// 它包含了 `代理`，`模型实例`，`运行方法名`，`运行方法缓存数据`等信息
function middleWareLike(runtime: Runtime):NextProcess|void {

    // `MiddleWare` 可以返回一个 `nextProcess` 回调函数，
    // 该函数可用于接入串行下一 `MiddleWare` 的数据再加工执行函数 `stateProcess`。
    // `nextProcess` 函数会在方法结束时立即调用。
    // 如果你不希望运行当前 MiddleWare 所作用的方法，
    // 可选择返回 void 来代替 `nextProcess` ，并阻止方法执行。
    return function nextProcess(next: StateProcess): StateProcess {

        // `stateProcess` 用于再加工上一 MiddleWare 传入的 state（或方法返回值），
        // 通过调用 `next` 函数，我们可以把当前加工结果传递给下一 MiddleWare 处理。
        return function stateProcess(state: any) {
            // `next` 函数是下一 MiddleWare 的 `stateProcess`，
            // 如果想要阻止 state 发生变化，
            // 可直接返回加工结果，而不调用 `next` 函数
            return next(doSomething(state));
        };
    };
}
```

`Runtime` 的结构如下:

```typescript
// Runtime 是一个方法执行时 API 对象
export type Runtime<T extends Record<string, any>=any> = {
    // 正在执行方法的方法名
    methodName: string|number;
    // 正在执行方法的入参
    args?: any[];
    // 正在执行方法所在的代理对象
    agent: T;
    // 正在执行方法所在的代理对象对应的模型实例
    model: T;
    // 代理运行环境变量，仅仅包含一个 expired 是否过期判断属性，
    // 如果 expired 为 true，代理将失去修改 state 的能力
    env: Env;
    // MiddleWare 缓存对象，
    // 可用来做 MiddleWare 数据缓存
    cache: { [key: string]: any };
    // 可为正在执行方生成一个的临时模型实例，
    // 此时方法访问的关键词 this 指向这个临时模型实例
    mapModel:(handler:ProxyHandler<T>)=>T;
};
```

## MiddleWare 串联

每个 MiddleWare 都有自己独立的功能，如果希望在一个代理方法上使用多个 MiddleWare 的功能特性，我们需要使用 API `applyMiddleWares` 把它们串联成起来。 MiddleWare 的串联实质是把多个 MiddleWare 包装成一个环环相扣的多功能 MiddleWare 。

我们需要根据每个 MiddleWare 的用途进行串联操作，使得每个 MiddleWare 的 state 处理结果刚好可以被下一个 MiddleWare 处理。越靠后的 MiddleWare 越晚执行 state 处理，因此它的处理结果也应该越接近最终期望的 state 数据。

为了说明如何串联 MiddleWare ，我们以官方 API [MiddleWarePresets](/zh/api?id=middlewarepresets) 中的 `MiddleWarePresets.takePromiseResolveAssignable()` 为例进行分析。 takePromiseResolveAssignable 是由多个原子性 MiddleWare 串联而来的，这些原子性 MiddleWare 来源于官方 API `MiddleWares`。

```typescript
static takePromiseResolveAssignable():MiddleWare {
    // 调用串联方法 applyMiddleWares API
    return applyMiddleWares(
      // 原子性 MiddleWare takePromiseResolve，
      // 作用于返回值可能为 promise 的方法，
      // 它把 promise resolve 值作为新 state 传给下一 MiddleWare，
      // 若方法返回值并非 promise ，
      // 该返回值将直接被传入下一个 MiddleWare
      MiddleWares.takePromiseResolve(),
      // 原子性 MiddleWare takeAssignable，
      // 以 Object.assign 的形式把接收到的 promise resolve 值，
      // 和现存模型实例的 state 数据合成一个新 state，
      // 并传递给模型实例修改器，从而修改当前模型实例的 state。
      // 若方法返回值是一个非 object 的基本数据，
      // 返回值将直接被传入下一个 MiddleWare
      MiddleWares.takeAssignable(),
    );
  }
```

这个 MiddleWare 由 [MiddleWares.takePromiseResolve()](/zh/api?id=takepromiseresolve) 和 [MiddleWares.takeAssignable()](/zh/api?id=takeassignable) 组成。第一个 MiddleWare 负责处理 promise 对象，并将 resolve 值传给下一个 MiddleWare ，而作为它下一个 MiddleWare ，负责把接收到的数据和现存模型实例的 state 数据合成一个新 state ，并发送给系统的 state 修改器，从而修改模型实例的 state 数据。

## MiddleWare 覆盖作用

我们已经[介绍](/zh/introduction?id=middleware)了如何使 MiddleWare 作用于一个方法，这里我们将补充说明如何进行 MiddleWare 的互相覆盖。

根据不同的使用方式，MiddleWare 有不同的运行优先级，我们将从低到高逐一介绍这些使用方式。让我们以一个 User 模型为例进行说明:

``` typescript
import {
    create, 
    middleWare, 
    MiddleWarePresets,
    Model, 
    withMiddleWare,
} from "agent-reducer";

describe('MiddleWare 覆盖优先级', () => {

    type User = {
        id: undefined | number
        name: string,
        nick: string
    }

    // 这是一个 user 模型，
    // 可以通过 fetchCurrentUser 从服务器获取当前 user 信息。
    // 使用 class decorator 添加 MiddleWare，
    // 可以让这个 MiddleWare 作用于所有模型方法，
    // 这里我们添加了一个 takePromiseResolve 用来把异步获取数据转换成 state。
    // 以 class decorator 的形式添加的 MiddleWare 优先级最低
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class UserModel implements Model<User> {

        state: User = {
            id: undefined,
            name: 'guest',
            nick: 'guest'
        };

        fetchCurrentUser() {
            return Promise.resolve({
                id: 0,
                name: 'name',
                nick: 'nick'
            });
        }

        rename(name: string) {
            return {name, nick: name};
        }

        @middleWare(MiddleWarePresets.takeNothing())
        updateNick(nick: string) {
            return {nick};
        }

    }

    test('使用 class decorator 添加的兜底用 MiddleWare，权限最低', async () => {
        const {agent, connect, disconnect} = create(UserModel);
        connect();
        // class decorator 添加的 takePromiseResolve 作用于 fetchCurrentUser
        await agent.fetchCurrentUser();
        expect(agent.state).toEqual({
            id: 0,
            name: 'name',
            nick: 'nick'
        });
        // 当前方法返回值为部分 state 数据，
        // 这会导致最新 state 数据不完整。
        // 我们需要 `MiddleWarePresets.takeAssignable` 把模型实例的 state 与返回值合并成新 state 数据
        agent.rename('name1');
        // 丢失了 id 属性
        expect(agent.state).not.toHaveProperty('id');
        disconnect();
    });

    test('通过 API `create` 添加的 MiddleWare 可以覆盖 class decorator 添加的 MiddleWare', async () => {
        const {agent, connect, disconnect} = create(UserModel, MiddleWarePresets.takePromiseResolveAssignable());
        connect();
        // 通过 API `create` 添加的 MiddleWare 覆盖了 class decorator 添加的 MiddleWare，
        // 所以作用于当前方法的是 takePromiseResolveAssignable。
        // takePromiseResolveAssignable 同时具备 takePromiseResolve 和 takeAssignable 的能力。
        await agent.fetchCurrentUser();
        expect(agent.state).toEqual({
            id: 0,
            name: 'name',
            nick: 'nick'
        });
        // 通过 API `create` 添加的 MiddleWare 覆盖了 class decorator 添加的 MiddleWare，
        // 所以作用于当前方法的是 takePromiseResolveAssignable。
        // takePromiseResolveAssignable 同时具备 takePromiseResolve 和 takeAssignable 的能力。
        // 所以 rename 以后得到的是合并后的完整 state 数据
        agent.rename('name1');
        expect(agent.state).toHaveProperty('id');
        disconnect();
    });

    test('通过 method decorator 添加的 MiddleWare 可以覆盖以上两种方式添加的 MiddleWare', async () => {
        const {agent, connect, disconnect} = create(UserModel, MiddleWarePresets.takePromiseResolveAssignable());
        connect();
        // 通过 API `create` 添加的 MiddleWare 覆盖了 class decorator 添加的 MiddleWare，
        // 所以作用于当前方法的是 takePromiseResolveAssignable。
        // takePromiseResolveAssignable 同时具备 takePromiseResolve 和 takeAssignable 的能力。
        await agent.fetchCurrentUser();
        expect(agent.state).toEqual({
            id: 0,
            name: 'name',
            nick: 'nick'
        });
        // 通过 API `create` 添加的 MiddleWare 覆盖了 class decorator 添加的 MiddleWare，
        // 所以作用于当前方法的是 takePromiseResolveAssignable。
        // takePromiseResolveAssignable 同时具备 takePromiseResolve 和 takeAssignable 的能力。
        // 所以 rename 以后得到的是合并后的完整 state 数据
        agent.rename('name1');
        expect(agent.state).toHaveProperty('id');
        // 通过 method decorator 添加的 MiddleWare 覆盖了所有兜底 MiddleWare，
        // 但它只作用于被使用的方法。
        agent.updateNick('nick1');
        // `MiddleWarePresets.takeNothing()` 会放弃当前方法引起的 state 变更
        expect(agent.state.nick).not.toBe('nick1');
        disconnect();
    });

    test('API `withMiddleWare` 拥有最高 MiddleWare 运行优先级', async () => {
        const {agent, connect, disconnect} = create(UserModel, MiddleWarePresets.takePromiseResolveAssignable());
        connect();
        // 通过 API `create` 添加的 MiddleWare 覆盖了 class decorator 添加的 MiddleWare，
        // 所以作用于当前方法的是 takePromiseResolveAssignable。
        // takePromiseResolveAssignable 同时具备 takePromiseResolve 和 takeAssignable 的能力。
        await agent.fetchCurrentUser();
        expect(agent.state).toEqual({
            id: 0,
            name: 'name',
            nick: 'nick'
        });
        // 通过 API `create` 添加的 MiddleWare 覆盖了 class decorator 添加的 MiddleWare，
        // 所以作用于当前方法的是 takePromiseResolveAssignable。
        // takePromiseResolveAssignable 同时具备 takePromiseResolve 和 takeAssignable 的能力。
        // 所以 rename 以后得到的是合并后的完整 state 数据
        agent.rename('name1');
        expect(agent.state).toHaveProperty('id');

        // API `withMiddleWare` 复制出一个新的代理用于执行，
        // 通过此接口添加的 MiddleWare 只作用于当前复制版的代理对象
        const {updateNick} = withMiddleWare(agent, MiddleWarePresets.takeAssignable());
        // takeAssignable 覆盖了 takeNothing
        updateNick('nick1');
        expect(agent.state.nick).toBe('nick1');
        disconnect();
    });

});
```

单元测试源码 [guides.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/guides.test.ts)。

MiddleWare 的覆盖优先级总结如下:

```
class decorator < create api < method decorator < withMiddleWare api
```

API [withMiddleWare](/zh/api?id=withmiddleware) 可以复制一个 `代理` ，并让通过该接口添加的 MiddleWare 覆盖掉复制品中所有的 MiddleWare。如此设计的原因，其一，是不希望直接修改原 `代理` 导致原 `代理方法` 的 MiddleWare 特性被变更，进而影响原功能；其二，就是因为接下来要介绍的 `Lifecycle MiddleWare` 。

## Lifecycle MiddleWare

Lifecycle MiddleWare 是一种可停止、恢复、重建`代理`的 MiddleWare ，它只能作用于一个被系统复制出来的 `代理`（若在方法上通过 method decorator 添加，访问的`代理方法`会被链接到一个隐藏`代理复制品方法`上）。

官方的 Lifecycle MiddleWare 只有 [LifecycleMiddleWares.takeLatest()](/zh/api?id=takelatest) 。这个 MiddleWare 可用于保证当前方法每次调用产生的 state 变更不会因为异步原因导致顺序混乱，即 state 永远获取最新值。举个例子，比如有个翻页查询功能，每次翻页去服务器获取当前页对应的数据，因为服务器返回时间受数据查询速度，网络返回速度影响，所以并不能保证前一页请求的数据比当前页的数据先返回，这就导致当前页数据可能被后返回的前一页数据覆盖。而这个 MiddleWare 就是为了解决类似这种问题而存在的。

`LifecycleMiddleWares.takeLatest()` 通常用于不稳定的异步数据修改过程，所以大部分情况下，需要与 `MiddleWares.takePromiseResolve()` 串联使用，官方给出了已串联好的 MiddleWare 以便快速使用 `MiddleWarePresets.takeLatest()` 。

这里我们以翻页查询为例，给出了 `MiddleWarePresets.takeLatest()` 的常规用法案例。

```typescript
import {
    create, 
    middleWare, 
    MiddleWarePresets,
    Model, 
    withMiddleWare,
} from "agent-reducer";

describe('Lifecycle MiddleWare',()=>{

    type Todo = {
        content: string,
        status: 'new' | 'doing' | 'done'
    };

    const todoList1: Array<Todo> = [
        {content: 'create project structure', status: 'done'},
        {content: 'coding', status: 'done'},
    ];

    const todoList2:Array<Todo> = [
        {content: 'unit test', status: 'doing'},
        {content: 'write docs', status: 'new'},
    ];

    // 这是个 to-do list 模型，
    // 我们可以按页码查询数据。
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>> {

        state = [];

        fetch(page:number): (Promise<Array<Todo>>) {
            // 当 page 为 1 时，模拟一个延时
            if(page === 1){
                return new Promise((resolve) => {
                    setTimeout(()=>{
                        resolve([...todoList1]);
                    });
                });
            }
            return new Promise((resolve) => {
                resolve([...todoList2]);
            });
        }

    }

    test('不使用 `MiddleWarePresets.takeLatest()`, page 1 的数据会覆盖最新的 page 2 数据',async ()=>{
        const {agent,connect,disconnect} = create(TodoList);
        connect();
        // 先触发获取第一页数据，接着立即触发获取第二页数据
        const fetchLoader1 = agent.fetch(1);
        const fetchLoader2 = agent.fetch(2);
        await Promise.all([fetchLoader1,fetchLoader2]);
        // 因为第一页数据由延时，
        // 所以会覆盖先返回的第二页数据。
        expect(agent.state).toEqual(todoList1);
        disconnect();
    });

    test('`MiddleWarePresets.takeLatest()` 可以保证始终采纳最新获取的数据',async ()=>{
        const {agent,connect,disconnect} = create(TodoList);
        connect();
        // 可以用 `withMiddleWare` API 为使用 `takeLatest` 创建一个复制代理
        const agentCopy = withMiddleWare(agent,MiddleWarePresets.takeLatest());
        // 先触发获取第一页数据，接着立即触发获取第二页数据。
        // 注意我们需要使用复制版，以确保我们正在使用 `takeLatest`
        const fetchLoader1 = agentCopy.fetch(1);
        const fetchLoader2 = agentCopy.fetch(2);
        await Promise.all([fetchLoader1,fetchLoader2]);
        // 虽然第一页数据由延时，
        // 但数据依然保持着最新一次触发获取的数据，即第二页数据
        expect(agent.state).toEqual(todoList2);
        disconnect();
    });

    test('method decorator 也可以添加 takeLatest MiddleWare',async ()=>{

        @middleWare(MiddleWarePresets.takePromiseResolve())
        class TodoList implements Model<Array<Todo>> {

            state = [];

            // 事实上，method decorator 可以复制当前正在调用方法所在的代理，
            // 并运行复制代理上对应的方法
            @middleWare(MiddleWarePresets.takeLatest())
            fetch(page:number): (Promise<Array<Todo>>) {
                // 当 page 为 1 时，模拟一个延时
                if(page === 1){
                    return new Promise((resolve) => {
                        setTimeout(()=>{
                            resolve([...todoList1]);
                        });
                    });
                }
                return new Promise((resolve) => {
                    resolve([...todoList2]);
                });
            }

        }

        const {agent,connect,disconnect} = create(TodoList);
        connect();
        // 先触发获取第一页数据，接着立即触发获取第二页数据。
        const fetchLoader1 = agent.fetch(1);
        const fetchLoader2 = agent.fetch(2);
        await Promise.all([fetchLoader1,fetchLoader2]);
        // 虽然第一页数据由延时，
        // 但数据依然保持着最新一次触发获取的数据，即第二页数据
        expect(agent.state).toEqual(todoList2);
        disconnect();
    });
    
    test('当前版本 `create` API 还不能直接使用 Lifecycle MiddleWare',()=>{
        expect(()=>{
            create(TodoList,MiddleWarePresets.takeLatest());
        }).toThrow('Can not use a lifecycle `MiddleWare` for creating, please use this `MiddleWare` with api `withMiddleWare` or `middleWare`.');
    });

});
```

单元测试源码 [guides.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/guides.test.ts)。

让我们来看看 Lifecycle MiddleWare 是如何做到停止 state 变更以及重建代理复制品的。Lifecycle MiddleWare 与普通 MiddleWare 的主要区别就在 MiddleWare 参数 `Runtime` 上。

```typescript
export interface LifecycleEnv extends Env {
  expire: () => void;
  rebuild: () => void;
}

export interface LifecycleRuntime<T = any> extends Runtime<T> {
  env: LifecycleEnv;
}

export type LifecycleMiddleWare = (<T>(
  runtime: LifecycleRuntime<T>
) => NextProcess | void)
```

在上述结构中，我们可以看到在 `LifecycleRuntime.env` 中有一个 expire 属性方法和一个 rebuild 属性方法。通过调用 expire 方法，我们可以停止复制版代理的 state 变更能力，而调用 rebuild 方法则可以重建整个代理复制品。

Lifecycle MiddleWare 的定制方式与普通 MiddleWare 的定制方式类似，只需要使用API [toLifecycleMiddleWare](/zh/api?id=tolifecyclemiddleware) 使其生效即可。

`agent-reducer` 已经串联了很多常用的 MiddleWare。如果需要，可以在 `MiddleWarePresets` API 中找到它们。

## Effect

自 `agent-reducer@4.2.0` 开始，我们新增了两个副作用相关的 API：[addEffect](/zh/api?id=addeffect) 和 [effect](/zh/api?id=effect) 。所谓的副作用是指当模型 state 发生改变时，做出的相关反应，通俗的说就是监听 state 变化，然后处理一些额外的业务逻辑。

基本用法如下：

```typescript
addEffect((prevState, currentState, methodName)=>{
    // `prevState` 当前 state 变更之前的模型 state
    // `currentState` 当前模型 state
    // `methodName` 引起本次变化的方法名，
    // 在直接监听模型 state 变更时，当前 callback 函数
    // 会在模型空闲时立即执行一次，这时因为并没有方法引起 state 变更，
    // 所以 `methodName` 为 null
    ......
},modelOrMethod);
```

### 模型副作用

如果想要监听指定模型实例的 state 变更，可使用 `addEffect(callback, model)` 形式，对模型实例添加副作用。副作用回调函数会在添加后模型事务空闲时立即执行。（可简单理解为加入副作用的时机不在 state 变更过程中）第一次载入执行时，参数 `methodName` 为 `null`，之后每当模型 state 发生变更时都会再次触发该回调函数，直至副作用被卸载为止。

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

class CountModel implements Model<number> {

    state = 0;

    increase() {
        return this.state + 1;
    }

    decrease() {
        return this.state - 1;
    }

    reset() {
        return 0;
    }

}

describe('effect 基本用法', () => {

    test('监听模型实例', () => {
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        // 副作用回调函数可接收 prevState, state, methodName 三个参数
        const effectCallback: EffectCallback<number> = jest.fn((prev,state) => {
            if (state < 0) {
                // time: 3
                // 如果 state 为 0，
                // 调用 `agent.reset` 方法，将 state 重置为 0，
                // 而 `agent.reset` 同样改变了 state，
                // 它将再次触发当前副作用回调函数
                agent.reset();
            }
        });
        // time: 1
        // 添加副作用回调函数监听模型实例 state 变化，
        // 该回调会在添加后 agent-reducer 空闲时立即调用一次，
        // 之后每当模型 state 变化都会再次调用，
        // 直到副作用被卸载为止。
        addEffect(effectCallback, model);

        // time: 2
        // decrease 方法将 state 修改为 -1，
        // 然后触发了副作用回调中的 `agent.reset`，
        // state 值被重置为 0
        agent.decrease();
        expect(agent.state).toBe(0);

        // time: 4
        // increase 方法将 state 更改为 1，
        // 同样触发了副作用，但因为回调函数中条件不符，
        // 故无法调动 `agent.reset` 方法
        agent.increase();
        expect(agent.state).toBe(1);
        // 观察 time
        expect(effectCallback).toBeCalledTimes(4);
        disconnect();
    });

});
```

### 方法副作用

如果想要监听单个代理方法产生的 state 变更副作用，可以使用 `addEffect(callback, model, method)` 。这时，副作用为方法副作用，当且仅当该方法被调用，并引起了 state 变更才会触发当前副作用回调函数。

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

class CountModel implements Model<number> {

    state = 0;

    increase() {
        return this.state + 1;
    }

    decrease() {
        return this.state - 1;
    }

    reset() {
        return 0;
    }

}

describe('effect 基本用法', () => {

    test('监听方法做出的 state 变更', () => {
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const effectCallback: EffectCallback<number> = jest.fn((prev,state) => {
            if (state < 0) {
                // 如果 state 变更值小于 0，
                // 调用 `agent.reset` 方法将其重置为 0
                agent.reset();
            }
        });

        // 对 `decrease` 方法添加副作用回调监听函数，
        // 当且仅当 `decrease` 方法被调用，并产生 state 变化时触发回调函数。
        addEffect(effectCallback, model, model.decrease);

        // `decrease` 将 state 变为 -1 导致 `reset` 被调用
        agent.decrease();
        expect(agent.state).toBe(0);
        agent.increase();
        expect(agent.state).toBe(1);
        // `increase` 方法并不能触发当前副作用，
        // 所以副作用回调函数被调用次数仍为 1
        expect(effectCallback).toBeCalledTimes(1);
        disconnect();
    });

});
```

### 监听代理副作用

为了方便使用，我们允许使用 agent 代理代替模型 model ，代理方法代替模型方法作为副作用目标。这与添加至模型 model 及方法上是等效的。

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

class CountModel implements Model<number> {

    state = 0;

    increase() {
        return this.state + 1;
    }

    decrease() {
        return this.state - 1;
    }

    reset() {
        return 0;
    }

}

describe('effect 基本用法', () => {

    test('我们也可以对 agent 对象，或它的方法添加副作用', () => {
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const effectCallback: EffectCallback<number> = jest.fn();

        const decreaseEffectCallback: EffectCallback<number> = jest.fn((prev,state) => {
            if (state < 0) {
                agent.reset();
            }
        });

        // 对 agent 代理添加副作用，效果等同与对它的模型添加副作用
        addEffect(effectCallback, agent);

        // 对 agent 代理方法添加副作用，效果等同与对它的模型方法添加副作用
        addEffect(decreaseEffectCallback, agent, agent.decrease);

        agent.decrease();
        expect(agent.state).toBe(0);
        agent.increase();
        expect(agent.state).toBe(1);
        expect(effectCallback).toBeCalledTimes(4);
        expect(decreaseEffectCallback).toBeCalledTimes(1);
        disconnect();
    });

});
```

### 副作用 decorator 装饰器用法

添加副作用的 decorator API 为 [effect](/zh/api?id=effect)。被该 decorator 函数修饰的方法将被作为副作用回调来使用，而副作用监听目标默认为当前模型实例：`effect()`，如传入当前模型方法，则监听该目标下的指定方法：`effect(Model.prototype.method)`。

装饰器副作用回调方法会在触发时被绑定到一个临时创建的当前模型代理 agent 对象上。所以该方法中的关键词 `this` 是个代理对象。这方便使用者在回调方法中调用其他方法，从而修改 state 数据。

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

describe("使用 effect decorator API",()=>{

    class InnerCountModel implements Model<number> {

        state = 0;

        increase() {
            return this.state + 1;
        }

        decrease() {
            return this.state - 1;
        }

        reset(to?:number) {
            return to||0;
        }

        // effect decorator 函数无入参，
        // 这相当于监听当前模型实例 state 变更，
        // 而被 decorate 的当前方法即为副作用回调方法
        @effect()
        gtZeroEffect(prevState:number, state:number){
            if(state<0){
                // effect decorator 函数会将当前函数绑定在一个临时代理对象上，
                // 这时通过关键词 `this` 调用的方法可直接修改数据
                this.reset();
            }
            // effect 回调函数本身不具备修改 state 的能力，所以不需要返回 state 数据，
            // 但如果有需求可以返回 destroy 销毁函数
        }

        // 当 effect 入参为当前 class 的方法时，
        // 监听目标为当前入参方法
        @effect(InnerCountModel.prototype.increase)
        ltFiveEffect(prevState:number, state:number){
            if(state>4){
                this.reset(4);
            }
        }

    }

    test('use effect decorator',()=>{
        const model = new InnerCountModel();
        const {agent,connect,disconnect} = create(model);
        connect();
        // state 变成 -1，触发 `gtZeroEffect` 副作用回调函数，将 state 重置为 0
        agent.decrease();
        expect(agent.state).toBe(0);
        for(let i=0;i<5;i++){
            agent.increase();
        }
        // state 变为5，触发 `ltFiveEffect` 副作用回调函数，state 降为 4
        expect(agent.state).toBe(4);
        disconnect();
    });

});
```

### 副作用销毁函数

如果在副作用回调函数中返回一个函数，该函数会在副作用再次被触发前调用，以便清理上次副作用处理中产生的内存占用等副效果。我们通常叫这种函数为销毁函数。

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

class CountModel implements Model<number> {

    state = 0;

    increase() {
        return this.state + 1;
    }

    decrease() {
        return this.state - 1;
    }

    reset() {
        return 0;
    }

}

describe('effect 基本用法', () => {

    test('副作用回调函数可返回一个销毁函数，该销毁函数会在副作用回调函数再次被调用前或副作用被卸载时被调用',()=>{
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const destroy = jest.fn();

        const effectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
            if(state<0){
                agent.reset();
            }
            // 副作用回调函数返回一个销毁函数,
            // t该销毁函数会在副作用回调函数再次被调用前或副作用被卸载时被调用
            return destroy;
        });

        addEffect(effectCallback, model, model.decrease);

        // 第一次触发副作用时并不会运行销毁函数
        agent.decrease();
        expect(agent.state).toBe(0);

        expect(effectCallback).toBeCalledTimes(1);
        expect(destroy).toBeCalledTimes(0);

        // 再次触发副作用前，运行销毁函数
        agent.decrease();
        expect(agent.state).toBe(0);

        expect(effectCallback).toBeCalledTimes(2);
        expect(destroy).toBeCalledTimes(1);

        // 当前 disconnect 导致模型的所有代理链接全被销毁，
        // 这时系统会强行卸载当前模型的所有副作用，并再次触发销毁函数
        disconnect();
        expect(destroy).toBeCalledTimes(2);
    });

});
```

### 手动更新副作用回调函数

`addEffect` API 本身能返回一个 `effect` 对象，该对象拥有 `update` 和 `unmount` 方法。其中 `update` 方法可用于更新当前的副作用回调函数。

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

class CountModel implements Model<number> {

    state = 0;

    increase() {
        return this.state + 1;
    }

    decrease() {
        return this.state - 1;
    }

    reset() {
        return 0;
    }

}

describe("使用 effect 的其他能力",()=>{

    test('使用 effect.update 方法来更新副作用回调函数',()=>{
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const effectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
            if(state<0){
                agent.reset();
            }
        });

        const effect = addEffect(effectCallback, model, model.decrease);

        agent.decrease();
        expect(agent.state).toBe(0);

        // 更新成另一个回调函数
        effect.update(jest.fn());

        agent.decrease();
        // 新回调函数不具备重置 state 的能力
        expect(agent.state).toBe(-1);

        expect(effectCallback).toBeCalledTimes(1);

        disconnect();
    });

});
```

### 手动卸载副作用

`addEffect` API 返回对象的另一个方法 `unmount` 可用于手动卸载当前副作用。

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

class CountModel implements Model<number> {

    state = 0;

    increase() {
        return this.state + 1;
    }

    decrease() {
        return this.state - 1;
    }

    reset() {
        return 0;
    }

}

describe("使用 effect 的其他能力",()=>{

    test('通过 effect.unmount 方法手动卸载副作用',()=>{
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const destroy = jest.fn();

        const effectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
            if(state<0){
                agent.reset();
            }
            return destroy;
        });

        const {unmount} = addEffect(effectCallback, model, model.decrease);

        agent.decrease();
        expect(agent.state).toBe(0);

        expect(effectCallback).toBeCalledTimes(1);
        // 卸载副作用
        unmount();
        // 当副作用被卸载时会调用 destroy 销毁函数
        expect(destroy).toBeCalledTimes(1);

        // 这时已经没有副作用再将 state 重置为 0 了
        agent.decrease();
        expect(agent.state).toBe(-1);

        expect(effectCallback).toBeCalledTimes(1);
        expect(destroy).toBeCalledTimes(1);

        disconnect();
        expect(destroy).toBeCalledTimes(1);
    });

});
```

[下一章](/zh/feature?id=特性)我们将介绍一些非常有用的特性，请不要错过。

