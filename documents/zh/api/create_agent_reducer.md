# createAgentReducer( originAgent, middleWareOrEnv, env )

这个接口 function 可以用来把一个 `OriginAgent` 模型转换成一个 `AgentReducer` function，并可以为 `AgentReducer` 上的 `agent` 添加 MiddleWare 。如果你对 `OriginAgent` 以及 `AgentReducer` 的概念尚未熟悉，请参考[相关概念](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/introduction/concept.md)。

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

* originAgent - 模型对象 class 或 object.
* middleWareOrEnv - 可选参数, 如果想用 MiddleWare 则传 MiddleWare ，如果不想，可以传入运行环境配置 env 或 不传。
* env - 如果 middleWareOrEnv 设置了 MiddleWare ，那么可以通过这一项配置 运行环境配置 env

注意：生命周期控制类 MiddleWare 不能使用该接口。如果你想使用 `LifecycleMiddleWares.takeLatest` 这个唯一的生命周期控制类 MiddleWare，你可以参考 API [useMiddleWare](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/use_middle_ware.md) 或 [middleWare](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/middle_ware.md)。

参考文档：

* [env 运行环境配置](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/guides/about_env.md)
* [MiddleWare](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/guides/about_middle_ware.md)
* [AgentReducer的定义](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/guides/with_other_reducer_tools.md)

单元测试示范 [代码](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/api/createAgentReducer.spec.ts)

如何使用 `createAgentReducer`：
```typescript
import {
    createAgentReducer,
    MiddleWares,
    OriginAgent
} from "agent-reducer";

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
        expect(agent.state).toBe(0);
    });

    it('直接在createAgentReducer上同时使用MiddleWare和运行环境env配置', async () => {
        // createAgentReducer 自带一个简单的内置 reducer 处理器
        const {agent} = createAgentReducer(CountAgent, MiddleWares.takePromiseResolve(), {strict: false});
        await agent.sumRemoteValue(2);
        expect(agent.state).toBe(2);
    });

});
```
`AgentReducer` function 可以做的事已经在章节[接入其他 reducer 工具](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/guides/with_other_reducer_tools.md)中详细说明，您可以参考相关章节内容。

返回 [API Reference](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/index.md)