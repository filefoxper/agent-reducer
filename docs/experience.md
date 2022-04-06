# Experience

We have add some experience features and APIs. These features and APIs may be changing in future, and we suppose you try them privately not in your production codes. If you want to use them please set `process.env.AGENT_REDUCER_EXPERIENCE` to `OPEN` or call API `experience` before use `agent-reducer`.

## Guides

Before `agent-reducer@4.2.0`, we have to write `data request` in a state changable method, and add `middleWares` to make it work as we wish like `MiddleWares.takePromiseResolve()`. Now we add `effect` and `flow` system directly to our model, and we can use them to split the code about `data request` and `state change`. For doing that, we can use less `middleWare` (the best way is not using `middleWare`). 

Why not `middleWare`? The `middleWare` system works well, but there are some problems:

1. too complex, no matter how flex it is, we have to know the `MiddleWare thinking` is too complex, it need you consider too much things like: `how to keep state change one by one`, `which part of middleWare works first` and so on.
2. can not catch error from `middleWare` like `takeUnstableDebounce`.
3. some `middleWares` like `takeNothing` is not natural enough for usage.
4. `runtime` has too much properies which are not easy to understand.

The `flow` decorator can resolve these problem, and with it, you can stop considering the state change order problem.

### Flow (experience)

We have used to write a model class with some action methods for reducing next state, and write more complex work flow codes outside the model. For example, when we want to complete a page query work, we need to make it loading first, then deploy a model method to fetch data and change model state, finally, we should turn off the loading. So, we have to do things to change loading state outside the model, or write turn up and turn off loading code in different methods. it split one work flow to different parts. 

Now, we suppose you to try decorator `@flow`, and join these work flow parts
together inside a model method. We call this method a `flow method`.

In a `flow method`, keyword `this` is an agent object created temporarily for a work flow. That means you can call normal `action methods` in these `flow methods` for state process and state change. 

The below codes shows how to use `@flow`.

```typescript
import {Flows, flow, create, effect, experience, Model} from "agent-reducer";

describe('how to use flow', () => {

    type User = {
        id: number,
        name: string
    };

    type UserListState = {
        source: User[] | null,
        list: User[],
        filterName: string,
        loading: boolean,
    }

    const dataSource: User[] = [
        {id: 1, name: 'Jimmy'},
        {id: 2, name: 'Jacky'},
        {id: 3, name: 'Lucy'},
        {id: 4, name: 'Lily'},
        {id: 5, name: 'Nike'},
    ];

    class UserListModel implements Model<UserListState> {

        state: UserListState = {
            source: [],
            list: [],
            filterName: '',
            loading: false,
        };

        private load() {
            return {...this.state, loading: true};
        }

        private unload() {
            return {...this.state, loading: false};
        }

        private filterList(source: User[], filterName: string) {
            const list = source!.filter(({name}) => name.startsWith(filterName));
            return {...this.state, source, filterName, list};
        }

        private changeSource(source: User[] | null) {
            const {filterName} = this.state;
            return this.filterList(source || [], filterName);
        }

        // use decorator flow to make a flow method
        @flow()
        async loadSource() {
            // flow method can call action method to change state,
            // and make `state.loading` to be `true`.
            this.load();
            try {
                // fetch users from remote service
                const source: User[] = await new Promise((resolve) => {
                    resolve([...dataSource]);
                });
                // flow method can call action method to change state,
                // and change source
                this.changeSource(source);
            } finally {
                // after all jobs, we need to set loading to 'false'
                this.unload();
            }
        }

    }

    test('try flow method, it can organize action methods together as a work flow', async () => {
        const {agent, connect, disconnect} = create(UserListModel);
        const changes: string[] = [];
        connect((action) => {
            changes.push(action.type);
        });
        // there are 3 action methods: load, changeSource, unload
        await agent.loadSource();
        expect(agent.state.source).toEqual(dataSource);
        expect(changes.length).toBe(3);
        disconnect();
    });

});
```

A flow method can use another one inside, and the inside one will lose its own `WorkFlow` mode, use the mode from current flow method.

```typescript
import {Flows, flow, create, effect, experience, Model} from "agent-reducer";

describe('how to use flow', () => {

    type User = {
        id: number,
        name: string
    };

    type UserListState = {
        source: User[] | null,
        list: User[],
        filterName: string,
        loading: boolean,
    }

    const dataSource: User[] = [
        {id: 1, name: 'Jimmy'},
        {id: 2, name: 'Jacky'},
        {id: 3, name: 'Lucy'},
        {id: 4, name: 'Lily'},
        {id: 5, name: 'Nike'},
    ];

    class UserListModel implements Model<UserListState> {

        state: UserListState = {
            source: [],
            list: [],
            filterName: '',
            loading: false,
        };

        private load() {
            return {...this.state, loading: true};
        }

        private changeFilterName(filterName: string) {
            return {...this.state, filterName};
        }

        private changeSource(source: User[] | null) {
            const {filterName} = this.state;
            return this.filterList(source || [], filterName);
        }

        private unload() {
            return {...this.state, loading: false};
        }

        private filterList(source: User[], filterName: string) {
            const list = source!.filter(({name}) => name.startsWith(filterName));
            return {...this.state, source, filterName, list};
        }

        // use `Flows` to set a debounce work flow
        @flow(Flows.debounce(200))
        private filterDebounce() {
            const {source, filterName} = this.state;
            this.filterList(source || [], filterName);
        }

        // use decorator flow to make a flow method,
        // set `Flows.latest()` to take the newest state changes of
        // this flow method.
        @flow(Flows.latest())
        async loadSource() {
            // flow method can call action method to change state,
            // and make `state.loading` to be `true`.
            this.load();
            try {
                // fetch users from remote service
                const source: User[] = await new Promise((resolve) => {
                    resolve([...dataSource]);
                });
                // flow method can call action method to change state,
                // and change source
                this.changeSource(source);
            } finally {
                // after all jobs, we need to set loading to 'false'
                this.unload();
            }
        }

        @flow()
        changeFilterNameThenFilter(filterName:string){
            this.changeFilterName(filterName);
            // the flow method called by others,
            // can not keep its own `WorkFlow`,
            // it shares a new `WorkFlow` from the current one.
            this.filterDebounce();
        }

        @flow()
        changeFilterNameThenFilterDebounce(filterName:string){
            this.changeFilterName(filterName);
            // `flow.on` can keep `WorkFlow` inside the flow method.
            flow.on(this).filterDebounce();
        }

    }

    test('An flow method can call another one with the same `WorkFlow`', async () => {
        const {agent, connect, disconnect} = create(UserListModel);
        const changes: string[] = [];
        connect(({state}) => {
            changes.push(state);
        });
        // there are 3 action methods: load, changeSource, unload
        await agent.loadSource();
        // there are 2 action methods: changeFilterName, filterList
        agent.changeFilterNameThenFilter('Lucy');
        // there are 2 action methods: changeFilterName, filterList
        agent.changeFilterNameThenFilter('Lily');
        await new Promise((resolve) => setTimeout(resolve,500));

        expect(changes.length).toBe(7);
        expect(agent.state.list).toEqual([{id: 4, name: 'Lily'}]);
        disconnect();
    });

    test('An flow method can call another one, if we want to keep the origin `WorkFlow` of the inside one, we can use API `flow.on`', async () => {
        const {agent, connect, disconnect} = create(UserListModel);
        const changes: string[] = [];
        connect(({state}) => {
            changes.push(state);
        });
        // there are 3 action methods: load, changeSource, unload
        await agent.loadSource();
        // there are 1 action methods: changeFilterName
        agent.changeFilterNameThenFilterDebounce('Lucy');
        // there are 2 action methods: changeFilterName, filterList
        agent.changeFilterNameThenFilterDebounce('Lily');
        await new Promise((resolve) => setTimeout(resolve, 500));

        expect(changes.length).toBe(6);
        expect(agent.state.list).toEqual([{id: 4, name: 'Lily'}]);
        disconnect();
    });

});
```

There is a way to catch the error throw from `flows` or `effects`.

```typescript
import {Flows, flow, create, effect, experience, middleWare, MiddleWarePresets, Model} from "agent-reducer";

type User = {
    id?:number,
    username:string,
    role?:'master'|'user'|'guest',
    password?:string
    name?:string,
    age?:number,
    sex?:'male'|'female'
};

class UserModel implements Model<User>{

    state:User = {
        username:'guest'
    };

    login(username:string,password:string):User{
        return {username,password};
    }

    loginSuccess(user:User):User{
        return user;
    }

    @middleWare(MiddleWarePresets.takePromiseResolve())
    modifyPassword(oldPassword:string){
        const {username} = this.state;
        return new Promise((resolve, reject)=>{
            if(username=='nike'&&oldPassword==='123'){
                resolve({id:1,username:'nike',name:'nick',age:18,sex:'male',role:'guest'});
            }else{
                reject('error username or password');
            }
        });
    }

    @flow()
    @effect(()=>UserModel.prototype.login)
    async loginEffect(prevState:User){
        const {username,password} = this.state;
        if(!password){
            throw new Error('password must not be empty');
        }
        return this.loginDirect(username,password);
    }

    @flow()
    async loginDirect(username:string,password:string){4
        const user:User = await new Promise((resolve, reject)=>{
            if(username=='nike'&&password==='123'){
                resolve({id:1,username:'nike',name:'nick',age:18,sex:'male',role:'guest'});
            }else{
                reject('error username or password');
            }
        });
        return this.loginSuccess(user);
    }

}

describe('subscribe error',()=>{

    test('try error username, and catch error by use API `act.error`',async ()=>{
        const {agent, connect, disconnect} = create(UserModel);
        connect();
        let exception:string='';
        flow.error(agent,(error,methodName)=>{
            exception = `error from method "${methodName}":${error}`;
        });
        agent.login('nik','123');
        await new Promise((resolve)=>setTimeout(resolve));

        expect(exception).toBe(`error from method "loginEffect":error username or password`);
        disconnect();
    });

    test('try unError',async ()=>{
        const {agent, connect, disconnect} = create(UserModel);
        connect();
        let exception:string='';
        const unsubscribe = flow.error(agent,(error,methodName)=>{
            exception = `error from method "${methodName}":${error}`;
        });
        agent.login('nike','123');
        await Promise.resolve();
        unsubscribe();
        try {
            await agent.modifyPassword('12');
        }catch (e) {
            expect(e).toBe('error username or password');
        }
        expect(exception).toBe('');
        disconnect();
    });
})

```

### Effect decorator (experience)

If you want to add effect inside model, and start it after this model is connected, you can use api [effect](/experience?id=effect-experience) to decorate a model method to be a effect callback. If you pass `*` into [effect](/experience?id=effect-experience) decorator, it will take all the methods of current model instance as the listening target. If you pass a callback which returns a method of current model into [effect](/experience?id=effect-experience) decorator as a param, it will only listen to the state changes leaded by this specific `method`.

The method decorated by [effect](/experience?id=effect-experience) is bind on an `agent` which is created temporary from current `model instance`. So, if deploy the method from keyword `this` in a effect callback, it will change the model state. The `effect` API will not lead a first running like: `addEffect(callback, model)` when use it. In fact, the effect method here is just a special flow method.

The code below is an example about how to use effect to control a user list model, we can fetch users and filter them with the property `name`.

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

describe("use decorator effect",()=>{

    type User = {
        id: number,
        name: string
    };

    type UserListState = {
        source: User[]|null,
        list: User[],
        filterName: string,
        loading: boolean,
    }

    const dataSource: User[] = [
        {id: 1, name: 'Jimmy'},
        {id: 2, name: 'Jacky'},
        {id: 3, name: 'Lucy'},
        {id: 4, name: 'Lily'},
        {id: 5, name: 'Nike'},
    ];

    class UserListModel implements Model<UserListState> {

        state: UserListState = {
            source: [],
            list: [],
            filterName: '',
            loading: false,
        };

        fetchSource() {
            return {...this.state, loading: true};
        }

        changeSource(source: User[]|null) {
            return {...this.state, source, list: source};
        }

        finishLoading(){
            return {...this.state,loading: false};
        }

        // listen state changes from all methods,
        // all the effect method can not be called directly from `agent`,
        // so, make it a `private` method is a good idea.
        @effect('*')
        private async loadingEffect(prevSate: UserListState) {
            const {loading} = this.state;
            if (prevSate.loading === loading ||!loading) {
                return;
            }
            try {
                const source:User[] = await new Promise((resolve)=>{
                    resolve([...dataSource]);
                });
                // fetch source
                this.changeSource(source);
            }finally {
                // after all jobs, we need to set loading to 'false'
                this.finishLoading();
            }

        }

    }

    test('try effect listen to all methods ', async () => {
        const {agent, connect, disconnect} = create(UserListModel);
        connect();
        agent.fetchSource();
        expect(agent.state.loading).toBe(true);
        await new Promise((r)=>setTimeout(r));
        // the `loadingEffect` finally set loading to 'false'
        expect(agent.state.loading).toBe(false);
        disconnect();
    });

});
```

The code above shows how to use effect `fetch data`. The effect listen to the state change about `state.loading`, so, we calls `fetchSource` method to change `state.loading` to `true`, that makes `loadingEffect` works, and after the data fetching, the `effect method` call `this.changeSource` to change `state.source` and `state.list` (keyword `this` in effect is an agent object created by `agent-reducer` system).

If we want to listen the effect about state changes from special methods, we can try below.

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

describe("use decorator effect",()=>{

    type User = {
        id: number,
        name: string
    };

    type UserListState = {
        source: User[]|null,
        list: User[],
        filterName: string,
        loading: boolean,
    }

    const dataSource: User[] = [
        {id: 1, name: 'Jimmy'},
        {id: 2, name: 'Jacky'},
        {id: 3, name: 'Lucy'},
        {id: 4, name: 'Lily'},
        {id: 5, name: 'Nike'},
    ];

    class UserListModel implements Model<UserListState> {

        state: UserListState = {
            source: [],
            list: [],
            filterName: '',
            loading: false,
        };

        fetchSource() {
            return {...this.state, loading: true};
        }

        changeFilterName(filterName: string) {
            return {...this.state, filterName};
        }

        changeSource(source: User[]|null) {
            return {...this.state, source, list: source};
        }

        finishLoading(){
            return {...this.state,loading: false};
        }

        private filter() {
            const {filterName, source} = this.state;
            const list = source!.filter(({name}) => name.startsWith(filterName));
            return {...this.state, list};
        }

        // listen state changes from special methods.
        @effect(()=>UserListModel.prototype.changeSource)
        @effect(() => UserListModel.prototype.changeFilterName)
        filterEffect() {
            // if the `filterName` or `source` in state changes,
            // invoke filter to change state.
            // In effect, we can call state change methods to change state.
            // And `this` now is an agent object.
            this.filter();
        }

        // listen state changes from all methods,
        // all the effect method can not be called directly from `agent`,
        // so, make it a `private` method is a good idea.
        @effect('*')
        private async loadingEffect(prevSate: UserListState) {
            const {loading} = this.state;
            if (prevSate.loading === loading ||!loading) {
                return;
            }
            try {
                const source:User[] = await new Promise((resolve)=>{
                    resolve([...dataSource]);
                });
                // fetch source
                this.changeSource(source);
            }finally {
                // after all jobs, we need to set loading to 'false'
                this.finishLoading();
            }

        }

    }

    test('try effect listen to a special method', async () => {
        const {agent, connect, disconnect} = create(UserListModel);
        connect();
        agent.fetchSource();
        expect(agent.state.loading).toBe(true);
        await new Promise((r)=>setTimeout(r));
        expect(agent.state.loading).toBe(false);
        agent.changeFilterName('L');
        // the `filterEffect` filter list by `filter` method
        expect(agent.state.list).toEqual([
            {id: 3, name: 'Lucy'},
            {id: 4, name: 'Lily'},
        ]);
        disconnect();
    });

});
```

We add a `filter name` function for our model by using effect to listen to the special methods: `changeSource` and `changeFilterName`, and no matter which method above changes state, the `filterEffect` will respose, it calls `filter` method to filter out list we want to show. 

Note: the effect method can not be called as a agent action method.

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

describe("use decorator effect",()=>{

    type User = {
        id: number,
        name: string
    };

    type UserListState = {
        source: User[]|null,
        list: User[],
        filterName: string,
        loading: boolean,
    }

    const dataSource: User[] = [
        {id: 1, name: 'Jimmy'},
        {id: 2, name: 'Jacky'},
        {id: 3, name: 'Lucy'},
        {id: 4, name: 'Lily'},
        {id: 5, name: 'Nike'},
    ];

    class UserListModel implements Model<UserListState> {

        state: UserListState = {
            source: [],
            list: [],
            filterName: '',
            loading: false,
        };

        fetchSource() {
            return {...this.state, loading: true};
        }

        changeFilterName(filterName: string) {
            return {...this.state, filterName};
        }

        changeSource(source: User[]|null) {
            return {...this.state, source, list: source};
        }

        finishLoading(){
            return {...this.state,loading: false};
        }

        private filter() {
            const {filterName, source} = this.state;
            const list = source!.filter(({name}) => name.startsWith(filterName));
            return {...this.state, list};
        }

        // listen state changes from special methods.
        @effect(()=>UserListModel.prototype.changeSource)
        @effect(() => UserListModel.prototype.changeFilterName)
        filterEffect() {
            // if the `filterName` or `source` in state changes,
            // invoke filter to change state.
            // In effect, we can call state change methods to change state.
            // And `this` now is an agent object.
            this.filter();
        }

        // listen state changes from all methods,
        // all the effect method can not be called directly from `agent`,
        // so, make it a `private` method is a good idea.
        @effect('*')
        private async loadingEffect(prevSate: UserListState) {
            const {loading} = this.state;
            if (prevSate.loading === loading ||!loading) {
                return;
            }
            try {
                const source:User[] = await new Promise((resolve)=>{
                    resolve([...dataSource]);
                });
                // fetch source
                this.changeSource(source);
            }finally {
                // after all jobs, we need to set loading to 'false'
                this.finishLoading();
            }

        }

    }

    test('the method effect can not be used from `agent` directly',()=>{
        const {agent, connect, disconnect} = create(UserListModel);
        connect();
        // the method effect can not be used from `agent` directly
        expect(()=>agent.filterEffect).toThrow();
        disconnect();
    });

});
```

## API

### flow (experience)

A `ES6 decorator` function which is used for marking a method to be a work flow method.

```typescript
export type WorkFlow = (runtime:FlowRuntime)=>LaunchHandler;

declare type FlowFn =((...flows:WorkFlow[])=>MethodDecoratorCaller)&{
    on:<S, T extends Model<S>>(target:T)=>T,
    error:<
        S=any,
        T extends Model<S>=Model<S>
        >(model:T, listener:ErrorListener)=>(()=>void)
}

export declare const flow:FlowFn;
```

* flows - optional, used to control how to run a flow method. You can select them from [Flows](/experience?id=flows-experience).
* on - property function, used to keep a inside flow method running on its own `WorkFlow`.
* error - property function, used to listen the error from `flow methods`.

return a decorator callback.

### Flows (experience)

A set class for storing common `WorkFlows`.

```typescript
export class Flows {

  static latest():WorkFlow;

  static debounce(ms:number, leading?:boolean):WorkFlow;
}
```
* Flows.latest - to take state changes which is leaded by the newest calling of a flow method.
* Flows.debounce - to make the flow method work with a debounce effect. 

### effect (experience)

The `ES6 decorator` usage of [addEffect](/api?id=addeffect). It makes the working instance of current class as effect target. If you want to listen to the state changes from a specific method, you can give it a callback which returns method as param.

```typescript
export declare function effect<S=any, T extends Model<S>=Model>(
    method?:()=>(...args:any[])=>any,
):MethodDecoratorCaller
```

* method - optional, a callback which returns `Class.prototype.method` as the target method for state change listening.