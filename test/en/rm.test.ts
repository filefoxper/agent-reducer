import {
    MiddleWarePresets,
    create,
    middleWare
} from '../../src';
import {Action, Model} from '../../src/libs/global.type'

describe('basic usage',()=>{

    // this is a counter model,
    // we can increase or decrease its state
    class Counter implements Model<number> {

        state = 0;  // initial state

        // consider what the method returns as a next state for model
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{
            return isUp ? this.stepUp() : this.stepDown();
        }

        // if you want to take a promise resolved data as next state,
        // you can add a middleWare.
        @middleWare(MiddleWarePresets.takePromiseResolve())
        async sumByAsync(): Promise<number> {
            const counts = await Promise.resolve([1,2,3]);
            return counts.reduce((r, c): number => r + c, 0);
        }

    }

    test('by default, a method result should be the next state',()=>{
        // use create api, you can create an `Agent` object from its `Model`
        const {agent,connect,disconnect} = create(Counter);
        // before call the methods,
        // you need to connect it first
        connect();
        // the result returned by method `agent.stepUp` will be next state
        agent.stepUp();
        // if there is no more work for `Agent`,
        // you should disconnect it.
        disconnect();
        expect(agent.state).toBe(1);
    });

    test('If you want to take a promise resolve data as next state, you should use MiddleWare',async ()=>{
        // use create api, you can create an `Agent` object from its `Model`
        const {agent,connect,disconnect} = create(Counter);
        // before call the methods,
        // you need to connect it first
        connect();
        // the result returned by method `agent.sumByAsync`
        // will be reproduced by `MiddleWarePresets.takePromiseResolve()`,
        // then this MiddleWare will take the promise resolved value as next state
        await agent.sumByAsync();
        // if there is no more work for `Agent`,
        // you should disconnect it.
        disconnect();
        expect(agent.state).toBe(6);
    });

});

describe('update by observing another agent',()=>{

    // this is a counter model,
    // we can increase or decrease its state
    class Counter implements Model<number> {

        state = 0;  // initial state

        // consider what the method returns as a next state for model
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    const counter = new Counter();

    test('an agent can share state change with another one, if they share a same model instance',()=>{
        // we create two listeners `dispatch1` and `dispatch2` for different agent reducer function
        const dispatch1 = jest.fn().mockImplementation((action:Action)=>{
            // the agent action contains a `state` property,
            // this state is what the model state should be now.
            expect(action.state).toBe(1);
        });
        const dispatch2 = jest.fn().mockImplementation((action:Action)=>{
            expect(action.state).toBe(1);
        });
        // use create api,
        // you can create an `Agent` object from its `Model`
        const reducer1 = create(counter);
        const reducer2 = create(counter);
        // before call the methods,
        // you need to connect it first,
        // you can add a listener to listen the agent action,
        // by using connect function
        reducer1.connect(dispatch1);
        reducer2.connect(dispatch2);
        // calling result which is returned by method `stepUp` will be next state.
        // then reducer1.agent will notify state change to reducer2.agent.
        reducer1.agent.stepUp();

        expect(dispatch1).toBeCalled();     // dispatch1 work
        expect(dispatch2).toBeCalled();     // dispatch2 work
        expect(counter.state).toBe(1);
    });

});