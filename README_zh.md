[![npm][npm-image]][npm-url]
[![standard][standard-image]][standard-url]

[npm-image]: https://img.shields.io/npm/v/agent-reducer.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/agent-reducer
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[standard-url]: http://npm.im/standard

# agent-reducer

`agent-reducer` 是一个基于javascript模型控制的状态管理机。

该库的设计初衷是为了解决 reducer 系统中繁琐的事件分发机制（dispatch），以及不够自然的传参模式（action）。但随着不断地演化发展，`agent-reducer`已逐步进化成了一套拥有完整运行体系的状态管理工具，并广泛被用于各种微模型系统中（如：micro mvvm ）。

## 简单使用

`agent-reducer` 把经典 reducer 中的逻辑按 action 类型拆分成了多个逻辑小块，并用 class 进行了包装，这样，原来的 reducer 逻辑就分散在了不同的 class 方法（method）中了。

对比经典 reducer 系统，可以更容易理解 `agent-reducer` 中的模型的概念。

```typescript
import {Model} from "agent-reducer";
import {useReducer} from 'react';
import {useAgentReducer} from 'use-agent-reducer';

interface Action {
    type?: 'stepUp' | 'stepDown' | 'step' | 'sum',
    payload?: number[] | boolean
}

/**
* 经典reducer
* @param state     最新 state
* @param action    参数对象
*/
const countReducer = (state: number = 0, action: Action = {}): number => {
    switch (action.type) {
        case "stepDown":
            return state - 1;
        case "stepUp":
            return state + 1;
        case "step":
            return state + (action.payload ? 1 : -1);
        case "sum":
            return state + (Array.isArray(action.payload) ?
                action.payload : []).reduce((r, c): number => r + c, 0);
        default:
            return state;
    }
}

/**
* 模型 model
*/
class CountAgent implements Model<number> {
    // 当前 state 数据
    state = 0;
        
    stepUp = (): number => this.state + 1;

    stepDown = (): number => this.state - 1;

    step(isUp: boolean):number{ 
        return isUp ? this.stepUp() : this.stepDown();
    }

    sum(...counts: number[]): number {
        return this.state + counts.reduce((r, c): number => r + c, 0);
    }

}

......

// 经典 reducer
const [ state, dispatch ] = useReducer(countReducer,0);
    
const handleSum = (...additions:number[]) => {
    // 我们只能通过 dispatch 一个 action object 与 reducer 进行沟通
    dispatch({type:'sum',payload:additions});
};

// agent-reducer
const { state:agentState, stepUp } = useAgentReducer(CountAgent);

// 方法中的关键词 this 已被 agent-reducer 绑定在模型上，
// 所以可以通过赋值的方式把该方法赋给任意对象，而不用担心调用时 this 出错的问题
const handleAgentSum = stepUp;

```

`agent-reducer` 作为一个独立包不能直接用在类似`react`、`redux`系统中，我们需要构建系统接驳工具来衔接它。幸运的是我们可以直接使用 [use-agent-reducer](https://www.npmjs.com/package/use-agent-reducer) 这样的 react 接驳工具。如果有兴趣也可以研究一下如何编写一个衔接器让 `agent-reducer` 接入更多的系统。

## 基本用法

```typescript
import {
    MiddleWarePresets,
    create,
    middleWare,
    Model
} from 'agent-reducer';

describe('基本用法',()=>{

    // 这是一个用于计算数字加减的模型，
    // 我们的方法调用将影响模型 state 的变化
    class Counter implements Model<number> {

        state = 0; // state 初始值

        // 方法调用的返回值可以当作模型的下一个 state
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{
            return isUp ? this.stepUp() : this.stepDown();
        }

        // 如果想要使用异步返回值作为 state,
        // 可以通过 MiddleWare 完成转换工作
        @middleWare(MiddleWarePresets.takePromiseResolve())
        async sumByAsync(): Promise<number> {
            const counts = await Promise.resolve([1,2,3]);
            return counts.reduce((r, c): number => r + c, 0);
        }

    }

    test('默认使用 method 返回值作为下一个 state',()=>{
        // 通过 create api 自 `Model` 创建一个 `Agent` 对象
        const {agent,connect,disconnect} = create(Counter);
        // 在调用方法前，需要使用 connect 作一次连接处理
        connect();
        // agent.stepUp 方法返回值将成为下一个 state
        agent.stepUp();
        // 如果不再需要使用当前 agent 对象，
        // 需要通过 disconnect 对之前链接进行销毁处理
        disconnect();
        expect(agent.state).toBe(1);
    });

    test('如果返回值是一个 promise 对象，你可能需要 MiddleWare 获取 promise resolve 数据作为下一个 state',async ()=>{
        // 通过 create api 自 `Model` 创建一个 `Agent` 对象
        const {agent,connect,disconnect} = create(Counter);
        // 在调用方法前，需要使用 connect 作一次连接处理
        connect();
        // agent.sumByAsync 方法返回值为一个 promise 对象，
        // 它将被 MiddleWarePresets.takePromiseResolve(() 进行再加工，
        // 再加工值（promise resolve值）将成为下一个 state。
        await agent.sumByAsync();
        // 如果不再需要使用当前 agent 对象，
        // 需要通过 disconnect 对之前链接进行销毁处理
        disconnect();
        expect(agent.state).toBe(6);
    });

});
```
`agent-reducer`提供了一套实用的 MiddleWare 系统，你可以从`MiddleWarePresets`或`MiddleWares`中挑选合适的 MiddleWare 使用，api：`middleWare`、`withMiddleWare`、`create`都为你提供了使用接口。当然如果有特殊需求，你也可以写一个自己的MiddleWare。

## 同步共享 state 更新

`agent-reducer` 将 state、缓存、监听器存入了模型实例中，所以通过使用同一个模型实例创建的 agent 代理对象可以实现 state 同步更新。

```typescript
import {
    create,
    middleWare,
    MiddleWarePresets,
    Action,
    Model
} from 'agent-reducer';

describe('同步共享 state 更新',()=>{

    // 这是一个用于计算数字加减的模型，
    // 我们的方法调用将影响模型 state 的变化
    class Counter implements Model<number> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    const counter = new Counter();

    test('两个获多个使用相同模型实例的 agent，同步共享 state 更新',()=>{
        // 为两个不同的 agent reducer 对象创建两个 listener，dispatch1 与 dispatch2
        const dispatch1 = jest.fn().mockImplementation((action:Action)=>{
            // 当前监听器可以收到 agent 改变 state 产生的通知。
            // 通知数据 action 中包含了改变的 state 对象。
            expect(action.state).toBe(1);
        });
        const dispatch2 = jest.fn().mockImplementation((action:Action)=>{
            expect(action.state).toBe(1);
        });
        // 通过 create api 自 `Model` 创建一个 `agent reducer`
        const reducer1 = create(counter);
        const reducer2 = create(counter);
        // 在调用方法前，需要使用 connect 作一次连接处理，
        // 通过 connect 可以接入一个监听器，如：dispatch1
        reducer1.connect(dispatch1);
        reducer2.connect(dispatch2);
        // agent.stepUp 方法返回值将成为下一个 state，
        // 并把 state 更新通知到 reducer2.agent
        reducer1.agent.stepUp();

        expect(dispatch1).toBeCalled();     // dispatch1 工作
        expect(dispatch2).toBeCalled();     // dispatch2 工作
        expect(counter.state).toBe(1);
    });

});

```

上例或许还不能很明显地观察到数据同步的发生，但想象一下，这是在一个第三方渲染库中，比如 react 中，我们在两个不同组件中使用同一个模型实例，只要能正确联入 setState ，那么 state 的同步更新及渲染就会发生，如果你对此依然是一头雾水，可以参考 [use-agent-reducer](https://www.npmjs.com/package/use-agent-reducer) 的用法。

## 连接器

[use-agent-reducer](https://www.npmjs.com/package/use-agent-reducer) react hook，用来代替 `react useReducer`.

## 文档

如果你对`agent-reducer`感兴趣，想要更深入的了解和使用它，请移步至[document](https://filefoxper.github.io/agent-reducer/#/zh/)。