# Feature

## Keyword this in method

As we know the method in class is just a normal function, it can be bind to other object, and change the reference about keyword `this` in method. But it won't happen to a `Agent` method, for when we get an `Agent` method, it returns a proxy method which call the `Model` method inside, and it binds this method to `Model instance` forcely by using function api `fn.apply`.

So, a `Agent` method can not change the reference about keyword `this`. This feature is very useful in `Javascript language`.

```typescript
import {
    create,
    Model,
} from "agent-reducer";

describe('keyword `this` in `Agent method`', () => {

    class CounterModel implements Model<number> {

        state: number = 0;

        increase(){
            return this.state+1;
        }

    }

    test('The reference about keyword `this` in `Agent method` is locked on `Model instance`, it can not be changed.', () => {
        const data = {
            state:1
        }
        const {agent,connect,disconnect} = create(CounterModel);
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
```

## Model Sharing

Model Sharing is a feature that makes different `Agents` created from the same `Model instance` sharing state changes synchronously between each others.

`agent-reducer` stores state, caches, listeners in the model instance, so you can share state change synchronously between two or more agent objects by using the same model instance.

```typescript
import {
    create,
    middleWare,
    MiddleWarePresets,
    Action,
    Model
} from 'agent-reducer';

describe('update by observing another agent',()=>{

    // this is a counter model,
    // we can increase or decrease its state
    class Counter implements Model<number> {

        state = 0;  // initial state

        // consider what the method returns as a next state for model
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    const counter = new Counter();

    test('an agent can share state change with another one, if they share a same model instance',()=>{
        // we create two listeners `dispatch1` and `dispatch2` for different agent reducer function
        const dispatch1 = jest.fn().mockImplementation((action:Action)=>{
            // the agent action contains a `state` property,
            // this state is what the model state should be now.
            expect(action.state).toBe(1);
        });
        const dispatch2 = jest.fn().mockImplementation((action:Action)=>{
            expect(action.state).toBe(1);
        });
        // use create api,
        // you can create an `Agent` object from its `Model`
        const reducer1 = create(counter);
        const reducer2 = create(counter);
        // before call the methods,
        // you need to connect it first,
        // you can add a listener to listen the agent action,
        // by using connect function
        reducer1.connect(dispatch1);
        reducer2.connect(dispatch2);
        // calling result which is returned by method `stepUp` will be next state.
        // then reducer1.agent will notify state change to reducer2.agent.
        reducer1.agent.stepUp();

        expect(dispatch1).toBeCalled();     // dispatch1 work
        expect(dispatch2).toBeCalled();     // dispatch2 work
        expect(counter.state).toBe(1);
    });

});

```

The previous example may not be easy for understanding, but consider if we use this feature in a view library like React, we can update state synchronously between different components without `props` or `context`， and these components will rerender synchronously. You can use this feature easily with its React connnector [use-agent-reducer](https://filefoxper.github.io/use-agent-reducer/#/).

The basic usage example of Model sharing has some problems. First, the model state is persistent in memory, if we want to reset it, when the usages are all destroyed, we have to code this every where. Second, if the agent which prepares to change model state is disconnected, the state change will be abandoned.

For resolving the problems above, we provide two API [sharing](/api?id=sharing) and [weakSharing](/api?id=weaksharing). The both APIs have the same param and returns type.

```typescript
// The param type Factory for creating or reseting a `Model instance`,
// it is a callback returns a `Model class` or `Model instance`.
declare type Factory<
    S,
    T extends Model<S> = Model<S>
    > = (...args:any[])=>T|{new ():T};

// The returns type SharingRef.
// We can take the current `Model instance` from property current.
// We can initial a `Model instance` by calling initial.
declare type SharingRef<
    S,
    T extends Model<S>= Model<S>,
    > = {
    // Take the current `Model instance`.
    // If the current `Model instance` is not created,
    // it will call `Factory` to create one.
    current:T,
    // If the Factory callback needs params,
    // call `initial` to create a `Model instance`.
    // The `initial` can only be called when the `current` is not initialed.
    initial:Factory<S, T>
};
```

API `sharing` create a `Model instance` which has a state persistent in memory. The state changes to `Model instance` will never be abandoned.

```typescript
export declare function sharing<
    S,
    T extends Model<S> = Model<S>
    >(factory:Factory<S, T>): SharingRef<S, T>;
```

API `weakSharing` create a `Model instance` which can be reset. When all the `Agents` from `Model instance` are destroyed, it destroys the `Model instance`, and the state changes from these destroyed `Agent` will be abandoned.

If you fetch the `current Model instance` from a unused (or destroyed) `weakSharing`, it always recreates one for your usage.

```typescript
export declare function weakSharing<
    S,
    T extends Model<S>=Model<S>
    >(
    factory:Factory<S, T>,
):SharingRef<S, T>;
```

There is a unit test for analyzing the differences between default `Model Sharing`, `sharing` and `weakSharing`.

```typescript
import {
    create,
    middleWare,
    MiddleWarePresets,
    Action,
    Model,
    sharing,
    weakSharing
} from 'agent-reducer';

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
```

#### Set a initial state to sharing Model

Sometimes, we need to set a initial state to a sharing Model instance. We can use the property from the object returned by API `sharing` or `weakSharing`.

```typescript
import {
    create,
    middleWare,
    MiddleWarePresets,
    Action,
    Model,
    sharing,
    weakSharing
} from 'agent-reducer';

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
```

You have known enough about `agent-reducer`, if you just want to use it for developing, but if you want to do some thing for enhancing your develop environment with `agent-reducer` please go [next](/advanced?id=advanced-usage). If you want use it in react now, we recommend you to take a look at [use-agent-reducer](https://filefoxper.github.io/use-agent-reducer/#/tutorial), in that document, you can learn how to use this tools more actually by taking a using turorial.
