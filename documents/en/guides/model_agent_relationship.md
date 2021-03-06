# Relationship of Agent and OriginAgent

`OriginAgent` is an action model, it provides state and methods for simulating a reducer function. `Agent` is a proxy object of `OriginAgent`, it can be generated from `OriginAgent` by using API createAgentReducer. The model instance and its `Agent` object shares a same state. 

Before `agent-reducer@3.2.0`, state updating between `Agent` objects from the same model instance is not synchronous, that may cause problems if you are sharing one model instance between some different `Agent` objects. Now, the state updating between `Agent` objects from same model instance is synchronous. If you call a method from one `Agent` object, and change its state, other `Agent` objects from the same model instance will update state too. 

You can check code in [state.sync.spec.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/en/guides/state.sync.spec.ts).

```typescript
import {Action, createAgentReducer, OriginAgent, Reducer} from "agent-reducer";

describe("state updating between different Agents with same model instance", () => {

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

    class Model implements OriginAgent<number> {

        state = 0;

        increase() {
            return this.state + 1;
        }

    }

    const model = new Model();

    it("Agents from same model instance update state synchronously", () => {
        const reducer1 = createAgentReducer(model, {updateBy: 'manual'});
        const {agent: agent1, update: update1} = reducer1;
        // create first store
        const store1 = createStore(reducer1, agent1.state);
        store1.subscribe(() => {
            update1(store1.getState(), store1.dispatch);
        });

        const reducer2 = createAgentReducer(model, {updateBy: 'manual'});
        const {agent: agent2, update: update2} = reducer2;
        // create second store
        const store2 = createStore(reducer2, agent2.state);
        store2.subscribe(() => {
            update2(store2.getState(), store2.dispatch);
        });

        // just invoke first agent
        agent1.increase();
        expect(agent1.state).toBe(store1.getState());
        // agent1 and agent2 shares state,
        // for they have a same model instance
        expect(agent2.state).toBe(agent1.state);
        // though we did not dispatch any thing to store2,
        // but agent2 can listen its brothers changing,
        // and dispatch the changing state to store2
        expect(agent2.state).toBe(store2.getState());
    });

});
```
Go to [next section](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/guides/not_recommend.md), and know some bad design in `agent-reducer` which are not recommend to use.
