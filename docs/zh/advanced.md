# Advanced usage

## Customized MiddleWare

The official MiddleWares can satisfy the usual usages very well, but sometimes we still need customized MiddleWares for special usages.

Before create a customized MiddleWare, we should know the structure of [MiddleWare](/guides?id=middleware) well, Let's check it again.

A MiddleWare structure should look like:

```typescript
// A `MiddleWare` is a function,
// it is called before method running with a `Runtime` param.
// `Runtime` is an helpful object,
// it contains a lot infos,
// like `Agent`\`Model`\`method name`\`method cache data`...
function middleWareLike(runtime: Runtime):NextProcess|void {

    // Function `nextProcess` is used for connecting the `stateProcess` function from next `MiddleWare`.
    // It is called after method finished immediately,
    // if you returns a void value like `undefined` instead of `nextProcess`,
    // you can skip the method running. 
    return function nextProcess(next: StateProcess): StateProcess {

        // Function `stateProcess` is used for reproducing state,
        // and you can call the `next` to pass the reproduced state to next `stateProcess` function ant time.
        return function stateProcess(state: any) {
            // `next` function is the `stateProcess` function from next `MiddleWare`.
            // If you don't want state change happens,
            // do not call the `next`, just return the state.
            return next(doSomething(state));
        };
    };
}
```

The structure of `Runtime`:

```typescript
export type Runtime<T extends Record<string, any>=any> = {
    // the calling method name
    methodName: string|number;
    // the params passed into method
    args?: any[];
    // the `Agent` object that calling method belong to
    agent: T;
    // the `Model` instance that calling method belong to
    model: T;
    // an running env object which only contains a `expired` property,
    // this property is used for disabling the state change of an `Agent` copy version  
    env: Env;
    // a cache data for MiddleWare,
    // you can store any thing inside this object
    cache: { [key: string]: any };
    // this is a Proxy handler callback,
    // you can create an Proxy object of `Model`,
    // and `Agent` will rebind the running method to the Proxy object.
    mapModel:(handler:ProxyHandler<T>)=>T;
};
```

Now, we will use the knowledge above to create a customized MiddleWare to integrate the [immer.js](https://www.npmjs.com/package/immer) into our method.

```typescript
import {
    create, 
    middleWare, 
    MiddleWarePresets,
    Model, 
    NextProcess, 
    Runtime, 
    StateProcess
} from "agent-reducer";
import {createDraft, finishDraft} from "immer";

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
        let cache: {draft:Record<string, unknown> | null} = {draft:null};

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
                if (listener){
                   Promise.resolve().then(()=>{
                       if(!cache.draft){
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
                if(p!=='state'){
                    target[p]=value;
                    return true;
                }
                if(listener){
                    cache.draft = null;
                    listener(value);
                }else{
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
```

check unit test [advanced.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/en/advanced.test.ts).

The customized `immerMiddleWare` uses the `mapModel` api of `runtime` create a Proxy object to rewrite the `state` get define callback before method is deployed. It changes the keyword `this` to the Proxy object of `Model`, so `this.state` in the method becoming a immer draft, that make us can write state change in a immer style.

In the `immerMiddleWare` we skipped calling the `next` callback, when there is no draft left in the cache, it is a skill to escape the state change, and we have a more simple official MiddleWare called `MiddleWarePresets.takeNothing()` using the same skill.

## Connect with another state changeable library

The `create` API returns an `reducer function`, which contains an `agent` object, an `connect` callback and a `disconnect` callback. 

1. The `agent` is a Proxy which can change state for `Model instance`.
2. The `connect` callback is for subscribing state changes, it accepts a dispatch callback, when the state changed, the dispatch callback can receive an `Action` object, which contains a `type` (method name) and `args` (changed state).
3. The `disconnect` callback is for unsubscribing the state change.

Take a look at the structure.

```typescript
// An action object is passed to the dispatch callback,
// when a state change happens.
export declare type Action = {
    // the type is the method name which changed state yet
    type: string;
    // the args is the newest state.
    args?: any;
};

// you can subscribe state changes by passing it into `connect`,
// which is a callback from API `create` returning `reducer`.
type Dispatch = (action: Action) => any;

export type Reducer<S, A> = (state: S, action: A) => S;

// The padding data in reducer function
interface ReducerPadding<
    S = any,
    T extends OriginAgent<S> = OriginAgent<S>
    > {
    // a proxy object for `Model instance`, 
    // it can cause a state change.
    agent: T;
    // connect `Agent` to `Model instance`,
    // and subscribe state changes for the out usage.
    connect: (dispatch: Dispatch) => void;
    // destroy the connection and unsubscribe state changes for the out usage.
    disconnect:()=>void
}

// reducer function returned by calling API `create`.
// it contains a `connect` callback for subscribing and connecting,
// a `disconnect` for unsubscribing and destroying.
export type AgentReducer<
    S = any,
    T extends OriginAgent<S> = any
    > = Reducer<S, Action> & ReducerPadding<S, T>;
```

We will use `AgentReducer` to create a connection with [redux](https://redux.js.org). And if you are more interesting about how to connect to a view library like `react`, you can take a look at the [source code](https://github.com/filefoxper/use-agent-reducer/blob/master/src/index.ts) of `use-agent-reducer`.

```typescript
import {
    create, 
    middleWare, 
    MiddleWarePresets,
    Model,
} from "agent-reducer";
import {createStore} from "redux";

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
```

It is simple, but it is enough for describing how to connect to another state changeable library.

In [next](/api?id=api-reference) page, we provide the full API for you, take a look, and finish this document.