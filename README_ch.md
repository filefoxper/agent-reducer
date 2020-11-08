[![npm][npm-image]][npm-url]
[![standard][standard-image]][standard-url]

[npm-image]: https://img.shields.io/npm/v/agent-reducer.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/agent-reducer
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[standard-url]: http://npm.im/standard

推荐应用:
1. [use-agent-reducer](https://www.npmjs.com/package/use-agent-reducer) react hook 可用来升级 useReducer
2. [use-redux-agent](https://www.npmjs.com/package/use-redux-agent) react hook 可用来升级 react-redux

# agent-reducer

###### 新增变化
1. 支持nodejs
2. 添加`BranchResolvers.takeLazy(waitMs: number)`分支插件

### bug 修复
1. 箭头函数不能正常工作，该问题已经修复。

### reducer & prototype
reducer的return特性不但可以方便单元测试，更能够有效简化逻辑。而prototype中的方法调用比reducer系列的dispatch更自然。
agent-reducer可以把以上两个特点结合起来。

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

5 . <strong>不要使用箭头函数作为agent对象的属性值。</strong>

### 特性
1. 不要担心this问题，当你使用createAgentReducer(originAgent).agent获取代理时，你的agent代理方法已经通过fn.apply(proxy,...)以及闭包的形式强行锁定了this。
所以无论你是把agent的方法赋值给其他对象属性，还是通过call,apply重新绑定，该方法运行时的this始终都是agent。
为什么这么设计？因为我们不认为直接拿一个object的方法绑定到其他object上是一个好的设计，其中的隐晦太多了。

### 使用其他reducer维护器
在通过调用createAgentReducer之后，你可以得到一个类似原生的reducer，该reducer有一个agent属性对象，
以及一个<strong>update</strong> function，通过调用<strong>update(state,dispatch)</strong>就可以接入你自己的reducer维护器（如：redux,useReducer）了。

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

#### createAgentReducer(originAgent: T | { new(): T }, e?: Env)
#### createAgentReducer(originAgent: T | { new(): T }, resolver?:Resolver, e?: Env)

通过代理class或object创建一个类似原生的reducer方法。

参数：
1. originAgent：代理class或object
2. resolver：解析运行结果方法，用来决定哪些数据可以成为下一个state数据。默认resolver会把非promise或undefined的数据作为下一个state。
3. e:代理运行环境

<strong>resolver（Resolver）：</strong>

```typescript
export type ResultProcessor=(result:any)=>any;

export type NextLink=(next:ResultProcessor)=>ResultProcessor;

export type Resolver=(cache:any)=>NextLink|void;
```

Resolver的结构如上。你可以把它当成是redux的middleware。

1. 当你调用agent的function时，该function不会马上运行，而是预先运行一个Resolver方法（通过createAgentReducer传入，或默认的defaultResolver）。
Resolver方法的入参是系统提供的关于当前function的缓存对象cache，你可以用它来记录各种缓存数据，以便后续判断使用。
一个Resolver方法应该返回一个NextLink方法或一个空对象，当返回值是空对象时，当前被调用的function将不会被执行。

2. 当Resolver返回的是一个NextLink方法时，当前被调用function会如期执行，其返回值会传入当前的第一个ResultProcessor方法，
在ResultProcessor进行数据加工后，由NextLink提供的next方法传递到下一个ResultProcessor中进行继续加工。

3. NextLink最终指向的next方法为系统的dispatchState方法，这个内置方法将会把最后结果传入reducer。

<strong>agent代理原型环境e:Env解析：</strong>

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
5. recordStateChanges()：在env.updateBy为'auto'时，可以在调用agent方法前调用，返回一个getStateChanges方法，通过调用getStateChanges()，
可获取dispatch记录，并清理内存记录。
```typescript
describe('record state', () => {

    const reducer = createAgentReducer<ClassifyQueryState, ClassifyQueryAgent>(ClassifyQueryAgent);

    const agent = reducer.agent;

    test('handlePageChange', async () => {
        const getStateChanges = reducer.recordStateChanges();
        await agent.handlePageChange(2, 3);
        const [loadingRecord, resultChangeRecord] = getStateChanges();
        expect(loadingRecord.state.loading).toBe(true);
        expect(resultChangeRecord.state.loading).toBe(false);

    });

});
```
#### applyResolvers(...resolver:Resolver[])
`applyResolvers`的使用方式和redux的`applyMiddleWare`类似。（如果你希望将默认resolver作为resolver链的一部分，
你可以`import {defaultResolver} from 'agent-reducer'`，并通过`applyResolvers(...yourResolvers... , defaultResolver)`的形式来组合你自定义的resolver）
#### branch(agent:Agent,resolver:BranchResolver)
branch方法可以对当前agent代理建立一个分支（复制品），该分支上的所有对象不能修改，只能被调用。
分支可以被抛弃，也可以被重建。通过分支组件BranchResolver，你可以调用分支api（BranchApi），
这个Api简单提供了一个reject方法，和一个rebuild方法。我们可以通过调用reject方法废弃当前分支，
被废弃分支的dispatch方法将处于失效状态，也就是说被废弃分支无法继续影响reducer的state数据。
而rebuild方法在废弃当前分支的同时，会新建一个替代分支，继续新的任务。BranchApi的使用方式如下：
```typescript
//建立一个接收分支Api的方法（当前例子代码为BranchResolvers.takeLatest()的源码，takeLatest只允许最后一次触发产生的state数据进入reducer）
function takeLatestResolver(branchApi: BranchApi): Resolver {

            //建立一个Resolver，并获取分支运行当前方法的缓存
            return function (cache: any): NextLink {
                //返回一个获取下一个NextLink回调的方法
                return function (next: ResultProcessor):ResultProcessor {
                    //返回一个ResultProcessor回调，该回调可接收上一个ResultProcessor传入（或原始方法返回）的数据，进行再加工
                    return function (result: any) {
                        if (!isPromise(result)) {
                            return next(result);
                        }
                        let version = cache.version || 0;
                        cache.version = version + 1;
                        //在promise resolve之前记录当前promise方法调用版本号
                        result.finally(() => {
                            //在promise resolve后判断当前版本是否是最新版本
                            if (version + 1 === cache.version) {
                                //如果当前版本是最新版本，则重建分支，老分支将成为一个游离的无效对象分支，
                                //分支运行的缓存也将被重置。
                                branchApi.rebuild();
                            }
                        });
                        //传递给下一个ResultProcessor
                        return next(result);
                    }

                }

            }

        }
```  
通过上面的代码我们可以发现一个BranchResolver和一个普通Resolver的不同点在于多了一个BranchApi获取层。
```typescript
class Branch implements OriginAgent {

    state = {count: -1};

    setCount(count: number) {
        return {count};
    }

    async disorderCount(count: number) {
        // 当count为0时延时一秒执行.
        if (count === 0) {
            await new Promise((r) => setTimeout(r,1000));
        } else {
            await Promise.resolve();
        }
        this.setCount(count);
    }
}

const agent = createAgentReducer(Branch).agent;
const {disorderCount} = branch(agent, BranchResolvers.takeLatest());
const p0 = disorderCount(0); 
//本该在1秒之后通过执行setCount覆盖reducer state数据的方法，在受BranchResolvers.takeLatest()影响后，被抛弃。
const p1 = disorderCount(1); 
//因为count为1时，promise直接resolve，导致之前延时1秒的disorderCount(0)所在分支被抛弃。
await Promise.all([p0, p1]);
expect(agent.state.count).toBe(1);
await disorderCount(2); 
//因为产生的新分支代替了原分支，所以当前分支的后续任务能继续按照takeLatest模式进行。
expect(agent.state.count).toBe(2);
```
#### BranchResolvers

###### BranchResolvers.takeLatest()
使用该插件的分支只允许最后一次触发的异步任务数据进入reducer state。

###### BranchResolvers.takeBlock(blockMs?: number)
使用该插件的分支在异步任务结束前将阻止其他同名方法运行。通过设置blockMs毫秒数，可以指定阻塞时间，在超过阻塞时间后将不再阻止其他同名方法。

###### BranchResolvers.takeLazy(waitMs: number)
使用该插件的分支方法会在触发后`waitMs`毫秒后执行，但如果在`waitMs`毫秒内再次触发，这时候运行的方法将会代替还未运行的上次方法，
并继续延时`waitMs`毫秒后执行。

### 关于branch的使用建议
branch分支系统的设计初衷：使用一个分支来完成一项特殊任务，分支因任务而存在，
为了这项特殊任务，分支随时可能被resolver抛弃或重建。所以使用一个分支去做多个任务，不但会引起代码维护的混乱，
同时也可能产生许多跟分支重建有关的bug。因此我们希望使用者在明确一个分支唯一目标的基础上使用它。
当然一个任务不一定非得是一个方法，比如：`翻页查询`和`点击查询按钮查询`就是一个任务，它们的目标是统一的。


[更多例子](https://github.com/filefoxper/agent-reducer/blob/master/test/index.test.ts)