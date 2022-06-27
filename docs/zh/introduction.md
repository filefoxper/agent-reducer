# 介绍

作为一款模型维护工具，`agent-reducer` 更加注重 `Model` (模型)，所谓的 `Model` 通常需要 `state` (数据储存)、 `method` (数据处理方法) 组成。 

`agent-reducer` 能将 [Model](/introduction?id=model) 转换成一个模型代理对象 [Agent](/introduction?id=agent)，通过调用 `Agent` 代理的 `method` 来处理或修改 state 数据。

通过该章节的简单介绍，您将了解到 `agent-reducer` 的基本用法。

## 开发动机

作为一款成功的状态管理工具，[Redux](https://redux.js.org)有一套非常简明的状态管理机制，即 reducer function 模型。作为一种纯 function 的模型描述方案，reducer 非常易于组合、测试，特别是 reducer 中 return 即修改的设计方案更是让人赞不绝口（`agent-reducer` 的 `action method` 也采用了这一设计准则）。

但 [Redux](https://redux.js.org) 也有自己的小麻烦，如：

* 高度的数据集成，所有数据维护在 store 对象中，且不可见。
* dispatch 工作机制需要使用者采用 action object 的形式将参数传入 reducer 。
* action type 为了处理不同的逻辑块，使用者需要用 `switch...case` 或 `if...else` 对 action type 进行逻辑分流。

相较于单一的 reducer function，class 可以更好地描述分散在模型中的多种行为，也更适用于自然模型的定义。而在实际开发过程中，我们也发现 class 模型更实用，更简单。为此我们开发了这款侧重于模型管理的工具 `agent-reducer`.

## 基本概念

在 `agent-reducer` 中有两个非常重要的基本概念，`模型` 与 `代理` 。

#### 模型

`模型` 是种用于描述数据状态处理的 class 或 object 模版。它由一个用来存储数据状态的 `state` 属性以及一系列相关处理方法 (`method`) 组成，根据这些方法在模型中的不同作用，我们可以把它们分为：`action method`（行为方法）、`flow method`（工作流方法）、`effect method`（副作用响应方法）。

1. `state` ：当前存储在模型中的数据状态。
2. `action method` ：通过 `代理` 对象获取的非 `flow method` 方法，这些方法调用后的返回值可直接修改模型的 state 数据状态，其中关键词 `this` 代表模型实例。在 `strict` 严格模式下，只有使用了 `@act()` 修饰器的方法才可能成为 `action method`（行为方法）；在常规模式下，只要是来自代理对象的非 `flow method` 方法，都是 `action method`（行为方法）。
3. `flow method`：通过 `代理` 对象获取的添加了 `@flow()` 装饰器的方法，这些方法的关键词 `this` 代表一个临时的 `代理` 对象，它们虽然不能直接通过返回值修改 state 数据，但却可以通过从 `this` 上获取 `action method` 来达到修改的效果。通常被用作组织 `action methods` 来完成一个复杂的工作流程，因此它也被称作工作流方法。
4. `effect method`：这是一种特殊的 `flow method`（工作流方法），用来监听模型 state 的数据变更。可以通过 `@effect(...)` 来标识，这个装饰器可接收多个目标行为方法作为监听参数，来过滤我们想要监听的行为方法是否引起了 state 更新。注意该方法只能提供给模型系统使用，不能人为获取或调用。
   
以下案例是一个简单的计数器模型:

```typescript
import {Model} from 'agent-reducer';

// 这是一个简单计数器模型
class CountAgent implements Model<number> {
    // 初始状态值
    state = 0;

    // 这是一个对当前值加一的方法，
    // 方法返回值即为下一个 state
    // 可作为行为方法使用
    increase = (): number => this.state + 1;

    // 这是一个对当前值减一的方法，
    // 方法返回值即为下一个 state
    // 可作为行为方法使用
    decrease(): number {
      return this.state - 1;
    }

    step(isUp: boolean): number {
      // 在一个方法内可以调用其他方法协助产生下一个 state 数据
      // 这里的 increase 和 decrease 来自模型实例，
      // 所以不是行为方法，不能直接修改 state
      // 但返回值可转交给 step 方法去修改 state
      return isUp ? this.increase() : this.decrease();
    }

    // 你可以任意传参，自由度远高于 reducer 的 action
    sum(...counts: number[]): number{
      return this.state + counts.reduce((r, c): number => r + c, 0);
    };
}
```

#### 代理

`模型` 用来描述我们希望维护的数据状态，而 `代理` 则根据 `模型` 定义，为我们提供所需的数据更改及组织能力。我们可以在 `模型` 中找到被调用 `代理` 方法的原始映射，并通过观察原始映射方法的返回值以及该方法是否为行为方法，来预测即将变更的 state 数据状态。行为方法的这一特性与 reducer 取返回值作最新值的行为规范非常相似。

通过使用 API [create](/zh/api?id=create) 我们可以为 `模型` 创建一个可链接的 `代理` 对象。继续以计数器模型为例：

```typescript
import {Model,create} from 'agent-reducer';

class Counter implements Model<number> {

    state = 0;

    increase = (): number => this.state + 1;

    decrease(): number {
      return this.state - 1;
    }

    step(isUp: boolean): number {
      return isUp ? this.increase() : this.decrease();
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

#### 手动编译

`agent-reducer` 当前版本大约为 `200 kb` ，如果你觉得它太占空间，可通过编译类源码的方式减小体积，我们为此提供了一个 `agent-reducer/es` 包。您可以参考我们提供的 webpack 优化方案来使用该包。

```javascript
module.exports = {
    ...... ,
    resolve: {
      ...... ,
      // 通过别名系统重定向引用，将 `agent-reducer` 指向 `agent-reducer/es`,
      // 编译期间 webpack 会将代码 `import {...} from "agent-reducer"`
      // 转换成 `import {...} from "agent-reducer/es"`，
      // 这样我们就可以让引用指向类源码包了，类源码包因没有使用 polyfill ，
      // 故体积很小。
      alias: {
        'agent-reducer': 'agent-reducer/es',
        ...... ,
      }
    },
    module: {
        rules:[
            // 告诉 `webpack` 编译通过别名系统重定向的包，
            // 这样在编译开始后，`babel` 会使用项目中的 `babel.config`
            // 进行转码，并提供配置指定的浏览器版本所需的 polyfill 支持，
            // 这大大减小了 `agent-reducer` 支持 IE11 引入的 polyfill 代码，
            // 同时还可以享受 `webpack` 的 `tree shaking` 功能，
            // 去除大量没有使用到的 API 代码。
            {
                test: /\.js$|\.ts$|\.tsx$/,
                include:/(node_modules\/agent-reducer\/es)/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            cacheDirectory: true
                        }
                    }
                ]
            },
            ......,
        ]
    }
    ...... ,
}
```

#### 打开体验版

如果想要尝试 `agent-reducer` 的最新特性，可对 webpack 环境变量追加如下配置。

webpack 例子:

```javascript
module.exports = {
    plugins: [
      new webpack.DefinePlugin({
        'process.env': {
            AGENT_REDUCER_EXPERIENCE: JSON.stringify('OPEN')
        }
      })
    ]
};
```

## 入门

本节主要介绍如何使用 `模型` 创建 `代理`，以及如何使用 `agent-reducer` API 中的辅助功能。通过学习以下内容，您将掌握 `agent-reducer` 的基本用法。

#### 创建代理

`模型` 是一个带有 state 属性及各种方法的 ES6 class 或对象。`代理` 是一个建立在 `模型实例` 基础上的 Proxy 对象，用于修改组织数据。以下代码展示了如何为 `模型` 创建 `代理`。

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
        // 调用代理器上的 `increase` 行为方法进行 state+1 处理
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
        // 调用代理器上的 `increase` 行为方法进行 state+1 处理
        agent.increase();
        // 如果代理器已经不再具有使用价值，
        // 我们需要通过 disconnect 释放同步产生的内存变量
        disconnect();
        expect(agent.state).toBe(1);
    });

});
```

我们推荐使用 ES6 class 创建 `模型` 。ES6 `decorator` 修饰器可以让我们更容易地在模型上添加各种 `agent-reducer` 的辅助功能。

#### 严格模式

在常规模式下，模型只有行为方法、工作流方法和副作用响应方法，但有时，我们希望创建一些帮助类无副作用的公共方法。这时，采用严格模式会是个非常好的选择，在模型 class 上添加 `@strict()` 修饰器即可进入严格模式。

在严格模式下，只有添加了 `@act()` 修饰器的方法才能成为行为方法，剩下没有修饰器的方法也就成了帮助类公共方法了。

```typescript
import {act, create, strict, Model} from "agent-reducer";

describe("使用严格模式", () => {
    // 强制模型以严格模式工作
    @strict()
    class Counter implements Model<number> {
        state: number = 0;

        // 使用 @act 标记为行为方法
        @act()
        increase() {
            return this.state + 1;
        }

        // 使用 @act 标记为行为方法
        @act()
        decrease() {
            const nextState = this.state - 1;
            if (nextState < 0) {
                // use another method for help
                return this.reset();
            }
            return nextState;
        }

        // 严格模式下未使用 `@act` 标记，
        // 该方法非行为方法，因此调用该方法无论在何场景都不具备修改 state 的能力
        reset() {
            return 0;
        }
    }

    test("在严格模式下，我们可以使用 @act 明确标识出可以修改 state 的行为方法", () => {
        const { agent, connect, disconnect } = create(Counter);
        connect();
        // 当前方法为严格模式下标识的行为方法
        agent.increase();
        // 行为方法可以通过 return 值修改模型 state
        expect(agent.state).toBe(1);
        // 当前方法在严格模式下并未标识，
        // 所以不是行为方法，不具备修改 state 的特性
        agent.reset();
        // state 保持不变
        expect(agent.state).toBe(1);
        disconnect();
    });
});

```

在上例的严格模式下， reset 方法因为没有添加 `@act()` 修饰器，导致被其不能成为行为方法，因此不能修改 state。

#### 工作流方法

工作流方法可用于多个组织行为方法，并完成一个复杂的工作流程。工作流方法本身并不具备修改 state 的能力，但内部关键词 `this` 却是个代理对象，因此可通过调用 `this` 上的其他行为方法来修改 state。定义一个工作流方法，需要在方法上添加 `@flow()` 修饰器，该修饰器可接收一组工作模式参数，来选择方法的工作模式，如：`Flows.latest()`、`Flows.debounce(ms)`...


```typescript
import { flow, Flows, act, create, strict, Model } from "agent-reducer";

describe("使用工作流", () => {
    type State = {
        viewList: string[];
        loading: boolean;
    };

    const remoteSourceList = ["1", "2", "3", "4", "5"];

    class List implements Model<State> {
        state: State = {
            viewList: [],
            loading: false,
        };

        private changeViewList(viewList: string[]): State {
            return { ...this.state, viewList };
        }

        private load(): State {
            return { ...this.state, loading: true };
        }

        private unload(): State {
            return { ...this.state, loading: false };
        }

        // 定义为工作流方法, 并使用 latest 工作模式
        // Flows.latest() 限制当前方法最新调用的行为方法才能修改 state 数据, 
        // 过期调用中的行为方法将失活，失去修改 state 的能力
        @flow(Flows.latest())
        async fetchList() {
            // 方法中的关键词 `this` 代表 `Agent` 对象,
            // 所以, `this.load` 是可以修改 state 数据的行为方法,
            // 它将 state.loading 设置为 true
            this.load();
            try {
                const viewList = await Promise.resolve(remoteSourceList);
                // 行为方法, 接收服务端的 viewList 并将它存入 state 
                this.changeViewList(viewList);
            } finally {
                // 行为方法, 让 state.loading 置为 false
                this.unload();
            }
        }
    }

    test("工作流方法可用于组织行为方法，以完成更复杂的工作流程", async () => {
        const { agent, connect, disconnect } = create(List);
        connect();
        const fetchPromise = agent.fetchList();
        // 首先, `fetchList` 中的行为方法 `load` 将 state.loading 设置为 true
        expect(agent.state.loading).toBe(true);
        await fetchPromise;
        // 最后, fetchList` 中的行为方法 `unload` 将 state.loading 设置为 false
        expect(agent.state.loading).toBe(false);
        disconnect();
    });
});
```

#### 副作用响应方法

副作用响应方法是一种特殊的工作流方法，它不能被直接调用，当模型 state 发生变更时，该方法会根据预先设定的 state 变更过滤参数来决定是否运行。通过对方法添加 `@effect(...)` 可声明副作用响应方法，通过对这个修饰器传入过滤行为方法，可用于控制响应范围 `@effect(()=>[Model.prototype.actionMethod])`。只有被过滤的行为方法产生 state 变更时，副作用响应方法才会被触发。

```typescript
import { flow, Flows, act, create, strict, effect, Model } from "agent-reducer";

describe("使用副作用响应方法", () => {
    type State = {
        sourceList: string[];
        viewList: string[];
        keyword: string;
    };

    const remoteSourceList = ["1", "2", "3", "4", "5"];

    class List implements Model<State> {
        state: State = {
            sourceList: [],
            viewList: [],
            keyword: "",
        };

        // 用于修改 sourceList,
        // 作为未来过滤出 viewList 的数据源
        private changeSourceList(sourceList: string[]): State {
            return { ...this.state, sourceList};
        }

        // 用于修改 viewList
        private changeViewList(viewList: string[]): State {
            return { ...this.state, viewList };
        }

        // 用于键入 keyword 关键词,
        // 作为未来过滤出 viewList 的搜索条件
        changeKeyword(keyword: string): State {
            return { ...this.state, keyword };
        }

        // 获取服务端的 sourceList
        // 定义为 `flow` 工作流方法,
        @flow()
        async fetchSourceList() {
            // 获取服务端 sourceList
            const sourceList = await Promise.resolve(remoteSourceList);
            // 工作流方法中的关键词 `this` 代表 `Agent` 对象,
            // `this.changeSourceList` 是行为方法
            this.changeSourceList(sourceList);
        }

        // 监听 changeSourceList, changeKeyword 行为方法的副作用方法.
        // 使用 `@effect` 修饰器可定义副作用响应方法,
        // 副作用响应方法通过监听预设行为方法产生的 state 变化来运行.
        // 副作用响应方法是一种工作流方法，所以也可以通过 `@flow` 为其定义工作模式.
        // 这里我们定义了 100 毫秒间隔的防抖工作模式以优化搜索过程。
        // 注意：副作用响应方法不能被人为调用，否则报错
        @flow(Flows.debounce(100))
        @effect(() => [
            // 监听 `changeSourceList` 行为方法
            List.prototype.changeSourceList,
            // 监听 `changeKeyword` 行为方法
            List.prototype.changeKeyword,
        ])
        private effectForFilterViewList() {
            const { sourceList, keyword } = this.state;
            // 使用源和关键词过滤出 viewList 用于显示
            const viewList = sourceList.filter((content) =>
                content.includes(keyword.trim())
            );
            // 使用 `this.changeViewList` 行为方法存入 过滤数据
            this.changeViewList(viewList);
        }
    }

    test('副作用响应方法可用于监听模型 state 的改变',async ()=>{
        const { agent, connect, disconnect } = create(List);
        connect();
        // 使用工作流方法获取服务端数据
        await agent.fetchSourceList();
        // fetchSourceList 中的 changeSourceList 会触发 `effectForFilterViewList` 响应，
        // 并在防抖模式的 100 毫秒之后预约运行
        expect(agent.state.sourceList).toEqual(remoteSourceList);
        // changeKeyword 会触发 `effectForFilterViewList` 防抖模式取消上次 100 毫秒的启动预约,
        // 并重新预约 100 毫秒之后运行
        agent.changeKeyword('1');
        await new Promise((r)=>setTimeout(r,110));
        // 副作用响应方法 `effectForFilterViewList` 过滤出 viewList
        expect(agent.state.sourceList).toEqual(remoteSourceList);
        expect(agent.state.viewList).toEqual(['1']);
        disconnect();
    })
});
```

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

关于 MiddleWare 系统，我们已经不再推荐使用，保持行为方法同步执行更好。如果你依然希望获知 MiddleWare 系统可以继续本节学习，否则，请进[进入](/zh/guides?id=引导)下一章。

#### MiddleWare

尽管工作流的出现很大程度上取缔了 MiddleWare 系统，但我们并不打算就此删除这部分 API。

`MiddleWare` (中间件) 可用来对行为方法返回值进行再次加工，并将加工结果作为模型实例的最新 state 值。它也可以用来为调用方法添加一些特殊特性（如: debounce 防抖等）。

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
