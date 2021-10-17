# Introduction

As a micro model container, `agent-reducer` translates a [Model](/introduction?id=model) description to a [Agent](/introduction?id=agent) instance. And you can change `Model` state by calling `Agent` methods.

In this chapter, we will introduce a basic usage about this library. 

## Motivation

[Redux](https://redux.js.org) is a greate tool for state management, it defines model as a simple function (reducer), and stores state in a invisible variable. 

The pure functional model contains all action types in, sometimes, it may be designed too complex with lots code about `switch...case` or `if...else`. 

Class or object is more suitable to be model. We can use methods to split the different action processes, and use a state property to store the current model state.

An `Agent` object for the class or object model is necessary, so we can change state by calling the method of `Agent` object just like dispatching an action to reducer function. And calling method is more natural and free.

## Concept

There are two important concepts, `Model` and `Agent`.

#### Model

`Model` is for describing how to manage state and actions. It can be class or object, with a state property, and some methods for processing new state. It is a template for creating an [Agent](/introduction?id=agent) object which can change the Model state.

1. The property `state` maintians the Model state, it can be any type except function. Do not make any side effect to `state`, and keep it immutable, when you are processing with it.
2. The `method` is a function for producing a new `state`. Consider the `methods` as reducer splitting functions for all action types.
   
This is a `Model` example:

```typescript
import {Model} from 'agent-reducer';

// model
class CountAgent implements Model<number> {
    // set a initial state
    state = 0;

    // use arrow function method to produce a new state
    stepUp = (): number => this.state + 1;

    // use a prototype function method to produce a new state
    stepDown(): number {
      // use this.state to produce a new state
      return this.state - 1;
    }

    step(isUp: boolean): number {
      // use other model functions to produce a new state.
      return isUp ? this.stepUp() : this.stepDown();
    }

    // you can pass any params as you whish,
    // it is better than reducer action pattern.
    sum(...counts: number[]): number{
      return this.state + counts.reduce((r, c): number => r + c, 0);
    };
}
```

#### Agent

`Agent` is a Proxy object from `Model`. It wraps every method of the Model to be a state changeable method in `Agent`. When a `Agent` method is called, it often changes state by taking its returning data. This strategy of state change is similar with the one a reducer function always takes. This is a default strategy of state change, it can be changed. 

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

// api create returns `Agent` object directly
const { agent } = create(Counter);
```

## Installation

The `agent-reducer` package lives in [npm](https://www.npmjs.com/get-npm). To install the latest stable version, run the following command:

```
npm i agent-reducer
```

## Getting started

This section describes how to create `Agent` from `Model`, and how to call `agent-reducer` API for help. After reading this section, you can master the basic usage of `agent-reducer`. 

#### create agent

`Model` can be a ES6 class, or an object with state property. `Agent` is the Proxy object from `Model instance` for changing state. Follow code below, you can learn how to create an `Agent` from a `Model`.

Object model pattern:

```typescript
import {
    create,
} from 'agent-reducer';

describe('object pattern model',()=>{

    // this is a counter model,
    // we can increase or decrease its state
    const counter={

        state: 0, // initial state

        // consider what the method returns as a next state for model
        increase():number {
            return this.state + 1;
        }

    }

    test('an object with a state property can be a model too',()=>{
        // use create api, you can create an `Agent` object from its `Model`
        const {agent,connect,disconnect} = create(counter);
        // before call the methods,
        // you need to connect it first
        connect();
        // the result returned by method `agent.increase` will be next state
        agent.increase();
        // if there is no more work for `Agent`,
        // you should disconnect it.
        disconnect();
        expect(agent.state).toBe(1);
    });

});

```

Class model pattern:

```typescript
import {
    create,
    Model,
} from 'agent-reducer';

describe('class pattern model',()=>{

    // this is a counter model,
    // we can increase or decrease its state
    class Counter implements Model<number>{

        state: number;

        constructor(){
            // initial state
            this.state = 0;
        }

        // consider what the method returns as a next state for model
        increase():number {
            return this.state + 1;
        }

    }

    test('an class model is simple and classify',()=>{
        // use create api, you can create an `Agent` object from its `Model`
        const {agent,connect,disconnect} = create(Counter);
        // before call the methods,
        // you need to connect it first
        connect();
        // the result returned by method `agent.increase` will be next state
        agent.increase();
        // if there is no more work for `Agent`,
        // you should disconnect it.
        disconnect();
        expect(agent.state).toBe(1);
    });

});
```

check unit test [introduce.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/en/introduce.test.ts).

We recommend to create a model with class pattern. In ES6 class, we can use  `decorators` to simplify the usage of `agent-reducer` helpers.

#### MiddleWare

`MiddleWare` is a function for reproducing or discarding a state change after method returns. It also can be used for giving special running features to a method.

As we know the `Agent` always takes its method returning as a new state, and no matter what it is. This default state taking feature is simple and helpful, when every method returns synchronously. But if we want to take a promise resolve data as a new state, it can not work expectedly, the new state of `Model` only can be changed to be a promise object, if we do nothing. To solve this problem, we need `MiddleWare`.

The code below shows how to use the MiddleWare `MiddleWarePresets.takePromiseResolve` to take a promise resolve data as new state.

``` typescript
import {create, middleWare, MiddleWarePresets, Model} from "agent-reducer";

describe('how to use `MiddleWare`',()=>{

    type Todo ={
        content:string,
        status:'new'|'doing'|'done'
    };

    const todoList:Array<Todo> = [
        {content:'create project structure',status:'done'},
        {content:'coding',status:'done'},
        {content:'unit test',status:'doing'},
        {content:'write docs',status:'new'},
    ];

    // this is a to-do list model,
    // we can fetch list from server
    class TodoList implements Model<Array<Todo>>{

        state = [];

        // method fetch returns a promise object,
        // we should use MiddleWare to take the promise resolve data as a new state
        fetch():Promise<Array<Todo>>{
            return new Promise((resolve)=>{
                resolve([...todoList]);
            });
        }

        clear():Promise<Array<Todo>>{
            return new Promise((resolve)=>{
                resolve([]);
            });
        }

    }

    test('do nothing, agent will use the default state taking, that make new state to be a promise',async ()=>{
        const {agent,connect,disconnect} = create(TodoList);
        connect();
        await agent.fetch();
        // the agent.state is changed to be a promise object
        expect(Object.getPrototypeOf(agent.state)).toBe(Promise.prototype);
        disconnect();
    });

    test('use `MiddleWarePresets.takePromiseResolve()` can take the promise resolve data as new state ',async ()=>{
        // create api can accept a MiddleWare param,
        // and all methods from agent will reproduce state with the same MiddleWare feature.
        const {agent,connect,disconnect} = create(TodoList,MiddleWarePresets.takePromiseResolve());
        connect();
        await agent.fetch();
        // the agent.state is changed to be the promise resolve data.
        expect(agent.state).toEqual(todoList);
        await agent.clear();
        // the agent.state is changed to be the promise resolve data.
        expect(agent.state).toEqual([]);
        disconnect();
    })

});
```

check unit test [introduce.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/en/introduce.test.ts).

We have used api `create` to add MiddleWare for all methods in our model. But sometimes we just want to add MiddleWare to a exact method, then use  `ES6 decorator` should be a good choice.

``` typescript
import {create, middleWare, MiddleWarePresets, Model} from "agent-reducer";

describe('use method decorator `MiddleWare`',()=>{

    type Todo ={
        content:string,
        status:'new'|'doing'|'done'
    };

    const todoList:Array<Todo> = [
        {content:'create project structure',status:'done'},
        {content:'coding',status:'done'},
        {content:'unit test',status:'doing'},
        {content:'write docs',status:'new'},
    ];

    // this is a to-do list model,
    // we can fetch list from server
    class TodoList implements Model<Array<Todo>>{

        state = [];

        // method fetch returns a promise object,
        // we should use MiddleWare to take the promise resolve data as a new state.
        // Use method decorator can reduce the scope of MiddleWare to the exact method you want to effect on.
        @middleWare(MiddleWarePresets.takePromiseResolve())
        fetch():Promise<Array<Todo>>{
            return new Promise((resolve)=>{
                resolve([...todoList]);
            });
        }

        // do nothing, and use the default state taking feature
        clear():Promise<Array<Todo>>{
            return Promise.resolve([]);
        }

    }

    test('use method decorator can reduce the scope of `MiddleWare` to the exact method ',async ()=>{
        const {agent,connect,disconnect} = create(TodoList);
        connect();
        // the method MiddleWare only effect on method `fetch`
        await agent.fetch();
        // the agent.state is changed to be the promise resolve data.
        expect(agent.state).toEqual(todoList);
        // no MiddleWare effect on method `clear`
        await agent.clear();
        // the agent.state is changed to be a promise object
        expect(Object.getPrototypeOf(agent.state)).toBe(Promise.prototype);
        disconnect();
    });

});
```

check unit test [introduce.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/en/introduce.test.ts).

If you want a `ES6 decorator MiddleWare` for all methods in model, you can follow below:

```typescript
import {create, middleWare, MiddleWarePresets, Model} from "agent-reducer";

describe('use class decorator `MiddleWare`',()=>{

    type Todo ={
        content:string,
        status:'new'|'doing'|'done'
    };

    const todoList:Array<Todo> = [
        {content:'create project structure',status:'done'},
        {content:'coding',status:'done'},
        {content:'unit test',status:'doing'},
        {content:'write docs',status:'new'},
    ];

    // this is a to-do list model,
    // we can fetch list from server.
    // use class decorator to add MiddleWare,
    // can make this MiddleWare effect on all methods in this class
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>>{

        state = [];

        fetch():Promise<Array<Todo>>{
            return new Promise((resolve)=>{
                resolve([...todoList]);
            });
        }

        clear():Promise<Array<Todo>>{
            return Promise.resolve([]);
        }

    }

    test('use class decorator can make `MiddleWare` effect on all methods in this class ',async ()=>{
        const {agent,connect,disconnect} = create(TodoList);
        connect();
        // the class MiddleWare effect on method `fetch`
        await agent.fetch();
        // the agent.state is changed to be the promise resolve data.
        expect(agent.state).toEqual(todoList);
        // the class MiddleWare effect on method `clear`
        await agent.clear();
        // the agent.state is changed to be the promise resolve data.
        expect(agent.state).toEqual([]);
        disconnect();
    });

});
```

check unit test [introduce.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/en/introduce.test.ts).

#### model sharing

`Model sharing` is the most popular feature in `agent-reducer`, though it is not a important feature in this library. 

`Model sharing` allow you sharing the state changes between different `Agents` from a same `Model instance`. So, if you want use this feature to make `Agents` change state synchronously, you have to use the same `Model instance`, and a class can not be an instance.

For example:

```typescript
import {create, middleWare, MiddleWarePresets, Model} from "agent-reducer";

describe('use model sharing',()=>{

    type Todo ={
        content:string,
        status:'new'|'doing'|'done'
    };

    const todoList:Array<Todo> = [
        {content:'create project structure',status:'done'},
        {content:'coding',status:'done'},
        {content:'unit test',status:'doing'},
        {content:'write docs',status:'new'},
    ];

    // this is a to-do list model,
    // we can fetch list from server.
    // use class decorator to add MiddleWare,
    // can make this MiddleWare effect on all methods in this class
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>>{

        state = [];

        fetch():Promise<Array<Todo>>{
            return new Promise((resolve)=>{
                resolve([...todoList]);
            });
        }

        clear():Promise<Array<Todo>>{
            return Promise.resolve([]);
        }

    }

    // same `Model instance`
    const todoListInstance = new TodoList();

    test('The `Model class` is just for reuse',async ()=>{
        // we create two listeners `dispatch1` and `dispatch2` for different agent reducer function
        const dispatch1 = jest.fn().mockImplementation((action:Action)=>{
            // the agent action contains a `state` property,
            // this state is what the model state should be now.
            expect(action.state).toEqual(todoList);
        });
        const dispatch2 = jest.fn().mockImplementation((action:Action)=>{
            expect(action.state).toEqual(todoList);
        });
        // same `Model class`
        const {agent:a1,connect:c1,disconnect:d1} = create(TodoList);
        // same `Model class`
        const {agent:a2,connect:c2,disconnect:d2} = create(TodoList);
        // before call the methods,
        // you need to connect it first,
        // you can add a listener to listen the agent action,
        // by using connect function
        c1(dispatch1);
        c2(dispatch2);
        // the a1 just work itself.
        await a1.fetch();
        expect(dispatch1).toBeCalled();     // dispatch1 work
        expect(dispatch2).not.toBeCalled();     // dispatch2 not work
        expect(a1.state).not.toEqual(a2.state);
        d1();
        d2();
    });

    test('The model sharing feature makes state change of `Agents` work synchronously',async ()=>{
        // we create two listeners `dispatch1` and `dispatch2` for different agent reducer function
        const dispatch1 = jest.fn().mockImplementation((action:Action)=>{
            // the agent action contains a `state` property,
            // this state is what the model state should be now.
            expect(action.state).toEqual(todoList);
        });
        const dispatch2 = jest.fn().mockImplementation((action:Action)=>{
            expect(action.state).toEqual(todoList);
        });
        // same `Model instance`
        const {agent:a1,connect:c1,disconnect:d1} = create(todoListInstance);
        // same `Model instance`
        const {agent:a2,connect:c2,disconnect:d2} = create(todoListInstance);
        // before call the methods,
        // you need to connect it first,
        // you can add a listener to listen the agent action,
        // by using connect function
        c1(dispatch1);
        c2(dispatch2);
        // the a1 will notify state change to a2.
        await a1.fetch();
        expect(dispatch1).toBeCalled();     // dispatch1 work
        expect(dispatch2).toBeCalled();     // dispatch2 work
        expect(a1.state).toEqual(a2.state);
        d1();
        d2();
    });

});
```

check unit test [introduce.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/en/introduce.test.ts).

Ready to know more details? Let's go to [next](/guides?id=guides).
