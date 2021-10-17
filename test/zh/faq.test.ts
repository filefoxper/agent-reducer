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

describe('一个代理方法引起的 state 变更尚未处理完毕时，能同时处理另一个方法引起的 state 变更吗？',()=>{

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

    test('同一 `模型实例` 的 state 变更不会叠加处理，只会进行排队',()=>{
        const {agent, connect, disconnect} = create(Counter);
        const dispatch = ({type,state}:Action)=>{
            if(state>=0){
                return;
            }
            // `stepDown` 引起的变更处理尚未结束，
            // 因此 `reset` 引起的 state 变更只能等待
            agent.reset();
            // `reset` 引起的 state 变更只能等待
            expect(agent.state).toBe(state);
        }
        connect(dispatch);
        agent.stepDown();
        disconnect();
        expect(agent.state).toBe(0);
    });

});