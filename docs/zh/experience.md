# 体验特性与API

`agent-reducer@4.2.0` 重新开启了体验版特性与 API。它们可能在后续版本中发生更改，建议在非生产环境中进行试验和使用。

## 引导
### 副作用 decorator 装饰器用法 (体验)

添加副作用的 decorator API 为 [effect](/zh/experience?id=effect-体验)。被该 decorator 函数修饰的方法将被作为副作用回调来使用，而副作用监听目标默认为当前模型实例：`effect()`，如传入当前模型方法提供函数，则监听该目标下的指定方法：`effect(()=>Model.prototype.method)`。

装饰器副作用回调方法会在触发时被绑定到一个临时创建的当前模型代理 agent 对象上。所以该方法中的关键词 `this` 是个代理对象。这方便使用者在回调方法中调用其他方法，从而修改 state 数据。

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

describe("使用 effect decorator API",()=>{

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

        // effect decorator 函数无入参，
        // 这相当于监听当前模型实例 state 变更，
        // 而被 decorate 的当前方法即为副作用回调方法
        @effect()
        gtZeroEffect(prevState:number, state:number){
            if(state<0){
                // effect decorator 函数会将当前函数绑定在一个临时代理对象上，
                // 这时通过关键词 `this` 调用的方法可直接修改数据
                this.reset();
            }
            // effect 回调函数本身不具备修改 state 的能力，所以不需要返回 state 数据，
            // 但如果有需求可以返回 destroy 销毁函数
        }

        // 当 effect 入参为当前 class 的方法时，
        // 监听目标为当前入参方法
        @effect(()=>InnerCountModel.prototype.increase)
        ltFiveEffect(prevState:number, state:number){
            if(state>4){
                this.reset(4);
            }
        }

    }

    test('use effect decorator',()=>{
        const model = new InnerCountModel();
        const {agent,connect,disconnect} = create(model);
        connect();
        // state 变成 -1，触发 `gtZeroEffect` 副作用回调函数，将 state 重置为 0
        agent.decrease();
        expect(agent.state).toBe(0);
        for(let i=0;i<5;i++){
            agent.increase();
        }
        // state 变为5，触发 `ltFiveEffect` 副作用回调函数，state 降为 4
        expect(agent.state).toBe(4);
        disconnect();
    });

});
```

注意：被 effect 修饰的方法不能通过 agent 获取并被使用者直接调用。

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

describe("使用 effect decorator API",()=>{

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

        // effect decorator 函数无入参，
        // 这相当于监听当前模型实例 state 变更，
        // 而被 decorate 的当前方法即为副作用回调方法
        @effect()
        gtZeroEffect(prevState:number, state:number){
            if(state<0){
                // effect decorator 函数会将当前函数绑定在一个临时代理对象上，
                // 这时通过关键词 `this` 调用的方法可直接修改数据
                this.reset();
            }
            // effect 回调函数本身不具备修改 state 的能力，所以不需要返回 state 数据，
            // 但如果有需求可以返回 destroy 销毁函数
        }

        // 当 effect 入参为当前 class 的方法时，
        // 监听目标为当前入参方法
        @effect(()=>InnerCountModel.prototype.increase)
        ltFiveEffect(prevState:number, state:number){
            if(state>4){
                this.reset(4);
            }
        }

    }

    test('副作用方法不能用作外部调用方法',()=>{
        const model = new InnerCountModel();
        const {agent,connect,disconnect} = create(model);
        connect();
        expect(()=>agent.gtZeroEffect(1,2)).toThrow();
        disconnect();
    });

});
```

### 副作用销毁函数

如果在副作用回调函数中返回一个函数，该函数会在副作用再次被触发前调用，以便清理上次副作用处理中产生的内存占用等副效果。我们通常叫这种函数为销毁函数。

```typescript
import {
    EffectCallback, 
    Model, 
    addEffect, 
    create, 
    effect
} from "agent-reducer";

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

}

describe('effect 基本用法', () => {

    test('副作用回调函数可返回一个销毁函数，该销毁函数会在副作用回调函数再次被调用前或副作用被卸载时被调用',()=>{
        const model = new CountModel();
        const {agent, connect, disconnect} = create(model);
        connect();

        const destroy = jest.fn();

        const effectCallback: EffectCallback<number> = jest.fn((prev,state)=>{
            if(state<0){
                agent.reset();
            }
            // 副作用回调函数返回一个销毁函数,
            // t该销毁函数会在副作用回调函数再次被调用前或副作用被卸载时被调用
            return destroy;
        });

        addEffect(effectCallback, model, model.decrease);

        // 第一次触发副作用时并不会运行销毁函数
        agent.decrease();
        expect(agent.state).toBe(0);

        expect(effectCallback).toBeCalledTimes(1);
        expect(destroy).toBeCalledTimes(0);

        // 再次触发副作用前，运行销毁函数
        agent.decrease();
        expect(agent.state).toBe(0);

        expect(effectCallback).toBeCalledTimes(2);
        expect(destroy).toBeCalledTimes(1);

        // 当前 disconnect 导致模型的所有代理链接全被销毁，
        // 这时系统会强行卸载当前模型的所有副作用，并再次触发销毁函数
        disconnect();
        expect(destroy).toBeCalledTimes(2);
    });

});
```

## API
### effect (体验)

[addEffect](/zh/api?id=addeffect) API 的 `ES6 decorator` 模式。添加该 decorator 装饰器的模型方法会被当作`副作用回调函数`，监听目标默认为当前模型实例，而 `effect` 入参函数返回的`模型方法`将被当作被监听的目标方法。

```typescript
export declare function effect<S=any, T extends Model<S>=Model>(
    method?:()=>(...args:any[])=>any,
):MethodDecoratorCaller
```

* method - 可选，返回被监听的目标方法的回调函数，必须为当前模型方法。

查看更多[细节](/zh/guides?id=副作用-decorator-装饰器用法)。