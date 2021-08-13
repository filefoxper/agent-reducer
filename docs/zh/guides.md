# 引导

## 中间件 MiddleWare

MiddleWare 是一种特殊的 function ，它可以用作修改系统默认的 state 变更策略（取返回值为最新的 state 值），也可用来控制方法的运行特征（如添加防抖 debounce 特征）。它可以被单独使用，也可以跟其他 MiddleWare 串行使用。如果需要组合使用多个不同的 MiddleWare 特性，我们可以使用 API `applyMiddleWares` 进行串联。

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

为了说明如何串联 MiddleWare ，我们以官方 API `MiddleWarePresets` 中的 `MiddleWarePresets.takePromiseResolveAssignable()` 为例进行分析。 takePromiseResolveAssignable 是由多个原子性 MiddleWare 串联而来的，这些原子性 MiddleWare 来源于官方 API `MiddleWares`。

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

这个 MiddleWare 由 `MiddleWares.takePromiseResolve()` 和 `MiddleWares.takeAssignable()` 组成。第一个 MiddleWare 负责处理 promise 对象，并将 resolve 值传给下一个 MiddleWare ，而作为它下一个 MiddleWare ，负责把接收到的数据和现存模型实例的 state 数据合成一个新 state ，并发送给系统的 state 修改器，从而修改模型实例的 state 数据。

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

API `withMiddleWare` 可以复制一个 `代理` ，并让通过该接口添加的 MiddleWare 覆盖掉复制品中所有的 MiddleWare。如此设计的原因，其一，是不希望直接修改原 `代理` 导致原 `代理方法` 的 MiddleWare 特性被变更，进而影响原功能；其二，就是因为接下来要介绍的 `Lifecycle MiddleWare` 。

## Lifecycle MiddleWare

Lifecycle MiddleWare 是一种可停止、恢复、重建`代理`的 MiddleWare ，它只能作用于一个被系统复制出来的 `代理`（若在方法上通过 method decorator 添加，访问的`代理方法`会被链接到一个隐藏`代理复制品方法`上）。

官方的 Lifecycle MiddleWare 只有 `LifecycleMiddleWares.takeLatest()` 。这个 MiddleWare 可用于保证当前方法每次调用产生的 state 变更不会因为异步原因导致顺序混乱，即 state 永远获取最新值。举个例子，比如有个翻页查询功能，每次翻页去服务器获取当前页对应的数据，因为服务器返回时间受数据查询速度，网络返回速度影响，所以并不能保证前一页请求的数据比当前页的数据先返回，这就导致当前页数据可能被后返回的前一页数据覆盖。而这个 MiddleWare 就是为了解决类似这种问题而存在的。

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

Lifecycle MiddleWare 的定制方式与普通 MiddleWare 的定制方式类似，只需要使用API `toLifecycleMiddleWare` 使其生效即可。

`agent-reducer` 已经串联了很多常用的 MiddleWare。如果需要，可以在 `MiddleWarePresets` API 中找到它们。

## Effect

Effect 副作用系统可以用来监听`模型实例`的 state 变更。我们可以对`模型实例`、`代理` 以及它们的方法添加副作用监听回调函数。监听函数可接收三个参数：`上次 state`、`当前 state`以及`引起本次 state 变更的方法名`。

```typescript
export type EffectCaller<S, T extends OriginAgent<S>> = (
    // 上次 state
    prev:S,
    // 当前 state
    current:S,
    // 引起本次 state 变更的方法名
    methodName?:keyof T
) => (()=>void)|void;
```

Effect 副作用分为`模型副作用`和`方法副作用`两种。

## 模型副作用

模型副作用可用来监听当前`模型实例`的 state 变更，监听对象可设置为`模型实例`或它的`代理`对象。

当模型实例的 state 发生改变时，会触发其副作用函数，

When add a Effect callback to `Model` or `Agent`, the Effect can listen all the state change, and we call it a `Model state listener Effect`. 

The `Model state listener Effect` will be called forcely by API `addEffect` immediately, after that, when a Model state change happens, it will be called again. The difference between Effect mount calling and state change calling is that every state change is caused by method, and at this time, the Effect accepts a methodName, but when the Effect mounts in, the state change does not happens, so the previous state is equal with the current state, and the param methodName is a `undefined` value.

```typescript
import {
    create, 
    middleWare, 
    MiddleWarePresets,
    Model, 
    withMiddleWare,
    addEffect,
} from "agent-reducer";

describe('use API `addEffect` to listen state changes', () => {

    type Todo = {
        content: string,
        status: 'new' | 'doing' | 'done'
    };

    const todoList: Array<Todo> = [
        {content: 'create project structure', status: 'done'},
        {content: 'coding', status: 'done'},
        {content: 'unit test', status: 'doing'},
        {content: 'write docs', status: 'new'},
    ];

    // this is a to-do list model,
    // we can fetch list from server.
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>> {

        state = [];

        fetch = (): (Promise<Array<Todo>>) => {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        clear(): Promise<Array<Todo>> {
            return Promise.resolve([]);
        }

    }

    test('use api `addEffect` to listen Model state change', async () => {
        // An effect callback accepts a prev state, a current state and a undefined-able type as params,
        // you can do anythings in the callback.
        const effectCall = jest.fn().mockImplementation((prev, current, type?: string) => {
            // If the effect is added for listening the model state, it will be called immediately,
            // and the type will be undefined.
            if (!type) {
                expect(prev).toEqual(current);
                return;
            }
            // When the state change happens we can get a previous state and a current state.
            // In the case of state updating, the param type is the method name which leads this change.
            expect(prev).not.toEqual(current);
        });
        const {agent, connect, disconnect} = create(TodoList);
        connect();
        // API `addEffect` accepts a callback and a `model instance` or `agent` as params.
        // When state of `model instance` or `agent` changes, effect calls the callback.
        addEffect<Array<Todo>, TodoList>(effectCall, agent);
        await agent.fetch();
        await agent.clear();
        disconnect();
        // we have change state by calling method `fetch` and `clear`,
        // both state changes make the effect callback runs.
        expect(effectCall).toBeCalledTimes(3);
    });

});
```

check unit test [guides.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/en/guides.test.ts).

## Method state listener Effect

When add a Effect callback to `Model method` or `Agent method`, the Effect only listen the state changes which caused by this method, and we call it a `Method state listener Effect`. 

The `Method state listener Effect` only can be called by `state changes` from the particular method we want listen to.

```typescript
import {
    create, 
    middleWare, 
    MiddleWarePresets,
    Model, 
    withMiddleWare,
    addEffect,
} from "agent-reducer";

describe('use API `addEffect` to listen state changes', () => {

    type Todo = {
        content: string,
        status: 'new' | 'doing' | 'done'
    };

    const todoList: Array<Todo> = [
        {content: 'create project structure', status: 'done'},
        {content: 'coding', status: 'done'},
        {content: 'unit test', status: 'doing'},
        {content: 'write docs', status: 'new'},
    ];

    // this is a to-do list model,
    // we can fetch list from server.
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>> {

        state = [];

        fetch = (): (Promise<Array<Todo>>) => {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        clear(): Promise<Array<Todo>> {
            return Promise.resolve([]);
        }

    }

    test('use api `addEffect` to listen Method state changes', async () => {
        // If the effect is used for listening the state changes from a particular method,
        // the param `type` will be useless, it always be the name of the method,
        // which you want listen to.
        const effectCall = jest.fn().mockImplementation((prev, current) => {
            // The method effect can only be called when state changes,
            // so, it doesn't run immediately when it is added in.
            expect(prev).not.toEqual(current);
        });
        const model = new TodoList();
        const {agent, connect, disconnect} = create(model);
        connect();
        // add effect to listen method `model.fetch` or `agent.fetch`
        addEffect<Array<Todo>, TodoList>(effectCall, model.fetch);
        await agent.fetch();
        // method `clear` will not lead the effect calling
        await agent.clear();
        disconnect();
        expect(effectCall).toBeCalledTimes(1);
    });

});
```

## Cancel Effect

The API `addEffect` returns a callback for cancel it.

```typescript
import {
    create, 
    middleWare, 
    MiddleWarePresets,
    Model, 
    withMiddleWare,
    addEffect,
} from "agent-reducer";

describe('use API `addEffect` to listen state changes', () => {

    type Todo = {
        content: string,
        status: 'new' | 'doing' | 'done'
    };

    const todoList: Array<Todo> = [
        {content: 'create project structure', status: 'done'},
        {content: 'coding', status: 'done'},
        {content: 'unit test', status: 'doing'},
        {content: 'write docs', status: 'new'},
    ];

    // this is a to-do list model,
    // we can fetch list from server.
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>> {

        state = [];

        fetch = (): (Promise<Array<Todo>>) => {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        clear(): Promise<Array<Todo>> {
            return Promise.resolve([]);
        }

    }

    test('`Effect` can be cancelled', async () => {
        // An effect callback accepts a prev state, a current state and a undefined-able type as params,
        // you can do anythings in the callback.
        const effectCall = jest.fn().mockImplementation((prev, current, type?: string) => {
            // If the effect is added for listening the model state, it will be called immediately,
            // and the type will be undefined.
            if (!type) {
                expect(prev).toEqual(current);
                return;
            }
            // When the state change happens we can get a previous state and a current state.
            // In the case of state updating, the param type is the method name which leads this change.
            expect(prev).not.toEqual(current);
        });
        const {agent, connect, disconnect} = create(TodoList);
        connect();
        // API `addEffect` accepts a callback and a `model instance` or `agent` as params.
        // When state of `model instance` or `agent` changes, effect calls the callback.
        const cancelEffect = addEffect<Array<Todo>, TodoList>(effectCall, agent);
        await agent.fetch();
        // call the addEffect returns to cancel effect
        cancelEffect();
        await agent.clear();
        disconnect();
        // We have change state by calling method `fetch` and `clear`,
        // the state change of `clear` happens after the effect canceling.
        // So, it can not be listened.
        expect(effectCall).toBeCalledTimes(2);
    });

});
```

## The Effect can return a callback for destroying

The Effect can return a callback for destroying. The destroy callback is called when effect is deployed again, or when the `Model` disconnecting happens. Only when all `Agents` from `Model instance` are disconnected, the `Model` disconnecting happens.

The destroy callback is also called when a effect is canceled.

Example:

```typescript
import {
    create, 
    middleWare, 
    MiddleWarePresets,
    Model, 
    withMiddleWare,
    addEffect,
} from "agent-reducer";

describe('The effect callback can return a destroy callback',()=>{

    type Todo = {
        content: string,
        status: 'new' | 'doing' | 'done'
    };

    const todoList: Array<Todo> = [
        {content: 'create project structure', status: 'done'},
        {content: 'coding', status: 'done'},
        {content: 'unit test', status: 'doing'},
        {content: 'write docs', status: 'new'},
    ];

    // this is a to-do list model,
    // we can fetch list from server.
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>> {

        state = [];

        fetch(): (Promise<Array<Todo>>) {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        clear(): Promise<Array<Todo>> {
            return Promise.resolve([]);
        }

    }

    test('If the `Model` is in sharing, the last destroy happens at the time when the last `Agent` is disconnected.',async ()=>{
        const destroy = jest.fn().mockReset();
        const effectCall = jest.fn().mockImplementation((prev, current, type?: string) => {
            return destroy;
        });
        const todoListRef = new TodoList();
        const {agent, connect, disconnect} = create(todoListRef);
        const {agent:another, connect:anotherConnect, disconnect:anotherDisconnect} = create(todoListRef);
        connect();
        anotherConnect();
        // API `addEffect` accepts a callback and a `model instance` or `agent` as params.
        // When state of `model instance` or `agent` changes, effect calls the callback.
        addEffect<Array<Todo>, TodoList>(effectCall, agent);
        await agent.fetch();
        await agent.clear();
        disconnect();
        // we have change state by calling method `fetch` and `clear`,
        // both state changes make the effect callback runs.
        expect(effectCall).toBeCalledTimes(3);
        // destroy by the method updating from `fetch` and `clear`
        expect(destroy).toBeCalledTimes(2);
        // destroy by all `Agents` disconnecting
        anotherDisconnect();
        expect(destroy).toBeCalledTimes(3);
    });

    test('The destroy callback is also called when a effect is canceled',async ()=>{
        const destroy = jest.fn().mockReset();
        const effectCall = jest.fn().mockImplementation((prev, current, type?: string) => {
            return destroy;
        });
        const todoListRef = new TodoList();
        const {agent, connect, disconnect} = create(todoListRef);
        const {agent:another, connect:anotherConnect, disconnect:anotherDisconnect} = create(todoListRef);
        connect();
        anotherConnect();
        // API `addEffect` accepts a callback and a `model instance` or `agent` as params.
        // When state of `model instance` or `agent` changes, effect calls the callback.
        const unEffect = addEffect<Array<Todo>, TodoList>(effectCall, agent);
        await agent.fetch();
        await agent.clear();
        disconnect();
        // we have change state by calling method `fetch` and `clear`,
        // both state changes make the effect callback runs.
        expect(effectCall).toBeCalledTimes(3);
        // destroy by the method updating from `fetch` and `clear`
        expect(destroy).toBeCalledTimes(2);
        // destroy by cancel effect
        unEffect();
        expect(destroy).toBeCalledTimes(3);
    });

});
```

## Do not add Effect to an unconnected Model

Do not add Effect to an unconnected Model.

``` typescript
import {
    create, 
    middleWare, 
    MiddleWarePresets,
    Model, 
    withMiddleWare,
    addEffect,
} from "agent-reducer";

describe('use API `addEffect` to listen state changes', () => {

    type Todo = {
        content: string,
        status: 'new' | 'doing' | 'done'
    };

    const todoList: Array<Todo> = [
        {content: 'create project structure', status: 'done'},
        {content: 'coding', status: 'done'},
        {content: 'unit test', status: 'doing'},
        {content: 'write docs', status: 'new'},
    ];

    // this is a to-do list model,
    // we can fetch list from server.
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>> {

        state = [];

        fetch = (): (Promise<Array<Todo>>) => {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        clear(): Promise<Array<Todo>> {
            return Promise.resolve([]);
        }

    }

    test('do not addEffect to an unconnected `Model`',()=>{
        const effectCall = jest.fn().mockImplementation((prev, current, type?: string) => {
            if (!type) {
                expect(prev).toEqual(current);
                return;
            }
            expect(prev).not.toEqual(current);
        });
        const {agent} = create(TodoList);
        // warning about addEffect to an unconnected `Model`
        expect(()=>addEffect<Array<Todo>, TodoList>(effectCall, agent)).toThrow();
    });

});
```

check unit test [guides.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/en/guides.test.ts).

In next page we introduces some useful features, please do not miss that. Go [next](/feature?id=feature) for learning the most popular features in `agent-reducer`.
