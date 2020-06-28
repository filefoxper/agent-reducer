[![npm][npm-image]][npm-url]
[![standard][standard-image]][standard-url]

[npm-image]: https://img.shields.io/npm/v/agent-reducer.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/agent-reducer
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[standard-url]: http://npm.im/standard

[中文文档](https://github.com/filefoxper/agent-reducer/blob/master/README_ch.md)

recommend usages:
1. [use-agent-reducer](https://www.npmjs.com/package/use-agent-reducer) react hook for replace useReducer
2. [use-redux-agent](https://www.npmjs.com/package/use-redux-agent) react hook for enhance react-redux

# agent-reducer

### new changes
1. provide `Resolver` as the middleWare system in redux.
2. provide `branch` system to do a special work with special mode like `takeLatest` in `redux-saga`. 

### reducer
reducer brings us a lot of benefits when we organize states. 
It provides a pure functional writing mode to make our state predictable. 
When we use keyword <strong>return</strong> to give out then next state, the rest logic can be negligible.

But it has some problems too. When we dispatch an action, we have to use `dispatch({type:'...',payload:{...}})` to tell 
reducer driver, we have put an action, please handle it, and give out the next state. 
We can not use it easily as deploy a function. 

So, we have made some change to let `dispatch({type:'...',payload:{...}})` be `object.handleChange(...args)`. 

### make reducer a little better
Now, let's write a reducer like this:
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

    public sum(state: number,addition:number) {
        return state + addition;
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
setTimeout(() => console.log(agent.state)); // 2
```
more in [test](https://github.com/filefoxper/agent-reducer/blob/master/test/index.test.ts)

The code above gives us a new style to write reducer. The function `createAgentReducer` remains a store like redux store inside, 
but more simple. Of course, you can connect to your own reducer driver like redux store or react hook useReducer too.

Before that, let's analyze the code at first. 

The function `addOne` above returns a next state, like a true reducer, it will change the state in store. 
And when you deploy it from agent like `agent.addOne()`, it dispatch an action.
The current state can be retrieved from `agent.state` or `this.state`. So, We don't have to write a reducer like this now:
```typescript
const countReducer=(state:number,action)=>{
    if(action.type === 'ADD_ONE'){
        return state + 1;
    }
    if(action.type === 'SUM'){
        const {payload}=action;
        return payload.state + payload.addition;
    }
    return state;
};

function addOneAfterOneSecond(){
    setTimeout(()=>dispatch({type:'ADD_ONE'}),1000);
}
```
If you are using typescript, the type system will give you more infos to keep your code more reliable.
There are some rules about this tool, you should know, before use it, and trust me, they are simple enough.

### rules
1 . The class or object to `createAgentReducer` function is called <strong> originAgent</strong>. To be an <strong>originAgent</strong>, 
it must has a <strong>state</strong> property. Do not modify <strong>state</strong> manually. 
this.state preserve the current state, so you can compute a <strong>next state</strong> by this.state and params in an <strong>originAgent</strong> function.

2 . The object `createAgentReducer(originAgent).agent` is called <strong>agent</strong>. 
And the function in your <strong>agent</strong> which returns an object <strong>not</strong> undefined or promise, 
will be an <strong>dispatch function</strong>, when you deploy it, an action contains next state will be dispatched to a true reducer.  
```
like agent.addOne, agent.sum
```
3 . The function which returns <strong>undefined | promise</strong> is just a simple function,
which can deploy <strong>dispatch functions</strong> to change state.
```
like agent.addOneAfterOneSecond
```
4 . <strong>Do not use namespace property</strong> in your agent. 
The property '<strong>namespace</strong>' will be used by `createAgentReducer` inside.
( We will try to remove this rule by next big version. )

### features
1. Do not worry about using <strong>this.xxx</strong>, when you use <strong>agent</strong> from <strong>createAgentReducer(originAgent).agent</strong>.
The <strong>agent</strong> has been rebuild by proxy and Object.defineProperties, the functions inside have bind <strong>this</strong> by using sourceFunction.apply(agentProxy,...args),
so you can use those functions by reassign to any other object, and <strong>this</strong> in this function is locked to the <strong>agent</strong> object.

### connect to another reducer driver
Use <strong>update</strong> method from an <strong>agentReducer</strong>, which is created by <strong>createAgentReducer</strong>,
like:
```typescript
//We create a simple outside store, and make the agent work with this store.
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

    //use manual mode by a configurable env {updateBy: 'manual'}
    const reducer = createAgentReducer<number, Counter>(Counter, {updateBy: 'manual'});

    const store = createStore<number>(reducer, reducer.initialState);
    //update state and dispatch function after the store works, we can use subscribe a listener to do this again and again
    const listener = () => reducer.update(store.getState(), store.dispatch);
    const unsubscribe = store.subscribe(listener);
    //before all, we try to fetch the newest state and dispatch from store.
    listener();
    
    const agent = reducer.agent;
    agent.addOne();
    expect(agent.state).toEqual(store.getState());
```
more in [test](https://github.com/filefoxper/agent-reducer/blob/master/test/index.test.ts)
### api
#### createAgentReducer(originAgent: T | { new(): T }, e?: Env)
#### createAgentReducer(originAgent: T | { new(): T }, resolver?:Resolver, e?: Env)

###### params
1. originAgent：a class or object with state property and functions, for replacing the reducer
2. resolver（Resolver）：a callback function provided for resolving returns of your functions, and you can decide what should to be dispatched as a next state. 
The default resolver will just pass an valuable object (not promise or undefined) to the dispatcher.
3. e（Env）：agent running environment

<strong>resolver（Resolver）：</strong>

```typescript
export type ResultProcessor=(result:any)=>any;

export type NextLink=(next:ResultProcessor)=>ResultProcessor;

export type Resolver=(cache:any)=>NextLink|void;
```
The structure of a Resolver is like above. <strong>You can consider the resolver as a middleware</strong> in redux.
1. When the function of your agent deployed, the <strong>Resolver</strong> will invoking first.
 and a <strong>cache</strong> (a clear plain object) belongs to this function will setting as a param to your resolver function.
 you can use this cache to record any thing you want about this function you deployed. 
 
2. After the resolver finished, it is expected to get a <strong>NextLink</strong> function as a callback to provide a <strong>next</strong> function.
But, if it returns void (undefined), the origin function will not invoke. 
The <strong>NextLink</strong> will provide a <strong>next</strong> function to pass a result to next <strong>ResultProcessor</strong>.

3. The <strong>ResultProcessor</strong> will receive a result from a previous <strong>ResultProcessor</strong> or the origin function returns.
And you can use the <strong>next</strong> function from <strong>NextLink</strong> to pass the result which processed in this <strong>ResultProcessor</strong> to the next <strong>ResultProcessor</strong>.
And finally, result will be passed as a next state to the reducer.

4. You can use <strong>applyResolvers</strong> api function to combine your resolvers as an executing list. 
And if you want to use the default resolver as the last state processor, you can import {<strong>defaultResolver</strong>} from 'agent-reducer'.
   
<strong>e（Env）：</strong>

1 . updateBy：'auto'|'manual'    （how to update state and dispatch）

defaults 'auto'. When 'auto', the state and dispatch will be remains by a inside store. 
When 'manual', the state and dispatch should be updated by an outside reducer driver by using <strong>reducer.update(state,dispatch)</strong>.

2 . expired：false|true      （mark agent is expired）

defaults false. When false, every thing works well. When true, the dispatched action will never reach the reducer.
So, state can not be updated any way.

3 . strict：true|false       （force the agent update state by reducer driver）

defaults true. When true, the agent state will be updated exactly by reducer driver state changes. 
When false, the agent state will be updated quickly by the result invoked from the <strong>dispatch function</strong>.

###### return
reducer （like function reducer(state:State,action:Action):State}）

reducer padding utils:
1. initialState：initial state for agent and reducer
2. env（Env）：agent running environment，ref to <strong>params 2</strong>
3. agent：a proxy from originAgent, which can dispatch actions by deploy <strong>dispatch functions</strong>,
and retrieve current state by using agent.state;
4. update(state,dispatch)：update state and dispatch from an outside reducer driver (like store). 
It only works when env.updateBy==='manual'.
5. recordSateChanges()：deploy to tell agent, you need to record state changes now. It returns an getStateChanges function, 
when you deploy getStateChanges function, you can get an state change record array.

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
Use `applyResolvers` just like using `applyMiddleWares` in redux. 
(if you still want to use the default resolver as one part of your resolver links, 
you can `import {defaultResolver} from 'agent-reducer'`, then `applyResolvers(...your resolvers... , defaultResolver)` to make your own resolver)
#### branch(agent:Agent,resolver:BranchResolver)
The function branch creates a copy object of your agent. You can not modify props in this copy object.
It is designed for doing something like 'simple effects in redux-saga'. When you created a branch with a <strong>BranchResolver</strong>, 
you can use <strong>branchApi</strong> to reject or rebuild this branch as you wish. If you reject it, Your branch can not dispatch any state to reducer.
If you rebuild it, The old branch will be rejected first, and then build a new branch instead. Take a look at the usage.

```typescript
function takeLatestResolver(branchApi: BranchApi): Resolver {

            return function (cache: any): NextLink {

                return function (next: ResultProcessor):ResultProcessor {

                    return function (result: any) {
                        if (!isPromise(result)) {
                            return next(result);
                        }
                        let version = cache.version || 0;
                        cache.version = version + 1;
                        //record the version when before promise is resolved
                        result.finally(() => {
                            //check the version is the newest
                            if (version + 1 === cache.version) {
                                //if whe newest is resolved, rebuild the branch, and the old branch is rejected.
                                branchApi.rebuild();
                            }
                        });
                        return next(result);
                    }

                }

            }

        }
```  
By using branchApi.rebuild, we disabled the dispatch functions in the old branch, and create a new one instead.
The code above is the implements about <strong>BranchResolvers.takeLatest()</strong>. You can use it like this:
```typescript
class Branch implements OriginAgent {

    state = {count: -1};

    setCount(count: number) {
        return {count};
    }

    async disorderCount(count: number) {
        // when count is 0, the dispatch function setCount will be called after 1 sec.
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
//for the disorderCount should delay 1 sec, when param count is 0, but the dispatch function will be rejected as an old branch
const p1 = disorderCount(1); 
//for this function resolve first, the branch will take it's dispatch function `setCount`, and reject this branch as an old branch, then build a new copy instead.
await Promise.all([p0, p1]);
expect(agent.state.count).toBe(1);
await disorderCount(2); 
//for the branch is rebuilt, the new branch will work takeLatest well again.
expect(agent.state.count).toBe(2);
```
#### BranchResolvers

###### BranchResolvers.takeLatest()
This resolver will take the latest deploy of your function.

###### BranchResolvers.takeBlock(blockMs?: number)
This resolver will block a function between the time when it is called and when it is resolved.
And you can set block milliseconds to reduce the block time.

#### suggest to using branch
A branch is considered to do just one special work with a resolver. It can be rejected or be rebuilt any time.
So, please do not use it to deploy different functions.

more in [test](https://github.com/filefoxper/agent-reducer/blob/master/test/index.test.ts)