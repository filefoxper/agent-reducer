# 接入其他 reducer 工具

作为一个独立度很高的库，我们需要把`agent-reducer`接入其他 reducer 工具，才能发挥它的最大作用。我们需要通过使用`AgentReducer` function 的属性方法 `update`。

如果你了解想要接入 reducer 工具更新 state 的时机，你会发现，这并并非一件困难的工作。

为了体验如何将`agent-reducer`接入其他 reducer 工具，我们封装了一个简易的`redux`工具。

```typescript
import {Action, createAgentReducer, OriginAgent, Reducer} from "../../../src";

describe("接入其他 reducer 工具", () => {
    //模拟一个简单的 redux
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

    class CountAgent implements OriginAgent<number> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step = (isUp: boolean) => (isUp ? this.stepUp() : this.stepDown());

        sum = (...counts: number[]): number => {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

    }

    test("使用 update function 更新 redux 的 state 和 dispatch function", () => {
        // 创建一个 'AgentReducer' function，并将 env.updateBy 设置为 'manual'，
        // 这时 'agent-reducer' 会停止使用内部自带的 reducer 更迭系统，
        // 并由简易版 'redux' 驱动更新
        const reducer = createAgentReducer(CountAgent, { updateBy: "manual" });
        // 'AgentReducer' function 是一个 reducer function，
        // 它可以很容易地在一个 reducer 系统中使用起来。
        const store = createStore(reducer, 1);
        const { agent, update } = reducer;
        // 使用 store.subscribe 监听 'redux' 更新
        const unListen = store.subscribe(() => {
            // 当 'redux' 运行 'AgentReducer'时，
            // 我们可以通过store.getState获取最新数据进行更新
            update(store.getState(), store.dispatch);
        });
        
        agent.stepUp();
        
        expect(agent.state).toBe(2);
        // 更新完后，redux中的 state 与 agent.state 保持一致
        expect(store.getState()).toBe(agent.state);
        unListen();
    });

});
```

单元测试源码位置：[withOtherReducerTools.spec.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/guides/withOtherReducerTools.spec.ts).

目前，我们已经了解了运行环境`env` 中的 `nextExperience` 和 `updateBy` 属性，[下一节](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/guides/about_env.md)我们将重点研究一下`env`运行环境配置。