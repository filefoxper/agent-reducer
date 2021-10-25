import {
    create, middleWare, MiddleWarePresets,
} from '../../src';
import {Action, Model} from '../../src/libs/global.type'

describe('简单 object 模型', () => {

    // 这是一个简单计数器模型
    const counter = {

        state: 0, // 初始状态值

        // 这是一个数据处理方法，
        // 方法返回值为新的 state 数据
        increase(): number {
            return this.state + 1;
        }

    }

    test('一个带有 state 和 method 方法的 object 即可为模型', () => {
        // 使用 create api, 可以把模型转化为代理器
        const {agent, connect, disconnect} = create(counter);
        // 在进行操作前，需要使用 connect 进行简单的模型代理同步工作
        connect();
        // 调用代理器上的 `increase` 方法进行 state+1 处理
        agent.increase();
        // 如果代理器已经不再具有使用价值，
        // 我们需要通过 disconnect 释放同步产生的内存变量
        disconnect();
        expect(agent.state).toBe(1);
    });

});

describe('简单 class 模型', () => {

    // 这是一个简单计数器模型
    class Counter implements Model<number> {

        state: number;

        constructor() {
            // 初始状态值
            this.state = 0;
        }

        // 这是一个数据处理方法，
        // 方法返回值为新的 state 数据
        increase(): number {
            return this.state + 1;
        }

    }

    test('an class model is simple and classify', () => {
        // 使用 create api, 可以把模型转化为代理器
        const {agent, connect, disconnect} = create(Counter);
        // 在进行操作前，需要使用 connect 进行简单的模型代理同步工作
        connect();
        // 调用代理器上的 `increase` 方法进行 state+1 处理
        agent.increase();
        // 如果代理器已经不再具有使用价值，
        // 我们需要通过 disconnect 释放同步产生的内存变量
        disconnect();
        expect(agent.state).toBe(1);
    });

});

describe('使用 `MiddleWare`', () => {

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

    // 这是一个 todo-list 模型，
    // 我们可以通过 fetch 方法获取服务器中的数据
    class TodoList implements Model<Array<Todo>> {

        state = [];

        // 方法 fetch 返回一个 promise 对象，
        // 我们需要使用 MiddleWare 将 promise resolve 数据转化成最新 state
        fetch(): Promise<Array<Todo>> {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        clear(): Promise<Array<Todo>> {
            return new Promise((resolve) => {
                resolve([]);
            });
        }

    }

    test('如果我们不作任何处理，直接调用 `fetch` ，我们的 state 会变成一个 promise 对象', async () => {
        const {agent, connect, disconnect} = create(TodoList);
        connect();
        await agent.fetch();
        // agent.state 变成了一个 promise 对象
        expect(Object.getPrototypeOf(agent.state)).toBe(Promise.prototype);
        disconnect();
    });

    test('使用 `MiddleWarePresets.takePromiseResolve()` 可以将返回的 promise resolve 值转为新的 state', async () => {
        // create api 可以接收一个 MiddleWare ，
        // 并使其作用于所有 agent 代理方法
        const {agent, connect, disconnect} = create(TodoList, MiddleWarePresets.takePromiseResolve());
        connect();
        await agent.fetch();
        // agent.state 变成了 promise resolve 值
        expect(agent.state).toEqual(todoList);
        await agent.clear();
        // agent.state 变成了 promise resolve 值
        expect(agent.state).toEqual([]);
        disconnect();
    })

});

describe('在模型方法上使用 decorator 添加 `MiddleWare`', () => {

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

    // 这是一个 todo-list 模型，
    // 我们可以通过 fetch 方法获取服务器中的数据
    class TodoList implements Model<Array<Todo>> {

        state = [];

        // fetch 方法返回一个 promise 对象，
        // 通过使用 MiddleWarePresets.takePromiseResolve()
        // 可以把 promise resolve 值转换为最新 state
        @middleWare(MiddleWarePresets.takePromiseResolve())
        fetch(): Promise<Array<Todo>> {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        // 直接调用，将采取默认的 state 变更模式，
        // state 将变成一个 promise 对象
        clear(): Promise<Array<Todo>> {
            return Promise.resolve([]);
        }

    }

    test('使用 decorator 可以为特定方法添加 `MiddleWare`，其他方法不受影响', async () => {
        const {agent, connect, disconnect} = create(TodoList);
        connect();
        // 方法上的 MiddleWare 只作用于当前方法
        await agent.fetch();
        // 在 MiddleWare 的作用下 agent.state 变更为 promise resolve 值
        expect(agent.state).toEqual(todoList);
        // clear 方法不受影响，没有任何 MiddleWare 作用于它
        await agent.clear();
        // agent.state 变更为一个 promise 对象
        expect(Object.getPrototypeOf(agent.state)).toBe(Promise.prototype);
        disconnect();
    });

});

describe('在模型上使用 class decorator 添加 `MiddleWare`', () => {

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

    // 这是一个 todo-list 模型，
    // 我们可以通过 fetch 方法获取服务器中的数据。
    // 使用 class decorator 可以为所有方法添加兜底 `MiddleWare`
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>> {

        state = [];

        fetch(): Promise<Array<Todo>> {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        clear(): Promise<Array<Todo>> {
            return Promise.resolve([]);
        }

    }

    test('使用 class decorator 添加的 `MiddleWare` 作用于 class 中的所有方法', async () => {
        const {agent, connect, disconnect} = create(TodoList);
        connect();
        // 兜底 MiddleWare 影响所有方法
        await agent.fetch();
        // agent.state 变更为 promise resolve 值
        expect(agent.state).toEqual(todoList);
        // 兜底 MiddleWare 影响所有方法
        await agent.clear();
        // agent.state 变更为 promise resolve 值
        expect(agent.state).toEqual([]);
        disconnect();
    });

});

describe('使用 `模型共享`', () => {

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

    // 这是一个 todo-list 模型，
    // 我们可以通过 fetch 方法获取服务器中的数据。
    // 使用 class decorator 可以为所有方法添加兜底 `MiddleWare`
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>> {

        state = [];

        fetch(): Promise<Array<Todo>> {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        clear(): Promise<Array<Todo>> {
            return Promise.resolve([]);
        }

    }

    // 创建一个 `模型实例`
    const todoListInstance = new TodoList();

    test('单纯的 class 模型只能被复用，不能作模型共享', async () => {
        // 为不同的代理创建不同的数据更新监听器 dispatch1，dispatch2
        const dispatch1 = jest.fn().mockImplementation((action: Action) => {
            // 代理以 action 的数据形式将数据更新通知到监听器
            // action.state 为即将更新的数据
            expect(action.state).toEqual(todoList);
        });
        const dispatch2 = jest.fn().mockImplementation((action: Action) => {
            expect(action.state).toEqual(todoList);
        });
        // 使用相同的 class `模型`
        const {agent: a1, connect: c1, disconnect: d1} = create(TodoList);
        // 使用相同的 class `模型`
        const {agent: a2, connect: c2, disconnect: d2} = create(TodoList);
        // 在进行模型与代理的连接操作时，
        // 可加入监听器 dispatch1，dispatch2
        c1(dispatch1);
        c2(dispatch2);
        // 运行代理 a1 上的方法，发现 state 变更与代理 a2 无关
        await a1.fetch();
        expect(dispatch1).toBeCalled();     // dispatch1 工作
        expect(dispatch2).not.toBeCalled();     // dispatch2 不工作
        expect(a1.state).not.toEqual(a2.state);
        d1();
        d2();
    });

    test('作用于同一模型实例的模型共享可以同步代理之间的数据更新', async () => {
        // 为不同的代理创建不同的数据更新监听器 dispatch1，dispatch2
        const dispatch1 = jest.fn().mockImplementation((action: Action) => {
            // 代理以 action 的数据形式将数据更新通知到监听器
            // action.state 为即将更新的数据
            expect(action.state).toEqual(todoList);
        });
        const dispatch2 = jest.fn().mockImplementation((action: Action) => {
            expect(action.state).toEqual(todoList);
        });
        // 相同的 `模型实例子`
        const {agent: a1, connect: c1, disconnect: d1} = create(todoListInstance);
        // 相同的 `模型实例子`
        const {agent: a2, connect: c2, disconnect: d2} = create(todoListInstance);
        // 在进行模型与代理的连接操作时，
        // 可加入监听器 dispatch1，dispatch2
        c1(dispatch1);
        c2(dispatch2);
        // 代理 a1 会把 state 数据变更通知给代理 a2.
        await a1.fetch();
        expect(dispatch1).toBeCalled();     // dispatch1 工作
        expect(dispatch2).toBeCalled();     // dispatch2 工作
        expect(a1.state).toEqual(a2.state);
        d1();
        d2();
    });

});