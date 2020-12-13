import {
    applyMiddleWares,
    clearGlobalConfig,
    createAgentReducer,
    defaultMiddleWare,
    globalConfig,
    OriginAgent,
    MiddleWare,
    StateProcess,
    Runtime,
    Action,
    Reducer, toLifecycleMiddleWare, useMiddleWare
} from "../../src";
import produce from "immer";
import {LifecycleRuntime} from "@/libs/global.type";

describe('通过createAgentReducer产生的reducer API可以整合其他 reducer 工具', () => {

    //模拟一个微型redux
    function createStore<S>(reducer: Reducer<S, Action>, initialState: S) {
        let listener: undefined | (() => any) = undefined;
        let state = initialState;
        return {
            dispatch(action: Action) {
                state = reducer(state, action);
                if (listener) {
                    listener();
                }
            },
            getState(): S {
                return state;
            },
            subscribe(l: () => any) {
                listener = l;
                l();
                return () => {
                    listener = undefined;
                }
            }
        }
    }

    class CountAgent implements OriginAgent<number> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step = (isUp: boolean) => isUp ? this.stepUp() : this.stepDown();

        sum = (...counts: number[]): number => {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

    }

    test('通过合理使用useStoreSlot和update function 可以轻松整合一个reducer管理工具', () => {
        const reducer = createAgentReducer(CountAgent, {updateBy: 'manual'});
        // 如果需要跟其他工具整合在一起需要将env的updateBy属性设置成'manual'
        const store = createStore(reducer, 1); //创建一个store对象，store至少拥有getState和dispatch接口
        const {agent, useStoreSlot, update} = reducer;
        useStoreSlot(store); //接入创建好的store对象
        const unlisten = store.subscribe(update); // 添加update方法，保证监听到store中state变化时，可以及时更新agent.state数据
        agent.stepUp();
        expect(agent.state).toBe(2);
        expect(store.getState()).toBe(agent.state); // agent.state 应该与 store.getState() 相同
        unlisten();
    });

    test('通过合理使用老接口的update function依然可以轻松整合一个reducer管理工具，但已不推荐这种做法了', () => {
        const reducer = createAgentReducer(CountAgent, {updateBy: 'manual'});
        // 如果需要跟其他工具整合在一起需要将env的updateBy属性设置成'manual'
        const store = createStore(reducer, 1); //创建一个store对象，store至少拥有getState和dispatch接口
        const {agent, useStoreSlot, update} = reducer;
        const unlisten = store.subscribe(() => {
            update(store.getState(), store.dispatch);
        }); // 添加update方法，保证监听到store中state变化时，可以及时更新agent.state数据
        agent.stepUp();
        expect(agent.state).toBe(2);
        expect(store.getState()).toBe(agent.state); // agent.state 应该与 store.getState() 相同
        unlisten();
    });

});

describe('自定义一个MiddleWare', () => {

    test('如果使用系统内置默认middleWare，reduce-action 必须返回完整的state数据，否则数据可能有缺失', () => {
        class ObjectAgent implements OriginAgent<{ id: number, name: string }> {

            state = {id: 0, name: ''};

            //使用默认middleWare，reduce-action 必须返回完整数据
            rename = (name: string) => {
                return {name};
            }

        }

        const {agent} = createAgentReducer(ObjectAgent);
        agent.rename('jack');
        expect(agent.state.name).toBe('jack');
        expect(agent.state.id).toBeUndefined();
    });

    test('如果使用一个自定义 assignable 的 middleWare，只要返回部分数据就可以了', () => {

        const assignableMiddleWare: MiddleWare = (runtime: Runtime) => {
            // middleWare在方法调用前获取运行环境
            return (next: StateProcess) => {
                //运行结束时提供下一个MiddleWare产生的数据处理方法
                return (result: any) => {
                    //运行结束，且获取到next时，对返回数据进行进一步加工，然后通过next把加工完的数据传给下一个middleWare产生的数据处理方法，
                    //最终数据流向最底层的dispatch方法，去改变reducer state数据
                    const {target} = runtime;
                    const state = (target as OriginAgent).state;
                    if (Object.prototype.toString.apply(result) === "[object Object]") {
                        return next({...state, ...result});
                    }
                    return next(result);
                }
            }
        }

        class ObjectAgent implements OriginAgent<{ id: number, name: string }> {

            state = {id: 0, name: ''};

            //使用自定义assignableMiddleWare，reduce-action 只要返回部分数据就可以了，assignableMiddleWare会对其进行简单扩展
            //注意：这里仅仅只是个例子，真正的assignableMiddleWare要复杂的多。
            rename = (name: string) => {
                return {name};
            }

        }

        //通过applyMiddleWares可以从左到右串行使用middleWare特性。
        const {agent} = createAgentReducer(ObjectAgent, applyMiddleWares(assignableMiddleWare, defaultMiddleWare));
        agent.rename('jack');
        expect(agent.state.name).toBe('jack');
        expect(agent.state.id).toBe(0);
    })

    test('我们甚至可以自定义一个immer工具机MiddleWare', async () => {

        class ObjectAgent implements OriginAgent<{ id: number, name: string }> {

            state = {id: 0, name: ''};

            //immer语法
            immerRename = (name: string) => {
                this.state.name = name;
            }

            immerVoidRename() {
                this.immerRename('void');
            }

        }

        const immerResolver: MiddleWare = (runtime: Runtime) => {
            const {source, sourceCaller, env} = runtime;
            const sourceAgent = source as OriginAgent;
            const state = sourceAgent.state;//暂存原始agent.state对象
            //从写原对象方法，兼容immer模式
            runtime.sourceCaller = function (...args: any[]) {
                return produce(sourceAgent.state, (draft: any) => {
                    sourceAgent.state = draft;
                    return sourceCaller.apply(sourceAgent, [...args]);
                });

            }
            return (next: StateProcess) => {
                sourceAgent.state = state;
                runtime.sourceCaller = sourceCaller;
                //数据运行完毕，还原场景
                return (result: any) => {
                    return next(result);
                }
            }
        }
        const {agent} = createAgentReducer(ObjectAgent, applyMiddleWares(immerResolver, defaultMiddleWare));
        agent.immerRename('just');
        expect(agent.state.name).toBe('just');
        agent.immerVoidRename();
        expect(agent.state.name).toBe('void');
    });

    test('自定义一个LifecycleMiddleWare', () => {

        class CountAgent implements OriginAgent<number> {

            state = 0;

            sum = (...counts: number[]): number => {
                return this.state + counts.reduce((r, c): number => r + c, 0);
            };
        }

        const count5MiddleWare = toLifecycleMiddleWare((lifecycleRuntime: LifecycleRuntime) => {
            return (next: StateProcess): StateProcess => {
                return (result: number) => {
                    if (result <= 5) {
                        return next(result);
                    }
                    lifecycleRuntime.env.expire();
                }
            }
        });
        const {agent} = createAgentReducer(CountAgent);
        const copy = useMiddleWare(agent, count5MiddleWare);
        copy.sum(5);
        expect(agent.state).toBe(5);
        copy.sum(1);
        expect(agent.state).toBe(5);
        copy.sum(-1);
        expect(agent.state).toBe(5);
    });

});

//这个特性在react直接方法内会比较好用，可以防止事件合并产生的state change不及时问题
//注意：即便这很方便，我们依然不希望使用者把strict设置为false，这会让一些新加入的成员感到困惑
describe('当env.strict为false时，agent.state会在middleWares串行完后立即改变，不再等待外部store的更新变化', () => {

    function createStore<S>(reducer: Reducer<S, Action>, initialState: S) {
        let listener: undefined | (() => any) = undefined;
        let state = initialState;
        return {
            dispatch(action: Action) {
                Promise.resolve().then((() => {
                    state = reducer(state, action);
                    if (listener) {
                        listener();
                    }
                }));
            },
            getState(): S {
                return state;
            },
            subscribe(l: () => any) {
                listener = l;
                return () => {
                    listener = undefined;
                }
            }
        }
    }

    class CountAgent implements OriginAgent<number> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step = (isUp: boolean) => isUp ? this.stepUp() : this.stepDown();

        sum = (...counts: number[]): number => {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

    }

    test('env.strict 默认为 true, agent state 会响应式跟随store中state的变化更新改变', () => {
        const reducer = createAgentReducer(CountAgent, {updateBy: 'manual'});
        const store = createStore(reducer, 1);
        const {agent, useStoreSlot, update} = reducer;
        useStoreSlot(store);
        const unlisten = store.subscribe(update);
        update();
        agent.stepUp();
        expect(agent.state).toBe(1);
        expect(store.getState()).toBe(agent.state);
        unlisten();
    });

    test('env.strict 默认为 true, 当设置为 false 时, agent state 将不再等待store，并立即发生改变', async () => {
        const reducer = createAgentReducer(CountAgent, {updateBy: 'manual', strict: false});
        const store = createStore(reducer, 1);
        const {agent, useStoreSlot, update} = reducer;
        useStoreSlot(store);
        const unlisten = store.subscribe(update);
        update();
        agent.stepUp();
        expect(agent.state).toBe(2);
        expect(store.getState()).toBe(1);
        unlisten();
        await Promise.resolve();
        expect(store.getState()).toBe(2);
    });

});

describe('当env.expired设置为true时，agent处于过期状态，任何数据修改都将无效', () => {

    function createStore<S>(reducer: Reducer<S, Action>, initialState: S) {
        let listener: undefined | (() => any) = undefined;
        let state = initialState;
        return {
            dispatch(action: Action) {
                state = reducer(state, action);
                if (listener) {
                    listener();
                }
            },
            getState(): S {
                return state;
            },
            subscribe(l: () => any) {
                listener = l;
                return () => {
                    listener = undefined;
                }
            }
        }
    }

    class CountAgent implements OriginAgent<number> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step = (isUp: boolean) => isUp ? this.stepUp() : this.stepDown();

        sum = (...counts: number[]): number => {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

    }

    test('当env.expired设置为true时，agent的任何数据修改都将无效', () => {
        const reducer = createAgentReducer(CountAgent, {updateBy: 'manual', expired: true});
        const store = createStore(reducer, 1);
        const {agent, useStoreSlot, update} = reducer;
        useStoreSlot(store);
        const unlisten = store.subscribe(update);
        update();
        agent.stepUp();
        expect(agent.state).toBe(1);
        expect(store.getState()).toBe(1);
        reducer.env.expired = false;
        agent.stepUp();
        expect(agent.state).toBe(2);
        expect(store.getState()).toBe(2);
        unlisten();
    });

});

describe('通过 globalConfig 可以设置浏览器端全局配置', () => {

    class ObjectAgent implements OriginAgent<{ id: number, name: string }> {

        state = {id: 0, name: ''};

        rename = (name: string) => {
            return {name};
        }

    }

    beforeAll(() => {
        const assignableMiddleWare: MiddleWare = (runtime: Runtime) => {
            return (next: StateProcess) => {
                return (result: any) => {
                    const {target} = runtime;
                    const state = (target as OriginAgent).state;
                    if (Object.prototype.toString.apply(result) === "[object Object]") {
                        return next({...state, ...result});
                    }
                    return next(result);
                }
            }
        }

        //设置全局
        globalConfig({
            env: {strict: false}, //设置全局状态中的strict为false
            defaultMiddleWare: applyMiddleWares(assignableMiddleWare, defaultMiddleWare) //在全局defaultMiddleWare前加上assignableMiddleWare特性
        });
    });

    afterAll(() => {
        clearGlobalConfig();
    });

    test('使用全局环境运行', () => {
        const {agent} = createAgentReducer(ObjectAgent);
        agent.rename('jack');
        expect(agent.state.name).toBe('jack');
        expect(agent.state.id).toBe(0);
    });

});