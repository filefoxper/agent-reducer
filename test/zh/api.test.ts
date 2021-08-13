import {Model} from "../../src/libs/global.type";
import {create, connect, middleWare, MiddleWarePresets, withMiddleWare} from "../../src";

describe('create',()=>{

    // 这时个计数器模型，
    // 我们可以增加或减少 state 值
    class Counter implements Model<number> {

        state = 0;  // 初始化 state 值

        // 返回值将成为下一个 state
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    test('使用 `create` API',()=>{
        // 使用 `create` API 为 `模型` 创建一个 `代理`
        const {agent,connect,disconnect} = create(Counter);
        // 开始前，你需要先进行模型到代理的连接
        connect();
        // `agent.stepUp` 的返回值将成为下一个 state
        agent.stepUp();
        // 如果代理和模型实例已经不再具备利用价值，
        // 需要通过 disconnect 销毁链接
        disconnect();
        expect(agent.state).toBe(1);
    });

});

describe('API `create` 的快捷用法',()=>{

    // 这时个计数器模型，
    // 我们可以增加或减少 state 值
    class Counter implements Model<number> {

        state = 0;  // 初始化 state 值

        // 返回值将成为下一个 state
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    test('使用 API `connect`',()=>{
        const {run} = connect(Counter);
        const state = run((agent)=>{
            agent.stepUp();
            return agent.state;
        });
        expect(state).toBe(1);
    });

});

describe('withMiddleWare',()=>{

    // 这时个计数器模型，
    // 我们可以增加或减少 state 值
    class Counter implements Model<number> {

        state = 0;  // 初始化 state 值

        // 返回值将成为下一个 state
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    test('使用 `withMiddleWare` API',async ()=>{
        // 使用 `create` API 为 `模型` 创建一个 `代理`
        const {agent,connect,disconnect} = create(Counter);
        // 开始前，你需要先进行模型到代理的连接
        connect();
        // 使用 `withMiddleWare` 复制 `代理`，
        // 并传入 MiddleWare，覆盖原代理方法上的 MiddleWare
        const copy = withMiddleWare(agent,MiddleWarePresets.takePromiseResolve());
        await copy.step(true);
        disconnect();
        expect(agent.state).toBe(1);
    });

});

describe('middleWare',()=>{

    class Counter implements Model<number> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        // decorator 用法
        @middleWare(MiddleWarePresets.takePromiseResolve())
        async step(isUp: boolean):Promise<number>{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    test('使用 `middleWare` API',async ()=>{
        const {agent,connect,disconnect} = create(Counter);
        connect();
        await agent.step(true);
        disconnect();
        expect(agent.state).toBe(1);
    });

});

describe('MiddleWarePresets',()=>{

    const delay = (ms:number)=>new Promise((r)=>setTimeout(r,ms));

    class Counter implements Model<number> {

        state = 0;

        @middleWare(MiddleWarePresets.takeUnstableDebounce(100))
        stepUp(): number{
            return  this.state + 1;
        }

        @middleWare(MiddleWarePresets.takeUnstableThrottleAssignable(100))
        stepDown(): number{
            return this.state - 1;
        }

        @middleWare(MiddleWarePresets.takeLatest())
        async step(isUp: boolean):Promise<number>{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    test('use `middleWare` API',async ()=>{
        const {agent,connect,disconnect} = create(Counter);
        connect();
        agent.stepUp();
        agent.stepUp();
        await delay(100);
        expect(agent.state).not.toBe(2);
        expect(agent.state).toBe(1);
        agent.stepDown();
        agent.stepDown();
        expect(agent.state).not.toBe(-1);
        expect(agent.state).toBe(0);
        disconnect();
    });

});

