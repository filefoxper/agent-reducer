# about MiddleWare override

There are three api functions for you to set MiddleWares.

1. `createAgentReducer`, it is a basic api in `agent-reducer`, you can set MiddleWares like: `createAgentReducer( OriginAgent, MiddleWare )`.
2. `useMiddleWare`, this api will copy an `Agent` object, and override MiddleWares of `Agent` object on the copy one. It is used like: `useMiddleWare( Agent, MiddleWare )`.
3. `middleWare`, it can add MiddleWare directly on an `OriginAgent` method, and when the `Agent` method is called, it can uses this MiddleWare on its origin one. These MiddleWares will override MiddleWares which are added by `createAgentReducer` or `useMiddleWare`.

Attention: MiddleWares added by api `middleWare` has a highest running prior level in this version, but it is not reasonable, and we will change the running prior level between `useMiddleWare` and `middleWare` at version 3.2.0. You can set `env.nextExperience` to be `true` for experience.

You can check code in [middleWare.override.spec.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/en/guides/middleWare.override.spec.ts).

example:
```typescript
import {
    OriginAgent,
    createAgentReducer,
    middleWare,
    MiddleWarePresets,
    MiddleWares,
    useMiddleWare
} from "agent-reducer";

type State = {
    id: number,
    name?: string
}

describe('use different middleWare api', () => {


    class MiddleWareOverrideModel implements OriginAgent<State> {

        state: State;

        constructor() {
            this.state = {id: 0};
            // if your develop environment does not support es6 decorator,
            // you can use api 'middleWare' like this.
            // If you have add MiddleWare with es6 decorator: '@middleWare(MiddleWare)',
            // it will override the es6 decorator one.
            middleWare(this.changeByPromiseResolve, MiddleWarePresets.takePromiseResolve());
        }

        //it will be override by the constructor MiddleWare addition.
        @middleWare(MiddleWarePresets.takePromiseResolveAssignable())
        async changeByPromiseResolve(name: string) {
            return {name};
        }

        // you can use api 'middleWare' with es6 decorator
        @middleWare(MiddleWarePresets.takePromiseResolveAssignable())
        async changeByPromiseResolveAssignable(name: string) {
            return {name};
        }

        // use MiddleWare by api 'createAgentReducer'
        async changeAsync(name: string) {
            return {name};
        }

    }

    it("MiddleWare from api 'middleWare' will override MiddleWare from api 'createAgentReducer'", async () => {
        const {agent} = createAgentReducer(MiddleWareOverrideModel, MiddleWares.takePromiseResolve());
        await agent.changeByPromiseResolveAssignable('name');
        expect(agent.state).toEqual({id: 0, name: 'name'});
    });

    it("MiddleWare from api 'middleWare' adding in constructor will override the decorator one", async () => {
        const {agent} = createAgentReducer(MiddleWareOverrideModel, MiddleWares.takePromiseResolve());
        // MiddleWare added by api 'middleWare' in constructor,
        // only process a promise resolve data to be next state,
        // and it override the MiddleWare added by api 'middleWare' on es6 decorator,
        // so, the assignable feature can not be added in.
        await agent.changeByPromiseResolve('name');
        expect(agent.state).toEqual({name: 'name'});
        expect(agent.state.id).toBeUndefined();
    });

    it("MiddleWare from api 'useMiddleWare' will override MiddleWare from api 'createAgentReducer'", async () => {
        const {agent} = createAgentReducer(MiddleWareOverrideModel, MiddleWares.takePromiseResolve());
        const branch = useMiddleWare(agent, MiddleWarePresets.takePromiseResolveAssignable());
        await branch.changeAsync('name');
        expect(agent.state).toEqual({id: 0, name: 'name'});
    });

    it("MiddleWare from api 'middleWare' will override MiddleWare from api 'useMiddleWare' in current version", async () => {
        const {agent} = createAgentReducer(MiddleWareOverrideModel, MiddleWares.takePromiseResolve());
        const branch = useMiddleWare(agent, MiddleWarePresets.takePromiseResolveAssignable());
        await branch.changeByPromiseResolve('name');
        expect(agent.state).toEqual({name: 'name'});
        expect(agent.state.id).toBeUndefined();
    });

    it("MiddleWare from api 'useMiddleWare' will override MiddleWare from api 'middleWare' in next version: 3.2.0", async () => {
        const {agent} = createAgentReducer(MiddleWareOverrideModel, MiddleWares.takePromiseResolve(), {nextExperience: true});
        const branch = useMiddleWare(agent, MiddleWarePresets.takePromiseResolveAssignable());
        await branch.changeByPromiseResolve('name');
        expect(agent.state).toEqual({id: 0, name: 'name'});
    });

});
```

There is no more knowledge about MiddleWare system. If you are interested in how to use `agent-reducer` with other reducer tools, like `redux`, please take [next section](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/guides/with_other_reducer_tools.md)