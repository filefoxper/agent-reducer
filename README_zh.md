[![npm][npm-image]][npm-url]
[![standard][standard-image]][standard-url]

[npm-image]: https://img.shields.io/npm/v/agent-reducer.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/agent-reducer
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[standard-url]: http://npm.im/standard

# agent-reducer

想要一个更简单的`reducer`？试试`agent-reducer`。

`agent-reducer`能将一个模型 ( class实例或object ) 转换成`reducer` function。这个模型被称为`OriginAgent`，它必须含有一个`state`属性，用来存储需要持续维护的数据，同时它可以包含若干个方法用来处理数据分流。这些方法的返回值被称为`next state`，它将会替换原来的`state`属性值，成为处理后模型的新`state`状态数据。你可以通过使用`MiddleWare`的方式，在`next state`成为新`state`之前，拦截它，并对`next state`进行再加工，丢弃等处理，从而影响最终的新`state`数据。你也可以使用`MiddleWare`做出方法控制效果，比如：debounce ... 等。

## 使用

### 对比经典reducer用法
```typescript
import {OriginAgent} from "agent-reducer";
import {useReducer} from 'react';
import {useAgentReducer} from 'use-agent-reducer';

    interface Action {
        type?: 'stepUp' | 'stepDown' | 'step' | 'sum',
        payload?: number[] | boolean
    }

    /**
     * 经典的reducer写法
     * @param state
     * @param action
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
     * agent-reducer 模型写法与 reducer 经典很接近，
     * 但因为使用 class 作为模型，所以在数据分流和处理入参方面更简单
     */
    class CountAgent implements OriginAgent<number> {

        state = 0;
        
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{ 
            // 内部复用方法'stepUp','stepDown'不能直接产生next state
            // 这些方法并不会触发 state 的 dispatch 行为
            return isUp ? this.stepUp() : this.stepDown();
        }

        sum(...counts: number[]): number {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

    }

    // 经典 reducer
    const [ state, dispatch ] = useReducer(countReducer,0);
    
    const handleSum = (...additions:number[]) => {
        // 我们只能通过 dispatch 一个 action object 与 reducer 进行沟通
        dispatch({type:'sum',payload:additions});
    };

    // agent-reducer
    const { state:agentState, stepUp } = useAgentReducer(CountAgent);

    // 通过模型获取的方法可以被直接调用，传参
    // 方法中的关键词 this 已被 agent-reducer 绑定在模型上，
    // 所以可以通过赋值的方式把该方法赋给任意对象，而不用担心调用时 this 出错的问题
    const handleAgentSum = stepUp;
```
`agent-reducer`作为一个独立包不能直接用在类似`react`、`redux`系统中，我们需要构建系统接驳工具来衔接它。幸运的是我们可以找到[use-agent-reducer](https://www.npmjs.com/package/use-agent-reducer)、[use-redux-agent](https://www.npmjs.com/package/use-redux-agent)这些现存的接驳工具分别衔接`react`、`redux`系统。如果有兴趣你也可以学习如何编写一个衔接器让`agent-reducer`接入更多的系统。

#### 使用MiddleWare：

```typescript
import {MiddleWarePresets,createAgentReducer} from 'agent-reducer';

    class CountAgent implements OriginAgent<number> {

        state = 0;
        
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{ 
            return isUp ? this.stepUp() : this.stepDown();
        }
        // 如果希望使用promise resolve的数据作为下一个state,
        // 你需要使用 MiddleWare 系统
        async sumByRequests(): number {
            const counts = await Promise.resolve([1,2,3]);
            return counts.reduce((r, c): number => r + c, 0);
        };

    }

    //使用 MiddleWarePresets.takePromiseResolve() 
    const {agent}=createAgentReducer(CountAgent,MiddleWarePresets.takePromiseResolve());

    await agent.sumByRequests();

    agent.state; // 6
    
```
`agent-reducer`提供了一套实用的`MiddleWare`系统，你可以从`MiddleWarePresets`或`MiddleWares`中挑选合适的`MiddleWare`使用，api：`middleWare`、`useMiddleWare`、`createAgentReducer`都为你提供了使用接口。当然如果有特殊需求，你也可以写一个自己的`MiddleWare`。

## 连接器

[use-agent-reducer](https://www.npmjs.com/package/use-agent-reducer) react hook，用来代替 `react useReducer`.

## 文档

如果你对`agent-reducer`感兴趣，想要更深入的了解和使用它，请移步至[document](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/index.md)。