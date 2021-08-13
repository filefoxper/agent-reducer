import {
    MiddleWarePresets,
    create,
    middleWare
} from '../../src';
import {Action, Model} from '../../src/libs/global.type'

describe('基本用法',()=>{

    // 这是一个用于计算数字加减的模型，
    // 我们的方法调用将影响模型 state 的变化
    class Counter implements Model<number> {

        state = 0; // state 初始值

        // 方法调用的返回值可以当作模型的下一个 state
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{
            return isUp ? this.stepUp() : this.stepDown();
        }

        // 如果想要使用异步返回值作为 state,
        // 可以通过 MiddleWare 完成转换工作
        @middleWare(MiddleWarePresets.takePromiseResolve())
        async sumByAsync(): Promise<number> {
            const counts = await Promise.resolve([1,2,3]);
            return counts.reduce((r, c): number => r + c, 0);
        }

    }

    test('默认使用 method 返回值作为下一个 state',()=>{
        // 通过 create api 自 `Model` 创建一个 `Agent` 对象
        const {agent,connect,disconnect} = create(Counter);
        // 在调用方法前，需要使用 connect 作一次连接处理
        connect();
        // agent.stepUp 方法返回值将成为下一个 state
        agent.stepUp();
        // 如果不再需要使用当前 agent 对象，
        // 需要通过 disconnect 对之前链接进行销毁处理
        disconnect();
        expect(agent.state).toBe(1);
    });

    test('如果返回值是一个 promise 对象，你可能需要 MiddleWare 获取 promise resolve 数据作为下一个 state',async ()=>{
        // 通过 create api 自 `Model` 创建一个 `Agent` 对象
        const {agent,connect,disconnect} = create(Counter);
        // 在调用方法前，需要使用 connect 作一次连接处理
        connect();
        // agent.sumByAsync 方法返回值为一个 promise 对象，
        // 它将被 MiddleWarePresets.takePromiseResolve(() 进行再加工，
        // 再加工值（promise resolve值）将成为下一个 state。
        await agent.sumByAsync();
        // 如果不再需要使用当前 agent 对象，
        // 需要通过 disconnect 对之前链接进行销毁处理
        disconnect();
        expect(agent.state).toBe(6);
    });

});

describe('同步共享 state 更新',()=>{

    // 这是一个用于计算数字加减的模型，
    // 我们的方法调用将影响模型 state 的变化
    class Counter implements Model<number> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    const counter = new Counter();

    test('两个获多个使用相同模型实例的 agent，同步共享 state 更新',()=>{
        // 为两个不同的 agent reducer 对象创建两个 listener，dispatch1 与 dispatch2
        const dispatch1 = jest.fn().mockImplementation((action:Action)=>{
            // 当前监听器可以收到 agent 改变 state 产生的通知。
            // 通知数据 action 中包含了改变的 state 对象。
            expect(action.state).toBe(1);
        });
        const dispatch2 = jest.fn().mockImplementation((action:Action)=>{
            expect(action.state).toBe(1);
        });
        // 通过 create api 自 `Model` 创建一个 `agent reducer`
        const reducer1 = create(counter);
        const reducer2 = create(counter);
        // 在调用方法前，需要使用 connect 作一次连接处理，
        // 通过 connect 可以接入一个监听器，如：dispatch1
        reducer1.connect(dispatch1);
        reducer2.connect(dispatch2);
        // agent.stepUp 方法返回值将成为下一个 state，
        // 并把 state 更新通知到 reducer2.agent
        reducer1.agent.stepUp();

        expect(dispatch1).toBeCalled();     // dispatch1 工作
        expect(dispatch2).toBeCalled();     // dispatch2 工作
        expect(counter.state).toBe(1);
    });

});