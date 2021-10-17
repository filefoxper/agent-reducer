import {Model, NextProcess, Runtime, StateProcess} from "../../src/libs/global.type";
import {createDraft, finishDraft} from "immer";
import {create, middleWare, MiddleWarePresets} from "../../src";
import {createStore} from "redux";

describe('自定义 MiddleWare', () => {

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

    // MiddleWare 是一个可接收 Runtime 参数的 function
    const immerMiddleWare = (runtime: Runtime): NextProcess => {

        // 用于判断是否为 object 的 function
        function isObject<T extends { [key: string]: any }>(data: T): boolean {
            return data && Object.prototype.toString.apply(data) === '[object Object]';
        }

        // 用于存储一个 immer draft
        let cache: { draft: Record<string, unknown> | null } = {draft: null};

        // 存储 next callback
        let listener: ((state: any) => void) | null = null;

        // 调用 createDraft 并缓存结果
        function createCacheDraft(val: any) {
            const draft = createDraft(val);
            cache.draft = draft;
            return draft;
        }

        // 调用 finishDraft 并清理缓存
        function finishCacheDraft() {
            const result = finishDraft(cache.draft);
            cache.draft = null;
            return result;
        }

        // 使用 runtime API 中的 mapModel 方法创建一个 `模型实例` 的 `Proxy` 对象，
        // 当 `代理方法` 开始调用时，关键词 `this` 会被指向这个 `Proxy` 对象。
        runtime.mapModel({
            // Proxy get 拦截
            get(target: any, p: string, receiver: any): any {
                const value = target[p];
                // 如果属性名不为 `state`，
                // 或 state 值并非一个 object，
                // 跳过代理
                if (
                    p !== 'state' ||
                    (!isObject(value) && !Array.isArray(value)) ||
                    value === null
                ) {
                    return value;
                }
                // 如果缓存中 immer draft 对象存在，
                // 则用该 draft 对象来代替当前的 state
                if (cache.draft) {
                    return cache.draft;
                }

                // 如果缓存中 immer draft 对象不存在，
                // 则临时创建一个 draft，并将它存入 cache。
                const draft = createCacheDraft(value);
                // 如果 `listener`不为 null，则证明当前处于异步阶段，主方法已经结束
                // 创建微任务来 finishDraft，
                // 并把每次 finish 的结果传递给下一个 MiddleWare 或 state 修改器
                if (listener) {
                    Promise.resolve().then(() => {
                        if (!cache.draft) {
                            return;
                        }
                        // 如果 cache.draft 存在，
                        // 把当前 draft 转成正常 state 数据。
                        // 之所以不直接把 draft 定义成一个变量就是因为闭包对微任务的影响。
                        const result = finishCacheDraft();
                        // 调用 `next` callback 把当前得到的结果传递出去
                        listener!(result);
                    });
                }
                // 返回创建好的 draft 作为 state 替代品
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
            // nextProcess 会在方法执行完毕时调用，
            // 所以，我们不能在方法调用过程中我们需要累积每次对 draft 的变更。
            // 这时我们可以将 next 注入 listener，以便异步过程中对 draft 实时变更做出响应。
            listener = next;
            // 在方法顺序结束时，我们需要检查缓存中是否有 draft，
            // 如果存在则强行进行一次 state 变更
            if (cache.draft) {
                next(finishCacheDraft());
            }
            return function stateProcess(result) {
                // 把最后的 draft 改变外包出去，
                // 由其他 MiddleWare 如 `takePromiseResolve` 在异步结束时，
                // 通过调用 next 当前的 stateProcess 来做完结时的 state 变更
                if (cache.draft) {
                    return next(finishCacheDraft());
                }
                return result;
            }
        }
    }

    // 创建一个 to-do list 模型
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>> {

        state: Array<Todo> = [];

        fetch(): Promise<Array<Todo>> {
            return new Promise((resolve) => {
                resolve([...todoList]);
            });
        }

        // 使用 immerMiddleWare
        @middleWare(immerMiddleWare)
        shift() {
            // 关键词 this 指向我们的 Proxy 对象，
            // 故 this.state 为一个 immer draft 对象
            this.state.shift();
            // 在方法结束时，immer draft 被转成 state 对象
        }

        // 使用 immerMiddleWare
        @middleWare(immerMiddleWare)
        async refresh() {
            // 关键词 this 指向我们的 Proxy 对象，
            // 故 this.state 为一个 immer draft 对象
            this.state.splice(0, this.state.length);
            // 在方法结束时，immer draft 被转成 state 对象
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
        // 通过 immerMiddleWare 操作
        agent.shift();
        expect(agent.state).toEqual(todoList.slice(1));
        // 测试 `immerMiddleWare` 对 async 方法的作用
        const p = agent.refresh();
        expect(agent.state).toEqual([]);
        await p;
        expect(agent.state).toEqual(todoList);
        disconnect();
    });

});

describe('连接 redux',()=>{

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

    // 这时一个 user 模型
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

    test('这是 `agent-reducer` 如何与其他库连接的例子',async ()=>{
        const reducer = create(UserModel);
        // reducer 时一个 function，我们需要获取有用的属性信息
        const { agent,connect,disconnect } = reducer;
        // 将 reducer 接入 redux API `createStore`
        const store = createStore(reducer);
        // 用 `store.dispatch` 来同步 state 变更
        connect(store.dispatch);
        // 登录
        await agent.login();
        // 登录后，state 变更应该进入 redux
        expect(agent.state).toEqual(store.getState());
        expect(store.getState()).toEqual(remoteUser);
        // 使用完毕后，需要调用 disconnect 进行销毁
        disconnect();
    });

})