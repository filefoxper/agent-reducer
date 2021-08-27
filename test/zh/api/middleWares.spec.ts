import {applyMiddleWares, createAgentReducer, MiddleWares} from "../../../src";
import { OriginAgent } from '../../../index';

type User = {
    id?: number,
    name?: string
}

class UserModel implements OriginAgent<User> {

    state: User = {id: 0};

    async fetchUser() {
        return {id: 0, name: 'Guest'};
    }

    changeName(name: string) {
        return {name};
    }

    async saveName(name: string) {
        await new Promise((r) => setTimeout(r, 200));
        return {name};
    }

}

describe('MiddleWares的使用方法', () => {

    it("MiddleWares.takeNone", () => {
        const {agent, recordChanges} = createAgentReducer(UserModel, MiddleWares.takeNone());
        // 通过调用 recordChanges 开始记录 state 变化
        const getStateChanges = recordChanges();
        agent.changeName('Master');
        // 变化完成后获取 state 变更记录
        const changes = getStateChanges();
        expect(agent.state.name).toBeUndefined();
        // 使用 MiddleWares.takeNone 产生的变更记录条数为 0
        expect(changes.length).toBe(0);
    });

    it("MiddleWares.takePromiseResolve", async () => {
        const {agent} = createAgentReducer(UserModel, MiddleWares.takePromiseResolve());
        await agent.fetchUser();
        expect(agent.state).toEqual({id: 0, name: 'Guest'});
    });

    it("MiddleWares.takeAssignable", () => {
        const {agent} = createAgentReducer(UserModel, MiddleWares.takeAssignable());
        agent.changeName('Jimmy');
        expect(agent.state).toEqual({id: 0, name: 'Jimmy'});
    });

    it("MiddleWares.takeDebounce", async () => {
        const {agent} = createAgentReducer(UserModel, MiddleWares.takeDebounce(200));
        agent.changeName('Daisy');
        agent.changeName('Jimmy');
        expect(agent.state.name).toBe(undefined);
        await new Promise((r) => setTimeout(r, 200));
        expect(agent.state.name).toBe('Jimmy');
    });

    it("MiddleWares.takeThrottle", async () => {
        const {agent} = createAgentReducer(UserModel, MiddleWares.takeThrottle(200));
        agent.changeName('Daisy');
        await new Promise((r) => setTimeout(r, 50));
        agent.changeName('Lucy');
        await new Promise((r) => setTimeout(r, 50));
        agent.changeName('Jimmy');
        expect(agent.state.name).toBe('Daisy');
        await new Promise((r) => setTimeout(r, 100));
        expect(agent.state.name).toBe('Jimmy');
    });

    it("MiddleWares.takeLazy", async () => {
        const {agent} = createAgentReducer(UserModel, MiddleWares.takeLazy(200));
        agent.changeName('Daisy');
        agent.changeName('Jimmy');
        expect(agent.state.name).toBe(undefined);
        await new Promise((r) => setTimeout(r, 200));
        expect(agent.state.name).toBe('Jimmy');
    });

    it("MiddleWares.takeDebounce 设置 leading 为 true", async () => {
        const {agent} = createAgentReducer(UserModel, MiddleWares.takeDebounce(200, {leading: true}));
        agent.changeName('Daisy');
        agent.changeName('Jimmy');
        expect(agent.state.name).toBe('Daisy');
        await new Promise((r) => setTimeout(r, 100));
        agent.changeName('Lucy');
        await new Promise((r) => setTimeout(r, 200));
        expect(agent.state.name).toBe('Daisy');
    });

    it("MiddleWares.takeBlock", async () => {
        const {agent} = createAgentReducer(UserModel, applyMiddleWares(MiddleWares.takeBlock(), MiddleWares.takePromiseResolve()));
        agent.saveName('Daisy');
        agent.saveName('Jimmy');
        await new Promise((r) => setTimeout(r, 210));
        expect(agent.state.name).toBe('Daisy');
    });

    it("MiddleWares.takeBlock 设置 blockMs", async () => {
        const {agent} = createAgentReducer(UserModel, applyMiddleWares(MiddleWares.takeBlock(100), MiddleWares.takePromiseResolve()));
        agent.saveName('Daisy');
        agent.saveName('Jimmy');
        await new Promise((r) => setTimeout(r, 100));
        agent.saveName('Lucy');
        await new Promise((r) => setTimeout(r, 210));
        expect(agent.state.name).toBe('Lucy');
    });

});