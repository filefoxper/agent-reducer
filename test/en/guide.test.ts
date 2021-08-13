import {create, middleWare, MiddleWarePresets, withMiddleWare} from "../../src";
import {Model} from "../../src/libs/global.type";

describe('MiddleWare override priority', () => {

    type User = {
        id: undefined | number
        name: string,
        nick: string
    }

    // this is a user model,
    // we can fetch user from server.
    // use class decorator to add MiddleWare,
    // can make this MiddleWare effect on all methods in this class
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class UserModel implements Model<User> {

        state: User = {
            id: undefined,
            name: 'guest',
            nick: 'guest'
        };

        fetchCurrentUser() {
            return Promise.resolve({
                id: 0,
                name: 'name',
                nick: 'nick'
            });
        }

        rename(name: string) {
            return {name, nick: name};
        }

        @middleWare(MiddleWarePresets.takeNothing())
        updateNick(nick: string) {
            return {nick};
        }

    }

    test('The lowest priority by using class decorator', async () => {
        const {agent, connect, disconnect} = create(UserModel);
        connect();
        // the MiddleWare from class decorator effect on the promise returning.
        await agent.fetchCurrentUser();
        expect(agent.state).toEqual({
            id: 0,
            name: 'name',
            nick: 'nick'
        });
        // the MiddleWare from class decorator can not effect the object which is not a promise,
        // this returning object is a part of state User type,
        // so the next state will be incomplete.
        // We need `MiddleWarePresets.takeAssignable` to merge it with this.state
        agent.rename('name1');
        expect(agent.state).not.toHaveProperty('id');
        disconnect();
    });

    test('The MiddleWare added by api `create` can override the one added by using class decorator', async () => {
        const {agent, connect, disconnect} = create(UserModel, MiddleWarePresets.takePromiseResolveAssignable());
        connect();
        // The MiddleWare from class decorator is override by the MiddleWare from api `create`,
        // and the MiddleWarePresets.takePromiseResolveAssignable() effect on the promise returning.
        // MiddleWarePresets.takePromiseResolveAssignable() is chained by
        // MiddleWares.takePromiseResolve() and MiddleWares.takeAssignable(),
        // so it can resolve the promise returning.
        await agent.fetchCurrentUser();
        expect(agent.state).toEqual({
            id: 0,
            name: 'name',
            nick: 'nick'
        });
        // The MiddleWare from class decorator is override by the MiddleWare from api `create`,
        // this returning object is a part of state User type,
        // MiddleWarePresets.takePromiseResolveAssignable() can effect on it,
        // and merge it with this.state.
        agent.rename('name1');
        expect(agent.state).toHaveProperty('id');
        disconnect();
    });

    test('The MiddleWare added by method decorator can override the two ways above', async () => {
        const {agent, connect, disconnect} = create(UserModel, MiddleWarePresets.takePromiseResolveAssignable());
        connect();
        // The MiddleWare from class decorator is override by the MiddleWare from api `create`,
        // and the MiddleWarePresets.takePromiseResolveAssignable() effect on the promise returning.
        // MiddleWarePresets.takePromiseResolveAssignable() is chained by
        // MiddleWares.takePromiseResolve() and MiddleWares.takeAssignable(),
        // so it can resolve the promise returning.
        await agent.fetchCurrentUser();
        expect(agent.state).toEqual({
            id: 0,
            name: 'name',
            nick: 'nick'
        });
        // The MiddleWare from class decorator is override by the MiddleWare from api `create`,
        // this returning object is a part of state User type,
        // MiddleWarePresets.takePromiseResolveAssignable() can effect on it,
        // and merge it with this.state.
        agent.rename('name1');
        expect(agent.state).toHaveProperty('id');
        // The MiddleWare added by method decorator override the other MiddleWares,
        // but it only effect on the method.
        agent.updateNick('nick1');
        // `MiddleWarePresets.takeNothing()` abandons all the state changes,
        // so state.nick is not change.
        expect(agent.state.nick).not.toBe('nick1');
        disconnect();
    });

    test('API `withMiddleWare` has a highest priority', async () => {
        const {agent, connect, disconnect} = create(UserModel, MiddleWarePresets.takePromiseResolveAssignable());
        connect();
        // The MiddleWare from class decorator is override by the MiddleWare from api `create`,
        // and the MiddleWarePresets.takePromiseResolveAssignable() effect on the promise returning.
        // MiddleWarePresets.takePromiseResolveAssignable() is chained by
        // MiddleWares.takePromiseResolve() and MiddleWares.takeAssignable(),
        // so it can resolve the promise returning.
        await agent.fetchCurrentUser();
        expect(agent.state).toEqual({
            id: 0,
            name: 'name',
            nick: 'nick'
        });
        // The MiddleWare from class decorator is override by the MiddleWare from api `create`,
        // this returning object is a part of state User type,
        // MiddleWarePresets.takePromiseResolveAssignable() can effect on it,
        // and merge it with this.state.
        agent.rename('name1');
        expect(agent.state).toHaveProperty('id');

        const {updateNick} = withMiddleWare(agent, MiddleWarePresets.takeAssignable());
        // The MiddleWare added by method decorator is override by the one added from `withMiddleWare`,
        // `withMiddleWare` copy a new agent for override.
        updateNick('nick1');
        // `MiddleWarePresets.takeNothing()` is override by `MiddleWarePresets.takeAssignable()` temporarily
        expect(agent.state.nick).toBe('nick1');
        disconnect();
    });

});

describe('Lifecycle MiddleWare',()=>{

    type Todo = {
        content: string,
        status: 'new' | 'doing' | 'done'
    };

    const todoList1: Array<Todo> = [
        {content: 'create project structure', status: 'done'},
        {content: 'coding', status: 'done'},
    ];

    const todoList2:Array<Todo> = [
        {content: 'unit test', status: 'doing'},
        {content: 'write docs', status: 'new'},
    ];

    // This is a to-do list model,
    // we can fetch list from server by page.
    // We want the page data fetched by the order of method `fetch` trigger.
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>> {

        state = [];

        fetch(page:number): (Promise<Array<Todo>>) {
            // simulate a delay when page is 1
            if(page === 1){
                return new Promise((resolve) => {
                    setTimeout(()=>{
                        resolve([...todoList1]);
                    });
                });
            }
            return new Promise((resolve) => {
                resolve([...todoList2]);
            });
        }

    }

    test('without `MiddleWarePresets.takeLatest()`, page 1 may override the newest page 2',async ()=>{
        const {agent,connect,disconnect} = create(TodoList);
        connect();
        // We fetch page 1 data first, then fetch the page 2.
        const fetchLoader1 = agent.fetch(1);
        const fetchLoader2 = agent.fetch(2);
        await Promise.all([fetchLoader1,fetchLoader2]);
        // The data of page 1 is delayed,
        // it overrides the newest data of page 2.
        // The data of page 1 is not the result we want to see.
        expect(agent.state).toEqual(todoList1);
        disconnect();
    });

    test('`MiddleWarePresets.takeLatest()` can make state change by order',async ()=>{
        const {agent,connect,disconnect} = create(TodoList);
        connect();
        // We copy an agent for lifecycle MiddleWare `takeLatest`
        const agentCopy = withMiddleWare(agent,MiddleWarePresets.takeLatest());
        // We fetch page 1 data first, then fetch the page 2.
        // Be careful, if we want `MiddleWarePresets.takeLatest()` be effective,
        // we need to call the fetch method from the copy `Agent`.
        const fetchLoader1 = agentCopy.fetch(1);
        const fetchLoader2 = agentCopy.fetch(2);
        await Promise.all([fetchLoader1,fetchLoader2]);
        // The data of page 1 is delayed,
        // so `MiddleWarePresets.takeLatest()` accept the data from page 2 first,
        // then `MiddleWarePresets.takeLatest()` kills the old `Agent`,
        // which is waiting for the data of page 1.
        // The newest data of page 2 keeps.
        expect(agent.state).toEqual(todoList2);
        disconnect();
    });

    test('The decorator API `middleWare` always returns method from an `Agent` copy object',async ()=>{

        @middleWare(MiddleWarePresets.takePromiseResolve())
        class TodoList implements Model<Array<Todo>> {

            state = [];

            // we can add `takeLatest` like this too
            @middleWare(MiddleWarePresets.takeLatest())
            fetch(page:number): (Promise<Array<Todo>>) {
                // simulate a delay when page is 1
                if(page === 1){
                    return new Promise((resolve) => {
                        setTimeout(()=>{
                            resolve([...todoList1]);
                        });
                    });
                }
                return new Promise((resolve) => {
                    resolve([...todoList2]);
                });
            }

        }

        const {agent,connect,disconnect} = create(TodoList);
        connect();
        // We fetch page 1 data first, then fetch the page 2.
        const fetchLoader1 = agent.fetch(1);
        const fetchLoader2 = agent.fetch(2);
        await Promise.all([fetchLoader1,fetchLoader2]);
        // so `MiddleWarePresets.takeLatest()` accept the data from page 2 first,
        // then `MiddleWarePresets.takeLatest()` kills the old `Agent`,
        // which is waiting for the data of page 1.
        // The newest data of page 2 keeps.
        expect(agent.state).toEqual(todoList2);
        disconnect();
    });
    
    test('The `create` API can not accept a Lifecycle MiddleWare currently',()=>{
        expect(()=>{
            create(TodoList,MiddleWarePresets.takeLatest());
        }).toThrow('Can not use a lifecycle `MiddleWare` for creating, please use this `MiddleWare` with api `withMiddleWare` or `middleWare`.');
    });

});