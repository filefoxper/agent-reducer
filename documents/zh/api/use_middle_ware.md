# useMiddleWare( agent, ...mdws )

当前方法可用来复制`Agent`对象，并加入与`Agent`对象方法所带不同的 MiddleWare 。如果你希望让某些`Agent`对象方法在特殊情况下表现出不同的特征，你可以使用该方法，该方法添加的 MiddleWare 只会影响通过该接口产生的复制品。 

复制版`Agent`对象的 state 与 原`Agent`对象 state 保持一致。

```typescript
function useMiddleWare<S, T extends OriginAgent<S>>(
  agent: T & { [agentDependenciesKey]?: AgentDependencies<S, T> },
  ...mdws: (MiddleWare | LifecycleMiddleWare)[]
): T
```
* agent - `Agent` 对象
* mdws - 想要在复制版 `Agent` 对象中使用的 MiddleWare

单元测试[例子](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/api/useMiddleWare.spec.ts)
```typescript
import {
    createAgentReducer,
    MiddleWarePresets,
    MiddleWares,
    OriginAgent,
    useMiddleWare
} from "agent-reducer";

describe('如何使用 API useMiddleWare', () => {

    class VersionModel implements OriginAgent<number> {

        state = 0;

        async fetchVersion(version: number, delay: number) {
            await new Promise((r) => setTimeout(r, delay));
            return version;
        }

    }

    it("在 useMiddleWare 生成的复制版中， api useMiddleWare 添加的 MiddleWares 会覆盖 api createAgentReducer 添加的 MiddleWares", async () => {
        const {agent} = createAgentReducer(VersionModel, MiddleWares.takePromiseResolve());
        // MiddleWarePresets.takeLatest 覆盖 MiddleWares.takePromiseResolve
        const copy = useMiddleWare(agent, MiddleWarePresets.takeLatest());
        const promise1 = copy.fetchVersion(1, 200);
        const promise2 = copy.fetchVersion(2, 0);
        await Promise.all([promise1, promise2]);
        // MiddleWarePresets.takeLatest 覆盖 MiddleWares.takePromiseResolve,
        // 导致方法运行时采取 MiddleWarePresets.takeLatest 的特性
        expect(agent.state).toBe(2);
        expect(copy.state).toBe(agent.state);
    });

});
```

返回 [API Reference](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/index.md)