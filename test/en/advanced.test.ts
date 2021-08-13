import {Model, NextProcess, Runtime, StateProcess} from "../../src/libs/global.type";
import {createDraft, finishDraft} from "immer";
import {create, middleWare, MiddleWarePresets} from "../../src";
import {createStore} from "redux";

describe('customized MiddleWare', () => {

    type Todo = {
        content: string,
        status: 'new' | 'doing' | 'done'
    };

    const todoList: Array<Todo> = [
        {content: 'create project structure', status: 'done'},
        {content: 'coding', status: 'done'},
        {content: 'unit test', status: 'doing'},
        {content: 'write docs', status: 'new'},
    ];

    // MiddleWare is a function which accepts a Runtime object
    const immerMiddleWare = (runtime: Runtime): NextProcess => {

        // function to test if the param is an object
        function isObject<T extends { [key: string]: any }>(data: T): boolean {
            return data && Object.prototype.toString.apply(data) === '[object Object]';
        }

        // store a immer draft object
        let cache: { draft: Record<string, unknown> | null } = {draft: null};

        // store next callback
        let listener: ((state: any) => void) | null = null;

        // createDraft and store draft to cache
        function createCacheDraft(val: any) {
            const draft = createDraft(val);
            cache.draft = draft;
            return draft;
        }

        // finishDraft and clear the draft cache
        function finishCacheDraft() {
            const result = finishDraft(cache.draft);
            cache.draft = null;
            return result;
        }

        // use mapModel api from runtime to create a Proxy object of `Model instance`,
        // when `Agent` run the method with this MiddleWare,
        // the method will be rebind to this Proxy object.
        // that means the keyword `this` in the method will change to be this Proxy object,
        // not the `Model instance`.
        runtime.mapModel({
            // Proxy handler get, rewrite the get way
            get(target: any, p: string, receiver: any): any {
                const value = target[p];
                // if the property name is not `state`,
                // or the property value is not an object,
                // we just skip the immer change.
                if (
                    p !== 'state' ||
                    (!isObject(value) && !Array.isArray(value)) ||
                    value === null
                ) {
                    return value;
                }
                // if cache.draft is exist,
                // it should be a immer draft.
                if (cache.draft) {
                    return cache.draft;
                }

                // if cache.draft is not exist,
                // create one.
                const draft = createCacheDraft(value);
                // if `next` is exist as `listener`,
                // create a micro task to finish draft,
                // at the end of current synchronous function.
                if (listener) {
                    Promise.resolve().then(() => {
                        if (!cache.draft) {
                            return;
                        }
                        // if cache.draft is exist,
                        // finish cache.draft.
                        // there are some ways to destroy `cache.draft`,
                        // so we store immer draft as a property of `cache`
                        // for avoiding the reference of `cache` be locked by closures.
                        const result = finishCacheDraft();
                        // call the `next` callback to pass the current data.
                        // it always happens in an asynchronously process.
                        listener!(result);
                    });
                }
                return draft;
            },
            set(target: any, p: string | symbol, value: any, receiver: any): boolean {
                if (p !== 'state') {
                    target[p] = value;
                    return true;
                }
                if (listener) {
                    cache.draft = null;
                    listener(value);
                } else {
                    createCacheDraft(value);
                }
                return true;
            }
        });
        return function nextProcess(next: StateProcess) {
            // the nextProcess callback is called after method finished immediately,
            // so, when the method is running synchronously,
            // we can not call `next` to pass reproduced result to next `stateProcess`.
            listener = next;
            // pass the parsed data when method finished immediately
            if (cache.draft) {
                next(finishCacheDraft());
            }
            return function stateProcess(result) {
                // when another middleWare like `takePromiseResolve` call `stateProcess`,
                // we can parse the last cache which is still a draft, and send it to next.
                if (cache.draft) {
                    return next(finishCacheDraft());
                }
                return result;
            }
        }
    }

    // this is a to-do list model,
    // we can fetch list from server.
    // use class decorator to add MiddleWare,
    // can make this MiddleWare effect on all methods in this class
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>> {

        state: Array<Todo> = [];

        fetch(): Promise<Array<Todo>> {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        @middleWare(immerMiddleWare)
        shift() {
            // we get the `state` from `this`,
            // and the Proxy object in `immerMiddleWare` gives us a immer draft instead.
            this.state.shift();
            // after the method finished,
            // `next` callback will pass the actual state parse from `draft` to next `stateProcess`,
            // for there is no more `MiddleWare` after `immerMiddleWare`,
            // the data will just be a new state of `Model`
        }

        @middleWare(immerMiddleWare)
        async refresh() {
            this.state.splice(0, this.state.length);
            await new Promise((r) => setTimeout(r, 200));
            todoList.forEach((data) => {
                this.state.push(data);
            });
        }

        clear(): Promise<Array<Todo>> {
            return Promise.resolve([]);
        }

    }

    test('use immer library in method without return anything', async () => {
        const {agent, connect, disconnect} = create(TodoList);
        connect();
        await agent.fetch();
        expect(agent.state).toEqual(todoList);
        // the MiddleWare on method will cover the default one,
        // it makes method `shift` only use `immerMiddleWare`.
        agent.shift();
        expect(agent.state).toEqual(todoList.slice(1));
        // a test about `immerMiddleWare` to async method.
        const p = agent.refresh();
        expect(agent.state).toEqual([]);
        await p;
        expect(agent.state).toEqual(todoList);
        disconnect();
    });

});

describe('connect to redux',()=>{

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

    test('an example about how to connect `agent-reducer` with another library',async ()=>{
        const reducer = create(UserModel);
        // take agent for changing state
        const { agent,connect,disconnect } = reducer;
        // provide reducer to redux API `createStore`
        const store = createStore(reducer);
        // subscribe state change to redux store by using `store.dispatch`
        connect(store.dispatch);
        // login user
        await agent.login();
        // after login, the state change should be updated into redux
        expect(agent.state).toEqual(store.getState());
        expect(store.getState()).toEqual(remoteUser);
        // after usage, remember disconnecting
        disconnect();
    });

})