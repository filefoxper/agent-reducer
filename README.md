[![npm][npm-image]][npm-url]
[![NPM downloads][npm-downloads-image]][npm-url]
[![standard][standard-image]][standard-url]

[npm-image]: https://img.shields.io/npm/v/agent-reducer.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/agent-reducer
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[standard-url]: http://npm.im/standard
[npm-downloads-image]: https://img.shields.io/npm/dm/agent-reducer.svg?style=flat-square

# agent-reducer

`agent-reducer` is a model container for Javascript apps.

It helps you write applications with a micro `mvvm` pattern and provides a great developer experience, you can see details [here](https://filefoxper.github.io/agent-reducer/#/).

## Other language

[中文](https://github.com/filefoxper/agent-reducer/blob/master/README_zh.md)

## Basic usage

Let's have some examples to learn how to use it. 

The example below is a counter, we can increase or decrease the state.

```typescript
import { 
    effect, 
    Flows,
    create, 
    act, 
    strict, 
    flow, 
    Model 
} from "agent-reducer";

describe("basic", () => {
  // a class model template for managing a state
  class Counter implements Model<number> {
    // state of this model
    state: number = 0;

    // a method for generating a next state
    increase() {
      // keyword `this` represents model instance, like: new Counter()
      return this.state + 1;
    }

    decrease() {
      const nextState = this.state - 1;
      if (nextState < 0) {
        // use another method for help
        return this.reset();
      }
      return nextState;
    }

    reset() {
      return 0;
    }
  }

  test("call method from agent can change state", () => {
    // 'agent' is an avatar object from model class,
    // call method from 'agent' can lead a state change
    const { agent, connect, disconnect } = create(Counter);
    connect();
    // 'increase' method is from 'agent',
    // and returns a new state for model.
    agent.increase();
    // model state is changed to 1
    // We call these state change methods 'action methods'.
    expect(agent.state).toBe(1);
    disconnect();
  });

  test("only the method get from agent object directly, can change state", () => {
    const actionTypes: string[] = [];
    const { agent, connect, disconnect } = create(Counter);
    connect(({ type }) => {
      // record action type, when state is changed
      actionTypes.push(type);
    });
    // 'decrease' method is from 'agent',
    // and returns a new state for model.
    agent.decrease();
    // model state is changed to 0
    expect(agent.state).toBe(0);
    // the 'reset' method called in 'decrease' method,
    // it is not from 'agent',
    // so, it can not lead a state change itself,
    // and it is not an action method in this case.
    expect(actionTypes).toEqual(["decrease"]);
    disconnect();
  });
});
    
```

The operation is simple:

1. create `agent` object
2. connect
3. call method from `agent` object
4. the method called yet can use what it `returns` to change model state (this step is automatic)
5. disconnect

It works like a redux reducer, that is why it names `agent-reducer`.

Let's see a more complex example, and we will use it to manage a filterable list actions.

```typescript
import { 
    effect, 
    Flows,
    create, 
    act, 
    strict, 
    flow, 
    Model 
} from "agent-reducer";

describe("use flow", () => {
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

  test("flow method is used for composing action methods together to resolve more complex works", async () => {
    const { agent, connect, disconnect } = create(List);
    connect();
    // use flow to fetch remote sourceList
    await agent.fetchSourceList();
    expect(agent.state.sourceList).toEqual(remoteSourceList);
    disconnect();
  });

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

The example above uses decorators like `@flow` and `@effect` to make a list manage model, which can fetch list from remote service and filter by keywords.

## Share state change synchronously

`agent-reducer` stores state, caches, listeners in the model instance, so you can share state change synchronously between two or more different agent objects from the same model instance.

```typescript
import {
    create,
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

This example may not easy for understanding, but consider if we use this feature in a view library like React, we can update state synchronously between different components without `props` or `context`， and these components will rerender synchronously. You can use it easily with its React connnector [use-agent-reducer](https://www.npmjs.com/package/use-agent-reducer).

## Connector

* [use-agent-reducer](https://www.npmjs.com/package/use-agent-reducer)

## Document

If you want to learn more, you can go into our [document](https://filefoxper.github.io/agent-reducer/#/) for more details.
