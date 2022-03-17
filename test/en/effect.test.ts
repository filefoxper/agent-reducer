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

describe('the basic usage about effect', () => {

    test('use model effect', () => {
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        // effect callback accepts params: prevState, state, methodName
        const effectCallback: EffectCallback<number> = jest.fn((prev,state) => {
            if (state < 0) {
                // time: 3
                // if the state is lt 0,
                // use `agent.reset` method to set state to 0,
                // reset makes state change happen,
                // so it triggers this effect callback too.
                agent.reset();
            }
        });
        // time: 1
        // add effect callback to listen the model state change,
        // the callback is called immediately,
        // and the current state is a initial state 0,
        // so, it will not call `agent.reset`.
        addEffect(effectCallback, model);

        // time: 2
        // decrease method make the state to be -1,
        // but the effect callback is triggered,
        // then the `agent.reset` method reset state to 0
        agent.decrease();
        expect(agent.state).toBe(0);

        // time: 4
        // increase method make the state to be 1,
        // and the effect callback is triggered,
        // but the current state can not make `agent.reset` start.
        agent.increase();
        expect(agent.state).toBe(1);
        // watch the time mark
        expect(effectCallback).toBeCalledTimes(4);
        disconnect();
    });

    test('use method effect', () => {
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const effectCallback: EffectCallback<number> = jest.fn((prev,state) => {
            if (state < 0) {
                // if the state is lt 0,
                // use `agent.reset` method to set state to 0
                agent.reset();
            }
        });

        // add effect on the `decrease` method,
        // and filter the state changes from `decrease` method.
        // It only triggered by the method `decrease` state change.
        addEffect(effectCallback, model, model.decrease);

        // `decrease` state to -1 lead to `reset`
        agent.decrease();
        expect(agent.state).toBe(0);
        agent.increase();
        expect(agent.state).toBe(1);
        // the `increase` above can not trigger effect callback,
        // which only filter the state change from `decrease` method.
        expect(effectCallback).toBeCalledTimes(1);
        disconnect();
    });

    test('we can add effect onto a agent or method from agent too', () => {
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const effectCallback: EffectCallback<number> = jest.fn();

        const decreaseEffectCallback: EffectCallback<number> = jest.fn((prev,state) => {
            if (state < 0) {
                agent.reset();
            }
        });

        // add effect onto a agent is same as add it onto the model
        addEffect(effectCallback, agent);

        // add effect onto a agent method is same as add it onto the model method
        addEffect(decreaseEffectCallback, agent, agent.decrease);

        agent.decrease();
        expect(agent.state).toBe(0);
        agent.increase();
        expect(agent.state).toBe(1);
        expect(effectCallback).toBeCalledTimes(4);
        expect(decreaseEffectCallback).toBeCalledTimes(1);
        disconnect();
    });

    test('use destroy callback returned from effect callback',()=>{
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const destroy = jest.fn();

        const effectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
            if(state<0){
                agent.reset();
            }
            // if the effect callback returns a destroy callback,
            // the destroy callback will be invoked every time before effect callback
            // running again.
            // It will also be invoked when the disconnect method has destroyed all agent connections on model
            return destroy;
        });

        addEffect(effectCallback, model, model.decrease);

        // first time to trigger effect, so the destroy callback will not be invoked.
        agent.decrease();
        expect(agent.state).toBe(0);

        expect(effectCallback).toBeCalledTimes(1);
        expect(destroy).toBeCalledTimes(0);

        // trigger effect again, before the effect callback running,
        // the destroy callback is invoked.
        agent.decrease();
        expect(agent.state).toBe(0);

        expect(effectCallback).toBeCalledTimes(2);
        expect(destroy).toBeCalledTimes(1);

        // disconnect make destroy work last time.
        disconnect();
        expect(destroy).toBeCalledTimes(2);
    });

});

describe("use decorator effect",()=>{

    class InnerCountModel implements Model<number> {

        state = 0;

        increase() {
            return this.state + 1;
        }

        decrease() {
            return this.state - 1;
        }

        reset(to?:number) {
            return to||0;
        }

        // effect decorator can create and mount a effect
        // by using the decorated method as a effect callback,
        // and if there is no param for this decorator,
        // the effect will pick the model instance of this class as target
        // for listening.
        // In a decorator effect callback,
        // the keyword `this` is a temporary `agent` from model,
        // created for by model system.
        // So, you can deploy methods to change state in these effect callbacks.
        @effect()
        gtZeroEffect(prevState:number, state:number){
            if(state<0){
                // the keyword `this` is a temporary `agent` from model
                this.reset();
            }
        }

        // give a method as effect param,
        // the decorated method will only be triggered by the param method state changes.
        @effect(()=>InnerCountModel.prototype.increase)
        ltFiveEffect(prevState:number, state:number){
            if(state>4){
                // the keyword `this` is a temporary `agent` from model
                this.reset(4);
            }
        }

    }

    test('use effect decorator',()=>{
        const model = new InnerCountModel();
        const {agent,connect,disconnect} = create(model);
        connect();
        agent.decrease();
        // the state should be -1,
        // but it is reset by default effect: `gtZeroEffect`
        expect(agent.state).toBe(0);
        for(let i=0;i<5;i++){
            agent.increase();
        }
        // the state should be 5,
        // but it is reset by default effect: `ltFiveEffect`
        expect(agent.state).toBe(4);
        disconnect();
    });

});

describe("use other abilities of effect",()=>{

    test('use update method for updating the effect callback',()=>{
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const effectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
            if(state<0){
                agent.reset();
            }
        });

        const effect = addEffect(effectCallback, model, 'decrease');

        agent.decrease();
        expect(agent.state).toBe(0);

        // update effect callback to another callback
        effect.update(jest.fn());

        agent.decrease();
        // the new effect callback is a mock function,
        // it can not reset state.
        expect(agent.state).toBe(-1);

        expect(effectCallback).toBeCalledTimes(1);

        disconnect();
    });

    test('unmount effect manually',()=>{
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

        const {unmount} = addEffect(effectCallback, model,'decrease');

        agent.decrease();
        expect(agent.state).toBe(0);

        expect(effectCallback).toBeCalledTimes(1);
        // unmount here
        unmount();
        // when the effect is unmounted, the destroy callback runs.
        expect(destroy).toBeCalledTimes(1);

        // there is no effect for decrease method now,
        // so, the state is decreased to -1
        agent.decrease();
        expect(agent.state).toBe(-1);

        expect(effectCallback).toBeCalledTimes(1);
        // there is no effect for decrease method now,
        // so, the destroy callback will not be invoked.
        expect(destroy).toBeCalledTimes(1);

        disconnect();
        expect(destroy).toBeCalledTimes(1);
    });

});