import {Model} from "../../src/libs/global.type";
import {create, connect, middleWare, MiddleWarePresets, withMiddleWare} from "../../src";

describe('create',()=>{

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

    test('use `create` API',()=>{
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

});

describe('use shortcut of API `create`',()=>{

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

    test('use API `connect`',()=>{
        const {run} = connect(Counter);
        const state = run((agent)=>{
            agent.stepUp();
            return agent.state;
        });
        expect(state).toBe(1);
    });

});

describe('withMiddleWare',()=>{

    // this is a counter model,
    // we can increase or decrease its state
    class Counter implements Model<number> {

        state = 0;  // initial state

        // consider what the method returns as a next state for model
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        async step(isUp: boolean):Promise<number>{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    test('use `withMiddleWare` API',async ()=>{
        // use create api, you can create an `Agent` object from its `Model`
        const {agent,connect,disconnect} = create(Counter);
        // before call the methods,
        // you need to connect it first
        connect();
        // use `withMiddleWare` to copy an `Agent` use the passed MiddleWare
        const copy = withMiddleWare(agent,MiddleWarePresets.takePromiseResolve());
        await copy.step(true);
        disconnect();
        expect(agent.state).toBe(1);
    });

});

describe('middleWare',()=>{

    // this is a counter model,
    // we can increase or decrease its state
    class Counter implements Model<number> {

        state = 0;  // initial state

        // consider what the method returns as a next state for model
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        @middleWare(MiddleWarePresets.takePromiseResolve())
        async step(isUp: boolean):Promise<number>{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    test('use `middleWare` API',async ()=>{
        // use create api, you can create an `Agent` object from its `Model`
        const {agent,connect,disconnect} = create(Counter);
        // before call the methods,
        // you need to connect it first
        connect();
        await agent.step(true);
        disconnect();
        expect(agent.state).toBe(1);
    });

});

describe('MiddleWarePresets',()=>{

    const delay = (ms:number)=>new Promise((r)=>setTimeout(r,ms));

    // this is a counter model,
    // we can increase or decrease its state
    class Counter implements Model<number> {

        state = 0;  // initial state

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
        // use create api, you can create an `Agent` object from its `Model`
        const {agent,connect,disconnect} = create(Counter);
        // before call the methods,
        // you need to connect it first
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

