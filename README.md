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
createAgentReducer(originAgent: T | { new(): T }, e?: Env)

###### params
1. originAgent：a class or object with state property and functions, for replacing the reducer
2. e（Env）：agent running environment

e（Env）：

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
5. record()：deploy to tell agent, you need to record dispatch actions now. It returns an unRecord function, 
when you deploy unRecord function, you can get an dispatched record array.

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
more in [test](https://github.com/filefoxper/agent-reducer/blob/master/test/index.test.ts)