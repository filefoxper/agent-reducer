# about runtime

A MiddleWare function can receive a `runtime` object as a param. It contains all you need to reproduce a next state or control the method actions.

A runtime object:
```typescript
// running env of 'Agent' object
export interface Env {
  updateBy?: "manual" | "auto";
  expired?: boolean;
  strict?: boolean;
  legacy?: boolean;
  nextExperience?:boolean;
}

export type Caller = (...args: any[]) => any;

export type Runtime<T = any> = {
  caller: Caller;           // current running 'Agent' method
  sourceCaller: Caller;     // curren 'OriginAgent' method
  callerName: keyof T;      // current running 'Agent' method name
  args?: any[];             // arguments of current running 'Agent' method
  target: T;                // 'Agent' object
  source: T;                // 'OriginAgent' model object
  env: Env;                 // running env of 'Agent' object
  // cache object for middleWare storing temporary data
  cache: { [key: string]: any };
  // rollbacks is for 'agent-reducer' system, do not modify it.
  rollbacks:{[key in keyof T]?:T[key]};
  // mapSourceProperty is for changing 'OriginAgent' property temporary
  mapSourceProperty:(key:keyof T,callback:(value:any,instance:T,runtime:Runtime<T>)=>any)=>Runtime<T>;
  // rollback is for rollbacking data,
  // which are changed by mapSourceProperty in 'OriginAgent'
  rollback:()=>Runtime<T>;
  // tempCaller is for 'agent-reducer' system, do not modify it.
  tempCaller?: Caller;
};
```
We wrote a custom MiddleWare in [last section](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/guides/about_middle_ware.md), and extract the current state of `Agent` object from `runtime.target.state`. Now, we will use other properties of runtime to do more.

Let us write a MiddleWare to support [immer.js](https://github.com/immerjs/immer) in our method. You can check code in [runtime.spec.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/en/guides/runtime.spec.ts).

```typescript
import {
    createAgentReducer,
    isAgent,
    OriginAgent,
    Runtime,
    StateProcess
} from "agent-reducer";
import produce from "immer";

type State={
    name:string
}

describe('support immer.js in agent-reducer',()=>{

    class ImmerModel implements OriginAgent<State>{

        state={name:''};

        changeName(name:string){
            this.state.name=name;
        }

    }

    it("When we call method 'changeName' directly from 'Agent' object, we can get a undefined as next state",()=>{
        const {agent}=createAgentReducer(ImmerModel);
        agent.changeName('name');
        expect(agent.state).toBeUndefined();
    });

    it('Write a immerMiddleWare to make it works with immer.js',()=>{
        // attention：produce function of immer.js api can not process an async function,
        // so we can not use 'immutableMiddleWare' with 'MiddleWares.takePromiseResolve'.
        const immutableMiddleWare = (runtime: Runtime) => {
            const { target, callerName } = runtime;
            // check if target is an Agent object, if not return it.
            if (!isAgent(target)) {
                throw new Error("immutableMiddleWare should work with an agent object");
            }
            // when 'Agent' method is called,
            // we use runtime.mapSourceProperty to change 'OriginAgent' method to be a immer support function temporary.
            runtime.mapSourceProperty(
                callerName,
                (caller: (...args: any[]) => any, instance: any, runtime: Runtime) => {
                    // return a function which wraps 'OriginAgent' method be a immer support function.
                    return function (...args: any[]) {
                        const result = produce(instance.state, (draft: any) => {
                            // use mapSourceProperty again to make 'OriginAgent' state to be a immer draft temporary.
                            // so when we are using this.state, this.state will be a immer draft object.
                            runtime.mapSourceProperty("state", () => draft);
                            // at last do not forget to call the current 'OriginAgent' method.
                            return caller.apply(instance, [...args]);
                        });
                        // after immer has produced, we should rollback what we changed temporary by using mapSourceProperty.
                        runtime.rollback();
                        // do not forget return what we get by using immer.js
                        return result;
                    };
                }
            );
            // after this function end, 'OriginAgent' method will be called.
            return (next: StateProcess) => {
                return (result: any) => {
                    return next(result);
                };
            };
        };
        const { agent } = createAgentReducer(
            ImmerModel,immutableMiddleWare
        );
        agent.changeName("name");
        expect(agent.state.name).toBe("name");
    });

})
```
You can have a look at [the code of other MiddleWares in system](https://github.com/filefoxper/agent-reducer/blob/master/src/libs/middleWares.ts).

MiddleWares have three different api usages, and they will override each other if you are using all of them. Please check [next section](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/guides/about_middle_ware_override.md) to learn it. 