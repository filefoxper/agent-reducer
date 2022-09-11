# 引导

## Action Method 显式声明与 Strict 严格模式

为了更显式的区分出可修改 state 的行为方法，我们可以采用 `@act()` 装饰器进行标识。当系统检测到模型方法中含有 [act](/zh/api?id=act) 声明行为方法时会自动启用 [strict](/zh/api?id=strict) 严格模式。

在严格模式下，只有声明了 act 的方法才是能修改 state 的行为方法，其他非工作流（flow）的普通方法只能作为公共方法被调用，从而失去了原来修改 state 的行为特性。

如果希望强行进入严格模式，可以在模型 class 上标识 strict，在强制 strict 模式下，如果没有检测到 act 标识则会爆出异常。用法 `@strict` 。

```typescript
import {act, flow, Flows, strict,experience,create,Model} from "agent-reducer";

experience();

describe('严格模式和显式行为',()=>{

    type User = {
        id: number,
        name: string
    };

    type UserListState = {
        source: User[] | null,
        list: User[],
        loading: boolean,
    }

    const dataSource: User[] = [
        {id: 1, name: 'Jimmy'},
        {id: 2, name: 'Jacky'},
        {id: 3, name: 'Lucy'},
        {id: 4, name: 'Lily'},
        {id: 5, name: 'Nike'},
    ];

    test('在严格模式下，需要通过 `act` API 标识 state 更迭方法（行为方法）',async ()=>{
        @strict()
        class UserListModel implements Model<UserListState> {

            state: UserListState = {
                source: [],
                list: [],
                loading: false,
            };

            // 严格模式下，只有 act 修饰方法能修改 state
            @act()
            private load():UserListState {
                return {...this.state, loading: true};
            }

            private changeSource(source: User[]):UserListState {
                return {...this.state,source,list:source};
            }

            private unload():UserListState {
                return {...this.state, loading: false};
            }

            @flow(Flows.latest())
            async loadSource() {
                this.load();
                try {
                    const source: User[] = await new Promise((resolve) => {
                        resolve([...dataSource]);
                    });
                    this.changeSource(source);
                } finally {
                    this.unload();
                }
            }

        }

        const {agent,connect,disconnect} = create(UserListModel);
        connect();
        // 只有 load 方法符合行为方法，
        // 所以只有 load 方法会引起 state 变更
        await agent.loadSource();
        expect(agent.state.loading).toBe(true);
        disconnect();
    });

    test('`act` 修饰器会让系统对当前模型自动使用 strict 严格模式',async ()=>{
        // `act` 修饰器会让系统对当前模型自动使用 strict 严格模式
        class UserListModel implements Model<UserListState> {

            state: UserListState = {
                source: [],
                list: [],
                loading: false,
            };

            // 严格模式下，只有 act 修饰方法能修改 state
            @act()
            private load():UserListState {
                return {...this.state, loading: true};
            }

            private changeSource(source: User[]):UserListState {
                return {...this.state,source,list:source};
            }

            private unload():UserListState {
                return {...this.state, loading: false};
            }

            @flow(Flows.latest())
            async loadSource() {
                this.load();
                try {
                    const source: User[] = await new Promise((resolve) => {
                        resolve([...dataSource]);
                    });
                    this.changeSource(source);
                } finally {
                    this.unload();
                }
            }

        }

        const {agent,connect,disconnect} = create(UserListModel);
        connect();
        // 只有 load 方法符合行为方法，
        // 所以只有 load 方法会引起 state 变更
        await agent.loadSource();
        expect(agent.state.loading).toBe(true);
        disconnect();
    });

    test('在 strict 严格模式下，如没有检测到有 `act` 修饰方法，则报错',()=>{
        @strict()
        class Counter {

            state = 0;

            increase(){
                return this.state+1;
            }
        }

        const {connect} = create(Counter);
        expect(()=>connect()).toThrow();
    })

})
```

## Effect

自 `agent-reducer@4.2.0` 开始，我们新增了两个副作用相关的 API：[addEffect](/zh/api?id=addeffect) 和 [effect](/zh/api?id=effect) 。所谓的副作用是指当模型 state 发生改变时，做出的相关反应，通俗的说就是监听 state 变化，然后处理一些额外的业务逻辑。

基本用法如下：

```typescript
addEffect((prevState, state, methodName, action)=>{
    // `prevState` 本次变更之前的模型 state
    // `state` 本次变更后模型 state
    // `methodName` 引起本次变化的方法名，
    // `action` 引起本次变化的方法产生的行为集合，
    // action:{type:string, prevState:State, state:State, params:any[]}
    // 其中 action.type 等价于 methodName, action.params 为本次变更方法参数

    // 在直接监听模型 state 变更时，当前 callback 函数
    // 会在模型空闲时立即执行一次，这时因为并没有方法引起 state 变更，
    // 所以 `methodName` 为 null
    ......
    // return function destroy() {
    //   ......
    // }
    // 如果返回 function ，该 function 会在回调再次被调用，
    // 或副作用被卸载时调用。
    // 可用于销毁副作用回调过程中产生的影响
},model, method);
```

### 模型副作用

如果想要监听指定模型实例的 state 变更，可使用 `addEffect(callback, model)` 形式，对模型实例添加副作用。副作用回调函数会在添加后模型事务空闲时立即执行。（可简单理解为加入副作用的时机不在 state 变更过程中）第一次载入执行时，参数 `methodName` 为 `null`，之后每当模型 state 发生变更时都会再次触发该回调函数，直至副作用被卸载为止。

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

describe('effect 基本用法', () => {

    test('监听模型实例', () => {
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        // 副作用回调函数可接收 prevState, state, methodName 三个参数
        const effectCallback: EffectCallback<number> = jest.fn((prev,state) => {
            if (state < 0) {
                // time: 3
                // 如果 state 为 0，
                // 调用 `agent.reset` 方法，将 state 重置为 0，
                // 而 `agent.reset` 同样改变了 state，
                // 它将再次触发当前副作用回调函数
                agent.reset();
            }
        });
        // time: 1
        // 添加副作用回调函数监听模型实例 state 变化，
        // 该回调会在添加后 agent-reducer 空闲时立即调用一次，
        // 之后每当模型 state 变化都会再次调用，
        // 直到副作用被卸载为止。
        addEffect(effectCallback, model);

        // time: 2
        // decrease 方法将 state 修改为 -1，
        // 然后触发了副作用回调中的 `agent.reset`，
        // state 值被重置为 0
        agent.decrease();
        expect(agent.state).toBe(0);

        // time: 4
        // increase 方法将 state 更改为 1，
        // 同样触发了副作用，但因为回调函数中条件不符，
        // 故无法调动 `agent.reset` 方法
        agent.increase();
        expect(agent.state).toBe(1);
        // 观察 time
        expect(effectCallback).toBeCalledTimes(4);
        disconnect();
    });

});
```

### 方法副作用

如果想要监听单个代理方法产生的 state 变更副作用，可以使用 `addEffect(callback, model, method)` 。这时，副作用为方法副作用，当且仅当该方法被调用，并引起了 state 变更才会触发当前副作用回调函数。当参数 `method` 为 `*` 时，该副作用监听所有方法。

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

describe('effect 基本用法', () => {

    test('监听方法做出的 state 变更', () => {
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const effectCallback: EffectCallback<number> = jest.fn((prev,state) => {
            if (state < 0) {
                // 如果 state 变更值小于 0，
                // 调用 `agent.reset` 方法将其重置为 0
                agent.reset();
            }
        });

        // 对 `decrease` 方法添加副作用回调监听函数，
        // 当且仅当 `decrease` 方法被调用，并产生 state 变化时触发回调函数。
        addEffect(effectCallback, model, model.decrease);

        // `decrease` 将 state 变为 -1 导致 `reset` 被调用
        agent.decrease();
        expect(agent.state).toBe(0);
        agent.increase();
        expect(agent.state).toBe(1);
        // `increase` 方法并不能触发当前副作用，
        // 所以副作用回调函数被调用次数仍为 1
        expect(effectCallback).toBeCalledTimes(1);
        disconnect();
    });

});
```

### 监听代理副作用

为了方便使用，我们允许使用 agent 代理代替模型 model ，代理方法代替模型方法作为副作用目标。这与添加至模型 model 及方法上是等效的。

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

describe('effect 基本用法', () => {

    test('我们也可以对 agent 对象，或它的方法添加副作用', () => {
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const effectCallback: EffectCallback<number> = jest.fn();

        const decreaseEffectCallback: EffectCallback<number> = jest.fn((prev,state) => {
            if (state < 0) {
                agent.reset();
            }
        });

        // 对 agent 代理添加副作用，效果等同与对它的模型添加副作用
        addEffect(effectCallback, agent);

        // 对 agent 代理方法添加副作用，效果等同与对它的模型方法添加副作用
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

### 副作用销毁函数

如果在副作用回调函数中返回一个函数，该函数会在副作用再次被触发前调用，以便清理上次副作用处理中产生的内存占用等副效果。我们通常叫这种函数为销毁函数。

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

describe('effect 基本用法', () => {

    test('副作用回调函数可返回一个销毁函数，该销毁函数会在副作用回调函数再次被调用前或副作用被卸载时被调用',()=>{
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const destroy = jest.fn();

        const effectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
            if(state<0){
                agent.reset();
            }
            // 副作用回调函数返回一个销毁函数,
            // t该销毁函数会在副作用回调函数再次被调用前或副作用被卸载时被调用
            return destroy;
        });

        addEffect(effectCallback, model, model.decrease);

        // 第一次触发副作用时并不会运行销毁函数
        agent.decrease();
        expect(agent.state).toBe(0);

        expect(effectCallback).toBeCalledTimes(1);
        expect(destroy).toBeCalledTimes(0);

        // 再次触发副作用前，运行销毁函数
        agent.decrease();
        expect(agent.state).toBe(0);

        expect(effectCallback).toBeCalledTimes(2);
        expect(destroy).toBeCalledTimes(1);

        // 当前 disconnect 导致模型的所有代理链接全被销毁，
        // 这时系统会强行卸载当前模型的所有副作用，并再次触发销毁函数
        disconnect();
        expect(destroy).toBeCalledTimes(2);
    });

});
```
### 手动更新副作用回调函数

`addEffect` API 本身能返回一个 `effect` 对象，该对象拥有 `update` 和 `unmount` 方法。其中 `update` 方法可用于更新当前的副作用回调函数。

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

describe("使用 effect 的其他能力",()=>{

    test('使用 effect.update 方法来更新副作用回调函数',()=>{
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const effectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
            if(state<0){
                agent.reset();
            }
        });

        const effect = addEffect(effectCallback, model, model.decrease);

        agent.decrease();
        expect(agent.state).toBe(0);

        // 更新成另一个回调函数
        effect.update(jest.fn());

        agent.decrease();
        // 新回调函数不具备重置 state 的能力
        expect(agent.state).toBe(-1);

        expect(effectCallback).toBeCalledTimes(1);

        disconnect();
    });

});
```

### 手动卸载副作用

`addEffect` API 返回对象的另一个方法 `unmount` 可用于手动卸载当前副作用。

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

describe("使用 effect 的其他能力",()=>{

    test('通过 effect.unmount 方法手动卸载副作用',()=>{
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

        const {unmount} = addEffect(effectCallback, model, model.decrease);

        agent.decrease();
        expect(agent.state).toBe(0);

        expect(effectCallback).toBeCalledTimes(1);
        // 卸载副作用
        unmount();
        // 当副作用被卸载时会调用 destroy 销毁函数
        expect(destroy).toBeCalledTimes(1);

        // 这时已经没有副作用再将 state 重置为 0 了
        agent.decrease();
        expect(agent.state).toBe(-1);

        expect(effectCallback).toBeCalledTimes(1);
        expect(destroy).toBeCalledTimes(1);

        disconnect();
        expect(destroy).toBeCalledTimes(1);
    });

});
```

## 工作流

我们通常把可直接通过返回值修改 state 的方法称为 action method（行为方法），每个行为方法通常只能修改一次 state （除了有些加了特殊 MiddleWare 的行为方法外）。为了能更好的组织这些行为方法，形成一个系统的工作流程，并分离副作用接口（如数据请求），我们引入了 flow 工作流概念。

工作流方法用于将普通 state 更新方法（action methods）组合成一套较为完整的工作流程。可通过在方法上加 `@flow` 装饰器来使用，在 flow 方法中关键词 `this` 是当前 `agent 代理对象` 的副本，所以可以直接用来调用普通 state 更新方法，甚至其他工作流方法。工作流方法的返回值不能修改 state 数据，所以返回值可以是任何对象，无需特别关注。

工作流方法也有自己的一套方法运行控制器（`WorkFlow`），可通过 `@flow(......)` 添加，如：`@flow(Flows.latest())`。目前官方只提供了 2 个较为常用的 `WorkFlow`：`Flows.latest()`、`Flows.debounce(ms:number, leading?:boolean)`。

我们给出一个基本的列表查询、过滤例子来看看 `flow` 的用途：

```typescript
import {Flows, flow, create, effect, Model} from "agent-reducer";

describe('如何使用 flow', () => {

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

        // 使用 @flow() 将方法定性为工作流方法
        @flow()
        async loadSource() {
            // 关键词 this 是一个 agent 代理对象，
            // 因此可通过调用 this 中的 state 修改方法来修改 state，
            // 这里调用 load 方法让 state.loading 为 true。
            this.load();
            try {
                // 获取远程服务器数据
                const source: User[] = await new Promise((resolve) => {
                    resolve([...dataSource]);
                });
                // 调用 changeSource 修改 state.source
                this.changeSource(source);
            } finally {
                // 最后将 state.loading 置为 false，结束本次查询
                this.unload();
            }
        }

    }

    test('使用工作流方法来组织 state 更新，完成查询流程', async () => {
        const {agent, connect, disconnect} = create(UserListModel);
        const changes: string[] = [];
        connect((action) => {
            changes.push(action.type);
        });
        // 3次修改 state: load, changeSource, unload
        await agent.loadSource();
        expect(agent.state.source).toEqual(dataSource);
        expect(changes.length).toBe(3);
        disconnect();
    });

});
```

上例中，我们通过在 loadSource 方法中调用 `load`, `changeSource`, `unload` 等方法完成了一个标准的查询数据工作流。之后，我们将通过添加 `WorkFlow` 来完成一个体验较好的搜索过滤方法。

```typescript
import {Flows, flow, create, effect, Model} from "agent-reducer";

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

        // 设置一个 debounce 节流模式
        @flow(Flows.debounce(200))
        private filterDebounce() {
            const {source, filterName} = this.state;
            this.filterList(source || [], filterName);
        }

        // 使用 @flow() 将方法定性为工作流方法，
        // 使用 Flows.latest() 作为当前方法的工作流模式，
        // 从而让最新运行的方法修改 state 数据生效。
        @flow(Flows.latest())
        async loadSource() {
            // 关键词 this 是一个 agent 代理对象，
            // 因此可通过调用 this 中的 state 修改方法来修改 state，
            // 这里调用 load 方法让 state.loading 为 true。
            this.load();
            try {
                // 获取远程服务器数据
                const source: User[] = await new Promise((resolve) => {
                    resolve([...dataSource]);
                });
                // 调用 changeSource 修改 state.source
                this.changeSource(source);
            } finally {
                // 最后将 state.loading 置为 false，结束本次查询
                this.unload();
            }
        }

        @flow()
        changeFilterNameThenFilter(filterName:string){
            this.changeFilterName(filterName);
            // 当被调用工作流方法没有工作模式时，会采取当前调用者的工作模式环境，
            // 因为 filterDebounce 有自己的工作模式，
            // 因此它会采用原来的 debounce 工作模式运行
            this.filterDebounce();
        }

    }

    test('flow 方法互相调用时，工作模式不会互相影响', async () => {
        const {agent, connect, disconnect} = create(UserListModel);
        const changes: string[] = [];
        connect(({state}) => {
            changes.push(state);
        });
        // 3个修改 state 方法: load, changeSource, unload
        await agent.loadSource();
        // 1个修改 state 方法: changeFilterName, 
        // filterList 被 debounce 推迟执行，因此会被后一个连续调用取消
        agent.changeFilterNameThenFilter('Lucy');
        // 2个修改 state 方法: changeFilterName, filterList
        agent.changeFilterNameThenFilter('Lily');
        await new Promise((resolve) => setTimeout(resolve,500));

        expect(changes.length).toBe(6);
        expect(agent.state.list).toEqual([{id: 4, name: 'Lily'}]);
        disconnect();
    });

});
```

如果希望对某个内部调用的工作流方法使用临时性的`工作流模式`，可以使用 API `flow.force`。

```typescript
import {Flows, flow, create, effect, middleWare, MiddleWarePresets, Model} from "agent-reducer";

describe('use `flow.force` API',()=>{

    type User = {
        id?: number,
        username: string,
        role?: 'master' | 'user' | 'guest',
        password?: string
        name?: string,
        age?: number,
        sex?: 'male' | 'female'
    };

    class UserModel implements Model<User> {

        state: User = {
            username: 'guest'
        };

        changeUserName(username: string) {
            return {...this.state, username};
        }

        updateUser(user: User): User {
            return user;
        }

        @flow(Flows.debounce(200))
        async fetchUser(username: string) {
            const user: User = await new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve({
                        id: 1,
                        username: username,
                        name: username,
                        role: 'user',
                        age: 20
                    } as User);
                });
            });
            this.updateUser(user);
        }

        @effect(() => UserModel.prototype.changeUserName)
        effectOfKeyUsername() {
            // 'flow.force' 可以临时变更工作模式
            flow.force(this,Flows.default()).fetchUser(this.state.username);
        }

    }

    test('if you want to rewrite the `WorkFlow` of a inside flow method, you can use `flow.force`', async () => {
        const {agent, connect, disconnect} = create(UserModel);
        const nameChanges: string[] = [];
        connect(({state}) => {
            if (!state.name) {
                return;
            }
            nameChanges.push(state.name);
        });
        agent.changeUserName('a');
        agent.changeUserName('ab');
        await new Promise((resolve) => setTimeout(resolve));

        expect(nameChanges).toEqual(['a','ab']);
        disconnect();
    });

});
```

## 替身

在使用模型工作流的过程中，我们常常还需要加入 UI 调用，中断等待数据处理等步骤来完善任务。如果直接调用 UI 函数，以及部分平台相关的外部数据等待函数，那么我们的模型将被当前平台所束缚，失去了该有的易迁移特性。

至 `agent-reducer@4.3.1` ，我们在体验版中新增了 `avatar` API，用于代替 UI 及平台相关操作，从而降低模型对平台的依赖性。

`avatar` 替身是一种对 `代数效应 (Algebraic Effects)` 设计模式的实现。我们通过预设一系列只通过入参直接返回默认值的函数来做替身，并在模型中直接使用替身函数来做临时工作，然后在外部平台层，通过 `avatar(interface).implement(impl)` 来实现当前替身在平台运行环境中的代码。在模型 flow 工作流调用的时候，`avatar(interface).current` 会根据已实现的 `impl` 和替身 `interface` 来决定该用哪一个来工作。如被使用接口在 `impl` 中存在，则会直接使用，否则用替身 `interface` 中对应的接口来做弥补。

简单实用 avatar :

```typescript
import {
    Flows, 
    flow, 
    create, 
    effect,
    avatar,
    Model
} from "agent-reducer";

describe('how to use global avatar', () => {

    type User = {
        id: number,
        name: string
    };

    type UserListState = {
        source: User[] | null,
        loading: boolean,
    }

    const dataSource: User[] = [
        {id: 1, name: 'Jimmy'},
        {id: 2, name: 'Jacky'},
        {id: 3, name: 'Lucy'},
        {id: 4, name: 'Lily'},
        {id: 5, name: 'Nike'},
    ];

    const prompt = avatar({
        success:(info:string)=>undefined,
        error:(e:any)=>undefined
    });

    class UserListModel implements Model<UserListState> {

        state: UserListState = {
            source: [],
            loading: false,
        };

        private load() {
            return {...this.state, loading: true};
        }

        private changeSource(source: User[] | null) {
            return {...this.state, source};
        }

        private unload() {
            return {...this.state, loading: false};
        }

        @flow(Flows.latest())
        async loadSource() {
            this.load();
            try {
                const source: User[] = await new Promise((resolve) => {
                    resolve([...dataSource]);
                });
                this.changeSource(source);
                // 弹出 `fetch success` 提示信息框
                prompt.current.success('fetch success!');
            } catch (e) {
                // 弹出错误提示框
                prompt.current.error(e);
            }finally {
                this.unload();
            }
        }

    }

    test('如果希望在工作流中调用平台相关效果API，可使用 API `avatar`', async () => {
        const success = jest.fn().mockImplementation((info:string)=>console.log(info));
        // 实现替身接口函数
        const destroy] = prompt.implement({
            success,
        });
        const {agent, connect, disconnect} = create(UserListModel);
        connect();
        await agent.loadSource();
        expect(success).toBeCalledTimes(1);
        disconnect();
        // 在不再需要替身时，可以销毁它
        destroy();
    });

});
```

如果希望每个模型实例拥有不同的替身实现，可以将替身挂在模型里，并对不同的模型实例提供的替身进行实现。

```typescript
import {
    Flows, 
    flow, 
    create, 
    effect,
    avatar,
    Model
} from "agent-reducer";

describe('how to use model avatar', () => {

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

        prompt = avatar({
            success:(info:string)=>undefined,
            error:(e:any)=>undefined
        });

        private load() {
            return {...this.state, loading: true};
        }

        private changeSource(source: User[] | null) {
            return {...this.state,source}
        }

        private unload() {
            return {...this.state, loading: false};
        }

        @flow(Flows.latest())
        async loadSource() {
            this.load();
            try {
                const source: User[] = await new Promise((resolve) => {
                    resolve([...dataSource]);
                });
                this.changeSource(source);
                // 弹出 `fetch success` 提示信息框
                this.prompt.current.success('fetch success!');
            } catch (e) {
                // 弹出错误提示信息框
                this.prompt.current.error(e);
            }finally {
                this.unload();
            }
        }

    }

    test('If you want to use `avatar` in model, please build avatar inside model', async () => {
        const success = jest.fn().mockImplementation((info:string)=>console.log(info));

        const {agent, connect, disconnect} = create(UserListModel);
        const {agent:another, connect:anotherConnect, disconnect:anotherDisconnect} = create(UserListModel);
        // 为不同的模型实例实现替身接口
        const destroy = agent.prompt.implement({
            success,
        });
        connect();
        anotherConnect();
        await agent.loadSource();
        await another.loadSource();
        // agent.prompt 被实现了，但 another 没有
        expect(success).toBeCalledTimes(1);
        disconnect();
        anotherDisconnect();
        // 如果不再使用可以销毁掉
        destroy();
    });

});
```

## 副作用响应方法

添加副作用的 decorator API 为 [effect](/zh/api?id=effect)。被该 decorator 函数修饰的方法将被作为副作用回调来使用，而副作用监听目标为该函数入参，如：`effect('*')` 表示监听所有 state 变化，如传入当前模型方法提供函数，则监听该目标下的指定方法 `effect(()=>Model.prototype.method)`。

装饰器副作用回调方法会在触发时被绑定到一个临时创建的当前模型代理 agent 对象上。所以该方法中的关键词 `this` 是个代理对象。这方便使用者在回调方法中调用其他方法，从而修改 state 数据。该用法加入的副作用方法没有 `addEffect(callback, model)` 的首次加载调用效果。

副作用方法其实也是一种工作流方法，因此它继承了工作流方法的几乎所有特性，除了能被直接调用。这里我们通过使用副作用方法来实现上述的查询过滤搜索模型。

```typescript
import {flow, create, effect, middleWare, MiddleWarePresets, Flows, Model} from "agent-reducer";

describe('try decorator effect', () => {

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
            // 准备查询数据，进入 loading 状态
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

        // 使用 Flows.debounce 模式
        @flow(Flows.debounce(200))
        // 监听 changeSource 和 changeFilterName 引起的 state 变更，
        // 因为只有这两个方法引起的 state 变更能影响过滤结果
        @effect(()=>UserListModel.prototype.changeSource)
        @effect(() => UserListModel.prototype.changeFilterName)
        filterEffect() {
            // 运行 filter 普通 state 变更方法进行过滤
            this.filter();
        }

        // 监听所有 state 变更
        // effect 方法不能被直接调用，所以最好加上 private 私有化修饰。
        // 为什么不使用 Flows.latest()？
        // 因为 prevSate.loading === loading ||!loading 配合 latest 工作模式
        // 可能会导致永久的 loading 激活状态，
        // 所以 @effect('*') 要尽量少用，这里只是一个示例
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
                // 更新远程获取的数据
                this.changeSource(source);
            }finally {
                // 在最后结束 loading 状态
                this.finishLoading();
            }

        }

    }

    test('监听所有 state 变更', async () => {
        const {agent, connect, disconnect} = create(UserListModel);
        connect();
        agent.fetchSource();
        expect(agent.state.loading).toBe(true);
        await new Promise((r)=>setTimeout(r));
        // `loadingEffect` 最终会把 loading 设置为 false
        expect(agent.state.loading).toBe(false);
        disconnect();
    });

    test('监听指定的方法引起的 state 变更', async () => {
        const {agent, connect, disconnect} = create(UserListModel);
        connect();
        agent.fetchSource();
        expect(agent.state.loading).toBe(true);
        await new Promise((r)=>setTimeout(r));
        expect(agent.state.loading).toBe(false);
        agent.changeFilterName('L');
        await new Promise((r)=>setTimeout(r,220));
        // `filterEffect` 会调用 filter 方法过滤数据
        expect(agent.state.list).toEqual([
            {id: 3, name: 'Lucy'},
            {id: 4, name: 'Lily'},
        ]);
        disconnect();
    });

    test('不能直接通过 agent 代理调用 effect 方法',()=>{
        const {agent, connect, disconnect} = create(UserListModel);
        connect();
        // 不能直接通过 agent 代理调用 effect 方法
        expect(()=>agent.filterEffect).toThrow();
        disconnect();
    });

    test('通过 API `flow.error`，我们可以拦截 effect 方法爆的错，也可以拦截工作流方法爆的错', async ()=>{
        const {agent, connect, disconnect} = create(UserListModel);
        connect();
        let exception = '';
        // 通过 API `flow.error`，我们可以拦截 effect 方法爆的错，也可以拦截工作流方法爆的错
        flow.error(agent,(error, methodName)=>{
            exception = `[${methodName}]: ${error.message}`;
        });
        agent.changeSource(null);
        await new Promise((r)=>setTimeout(r,220));
        expect(exception).not.toBe('');
        disconnect();
    });

});

```

## WorkFlow 生命周期

使用者可根据自己的需求自行添加工作流模式。

```typescript
export type LaunchHandler = {
    shouldLaunch?:()=>boolean,
    shouldUpdate?:()=>boolean,
    didLaunch?:(result:any)=>any,
    invoke?:(method:(...args:any[])=>any)=>((...args:any[])=>any);
}

export type FlowRuntime = {
    state:Record<string, any>,
    resolve:(result:any)=>any;
    reject:(error:any)=>any
};

export type WorkFlow = (runtime:FlowRuntime)=>LaunchHandler;
```

详解：

```typescript
export function myFlow(runtime:FlowRuntime){
    // 运行工作流方法运行前启动,用于初始化数据。
    // runtime 的 state 为当前模型为当前工作模式分配的唯一缓存,
    // state 初值为一个默认空 object {}
    const state = runtime.state;
    // resolve 可通知系统，方法正常结束
    // reject 可通知系统，方法异常，并将异常值通知给 flow.error
    const {resolve, reject} = runtime;
    return {
        shouldLaunch(){
            // 初始化后运行，依然先于工作流方法运行。
            // 可利用缓存通过返回 true, false 来启动或阻止工作流方法运行
            return true;
        },
        shouldUpdate(){
            // 工作流方法运行过程中，
            // 在每次调用 state 更新方法前运行，
            // 利用缓存通过返回 true, false 来允许或禁止 state 数据更新。
            return true;
        },
        didLaunch(result:any){
            // 运行工作流方法结束后运行，
            // 可利用工作流方法运行产生的结果 result 做些事情。
            // 比如利用 reject 将异常通知到 flow.error 监听事件
        },
        invoke(method){
            // 重写当前被调用方法
            return function wrapMethod(...args:any[]){
                return method(...args);
            }
        },
    }
}
```

正如之前所阐述的，在 flow method 流行之后，MiddleWare 的作用已日渐衰弱，直接进入[下一章](/zh/feature?id=特性)我们将介绍一些非常有用的特性，如果还有学习 MiddleWare 的需要，可接下来看下述段落。

## 中间件 MiddleWare

MiddleWare 是一种特殊的 function ，它可以用作修改系统默认的 state 变更策略（取返回值为最新的 state 值），也可用来控制方法的运行特征（如添加防抖 debounce 特征）。它可以被单独使用，也可以跟其他 MiddleWare 串行使用。如果需要组合使用多个不同的 MiddleWare 特性，我们可以使用 API [applyMiddleWares](/zh/api?id=applymiddlewares) 进行串联。

MiddleWare 的结构如下:

```typescript
// `MiddleWare` 是一个 function，
// 在方法准备开始调用时，会预先运行最终作用于方法的 `MiddleWare`。
// 参数 `Runtime` 是一个非常有用的 API 对象，
// 它包含了 `代理`，`模型实例`，`运行方法名`，`运行方法缓存数据`等信息
function middleWareLike(runtime: Runtime):NextProcess|void {

    // `MiddleWare` 可以返回一个 `nextProcess` 回调函数，
    // 该函数可用于接入串行下一 `MiddleWare` 的数据再加工执行函数 `stateProcess`。
    // `nextProcess` 函数会在方法结束时立即调用。
    // 如果你不希望运行当前 MiddleWare 所作用的方法，
    // 可选择返回 void 来代替 `nextProcess` ，并阻止方法执行。
    return function nextProcess(next: StateProcess): StateProcess {

        // `stateProcess` 用于再加工上一 MiddleWare 传入的 state（或方法返回值），
        // 通过调用 `next` 函数，我们可以把当前加工结果传递给下一 MiddleWare 处理。
        return function stateProcess(state: any) {
            // `next` 函数是下一 MiddleWare 的 `stateProcess`，
            // 如果想要阻止 state 发生变化，
            // 可直接返回加工结果，而不调用 `next` 函数
            return next(doSomething(state));
        };
    };
}
```

`Runtime` 的结构如下:

```typescript
// Runtime 是一个方法执行时 API 对象
export type Runtime<T extends Record<string, any>=any> = {
    // 正在执行方法的方法名
    methodName: string|number;
    // 正在执行方法的入参
    args?: any[];
    // 正在执行方法所在的代理对象
    agent: T;
    // 正在执行方法所在的代理对象对应的模型实例
    model: T;
    // 代理运行环境变量，仅仅包含一个 expired 是否过期判断属性，
    // 如果 expired 为 true，代理将失去修改 state 的能力
    env: Env;
    // MiddleWare 缓存对象，
    // 可用来做 MiddleWare 数据缓存
    cache: { [key: string]: any };
    // 可为正在执行方生成一个的临时模型实例，
    // 此时方法访问的关键词 this 指向这个临时模型实例
    mapModel:(handler:ProxyHandler<T>)=>T;
};
```

## MiddleWare 串联

每个 MiddleWare 都有自己独立的功能，如果希望在一个代理方法上使用多个 MiddleWare 的功能特性，我们需要使用 API `applyMiddleWares` 把它们串联成起来。 MiddleWare 的串联实质是把多个 MiddleWare 包装成一个环环相扣的多功能 MiddleWare 。

我们需要根据每个 MiddleWare 的用途进行串联操作，使得每个 MiddleWare 的 state 处理结果刚好可以被下一个 MiddleWare 处理。越靠后的 MiddleWare 越晚执行 state 处理，因此它的处理结果也应该越接近最终期望的 state 数据。

为了说明如何串联 MiddleWare ，我们以官方 API [MiddleWarePresets](/zh/api?id=middlewarepresets) 中的 `MiddleWarePresets.takePromiseResolveAssignable()` 为例进行分析。 takePromiseResolveAssignable 是由多个原子性 MiddleWare 串联而来的，这些原子性 MiddleWare 来源于官方 API `MiddleWares`。

```typescript
static takePromiseResolveAssignable():MiddleWare {
    // 调用串联方法 applyMiddleWares API
    return applyMiddleWares(
      // 原子性 MiddleWare takePromiseResolve，
      // 作用于返回值可能为 promise 的方法，
      // 它把 promise resolve 值作为新 state 传给下一 MiddleWare，
      // 若方法返回值并非 promise ，
      // 该返回值将直接被传入下一个 MiddleWare
      MiddleWares.takePromiseResolve(),
      // 原子性 MiddleWare takeAssignable，
      // 以 Object.assign 的形式把接收到的 promise resolve 值，
      // 和现存模型实例的 state 数据合成一个新 state，
      // 并传递给模型实例修改器，从而修改当前模型实例的 state。
      // 若方法返回值是一个非 object 的基本数据，
      // 返回值将直接被传入下一个 MiddleWare
      MiddleWares.takeAssignable(),
    );
  }
```

这个 MiddleWare 由 [MiddleWares.takePromiseResolve()](/zh/api?id=takepromiseresolve) 和 [MiddleWares.takeAssignable()](/zh/api?id=takeassignable) 组成。第一个 MiddleWare 负责处理 promise 对象，并将 resolve 值传给下一个 MiddleWare ，而作为它下一个 MiddleWare ，负责把接收到的数据和现存模型实例的 state 数据合成一个新 state ，并发送给系统的 state 修改器，从而修改模型实例的 state 数据。

## MiddleWare 覆盖作用

我们已经[介绍](/zh/introduction?id=middleware)了如何使 MiddleWare 作用于一个方法，这里我们将补充说明如何进行 MiddleWare 的互相覆盖。

根据不同的使用方式，MiddleWare 有不同的运行优先级，我们将从低到高逐一介绍这些使用方式。让我们以一个 User 模型为例进行说明:

``` typescript
import {
    create, 
    middleWare, 
    MiddleWarePresets,
    Model, 
    withMiddleWare,
} from "agent-reducer";

describe('MiddleWare 覆盖优先级', () => {

    type User = {
        id: undefined | number
        name: string,
        nick: string
    }

    // 这是一个 user 模型，
    // 可以通过 fetchCurrentUser 从服务器获取当前 user 信息。
    // 使用 class decorator 添加 MiddleWare，
    // 可以让这个 MiddleWare 作用于所有模型方法，
    // 这里我们添加了一个 takePromiseResolve 用来把异步获取数据转换成 state。
    // 以 class decorator 的形式添加的 MiddleWare 优先级最低
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

    test('使用 class decorator 添加的兜底用 MiddleWare，权限最低', async () => {
        const {agent, connect, disconnect} = create(UserModel);
        connect();
        // class decorator 添加的 takePromiseResolve 作用于 fetchCurrentUser
        await agent.fetchCurrentUser();
        expect(agent.state).toEqual({
            id: 0,
            name: 'name',
            nick: 'nick'
        });
        // 当前方法返回值为部分 state 数据，
        // 这会导致最新 state 数据不完整。
        // 我们需要 `MiddleWarePresets.takeAssignable` 把模型实例的 state 与返回值合并成新 state 数据
        agent.rename('name1');
        // 丢失了 id 属性
        expect(agent.state).not.toHaveProperty('id');
        disconnect();
    });

    test('通过 API `create` 添加的 MiddleWare 可以覆盖 class decorator 添加的 MiddleWare', async () => {
        const {agent, connect, disconnect} = create(UserModel, MiddleWarePresets.takePromiseResolveAssignable());
        connect();
        // 通过 API `create` 添加的 MiddleWare 覆盖了 class decorator 添加的 MiddleWare，
        // 所以作用于当前方法的是 takePromiseResolveAssignable。
        // takePromiseResolveAssignable 同时具备 takePromiseResolve 和 takeAssignable 的能力。
        await agent.fetchCurrentUser();
        expect(agent.state).toEqual({
            id: 0,
            name: 'name',
            nick: 'nick'
        });
        // 通过 API `create` 添加的 MiddleWare 覆盖了 class decorator 添加的 MiddleWare，
        // 所以作用于当前方法的是 takePromiseResolveAssignable。
        // takePromiseResolveAssignable 同时具备 takePromiseResolve 和 takeAssignable 的能力。
        // 所以 rename 以后得到的是合并后的完整 state 数据
        agent.rename('name1');
        expect(agent.state).toHaveProperty('id');
        disconnect();
    });

    test('通过 method decorator 添加的 MiddleWare 可以覆盖以上两种方式添加的 MiddleWare', async () => {
        const {agent, connect, disconnect} = create(UserModel, MiddleWarePresets.takePromiseResolveAssignable());
        connect();
        // 通过 API `create` 添加的 MiddleWare 覆盖了 class decorator 添加的 MiddleWare，
        // 所以作用于当前方法的是 takePromiseResolveAssignable。
        // takePromiseResolveAssignable 同时具备 takePromiseResolve 和 takeAssignable 的能力。
        await agent.fetchCurrentUser();
        expect(agent.state).toEqual({
            id: 0,
            name: 'name',
            nick: 'nick'
        });
        // 通过 API `create` 添加的 MiddleWare 覆盖了 class decorator 添加的 MiddleWare，
        // 所以作用于当前方法的是 takePromiseResolveAssignable。
        // takePromiseResolveAssignable 同时具备 takePromiseResolve 和 takeAssignable 的能力。
        // 所以 rename 以后得到的是合并后的完整 state 数据
        agent.rename('name1');
        expect(agent.state).toHaveProperty('id');
        // 通过 method decorator 添加的 MiddleWare 覆盖了所有兜底 MiddleWare，
        // 但它只作用于被使用的方法。
        agent.updateNick('nick1');
        // `MiddleWarePresets.takeNothing()` 会放弃当前方法引起的 state 变更
        expect(agent.state.nick).not.toBe('nick1');
        disconnect();
    });

    test('API `withMiddleWare` 拥有最高 MiddleWare 运行优先级', async () => {
        const {agent, connect, disconnect} = create(UserModel, MiddleWarePresets.takePromiseResolveAssignable());
        connect();
        // 通过 API `create` 添加的 MiddleWare 覆盖了 class decorator 添加的 MiddleWare，
        // 所以作用于当前方法的是 takePromiseResolveAssignable。
        // takePromiseResolveAssignable 同时具备 takePromiseResolve 和 takeAssignable 的能力。
        await agent.fetchCurrentUser();
        expect(agent.state).toEqual({
            id: 0,
            name: 'name',
            nick: 'nick'
        });
        // 通过 API `create` 添加的 MiddleWare 覆盖了 class decorator 添加的 MiddleWare，
        // 所以作用于当前方法的是 takePromiseResolveAssignable。
        // takePromiseResolveAssignable 同时具备 takePromiseResolve 和 takeAssignable 的能力。
        // 所以 rename 以后得到的是合并后的完整 state 数据
        agent.rename('name1');
        expect(agent.state).toHaveProperty('id');

        // API `withMiddleWare` 复制出一个新的代理用于执行，
        // 通过此接口添加的 MiddleWare 只作用于当前复制版的代理对象
        const {updateNick} = withMiddleWare(agent, MiddleWarePresets.takeAssignable());
        // takeAssignable 覆盖了 takeNothing
        updateNick('nick1');
        expect(agent.state.nick).toBe('nick1');
        disconnect();
    });

});
```

单元测试源码 [guides.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/guides.test.ts)。

MiddleWare 的覆盖优先级总结如下:

```
class decorator < create api < method decorator < withMiddleWare api
```

API [withMiddleWare](/zh/api?id=withmiddleware) 可以复制一个 `代理` ，并让通过该接口添加的 MiddleWare 覆盖掉复制品中所有的 MiddleWare。如此设计的原因，其一，是不希望直接修改原 `代理` 导致原 `代理方法` 的 MiddleWare 特性被变更，进而影响原功能；其二，就是因为接下来要介绍的 `Lifecycle MiddleWare` 。

## Lifecycle MiddleWare

Lifecycle MiddleWare 是一种可停止、恢复、重建`代理`的 MiddleWare ，它只能作用于一个被系统复制出来的 `代理`（若在方法上通过 method decorator 添加，访问的`代理方法`会被链接到一个隐藏`代理复制品方法`上）。

官方的 Lifecycle MiddleWare 只有 [LifecycleMiddleWares.takeLatest()](/zh/api?id=takelatest) 。这个 MiddleWare 可用于保证当前方法每次调用产生的 state 变更不会因为异步原因导致顺序混乱，即 state 永远获取最新值。举个例子，比如有个翻页查询功能，每次翻页去服务器获取当前页对应的数据，因为服务器返回时间受数据查询速度，网络返回速度影响，所以并不能保证前一页请求的数据比当前页的数据先返回，这就导致当前页数据可能被后返回的前一页数据覆盖。而这个 MiddleWare 就是为了解决类似这种问题而存在的。

`LifecycleMiddleWares.takeLatest()` 通常用于不稳定的异步数据修改过程，所以大部分情况下，需要与 `MiddleWares.takePromiseResolve()` 串联使用，官方给出了已串联好的 MiddleWare 以便快速使用 `MiddleWarePresets.takeLatest()` 。

这里我们以翻页查询为例，给出了 `MiddleWarePresets.takeLatest()` 的常规用法案例。

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

    // 这是个 to-do list 模型，
    // 我们可以按页码查询数据。
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>> {

        state = [];

        fetch(page:number): (Promise<Array<Todo>>) {
            // 当 page 为 1 时，模拟一个延时
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

    test('不使用 `MiddleWarePresets.takeLatest()`, page 1 的数据会覆盖最新的 page 2 数据',async ()=>{
        const {agent,connect,disconnect} = create(TodoList);
        connect();
        // 先触发获取第一页数据，接着立即触发获取第二页数据
        const fetchLoader1 = agent.fetch(1);
        const fetchLoader2 = agent.fetch(2);
        await Promise.all([fetchLoader1,fetchLoader2]);
        // 因为第一页数据由延时，
        // 所以会覆盖先返回的第二页数据。
        expect(agent.state).toEqual(todoList1);
        disconnect();
    });

    test('`MiddleWarePresets.takeLatest()` 可以保证始终采纳最新获取的数据',async ()=>{
        const {agent,connect,disconnect} = create(TodoList);
        connect();
        // 可以用 `withMiddleWare` API 为使用 `takeLatest` 创建一个复制代理
        const agentCopy = withMiddleWare(agent,MiddleWarePresets.takeLatest());
        // 先触发获取第一页数据，接着立即触发获取第二页数据。
        // 注意我们需要使用复制版，以确保我们正在使用 `takeLatest`
        const fetchLoader1 = agentCopy.fetch(1);
        const fetchLoader2 = agentCopy.fetch(2);
        await Promise.all([fetchLoader1,fetchLoader2]);
        // 虽然第一页数据由延时，
        // 但数据依然保持着最新一次触发获取的数据，即第二页数据
        expect(agent.state).toEqual(todoList2);
        disconnect();
    });

    test('method decorator 也可以添加 takeLatest MiddleWare',async ()=>{

        @middleWare(MiddleWarePresets.takePromiseResolve())
        class TodoList implements Model<Array<Todo>> {

            state = [];

            // 事实上，method decorator 可以复制当前正在调用方法所在的代理，
            // 并运行复制代理上对应的方法
            @middleWare(MiddleWarePresets.takeLatest())
            fetch(page:number): (Promise<Array<Todo>>) {
                // 当 page 为 1 时，模拟一个延时
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
        // 先触发获取第一页数据，接着立即触发获取第二页数据。
        const fetchLoader1 = agent.fetch(1);
        const fetchLoader2 = agent.fetch(2);
        await Promise.all([fetchLoader1,fetchLoader2]);
        // 虽然第一页数据由延时，
        // 但数据依然保持着最新一次触发获取的数据，即第二页数据
        expect(agent.state).toEqual(todoList2);
        disconnect();
    });
    
    test('当前版本 `create` API 还不能直接使用 Lifecycle MiddleWare',()=>{
        expect(()=>{
            create(TodoList,MiddleWarePresets.takeLatest());
        }).toThrow('Can not use a lifecycle `MiddleWare` for creating, please use this `MiddleWare` with api `withMiddleWare` or `middleWare`.');
    });

});
```

单元测试源码 [guides.test.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/guides.test.ts)。

让我们来看看 Lifecycle MiddleWare 是如何做到停止 state 变更以及重建代理复制品的。Lifecycle MiddleWare 与普通 MiddleWare 的主要区别就在 MiddleWare 参数 `Runtime` 上。

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

在上述结构中，我们可以看到在 `LifecycleRuntime.env` 中有一个 expire 属性方法和一个 rebuild 属性方法。通过调用 expire 方法，我们可以停止复制版代理的 state 变更能力，而调用 rebuild 方法则可以重建整个代理复制品。

Lifecycle MiddleWare 的定制方式与普通 MiddleWare 的定制方式类似，只需要使用API [toLifecycleMiddleWare](/zh/api?id=tolifecyclemiddleware) 使其生效即可。

`agent-reducer` 已经串联了很多常用的 MiddleWare。如果需要，可以在 `MiddleWarePresets` API 中找到它们。

