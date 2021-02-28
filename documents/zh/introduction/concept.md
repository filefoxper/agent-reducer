# 概念

## 预览

`agent-reducer`是一个reducer转换器。它能把使用者提供的模型[OriginAgent](#OriginAgent)转换成一个reducer function ([AgentReducer](#AgentReducer))，并附带一个模型实例对象 ( `agent` ) 作为对reducer操作的替代品。当我们运行`agent`的方法时，该方法的返回值将被传入`MiddleWare`系统进行再加工，加工后的数据会被带入由模型生成的reducer function，成为新的`state`数据。

## OriginAgent

`OriginAgent`可以是一个带有`state`属性的object或class对象，`state`属性用来存储想要持续维护的数据。`OriginAgent`上的方法可用来处理`state`数据流，通过`OriginAgent`调用这些方法只能产生返回数据，并不能影响`state`数据，只有通过转换实例`agent`直接调用这些方法，才能影响`state`数据。

1. `state`属性用来存储想要持续维护的数据, 它可以时任意类型的数据. 请注意，不要直接手动修改该数据。
2. `method`方法可用来处理`state`数据流，或为数据流处理提供便利，通过`OriginAgent`调用这些方法只能产生返回数据，并不能影响`state`数据，只有通过其转换实例`agent`直接调用这些方法，才能影响`state`数据。
   
例子:
```typescript
import {OriginAgent} from 'agent-reducer';

// OriginAgent
class CountAgent implements OriginAgent<number> {
    // OriginAgent 需要一个 state 用来持续维护数据
    state = 0;

    // 通过方法返回值来确定新state候选项（通过agent调用生效）
    stepUp = (): number => this.state + 1;

    stepDown(): number {
      return this.state - 1;
    }

    // 通过方法返回值来确定新state候选项（通过agent调用生效）
    step(isUp: boolean): number {
      // 内部复用方法'stepUp','stepDown'不能直接产生next state
      // 这些方法并不会触发 state 的 dispatch 行为
      return isUp ? this.stepUp() : this.stepDown();
    }

    // 可任意传参，不像action一样受限
    sum = (...counts: number[]): number => {
      return this.state + counts.reduce((r, c): number => r + c, 0);
    };
}
```

## Agent

`OriginAgent`模型的代理，调用当前代理方法产生的返回值会被提交至MiddleWare系统，由MiddleWare系统再处理后，通过dispatch注入reducer function ([AgentReducer](#agentreducer))。通过调用 api `createAgentReducer`，可以获取一个 reducer function ([AgentReducer](#agentreducer))，这个 function 的自带属性`agent`即为`Agent`对象。

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
// 从 reducer function 中提取 Agent 对象
const agent=reducer.agent;
```

## AgentReducer

`AgentReducer`是api createAgentReducer对`OriginAgent`模型加工产生的reducer function印射，这个reducer function包含了以下属性:

1. `agent`: `OriginAgent`模型的代理，调用当前代理方法产生的返回值会被提交至MiddleWare系统，由MiddleWare系统再处理后，通过dispatch注入reducer function (`AgentReducer`)。
2. `update`: 该方法用于实时同步其他reducer工具维护的`state`数据和`dispatch function`。
3. `initialState`: 使用`api createAgentReducer`创建模型代理时产生的模型初始state数据。
4. `namespace`: 提供给类似`redux`这类需要名字空间的reducer工具使用。
5. `env`: `agent`运行环境参数，它包含了属性 `strict`,`expired`... ， 这些属性可用于控制`agent`的运行方式，影响其运行结果。
6. `recordStateChanges`: 该方法目前只允许用于单元测试，通过使用该方法，可以记录`agent`的state变更情况。

例子:
```typescript
import {OriginAgent,createAgentReducer} from 'agent-reducer';

describe("通过使用createAgentReducer产生的AgentReducer API可以整合其他 reducer 工具", () => {
  //模拟一个微型redux
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

  test("通过合理使用update function 可以轻松整合一个reducer管理工具", () => {
    // 如果需要跟其他工具整合在一起需要将env的updateBy属性设置成'manual'
    // 为什么生成一个带有agent代理的reducer function，而非agent代理?
    // reducer function是与其他reducer管理器的关键。
    const reducer = createAgentReducer(CountAgent, { updateBy: "manual" });
    //创建一个store对象，store至少拥有getState和dispatch接口
    const store = createStore(reducer, reducer.initialState); 
    const { agent, update } = reducer;
    const unlisten = store.subscribe(() => {
      // 添加update方法，保证监听到store中state变化时，可以及时更新agent.state数据
      update(store.getState(), store.dispatch);
    });
    agent.stepUp();
    expect(agent.state).toBe(1);
    // agent.state 应该与 store.getState() 相同
    expect(store.getState()).toBe(agent.state); 
    unlisten();
  });

});
```

## MiddleWare

与`redux MiddleWare`系统稍有不同的是，`agent-reducer`的`MiddleWare`系统是作用于`agent`方法的。通过使用不同的`MiddleWare`，我们可以对方法返回值再加工或拦截（阻止最终的dispatch发生），也可以在运行过程中影响`agent`的生命周期，销毁或重建一个`agent`。`agent-reducer`包含了许多非常有用的`MiddleWare`供使用者直接使用，如：`MiddleWarePresets.takePromiseResolve`, `MiddleWarePresets.takeAssignable`... ，在后续的 api MiddleWares 中将会重点介绍。

MiddleWare是一种function，它们可以互相串联。前一个MiddleWare处理完的结果会传入下一个MiddleWare，直到所有MiddleWare都处理结束，最后得到的结果才会成为新的state。

MiddleWare的结构如下：
```typescript
const MiddleWare = <T>(runtime: Runtime<T>):NextProcess | void =>{
  // 当前function在方法调用前运行.

  // runtime 可用于控制'Agent'方法，这将在引导章节中详细介绍

  return (next: StateProcess):StateProcess => {
      // 当前function在当前方法返回后运行.

      // 'next' function 由串行中当前MiddleWare的后一个MiddleWare提供.
      
      return (result: any)=>{
        // 当前function在当前方法返回后运行.

        // 'result'是前一个MiddleWare处理完传入的结果, 
        // 如果没有前一个MiddleWare，'result'就是当前方法运行产生的结果 
        function doSomeThing(data:any):any{
          return data; //do some thing or not
        }

        // 对 'result' 进行再加工，然后通过 'next' function 传递给下一个MiddleWare
        return next(doSomeThing(result));
      };

  };

};
```
如果你希望了解如何串连`MiddleWares`，或是串行好的`MiddleWare`是如何工作的，[请参考引导章节中关于MiddleWare的说明](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/guides/about_middle_ware.md)。

[下一节，安装](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/introduction/installation.md)
