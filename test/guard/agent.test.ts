import {Model} from "../../index";
import {create} from "../../src";

class CountModel implements Model<number>{

    state:number = 0;

    data?:number;

    increase(){
        return this.state+1;
    }

}

describe('guard agent',()=>{

    let Proxy:any;

    beforeAll(()=>{
        Proxy = global.Proxy;
        // @ts-ignore
        global.Proxy = undefined;
    });

    afterAll(()=>{
        // @ts-ignore
        global.Proxy = Proxy;
    });

    test('if there is no Proxy in global, agent-reducer still works...',()=>{
        const {agent,connect,disconnect} = create(CountModel);
        connect();
        agent.increase();
        expect(agent.state).toBe(1);
        disconnect();
    });

    test('if there is no Proxy in global, set agent data still works...',()=>{
        const model = new CountModel();
        const {agent,connect,disconnect} = create(model);
        connect();
        agent.increase();
        agent.data = 1;
        expect(agent.state).toBe(1);
        expect(model.data).toBe(1);
        disconnect();
    });

    test('reset a agent method can lead error',()=>{
        const model = new CountModel();
        const {agent,connect,disconnect} = create(model);
        connect();
        agent.increase();
        agent.data = 1;
        expect(agent.state).toBe(1);
        expect(model.data).toBe(1);
        expect(()=>agent.increase=()=>1).toThrow();
        disconnect();
    });

});