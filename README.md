[![npm][npm-image]][npm-url]
[![standard][standard-image]][standard-url]

[npm-image]: https://img.shields.io/npm/v/agent-reducer.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/agent-reducer
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[standard-url]: http://npm.im/standard

推荐应用:
1. [use-agent-reducer](https://www.npmjs.com/package/use-agent-reducer) react hook
2. [use-redux-agent](https://www.npmjs.com/package/use-redux-agent) react hook

# agent-reducer

reducer可以持续有效的管理数据变更，让数据处理模式变的井井有条，但reducer也有自己的一些麻烦事。
一个 reducer 函数往往没有一个 class 实例对象更容易描述action type分支操作。
但 return 即修改的设计要比对象赋值或setState修改数据更稳定，更有预测性。
同时return出现在if分支判断中，能有效减少开发者的思维压力。让我们把reducer和面向对象两种模式的优点结合起来，
用class的形式来重写一个reducer。

### 换种写法
```typescript
import {OriginAgent} from "agent-reducer";

    interface Action {
        type?: 'stepUp' | 'stepDown' | 'step' | 'sum',
        payload?: number[] | boolean
    }

    /**
     * 经典reducer
     * @param state
     * @param action
     */
    const countReducer = (state: number = 0, action: Action = {}): number => {
        switch (action.type) {
            case "stepDown":
                return state - 1;
            case "stepUp":
                return state + 1;
            case "step":
                return state + (action.payload ? 1 : -1);
            case "sum":
                return state + (Array.isArray(action.payload) ?
                    action.payload : []).reduce((r, c): number => r + c, 0);
            default:
                return state;
        }
    }

    /**
     * class写法
     */
    class CountAgent implements OriginAgent<number> {

        state = 0;
        
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step = (isUp: boolean) => isUp ? this.stepUp() : this.stepDown();

        sum = (...counts: number[]): number => {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

    }
```
以上代码是一段简单的计数器，`CountAgent`通过调用对象属性方法的形式来完成一个`reducer action`分支，
`return`值作为计算完后的`this.state`数据（这里并未涉及state维护器，所以先当作有这么一个黑盒工具）。
有点像reducer，但省去了action的复杂结构（action为了兼容多个分支的不同需求所以很难以普通传参方式来工作）。

#### 重要说明：

当前版本为了兼容 1.0.0+ 版本，defaultMiddleWare 依然默认开启 middle-action, reduce-action, 
this层层代理模式，从 3.0.0 版开始，将彻底废弃 defaultMiddleWare 对返回 Promise 对象以及 undefined 对象的控制，
即：agent 完全扮演 reducer 的角色。middle-action 的事情完全交由 useMiddleActions 独立完成。
 
使用createAgentReducer来管理agent
```typescript
import {createAgentReducer,OriginAgent} from "agent-reducer";

describe('使用 agent-reducer 来使用 class 与 reducer 模式的结合体', () => {

    /**
     * 这是一个计数agent
     */
    class CountAgent implements OriginAgent<number> {
        // 必须有一个非 undefined 或 promise 的 state
        state = 0;
    
        // 返回一个 state-object (非promise,非undefined) 可以修改this.state
        stepUp = (): number => this.state + 1;
    
        stepDown = (): number => this.state - 1;
    
        sum = (...counts: number[]): number => this.state + counts.reduce((r, c): number => r + c, 0);
    
        step = (isUp: boolean) => isUp ? this.stepUp() : this.stepDown();
    
        // 返回 promise 或 undefined 使得当前的 method 成为来一个 middle-action，middle-action自身没有改变this.state的能力,
        // 但可以通过调用 reduce-action 来修改 this.state
        // 3.0.0 版 agent 的 defaultMiddleWare 将彻底废弃 promise\undefined 特殊处理方案，this 在方法中的层层代理方案也将废弃
        async callingStepUpAfterRequest() {
            await Promise.resolve();
            return this.stepUp();
        }
    }

    test('直接调用 middle-action ，并使用 middle-action 调用的 reduce-action 修改数据', async () => {
        const {agent} = createAgentReducer(CountAgent);
        const {callingStepUpAfterRequest} = agent;
        await callingStepUpAfterRequest();
        expect(agent.state).toBe(1);
    });

    test('将 method 赋值给其他 object 属性，直接调用 object 的属性方法，不会改变 this 的指向，this 应该为 agent', async () => {
        let object: any = {};
        const {agent} = createAgentReducer(CountAgent);
        const {callingStepUpAfterRequest} = agent;
        object.call = callingStepUpAfterRequest;
        await object.call();
        expect(agent.state).toBe(1);
    });
    
    test('将 method 绑定成其他 object 属性方法，直接调用绑定后方法，不会改变 this 的指向，this 应该为 agent', async () => {
        let object: any = {};
        const {agent} = createAgentReducer(CountAgent);
        const {callingStepUpAfterRequest} = agent;
        const call = callingStepUpAfterRequest.bind(object);
        await call();
        expect(agent.state).toBe(1);
    });

});
```
[速成文档+例子](https://github.com/filefoxper/agent-reducer/blob/master/test/spec/basic.spec.ts)

#### 重要说明：

当前版本为了兼容 1.0.0+ 版本，defaultMiddleWare 依然默认开启 middle-action, reduce-action, 
this层层代理模式，从 3.0.0 版开始，将彻底废弃 defaultMiddleWare 对返回 Promise 对象以及 undefined 对象的控制，
即：agent 完全扮演 reducer 的角色。middle-action 的事情完全交由 useMiddleActions 独立完成。

### 基本定义
1 . origin-agent  : 用于代替reducer的class或object，包含一个state属性（this.state是agent需要维护的数据）。
```
class CountAgent implements OriginAgent<number> {

    state = 0;

}
```
2 . (defaultMiddleWare定义) method : origin-agent属性对应的非箭头函数 "stepUp(){...}"。
```
class CountAgent implements OriginAgent<number> {

    state = 0;

    stepUp(){
        return this.state + 1;
    }

}
```
3 . (defaultMiddleWare定义) arrow-function: origin-agent属性对应的箭头函数 "stepUp = () =>..."。
```
class CountAgent implements OriginAgent<number> {

    state = 0;

    stepUp = (): number => this.state + 1;

}
```
4 . state-object : origin-agent方法调用返回一个非 "undefined" 或 "promise"的完整数据，这个state将会成为this.state。

5 . (defaultMiddleWare定义) reduce-action : origin-agent中返回 state-object 的method 或 arrow function，
这些方法会根据方法名发送（dispatch）一个类似 {type:'step',state:agent.step()} 的 reducer action。

6 . (defaultMiddleWare定义) middle-action : origin-agent中返回 "undefined" or "promise" 的 method 或 arrow function，
调用这些方法不会直接影响 this.state，但你可以在这些 middle-actions 中通过调用 reduce-actions 来影响 this.state。

7 . agent : 当使用 createAgentReducer(origin-agent) 时，可以得到一个 reducer 方法，在reducer方法属性中，
可以获取到 agent 对象，agent 作为 origin-agent 实例化的代理可以直接通过调用属性方法影响 this.state，
就像调用 reducer 的 dispatch 一样。

### 注意点
 
 1. agent 是通过代理 (proxy) 的方式来实现 method 或 arrow-function 与 dispatch action之间的转换，
但 arrow-function 中的`this`并非`agent`，而是原始的 `origin-agent`，所以 arrow-function 不能做到 `this` 的层层代理的效果，
也就是说以 arrow-function 作为 middle-action 来调用 reduce-action 是行不通的，
但反之如果以 arrow-function 作为 reduce-action 不但可以很好的被 method middle-action调用，
而且自身还可以调用其他 reduce-action 作为数据处理工具，而不必担心`this`层层代理引起的多次dispatch。

 2. 原理同上，method有`this`的层层代理的功效，所以更适合作为一个 middle-action 而非 reduce-action。

### 使用者API
[API例子参考](https://github.com/filefoxper/agent-reducer/blob/master/test/spec/basic.spec.ts)

1 . useMiddleWare ( >=2.0.0 ) ~~branch ( <2.0.0 )~~ 

复制一个现有的agent，并对其使用指定的`MiddleWare`或 `LifecycleMiddleWare`。复制版agent和原agent共享属性，
但使用不同的`MiddleWare`，以及不同的`env`运行环境 ( 可终止或重建生命周期 )。这种特性有点像`git`的分支功能。

注意：指定的`MiddleWare`或 `LifecycleMiddleWare`会加到agent现有`MiddleWare`前面。
```
const agentCopy = useMiddleWare(agent,MiddleWare)
```

2 . middleWare ( >=2.0.0 )

可对`origin-agent`的`middle-action`方法建立一个稳定的方法复制版，功能类似`useMiddleWare`。

decorator用法
```
@middleWare( MiddleWare | LifecycleMiddleWare )
```
普通用法
```
middleWare( originAgent.method , MiddleWare | LifecycleMiddleWare )
```
例子
```typescript
import {OriginAgent,middleWare,LifecycleMiddleWares} from "agent-reducer";

    class CountAgent implements OriginAgent<number> {
        // 必须有一个非 undefined 或 promise 的 state
        state = 0;
    
        // 返回一个 state-object (非promise,非undefined) 可以修改this.state
        stepUp = (): number => this.state + 1;
    
        stepDown = (): number => this.state - 1;
    
        sum = (...counts: number[]): number => this.state + counts.reduce((r, c): number => r + c, 0);
    
        step = (isUp: boolean) => isUp ? this.stepUp() : this.stepDown();
    
        // 返回 promise 或 undefined 使得当前的 method 成为来一个 middle-action，middle-action自身没有改变this.state的能力,
        // 但可以通过调用 reduce-action 来修改 this.state
        // 这里通过 middleWare 添加了 LifecycleMiddleWares.takeLatest() MiddleWare，
        // 使得每次运行 callingStepUpAfterRequest 都会忽略早期调用版本的dispatch
        @middleWare(LifecycleMiddleWares.takeLatest())
        async callingStepUpAfterRequest() {
            await Promise.resolve();
            return this.stepUp();
        }
    }
```
3 . LifecycleMiddleWares ( >=2.0.0 ) ~~BranchResolvers ( <2.0.0 )~~

常用的3个LifecycleMiddleWare集合

1）takeLatest() : 方法运行的最新版本才有dispatch的能力，一旦当前方法运行完 ( Promise resolve完成 ) ，
该方法早期的调用就不再拥有dispatch功能了。（类似redux-saga的takeLatest）。

应用场景：比如翻页器，当前页面数据返回后，上次翻页数据才返回，如果没有任何保护措施，
那么当前页面数据就会被上次翻页返回数据覆盖掉，这时候可以使用`LifecycleMiddleWares.takeLatest()`

2）takeBlock(ms) : 方法阻塞。如果方法返回Promise，Promise没有resolve，则该方法不能再次运行，
如果设置阻塞时间，则在阻塞时间后，不管有没有resolve，方法都恢复可执行。

应用场景：比如新建数据的防抖处理，`LifecycleMiddleWares.takeBlock(300)`

3）takeLazy(ms) : 方法懒节流。在调用方法的ms毫秒后运行，若在调用后的ms毫秒内再次触发，
则从此刻开始继续延时ms毫秒再运行。

应用场景：比如边输边查询服务端数据，`LifecycleMiddleWares.takeLazy(300)`

4 . useMiddleActions ( >=2.0.0 )

支持将`reduce-actions`和`middle-actions`分开使用。
```
class Ma extends MiddleActions<T>{
    agent:T
}

useMiddleActions( agent, Ma | new Ma(agent) )

useMiddleActions( agent, Ma | new Ma(agent) , MiddleWare | LifecycleMiddleWare )
```

5 . MiddleActions ( >=2.0.0 )

`middle-actions`的class容器，内置一个`agent`属性，可以直接通过调用`this.agent.state`或`this.agent.[reduce-action](...)`来调用agent的state和方法。
我们可以把`agent`的`env.reduceOnly`设置为`true`，这样我们的`agent`就只需担任好`reducer`角色就行了，
而异步调用之类`middle-action`的事情只要让MiddleActions来做就好了。

```typescript
import {
    OriginAgent,
    middleWare,
    LifecycleMiddleWares,
    MiddleActions,
    useMiddleActions,
    createAgentReducer
} from 'agent-reducer';

describe('使用 middleWare 方法可以对当前被调用方法单独添加指定MiddleWare特性', () => {

    class CountAgent implements OriginAgent<number> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        sum = (...counts: number[]): number => {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

        @middleWare(LifecycleMiddleWares.takeLatest())
        async callingStepUpAfterRequest(tms: number) {
            await new Promise((r) => setTimeout(r, tms * 100));
            return this.sum(tms);
        }

    }

    // 一个继承 MiddleActions 的 自定义类型可以调用指定 agent
    class CountBesides extends MiddleActions<CountAgent> {

        @middleWare(LifecycleMiddleWares.takeLatest())
        async callingStepUpAfterRequest(tms: number) {
            await new Promise((r) => setTimeout(r, tms * 100));
            return this.agent.sum(tms);
        }

    }

    test('在 agent 的 middle-action 上都可以通过添加middleWare的形式实现简易的useMiddleWare', async () => {
        const {agent} = createAgentReducer(CountAgent);
        const {callingStepUpAfterRequest} = agent;
        const first = callingStepUpAfterRequest(5); // after 500ms
        const second = callingStepUpAfterRequest(2); // after 200ms
        await Promise.all([
            first,
            second
        ]);
        expect(agent.state).toBe(2);
    });

    test('在 MiddleActions 的所有方法上都可以通过添加middleWare的形式实现简易的useMiddleWare', async () => {
        const {agent} = createAgentReducer(CountAgent);
        //使用 useMiddleActions 获取自定义MiddleActions的实例
        const {callingStepUpAfterRequest} = useMiddleActions(agent, CountBesides); 
        const first = callingStepUpAfterRequest(5); // after 500ms
        const second = callingStepUpAfterRequest(2); // after 200ms
        await Promise.all([
            first,
            second
        ]);
        expect(agent.state).toBe(2);
    });

});
```

6 . applyMiddleWares ( >=2.0.0 ) ~~applyResolvers ( <2.0.0 )~~

把多个`MiddleWare`合成一个按从左往右顺序运行的`MiddleWare`，每个`MiddleWare`产生的`StateProcess`是上个`MiddleWare StateProcess`的`next`
```
const totalMiddleWare = applyMiddleWares(...MiddleWare);
const reducer = createAgentReducer(OriginAgent , totalMiddleWare);
const { agent }=reducer;
```

7 . globalConfig ( >=2.0.0 )

配置全局的Env (可选) 运行环境和默认middleWare (可选)。
```
globalConfig({
    env?:Env,
    defaultMiddleWare?:MiddleWare
})
```

至此，您已经了解了`agent-reducer`的大部分功能，可以很好的使用这个工具了。
如果感兴趣，可以继续深入学习开发者API，了解更多关于`agent-reducer`的原理。

###### 如果觉得满意请在github页面上给个小星星哦。

### 开发者API
[API例子参考](https://github.com/filefoxper/agent-reducer/blob/master/test/spec/develop.spec.ts)

1 . createAgentReducer

创建一个reducer方法，以便与reducer管理工具整合，使用者可以通过reducer.agent来获取state数据，
或调用方法（相当于dispatch）修改agent.state。
```
const reducer = createAgentReducer(originAgent,middleWare?,env?)

const reducer = createAgentReducer(originAgent,env?)
```
参数：

 originAgent : reducer的class代替品或class实例对象，如：
 ```
const reducer = createAgentReducer(CountAgent)

const {agent} = createAgentReducer(new CountAgent(1))
```
 middleWare : 类似于redux的MiddleWare概念，可以对上个MiddleWare处理完的数据进行再加工，并拦截或传递个下一个MiddleWare。
 
 env : 运行环境配置。
 
返回：

带有agent附属信息的正规reducer方法
```typescript
export type Dispatch = (action: Action) => any;

//外部接入的store数据存储对象如redux的store，如果没有store可以自行封装一个
//agent-reducer内部有一个简易store，在接入外部提供的store后失效
export interface StoreSlot<S = any> {

    dispatch: Dispatch,

    getState(): S
}

//标准reducer function
export type Reducer<S, A> = (state: S, action: A) => S;

export interface ReducerPadding<S = any, T extends OriginAgent<S> = OriginAgent<S>> {
    initialState: S,                                //state 初始值
    namespace?: string,                             //redux 使用的 namespace
    env: Env,                                       //运行环境配置
    agent: T,                                       //生成的对originAgent代理的对象
    update: (state?:S,dispatch?:Dispatch) => void,  //数据更新时用来同步数据
    useStoreSlot:(slot:StoreSlot)=>void             //接入reducer管理器（如redux）的store对象
    recordChanges: () => () => Array<Change<S>>     //在集成测试时，可记录数据变化
}

//createAgentReducer方法返回的结构由标准reducer function带上ReducerPadding数据组成
export type AgentReducer<S = any, A = any, T extends OriginAgent<S> = any> = Reducer<S, A> & ReducerPadding<S, T>;
```

2 . Env : agent运行环境配置。

```typescript
export interface Env {
    updateBy?: 'manual' | 'auto',   //state数据更新方式，默认自动更新 'auto'
    expired?: boolean,              //是否过期标记，默认为非过期 false
    strict?: boolean,               //是否采取严格模式，默认 true
    reduceOnly?:boolean             //是否把agent做一个普通reducer，默认 false
}
```

 updateBy : 默认 'auto' ，当不与外部reducer工具整合时，使用默认的 'auto' 自动更新方式，
 当需要与外部reducer工具整合时，使用 'manual' 人工更新方式。

 expired : 默认为非过期 false，是否过期标记，如果设置为 true，agent将不再代理dispatch actions，
 agent.state不再随着调用reduce-action变化。
 
 strict : 默认 true，是否采取严格模式，如果为 true，agent.state必然随着 store 中的state变化而变化。
 否则，agent.state在每次运行完reduce-action后，立即根据reduce-action的返回值变化。
 
 reduceOnly ( >=2.0.0 & <3.0.0 ) : 默认 false，是否把agent做一个普通reducer，如果为 true，
 agent将会舍弃 method 中this的层层代理功能，defaultMiddleWare也不再使用 middle-action 特性，
 所有返回值都将成为this.state；如果为 false，agent的特性可参考 reduce-action 和 middle-action 的基本定义。

3 . MiddleWare ( >=2.0.0 ) ~~Resolver ( <2.0.0 )~~ 

类似于redux的`MiddleWare`概念，可以对上个`MiddleWare`处理完的数据进行再加工，并拦截或传递个下一个`MiddleWare`。
`MiddleWare`结构 :
```typescript
type Caller = (...args: any[]) => any;

//运行依赖
export type Runtime<T=any> = {
    caller: Caller,             //即将运行的agent代理方法
    sourceCaller:Caller,        //agent代理方法对应的原始方法
    callerName:string,          //agent代理方法的属性名
    args?: any[],               //即将运行的agent代理方法的入参
    target: T,                  //agent代理对象
    source:T,                   //agent代理的原始对象 origin-agent
    env:Env,                    //当前的agent运行环境配置
    cache: { [key:string]:any } //MiddleWare开发者可使用的缓存对象，开发者可根据需求缓存或获取数据
};

function (runtime: Runtime): NextProcess {

    //调用agent方法前运行，获取runtime

    return function (next: StateProcess): StateProcess {

        //调用agent方法完运行，获取下一个StateProcess数据处理器

        return function (result: any) {

            //上一个StateProcess数据处理器处理完数据后运行
            //result为上一个数据处理器产生的数据
            //可以利用 next(produce(result))的形式将当前数据处理器处理完的数据传递给下一个MiddleWare的StateProcess数据处理器，
            //也可以不调用 next，中断数据传递。
            //最终的next为reducer管理器（比如：redux）的dispatch方法

        }

    }

}

// 系统默认MiddleWare
export function defaultMiddleWare<T>(runtime: Runtime<T>) {
    return function nextResolver(next: (result: any) => any) {
        return function stateResolver(result: any) {
            // 如果runtime中的env.reduceOnly为true，则把agent当作reducer使用，middle-action不再起作用，只有reduce-action
            if (runtime.env.reduceOnly) {
                return next(result);
            }
            //默认情况下判断返回结果是否为promise或undefined，如果是则中断传递，直接返回数据
            if (isPromise(result) || isUndefined(result)) {
                return result;
            }
            //否则继续传递给下一个next，最终为reducer管理器（比如：redux）的dispatch方法
            return next(result);
        }
    }
}
```

4 . LifecycleMiddleWare ( >=2.0.0 ) ~~BranchResolver ( <2.0.0 )~~

MiddleWare的扩展类型，可用于停止或重建`agent`拷贝版，只能用在 useMiddleWare 方法调用中。 
```typescript
export interface LifecycleEnv {
    readonly updateBy?: 'manual' | 'auto',
    readonly expired?: boolean,
    readonly strict?: boolean,
    readonly reduceOnly?:boolean,
    readonly expire: () => void,  //终止agent复制版的生命周期
    readonly rebuild: () => void  //终止agent复制版的生命周期，并重建一个生命周期有效的复制版
}

//运行依赖
export type LifecycleRuntime<T=any> = {
    caller: Caller,             //即将运行的agent代理方法
    sourceCaller:Caller,        //agent代理方法对应的原始方法
    callerName:string,          //agent代理方法的属性名
    args?: any[],               //即将运行的agent代理方法的入参
    target: T,                  //agent代理对象
    source:T,                   //agent代理的原始对象 origin-agent
    env:LifecycleEnv,           //当前的agent运行环境配置，与 Env 不同的是它可以操控agent复制版的生命周期
    cache: { [key:string]:any } //MiddleWare开发者可使用的缓存对象，开发者可根据需求缓存或获取数据
};

function (lifecycleRuntime: LifecycleRuntime): NextProcess {

    //调用agent方法前运行，获取lifecycleRuntime
    //LifecycleRuntime与Runtime最大的不同，在于它有一个可操作生命周期的Env

    return function (next: StateProcess): StateProcess {

        //调用agent方法完运行，获取下一个StateProcess数据处理器

        return function (result: any) {

            //上一个StateProcess数据处理器处理完数据后运行
            //result为上一个数据处理器产生的数据
            //可以利用 next(produce(result))的形式将当前数据处理器处理完的数据传递给下一个MiddleWare的StateProcess数据处理器，
            //也可以不调用 next，中断数据传递。
            //最终的next为reducer管理器（比如：redux）的dispatch方法

        }

    }

}
```

5 . ReducerPadding ( >=2.0.0 ) ~~AgentData ( <2.0.0 )~~

`createAgentReducer`返回`reducer`的附带数据和方法。我们可以利用`useStoreSlot`和`update`方法整合reducer管理工具（比如redux）,
可以使用`recordChanges`记录数据变更。

```typescript
export interface ReducerPadding<S = any, T extends OriginAgent<S> = OriginAgent<S>> {
    initialState: S,                                //state 初始值
    namespace?: string,                             //redux 使用的 namespace
    env: Env,                                       //运行环境配置
    agent: T,                                       //生成的对originAgent代理的对象
    update: (state?:S,dispatch?:Dispatch) => void,  //数据更新时用来同步数据
    useStoreSlot:(slot:StoreSlot)=>void             //接入reducer管理器（如redux）的store对象
    recordChanges: () => () => Array<Change<S>>     //在集成测试时，可记录数据变化
}
```
如：
```typescript
import {
    createAgentReducer,
    OriginAgent,
    Action,
    Reducer
} from "agent-reducer";

describe('通过createAgentReducer产生的reducer API可以整合其他 reducer 工具', () => {

    //模拟一个微型redux
    function createStore<S>(reducer: Reducer<S, Action>, initialState: S) {
        let listener: undefined | (() => any) = undefined;
        let state = initialState;
        return {
            dispatch(action: Action) {
                state = reducer(state, action);
                if (listener) {
                    listener();
                }
            },
            getState(): S {
                return state;
            },
            subscribe(l: () => any) {
                listener = l;
                l();
                return () => {
                    listener = undefined;
                }
            }
        }
    }

    class CountAgent implements OriginAgent<number> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step = (isUp: boolean) => isUp ? this.stepUp() : this.stepDown();

        sum = (...counts: number[]): number => {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

    }

    test('useStoreSlot and update function can integrate with a reducer tool', () => {
        const reducer = createAgentReducer(CountAgent, {updateBy: 'manual'});
        // 如果需要跟其他工具整合在一起需要将env的updateBy属性设置成'manual'
        const store = createStore(reducer, 1); //创建一个store对象，store至少拥有getState和dispatch接口
        const {agent, useStoreSlot, update} = reducer;
        useStoreSlot(store); //接入创建好的store对象
        const unlisten = store.subscribe(update); // 添加update方法，保证监听到store中state变化时，可以及时更新agent.state数据
        agent.stepUp();
        expect(agent.state).toBe(2);
        expect(store.getState()).toBe(agent.state); // agent.state 应该与 store.getState() 相同
        unlisten();
    });

});
```
6 . getAgentNamespaceKey ( >=2.0.0 )

获取作为agent的namespace字段的key字符串，用来代替原来的namespace，可以在开发redux整合器时使用。
```
const namespaceKey = getAgentNamespaceKey();
```

[更多例子](https://github.com/filefoxper/agent-reducer/blob/master/test/spec/develop.spec.ts)

###### 如果觉得满意请在github页面上给个小星星哦。

