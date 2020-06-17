[![npm][npm-image]][npm-url]
[![standard][standard-image]][standard-url]

[npm-image]: https://img.shields.io/npm/v/agent-reducer.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/agent-reducer
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[standard-url]: http://npm.im/standard

# agent-reducer

### reducer
为什么要reducer?reducer与其说是一个简单的数据处理器，更像是一个数据迭代描述器。它指明了下一步的数据该是什么样子的，
下一个数据和当前数据的区别是什么。而数据是怎么加工的，这是核心，并非重点。换句话说，reducer可以被看作是一个黑盒处理器，
处理逻辑可以写在reducer方法里也可以通过引用其他方法获取。reducer以return的方式指明下一个数据该是什么样的，这是个非常优秀的设计。
在一段复杂逻辑中，return可以大大减小我们的思维逻辑压力。（我们只要注意return出现在哪里，走到当前return需要经过哪些逻辑分支就行了，而不必关注return之后的逻辑代码）
另外reducer通常被写成幂等函数，入参不变结果不变，这大大提高了结果的可预测性。

纵然reducer有上述大量优点，但依然不能唤起更多人的喜爱，就因为dispatch模式。当我们需要通过reducer的下一个数据的时候，
我们通常要通过dispatch，事件分发的行为让它动起来。因为reducer需要于被维护的state联系起来，故选择了dispatch作为事件分发器。
但dispatch却限制了使用者的行为。比如：dispatch必须以action object作为参数，而大部分reducer只能通过接收state和action的方式来工作。
因为dispatch和reducer之间缺乏必然的联系，这让很多typescript类型系统使用者很心累。

为了解决上述问题，让reducer更贴近使用者，这里推出了 <strong>agent-reducer</strong>，reducer代理器。它让我们可以以近似class或object的写法来书写reducer。

### 换种写法
让我们写一个这样的reducer试试
```typescript
import {createAgentReducer, OriginAgent} from "agent-reducer";

class Counter implements OriginAgent<number> {

    state = 0;

    constructor(state: number) {
        this.state = state;
    }

    public addOne() {
        return this.state + 1;
    }

    public sum(basic: number,addition:number) {
        return basic + addition;
    }

    public addOneAfterOneSecond() {
        setTimeout(()=>this.addOne(),1000);
    }

}

const agent = createAgentReducer(new Counter(1)).agent;
agent.addOne();
console.log(agent.state); // 2
agent.sum(0,1);
console.log(agent.state); // 1
agent.addOneAfterOneSecond();
setTimeout(() => console.log(agent.state),1000); // 2
```
以上代码是一段简单的计数器，我们依然通过 return 的形式来决定下一个state数据该是什么样子的。比如`addOne`、`sum`方法。
我们通过直接调用方法的方式来dispatch一个参数松散的action，这些参数将被转成action的payload数据。而方法运行内容就是原来reducer的部分运行内容。
除了这种直接return普通object作为下一个state的方法外，这里还提供了return undefined|promise的方法来做dispatch方法集成。
比如`addOneAfterOneSecond`方法，它返回了一个void或者说是undefined对象，该方法不能直接决定下一个state的数据（简单说，它并没有直接dispatch），
但却可以通过调用`addOne`方法去影响下一个state数据（去dispatch action）。

让我们把它翻译成原始reducer的写法。
```typescript
import {useReducer} from 'react';

const countReducer=(state:number,action)=>{
    if(action.type === 'ADD_ONE'){
        return state + 1;
    }
    if(action.type === 'SUM'){
        const {payload}=action;
        return payload.basic + payload.addition;
    }
    return state;
};

const [state,dispatch]=useReducer(countReducer,1);

function addOneAfterOneSecond(){
    setTimeout(()=>dispatch({type:'ADD_ONE'}),1000);
}

...
dispatch({type:'ADD_ONE'});
...
console.log(state);//2
...
dispatch({type:'SUM',payload:{basic:0,addition:1}});
...
console.log(state); // 1
...
addOneAfterOneSecond();
...
setTimeout(() => console.log(state),1000); // 2
```
通过两种reducer在写法上的对比，我们可以发现agent-reducer写法更加自然，它保留了reducer关于return的优势及特性，同时又兼顾了自然方法传参。
但该写法并非一个纯粹的函数，需要依赖`createAgentReducer`方法进行代理测试。另外this.state扮演着reducer入参state，也就是当前state，
所以在需要依赖当前state进行reduce处理时，需要使用this.state。很多人都非常害怕js中的this，而在agent-reducer中可能会大量使用this关键字。

综合上述特性，如果觉得该工具将为你带来的优势大于原生reducer，那么请继续深入了解它。

### 使用须知
1 . 我们把createAgentReducer(originAgent)的入参class或object称为<strong>originAgent</strong>（原代理）。而一个合法原代理需要一个可读写访问的state属性。
并且注意，不要人工修改state属性（这与reducer的state不期望被修改是同样的道理）。
```
如上例中：agent.state
```
2 . 我们把createAgentReducer(originAgent).agent产生的对象称为<strong>agent</strong>代理，agent代理中的function如果返回的是一个非promise或undefined的对象，该对象将被作为下一个state更新到reducer维护器（如store）里去，
我们称这种function为（<strong>dispatch function</strong>），即能发起dispatch的function。
```
如上例中：agent.addOne,agent.sum
```
3 . agent代理中的function如果返回的是一个promise或undefined，那这个function不会自主发起dispatch，不会产生下一个state。
但它可以通过调用一个<strong>dispatch function</strong>来影响下一个state。
```
如上例中：agent.addOneAfterOneSecond，返回undefined但在setTimeout中调用了agent.addOne
```
4 . <strong>不要使用namespace属性</strong>，这个属性暂时会作为一个特殊关键字被createAgentReducer捕获，做全局数据管理器区分数据块的标准。
比如redux。

### 特性
1. 不要担心this问题，当你使用createAgentReducer(originAgent).agent获取代理时，你的agent代理方法已经通过fn.apply(proxy,...)以及闭包的形式强行锁定了this。
所以无论你是把agent的方法赋值给其他对象属性，还是通过call,apply重新绑定，该方法运行时的this始终都是agent。
为什么这么设计？因为我们不认为直接拿一个object的方法绑定到其他object上是一个好的设计，其中的隐晦太多了。

### 使用其他reducer维护器
在通过调用createAgentReducer之后，你可以得到一个类似原生的reducer，该reducer拥有agent（直接使用的代理），
以及<strong>update</strong> function，通过调用<strong>update(state,dispatch)</strong>就可以接入你自己的reducer维护器（如：redux,useReducer）了。

```typescript
//我们可以创建一个简单的 store, 并把agent reducer接入这个 store.
    function createStore<S>(reducer: Reducer<S, Action>, initialState: S) {
        let listener = undefined;
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
            subscribe(l) {
                listener = l;
                return () => {
                    listener = undefined;
                }
            }
        }
    }

    //配置运行环境updateBy:'manual'手动模式
    const reducer = createAgentReducer<number, Counter>(Counter, {updateBy: 'manual'});

    const store = createStore<number>(reducer, reducer.initialState);
    //在每次数据更新到store以后更新store.state和store.dispatch
    const listener = () => reducer.update(store.getState(), store.dispatch);
    const unsubscribe = store.subscribe(listener);
    //第一次强行更新
    listener();
    
    const agent = reducer.agent;
    agent.addOne();
    expect(agent.state).toEqual(store.getState());
```
更多 [测试用例](https://github.com/filefoxper/agent-reducer/blob/master/test/index.test.ts)

### api

createAgentReducer(originAgent: T | { new(): T }, e?: Env)

通过代理class或object创建一个类似原生的reducer方法。

参数：
1. originAgent：代理class或object
2. e:代理运行环境

agent代理原型环境e:Env解析:

1 . updateBy：'auto'|'manual'    （state和dispatch更新方案）

默认为'auto'，当这个参数为'auto'时，createAgentReducer通过内置的简易store来维护state数据。当参数设置为'manual'时，
需要使用者通过createAgentReducer产生的reducer.update(state,dispatch)接入外部reducer维护器。

2 . expired：false|true  （agent过期标记）

默认为false，当这个参数设置为true时，reducer.agent过期，这时agent产生的所有dispatch都将被忽略。

3 . strict：true|false   （agent是否严格与reducer维护器同步）

默认true，当这个参数为true时，agent.state将严格由reducer维护器或reducer.update进行更新，如果为false，
则每次agent dispatch function运行完成就立即更新agent.state数据。（注意：这里只是个选项，我们并不推荐你使用strict:false）

返回：

reducer （接近原生的reducer function(state:State,action:Action):State）

reducer附带参数：
1. initialState：agent和reducer的初始state数据
2. env（Env）：agent运行环境，见参数2，可通过env.expired=true进入过期状态，从而让dispatch失效
3. agent：代理对象，拥有和原生被代理对象originAgent近乎一摸一样的属性，通过agent.state获取最新state数据，通过agent.xxx(function)
调用方法（dispatch function或非dispatch function）
4. update(state,dispatch)：传入最新的state和dispatch更新agent的state对象以及dispatch入口
5. record()：在env.updateBy为'auto'时，可以在调用agent方法前调用，返回一个unRecord方法，通过调用unRecord()，
可获取dispatch记录，并清理内存记录。
```typescript
describe('record state', () => {

    const reducer = createAgentReducer<ClassifyQueryState, ClassifyQueryAgent>(ClassifyQueryAgent);

    const agent = reducer.agent;

    test('handlePageChange', async () => {
        const unRecord = reducer.record();
        await agent.handlePageChange(2, 3);
        const [loadingRecord, resultChangeRecord] = unRecord();
        expect(loadingRecord.state.loading).toBe(true);
        expect(resultChangeRecord.state.loading).toBe(false);

    });

});
```