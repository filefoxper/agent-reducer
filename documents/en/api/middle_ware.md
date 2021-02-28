# middleWare( callOrMiddleWare, mdw )

This function can add a MiddleWare onto an `Agent` method. So, when you call a method which used api middleWare before, its own MiddleWare features should override MiddleWare features from `Agent` object (like MiddleWare added by api `createAgentReducer` or api `useMiddleWare`). From version `agent-reducer@3.2.0`, api `useMiddleWare` will take a more higher overriding prior level than `middleWare`, you can set `env.nextExperience` true for a prev experience.

```typescript
type MiddleWareAbleFunction = ((...args: any[]) => any) & {
  middleWare?: MiddleWare;
};

function middleWare (
  callOrMiddleWare: MiddleWare | MiddleWareAbleFunction,
  mdw?: MiddleWare | MiddleWareAbleFunction
):MiddleWareAbleFunction
```
* callOrMiddleWare - If it is an `Agent` method, you should add the second param `mdw` (MiddleWare). If it is a MiddleWare, do not add the second param, it returns a currying function for es6 decorator.
* mdw - It is an optional param, when the first param is an `Agent` method, you can add MiddleWare here.

for [example](https://github.com/filefoxper/agent-reducer/blob/master/test/en/api/middleWare.spec.ts):
```typescript
import {
    createAgentReducer, middleWare,
    MiddleWarePresets,
    MiddleWares,
    OriginAgent,
    useMiddleWare
} from "agent-reducer";

type State = {
    id: number,
    name?: string
}

describe('how to use api middleWare', () => {

    class MiddleWareModel implements OriginAgent<State> {

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
        const {agent} = createAgentReducer(MiddleWareModel, MiddleWares.takePromiseResolve());
        await agent.changeByPromiseResolveAssignable('name');
        expect(agent.state).toEqual({id: 0, name: 'name'});
    });

    it("MiddleWare from api 'middleWare' adding in constructor will override the decorator one", async () => {
        const {agent} = createAgentReducer(MiddleWareModel, MiddleWares.takePromiseResolve());
        // MiddleWare added by api 'middleWare' in constructor,
        // only process a promise resolve data to be next state,
        // and it override the MiddleWare added by api 'middleWare' on es6 decorator,
        // so, the assignable feature can not be added in.
        await agent.changeByPromiseResolve('name');
        expect(agent.state).toEqual({name: 'name'});
        expect(agent.state.id).toBeUndefined();
    });

    it("MiddleWare from api 'middleWare' will override MiddleWare from api 'useMiddleWare' in current version", async () => {
        const {agent} = createAgentReducer(MiddleWareModel, MiddleWares.takePromiseResolve());
        const branch = useMiddleWare(agent, MiddleWarePresets.takePromiseResolveAssignable());
        await branch.changeByPromiseResolve('name');
        expect(agent.state).toEqual({name: 'name'});
        expect(agent.state.id).toBeUndefined();
    });

    it("MiddleWare from api 'useMiddleWare' will override MiddleWare from api 'middleWare' in next version: 3.2.0", async () => {
        const {agent} = createAgentReducer(MiddleWareModel, MiddleWares.takePromiseResolve(), {nextExperience: true});
        const branch = useMiddleWare(agent, MiddleWarePresets.takePromiseResolveAssignable());
        await branch.changeByPromiseResolve('name');
        expect(agent.state).toEqual({id: 0, name: 'name'});
    });

});
```

Go back to [API Reference](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/index.md)