import {create} from '../../src';
import {Action, Model} from "../../src/libs/global.type";

describe('If there is no `Proxy` in global, can it run normally?',()=>{

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

    let P:Function|null = null;

    beforeAll(()=>{
        P = global.Proxy;
        // remove Proxy for test
        //@ts-ignore
        global.Proxy = undefined;
    });

    afterAll(()=>{
        //@ts-ignore
        global.Proxy = P;
        P = null;
    });

    test('If there is no `Proxy` in global, it still works well',()=>{
        const {agent, connect, disconnect} = create(Counter);
        connect();
        agent.stepUp();
        disconnect();
        expect(agent.state).toBe(1);
    });

});

describe('If there is an action still alive, can we start another one?',()=>{

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

        reset(){
            return 0;
        }

    }

    test('the state changes immediately, but the notify about this change always waits for the prev action notify',()=>{
        const {agent, connect, disconnect} = create(Counter);
        const actionRecords:([string,'start'|'end'])[] = [];
        const dispatch = ({type,state}:Action)=>{
            actionRecords.push([type,'start']);
            if(state>=0){
                actionRecords.push([type,'end']);
                return;
            }
            // Action `stepDown` is not finished,
            // so, the notify from action `reset` is waiting.
            agent.reset();
            // The state change from `reset` changes immediately.
            expect(agent.state).toBe(0);
            actionRecords.push([type,'end']);
        }
        connect(dispatch);
        agent.stepDown();
        disconnect();
        expect(agent.state).toBe(0);
        expect(actionRecords).toEqual([
            ['stepDown','start'],
            ['stepDown','end'],
            ['reset','start'],
            ['reset','end']
        ]);
    });

});