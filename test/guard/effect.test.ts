import {addEffect, create} from "../../src";
import {EffectCallback, Model} from "../../src/libs/global.type";
import {agentEffectsKey} from "../../src/libs/defines";

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

    [agentEffectsKey]?:[]

}

describe("guard effect",()=>{

    test('ensure effect can be unmounted',()=>{
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const effectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
            if(state<0){
                agent.reset();
            }
        });

        const effect =addEffect(effectCallback,model, model.decrease);

        agent.decrease();
        expect(agent.state).toBe(0);

        effect.update(jest.fn());

        agent.decrease();
        expect(agent.state).toBe(-1);

        expect(effectCallback).toBeCalledTimes(1);

        disconnect();
        expect(agent[agentEffectsKey]||[]).toEqual([]);
    });

    test('ensure that the exception of effect callback will not tear down other effects running',()=>{
        const error = console.error;
        // @ts-ignore
        console.error=undefined;
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const tearDownEffectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
            if(state<0){
                (agent as unknown as {notExistMethod:()=>any}).notExistMethod();
            }
        });

        const effectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
            if(state<0){
                agent.reset();
            }
        });

        addEffect(tearDownEffectCallback,model,model.decrease);
        addEffect(effectCallback,model, model.decrease);

        agent.decrease();
        expect(agent.state).toBe(0);
        disconnect();
        console.error=error;
    });

    test('ensure that the exception of effect destroy will not tear down other effects running',()=>{
        const error = console.error;
        // @ts-ignore
        console.error=undefined;
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const tearDownEffectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
            return ()=>{
                (agent as unknown as {notExistMethod:()=>any}).notExistMethod();
            }
        });

        const effectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
            if(state<0){
                agent.reset();
            }
        });

        addEffect(tearDownEffectCallback,model,model.decrease);
        addEffect(effectCallback,model, model.decrease);

        agent.decrease();
        agent.decrease();
        expect(agent.state).toBe(0);
        disconnect();
        console.error=error;
    });

});

describe("the trigger time about effect", () => {

    test('usually the model effect is triggered by calling API `addEffect` immediately', () => {
        const model = new CountModel();
        const {connect, disconnect} = create(model);
        connect();

        const effectCallback: EffectCallback<number> = jest.fn();

        addEffect(effectCallback, model);

        expect(effectCallback).toBeCalledTimes(1);
        disconnect();
    });

    test('if we add a model effect in another effect callback, this model effect will be triggered after the main effect callback is finished', () => {
        const model = new CountModel();
        const { agent, connect, disconnect} = create(model);
        connect();

        let effectTriggerStack: string[] = [];

        const modelCallback: EffectCallback<number> = jest.fn(() => {
            effectTriggerStack.push('addition model effect');
        });

        const anotherModelCallback: EffectCallback<number> = jest.fn(() => {
            addEffect(modelCallback, model);
            effectTriggerStack.push('model effect');
        });

        addEffect(anotherModelCallback, model);

        expect(effectTriggerStack).toEqual([
            'model effect',
            'addition model effect'
        ]);
        disconnect();

        connect();

        effectTriggerStack = [];

        const methodCallback: EffectCallback<number> = jest.fn(()=>{
            addEffect(modelCallback, model);
            effectTriggerStack.push('method effect');
        });

        addEffect(methodCallback,model, model.increase);

        agent.increase();

        expect(effectTriggerStack).toEqual([
            'method effect',
            'addition model effect'
        ]);
        disconnect();
    });

    test('after mounting, the model effect will be triggered by model state changes',()=>{
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const effectCallback: EffectCallback<number> = jest.fn();

        addEffect(effectCallback, model);

        agent.reset();

        agent.increase();

        expect(effectCallback).toBeCalledTimes(2);
        disconnect();
    });

    test('the method effect is triggered only when the model state is changed by the method which you want to monitor',()=>{
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const effectCallback: EffectCallback<number> = jest.fn();

        addEffect(effectCallback, model, model.decrease);

        agent.increase();

        agent.decrease()

        expect(effectCallback).toBeCalledTimes(1);
        disconnect();
    });

    test('if model has not connected, addEffect can lead error',()=>{
        const model = new CountModel();
        create(model);

        const effectCallback: EffectCallback<number> = jest.fn();

        expect(()=>addEffect(effectCallback, model, model.decrease)).toThrow();
    });

});