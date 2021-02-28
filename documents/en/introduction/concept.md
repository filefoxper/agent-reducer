# Concept

## Overview

`agent-reducer` is a reducer transforming tool. It turns model ([OriginAgent](#OriginAgent)) to a reducer function ([AgentReducer](#AgentReducer)), and generates a model proxy object (`Agent`). When you call a method from `Agent` directly, its result (method returns) will be passed into `MiddleWare` system for reproducing, after that, the final result will be `dispatched` to the reducer function which is transfromed from [OriginAgent](#OriginAgent).

## OriginAgent

`OriginAgent` is an object or a class which has a `state` property for storing the data you want to persist. And you can maintian `methods` in it, for producing a `next state`. So, consider it as a data-flow model.

1. Property `state` stores the data you want to persist, it can be any type. When you want to use it, please ensure it is immutable.
2. `method` is a function for producing a `next state`.
   
for example:
```typescript
import {OriginAgent} from 'agent-reducer';

// OriginAgent
class CountAgent implements OriginAgent<number> {
    // OriginAgent should has a state for storing what you want persist
    state = 0;

    // you can use arrow function to generate the next state candidate
    stepUp = (): number => this.state + 1;

    // you can use a method function to generate the next state candidate
    stepDown(): number {
      // use this.state to generate next state
      return this.state - 1;
    }

    step(isUp: boolean): number {
      // use other functions here to generate a next state candidate,
      // when the method in 'agent' is called,
      // only the final result will be dispatched into 'reducer',
      // the inside methods 'stepUp' ,'stepDown' only provides data.
      return isUp ? this.stepUp() : this.stepDown();
    }

    // you can write a function with any params as you whish
    sum = (...counts: number[]): number => {
      return this.state + counts.reduce((r, c): number => r + c, 0);
    };
}
```

## Agent

`Agent` is a `Proxy` object for your `OriginAgent` instance. It provides a latest state and some methods for changing state. You can create a reducer function by using api `createAgentReducer`, and pick property `agent` from this reducer function as your `Agent` object.

```typescript
import {OriginAgent,createAgentReducer} from 'agent-reducer';

class CountAgent implements OriginAgent<number | undefined> {

  state = 0;

  stepUp = (): number => this.state + 1;

  stepDown = (): number => this.state - 1;

  step = (isUp: boolean) => (isUp ? this.stepUp() : this.stepDown());

  sum = (...counts: number[]): number => {
      return this.state + counts.reduce((r, c): number => r + c, 0);
  };

}

const reducer = createAgentReducer(CountAgent, { updateBy: "manual" });
// pick `Agent` object from `reducer`
const agent=reducer.agent;
```

## AgentReducer

`AgentReducer` is a reducer function, it is generated from `OriginAgent` by using api createAgentReducer. You can use this function with your reducer tools ( ex: useReducer, redux ). An `AgentReducer` function contains some usefull padding properties:

1. `agent`: it is a `Proxy` object for your `OriginAgent` instance. When you call the method from `agent` directly, its result will be passed into the `MiddleWare` system for reproducing. After that, the final result will be dispatched to your reducer tool which is using the `AgentReducer`.
2. `update`: this function can update `state` and `dispatch function` from a reducer tool.
3. `initialState`: it is for your reducer tools too. `initialState` is the state when your `OriginAgent` is recreated by api createAgentReducer.
4. `namespace`: it is designed for the reducer tools like `redux` which may need it.
5. `env`: it is the running environment data for `agent`. It contains properties like `strict`,`expired`... , these properties can affect `agent` running features, and they will be introduced in [guide](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/guides/about_env.md).
6. `recordStateChanges`: this function is designed for unit test. It records state change histories when you used it in your unit test.

using AgentReducer properties example:
```typescript
import {OriginAgent,createAgentReducer} from 'agent-reducer';

describe("AgentReducer can integrate with other reducer tools.", () => {
  // simulate a simple redux
  function createStore<S>(reducer: Reducer<S, Action>, initialState: S) {
    let listener: undefined | (() => any) = undefined;
    let state = initialState;
    return {
      dispatch(action: Action) {
        state = reducer(state, action);
        if (listener) {
          listener();
        }
      },
      getState(): S {
        return state;
      },
      subscribe(l: () => any) {
        listener = l;
        l();
        return () => {
          listener = undefined;
        };
      },
    };
  }

  class CountAgent implements OriginAgent<number | undefined> {

    state = 0;

    stepUp = (): number => this.state + 1;

    stepDown = (): number => this.state - 1;

    step = (isUp: boolean) => (isUp ? this.stepUp() : this.stepDown());

    sum = (...counts: number[]): number => {
      return this.state + counts.reduce((r, c): number => r + c, 0);
    };

    clear() {}
  }

  test("'update' function from AgentReducer can connect 'agent-reducer' with another reducer tool", () => {
    // you should set env.updateBy to be 'manual', when createAgentReducer
    // Why not create an 'agent' directly, but a 'reducer' function with 'agent' property?
    // The 'reducer' function can be used with a reducer tool. 
    const reducer = createAgentReducer(CountAgent, { updateBy: "manual" });
    // use reducer generated by createAgentReducer.
    const store = createStore(reducer, reducer.initialState); 
    const { agent, update } = reducer;
    const unlisten = store.subscribe(() => {
      // update state and dispatch function by store notify.
      update(store.getState(), store.dispatch);
    });
    agent.stepUp();
    expect(agent.state).toBe(1);
    // agent.state should be equal with store.getState()
    expect(store.getState()).toBe(agent.state); 
    unlisten();
  });

});
```

## MiddleWare

It is a little different with redux MiddleWare, the MiddleWare ecosystem in `agent-reducer` is designed for `Agent method`, it can disable `agent` state changing (dispatch) or reproduce a next state. There are some often used `MiddleWares`, you can use directlly, like: `MiddleWarePresets.takePromiseResolve`, `MiddleWarePresets.takeAssignable` ... , they will be introduced in [api](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/middle_ware_presets.md).

MiddleWares are functions, they can be chained together. When MiddleWare accept a data from its previous one, it process this data, and pass a processed result to its next one.

 MiddleWare structure looks like:
```typescript
const MiddleWare = <T>(runtime: Runtime<T>):NextProcess | void =>{
  // this function is called before current method calls.

  // runtime object will be needed,
  // when we want to control the method which is called now,
  // it will be introduced in guides.

  return (next: StateProcess):StateProcess => {
      // this function is called after current method returns.

      // 'next' is a function provided by next MiddleWare.
      
      return (result: any)=>{
        // this function is called after current method returns.

        // 'result' is what a previous MiddleWare passed in, 
        // if there is no more MiddleWare previous, 
        // 'result' should coming from current method returns.
        function doSomeThing(data:any):any{
          return data; //do some thing to reproduce data
        }

        // reproduce 'result' ,
        // and then use 'next' function passing processed result to next one.
        return next(doSomeThing(result));
      };

  };

};
```
If you want to know how to chain `MiddleWares` together, and how the chained `MiddleWare` work with system, [see the guides about middle ware](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/guides/about_middle_ware.md).

[next to installation](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/introduction/installation.md)
