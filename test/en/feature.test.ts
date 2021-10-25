import {Action, Model} from "../../src/libs/global.type";
import {create, middleWare, MiddleWarePresets, sharing, weakSharing} from "../../src";

describe('keyword `this` in `Agent method`', () => {

    class CounterModel implements Model<number> {

        state: number = 0;

        increase() {
            return this.state + 1;
        }

    }

    test('The reference about keyword `this` in `Agent method` is locked on `Model instance`, it can not be changed.', () => {
        const data = {
            state: 1
        }
        const {agent, connect, disconnect} = create(CounterModel);
        connect();
        const {increase} = agent;
        // use API `fn.call` to run method to new target `data`.
        const result = increase.call(data);
        // `fn.call` can not change the reference of keyword `this` in `Agent method`.
        expect(result).not.toBe(2);
        expect(agent.state).toBe(1);
        disconnect();
    });

});

describe('Model Sharing',()=>{

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

    // this is a user model,
    // we can fetch user from server.
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

    test('use default `Model Sharing` feature with limits',async ()=>{
        // create the `Model instance`
        const userModel = new UserModel();
        // to test a Model Sharing, we need two `Agent` from a `Model instance`
        const { agent,connect,disconnect } = create(userModel);
        const { agent:another,connect:anotherConnect,disconnect:anotherDisConnect } = create(userModel);
        // connect both `Agents`
        connect();
        anotherConnect();
        // login user
        await agent.login();
        expect(agent.state).toEqual(remoteUser);
        expect(another.state).toEqual(remoteUser);
        // logout user operation
        const logoutOperation = agent.logout();
        // before the data of logout operation fetched,
        // disconnect both `Agents`
        disconnect();
        anotherDisConnect();
        await logoutOperation;
        // We have disconnect both `Agent` before the `logout` finished,
        // the state should be reset or change to a default user,
        // but nothing happens.
        // This is the limit for a default Model Sharing
        const { agent:tester,connect:testConnect,disconnect:testDisconnect } = create(userModel);
        testConnect();
        expect(tester.state).not.toEqual(defaultUser);
        expect(tester.state).toEqual(remoteUser);
        testDisconnect();
    });

    test('use API `sharing` to make a persist `Model Sharing`',async ()=>{
        // create a `Model Sharing`
        const userRef = sharing(()=>new UserModel());
        // To test a Model Sharing, we need two `Agent` from a `Model instance`,
        // we can fetch the `Model instance` by getting `current` property from `Model Sharing` object.
        const { agent,connect,disconnect } = create(userRef.current);
        const { agent:another,connect:anotherConnect,disconnect:anotherDisConnect } = create(userRef.current);
        // connect both `Agents`
        connect();
        anotherConnect();
        // login user
        await agent.login();
        expect(agent.state).toEqual(remoteUser);
        expect(another.state).toEqual(remoteUser);
        // switch user operation
        const switchOperation = agent.switchUser();
        // before the data of switch operation fetched,
        // disconnect both `Agents`
        disconnect();
        anotherDisConnect();
        await switchOperation;
        // We have disconnect both `Agent` before the `switchUser` finished.
        // The `sharing` API still works, and change the state.
        const { agent:tester,connect:testConnect,disconnect:testDisconnect } = create(userRef.current);
        testConnect();
        expect(tester.state).toEqual(anotherRemoteUser);
        testDisconnect();
    });

    test('use API `weakSharing` to make a reset able `Model Sharing`',async ()=>{
        // create a `Model Sharing`
        const userRef = weakSharing(()=>new UserModel());
        // To test a Model Sharing, we need two `Agent` from a `Model instance`,
        // we can fetch the `Model instance` by getting `current` property from `Model Sharing` object.
        const { agent,connect,disconnect } = create(userRef.current);
        const { agent:another,connect:anotherConnect,disconnect:anotherDisConnect } = create(userRef.current);
        // connect both `Agents`
        connect();
        anotherConnect();
        // login user
        await agent.login();
        expect(agent.state).toEqual(remoteUser);
        expect(another.state).toEqual(remoteUser);
        // switch user operation
        const switchOperation = agent.switchUser();
        // before the data of switch operation fetched,
        // disconnect both `Agents`
        disconnect();
        anotherDisConnect();
        await switchOperation;
        // We have disconnect both `Agent` before the `switchUser` finished.
        // The `weakSharing` API skipped the expired state change.
        // When you need the `Model instance` again, it will be recreated.
        const { agent:tester,connect:testConnect,disconnect:testDisconnect } = create(userRef.current);
        testConnect();
        expect(tester.state).toEqual(defaultUser);
        testDisconnect();
    });

});

describe('use sharing.initial',()=>{

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

    test('use `initial` from API `sharing` returns',()=>{
        const counterRef = sharing((count:number)=>new Counter(count));
        const {agent,connect,disconnect} = create(counterRef.initial(1));
        connect();
        expect(agent.state).toBe(1);
        agent.stepUp();
        expect(agent.state).toBe(2);
        disconnect();
    });

    test('use `initial` from API `weakSharing` returns',()=>{
        const counterRef = weakSharing((count:number)=>new Counter(count));
        const {agent,connect,disconnect} = create(counterRef.initial(1));
        connect();
        expect(agent.state).toBe(1);
        agent.stepUp();
        expect(agent.state).toBe(2);
        disconnect();
    });

});