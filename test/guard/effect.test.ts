import {addEffect, create, effect, experience} from "../../src";
import {EffectCallback, Model} from "../../src/libs/global.type";
import {agentEffectsKey} from "../../src/libs/defines";

experience();

class CountModel implements Model<number> {

    state = 0;

    increase() {
        return this.state + 1;
    }

    decrease() {
        return this.state - 1;
    }

    reset() {
        return 0;
    }

    [agentEffectsKey]?:[]

}

describe("guard effect",()=>{

    test('ensure effect can be unmounted',()=>{
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const effectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
            if(state<0){
                agent.reset();
            }
        });

        const effect =addEffect(effectCallback,model, model.decrease);

        agent.decrease();
        expect(agent.state).toBe(0);

        effect.update(jest.fn());

        agent.decrease();
        expect(agent.state).toBe(-1);

        expect(effectCallback).toBeCalledTimes(1);

        disconnect();
        expect(agent[agentEffectsKey]||[]).toEqual([]);
    });

    // test('ensure that the exception of effect callback will not tear down other effects running',()=>{
    //     const error = console.error;
    //     // @ts-ignore
    //     console.error=undefined;
    //     const model = new CountModel();
    //     const {agent, connect, disconnect} = create(model);
    //     connect();
    //
    //     const tearDownEffectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
    //         if(state<0){
    //             (agent as unknown as {notExistMethod:()=>any}).notExistMethod();
    //         }
    //     });
    //
    //     const effectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
    //         if(state<0){
    //             agent.reset();
    //         }
    //     });
    //
    //     addEffect(tearDownEffectCallback,model,model.decrease);
    //     addEffect(effectCallback,model, model.decrease);
    //
    //     agent.decrease();
    //     expect(agent.state).toBe(0);
    //     disconnect();
    //     console.error=error;
    // });
    //
    // test('ensure that the exception of effect destroy will not tear down other effects running',()=>{
    //     const error = console.error;
    //     // @ts-ignore
    //     console.error=undefined;
    //     const model = new CountModel();
    //     const {agent, connect, disconnect} = create(model);
    //     connect();
    //
    //     const tearDownEffectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
    //         return ()=>{
    //             (agent as unknown as {notExistMethod:()=>any}).notExistMethod();
    //         }
    //     });
    //
    //     const effectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
    //         if(state<0){
    //             agent.reset();
    //         }
    //     });
    //
    //     addEffect(tearDownEffectCallback,model,model.decrease);
    //     addEffect(effectCallback,model, model.decrease);
    //
    //     agent.decrease();
    //     agent.decrease();
    //     expect(agent.state).toBe(0);
    //     disconnect();
    //     console.error=error;
    // });

});

describe("the trigger time about effect", () => {

    test('usually the model effect is triggered by calling API `addEffect` immediately', () => {
        const model = new CountModel();
        const {connect, disconnect} = create(model);
        connect();

        const effectCallback: EffectCallback<number> = jest.fn();

        addEffect(effectCallback, model);

        expect(effectCallback).toBeCalledTimes(1);
        disconnect();
    });

    test('if we add a model effect in another effect callback, this model effect will be triggered after the main effect callback is finished', () => {
        const model = new CountModel();
        const { agent, connect, disconnect} = create(model);
        connect();

        let effectTriggerStack: string[] = [];

        const modelCallback: EffectCallback<number> = jest.fn(() => {
            effectTriggerStack.push('addition model effect');
        });

        const anotherModelCallback: EffectCallback<number> = jest.fn(() => {
            addEffect(modelCallback, model);
            effectTriggerStack.push('model effect');
        });

        addEffect(anotherModelCallback, model);

        expect(effectTriggerStack).toEqual([
            'model effect',
            'addition model effect'
        ]);
        disconnect();

        connect();

        effectTriggerStack = [];

        const methodCallback: EffectCallback<number> = jest.fn(()=>{
            addEffect(modelCallback, model);
            effectTriggerStack.push('method effect');
        });

        addEffect(methodCallback,model, model.increase);

        agent.increase();

        expect(effectTriggerStack).toEqual([
            'method effect',
            'addition model effect'
        ]);
        disconnect();
    });

    test('after mounting, the model effect will be triggered by model state changes',()=>{
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const effectCallback: EffectCallback<number> = jest.fn();

        addEffect(effectCallback, model);

        agent.reset();

        agent.increase();

        expect(effectCallback).toBeCalledTimes(2);
        disconnect();
    });

    test('the method effect is triggered only when the model state is changed by the method which you want to monitor',()=>{
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const effectCallback: EffectCallback<number> = jest.fn();

        addEffect(effectCallback, model, model.decrease);

        agent.increase();

        agent.decrease()

        expect(effectCallback).toBeCalledTimes(1);
        disconnect();
    });

    test('if model has not connected, addEffect can lead error',()=>{
        const model = new CountModel();
        create(model);

        const effectCallback: EffectCallback<number> = jest.fn();

        expect(()=>addEffect(effectCallback, model, model.decrease)).toThrow();
    });

});

describe('async effect',()=>{

    type User = {
        id:number|null,
        username:string|null,
        password:string|null,
        nick:string,
        name?:string,
        sex?:'male'|'female',
        age?:number
    };

    class UserModel implements Model<User>{

        state:User = {
            id:null,
            username:null,
            password:null,
            nick:'guest'
        };

        login(username:string,password:string):User{
            return {...this.state,id:null,username,password};
        }

        private initial(user:Omit<User,'password'>):User{
            return {...user,password: null};
        }

        @effect(()=>UserModel.prototype.login)
        private async fetchUser(){
            const {username}=this.state;
            const user:Omit<User,'password'> = await new Promise((resolve)=>setTimeout(()=>{
                resolve({
                    id:1,
                    username,
                    nick:'nick',
                    name:'name',
                    sex:'male'
                });
            }));
            this.initial(user);
        }

    }

    test('test disconnect before effect starts action',async ()=>{
        const model = new UserModel();
        const {agent,connect,disconnect} = create(model);
        connect();
        agent.login('user','xxx');
        disconnect();
        await new Promise(resolve => setTimeout(resolve));
        expect(model.state.id).toBe(null);
    });

    test('test disconnect after effect starts action',async ()=>{
        const model = new UserModel();
        const {agent,connect,disconnect} = create(model);
        connect();
        agent.login('user','xxx');
        await new Promise(resolve => setTimeout(resolve));
        disconnect();
        expect(model.state.id).toBe(1);
    });

});

describe(' extends effect',()=>{

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

    }

    class Dt extends Counter{

        @effect(()=>Dt.prototype.decrease)
        effect(){
            if(this.state<0){
                this.reset();
            }
        }

    }

    test('use extends',()=>{
        const {agent,connect,disconnect} = create(Dt);
        connect();
        agent.decrease();
        expect(agent.state).toBe(0);
        disconnect();
    });
});
