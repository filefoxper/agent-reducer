[![npm][npm-image]][npm-url]
[![standard][standard-image]][standard-url]

[npm-image]: https://img.shields.io/npm/v/agent-reducer.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/agent-reducer
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[standard-url]: http://npm.im/standard

# agent-reducer

`agent-reducer` is a model container for Javascript apps.

It helps you write applications with a micro `mvvm` pattern and provides a great developer experience.

You can use `agent-reducer` together with [React](https://reactjs.org), [Redux](https://redux.js.org), or with any other view library.

## Other language

[中文](https://github.com/filefoxper/agent-reducer/blob/master/README_zh.md)

## Compare with reducer

`agent-reducer` is desgined for splitting reducer function to smaller parts for different action types. And we found that `class` is a appropriate pattern for action splitting. So, the model pattern for `agent-reducer` looks like a class with a `state` property, and some reducer like methods.

With the comparison between `reducer usage` and `agent-reducer usage`, you will have a first impression about what the model looks like. 

The comparison is built on [React hooks](https://reactjs.org/docs/hooks-intro.html) ecosystem.

```typescript
import {Model} from "agent-reducer";
import {useReducer} from 'react';
import {useAgentReducer} from 'use-agent-reducer';

interface Action {
    type?: 'stepUp' | 'stepDown' | 'step' | 'sum',
    payload?: number[] | boolean
}

/**
* reducer description
* @param state  last state
* @param action object as params
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
* model description
*/
class Counter implements Model<number> {
    // current state
    state = 0;
        
    stepUp = (): number => this.state + 1;

    stepDown = (): number => this.state - 1;

    step(isUp: boolean):number{
        return isUp ? this.stepUp() : this.stepDown();
    }
    // free to set params
    sum(...counts: number[]): number {
        return this.state + counts.reduce((r, c): number => r + c, 0);
    }

}

......

// reducer tool
const [ state, dispatch ] = useReducer(countReducer,0);
    
// define sum callback
const handleSum = (...additions:number[]) => {
    dispatch({type:'sum',payload:additions});
};

// agent-reducer
const { 
    state:agentState, 
    // sum method reference
    stepUp:handleAgentSum 
} = useAgentReducer(Counter);
// do not worry about the keyword `this`
// in method `handleAgentSum` from an `agent object`,
// it is always bind to your model instance,
// which is created or enhanced by agent-reducer.

......

```

Like any other independent libraries, `agent-reducer` needs connectors for working with a view library. If you are working with React, we recommend [use-agent-reducer](https://www.npmjs.com/package/use-agent-reducer) as its connector. 

## Basic usage

```typescript
import {
    MiddleWarePresets,
    create,
    middleWare,
    Model
} from 'agent-reducer';

describe('basic usage',()=>{

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

        // if you want to take a promise resolved data as next state,
        // you can add a middleWare.
        @middleWare(MiddleWarePresets.takePromiseResolve())
        async sumByAsync(): Promise<number> {
            const counts = await Promise.resolve([1,2,3]);
            return counts.reduce((r, c): number => r + c, 0);
        }

    }

    test('by default, a method result should be the next state',()=>{
        // use create api, you can create an `Agent` object from its `Model`
        const {agent,connect,disconnect} = create(Counter);
        // before call the methods,
        // you need to connect it first
        connect();
        // calling result which is returned by method `stepUp` will be next state
        agent.stepUp();
        // if there is no more work for `Agent`,
        // you should disconnect it.
        disconnect();
        expect(agent.state).toBe(1);
    });

    test('If you want to take a promise resolve data as next state, you should use MiddleWare',async ()=>{
        // use create api, you can create an `Agent` object from its `Model`
        const {agent,connect,disconnect} = create(Counter);
        // before call the methods,
        // you need to connect it first
        connect();
        // calling result which is returned by method `sumByAsync`
        // will be reproduced by `MiddleWarePresets.takePromiseResolve()`,
        // then this MiddleWare will take the promise resolved value as next state
        await agent.sumByAsync();
        // if there is no more work for `Agent`,
        // you should disconnect it.
        disconnect();
        expect(agent.state).toBe(6);
    });

});
    
```

`agent-reducer` provides a rich MiddleWare ecosystem, you can pick appropriate MiddleWares from MiddleWarePresets, and add them to your method by using api `middleWare, withMiddleWare, agentOf` or `create` directly. You can also write and use your own `MiddleWare` to our system too.

## Share state change synchronously

`agent-reducer` stores state, caches, listeners in the model instance, so you can share state change synchronously between two or more agent objects by using the same model instance.

```typescript
import {
    create,
    middleWare,
    MiddleWarePresets,
    Action,
    Model
} from 'agent-reducer';

describe('update by observing another agent',()=>{

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

    const counter = new Counter();

    test('an agent can share state change with another one, if they share a same model instance',()=>{
        // we create two listeners `dispatch1` and `dispatch2` for different agent reducer function
        const dispatch1 = jest.fn().mockImplementation((action:Action)=>{
            // the agent action contains a `state` property,
            // this state is what the model state should be now.
            expect(action.state).toBe(1);
        });
        const dispatch2 = jest.fn().mockImplementation((action:Action)=>{
            expect(action.state).toBe(1);
        });
        // use create api,
        // you can create an `Agent` object from its `Model`
        const reducer1 = create(counter);
        const reducer2 = create(counter);
        // before call the methods,
        // you need to connect it first,
        // you can add a listener to listen the agent action,
        // by using connect function
        reducer1.connect(dispatch1);
        reducer2.connect(dispatch2);
        // calling result which is returned by method `stepUp` will be next state.
        // then reducer1.agent will notify state change to reducer2.agent.
        reducer1.agent.stepUp();

        expect(dispatch1).toBeCalled();     // dispatch1 work
        expect(dispatch2).toBeCalled();     // dispatch2 work
        expect(counter.state).toBe(1);
    });

});

```

The previous example may not easy for understanding, but consider if we use this feature in a view library like React, we can update state synchronously between different components without `props` or `context`， and these components will rerender synchronously. You can use it easily with its React connnector [use-agent-reducer](https://www.npmjs.com/package/use-agent-reducer).

## Connector

* [use-agent-reducer](https://www.npmjs.com/package/use-agent-reducer)

## Document

If you want to learn more, you can go into our [document](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/index.md) for more details.