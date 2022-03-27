# Experience

We have add some experience features and APIs. These features and APIs may be changing in future, and we suppose you try them privately not in your production codes.

## Effect decorator (experience)

If you want to add effect inside model, and start it after this model is connected, you can use api [effect](/api?id=effect) to decorate a model method to be a effect callback. If you pass nothing into [effect](/api?id=effect) decorator, it will take current model instance as the listening target. If you pass a callback which returns a method of current model into [effect](/api?id=effect) decorator as a param, it will only listen to the state changes leaded by this specific `method`.

The method decorated by [effect](/api?id=effect) is bind on an `agent` which is created temporary from current `model instance`. So, if deploy the method from keyword `this` in a effect callback, it will change the model state.

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

describe("use decorator effect",()=>{

    class InnerCountModel implements Model<number> {

        state = 0;

        increase() {
            return this.state + 1;
        }

        decrease() {
            return this.state - 1;
        }

        reset(to?:number) {
            return to||0;
        }

        // effect decorator can create and mount a effect
        // by using the decorated method as a effect callback,
        // and if there is no param for this decorator,
        // the effect will pick the model instance of this class as target
        // for listening.
        // In a decorator effect callback,
        // the keyword `this` is a temporary `agent` from model,
        // created for by model system.
        // So, you can deploy methods to change state in these effect callbacks.
        @effect()
        gtZeroEffect(prevState:number, state:number){
            if(state<0){
                // the keyword `this` is a temporary `agent` from model
                this.reset();
            }
        }

        // give a method as effect param,
        // the decorated method will only be triggered by the param method state changes.
        @effect(()=>InnerCountModel.prototype.increase)
        ltFiveEffect(prevState:number, state:number){
            if(state>4){
                // the keyword `this` is a temporary `agent` from model
                this.reset(4);
            }
        }

    }

    test('use effect decorator',()=>{
        const model = new InnerCountModel();
        const {agent,connect,disconnect} = create(model);
        connect();
        agent.decrease();
        // the state should be -1,
        // but it is reset by default effect: `gtZeroEffect`
        expect(agent.state).toBe(0);
        for(let i=0;i<5;i++){
            agent.increase();
        }
        // the state should be 5,
        // but it is reset by default effect: `ltFiveEffect`
        expect(agent.state).toBe(4);
        disconnect();
    });

});
```

Note: the effect method can not be called as a agent action method.

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

describe("use decorator effect",()=>{

    class InnerCountModel implements Model<number> {

        state = 0;

        increase() {
            return this.state + 1;
        }

        decrease() {
            return this.state - 1;
        }

        reset(to?:number) {
            return to||0;
        }

        // effect decorator can create and mount a effect
        // by using the decorated method as a effect callback,
        // and if there is no param for this decorator,
        // the effect will pick the model instance of this class as target
        // for listening.
        // In a decorator effect callback,
        // the keyword `this` is a temporary `agent` from model,
        // created for by model system.
        // So, you can deploy methods to change state in these effect callbacks.
        @effect()
        gtZeroEffect(prevState:number, state:number){
            if(state<0){
                // the keyword `this` is a temporary `agent` from model
                this.reset();
            }
        }

        // give a method as effect param,
        // the decorated method will only be triggered by the param method state changes.
        @effect(()=>InnerCountModel.prototype.increase)
        ltFiveEffect(prevState:number, state:number){
            if(state>4){
                // the keyword `this` is a temporary `agent` from model
                this.reset(4);
            }
        }

    }

    test('the effect method can not be called as an action method',()=>{
        const model = new InnerCountModel();
        const {agent,connect,disconnect} = create(model);
        connect();
        expect(()=>agent.gtZeroEffect(1,2)).toThrow();
        disconnect();
    });

});
```