[![npm][npm-image]][npm-url]
[![standard][standard-image]][standard-url]

[npm-image]: https://img.shields.io/npm/v/agent-reducer.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/agent-reducer
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[standard-url]: http://npm.im/standard

# agent-reducer

Do you want a more simple `reducer`? Try `agent-reducer`. 

`agent-reducer` turns a model ( class instance or object ) to a `reducer` function. The model we calls `OriginAgent` should has a `state` property for storing a maintainable data, and `methods` for producing `next state`. It just like what a reducer should be. And you can use `MiddleWares` ecosystem to reproduce the `next state`, or control the method actions. 

## other language

[中文](https://github.com/filefoxper/agent-reducer/blob/master/README_zh.md)

## usage

#### compare with old reducer

```typescript
import {OriginAgent} from "agent-reducer";
import {useReducer} from 'react';
import {useAgentReducer} from 'use-agent-reducer';

    interface Action {
        type?: 'stepUp' | 'stepDown' | 'step' | 'sum',
        payload?: number[] | boolean
    }

    /**
     * old reducer usage
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
     * agent-reducer looks like a reducer, 
     * but simplified by using class style
     */
    class CountAgent implements OriginAgent<number> {

        state = 0;
        
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{ 
            // method 'stepUp','stepDown' will not change state,
            // only the method from 'agent', 
            // which is transfromed by createAgentReducer can change state
            return isUp ? this.stepUp() : this.stepDown();
        }

        sum(...counts: number[]): number {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

    }

    // old reducer
    const [ state, dispatch ] = useReducer(countReducer,0);
    
    const handleSum = (...additions:number[]) => {
        // you need to dispatch an action object, 
        // as the params for your 'reducer' function.
        dispatch({type:'sum',payload:additions});
    };

    // agent-reducer
    const agent = useAgentReducer(CountAgent);

    const { state:agentState, stepUp } = agent;

    // Just call a method from your class instance created by 'agent-reducer'.
    // Keyword 'this' has been bind with agent instance by 'agent-reducer'.
    // The method is coming from an 'Agent' which is transformed from your model,
    // so, it will trigger an auto dispatch, and change 'Agent' state.
    const handleAgentSum = stepUp;
```

As `agent-reducer` is an independent library, connectors like [use-agent-reducer](https://www.npmjs.com/package/use-agent-reducer) or [use-redux-agent](https://www.npmjs.com/package/use-redux-agent) for `react` or `redux` are necessary. And if you want, there are apis provided for helping you build a custom connector too.

#### use MiddleWares
```typescript
import {MiddleWarePresets,createAgentReducer} from 'agent-reducer';

    class CountAgent implements OriginAgent<number> {

        state = 0;
        
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{ 
            return isUp ? this.stepUp() : this.stepDown();
        }
        // if you want to take a promise resolved data as next state,
        // you can add a middleWare.
        async sumByRequests(): number {
            const counts = await Promise.resolve([1,2,3]);
            return counts.reduce((r, c): number => r + c, 0);
        };

    }
    // use MiddleWarePresets.takePromiseResolve()
    const {agent}=createAgentReducer(CountAgent,MiddleWarePresets.takePromiseResolve());

    await agent.sumByRequests();

    agent.state; // 6
    
```

`agent-reducer` provides a rich `MiddleWare` ecosystem, you can pick some appropriate `MiddleWares` from `MiddleWarePresets` or `MiddleWares`, and add them to your method by using api `middleWare` or `useMiddleWare` or `createAgentReducer` directly. You can write your own `MiddleWare`, and use it with the `MiddleWare` ecosystem too.

## connector

[use-agent-reducer](https://www.npmjs.com/package/use-agent-reducer) react hook for replacing `react useReducer`.

## document

If you are interested in `agent-reducer`, and want to learn more about it, you can go step to [document](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/index.md).