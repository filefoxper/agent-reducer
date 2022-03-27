# Guides

## MiddleWare

MiddleWare is designed for reproducing state before state change happens. It is a function returns a connector function to the next one. So, the MiddleWares can be used individually, or be chained together. A MiddleWares chain is still a MiddleWare, and you can use API [applyMiddleWares](/api?id=applymiddlewares) to make it happen.

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

We can learn how to chain them from the official api [MiddleWarePresets](/api?id=middlewarepresets). This api provides some useful MiddleWare chains, and we can use these chains directly. But before use them, we should know they are not the origin atom MiddleWare, the official atom MiddleWare set is stored in api [MiddleWares](/api?id=middlewares), and the MiddleWares in api `MiddleWarePresets` are the chaining from the atom MiddleWares.

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

This MiddleWare is chained by [MiddleWares.takePromiseResolve()](/api?id=takepromiseresolve) and [MiddleWares.takeAssignable()](/api?id=takeassignable). The first MiddleWare take the promise resolve data and pass it into the second one, then the second can use this data merge with `Model state`, and generate a final new state for `Model`.

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

As we know the API [withMiddleWare](/api?id=withmiddleware) can use a highest priority MiddleWare on a `Agent` copy object. Why we have to base this `MiddleWare` on a `Agent` copy object? The primary reason is we do not want to make effect to the origin `Agent` usage, the secondary is about `Lifecycle MiddleWare`. In next section, we will introduce what is a `Lifecycle MiddleWare`.

## Lifecycle MiddleWare

Lifecycle MiddleWare is a special kind of MiddleWare which can control the state change ability of `Agent`. When an `Agent` is disabled by it, the `Agent` can not change state anyway. 

The official Lifecycle MiddleWare is [LifecycleMiddleWares.takeLatest()](/api?id=takelatest). When it makes a state change finish, it disables the current `Agent`, and rebuild one to replace the old one, so the old one can not change state again, the next state change only can be happened in the new `Agent`. In simple terms, every `Agent` can change state once, and the state change happens with an order, one by one. This Lifecycle MiddleWare is often used with `takePromiseResolve()`, and we have chained to be a new MiddleWare `MiddleWarePresets.takeLatest()` for normal usage.

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

If we want to use the Lifecycle feature to our customized MiddleWare, we should use API [toLifecycleMiddleWare](/api?id=tolifecyclemiddleware) to mark it, then `agent-reducer` system can recognize it as a real Lifecycle MiddleWare.

In `agent-reducer`, there are some useful official MiddleWares, if you are interest in them, please read how to use them in API `MiddleWarePresets`.

## Effect

From `agent-reducer@4.2.0` we add some new APIs: [addEffect](/api?id=addeffect), [effect](/api?id=effect). These APIs are created for listening the state change of a model instance, and do some addition work for completing the whole mission.

```typescript
addEffect((prevState, currentState, methodName)=>{
    // `prevState` is the model state before this change.
    // `currentState` is the model state right now.
    // `methodName` is the name of model or agent method
    // which leads this change.
    // If this effect is caused by effect mount,
    // param `methodName` is `null`.
    ......
    // return function destroy() {
    //   ......
    // }
    // if returns a function, 
    // this function will be called before effect callback triggered again. 
    // It is often used for clean or destroy something.
},model, method);
```

### Model effect

If you want to listen to all the state changes of model, you can add a effect `callback` and a model instance (or an agent) as params into API [addEffect](/api?id=addeffect) like: `addEffect(callback, model)`, the `callback` will be triggered as soon as there is no running mission for model instance, and then everytime when the state change of model happens, it can be triggered again, until the effect is unmounted manually or automatically by model destroying.

Listen to all the state changes of model (model effect):

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

class CountModel implements Model<number> {

    state = 0;

    increase() {
        return this.state + 1;
    }

    decrease() {
        return this.state - 1;
    }

    reset() {
        return 0;
    }

}

describe('the basic usage about effect', () => {

    test('use model effect', () => {
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        // effect callback accepts params: prevState, state, methodName
        const effectCallback: EffectCallback<number> = jest.fn((prev,state) => {
            if (state < 0) {
                // time: 3
                // if the state is lt 0,
                // use `agent.reset` method to set state to 0,
                // reset makes state change happen,
                // so it triggers this effect callback too.
                agent.reset();
            }
        });
        // time: 1
        // add effect callback to listen the model state change,
        // the callback is called immediately,
        // and the current state is a initial state 0,
        // so, it will not call `agent.reset`.
        addEffect(effectCallback, model);

        // time: 2
        // decrease method make the state to be -1,
        // but the effect callback is triggered,
        // then the `agent.reset` method reset state to 0
        agent.decrease();
        expect(agent.state).toBe(0);

        // time: 4
        // increase method make the state to be 1,
        // and the effect callback is triggered,
        // but the current state can not make `agent.reset` start.
        agent.increase();
        expect(agent.state).toBe(1);
        // watch the time mark
        expect(effectCallback).toBeCalledTimes(4);
        disconnect();
    });

});
```

### Method effect

If you want to listen to state changes leaded by specific `method`, you can add `callback`, `model`, `method` as params into API `addEffect`, like: `addEffect(callback, model, method)`. Then only the state changes leaded by this specific `method` can trigger `effect callback`.

Listen on the state changes leaded by this specific `method` (method effect):

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

class CountModel implements Model<number> {

    state = 0;

    increase() {
        return this.state + 1;
    }

    decrease() {
        return this.state - 1;
    }

    reset() {
        return 0;
    }

}

describe('the basic usage about effect', () => {

    test('use method effect', () => {
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const effectCallback: EffectCallback<number> = jest.fn((prev,state) => {
            if (state < 0) {
                // if the state is lt 0,
                // use `agent.reset` method to set state to 0
                agent.reset();
            }
        });

        // add effect on the `decrease` method,
        // and filter the state changes from `decrease` method.
        // It only triggered by the method `decrease` state change.
        addEffect(effectCallback, model, model.decrease);

        // `decrease` state to -1 lead to `reset`
        agent.decrease();
        expect(agent.state).toBe(0);
        agent.increase();
        expect(agent.state).toBe(1);
        // the `increase` above can not trigger effect callback,
        // which only filter the state change from `decrease` method.
        expect(effectCallback).toBeCalledTimes(1);
        disconnect();
    });

});
```

Listen on a agent or a agent method:

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

class CountModel implements Model<number> {

    state = 0;

    increase() {
        return this.state + 1;
    }

    decrease() {
        return this.state - 1;
    }

    reset() {
        return 0;
    }

}

describe('the basic usage about effect', () => {

    test('we can add effect onto a agent or method from agent too', () => {
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const effectCallback: EffectCallback<number> = jest.fn();

        const decreaseEffectCallback: EffectCallback<number> = jest.fn((prev,state) => {
            if (state < 0) {
                agent.reset();
            }
        });

        // add effect onto a agent is same as add it onto the model
        addEffect(effectCallback, agent);

        // add effect onto a agent method is same as add it onto the model method
        addEffect(decreaseEffectCallback, agent, agent.decrease);

        agent.decrease();
        expect(agent.state).toBe(0);
        agent.increase();
        expect(agent.state).toBe(1);
        expect(effectCallback).toBeCalledTimes(4);
        expect(decreaseEffectCallback).toBeCalledTimes(1);
        disconnect();
    });

});
```

### Effect destroy

If the effect callback returns a `function`, this `function` is also called destroy function, and it is always called before its effect callback be triggered again. Also, it will be called when the effect is unmounted from model instance.

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

class CountModel implements Model<number> {

    state = 0;

    increase() {
        return this.state + 1;
    }

    decrease() {
        return this.state - 1;
    }

    reset() {
        return 0;
    }

}

describe("use effect destroy callback",()=>{

    test('use destroy callback returned from effect callback',()=>{
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const destroy = jest.fn();

        const effectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
            if(state<0){
                agent.reset();
            }
            // if the effect callback returns a destroy callback,
            // the destroy callback will be invoked every time before effect callback
            // running again.
            // It will also be invoked when the disconnect method has destroyed all agent connections on model
            return destroy;
        });

        addEffect(effectCallback, model, model.decrease);

        // first time to trigger effect, so the destroy callback will not be invoked.
        agent.decrease();
        expect(agent.state).toBe(0);

        expect(effectCallback).toBeCalledTimes(1);
        expect(destroy).toBeCalledTimes(0);

        // trigger effect again, before the effect callback running,
        // the destroy callback is invoked.
        agent.decrease();
        expect(agent.state).toBe(0);

        expect(effectCallback).toBeCalledTimes(2);
        expect(destroy).toBeCalledTimes(1);

        // disconnect make destroy work last time.
        disconnect();
        expect(destroy).toBeCalledTimes(2);
    });

});
```

### Effect update and unmount

When all the model connections are destroyed, the effects on model or model methods are often unmounted automatically. But, if you want to unmount effect manually, you can try the `unmount` method from a `addEffect` API callback returns.

How to use unmount:

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

class CountModel implements Model<number> {

    state = 0;

    increase() {
        return this.state + 1;
    }

    decrease() {
        return this.state - 1;
    }

    reset() {
        return 0;
    }

}

describe("use other abilities of effect",()=>{

    test('unmount effect manually',()=>{
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const destroy = jest.fn();

        const effectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
            if(state<0){
                agent.reset();
            }
            return destroy;
        });

        const {unmount} = addEffect(effectCallback, model,'decrease');

        agent.decrease();
        expect(agent.state).toBe(0);

        expect(effectCallback).toBeCalledTimes(1);
        // unmount here
        unmount();
        // when the effect is unmounted, the destroy callback runs.
        expect(destroy).toBeCalledTimes(1);

        // there is no effect for decrease method now,
        // so, the state is decreased to -1
        agent.decrease();
        expect(agent.state).toBe(-1);

        expect(effectCallback).toBeCalledTimes(1);
        // there is no effect for decrease method now,
        // so, the destroy callback will not be invoked.
        expect(destroy).toBeCalledTimes(1);

        disconnect();
        expect(destroy).toBeCalledTimes(1);
    });

});
```

Sometimes we need to update the effect callback manually, so, `update` method from `addEffect` API returns is a good choice.

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

class CountModel implements Model<number> {

    state = 0;

    increase() {
        return this.state + 1;
    }

    decrease() {
        return this.state - 1;
    }

    reset() {
        return 0;
    }

}

describe("use other abilities of effect",()=>{

    test('use update method for updating the effect callback',()=>{
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const effectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
            if(state<0){
                agent.reset();
            }
        });

        const effect = addEffect(effectCallback, model, 'decrease');

        agent.decrease();
        expect(agent.state).toBe(0);

        // update effect callback to another callback
        effect.update(jest.fn());

        agent.decrease();
        // the new effect callback is a mock function,
        // it can not reset state.
        expect(agent.state).toBe(-1);

        expect(effectCallback).toBeCalledTimes(1);

        disconnect();
    });

});
```

In next page we introduces some useful features, please do not miss that. Go [next](/feature?id=feature) for learning the most popular features in `agent-reducer`.

