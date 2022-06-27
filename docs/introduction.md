# Introduction

As a micro model container, `agent-reducer` translates a [Model](/introduction?id=model) description to a [Agent](/introduction?id=agent) instance. And you can change `Model` state by calling `Agent` methods.

In this chapter, we will introduce a basic usage about this library. 

## Motivation

[Redux](https://redux.js.org) is a greate tool for state management, it defines model as a simple function (reducer), and stores state in an object( store ). 

The pure functional model contains all action logic codes, sometimes, it may be designed too complex with codes like `switch...case` or `if...else`. 

Class or object is more suitable to be a model. We can use methods to split the different action processes, and use a state property to store the current model state.

An `Agent` object for class or object model is necessary, so we can change state by calling the method of `Agent` object just like dispatching an action to reducer function. This operation provides more freedom than the dispatching one.

## Concept

There are two important concepts, `Model` and `Agent`.

#### Model

`Model` describes how to manage state by using methods. It can be class or object, with a state property, and some methods for processing state. It is a template for creating an [Agent](/introduction?id=agent) object which can change the `Model` state.

1. `state`: This property maintians the Model state, it can be any type except function. Keep it immutable is very important.
2. `action method`: Method which returns a new state, and get from [Agent](/introduction?id=agent) object. The `action method` can change model state to its returning data. Keyword `this` in this method represents the model instance. In strict mode, only the methods with `@act()` decorator can be `action methods`, otherwise, it can be any method which is not `flow method`.
3. `flow method`: Method which is decorated by `@flow()`, and get from [Agent](/introduction?id=agent) object. It can organize `action methods` to complete a complex work. Keyword `this` in `flow method` represents an [Agent](/introduction?id=agent) object, so, we can call `action methods` from keyword `this` to change model state.
4. `effect method`: It is a special `flow method`, we can define it by using decorator `@effect`, but can not call it manually. It is triggered when state change happens, and you can add `target action methods` as state change filters.
   
This is a `Model` example:

```typescript
import {Model} from 'agent-reducer';

// model
class Counter implements Model<number> {
    // set a initial state
    state = 0;

    // it can be an action method
    // the arrow function method can be an action method too
    increase = (): number => this.state + 1;

    // it can be an action method
    decrease(): number {
      // keyword this represents model instance,
      // use this.state to produce a new state
      return this.state - 1;
    }

    step(isUp: boolean): number {
      // keyword this represents model instance,
      // so, `increase` and `decrease` are not action methods,
      // `step` method may use their returning data to change state.
      return isUp ? this.increase() : this.decrease();
    }

    // you can pass any params as you whish,
    // it is better than reducer action pattern.
    sum(...counts: number[]): number{
      return this.state + counts.reduce((r, c): number => r + c, 0);
    };
}
```

#### Agent

`Agent` is a Proxy object from `Model`. It is the gate to change and get state from `Model`.

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

// api create returns `Agent` object directly
const { agent } = create(Counter);
```

## Installation

The `agent-reducer` package lives in [npm](https://www.npmjs.com/get-npm). To install the latest stable version, run the following command:

```
npm i agent-reducer
```

#### manual compile

If you want to reduce the package size of `agent-reducer`, you can take the `optimization` below into your `webpack.config.js` file.

```javascript
module.exports = {
    ...... ,
    resolve: {
      ...... ,
      // re-import `agent-reducer` package to `agent-reducer/es`,
      // this can change the code like `import {...} from "agent-reducer"`
      // to be `import {...} from "agent-reducer/es"`.
      alias: {
        'agent-reducer': 'agent-reducer/es',
        ...... ,
      }
    },
    module: {
        rules:[
            // tell `webpack` to compile the replaced package, 
            // when the compiling is started.
            // then `babel` can add polyfills by your browser supports.
            // and webpack tree-shaking works too.
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

#### Open experience

If you want to test new features of `agent-reducer` which can not be used yet, you can add `AGENT_REDUCER_EXPERIENCE:'OPEN'` to your `process.env`.

webpack example:

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


## Getting started

This section describes how to create `Agent` from `Model`, and how to use `agent-reducer` API for help. After reading this section, you can master the basic usage of `agent-reducer`. 

#### create agent

`Model` can be a ES6 class, or an object with state property. `Agent` is the Proxy object from `Model instance` for processing state. Follow code below, you can learn how to create an `Agent` from a `Model`.

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

        decrease():number{
            return this.state - 1;
        }

    }

    test('an object with a state property can be a model too',()=>{
        // use create api, you can create an `Agent` object from its `Model`
        const {agent,connect,disconnect} = create(counter);
        // before call the methods,
        // you need to connect it first
        connect();
        // the result of method `agent.increase` will be next state
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

        decrease():number{
            return this.state - 1;
        }

    }

    test('an class model is simple and classify',()=>{
        // use create api, you can create an `Agent` object from its `Model`
        const {agent,connect,disconnect} = create(Counter);
        // before call the methods,
        // you need to connect it first
        connect();
        // the result of method `agent.increase` will be next state
        agent.increase();
        // if there is no more work for `Agent`,
        // you should disconnect it.
        disconnect();
        expect(agent.state).toBe(1);
    });

});
```

We recommend to create a model with class pattern. In ES6 class, we can use  `decorators` to simplify the usage of `agent-reducer` helpers.

#### Strict mode

The method from `Agent` object may be a flow or action method, but can not be a model method which just provides data processing helps. Take the strict mode for your model, you can left some methods without decorators as common help methods.

In strict mode, you should use `@act()` to mark out which methods can be `action methods`, and the lefts are flow methods (with `@flow()`) or just common help methods.

```typescript
import { Model, create, act, strict } from "agent-reducer";

describe("use strict", () => {
  // force model work in strict mode
  @strict()
  class Counter implements Model<number> {
    state: number;

    constructor(initialState: number) {
      this.state = initialState;
    }

    // mark action method
    @act()
    increase() {
      return this.state + 1;
    }

    // mark action method
    @act()
    decrease() {
      const nextState = this.state - 1;
      if (nextState < 0) {
        // use another method for help
        return this.reset();
      }
      return nextState;
    }

    // without `@act` decorator in strict mode,
    // `reset` can not be an action method
    reset() {
      return 0;
    }
  }

  test("In strict mode, we can identify which method can be an action method obviously by using `@act`", () => {
    // If we need set params for initial model,
    // we can use `new constructor` mode to do this.
    const { agent, connect, disconnect } = create(new Counter(0));
    connect();
    // 'increase' method is from 'agent' and it has been marked by `@act`,
    // so, it is an action method
    agent.increase();
    // model state is changed to 1
    expect(agent.state).toBe(1);
    // without `@act` decorator,
    // `reset` can not be an action method
    agent.reset();
    // model state can not be changed by `reset`
    expect(agent.state).toBe(1);
    disconnect();
  });
});
```

The example above works in strict mode, we can use `@strict()` decorator to mark it out, then add `@act()` onto those methods which you want them to be `action methods`, the lefts are common help methods just like `reset` method in example codes.

#### Flow method

Flow method can not change state itself, but it can call `action methods` inside from keyword `this`. Keyword `this` in flow method is an `Agent` object.

Add `@flow()` on methods can make a method `flow method`. It can take work modes as `Flows.latest()`, `Flows.debounce(ms:number)` ...

```typescript
import { flow, Flows, act, create, strict, Model } from "agent-reducer";

describe('use flow',()=>{

    type State = {
        viewList: string[];
        loading:boolean;
    };

    const remoteSourceList = ["1", "2", "3", "4", "5"];

    class List implements Model<State>{

        state:State = {
            viewList:[],
            loading:false
        }

        private changeViewList(viewList:string[]):State{
            return {...this.state,viewList};
        }

        private load():State{
            return {...this.state,loading:true};
        }

        private unload():State{
            return {...this.state,loading:false};
        }

        // flow method works on latest mode,
        // Flows.latest() can make the state change of in this method only happens in the last calling time
        @flow(Flows.latest())
        async fetchList(){
            // keyword `this` represents `Agent` object,
            // so, `load` is an action method,
            // it changes state.loading tobe true
            this.load();
            try {
                const viewList = await Promise.resolve(remoteSourceList);
                // action method, change state.viewList to what promise resolve
                this.changeViewList(viewList);
            }finally {
                // action method, change state.loading false
                this.unload();
            }
        }

    }

    test('flow method can organize action methods to complete a complex work',async ()=>{
        const {agent, connect, disconnect} = create(List);
        connect();
        const fetchPromise = agent.fetchList();
        // first, action method `load` works in `fetchList`
        expect(agent.state.loading).toBe(true);
        await fetchPromise;
        // finally, action method `unload` works in `fetchList`
        expect(agent.state.loading).toBe(false);
        disconnect();
    })

});
```

There are more flow working modes, you can even write one by yourself.

#### Effect method

Effect method is a special flow method, you can define it by add decorator `@effect(...)` with state change filter params.

We often use `@effect(()=>[Model.prototype.actionMethod])` as a state change filter for effect method. When the targe action methods change model state, it will be triggered. If you want to listen all state changes of model, you can use `@effect('*')`.

The effect method can not be called manually, and it can accept 3 params `prevState:State, state:State, methodName:string`.

Let's make the `List` model do something more complex, like filter `viewList` by keywords typing.

``` typescript
import { flow, Flows, act, create, strict, effect, Model } from "agent-reducer";

describe("use effect", () => {
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

    // for changing sourceList,
    // which will be used for filtering viewList
    private changeSourceList(sourceList: string[]): State {
      return { ...this.state, sourceList};
    }

    // for changing viewList
    private changeViewList(viewList: string[]): State {
      return { ...this.state, viewList };
    }

    // for changing keyword,
    // which will be used for filtering viewList
    changeKeyword(keyword: string): State {
      return { ...this.state, keyword };
    }

    // fetch remote sourceList
    // `flow` decorator can make a flow method,
    // in flow method, keyword `this` is an agent object,
    // so, you can call action method to change state.
    @flow()
    async fetchSourceList() {
      // fetch remote sourceList
      const sourceList = await Promise.resolve(remoteSourceList);
      // keyword `this` represents an agent object in flow method,
      // `changeSourceList` is from this agent object,
      // and it is marked as an action method,
      // so, it can change state.
      this.changeSourceList(sourceList);
    }

    // effect of action methods: changeSourceList, changeKeyword for filtering viewList.
    // `effect` decorator makes an effect method,
    // the effect method can be used for listening the state change from action methods.
    // effect method is a special flow method, it can not be called manually.
    // We can add a flow mode by using `flow` decorator with effect,
    // now, we have told the effect method works in a debounce mode with 100 ms
    @flow(Flows.debounce(100))
    @effect(() => [
      // listen to action method `changeSourceList`
      List.prototype.changeSourceList,
      // listen to action method `changeKeyword`
      List.prototype.changeKeyword,
    ])
    private effectForFilterViewList() {
      const { sourceList, keyword } = this.state;
      // filter out the viewList
      const viewList = sourceList.filter((content) =>
        content.includes(keyword.trim())
      );
      // use action method `changeViewList` to change state
      this.changeViewList(viewList);
    }
  }

  test('effect method can listen to the state change of action methods',async ()=>{
    const { agent, connect, disconnect } = create(List);
    connect();
    // use flow to fetch remote sourceList
    await agent.fetchSourceList();
    // change sourceList, the effect method `effectForFilterViewList` will start after 100 ms
    expect(agent.state.sourceList).toEqual(remoteSourceList);
    // change keyword,
    // the effect method `effectForFilterViewList` will cancel itself,
    // then start after 100 ms
    agent.changeKeyword('1');
    await new Promise((r)=>setTimeout(r,110));
    // effect `effectForFilterViewList` filter out the viewList
    expect(agent.state.sourceList).toEqual(remoteSourceList);
    expect(agent.state.viewList).toEqual(['1']);
    disconnect();
  })
});
```

The example above shows how effect works. The effect method `effectForFilterViewList` listens the state change from `changeSourceList` and `changeKeyword`, no matter which one works, it will be triggered. And as a flow method, we can add `Flows.debounce` as its work mode, so, when it is triggered, it have to wait 100 ms, and check if there is other trigger of this method has happened, then cancel or run the method.

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

The example below is a litte difficult to understand, we recommend you refer to [use-agent-reducer guides](https://filefoxper.github.io/use-agent-reducer/#/guides?id=model-sharing-optimization).

MiddleWare system is not recommend yet, we can use flow to resolve many problems, otherwise, keep state change synchronously is a good idea. If you still want to use MiddleWare, you can find section below. 

Ready to know more details? Let's go to [next](/guides?id=guides).

#### MiddleWare

We have no plan to remove MiddleWare system, so, you can continue use it as you wish.

`MiddleWare` is a function for reproducing or discarding a state change after action method returns. It also can be used for giving special running features to action method.

As we know the `Agent` always takes its action method returning as a new state, and no matter what it is. This default state taking feature is simple and helpful, when every action method returns synchronously. But if we want to take a promise resolve data as a new state, it can not work expectedly, the new state of `Model` only can be changed to be a promise object, if we do nothing. To resolve this problem, we need `MiddleWare`.

The code below shows how to use the MiddleWare [MiddleWarePresets.takePromiseResolve](/api?id=takepromiseresolve) to take a promise resolve data as new state.

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

        // action method fetch returns a promise object,
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
        // and all action methods from agent will reproduce state with the same MiddleWare feature.
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
        // Use method decorator can reduce the scope of MiddleWare
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

If you want a `ES6 decorator MiddleWare` for all action methods in model, you can follow below:

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
    // can make this MiddleWare effect on all action methods in this class
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
