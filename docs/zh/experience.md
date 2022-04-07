# 体验特性与API

`agent-reducer@4.2.0` 重新开启了体验版特性与 API。它们可能在后续版本中发生更改，建议在非生产环境中进行试验和使用。可以通过将 `process.env.AGENT_REDUCER_EXPERIENCE` 设置为 `OPEN` ，并开启[手动编译 agent-reducer](/zh/introduction?id=手动编译) 来开启体验模式。另外在全局使用 API [experience](/zh/api?id=experience) 也可以开启体验模式。

## 引导

目前，`agent-reducer` 的主要工作模式为：通过代理（agent）调用一个返回新 state 值的方法来修改模型 state 数据。如果返回值并不满足 state 需求（比如返回值为 promise 对象），则需要使用相应的 middleWare 进行再加工。这种工作方式非常 `reducer`，所以几乎所有方法都是修改 state 的细节方法，这对关键数据处理的描述已经够用了，但这种方式很难描述一个工作流程。所以，我们需要在模型 model 以外去组合这些方法，以完成一套工作流。

现在，我们引入`工作流方法`作为功能性弥补，以便可以在模型中直接描绘我们的一整个完整工作流程。`工作流`的好处：

1. 可以在模型内部整理工作流。
2. 使异步请求等副作用调用与修改 state 的数据处理及修改方法分离，提升组合效率。并减少对 MiddleWare 系统的依赖，从而简化模型，更易理解。

而在之前版本加入的 `effect` 方法亦为 `工作流方法`，运行特性与普通 `工作流方法（flow）` 相同，只是不能被使用者直接使用。

### 工作流 (体验)

工作流方法用于将普通 state 更新方法组合成一套较为完整的工作方法流。可通过在方法上加 `@flow` 装饰器来使用，在 flow 方法中关键词 `this` 是当前 `agent 代理对象` 的副本，所以可以直接用来调用普通 state 更新方法，甚至其他工作流方法。工作流方法的返回值不能修改 state 数据，所以返回值可以是任何对象，无需特别关注。

工作流方法也有自己的一套方法运行控制器（`WorkFlow`），可通过 `@flow(......)` 添加，如：`@flow(Flows.latest())`。目前官方只提供了 2 个较为常用的 `WorkFlow`：`Flows.latest()`、`Flows.debounce(ms:number, leading?:boolean)`。

我们给出一个基本的列表查询、过滤例子来看看 `flow` 的用途：

```typescript
import {Flows, flow, create, effect, experience, Model} from "agent-reducer";

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
            // filterDebounce 也是一个工作流方法，
            // 当它在另一个工作流方法中被直接调用时，
            // 它会采用与当前工作流方法一致的工作流模式，
            // 因此这里的 filterDebounce 并不会按照 debounce 模式工作
            this.filterDebounce();
        }

        @flow()
        changeFilterNameThenFilterDebounce(filterName:string){
            this.changeFilterName(filterName);
            // `flow.on` 可以让 filterDebounce 保持自身的工作流模式，
            // 因此这里的 filterDebounce 依旧可以按 debounce 模式工作
            flow.on(this).filterDebounce();
        }

    }

    test('同一个工作流方法的工作模式总是以被直接调用的工作流方法为准的', async () => {
        const {agent, connect, disconnect} = create(UserListModel);
        const changes: string[] = [];
        connect(({state}) => {
            changes.push(state);
        });
        // 3个修改 state 方法: load, changeSource, unload
        await agent.loadSource();
        // 2个修改 state 方法: changeFilterName, filterList
        agent.changeFilterNameThenFilter('Lucy');
        // 2个修改 state 方法: changeFilterName, filterList
        agent.changeFilterNameThenFilter('Lily');
        await new Promise((resolve) => setTimeout(resolve,500));

        expect(changes.length).toBe(7);
        expect(agent.state.list).toEqual([{id: 4, name: 'Lily'}]);
        disconnect();
    });

    test('API `flow.on` 可以保持一个工作流在其他工作流中被调用时，依然保持自身的工作模式', async () => {
        const {agent, connect, disconnect} = create(UserListModel);
        const changes: string[] = [];
        connect(({state}) => {
            changes.push(state);
        });
        // 3个修改 state 方法: load, changeSource, unload
        await agent.loadSource();
        // 1个修改 state 方法: changeFilterName，
        // filterList 采用了 debounce 向后节流模式
        agent.changeFilterNameThenFilterDebounce('Lucy');
        // 2个修改 state 方法: changeFilterName, filterList
        // filterList 向后截流到这次调用生效
        agent.changeFilterNameThenFilterDebounce('Lily');
        await new Promise((resolve) => setTimeout(resolve, 500));

        expect(changes.length).toBe(6);
        expect(agent.state.list).toEqual([{id: 4, name: 'Lily'}]);
        disconnect();
    });

});
```

### 副作用 decorator 装饰器用法 (体验)

添加副作用的 decorator API 为 [effect](/zh/experience?id=effect-体验)。被该 decorator 函数修饰的方法将被作为副作用回调来使用，而副作用监听目标为该函数入参，如：`effect('*')` 表示监听所有 state 变化，如传入当前模型方法提供函数，则监听该目标下的指定方法 `effect(()=>Model.prototype.method)`。

装饰器副作用回调方法会在触发时被绑定到一个临时创建的当前模型代理 agent 对象上。所以该方法中的关键词 `this` 是个代理对象。这方便使用者在回调方法中调用其他方法，从而修改 state 数据。该用法加入的副作用方法没有 `addEffect(callback, model)` 的首次加载调用效果。

副作用方法其实也是一种工作流方法，因此它继承了工作流方法的几乎所有特性，除了能被直接调用。这里我们通过使用副作用方法来实现上述的查询过滤搜索模型。

```typescript
import {flow, create, effect, experience, middleWare, MiddleWarePresets, Flows, Model} from "agent-reducer";

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

### WorkFlow 生命周期

使用者可根据自己的需求自行添加工作流模式。

```typescript
export type LaunchHandler = {
    shouldLaunch?:()=>boolean,
    shouldUpdate?:()=>boolean,
    didLaunch?:(result:any)=>any,
    reLaunch?:(method:(...args:any[])=>any)=>((...args:any[])=>any);
}

export type FlowRuntime = {
    cache:Record<string, any>,
    resolve:(result:any)=>any;
    reject:(error:any)=>any
};

export type WorkFlow = (runtime:FlowRuntime)=>LaunchHandler;
```

详解：

```typescript
export function myFlow(runtime:FlowRuntime){
    // 运行工作流方法运行前启动,用于初始化数据。
    // runtime 的 cache 为当前模型为当前工作模式分配的唯一缓存,
    // cache 初值为一个空 object
    const cache = runtime.cache;
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
        reLaunch(method){
            // 从写当前被调用方法
            return function wrapMethod(...args:any[]){
                return method(...args);
            }
        },
    }
}
```

## API

### flow (体验)

用于标识一个工作流方法，工作流方法中的关键词 `this` 是一个 agent 代理对象。通过给 `@flow(...)` 传入不通的 `WorkFlow` 工作模式，可以选择不通的方法运行模式。如：`@flow(Flows.latest())`。

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

* flow.on - 用于在一个工作流方法中，保持被调用的另一个工作流方法的运行模式。`flow.on(this).flowMethod()`。
* flow.error - 用于监听模型中的工作流方法异常。`flow.error(model, (error:any)=>{......})`

返回一个 decorator function。

### Flows (体验)

工作模式集合，目前有：`Flows.latest()` 和 `Flows.debounce()` 两个成员。

```typescript
export class Flows {

  static latest():WorkFlow;

  static debounce(ms:number, leading?:boolean):WorkFlow;
}
```
* Flows.latest - 只允许最新工作流方法产生的 state 变更生效.
* Flows.debounce - 使工作流方法以 debounce 防抖模式运行. 

### effect (体验)

[addEffect](/zh/api?id=addeffect) API 的 `ES6 decorator` 模式。添加该 decorator 装饰器的模型方法会被当作`副作用回调函数`，监听目标默认为当前模型实例，而 `effect` 入参函数返回的`模型方法`将被当作被监听的目标方法。

```typescript
export declare function effect<S=any, T extends Model<S>=Model>(
    method?:()=>(...args:any[])=>any,
):MethodDecoratorCaller
```

* method - 可选，返回被监听的目标方法的回调函数，必须为当前模型方法。

查看更多[细节](/zh/guides?id=副作用-decorator-装饰器用法)。