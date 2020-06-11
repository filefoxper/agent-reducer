[![npm][npm-image]][npm-url]
[![standard][standard-image]][standard-url]

[npm-image]: https://img.shields.io/npm/v/agent-reducer.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/agent-reducer
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[standard-url]: http://npm.im/standard

# agent-reducer

### reducer
We have used to reducer long long ago, and it brings us a lot of benefits when we organize states. 
It provides a pure functional writing mode to make our state predictable, and simplify the logic what state flows by keyword <strong>return</strong>.

But it has some problems too. When we dispatch an action, we have to use `dispatch({type:'...',payload:{...}})` to tell 
reducer driver, we have put an action, please handle it, and give out the next state. 
We can not find out which branch in reducer has invoked easily. 

So, we have done some thing to make the `dispatch({type:'...',payload:{...}})` more easy to be used like a function in an object. 
When you invoke the function, an <strong>dispatch</strong> will be triggered to reducer instead.

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
The code above gives us a new style to write a reducer, and it remains a store like redux store, 
but more simple, to maintain the state. You can connect to your own reducer driver like redux store or react hook useReducer.

But first, let's analyze this code. 

The function `addOne` returns a next state, like a true reducer, it will change the state in store.
So, it like a dispatch too, which can set arguments more friendly, and do not need a type string as a notifier, 
because it is a function. The current state can be retrieve from this.state. So, We don't have to write a reducer like this now:
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
If you are using typescript, the type system will give you more infos to keep your code reliable.
There are some rules about this tool, you should know, before use it, and trust me, they are simple enough.

### rules
1 . The class or object which will replace reducer call <strong>agent</strong> here. To be an <strong>agent</strong>, 
it must has a <strong>state</strong> property, and do not modify <strong>state</strong> manually. 
this.state preserve the current state, so you can compute a <strong>next state</strong> by this.state and arguments from an <strong>agent</strong> function.
```
like agent.state
```
2 . The function in your <strong>agent</strong> which returns an object <strong>not</strong> undefined or promise, 
will be an <strong>dispatch function</strong>, when you deploy, it like dispatch an action to reducer. 
when this function invoke, it like a branch in a reducer function.  
```
like agent.addOne, agent.sum
```
3 . The function which returns <strong>undefined | promise | void</strong> is just a simple function,
which can deploy <strong>dispatch functions</strong> to change state.
```
like agent.addOneAfterOneSecond
```
4 . <strong>Do not use namespace property</strong> in your agent. 
The property '<strong>namespace</strong>' will be used to connect with global state like combined reducers mapping state in redux.
( We will try to remove this rule by next version. )

### features
1. Do not afraid about using <strong>this.xxx</strong>, when you use agent from <strong>createAgentReducer(agent:OriginAgent)</strong>.
The agent is rebuild by proxy and Object.defineProperties, and the functions in it have bind <strong>this</strong> by using sourceFunction.apply(agentProxy,...args),
so you can use those functions by reassign to any other object, and <strong>this</strong> in this function is locked to the agent object.
2. <strong>useAgent</strong> knows when your component unmount by using <strong>useEffect</strong>, so, 
it will stop dispatch when your component has unmounted.

### update by other reducer drivers
Use <strong>update</strong> method from an <strong>agentReducer</strong>, which is created by <strong>createAgentReducer</strong>,
like:
```typescript
//We create a simple outside store, and make the reducer work with this store.
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

    //open manual mode by env.updateBy='manual'
    const reducer = createAgentReducer<number, Counter>(Counter, {updateBy: 'manual'});

    //update state to store after the agentReducer run.
    const store = createStore<number>(reducer, reducer.initialState);
    
    const listener = () => reducer.update(store.getState(), store.dispatch);
    const unsubscribe = store.subscribe(listener);
    listener();
    
    const agent = reducer.agent;
    agent.addOne();
    expect(agent.state).toEqual(store.getState());
```
more in [test](https://github.com/filefoxper/agent-reducer/blob/master/test/index.test.ts)
### api
```typescript
/**
* 
* @param originAgent agent class or object
* @param e Env set how to run the dispatch and how to update state
* 
* @return agentReducer a normal reducer function which is transformed from originAgent
*         and with an agentData, which can update state and dispatch from an out reducer driver.
*         initialState, env, agent
*/
declare function createAgentReducer<S, T extends OriginAgent<S>>(originAgent: T | { new(): T }, e?: Env): AgentReducer<S, Action, T>

/**
* the agent plays like a classify reducer, which must has a state. Be careful about namespace
*/
interface OriginAgent<S = any> {
  state: S,
  namespace?: string
}

/**
*  a normal reducer with properties from AgentData below
*/
type AgentReducer<S = any, A = any, T extends OriginAgent<S> = any> = Reducer<S, A> & AgentData<S, T>;

/**
* a data parasite in agentReducer above
*/
interface AgentData<S = any, T extends OriginAgent<S> = OriginAgent<S>> {
  initialState: S,      //state from agent (when agent is rebuild first time) 
  namespace?: string,   //when you using combineReducers, you may need it.
  env: Env,             //a config about how to dispatch and how to update state when running
  agent: T,             //an agent object rebuild from origin agent, which provide the interfaces you can deploy
  update: (nextState: S, dispatch: Dispatch) => void
                        //a method to use an outside reducer driver
}

interface Env {
  updateBy?:'manual'|'auto', //default 'auto', when 'manual', 
                             // you can use agentReducer.update method to update your state and change the dispatch function to another one.
  expired?: boolean,         //default false, set an agent expired true, will stop the dispatch function's work. 
  callbacks?: any[],         // deprecated
  strict?: boolean           //default true, set strict false will make this.state change immediately before an dispatch has done.
                             //It is useful sometimes ( like consecutive dispatch in react ). But, we do not recommend doing this.
}

//you don't care
type Reducer<S, A> = (state: S, action: A) => S;

//you don't care
type Action = {
  type: string | number,
  args?: any
};

//you don't care
type Dispatch = (action: Action) => any;
```