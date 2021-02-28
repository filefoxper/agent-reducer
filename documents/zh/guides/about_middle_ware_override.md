# MiddleWare 的覆盖现象

设置`agent-reducer`的 MiddleWare 有三种接口。

1. `createAgentReducer`， 这是`agent-reducer`的基础接口, 你可以通过 `createAgentReducer( OriginAgent, MiddleWare )`这样的方式来设置 MiddleWare。
   
2. `useMiddleWare`, 当前接口会复制一个`Agent`对象, 通过当前接口设置的 MiddleWare 会覆盖来自 API createAgentReducer 的 MiddleWare. 用法如： `useMiddleWare( Agent, MiddleWare )`。
   
3. `middleWare`, 允许直接在模型 `OriginAgent` 方法上预置 MiddleWare，当`Agent`相应方法被调用时，预置的 MiddleWare 就起作用了，通过 middleWare 接口加入的方法级 MiddleWare 会对前两种接口加入的 MiddleWare 产生覆盖现象。

注意：通过 API `middleWare` 添加的方法级 MiddleWare 的覆盖优先级将在`agent-reducer@3.2.0`版本起调低，届时，API `useMiddleWare`添加的 MiddleWare 将会覆盖通过 API `middleWare` 添加的方法级 MiddleWare。通过设置`env.nextExperience`为 true ，可预先体验这一特性。

单元测试源码位置：[middleWare.override.spec.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/guides/middleWare.override.spec.ts).

example:
```typescript
import {
    OriginAgent,
    createAgentReducer,
    middleWare,
    MiddleWarePresets,
    MiddleWares,
    useMiddleWare
} from "agent-reducer";

type State = {
    id: number,
    name?: string
}

describe('使用不同的接口设置MiddleWare，体验MiddleWare覆盖现象', () => {


    class MiddleWareOverrideModel implements OriginAgent<State> {

        state: State;

        constructor() {
            this.state = {id: 0};
            // 如果你的开发环境中没有使用 es6 decorator 特性，
            // 你可以直接在 constructor 中这样调用 API middleWare 。
            // 如果你已经在使用 decorator 了，你可以写成'@middleWare(MiddleWare)'形式。
            // 注意：constructor 中直接调用 API middleWare ， 
            // 产生的方法级 MiddleWare 会覆盖通过 decorator 产生的 MiddleWare 
            middleWare(this.changeByPromiseResolve, MiddleWarePresets.takePromiseResolve());
        }

        // 通过 decorator 添加的 MiddleWare 将被 constructor MiddleWare 覆盖
        @middleWare(MiddleWarePresets.takePromiseResolveAssignable())
        async changeByPromiseResolve(name: string) {
            return {name};
        }

        // 通过 decorator 使用 API middleWare
        @middleWare(MiddleWarePresets.takePromiseResolveAssignable())
        async changeByPromiseResolveAssignable(name: string) {
            return {name};
        }

        // 通过 API createAgentReducer 使用 MiddleWare
        async changeAsync(name: string) {
            return {name};
        }

    }

    it("api 'middleWare' 产生的 MiddleWare 会覆盖 api 'createAgentReducer' 产生的 MiddleWare", async () => {
        const {agent} = createAgentReducer(MiddleWareOverrideModel, MiddleWares.takePromiseResolve());
        await agent.changeByPromiseResolveAssignable('name');
        expect(agent.state).toEqual({id: 0, name: 'name'});
    });

    it("constructor 中通过 api 'middleWare' 添加的会覆盖通过 decorator 添加的", async () => {
        const {agent} = createAgentReducer(MiddleWareOverrideModel, MiddleWares.takePromiseResolve());
        // 被 constructor 中添加的 MiddleWare 覆盖，
        // 故没有 assignable 特性。
        await agent.changeByPromiseResolve('name');
        expect(agent.state).toEqual({name: 'name'});
        expect(agent.state.id).toBeUndefined();
    });

    it("通过 api 'useMiddleWare' 添加的 MiddleWare 会覆盖通过 api 'createAgentReducer'添加的 MiddleWare", async () => {
        const {agent} = createAgentReducer(MiddleWareOverrideModel, MiddleWares.takePromiseResolve());
        const branch = useMiddleWare(agent, MiddleWarePresets.takePromiseResolveAssignable());
        await branch.changeAsync('name');
        expect(agent.state).toEqual({id: 0, name: 'name'});
    });

    it("当前版本，通过 api 'middleWare' 添加的 MiddleWare 会覆盖通过 api 'useMiddleWare'添加的 MiddleWare", async () => {
        const {agent} = createAgentReducer(MiddleWareOverrideModel, MiddleWares.takePromiseResolve());
        const branch = useMiddleWare(agent, MiddleWarePresets.takePromiseResolveAssignable());
        await branch.changeByPromiseResolve('name');
        expect(agent.state).toEqual({name: 'name'});
        expect(agent.state.id).toBeUndefined();
    });

    it("3.2.0版本开始，通过 api 'useMiddleWare'添加的 MiddleWare 会覆盖通过 api 'middleWare' 添加的 MiddleWare", async () => {
        const {agent} = createAgentReducer(MiddleWareOverrideModel, MiddleWares.takePromiseResolve(), {nextExperience: true});
        const branch = useMiddleWare(agent, MiddleWarePresets.takePromiseResolveAssignable());
        await branch.changeByPromiseResolve('name');
        expect(agent.state).toEqual({id: 0, name: 'name'});
    });

});
```
关于 MiddleWare 就介绍到这里了。如果你对如何将`agent-reducer`接入其他 reducer 工具感兴趣，请看[下一节](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/guides/with_other_reducer_tools.md)。