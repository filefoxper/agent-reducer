import {Model} from "../../src/libs/global.type";
import {create, middleWare, MiddleWarePresets, sharing, weakSharing} from "../../src";

describe('代理方法中的 `this`', () => {

    class CounterModel implements Model<number> {

        state: number = 0;

        increase() {
            return this.state + 1;
        }

    }

    test('代理方法中的 `this` 与模型实例绑定，且不可改变', () => {
        const data = {
            state: 1
        }
        const {agent, connect, disconnect} = create(CounterModel);
        connect();
        const {increase} = agent;
        // 尝试使用 `fn.call` 更换代理方法中的 `this`.
        const result = increase.call(data);
        // `fn.call` 不能改变代理方法中的 `this`.
        expect(result).not.toBe(2);
        expect(agent.state).toBe(1);
        disconnect();
    });

});

describe('模型共享',()=>{

    type User = {
        id: undefined | number
        name: string,
        nick: string
    }

    const defaultUser = {
        id: undefined,
        name: 'guest',
        nick: 'guest'
    };

    const remoteUser = {
        id: 0,
        name: 'name',
        nick: 'nick'
    };

    const anotherRemoteUser = {
        id: 1,
        name: 'name1',
        nick: 'nick1'
    }

    // 这时个 user 模型
    class UserModel implements Model<User> {

        state: User = defaultUser;

        @middleWare(MiddleWarePresets.takeLatest())
        login() {
            return Promise.resolve(remoteUser);
        }

        @middleWare(MiddleWarePresets.takeLatest())
        switchUser(){
            return Promise.resolve(anotherRemoteUser);
        }

        @middleWare(MiddleWarePresets.takeLatest())
        logout(){
            return Promise.resolve(defaultUser);
        }

        rename(name: string) {
            return {name, nick: name};
        }

        updateNick(nick: string) {
            return {nick};
        }

    }

    test('使用默认共享，将会遇到一些特性限制',async ()=>{
        // 创建模型实例
        const userModel = new UserModel();
        // 为了体验模型共享，我们需要至少创建两个以上的代理
        const { agent,connect,disconnect } = create(userModel);
        const { agent:another,connect:anotherConnect,disconnect:anotherDisConnect } = create(userModel);
        // 连接代理
        connect();
        anotherConnect();
        // 登录用户
        await agent.login();
        expect(agent.state).toEqual(remoteUser);
        expect(another.state).toEqual(remoteUser);
        // 登出用户
        const logoutOperation = agent.logout();
        // 在登出用户完成前，强行断开连接，销毁代理
        disconnect();
        anotherDisConnect();
        await logoutOperation;
        // 因为过早销毁代理，故模型中的 state 没有来得及发生改变。
        // 这就是默认共享的限制之一
        const { agent:tester,connect:testConnect,disconnect:testDisconnect } = create(userModel);
        testConnect();
        expect(tester.state).not.toEqual(defaultUser);
        expect(tester.state).toEqual(remoteUser);
        testDisconnect();
    });

    test('使用 API `sharing` 创建一个可持续 state 变更的强共享',async ()=>{
        // 创建 `模型实例引用`
        const userRef = sharing(()=>new UserModel());
        // 为了体验模型共享，我们需要至少创建两个以上的代理，
        // 我们需要通过访问模型实例引用 `userRef.current` 来创建代理
        const { agent,connect,disconnect } = create(userRef.current);
        const { agent:another,connect:anotherConnect,disconnect:anotherDisConnect } = create(userRef.current);
        // 连接代理
        connect();
        anotherConnect();
        // 登录用户
        await agent.login();
        expect(agent.state).toEqual(remoteUser);
        expect(another.state).toEqual(remoteUser);
        // 切换用户
        const switchOperation = agent.switchUser();
        // 在切换完成前，断开连接，并销毁代理
        disconnect();
        anotherDisConnect();
        await switchOperation;
        // 使用 API `sharing` 创建的强共享，不会丢失 state 变更
        const { agent:tester,connect:testConnect,disconnect:testDisconnect } = create(userRef.current);
        testConnect();
        expect(tester.state).toEqual(anotherRemoteUser);
        testDisconnect();
    });

    test('使用 API `weakSharing` 创建一个可自动重置的弱共享',async ()=>{
        // 创建 `模型实例引用`
        const userRef = weakSharing(()=>new UserModel());
        // 为了体验模型共享，我们需要至少创建两个以上的代理，
        // 我们需要通过访问模型实例引用 `userRef.current` 来创建代理
        const { agent,connect,disconnect } = create(userRef.current);
        const { agent:another,connect:anotherConnect,disconnect:anotherDisConnect } = create(userRef.current);
        // 连接代理
        connect();
        anotherConnect();
        // 登录用户
        await agent.login();
        expect(agent.state).toEqual(remoteUser);
        expect(another.state).toEqual(remoteUser);
        // 切换用户
        const switchOperation = agent.switchUser();
        // 在切换完成前，断开连接，并销毁代理
        disconnect();
        anotherDisConnect();
        await switchOperation;
        // 弱共享全量销毁 `代理` 后，会被重置
        const { agent:tester,connect:testConnect,disconnect:testDisconnect } = create(userRef.current);
        testConnect();
        expect(tester.state).toEqual(defaultUser);
        testDisconnect();
    });

});

describe('使用 initial',()=>{

    class Counter implements Model<number>{

        state:number;

        constructor(initialState:number = 0) {
            this.state = initialState;
        }

        stepUp(){
            return this.state+1;
        }

        stepDown(){
            return this.state-1;
        }

    }

    test('使用 API `sharing` 返回引用中的 initial 函数进行初始化',()=>{
        const counterRef = sharing((count:number)=>new Counter(count));
        const {agent,connect,disconnect} = create(counterRef.initial(1));
        connect();
        expect(agent.state).toBe(1);
        agent.stepUp();
        expect(agent.state).toBe(2);
        disconnect();
    });

    test('使用 API `weakSharing` 返回引用中的 initial 函数进行初始化',()=>{
        const counterRef = weakSharing((count:number)=>new Counter(count));
        const {agent,connect,disconnect} = create(counterRef.initial(1));
        connect();
        expect(agent.state).toBe(1);
        agent.stepUp();
        expect(agent.state).toBe(2);
        disconnect();
    });

});
