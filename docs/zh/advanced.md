# 高级用法

## 自定义 MiddleWare

官方提供的 MiddleWare 集合已经可以满足大部分开放需求了，但在某些特殊场景下，学习并自定义 MiddleWare 依然是十分必要的。

如果不清楚什么是 [MiddleWare](/zh/guides?id=中间件-middleware)，建议回到引导中进行复习。我们再来看看 MiddleWare 的方法结构。

MiddleWare 的结构定义要求如下:

```typescript
/ `MiddleWare` 是一个 function，
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

`Runtime`的结构:

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

Now, we will use the knowledge above to create a customized MiddleWare to integrate the [immer.js](https://www.npmjs.com/package/immer) into our method.

```typescript
import {
    create, 
    middleWare, 
    MiddleWarePresets,
    Model, 
    NextProcess, 
    Runtime, 
    StateProcess
} from "agent-reducer";
import {createDraft, finishDraft} from "immer";

describe('自定义 MiddleWare', () => {

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

    // MiddleWare 是一个可接收 Runtime 参数的 function
    const immerMiddleWare = (runtime: Runtime): NextProcess => {

        // 用于判断是否为 object 的 function
        function isObject<T extends { [key: string]: any }>(data: T): boolean {
            return data && Object.prototype.toString.apply(data) === '[object Object]';
        }

        // 用于存储一个 immer draft
        let cache: { draft: Record<string, unknown> | null } = {draft: null};

        // 存储 next callback
        let listener: ((state: any) => void) | null = null;

        // 调用 createDraft 并缓存结果
        function createCacheDraft(val: any) {
            const draft = createDraft(val);
            cache.draft = draft;
            return draft;
        }

        // 调用 finishDraft 并清理缓存
        function finishCacheDraft() {
            const result = finishDraft(cache.draft);
            cache.draft = null;
            return result;
        }

        // 使用 runtime API 中的 mapModel 方法创建一个 `模型实例` 的 `Proxy` 对象，
        // 当 `代理方法` 开始调用时，关键词 `this` 会被指向这个 `Proxy` 对象。
        runtime.mapModel({
            // Proxy get 拦截
            get(target: any, p: string, receiver: any): any {
                const value = target[p];
                // 如果属性名不为 `state`，
                // 或 state 值并非一个 object，
                // 跳过代理
                if (
                    p !== 'state' ||
                    (!isObject(value) && !Array.isArray(value)) ||
                    value === null
                ) {
                    return value;
                }
                // 如果缓存中 immer draft 对象存在，
                // 则用该 draft 对象来代替当前的 state
                if (cache.draft) {
                    return cache.draft;
                }

                // 如果缓存中 immer draft 对象不存在，
                // 则临时创建一个 draft，并将它存入 cache。
                const draft = createCacheDraft(value);
                // 如果 `listener`不为 null，则证明当前处于异步阶段，主方法已经结束
                // 创建微任务来 finishDraft，
                // 并把每次 finish 的结果传递给下一个 MiddleWare 或 state 修改器
                if (listener) {
                    Promise.resolve().then(() => {
                        if (!cache.draft) {
                            return;
                        }
                        // 如果 cache.draft 存在，
                        // 把当前 draft 转成正常 state 数据。
                        // 之所以不直接把 draft 定义成一个变量就是因为闭包对微任务的影响。
                        const result = finishCacheDraft();
                        // 调用 `next` callback 把当前得到的结果传递出去
                        listener!(result);
                    });
                }
                // 返回创建好的 draft 作为 state 替代品
                return draft;
            },
            set(target: any, p: string | symbol, value: any, receiver: any): boolean {
                if (p !== 'state') {
                    target[p] = value;
                    return true;
                }
                if (listener) {
                    cache.draft = null;
                    listener(value);
                } else {
                    createCacheDraft(value);
                }
                return true;
            }
        });
        return function nextProcess(next: StateProcess) {
            // nextProcess 会在方法执行完毕时调用，
            // 所以，我们不能在方法调用过程中我们需要累积每次对 draft 的变更。
            // 这时我们可以将 next 注入 listener，以便异步过程中对 draft 实时变更做出响应。
            listener = next;
            // 在方法顺序结束时，我们需要检查缓存中是否有 draft，
            // 如果存在则强行进行一次 state 变更
            if (cache.draft) {
                next(finishCacheDraft());
            }
            return function stateProcess(result) {
                // 把最后的 draft 改变外包出去，
                // 由其他 MiddleWare 如 `takePromiseResolve` 在异步结束时，
                // 通过调用 next 当前的 stateProcess 来做完结时的 state 变更
                if (cache.draft) {
                    return next(finishCacheDraft());
                }
                return result;
            }
        }
    }

    // 创建一个 to-do list 模型
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>> {

        state: Array<Todo> = [];

        fetch(): Promise<Array<Todo>> {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        // 使用 immerMiddleWare
        @middleWare(immerMiddleWare)
        shift() {
            // 关键词 this 指向我们的 Proxy 对象，
            // 故 this.state 为一个 immer draft 对象
            this.state.shift();
            // 在方法结束时，immer draft 被转成 state 对象
        }

        // 使用 immerMiddleWare
        @middleWare(immerMiddleWare)
        async refresh() {
            // 关键词 this 指向我们的 Proxy 对象，
            // 故 this.state 为一个 immer draft 对象
            this.state.splice(0, this.state.length);
            // 在方法结束时，immer draft 被转成 state 对象
            await new Promise((r) => setTimeout(r, 200));
            todoList.forEach((data) => {
                this.state.push(data);
            });
        }

        clear(): Promise<Array<Todo>> {
            return Promise.resolve([]);
        }

    }

    test('use immer library in method without return anything', async () => {
        const {agent, connect, disconnect} = create(TodoList);
        connect();
        await agent.fetch();
        expect(agent.state).toEqual(todoList);
        // 通过 immerMiddleWare 操作
        agent.shift();
        expect(agent.state).toEqual(todoList.slice(1));
        // 测试 `immerMiddleWare` 对 async 方法的作用
        const p = agent.refresh();
        expect(agent.state).toEqual([]);
        await p;
        expect(agent.state).toEqual(todoList);
        disconnect();
    });

});
```

查看单元测试代码 [advanced.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/advanced.test.ts)。

自定义 `immerMiddleWare` 利用 `runtime.mapModel` API 创建了一个 `模型实例` 的 Proxy 对象，并在该 Proxy 的 get 拦截中把 state 替换成了它的 immer draft 对象。在相应的方法中，`this.state` 变成了 immer draft 对象，这样我们就可以用 immer 的形式来编写我们的代码，并实时进行 state 变更。

在 `immerMiddleWare` 中，我们通过弃用 `next` 阻止了方法的 return 对象被作为下一个 state 传递出去，这个技巧在官方的 `MiddleWarePresets.takeNothing()` 中也有使用。

## 连接其他第三方库

`create` API 返回了一个 `reducer function`，与普通 function 不同，它带有三个特殊属性：

1. `agent`: `模型实例`的`代理`
2. `connect`: 用于连接`模型实例`与`代理`的链接函数，通过传入一个 dispatch 监听函数，我们可以实时监听 state 变更。dispatch 函数可在 state 变更时接收到一个 `Action` 对象，它包含了一个 `type`（触发变更的方法名）和一个 `state`（当前变更的 state 对象）。
3. `disconnect`: 断开监听，销毁代理的回调函数。

结构如下

```typescript
// 当 state 变更时，一个 Action 对象会被传入 dispatch 监听函数
export declare type Action = {
    // type 为引起本次变更的方法名
    type: string;
    // state 为本次变更的最新 state 值
    state?: any;
};

// 监听 state 变更的监听函数，
// 可通过 connect 生效
type Dispatch = (action: Action) => any;

export type Reducer<S, A> = (state: S, action: A) => S;

// reducer function 的属性
interface ReducerPadding<
    S = any,
    T extends OriginAgent<S> = OriginAgent<S>
    > {
    // `模型实例`的`代理`，
    // 可引起 state 变更
    agent: T;
    // 用于连接 `代理` 与 `模型实例`，
    // 监听 state 变更
    connect: (dispatch: Dispatch) => void;
    // 断开监听，销毁代理的回调函数
    disconnect:()=>void
}

// 包含 ReducerPadding 属性的 reducer function
export type AgentReducer<
    S = any,
    T extends OriginAgent<S> = any
    > = Reducer<S, Action> & ReducerPadding<S, T>;
```

我们将用 `AgentReducer` 创建一个与 [redux](https://redux.js.org) 的连接器，如果你对如何连接一个可视化三方库更有兴趣，可以直接查看 `use-agent-reducer` 的[源码](https://github.com/filefoxper/use-agent-reducer/blob/master/src/index.ts)。

```typescript
import {
    create, 
    middleWare, 
    MiddleWarePresets,
    Model,
} from "agent-reducer";
import {createStore} from "redux";

describe('连接 redux',()=>{

    type User = {
        id: undefined | number
        name: string,
        nick: string
    }

    const defaultUser = {
        id: undefined,
        name: 'guest',
        nick: 'guest'
    };

    const remoteUser = {
        id: 0,
        name: 'name',
        nick: 'nick'
    };

    const anotherRemoteUser = {
        id: 1,
        name: 'name1',
        nick: 'nick1'
    }

    // 这时一个 user 模型
    class UserModel implements Model<User> {

        state: User = defaultUser;

        @middleWare(MiddleWarePresets.takeLatest())
        login() {
            return Promise.resolve(remoteUser);
        }

        @middleWare(MiddleWarePresets.takeLatest())
        switchUser(){
            return Promise.resolve(anotherRemoteUser);
        }

        @middleWare(MiddleWarePresets.takeLatest())
        logout(){
            return Promise.resolve(defaultUser);
        }

        rename(name: string) {
            return {name, nick: name};
        }

        updateNick(nick: string) {
            return {nick};
        }

    }

    test('这是 `agent-reducer` 如何与其他库连接的例子',async ()=>{
        const reducer = create(UserModel);
        // reducer 时一个 function，我们需要获取有用的属性信息
        const { agent,connect,disconnect } = reducer;
        // 将 reducer 接入 redux API `createStore`
        const store = createStore(reducer);
        // 用 `store.dispatch` 来同步 state 变更
        connect(store.dispatch);
        // 登录
        await agent.login();
        // 登录后，state 变更应该进入 redux
        expect(agent.state).toEqual(store.getState());
        expect(store.getState()).toEqual(remoteUser);
        // 使用完毕后，需要调用 disconnect 进行销毁
        disconnect();
    });

})
```

下一节，我们将全量预览系统 [API](/zh/api?id=api-文档)。
