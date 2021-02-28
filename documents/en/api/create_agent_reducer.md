# createAgentReducer( originAgent, middleWareOrEnv, env )

This function is used for changing an `OriginAgent` model to an `AgentReducer` function, and using MiddleWares on it. If you are not familiar with the concept about `OriginAgent` and `AgentReducer`, you can take a look at the [concept](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/introduction/concept.md).

```typescript
function createAgentReducer<
  S,
  T extends OriginAgent<S> = OriginAgent<S>
>(
  originAgent: T | { new (): T },
  middleWareOrEnv?: (MiddleWare & { lifecycle?: boolean }) | Env,
  env?: Env
): AgentReducer<S, Action, T>
```

* originAgent - the model class or object.
* middleWareOrEnv - it is an optional param, if you want to use `MiddleWare`, it can be a `MiddleWare`, if you want to set running env without `MiddleWare`, it can be an env config.
* env - if you want to set both `MiddleWare` and running env, you can set an env config here.

Be careful, `LifecycleMiddleWare` can not work with this api directly, so, if you want to use `LifecycleMiddleWares.takeLatest`, you'd better set it with api [useMiddleWare](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/use_middle_ware.md) or [middleWare](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/middle_ware.md).

You can find how to config an env object [here](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/guides/about_env.md) and what is `MiddleWare` [here](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/guides/about_middle_ware.md). If you want to know how to make `AgentReducer` working with another reducer tool, please check it [here](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/guides/with_other_reducer_tools.md).

You can check example [here](https://github.com/filefoxper/agent-reducer/blob/master/test/en/api/createAgentReducer.spec.ts).

examples about how to use `createAgentReducer`:
```typescript
import {
    createAgentReducer, 
    middleWare, 
    MiddleWares, 
    OriginAgent
} from "agent-reducer";

describe('how to use createAgentReducer',()=>{

    /**
     * this is a simple count model (OriginAgent)
     */
    class CountAgent implements OriginAgent<number> {
        // it persist a number type state
        state = 0;

        constructor(state?:number) {
            this.state=state||0;
        }

        // you can write a arrow function method
        // the method returns a changed state
        increase = (): number => this.state + 1;

        // you can write a normal method too
        decrease(): number {
            return this.state - 1;
        }

        walk(increment: boolean): number {
            return increment ? this.increase() : this.decrease();
        }

        // the method params is instead of 'action' in reducer, this is freedom in 'agent-reducer'
        sum(...counts: number[]): number {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

        async sumRemoteValue(remoteValue:number){
            return this.sum(remoteValue);
        }

    }

    it('a basic usage',()=>{
        // createAgentReducer has a simple reducer processor inside.
        const {agent}=createAgentReducer(CountAgent);
        agent.increase();
        expect(agent.state).toBe(1);
    });

    it('input params into model by use model construct',()=>{
        // createAgentReducer has a simple reducer processor inside.
        // we can pass a model instance in, if we need some params for model.
        const {agent}=createAgentReducer(new CountAgent(1));
        agent.increase();
        expect(agent.state).toBe(2);
    });

    it('use MiddleWare directly on createAgentReducer',async ()=>{
        // createAgentReducer has a simple reducer processor inside.
        const {agent}=createAgentReducer(CountAgent,MiddleWares.takePromiseResolve());
        await agent.sumRemoteValue(2);
        expect(agent.state).toBe(2);
    });

    it('use env directly on createAgentReducer',async ()=>{
        // createAgentReducer has a simple reducer processor inside.
        const {agent}=createAgentReducer(CountAgent,{expired:true});
        await agent.increase();
        expect(agent.state).toBe(0);
    });

    it('use both MiddleWare and env directly on createAgentReducer',async ()=>{
        // createAgentReducer has a simple reducer processor inside.
        const {agent}=createAgentReducer(CountAgent,MiddleWares.takePromiseResolve(),{strict:false});
        await agent.sumRemoteValue(2);
        expect(agent.state).toBe(2);
    });

});
```
All what a `AgentReducer` function can provide have described clear in section [with other reducer tools](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/guides/with_other_reducer_tools.md), please check it in that section. 

Go back to [API Reference](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/index.md)