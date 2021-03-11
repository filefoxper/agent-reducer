# Agent 与 OriginAgent 的关系

作为模型 `OriginAgent` 管理着一个可持续维护的 state 和修改 state 的方法群，我们可以把它当作 reducer function 的语法糖。`Agent` 是模型 `OriginAgent` 的代理对象，也是我们调用方法修改 state 的接口对象，通过使用 API createAgentReducer 就能轻松将一个模型 `OriginAgent` 印射成一个 `Agent` 代理。模型 `OriginAgent` 实例对象与 `Agent` 代理共享同一个 state。

在 `agent-reducer@3.2.0` 之前，多个模型实例对象相同的 `Agent` 代理之间并不能做到 state 更新同步，即便它们的 state 值是确实相等的。但从现在开始，如果多个 `Agent` 代理共享同一个模型实例，只要其中一个 `Agent` 代理修改了 state ，其兄弟 `Agent` 代理对象都会响应并同步 state 更新。

单元测试源码 [state.sync.spec.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/guides/state.sync.spec.ts).

```typescript
import {Action, createAgentReducer, OriginAgent, Reducer} from "agent-reducer";

describe("同对象模型的 state 同步", () => {

    // 模拟一个简单的 redux
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

    it("以相同对象模型为基础的 agent state 变更能相互同步", () => {
        const reducer1 = createAgentReducer(model, {updateBy: 'manual'});
        const {agent: agent1, update: update1} = reducer1;
        // 创建 store1
        const store1 = createStore(reducer1, agent1.state);
        store1.subscribe(() => {
            update1(store1.getState(), store1.dispatch);
        });

        const reducer2 = createAgentReducer(model, {updateBy: 'manual'});
        const {agent: agent2, update: update2} = reducer2;
        // 创建 store2
        const store2 = createStore(reducer2, agent2.state);
        store2.subscribe(() => {
            update2(store2.getState(), store2.dispatch);
        });

        // 调用 agent1 的方法用于改变 store1 的 state
        agent1.increase();
        expect(agent1.state).toBe(store1.getState());
        // agent1 和 agent2 有一个公共的 object 模型，
        // 它们的 state 也是共享的
        expect(agent2.state).toBe(agent1.state);
        // 共享 object 模型的 Agent 对象，其 state 更新是同步的
        expect(agent2.state).toBe(store2.getState());
    });

});
```
[下一节](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/guides/not_recommend.md)， `agent-reducer` 不推荐使用的接口。
