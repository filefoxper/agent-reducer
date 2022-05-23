import {Action, Model} from "../../index";
import {create, effect, weakSharing} from "../../src";

describe('test of advanced actions',()=>{

    class Counter implements Model<number>{

        state:number = 0;

        increase(){
            return this.state+1;
        }

        decrease(){
            return this.state-1;
        }

        reset(){
            return 0;
        }

        @effect(()=>Counter.prototype.decrease)
        effect(){
            if(this.state<0){
                this.reset();
            }
        }

    }

    test('advanced actions will auto trigger the connecting',()=>{
        const {agent,connect,disconnect} = create(Counter);
        let state = agent.state;
        agent.increase();
        expect(agent.state).toBe(1);
        expect(agent.state).not.toBe(state);
        connect((action)=>{
            state=action.state;
        });
        expect(state).toBe(1);
        disconnect();
    });

    test('advanced effect will not be blocked',()=>{
        const {agent,connect,disconnect} = create(Counter);
        let state = agent.state;
        agent.decrease();
        expect(agent.state).toBe(0);
        connect((action)=>{
            state=action.state;
        });
        disconnect();
    });

    test('advanced action will not be cleared by other sharing disconnection when use weakSharing',()=>{
        const ref = weakSharing(()=>Counter);
        const {agent:ag1,connect:c1,disconnect:d1} = create(ref.current);
        const {agent:ag2,connect:c2,disconnect:d2} = create(ref.current);
        c1();
        ag2.increase();
        d1();
        expect(ref.current.state).toBe(1);
        let state = ag2.state;
        c2((ac)=>{
            state = ac.state;
        });
        expect(state).toBe(1);
        d2();
    });

});
