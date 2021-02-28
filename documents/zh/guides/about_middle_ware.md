# 关于 middleWare

`MiddleWare`是`agent-reducer`中一个非常重要的概念，如果你想要写出一个简单灵活易用的模型（`OriginAgent`），你会需要使用它的。我们之前曾在[概念](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/introduction/concept.md)中介绍过它，这里我们只重点介绍如何将多个`MiddleWare`串联成一个`MiddleWare`，并讨论`MiddleWare`是如何与`Agent`方法一起工作的。

 MiddleWare 结构如下:
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
## MiddleWares 的串联方式

我们通常使用 api `applyMiddleWares`来串联多个`MiddleWare`。

例子：
```typescript
import {
    MiddleWares,
    MiddleWarePresets,
    applyMiddleWares
} from 'agent-reducer';

const MiddleWare = applyMiddleWares(MiddleWarePresets.takeLatest(),MiddleWares.takeAssignable());
```
API 方法`applyMiddleWares`接收多个`MiddleWare`作为参数，然后使用闭包以及类似`redux`的`compose`方法将它们重新组合成一个全新的`MiddleWare`。这个全新`MiddleWare`的`next process`方法连接着`Agent`系统的`dispatch`方法。

这是一段简化的`applyMiddleWares`代码：
```typescript
import {
  Runtime,
  NextProcess,
  MiddleWare,
  LifecycleMiddleWare,
  LifecycleRuntime,
} from "./global.type";

// 每一个call function的返回函数是前一个call function的入参。
export function composeCallArray(calls: ((p: any) => any)[]) {
  const callList = [...calls].reverse();
  return function (p: any): any | void {
    return callList.reduce(
      (result: any, call: (p: any) => any) => call(result),
      p
    );
  };
}

export function defaultMiddleWare<T>(runtime: Runtime) {

  return function nextProcess(next: (result: any) => any) {

    return function stateProcess(result: any) {
      return next(result);
    };
  };
}

export function applyMiddleWares(
  ...middleWares: (MiddleWare | LifecycleMiddleWare)[]
) {
  // 检查是否用为空的 nextProcess function
  function isAllValidated(
    nextProcesses: Array<NextProcess | void>
  ): nextProcesses is Array<NextProcess> {
    return nextProcesses.every(
      (nextProcess): nextProcess is NextProcess => !!nextProcess
    );
  }

  // MiddleWares 会在 'finalMiddleWare' function 中进行处理
  const mdw = function finalMiddleWare<T>(runtime: Runtime<T>) { 
    // 将 MiddleWares map成 nextProcesses，
    // nextProcess 是 MiddleWare 返回的第一层 callback，
    // 用于第二层 callback stateProcess 的衔接
    const nextProcesses = middleWares
      .concat(defaultMiddleWare)
      .map((middleWare) => {
        return middleWare(runtime);
      });
    // 如果其中一个 nextProcess 为 undefined 或 null，
    // 当前 finalMiddleWare 就停止运行，
    // 可使用这一特性做方法拦截
    if (!isAllValidated(nextProcesses)) {
      return;
    }
    // 通过对 nextProcess 数组的 compose 操作，
    // 把 MiddleWares 连接起来，
    // 每个 nextProcess return返回函数（stateProcess）,
    // 作为前一个 nextProcess 的参数
    return composeCallArray(nextProcesses);
  };
  return mdw;
}
```
通过上面的代码，我们知道 `applyMiddleWares` 可以把每个 `MiddleWare` 返回的 `nextProcess` function 通过 `compose` 方法逐一连接起来。前一个 `MiddleWare nextProcess` 的入参数为后一个 `MiddleWare nextProcess` 返回的 `stateProcess` function。这种设计让每个 `MiddleWare` 只需要关注自己需要做出的 state 数据处理，并通过调函数的形式，把结果传给其他 `MiddleWare` 做另一种处理，方便通过函数组合完成一系列复杂操作。

那么，这个 `finalMiddleWare` 是如何与 `Agent` 的方法一起工作的呢？

## MiddleWare 是如何与 Agent 方法一起工作的

`Agent`对象的方法与其模型`OriginAgent`对象方法有很大的区别。当一个`Agent`对象方法运行时，它会先调用方法或当前`Agent`作用域上的`finalMiddleWare`，并为其产生的`nextProcess` function 传入`Agent`系统环境中的dispatch方法作为最终state的出口调用方法，然后运行`nextProcess`返回的`stateProcess` funtion，传入原始`OriginAgent`对象方法运行的返回值，开始逐个进行数据再加工。如果`finalMiddleWare`产生的`nextProcess`不是一个function，则会在原始`OriginAgent`对象方法运行前直接终止`Agent`方法。

以下为 `Agent` 对原始`OriginAgent`对象方法包装的简化代码：
```typescript
function caller(...args: any[]) {
    const { env } = invokeDependencies;
    let runtime = cache[type];
    if (runtime) {
      runtime.args = [...args];
      runtime.env = env;
    }
    // 使用系统生成的 runtime object 参数调用 finalMiddleWare，
    // 并生成一个 nextProcess function。
    // runtime object 包含了当前方法，当前方法的原型方法，当前方法入参，
    // 原始模型 `OriginAgent` 实例，`Agent` 对象，`Agent` 运行环境等参数。
    // 我们会在后续章节进行 runtime 介绍。
    const nextProcess = middleWare(runtime);
    // 如果返回的 nextProcess 不存在, 则终止本次运行。
    if (!nextProcess) {
      return;
    }
    // 在原始模型中对应的方法会提前被存入runtime.sourceCaller，
    // 并在这里被调用。
    const sourceCaller = runtime.sourceCaller;
    const nextState = sourceCaller.apply(entry, [...args]);
    // 将默认的dispatch方法作为最终的 stateProcess 出口传入 nextProcess
    const stateProcess = nextProcess(defaultStateResolver);
    // 调用 nextProcess 返回的 stateProcess function 接入初始数据，
    // 并开始数据再加工之旅
    const result = stateProcess(nextState);
    return result;
}
```
再我们了解 MiddleWare 配合`Agent`方法的工作原理后，我们可以总结出一些串行 MiddleWare 的规则，这可以让我们更简便的串行 MiddleWare。

## MiddleWare 串行规则

1 . 数据处理类 MiddleWare 之间应该按每个 MiddleWare 处理方案`stateProcess`的先后顺序来排列，排在前面的先处理，比如`MiddleWarePresets.takePromiseResolveAssignable`。

代码如下：
```typescript
applyMiddleWares(
    // promise 必须放在前面用于拦截 promise 返回值，
    // 在 promise resolve 之后，
    // 将 resolve 值通过 next 传递给后一个数据处理 MiddleWare
    MiddleWares.takePromiseResolve(),
    // 在拿到 promise resolve 值后，与当前 state 进行合并处理，
    // 如果直接用 promise 对象进行合并，那就没有意义了。
    MiddleWares.takeAssignable()
);
```
以上串行含义为：先由`MiddleWares.takePromiseResolve`的`stateProcess`处理promise对象，将promise resolve出的数据传递给`MiddleWares.takeAssignable`的`stateProcess`进行与当前 state 的合并处理。如果这两个 MiddleWare 对调一下，就变成了先让一个 promise 对象与当前 state 合并成一个类 promise 对象，然后将promise resolve出的数据作为最新的`Agent` state，那合并就没有意义了。

目前`agent-reducer`中的数据处理类 MiddleWare 只有`MiddleWares.takePromiseResolve`和`MiddleWares.takeAssignable`两种。我们已经帮您串行好了，可以直接使用 api `MiddleWarePresets.takePromiseResolveAssignable`。

2 . 方法控制类 MiddleWare 可以被连接在任何地方。通常我们会将它们放在最前面，表示一开始我们就启动了相应的方法控制，但你应该知道，它们的排列的位置其实无关紧要。在`agent-reducer`中，目前除了上述两个数据处理 MiddleWare ，剩下的 MiddleWare 都是方法控制类型的 MiddleWare。 

3 . `LifecycleMiddleWares.takeLatest`是一种非常特殊的 MiddleWare，它是唯一一款可以控制`Agent`生命周期的 MiddleWare 。但在`agent-reducer`中，只有`Agent`复制对象才允许以 MiddleWare 的形式进行生命周期控制，所以这个 MiddleWare 不能直接用在 API `createAgentReducer`上。如果需要使用这个 MiddleWare ，只能通过 API 接口 `middleWare` 或 `useMiddleWare`来实现。

现在让我们已经了解了足够多的 MiddleWare 知识，让我们实现一个简单的数据处理 MiddleWare。

源码位置：[middleWare.spec.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/guides/middleWare.spec.ts).

```typescript
import {
    applyMiddleWares,
    createAgentReducer,
    MiddleWares,
    NextProcess,
    OriginAgent,
    Runtime,
    StateProcess
} from "../../../src";

type State={
    [key:string]:any
}

describe('实现一个数据处理类 MiddleWare',()=>{

    class NoVoidModel implements OriginAgent<State>{

        state={
            title:'no void values'
        };

        setAny(key:string,value?:any):State{
            return {[key]:value};
        }

    }

    it("如果我们通过方法设置了一个 value 为 undefined 的数据，那state中将包含{key:undefined}",()=>{
        // 使用 takeAssignable MiddleWare，
        // 让 return 数据与当前 state 合并起来
        const {agent}=createAgentReducer(NoVoidModel,MiddleWares.takeAssignable());
        agent.setAny('key');
        expect('key' in agent.state).toBe(true);
    });

    it("实现一个自定义 MiddleWare 用来清除值为 undefined 的键值对",()=>{

        const noVoidMiddleWare=(runtime:Runtime):NextProcess=>{

            function isObject(data: any) {
                return data && Object.prototype.toString.apply(data) === "[object Object]";
            }

            return (nextProcess:StateProcess):StateProcess=>{

                return (result:any)=>{
                    // 从 runtime 的 target 中获取当前state数据
                    const state=runtime.target.state;
                    // 如果当前 state 或 result 不是一个 object，
                    // 则跳过当前 MiddleWare 数据处理过程
                    if(!isObject(result)||!isObject(state)){
                        return nextProcess(result);
                    }
                    const entries=Object.entries(result);
                    // 选取键值非空的键值对组成新的 object 数据
                    const data=[...entries].reduce((r:any,[k,v]:[string,any])=>{
                        return v===undefined||v===null?r:{...r,[k]:v};
                    },{});
                    // 将处理好的数据传递给下一个 MiddleWare 数据处理器
                    return nextProcess(data);
                }

            }

        }

        // 使用 takeAssignable MiddleWare，进行与当前 state 的合并处理，
        // 然后使用自定义 MiddleWare，取出value为空的键值对，
        // 我们把去除value为空的键值对的自定义 MiddleWare 安排在后面，
        // 这样即便当前 state 中已经包含了value为空的键值对，也能在最终位置去掉
        const {agent}=createAgentReducer(NoVoidModel,applyMiddleWares(MiddleWares.takeAssignable(),noVoidMiddleWare));
        agent.setAny('key');
        expect('key' in agent.state).toBe(false);
    });

})
```
如果你关注 MiddleWare 中的 `runtime` 对象已久，请看[下一节](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/guides/about_runtime.md)。