import {Action, createAgentReducer, OriginAgent, Reducer} from "../../../src";

describe("尝试配置env", () => {
    // 模拟一个简易 redux
    function createStore<S>(reducer: Reducer<S, Action>, initialState: S) {
        let listener: undefined | (() => any) = undefined;
        let state = initialState;
        return {
            dispatch(action: Action) {
                // 人为造成一个延迟更新
                Promise.resolve().then(() => {
                    state = reducer(state, action);
                    if (listener) {
                        listener();
                    }
                });
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

    class CountAgent implements OriginAgent<number | undefined> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean){
            return isUp ? this.stepUp() : this.stepDown();
        }

        sum = (...counts: number[]): number => {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

    }

    test("updateBy 设置为 'manual', 'agent-reducer' 可以接入一个外部 reducer 工具", async () => {
        // 创建一个 'AgentReducer' function，并将 env.updateBy 设置为 'manual'，
        // 这时 'agent-reducer' 会停止使用内部自带的 reducer 更迭系统，
        // 并由简易版 'redux' 驱动更新
        const reducer = createAgentReducer(CountAgent, {updateBy: "manual"});

        const store = createStore(reducer, 1);
        const {agent, update} = reducer;

        const unListen = store.subscribe(() => {
            update(store.getState(), store.dispatch);
        });
        // 修改 state
        agent.stepUp();
        // 因为 redux 更新的人工延迟，agent.state没有更新，它在等待 redux 的更新通知
        expect(agent.state).toBe(2)
        expect(store.getState()).toBe(1);
        // 外部造成一个小延迟
        await Promise.resolve();
        // state 随 redux 更新
        expect(agent.state).toBe(2);
        expect(store.getState()).toBe(agent.state);
        unListen();
    });

    it("设置 strict 为 'false', 'agent-reducer' 会立即更新 'Agent' state", async () => {
        // 在之前的基础上，将 strict 设置为 'false'
        const reducer = createAgentReducer(CountAgent, {updateBy: "manual", strict: false});

        const store = createStore(reducer, 1);
        const {agent, update} = reducer;

        const unListen = store.subscribe(() => {
            update(store.getState(), store.dispatch);
        });
        // 修改 state
        agent.stepUp();
        // state 立即更新了
        expect(agent.state).toBe(2);
        // 因为延迟 redux 中的 state 还没有更新，
        // 这意味着 'Agent' state 与 redux state 不再同步
        expect(store.getState()).not.toBe(agent.state);
        expect(store.getState()).toBe(1);
        // 外部造成一个小延迟
        await Promise.resolve();
        // redux state 更新完成
        expect(agent.state).toBe(2);
        expect(store.getState()).toBe(agent.state);
        unListen();
    });

    it("设置 expired 为 'true', 'agent-reducer' 将不再更新 'Agent' state", async () => {
        // 我们并不直接将 expired 设置为 'true'，
        // 否则刚开始我们就不能更新 Agent state了
        const reducer = createAgentReducer(CountAgent, {updateBy: "manual"});

        const store = createStore(reducer, 1);
        const {agent, update} = reducer;

        const unListen = store.subscribe(() => {
            update(store.getState(), store.dispatch);
        });
        // 修改 state
        agent.stepUp();
        // 造成外部延时
        await Promise.resolve();
        // state 随 redux state 更新
        expect(agent.state).toBe(2);
        expect(store.getState()).toBe(agent.state);

        // 设置 env.expired 为 'true'
        reducer.env.expired=true;
        // 再次修改 state
        agent.stepUp();
        // 再次造成外部延时
        await Promise.resolve();
        // Agent state 和 redux state 都不再更新
        expect(agent.state).toBe(2);
        expect(store.getState()).toBe(agent.state);
        unListen();
    });

    it("设置 legacy 为 'true', 'agent-reducer' 将表现出旧版本特性",()=>{
        // 设置 legacy 为 'true'
        const {agent,env,recordChanges} = createAgentReducer(CountAgent, {legacy:true});
        // 开始记录更新历史
        const unRecord=recordChanges();
        agent.step(true);
        const changes=unRecord();
        // 在旧版本 'agent-reducer' 方法中,
        // 调用其他 'Agent' 方法会触发多次 state 更新
        expect(changes.length).toBe(2);
        // 设置 legacy 为 'false'
        env.legacy=false;
        const unRecordUnLegacy=recordChanges();
        agent.step(true);
        const unLegacyChanges=unRecordUnLegacy();
        // 在当前版本的 'agent-reducer' 方法中，
        // 调用其他 'Agent' 方法并不会触发多余的更新。
        expect(unLegacyChanges.length).toBe(1);
    });

});