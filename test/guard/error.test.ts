import {Model} from "../../index";
import {flow, create, effect, experience} from "../../src";

experience();

describe('guard error',()=>{

    class CountModel implements Model<number>{

        state:number = 0;

        increase(){
            return this.state+1;
        }

        decrease(){
            return this.state-1;
        }

        @flow()
        errorSyncAct(){
            const data:any = {
                id:1
            };
            data.test();
            this.increase();
        }

        @effect(()=>CountModel.prototype.decrease)
        errorSyncEffect(){
            if(this.state<0){
                this.errorSyncAct();
            }
        }
    }

    test('sync act error',()=>{
        const {agent,connect,disconnect} = create(CountModel);
        connect();
        let exception = '';
        flow.error(agent,(error,methodName)=>{
            exception = error.toString();
        });
        try {
            agent.errorSyncAct();
        }catch (e) {

        }
        disconnect();
        expect(exception).not.toBe('');
    });

    test('sync effect error',()=>{
        const {agent,connect,disconnect} = create(CountModel);
        connect();
        let exception = '';
        flow.error(agent,(error,methodName)=>{
            exception = error.toString();
        });
        agent.decrease();
        disconnect();
        expect(exception).not.toBe('');
    });

});
