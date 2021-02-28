import {
    OriginAgent,
    createAgentReducer,
    middleWare,
    MiddleWarePresets,
    MiddleWares,
    useMiddleWare
} from "../../../src";

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