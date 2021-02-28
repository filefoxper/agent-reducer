# middleWare( callOrMiddleWare, mdw )

当前方法可用于向`Agent`对象方法添加 MiddleWare 。通过该方法添加的 MiddleWare 拥有目前的最高优先级，它会覆盖通过 API createAgentReducer 和 useMiddleWare 添加的 MiddleWare ，但自`agent-reducer@3.2.0`版本开始 API useMiddleWare 将获取最高优先级。可以通过设置`env.nextExperience`为true体验新版本的这一特性。

```typescript
type MiddleWareAbleFunction = ((...args: any[]) => any) & {
  middleWare?: MiddleWare;
};

function middleWare (
  callOrMiddleWare: MiddleWare | MiddleWareAbleFunction,
  mdw?: MiddleWare | MiddleWareAbleFunction
):MiddleWareAbleFunction
```
* callOrMiddleWare - 如果传入的是 `Agent` 方法, 第二个参数为 MiddleWare；如果传入一个 MiddleWare ，则不能传入第二个参数，这种情况通常发生在使用 es6 decorator 时。
* mdw - MiddleWare 或 不传

单元测试[例子](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/api/middleWare.spec.ts):
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

describe('如何使用 api middleWare', () => {

    class MiddleWareModel implements OriginAgent<State> {

        state: State;

        constructor() {
            this.state = {id: 0};
            // 通过直接调用的形式使用 api middleWare，
            // 这中使用方式会覆盖 es6 decorator 方式添加的 MiddleWare
            middleWare(this.changeByPromiseResolve, MiddleWarePresets.takePromiseResolve());
        }

        // es6 decorator 添加方式，
        // 被constructor中的直接调用形式覆盖
        @middleWare(MiddleWarePresets.takePromiseResolveAssignable())
        async changeByPromiseResolve(name: string) {
            return {name};
        }

        // es6 decorator 添加方式
        @middleWare(MiddleWarePresets.takePromiseResolveAssignable())
        async changeByPromiseResolveAssignable(name: string) {
            return {name};
        }

        // 我们将使用 api 'createAgentReducer' 对其使用 MiddleWare
        async changeAsync(name: string) {
            return {name};
        }

    }

    it("MiddleWare from api 'middleWare' will override MiddleWare from api 'createAgentReducer'", async () => {
        const {agent} = createAgentReducer(MiddleWareModel, MiddleWares.takePromiseResolve());
        await agent.changeByPromiseResolveAssignable('name');
        expect(agent.state).toEqual({id: 0, name: 'name'});
    });

    it("通过 es6 decorator 添加的 MiddleWare 会被 constructor 中直接调用的覆盖", async () => {
        const {agent} = createAgentReducer(MiddleWareModel, MiddleWares.takePromiseResolve());
        // constructor中直接调用的MiddleWare并不处理assignable，
        // es6 decorator虽然有相关assignable处理，但被直接调用的覆盖了
        await agent.changeByPromiseResolve('name');
        expect(agent.state).toEqual({name: 'name'});
        expect(agent.state.id).toBeUndefined();
    });

    it("当前版本中通过 api 'middleWare' 添加的 MiddleWare 会覆盖通过 api 'useMiddleWare' 添加的 MiddleWare", async () => {
        const {agent} = createAgentReducer(MiddleWareModel, MiddleWares.takePromiseResolve());
        const branch = useMiddleWare(agent, MiddleWarePresets.takePromiseResolveAssignable());
        await branch.changeByPromiseResolve('name');
        expect(agent.state).toEqual({name: 'name'});
        expect(agent.state.id).toBeUndefined();
    });

    it("3.2.0版本中通过 api 'useMiddleWare' 添加的 MiddleWare 会覆盖通过 api 'middleWare' 添加的 MiddleWare", async () => {
        const {agent} = createAgentReducer(MiddleWareModel, MiddleWares.takePromiseResolve(), {nextExperience: true});
        const branch = useMiddleWare(agent, MiddleWarePresets.takePromiseResolveAssignable());
        await branch.changeByPromiseResolve('name');
        expect(agent.state).toEqual({id: 0, name: 'name'});
    });

});
```

返回 [API Reference](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/index.md)