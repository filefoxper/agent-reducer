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

describe("how to use LifecycleMiddleWares.takeLatest", () => {

    it("without this MiddleWare, the latest state change may be override by an early one", async () => {
        const {agent} = createAgentReducer(UserModel, MiddleWares.takePromiseResolve());
        const promise1 = agent.fetchUser(1, 200);
        const promise2 = agent.fetchUser(2, 100);
        await Promise.all([promise1, promise2]);
        // state change override happens
        expect(agent.state.id).toBe(1);
    });

    it("You can use it on method which you want to guarantee the state change orders by method calling", async () => {
        const {agent} = createAgentReducer(UserModel);
        const copy = useMiddleWare(agent, applyMiddleWares(
            LifecycleMiddleWares.takeLatest(),
            MiddleWares.takePromiseResolve()
        ));
        const promise1 = copy.fetchUser(1, 200);
        const promise2 = copy.fetchUser(2, 100);
        await Promise.all([promise1, promise2]);
        // state change override will not happen again
        expect(agent.state.id).toBe(2);
    });

});