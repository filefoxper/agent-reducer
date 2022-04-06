import {EffectCallback, Model} from "../../src/libs/global.type";
import {addEffect, create, effect} from "../../src";

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
        addEffect(effectCallback, model,model.decrease);

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
        addEffect(decreaseEffectCallback, agent,agent.decrease);

        agent.decrease();
        expect(agent.state).toBe(0);
        agent.increase();
        expect(agent.state).toBe(1);
        expect(effectCallback).toBeCalledTimes(4);
        expect(decreaseEffectCallback).toBeCalledTimes(1);
        disconnect();
    });

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

        addEffect(effectCallback, model,model.decrease);

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

        const effect = addEffect(effectCallback, model,model.decrease);

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

        const {unmount} = addEffect(effectCallback, model,model.decrease);

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
