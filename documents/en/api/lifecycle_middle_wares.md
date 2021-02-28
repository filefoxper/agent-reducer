# LifecycleMiddleWares

LifecycleMiddleWares is a class which only contains one static MiddleWare `takeLatest`.

## LifecycleMiddleWares.takeLatest

It is a MiddleWare which only takes the newest changing of `Agent` state. If a state change from an early method trigger is always prevented by this MiddleWare.

Infact, this MiddleWare kills an `Agent` object after a state change happening, and rebuild a new `Agent` object to replace the older one. It can only happen on an copy object of `Agent`, this is why a `LifecycleMiddleWare` can not be added to api `createAgentReducer` directly.
```typescript
class LifecycleMiddleWares {
    static takeLatest(): LifecycleMiddleWare
}
```
See example [here](https://github.com/filefoxper/agent-reducer/blob/master/test/en/api/lifecycleMiddleWares.spec.ts).

```typescript
import {
    applyMiddleWares,
    createAgentReducer,
    LifecycleMiddleWares,
    MiddleWares,
    OriginAgent,
    useMiddleWare
} from "agent-reducer";

type User = {
    id?: number,
    name?: string
}

class UserModel implements OriginAgent<User> {

    state: User = {id: 0};

    async fetchUser(version: number, delay: number) {
        await new Promise((r) => setTimeout(r, delay));
        return {id: version, name: 'name_' + version};
    }

}

describe("how to use LifecycleMiddleWares.takeLatest", () => {

    it("without this MiddleWare, the latest state change may be override by an early one", async () => {
        const {agent} = createAgentReducer(UserModel, MiddleWares.takePromiseResolve());
        const promise1 = agent.fetchUser(1, 200);
        const promise2 = agent.fetchUser(2, 100);
        await Promise.all([promise1, promise2]);
        // state change override happens
        expect(agent.state.id).toBe(1);
    });

    it("You can use it on method which you want to guarantee the state change orders by method calling", async () => {
        const {agent} = createAgentReducer(UserModel);
        const copy = useMiddleWare(agent, applyMiddleWares(
            LifecycleMiddleWares.takeLatest(),
            MiddleWares.takePromiseResolve()
        ));
        const promise1 = copy.fetchUser(1, 200);
        const promise2 = copy.fetchUser(2, 100);
        await Promise.all([promise1, promise2]);
        // state change override will not happen again
        expect(agent.state.id).toBe(2);
    });

});
```
Go back to [API Reference](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/index.md)