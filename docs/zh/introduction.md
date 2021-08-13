# 介绍

作为一款模型维护工具，`agent-reducer` 更加注重 `Model` (模型)，所谓的 `Model` 通常需要 `state` (数据储存)、 `method` (行为方法) 组成。 

`agent-reducer` 能将 [Model](/introduction?id=model) 转换成一个模型代理对象 [Agent](/introduction?id=agent)，通过调用 `Agent` 代理的 `method` (行为方法) 就可以发起一个任务去修改模型数据 （或仅仅执行一个无数据修改的任务）。

通过该章节的简单介绍，您将了解到 `agent-reducer` 的基本用法。

## 开发动机

作为一款成功的状态管理工具，[Redux](https://redux.js.org)有一套非常简明的状态管理机制，即 reducer function 模型。作为一种纯 function 的模型描述方案，reducer 非常易于组合、测试，特别是 reducer 中 return 即修改的设计方案更是让人赞不绝口（`agent-reducer` 的 `method` 也采用了这一设计准则）。

但 [Redux](https://redux.js.org) 也有自己的小麻烦，如：

* 高度的数据集成，所有数据维护在 store 对象中，且不可见。
* dispatch 工作机制需要使用者参与，使用者需要 dispatch action 到 reducer 中使其工作起来。
* action type 逻辑分流，为了处理不同的逻辑块，使用者需要用 `switch...case` 或 `if...else` 对 action type 进行逻辑分流。

相较于单一的 reducer function，class 可以更好地描述分散在模型中的多种行为，也更适用于自然模型的定义。而在实际开发过程中，我们也发现 class 模型更实用，更简单。为此我们开发了这款侧重于模型管理的工具 `agent-reducer`.

## 基本概念

在 `agent-reducer` 中有两个非常重要的基本概念，`模型` 与 `代理` 。

#### 模型

`模型` 是种用于描述数据状态处理的 class 或 object 模版。它由一个用来存储数据状态的 `state` 属性以及一系列相关处理方法 (`method`) 组成。

1. `state` ：当前存储在模型中的数据状态。
2. `method` ：一系列用来处理 state 的方法。
   
以下案例是一个简单的计数器模型:

```typescript
import {Model} from 'agent-reducer';

// 这是一个简单计数器模型
class CountAgent implements Model<number> {
    // 初始状态值
    state = 0;

    // 这是一个对当前值加一的方法，
    // 方法返回值即为下一个 state
    stepUp = (): number => this.state + 1;

    // 这是一个对当前值减一的方法，
    // 方法返回值即为下一个 state
    stepDown(): number {
      return this.state - 1;
    }

    step(isUp: boolean): number {
      // 在一个方法内可以调用其他方法协助产生下一个 state 数据
      return isUp ? this.stepUp() : this.stepDown();
    }

    // 你可以任意传参，自由度远高于 reducer 的 action
    sum(...counts: number[]): number{
      return this.state + counts.reduce((r, c): number => r + c, 0);
    };
}
```

#### 代理

`模型` 用来描述我们希望维护的行为方法和状态结构，而 `代理` 则根据 `模型` 定义，为我们提供所需的数据更改能力。我们可以在 `模型` 中找到被调用 `代理` 方法的原始映射，并通过观察原始映射方法的返回值预测出即将变更的 state 数据状态。`代理` 方法的这一特性与 reducer 取返回值作最新值的行为规范非常相似，但稍有差别，之后会在介绍 `MiddleWare` (中间件) 的过程中提及。

通过使用 API [create](/zh/api?id=create) 我们可以为 `模型` 创建一个可链接的 `代理` 对象。以上例中的计数器模型为基础：

```typescript
import {Model,create} from 'agent-reducer';

class Counter implements Model<number> {

    state = 0;

    stepUp = (): number => this.state + 1;

    stepDown(): number {
      return this.state - 1;
    }

    step(isUp: boolean): number {
      return isUp ? this.stepUp() : this.stepDown();
    }

    sum(...counts: number[]): number{
      return this.state + counts.reduce((r, c): number => r + c, 0);
    };
}

......

// 通过 API `create` 为 Counter 模型创建一个代理 `agent` 
const { agent } = create(Counter);
```

## 安装

`agent-reducer` 库长期维护于 [npm](https://www.npmjs.com/get-npm) 官网。通过以下命令可快速安装最新版本的 `agent-reducer` :

```
npm i agent-reducer
```

## 入门

本节主要介绍如何为 `模型` 创建 `代理`，以及如何使用 `agent-reducer` API 中的辅助功能。通过学习以下内容，您将掌握 `agent-reducer` 的基本用法。

#### 创建代理

`模型` 是一个带有 state 属性及行为方法的 ES6 class 或对象。`代理` 是一个建立在 `模型实例` 基础上的 Proxy 对象，用于修改数据。以下代码展示了如何为 `模型` 创建 `代理`。

对象模型:

```typescript
import {
    create,
} from 'agent-reducer';

describe('简单 object 模型', () => {

    // 这是一个简单计数器模型
    const counter = {

        state: 0, // 初始状态值

        // 这是一个数据处理方法，
        // 方法返回值为新的 state 数据
        increase(): number {
            return this.state + 1;
        }

    }

    test('一个带有 state 和 method 方法的 object 即可为模型', () => {
        // 使用 create api, 可以把模型转化为代理器
        const {agent, connect, disconnect} = create(counter);
        // 在进行操作前，需要使用 connect 进行简单的模型代理同步工作
        connect();
        // 调用代理器上的 `increase` 方法进行 state+1 处理
        agent.increase();
        // 如果代理器已经不再具有使用价值，
        // 我们需要通过 disconnect 释放同步产生的内存变量
        disconnect();
        expect(agent.state).toBe(1);
    });

});
```

 ES6 Class 模型:

```typescript
import {
    create,
    Model,
} from 'agent-reducer';

describe('简单 class 模型', () => {

    // 这是一个简单计数器模型
    class Counter implements Model<number> {

        state: number;

        constructor() {
            // 初始状态值
            this.state = 0;
        }

        // 这是一个数据处理方法，
        // 方法返回值为新的 state 数据
        increase(): number {
            return this.state + 1;
        }

    }

    test('an class model is simple and classify', () => {
        // 使用 create api, 可以把模型转化为代理器
        const {agent, connect, disconnect} = create(Counter);
        // 在进行操作前，需要使用 connect 进行简单的模型代理同步工作
        connect();
        // 调用代理器上的 `increase` 方法进行 state+1 处理
        agent.increase();
        // 如果代理器已经不再具有使用价值，
        // 我们需要通过 disconnect 释放同步产生的内存变量
        disconnect();
        expect(agent.state).toBe(1);
    });

});
```

单元测试源码链接 [introduce.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/introduce.test.ts)。

我们推荐使用 ES6 class 创建 `模型` 。ES6 `decorator` 修饰器可以让我们更容易地在模型上添加各种 `agent-reducer` 的辅助功能。

#### MiddleWare

`MiddleWare` (中间件) 可用来对方法返回值进行再次加工，并将加工结果作为模型实例的最新 state 值。它也可以用来为调用方法添加一些特殊特性（如: debounce 防抖等）。

`代理` 处理数据状态变更的方式非常的简单粗暴，返回即变更。这种方式在简单数据处理过程中非常便捷，但遇到一些特殊返回数据（如 promise 对象）时，往往显得有些呆板。为此 `agent-reducer` 准备了一套 `MiddleWare` 中间件系统。

以下代码展示了如何使用官方提供的 `MiddleWarePresets.takePromiseResolve` 来获取 promise resolve 数据，并将其更新为最新 state。

``` typescript
import {create, middleWare, MiddleWarePresets, Model} from "agent-reducer";

describe('使用 `MiddleWare`', () => {

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

    // 这是一个 todo-list 模型，
    // 我们可以通过 fetch 方法获取服务器中的数据 
    class TodoList implements Model<Array<Todo>> {

        state = [];

        // 方法 fetch 返回一个 promise 对象，
        // 我们需要使用 MiddleWare 将 promise resolve 数据转化成最新 state
        fetch(): Promise<Array<Todo>> {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        clear(): Promise<Array<Todo>> {
            return new Promise((resolve) => {
                resolve([]);
            });
        }

    }

    test('如果我们不作任何处理，直接调用 `fetch` ，我们的 state 会变成一个 promise 对象', async () => {
        const {agent, connect, disconnect} = create(TodoList);
        connect();
        await agent.fetch();
        // agent.state 变成了一个 promise 对象
        expect(Object.getPrototypeOf(agent.state)).toBe(Promise.prototype);
        disconnect();
    });

    test('使用 `MiddleWarePresets.takePromiseResolve()` 可以将返回的 promise resolve 值转为新的 state', async () => {
        // create api 可以接收一个 MiddleWare ，
        // 并使其作用于所有 agent 代理方法
        const {agent, connect, disconnect} = create(TodoList, MiddleWarePresets.takePromiseResolve());
        connect();
        await agent.fetch();
        // agent.state 变成了 promise resolve 值
        expect(agent.state).toEqual(todoList);
        await agent.clear();
        // agent.state 变成了 promise resolve 值
        expect(agent.state).toEqual([]);
        disconnect();
    })

});
```

单元测试源码 [introduce.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/introduce.test.ts)。

我们通过 `create` API 为代理的所有方法添加了同一个 `MiddleWare`。但如果我们只希望为特定的方法添加 `MiddleWare` ，或为不同的方法添加不同的 `MiddleWare`，那我们就需要使用另一个 API [middleWare](/zh/api?id=middleware) 了。

`ES6 decorator` 配合 `middleWare` 会是个不错的选择。

``` typescript
import {create, middleWare, MiddleWarePresets, Model} from "agent-reducer";

describe('在模型方法上使用 decorator 添加 `MiddleWare`', () => {

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

    // 这是一个 todo-list 模型，
    // 我们可以通过 fetch 方法获取服务器中的数据
    class TodoList implements Model<Array<Todo>> {

        state = [];

        // fetch 方法返回一个 promise 对象，
        // 通过使用 MiddleWarePresets.takePromiseResolve() 
        // 可以把 promise resolve 值转换为最新 state
        @middleWare(MiddleWarePresets.takePromiseResolve())
        fetch(): Promise<Array<Todo>> {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        // 直接调用，将采取默认的 state 变更模式，
        // state 将变成一个 promise 对象 
        clear(): Promise<Array<Todo>> {
            return Promise.resolve([]);
        }

    }

    test('使用 decorator 可以为特定方法添加 `MiddleWare`，其他方法不受影响', async () => {
        const {agent, connect, disconnect} = create(TodoList);
        connect();
        // 方法上的 MiddleWare 只作用于当前方法
        await agent.fetch();
        // 在 MiddleWare 的作用下 agent.state 变更为 promise resolve 值
        expect(agent.state).toEqual(todoList);
        // clear 方法不受影响，没有任何 MiddleWare 作用于它
        await agent.clear();
        // agent.state 变更为一个 promise 对象
        expect(Object.getPrototypeOf(agent.state)).toBe(Promise.prototype);
        disconnect();
    });

});
```

单元测试源码 [introduce.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/introduce.test.ts)。

如果希望为模型所有方法提供一个兜底 `MiddleWare` ，除了使用 `create` API，还可以使用 `ES6 decorator` ，可参考下面的例子:

```typescript
import {create, middleWare, MiddleWarePresets, Model} from "agent-reducer";

describe('在模型上使用 class decorator 添加 `MiddleWare`', () => {

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

    // 这是一个 todo-list 模型，
    // 我们可以通过 fetch 方法获取服务器中的数据。
    // 使用 class decorator 可以为所有方法添加兜底 `MiddleWare`
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>> {

        state = [];

        fetch(): Promise<Array<Todo>> {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        clear(): Promise<Array<Todo>> {
            return Promise.resolve([]);
        }

    }

    test('使用 class decorator 添加的 `MiddleWare` 作用于 class 中的所有方法', async () => {
        const {agent, connect, disconnect} = create(TodoList);
        connect();
        // 兜底 MiddleWare 影响所有方法
        await agent.fetch();
        // agent.state 变更为 promise resolve 值
        expect(agent.state).toEqual(todoList);
        // 兜底 MiddleWare 影响所有方法
        await agent.clear();
        // agent.state 变更为 promise resolve 值
        expect(agent.state).toEqual([]);
        disconnect();
    });

});
```

单元测试源码 [introduce.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/introduce.test.ts)。

#### 模型共享

虽然 `模型共享` 并非 `agent-reducer` 的主要功能，但其受欢迎的程度已然超越了 `agent-reducer` 库中的很多核心能力，并被广泛应用于以 react 框架为基础的开发环境中，为数据的同步变更及渲染提供了极大的便利。

该功能与环境无关，并不需要依赖像 react.Context 这样的共享环境，在像[支付宝小程序原生hook](https://github.com/shensai06/mini-hook)系统这样，没有同步渲染机制的环境中，它的同步优势更加明显。

`模型共享` 是指通过使用同一 `模型实例` 创建出的不同 `代理` 之间具备数据同步变更的能力。因此单纯的 class `模型` 并不能直接用于模型共享，需要先对其进行实例化操作才能使用。

以下为模型共享的例子:

```typescript
import {create, middleWare, MiddleWarePresets, Model} from "agent-reducer";

describe('使用 `模型共享`', () => {

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

    // 这是一个 todo-list 模型，
    // 我们可以通过 fetch 方法获取服务器中的数据。
    // 使用 class decorator 可以为所有方法添加兜底 `MiddleWare`
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>> {

        state = [];

        fetch(): Promise<Array<Todo>> {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        clear(): Promise<Array<Todo>> {
            return Promise.resolve([]);
        }

    }

    // 创建一个 `模型实例`
    const todoListInstance = new TodoList();

    test('单纯的 class 模型只能被复用，不能作模型共享', async () => {
        // 为不同的代理创建不同的数据更新监听器 dispatch1，dispatch2
        const dispatch1 = jest.fn().mockImplementation((action: Action) => {
            // 代理以 action 的数据形式将数据更新通知到监听器
            // action.state 为即将更新的数据
            expect(action.state).toEqual(todoList);
        });
        const dispatch2 = jest.fn().mockImplementation((action: Action) => {
            expect(action.state).toEqual(todoList);
        });
        // 使用相同的 class `模型`
        const {agent: a1, connect: c1, disconnect: d1} = create(TodoList);
        // 使用相同的 class `模型`
        const {agent: a2, connect: c2, disconnect: d2} = create(TodoList);
        // 在进行模型与代理的连接操作时，
        // 可加入监听器 dispatch1，dispatch2
        c1(dispatch1);
        c2(dispatch2);
        // 运行代理 a1 上的方法，发现 state 变更与代理 a2 无关
        await a1.fetch();
        expect(dispatch1).toBeCalled();     // dispatch1 工作
        expect(dispatch2).not.toBeCalled();     // dispatch2 不工作
        expect(a1.state).not.toEqual(a2.state);
        d1();
        d2();
    });

    test('作用于同一模型实例的模型共享可以同步代理之间的数据更新', async () => {
        // 为不同的代理创建不同的数据更新监听器 dispatch1，dispatch2
        const dispatch1 = jest.fn().mockImplementation((action: Action) => {
            // 代理以 action 的数据形式将数据更新通知到监听器
            // action.state 为即将更新的数据
            expect(action.state).toEqual(todoList);
        });
        const dispatch2 = jest.fn().mockImplementation((action: Action) => {
            expect(action.state).toEqual(todoList);
        });
        // 相同的 `模型实例子`
        const {agent: a1, connect: c1, disconnect: d1} = create(todoListInstance);
        // 相同的 `模型实例子`
        const {agent: a2, connect: c2, disconnect: d2} = create(todoListInstance);
        // 在进行模型与代理的连接操作时，
        // 可加入监听器 dispatch1，dispatch2
        c1(dispatch1);
        c2(dispatch2);
        // 代理 a1 会把 state 数据变更通知给代理 a2.
        await a1.fetch();
        expect(dispatch1).toBeCalled();     // dispatch1 工作
        expect(dispatch2).toBeCalled();     // dispatch2 工作
        expect(a1.state).toEqual(a2.state);
        d1();
        d2();
    });

});
```

单元测试源码 [introduce.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/introduce.test.ts)。

想要了解更多细节，请进[进入](/zh/guides?id=引导)下一章。
