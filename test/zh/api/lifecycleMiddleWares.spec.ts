import {
    applyMiddleWares,
    createAgentReducer,
    LifecycleMiddleWares,
    MiddleWares,
    useMiddleWare
} from "../../../src";
import {OriginAgent} from "../../../index";

type User = {
    id?: number,
    name?: string
}

class UserModel implements OriginAgent<User> {

    state: User = {id: 0};

    async fetchUser(version: number, delay: number) {
        await new Promise((r) => setTimeout(r, delay));
        return {id: version, name: 'name_' + version};
    }

}

describe("如何使用 LifecycleMiddleWares.takeLatest", () => {

    it("如果不加这个MiddleWare，最新的数据变更可能会被一个早期触发方法产生的数据变更覆盖掉", async () => {
        const {agent} = createAgentReducer(UserModel, MiddleWares.takePromiseResolve());
        const promise1 = agent.fetchUser(1, 200);
        const promise2 = agent.fetchUser(2, 100);
        await Promise.all([promise1, promise2]);
        // 早期版本数据覆盖现象
        expect(agent.state.id).toBe(1);
    });

    it("你可以通过添加该MiddleWare保护最新数据，防止被一个早期触发方法产生的数据变更覆盖", async () => {
        const {agent} = createAgentReducer(UserModel);
        const copy = useMiddleWare(agent, applyMiddleWares(
            LifecycleMiddleWares.takeLatest(),
            MiddleWares.takePromiseResolve()
        ));
        const promise1 = copy.fetchUser(1, 200);
        const promise2 = copy.fetchUser(2, 100);
        await Promise.all([promise1, promise2]);
        // 早期版本数据覆盖现象被 LifecycleMiddleWares.takeLatest 阻止
        expect(agent.state.id).toBe(2);
    });

});