import {
    createAgentReducer,
    MiddleWarePresets,
    MiddleWares,
    OriginAgent,
    useMiddleWare
} from "../../../src";

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