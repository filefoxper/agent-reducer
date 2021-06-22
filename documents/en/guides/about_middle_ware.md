# about middleWare

`MiddleWare` is a important concept in `agent-reducer`, if you want to write a more flexible model (`OriginAgent`), you will need it. For we have introduced what `MiddleWares` can do in [concept](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/introduction/concept.md), at this section, we will just introduce how to chain `MiddleWares` together, and how `MiddleWare` works with an `Agent` method.

 MiddleWare structure looks like:
```typescript
const MiddleWare = <T>(runtime: Runtime<T>):NextProcess | void =>{
  // this function is called before current method calls.

  // runtime object will be needed,
  // when we want to control the method which is called now.

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
## how MiddleWares chain together

We can use api `applyMiddleWares` to chain `MiddleWares` together.

example:
```typescript
import {
    MiddleWares,
    MiddleWarePresets,
    applyMiddleWares
} from 'agent-reducer';

const MiddleWare = applyMiddleWares(MiddleWarePresets.takeLatest(),MiddleWares.takeAssignable());
```
The api function `applyMiddleWares` accept `MiddleWares` as params, and then rebuild them to be a new `MiddleWare`. It uses a `compose` function to do this, just like what `redux` doing to its MiddleWares. The next state process callback function of the final `MiddleWare` is a dispatch function, which dispatch a final result to your `reducer` system. 

Have a look at the simplified code of `applyMiddleWares`.
```typescript
import {
  Runtime,
  NextProcess,
  MiddleWare,
  LifecycleMiddleWare,
  LifecycleRuntime,
} from "./global.type";

// every call function returns is the only param of its previous call function
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
  // check if there is a void nextProcess
  function isAllValidated(
    nextProcesses: Array<NextProcess | void>
  ): nextProcesses is Array<NextProcess> {
    return nextProcesses.every(
      (nextProcess): nextProcess is NextProcess => !!nextProcess
    );
  }

  // MiddleWares will be processed in 'finalMiddleWare'.
  const mdw = function finalMiddleWare<T>(runtime: Runtime<T>) {
    // when 'finalMiddleWare' is running, 
    // middleWares map to nextProcesses.
    const nextProcesses = middleWares
      .concat(defaultMiddleWare)
      .map((middleWare) => {
        return middleWare(runtime);
      });
    // if one of nextProcesses is undefined or null, 
    // finalMiddleWare stop running
    if (!isAllValidated(nextProcesses)) {
      return;
    }
    // compose nextProcesses, chain middleWares together, 
    // every nextProcess returns (stateProcess),
    // is a param of its previous nextProcess
    return composeCallArray(nextProcesses);
  };
  return mdw;
}
```
Now, we know api `applyMiddleWares` generates `nextProcess` functions from `MiddleWares`, when the `finalMiddleWare` starts running, `nextProcess` functions are chained together as a final `nextProcess` function by compose. That means every source `stateProcess` from a `MiddleWare` will be a param for its previous `nextProcess`. This design makes every `MiddleWare` just do its own process about `state`, and we can compose different `MiddleWares` for multiplicate features.

So, how the `finalMiddleWare` works with `Agent` method?

## how MiddleWare works with Agent method

The `Agent` method is different with `OriginAgent` method. When a method from `Agent` object starts running, it calls the `finalMiddleWare` first, event you have not set any `MiddleWares`. The `finalMiddleWare` generates a composed `nextProcess` function or empty (undefined or null). If the `nextProcess` function is empty, method stops running, otherwise, it calls its origin method from `OriginAgent`, and then starts the `nextProcess` function with a `dispatch` function param to generate a `stateProcess` function. Finally, the data `returned` by `OriginAgent` method is passed into the `stateProcess` function for a state reproducing, and `dispatching`.

Have a look at the simplified code of `Agent` method:
```typescript
function caller(...args: any[]) {
    const { env } = invokeDependencies;
    let runtime = cache[type];
    if (runtime) {
      runtime.args = [...args];
      runtime.env = env;
    }
    // call a finalMiddleWare with runtime object,
    // and generate a nextProcess function
    const nextProcess = middleWare(runtime);
    // if nextProcess is not a function, stop running.
    if (!nextProcess) {
      return;
    }
    // the `OriginAgent` method can be picked out from runtime object.
    const sourceCaller = runtime.sourceCaller;
    // call `OriginAgent` method on class instance
    const nextState = sourceCaller.apply(entry, [...args]);
    // call nextProcess function with a dispatch function param.
    const stateProcess = nextProcess(defaultStateResolver);
    // call stateProcess function to reproduce state
    const result = stateProcess(nextState);
    return result;
}
```
As we have knew about how `MiddleWares` chaining together and how `MiddleWare` working with `Agent` method, we can chain `MiddleWares` to a useful `finalMiddleWare` better.

## rules about chaining MiddleWares

1 . State processing MiddleWares should be chained by `stateProcess` orders. Let us take an example `MiddleWarePresets.takePromiseResolveAssignable`.

Code of `MiddleWarePresets.takePromiseResolveAssignable`: 
```typescript
applyMiddleWares(
    // process promise first, and pass what promise resolves out to nextProcess
    MiddleWares.takePromiseResolve(),
    // merge with current state
    MiddleWares.takeAssignable()
);
```
The code above describe: `stateProcess` of `MiddleWares.takePromiseResolve` processes promise from `OriginAgent` method returns first, and the promise resolving data will be passed into its nextProcess function, the `stateProcess` of `MiddleWares.takeAssignable`, then the data will merge with the current state of `Agent` object to be a next state. (`MiddleWares.takeAssignable` processes state by using `Object.assign({},state,data)`)

If the order is `MiddleWares.takeAssignable` first, then `MiddleWares.takePromiseResolve`, when a promise comes, it merges with the current state first, then wait for this promiseLike state resolving, and takes the final data. It leads bugs here.

Current state processing MiddleWares in `agent-reducer` system are `MiddleWares.takePromiseResolve` and `MiddleWares.takeAssignable`. We have chain them for you as `MiddleWarePresets.takePromiseResolveAssignable`, you can use it directly. But, if you want to write State processing MiddleWares yourself, and use them with or without our current State processing MiddleWares, you should know about the order.

2 . Method control MiddleWares should be chained before lifecycle control MiddleWares and state processing MiddleWares. The current MiddleWares except state processing MiddleWares and lifecycle control MiddleWares, are all method control MiddleWares.

3 . `LifecycleMiddleWares.takeLatest` is a method control MiddleWare, but it is also a lifecycle control MiddleWare. It is a little different with other method control MiddleWare, the `finalMiddleWare` can not be used directly as a param for api `createAgentReducer`.

The order we recommended to chain these three MiddleWares is: 

```
method control MiddleWares => lifecycle control MiddleWare => state processing MiddleWare
```

for example:

```
applyMiddleWare(MiddleWares.takeDebounce(200), LifecycleMiddleWares.takeLatest(), MiddleWares.takePromiseResolve())
```

you can consider it like:

```
const deb = MiddleWares.takeDebounce(200);
const latest = LifecycleMiddleWares.takeLatest();
const promiseResolve = MiddleWares.takePromiseResolve();
const middleWare = deb(takelatest(promiseResolve))(source);
```

Now, you know a lot about MiddleWare, let us write a state processing MiddleWare.

You can check code in [middleWare.spec.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/en/guides/middleWare.spec.ts).

```typescript
import {
    applyMiddleWares,
    createAgentReducer,
    MiddleWares,
    NextProcess,
    OriginAgent,
    Runtime,
    StateProcess
} from "agent-reducer";

type State={
    [key:string]:any
}

describe('write a state processing MiddleWare',()=>{

    class NoVoidModel implements OriginAgent<State>{

        state={
            title:'no void values'
        };

        setAny(key:string,value?:any):State{
            return {[key]:value};
        }

    }

    it("If we put a undefined as param value, state will contain {key:undefined}",()=>{
        // use takeAssignable MiddleWare,
        // make returns assign with current state
        const {agent}=createAgentReducer(NoVoidModel,MiddleWares.takeAssignable());
        agent.setAny('key');
        expect('key' in agent.state).toBe(true);
    });

    it("Write a custom MiddleWare to clean the 'undefined' value item",()=>{

        const noVoidMiddleWare=(runtime:Runtime):NextProcess=>{

            function isObject(data: any) {
                return data && Object.prototype.toString.apply(data) === "[object Object]";
            }

            return (nextProcess:StateProcess):StateProcess=>{

                return (result:any)=>{
                    // get current state from runtime target
                    const state=runtime.target.state;
                    // if current state or result is not an object, pass it to next stateProcess
                    if(!isObject(result)||!isObject(state)){
                        return nextProcess(result);
                    }
                    const entries=Object.entries(result);
                    // pick properties which has a not empty value to a new object
                    const data=[...entries].reduce((r:any,[k,v]:[string,any])=>{
                        return v===undefined||v===null?r:{...r,[k]:v};
                    },{});
                    // pass processed data to next stateProcess
                    return nextProcess(data);
                }

            }

        }

        // use takeAssignable MiddleWare to make returns assign with current state.
        // then use a custom MiddleWare to clear empty key-values.
        // we put the custom one after the takeAssignable MiddleWare.
        // for doing so, even there are empty key-values in current state, 
        // it can work well too.
        const {agent}=createAgentReducer(NoVoidModel,applyMiddleWares(MiddleWares.takeAssignable(),noVoidMiddleWare));
        agent.setAny('key');
        expect('key' in agent.state).toBe(false);
    });

})
```
If you have paid attention to `runtime` in MiddleWare, please see [next section](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/guides/about_runtime.md).