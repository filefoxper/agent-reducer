import {create, middleWare, MiddleWarePresets, withMiddleWare} from "../../src";
import {Model} from "../../src/libs/global.type";

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
