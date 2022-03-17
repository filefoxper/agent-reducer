import {Action, Model} from "../../index";
import {create} from "../../src";

describe('action queue',()=>{
    type UserState = {
        id?:number,
        name?:string,
        sex?:'male'|'female',
        age?:number
    }

    class User implements Model<UserState>{

        state:UserState = {};

        updateId(id:number){
            return {id,name:'xiao.M'};
        }

        updateAge(age:number){
            return {...this.state,age};
        }

        updateSex(sex:'male'|'female'){
            return {...this.state,sex};
        }

    }

    test('action should run with queue',async ()=>{
        const processStates:string[] = [];
        const {agent,connect,disconnect} = create(User);
        const dispatch = (action:Action)=>{
            processStates.push(action.type);
            if(action.type==='updateId'){
                agent.updateAge(24);
                agent.updateSex('male');
            }
        }
        const basic = {
            name:'xiao.M',
            age:24,
            sex:'male',
        }
        connect(dispatch);
        agent.updateId(2);
        expect(processStates).toEqual([
            'updateId',
            'updateAge',
            'updateSex',
        ]);
        expect(agent.state).toEqual({...basic,id:2});
        disconnect();
    });
});