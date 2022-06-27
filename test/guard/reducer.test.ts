import {Model} from "../../src/libs/global.type";
import {connect, create, middleWare, MiddleWarePresets} from "../../src";

class CountModel implements Model<number>{

    state:number = 0;

    increase(){
        return this.state+1;
    }

    @middleWare(MiddleWarePresets.takePromiseResolve())
    async lazyIncrease(){
        return this.state+1;
    }

    @middleWare(MiddleWarePresets.takePromiseResolve())
    async lazyErrorIncrease(){
        await Promise.resolve();
        throw new Error('this is a test error');
    }

}

describe('guard reducer',()=>{

    test('disconnect directly will lead error',()=>{
        const {disconnect} = create(CountModel);
        expect(()=>disconnect()).toThrow();
    });

    test('`connect` API should suppoer async callback',async ()=>{
        const state = await connect(new CountModel()).run(async (agent)=>{
            return agent.lazyIncrease();
        });
        expect(state).toBe(1);
    });

});
