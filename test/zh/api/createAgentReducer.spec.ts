import {
    createAgentReducer,
    MiddleWares,
} from "../../../src";
import {OriginAgent} from "../../../index";

describe('如何使用 API createAgentReducer', () => {

    /**
     * 简单计数模型 (OriginAgent)
     */
    class CountAgent implements OriginAgent<number> {
        // 维护一个 number 类型的 state
        state = 0;

        constructor(state?: number) {
            this.state = state || 0;
        }

        // 可以使用一个返回下一个 state 的箭头函数
        increase = (): number => this.state + 1;

        // 也可以使用普通 class 方法
        decrease(): number {
            return this.state - 1;
        }

        walk(increment: boolean): number {
            return increment ? this.increase() : this.decrease();
        }

        // 方法参数相当与 reducer 系统中的 action，但要灵活的多
        sum(...counts: number[]): number {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

        async sumRemoteValue(remoteValue: number) {
            return this.sum(remoteValue);
        }

    }

    it('基本应用', () => {
        // createAgentReducer 自带一个简单的内置 reducer 处理器
        const {agent} = createAgentReducer(CountAgent);
        agent.increase();
        expect(agent.state).toBe(1);
    });

    it('可以使用模型的实例作为 OriginAgent，这样更加灵活', () => {
        // createAgentReducer 自带一个简单的内置 reducer 处理器
        // 当我们需要对模型设置一些初始化条件是，我们可以通过传入模型class的实例
        const {agent} = createAgentReducer(new CountAgent(1));
        agent.increase();
        expect(agent.state).toBe(2);
    });

    it('直接在createAgentReducer上使用MiddleWare', async () => {
        // createAgentReducer 自带一个简单的内置 reducer 处理器
        const {agent} = createAgentReducer(CountAgent, MiddleWares.takePromiseResolve());
        await agent.sumRemoteValue(2);
        expect(agent.state).toBe(2);
    });

    it('直接在createAgentReducer上使用运行环境env配置', async () => {
        // createAgentReducer 自带一个简单的内置 reducer 处理器
        const {agent} = createAgentReducer(CountAgent, {expired: true});
        await agent.increase();
        expect(agent.state).toBe(1);
    });

    it('直接在createAgentReducer上同时使用MiddleWare和运行环境env配置', async () => {
        // createAgentReducer 自带一个简单的内置 reducer 处理器
        const {agent} = createAgentReducer(CountAgent, MiddleWares.takePromiseResolve(), {strict: false});
        await agent.sumRemoteValue(2);
        expect(agent.state).toBe(2);
    });

});