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
        throw new Error('this is a test error');
    }

}

describe('guard reducer',()=>{

    test('`connect` API should support async callback',async ()=>{
        const state = await connect(new CountModel()).run(async (agent)=>{
            return agent.lazyIncrease();
        });
        expect(state).toBe(1);
    });

    test('`connect` API should support async error callback',async ()=>{
        try {
            await connect(new CountModel()).run(async (agent)=>{
                return agent.lazyErrorIncrease();
            });
        }catch (e){
            expect(e.message).toBe('this is a test error');
        }
    });

});
