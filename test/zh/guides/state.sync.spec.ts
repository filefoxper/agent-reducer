import {Action, createAgentReducer, OriginAgent, Reducer} from "../../../src";

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