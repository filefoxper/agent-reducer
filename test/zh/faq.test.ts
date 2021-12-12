import {create} from '../../src';
import {Action, Model} from "../../src/libs/global.type";

describe('如果环境中无 `Proxy` 构造器能正常运行吗？',()=>{

    class Counter implements Model<number> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    let P:Function|null = null;

    beforeAll(()=>{
        P = global.Proxy;
        // 移除 Proxy
        //@ts-ignore
        global.Proxy = undefined;
    });

    afterAll(()=>{
        //@ts-ignore
        global.Proxy = P;
        P = null;
    });

    test('没有 `Proxy` 构造函数，仍然能正常工作',()=>{
        const {agent, connect, disconnect} = create(Counter);
        connect();
        agent.stepUp();
        disconnect();
        expect(agent.state).toBe(1);
    });

});

describe('一个代理方法引起的 state 变更尚未处理完毕时，能同时处理该代理另一个方法引起的 state 变更吗？',()=>{

    class Counter implements Model<number> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{
            return isUp ? this.stepUp() : this.stepDown();
        }

        reset(){
            return 0;
        }

    }

    test('能，但在处理完之前不能处理其他 state 变更引发的处理。其他的变更处理会排队等候运行。',()=>{
        const {agent, connect, disconnect} = create(Counter);
        const actionRecords:([string,'start'|'end'])[] = [];
        const dispatch = ({type,state}:Action)=>{
            actionRecords.push([type,'start']);
            if(state>=0){
                actionRecords.push([type,'end']);
                return;
            }
            // `stepDown` 引起的变更处理尚未结束，
            // 因此 `reset` 引起的变更处理只能等待
            agent.reset();
            // `reset` 引起的 state 变更会通过叠加立即执行
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