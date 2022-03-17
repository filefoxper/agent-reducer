import {Model} from "../../src/libs/global.type";
import {
    applyMiddleWares,
    connect,
    create, defaultMiddleWare,
    isAgent,
    LifecycleMiddleWares,
    middleWare,
    MiddleWarePresets,
    MiddleWares
} from "../../src";

class CountModel implements Model<number>{

    state:number = 0;

    increase(){
        return this.state+1;
    }

    @middleWare(applyMiddleWares(LifecycleMiddleWares.takeLatest(),MiddleWares.takePromiseResolve(),defaultMiddleWare))
    async lazyIncrease(){
        return this.state+1;
    }

}

describe('guard defines',()=>{

    test('we can use API `isAgent` to judge if an object is a valid agent object.',()=>{
        const model = new CountModel();
        const {agent,connect,disconnect} = create(model);
        expect(isAgent(agent)).toBe(true);
        expect(isAgent(model)).toBe(false);
    });

    test('API `applyMiddleWares` still works',async ()=>{
        const model = new CountModel();
        const {agent,connect,disconnect} = create(model);
        connect();
        await agent.lazyIncrease();
        expect(agent.state).toBe(1);
        disconnect();
    });

});