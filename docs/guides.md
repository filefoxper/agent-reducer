# Guides

## MiddleWare

MiddleWare is designed for reproducing state before state change happens. It is a function returns a connector function to the next one. So, the MiddleWares can be used individually, or be chained together. A MiddleWares chain is still a MiddleWare, and you can use api `applyMiddleWares` to make it happen.

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

## Chain MiddleWares

Every MiddleWare has a particular ability, if you want to compose some MiddleWares together, you can use api `applyMiddleWares`, this api can chain particular MiddleWares to be one, which contains the abilities of all you want to take from.

There is a rule about how to chain MiddleWares, that the prev one provides state for next one. A next MiddleWare should process the state more closer to the final state than the prev one.

We can learn how to chain them from the official api `MiddleWarePresets`. This api provides some useful MiddleWare chains, and we can use these chains directly. But before use them, we should know they are not the origin atom MiddleWare, the official atom MiddleWare set is stored in api `MiddleWares`, and the MiddleWares in api `MiddleWarePresets` are the chaining from the atom MiddleWares.

Let's take a look at `MiddleWarePresets.takePromiseResolveAssignable()`.

```typescript
static takePromiseResolveAssignable():MiddleWare {
    return applyMiddleWares(
      // atom MiddleWare takePromiseResolve,
      // it pass a no promise data to next,
      // if the data is a promise,
      // it wait for the promise resolving,
      // then pass the resolve data to next.
      MiddleWares.takePromiseResolve(),
      // atom MiddleWare takeAssignable,
      // it merges the passed state with Model state shallowlly,
      // and pass the merged data to next. 
      MiddleWares.takeAssignable(),
    );
  }
```

This MiddleWare is chained by `MiddleWares.takePromiseResolve()` and `MiddleWares.takeAssignable()`. The first MiddleWare take the promise resolve data and pass it into the second one, then the second can use this data merge with `Model state`, and generate a final new state for `Model`.

## MiddleWare override

We have introduced how to add MiddleWare onto a method in [introduction page](/introduction?id=middleware). In this section, we will make a supplement about how to override the current MiddleWare on an `agent method`.

The MiddleWare can be override by its using priority. We will introduce the priority of MiddleWare override from low to high.

Let's take a look at the test about a `User` model:

``` typescript
import {
    create, 
    middleWare, 
    MiddleWarePresets,
    Model, 
    withMiddleWare,
} from "agent-reducer";

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

        updateCurrentUserName(name:string){
            return {name,nick:name};
        }

        @middleWare(MiddleWarePresets.takeNothing())
        updateCurrentUserNick(nick:string){
            return {nick};
        }

    }

    test('The lowest priority by using class decorator', async () => {
        const {agent,connect,disconnect} = create(UserModel);
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
        agent.updateCurrentUserName('name1');
        expect(agent.state).not.toHaveProperty('id');
        disconnect();
    });

    test('The MiddleWare added by api `create` can override the one added by using class decorator',async ()=>{
        const {agent,connect,disconnect} = create(UserModel,MiddleWarePresets.takePromiseResolveAssignable());
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
        agent.updateCurrentUserName('name1');
        expect(agent.state).toHaveProperty('id');
        disconnect();
    });

    test('The MiddleWare added by method decorator can override the two ways above',async ()=>{
        const {agent,connect,disconnect} = create(UserModel,MiddleWarePresets.takePromiseResolveAssignable());
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
        agent.updateCurrentUserName('name1');
        expect(agent.state).toHaveProperty('id');
        // The MiddleWare added by method decorator override the other MiddleWares,
        // but it only effect on the method.
        agent.updateCurrentUserNick('nick1');
        // `MiddleWarePresets.takeNothing()` abandons all the state changes,
        // so state.nick is not change.
        expect(agent.state.nick).not.toBe('nick1');
        disconnect();
    });

    test('API `withMiddleWare` has a highest priority',async ()=>{
        const {agent,connect,disconnect} = create(UserModel,MiddleWarePresets.takePromiseResolveAssignable());
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
        agent.updateCurrentUserName('name1');
        expect(agent.state).toHaveProperty('id');

        const {updateCurrentUserNick} = withMiddleWare(agent,MiddleWarePresets.takeAssignable());
        // The MiddleWare added by method decorator is override by the one added from `withMiddleWare`,
        // `withMiddleWare` copy a new agent for override.
        updateCurrentUserNick('nick1');
        // `MiddleWarePresets.takeNothing()` is override by `MiddleWarePresets.takeAssignable()` temporarily
        expect(agent.state.nick).toBe('nick1');
        disconnect();
    });

});
```

check unit test [guides.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/en/guides.test.ts).

From the example above, we can know that the MiddleWare priority is:

```
class decorator < create api < method decorator < withMiddleWare api
```

As we know the API `withMiddleWare` can use a highest priority MiddleWare on a `Agent` copy object. Why we have to base this `MiddleWare` on a `Agent` copy object? The primary reason is we do not want to make effect to the origin `Agent` usage, the secondary is about `Lifecycle MiddleWare`. In next section, we will introduce what is a `Lifecycle MiddleWare`.

## Lifecycle MiddleWare

Lifecycle MiddleWare is a special kind of MiddleWare which can control the state change ability of `Agent`. When an `Agent` is disabled by it, the `Agent` can not change state anyway. 

The official Lifecycle MiddleWare is `LifecycleMiddleWares.takeLatest()`. When it makes a state change finish, it disables the current `Agent`, and rebuild one to replace the old one, so the old one can not change state again, the next state change only can be happened in the new `Agent`. In simple terms, every `Agent` can change state once, and the state change happens with an order, one by one. This Lifecycle MiddleWare is often used with `takePromiseResolve()`, and we have chained to be a new MiddleWare `MiddleWarePresets.takeLatest()` for normal usage.

Here is a example about fetch to-do list by page change. And we can know what `MiddleWarePresets.takeLatest()` can do after read it.

```typescript
import {
    create, 
    middleWare, 
    MiddleWarePresets,
    Model, 
    withMiddleWare,
} from "agent-reducer";

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
```

check unit test [guides.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/en/guides.test.ts).

So we have know what a Lifecycle MiddleWare can do, but how it can work like this, and how we can write a customized Lifecycle MiddleWare?

The structure of Lifecycle MiddleWare is almost the same as a normal MiddleWare. The only different is the MiddleWare param `Runtime`. Lifecycle MiddleWare has a rebuild able `Runtime` param.

```typescript
export interface LifecycleEnv extends Env {
  expire: () => void;
  rebuild: () => void;
}

export interface LifecycleRuntime<T = any> extends Runtime<T> {
  env: LifecycleEnv;
}

export type LifecycleMiddleWare = (<T>(
  runtime: LifecycleRuntime<T>
) => NextProcess | void)
```

We can use `LifecycleRuntime.env.expire` to disable the current `Agent`, or use `LifecycleRuntime.env.rebuild` to disable the current `Agent`, and create a new one to replace it.

If we want to use the Lifecycle feature to our customized MiddleWare, we should use API `toLifecycleMiddleWare` to mark it, then `agent-reducer` system can recognize it as a real Lifecycle MiddleWare.

In `agent-reducer`, there are some useful official MiddleWares, if you are interest in them, please read how to use them in API `MiddleWarePresets`.

## Effect

If we want to do some thing after state change happens, we can add a Effect callback to `Model` or its `Agent` by using API `addEffect`. A Effect callback accepts a previous state, a current state and a method name as its params.

```typescript
export type EffectCaller<S, T extends OriginAgent<S>> = (
    // previous state
    prev:S,
    // current state
    current:S,
    // method name
    methodName?:keyof T
) => (()=>void)|void;
```

There are two different Effects, Model state listener Effect and Method state listener Effect.

#### Model state listener Effect

When add a Effect callback to `Model` or `Agent`, the Effect can listen all the state change, and we call it a `Model state listener Effect`. 

The `Model state listener Effect` will be called forcely by API `addEffect` immediately, after that, when a Model state change happens, it will be called again. The difference between Effect mount calling and state change calling is that every state change is caused by method, and at this time, the Effect accepts a methodName, but when the Effect mounts in, the state change does not happens, so the previous state is equal with the current state, and the param methodName is a `undefined` value.

```typescript
import {
    create, 
    middleWare, 
    MiddleWarePresets,
    Model, 
    withMiddleWare,
    addEffect,
} from "agent-reducer";

describe('use API `addEffect` to listen state changes', () => {

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

    // this is a to-do list model,
    // we can fetch list from server.
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>> {

        state = [];

        fetch = (): (Promise<Array<Todo>>) => {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        clear(): Promise<Array<Todo>> {
            return Promise.resolve([]);
        }

    }

    test('use api `addEffect` to listen Model state change', async () => {
        // An effect callback accepts a prev state, a current state and a undefined-able type as params,
        // you can do anythings in the callback.
        const effectCall = jest.fn().mockImplementation((prev, current, type?: string) => {
            // If the effect is added for listening the model state, it will be called immediately,
            // and the type will be undefined.
            if (!type) {
                expect(prev).toEqual(current);
                return;
            }
            // When the state change happens we can get a previous state and a current state.
            // In the case of state updating, the param type is the method name which leads this change.
            expect(prev).not.toEqual(current);
        });
        const {agent, connect, disconnect} = create(TodoList);
        connect();
        // API `addEffect` accepts a callback and a `model instance` or `agent` as params.
        // When state of `model instance` or `agent` changes, effect calls the callback.
        addEffect<Array<Todo>, TodoList>(effectCall, agent);
        await agent.fetch();
        await agent.clear();
        disconnect();
        // we have change state by calling method `fetch` and `clear`,
        // both state changes make the effect callback runs.
        expect(effectCall).toBeCalledTimes(3);
    });

});
```

check unit test [guides.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/en/guides.test.ts).

#### Method state listener Effect

When add a Effect callback to `Model method` or `Agent method`, the Effect only listen the state changes which caused by this method, and we call it a `Method state listener Effect`. 

The `Method state listener Effect` only can be called by `state changes` from the particular method we want listen to.

```typescript
import {
    create, 
    middleWare, 
    MiddleWarePresets,
    Model, 
    withMiddleWare,
    addEffect,
} from "agent-reducer";

describe('use API `addEffect` to listen state changes', () => {

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

    // this is a to-do list model,
    // we can fetch list from server.
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>> {

        state = [];

        fetch = (): (Promise<Array<Todo>>) => {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        clear(): Promise<Array<Todo>> {
            return Promise.resolve([]);
        }

    }

    test('use api `addEffect` to listen Method state changes', async () => {
        // If the effect is used for listening the state changes from a particular method,
        // the param `type` will be useless, it always be the name of the method,
        // which you want listen to.
        const effectCall = jest.fn().mockImplementation((prev, current) => {
            // The method effect can only be called when state changes,
            // so, it doesn't run immediately when it is added in.
            expect(prev).not.toEqual(current);
        });
        const model = new TodoList();
        const {agent, connect, disconnect} = create(model);
        connect();
        // add effect to listen method `model.fetch` or `agent.fetch`
        addEffect<Array<Todo>, TodoList>(effectCall, model.fetch);
        await agent.fetch();
        // method `clear` will not lead the effect calling
        await agent.clear();
        disconnect();
        expect(effectCall).toBeCalledTimes(1);
    });

});
```

#### Cancel Effect

The API `addEffect` returns a callback for cancel it.

```typescript
import {
    create, 
    middleWare, 
    MiddleWarePresets,
    Model, 
    withMiddleWare,
    addEffect,
} from "agent-reducer";

describe('use API `addEffect` to listen state changes', () => {

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

    // this is a to-do list model,
    // we can fetch list from server.
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>> {

        state = [];

        fetch = (): (Promise<Array<Todo>>) => {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        clear(): Promise<Array<Todo>> {
            return Promise.resolve([]);
        }

    }

    test('`Effect` can be cancelled', async () => {
        // An effect callback accepts a prev state, a current state and a undefined-able type as params,
        // you can do anythings in the callback.
        const effectCall = jest.fn().mockImplementation((prev, current, type?: string) => {
            // If the effect is added for listening the model state, it will be called immediately,
            // and the type will be undefined.
            if (!type) {
                expect(prev).toEqual(current);
                return;
            }
            // When the state change happens we can get a previous state and a current state.
            // In the case of state updating, the param type is the method name which leads this change.
            expect(prev).not.toEqual(current);
        });
        const {agent, connect, disconnect} = create(TodoList);
        connect();
        // API `addEffect` accepts a callback and a `model instance` or `agent` as params.
        // When state of `model instance` or `agent` changes, effect calls the callback.
        const cancelEffect = addEffect<Array<Todo>, TodoList>(effectCall, agent);
        await agent.fetch();
        // call the addEffect returns to cancel effect
        cancelEffect();
        await agent.clear();
        disconnect();
        // We have change state by calling method `fetch` and `clear`,
        // the state change of `clear` happens after the effect canceling.
        // So, it can not be listened.
        expect(effectCall).toBeCalledTimes(2);
    });

});
```

#### The Effect can return a callback for destroying

The Effect can return a callback for destroying. The destroy callback is called when effect is deployed again, or when the `Model` disconnecting happens. Only when all `Agents` from `Model instance` are disconnected, the `Model` disconnecting happens.

The destroy callback is also called when a effect is canceled.

Example:

```typescript
import {
    create, 
    middleWare, 
    MiddleWarePresets,
    Model, 
    withMiddleWare,
    addEffect,
} from "agent-reducer";

describe('The effect callback can return a destroy callback',()=>{

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

    // this is a to-do list model,
    // we can fetch list from server.
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>> {

        state = [];

        fetch(): (Promise<Array<Todo>>) {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        clear(): Promise<Array<Todo>> {
            return Promise.resolve([]);
        }

    }

    test('If the `Model` is in sharing, the last destroy happens at the time when the last `Agent` is disconnected.',async ()=>{
        const destroy = jest.fn().mockReset();
        const effectCall = jest.fn().mockImplementation((prev, current, type?: string) => {
            return destroy;
        });
        const todoListRef = new TodoList();
        const {agent, connect, disconnect} = create(todoListRef);
        const {agent:another, connect:anotherConnect, disconnect:anotherDisconnect} = create(todoListRef);
        connect();
        anotherConnect();
        // API `addEffect` accepts a callback and a `model instance` or `agent` as params.
        // When state of `model instance` or `agent` changes, effect calls the callback.
        addEffect<Array<Todo>, TodoList>(effectCall, agent);
        await agent.fetch();
        await agent.clear();
        disconnect();
        // we have change state by calling method `fetch` and `clear`,
        // both state changes make the effect callback runs.
        expect(effectCall).toBeCalledTimes(3);
        // destroy by the method updating from `fetch` and `clear`
        expect(destroy).toBeCalledTimes(2);
        // destroy by all `Agents` disconnecting
        anotherDisconnect();
        expect(destroy).toBeCalledTimes(3);
    });

    test('The destroy callback is also called when a effect is canceled',async ()=>{
        const destroy = jest.fn().mockReset();
        const effectCall = jest.fn().mockImplementation((prev, current, type?: string) => {
            return destroy;
        });
        const todoListRef = new TodoList();
        const {agent, connect, disconnect} = create(todoListRef);
        const {agent:another, connect:anotherConnect, disconnect:anotherDisconnect} = create(todoListRef);
        connect();
        anotherConnect();
        // API `addEffect` accepts a callback and a `model instance` or `agent` as params.
        // When state of `model instance` or `agent` changes, effect calls the callback.
        const unEffect = addEffect<Array<Todo>, TodoList>(effectCall, agent);
        await agent.fetch();
        await agent.clear();
        disconnect();
        // we have change state by calling method `fetch` and `clear`,
        // both state changes make the effect callback runs.
        expect(effectCall).toBeCalledTimes(3);
        // destroy by the method updating from `fetch` and `clear`
        expect(destroy).toBeCalledTimes(2);
        // destroy by cancel effect
        unEffect();
        expect(destroy).toBeCalledTimes(3);
    });

});
```

#### Do not add Effect to an unconnected Model

Do not add Effect to an unconnected Model.

``` typescript
import {
    create, 
    middleWare, 
    MiddleWarePresets,
    Model, 
    withMiddleWare,
    addEffect,
} from "agent-reducer";

describe('use API `addEffect` to listen state changes', () => {

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

    // this is a to-do list model,
    // we can fetch list from server.
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>> {

        state = [];

        fetch = (): (Promise<Array<Todo>>) => {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        clear(): Promise<Array<Todo>> {
            return Promise.resolve([]);
        }

    }

    test('do not addEffect to an unconnected `Model`',()=>{
        const effectCall = jest.fn().mockImplementation((prev, current, type?: string) => {
            if (!type) {
                expect(prev).toEqual(current);
                return;
            }
            expect(prev).not.toEqual(current);
        });
        const {agent} = create(TodoList);
        // warning about addEffect to an unconnected `Model`
        expect(()=>addEffect<Array<Todo>, TodoList>(effectCall, agent)).toThrow();
    });

});
```

check unit test [guides.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/en/guides.test.ts).

In next page we introduces some useful features, please do not miss that. Go [next](/feature?id=feature) for learning the most popular features in `agent-reducer`.

