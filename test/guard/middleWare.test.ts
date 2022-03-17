import {Model} from "../../index";
import {create, middleWare, MiddleWarePresets} from "../../src";

describe('guard for middleWare',()=>{

    class CountModel implements Model<number>{

        state=0;

        @middleWare(MiddleWarePresets.takeUnstableBlock())
        async increase(){
            return this.state+1;
        }

        @middleWare(MiddleWarePresets.takeUnstableBlock())
        decrease(){
            return this.state-1;
        }

        @middleWare(MiddleWarePresets.takeUnstableThrottle(10))
        throttleIncrease(){
            return this.state+1;
        }

        @middleWare(MiddleWarePresets.takeUnstableDebounce(100,{leading:true}))
        debDecrease(){
            return this.state-1;
        }

    }

    test('block middleWare',async ()=>{
        const {agent,connect,disconnect} = create(CountModel);
        connect();
        await Promise.all([
            agent.increase(),
            agent.increase()
        ]);
        expect(agent.state).toBe(1);
        agent.decrease();
        agent.decrease();
        expect(agent.state).toBe(-1);
        disconnect();
    });

    test('throttle middleWare',async ()=>{
        const {agent,connect,disconnect} = create(CountModel);
        connect();
        agent.throttleIncrease();
        agent.throttleIncrease();
        expect(agent.state).toBe(1);
        await new Promise((resolve)=>setTimeout(resolve,10));
        agent.throttleIncrease();
        expect(agent.state).toBe(2);
        disconnect();
    });

    test('unstable debounce middleWare',async ()=>{
        const {agent,connect,disconnect} = create(CountModel);
        connect();
        agent.debDecrease();
        expect(agent.state).toBe(-1);
        await new Promise((resolve)=>setTimeout(resolve,30));
        agent.debDecrease();
        expect(agent.state).toBe(-1);
        await new Promise((resolve)=>setTimeout(resolve,30));
        agent.debDecrease();
        expect(agent.state).toBe(-1);
        await new Promise((resolve)=>setTimeout(resolve,100));
        agent.debDecrease();
        expect(agent.state).toBe(-2);
        disconnect();
    });

});