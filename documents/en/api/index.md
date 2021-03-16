# API Reference

This section is a shortcut view of API Reference, if you want to know more, please click the `start link` for details. 

1 . [createAgentReducer](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/create_agent_reducer.md) is a primary entry for creating an `AgentReducer` function which can be used in another reducer tool.

```typescript
import {createAgentReducer,OriginAgent} from 'agent-reducer';

class Model implements OriginAgent<any>{

    state={};

    doSomething(){
        // do something ......
        return {};
    }

}

const reducer = createAgentReducer(Model);
const { agent } = reducer;
agent.doSomething();
// agent.state changes
const currentState = agent.state;
```
2 . [useMiddleWare](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/use_middle_ware.md) can copy an `Agent` object, and add `MiddleWares` on it.

```typescript
import {
    createAgentReducer,
    useMiddleWare,
    MiddleWares,
    OriginAgent
} from 'agent-reducer';

class Model implements OriginAgent<any>{

    state={};

    async doSomething(){
        // do something ......
        return {};
    }

}

const reducer = createAgentReducer(Model);
const { agent } = reducer;
const agentCopy = useMiddleWare(agent,MiddleWares.takePromiseResolve());
agentCopy.doSomething();
// agent.state changes
const currentState = agent.state;
```
3 . [middleWare](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/middle_ware.md) is like `useMiddleWare` above, but it is effect on a method, you can add `MiddleWares` on method by using it.
  
```typescript
import {
    createAgentReducer,
    middleWare,
    MiddleWares,
    OriginAgent
} from 'agent-reducer';

class Model implements OriginAgent<any>{

    state={};

    constructor(){
        // you can use 'middleWare' directly,
        // by passing method and MiddleWares as params.
        middleWare(
            this.doSomething, 
            MiddleWares.takePromiseResolve()
        );
    }

    // or you can use 'middleWare' as a es6 decorator,
    // and pass one MiddleWare
    @middleWare(MiddleWares.takePromiseResolve())
    async doSomething(){
        // do something ......
        return {};
    }

}

const reducer = createAgentReducer(Model);
const { agent } = reducer;
agent.doSomething();
// agent.state changes
const currentState = agent.state;
```
4 . [applyMiddleWares](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/apply_middle_wares.md) is a function for chaining `MiddleWares` together to be one `MiddleWare`.

```typescript
import {
    createAgentReducer,
    middleWare,
    applyMiddleWares,
    MiddleWares,
    OriginAgent
} from 'agent-reducer';

const {takePromiseResolve,takeAssignable} = MiddleWares;
const promiseMW = takePromiseResolve();
const assignMW = takeAssignable();

class Model implements OriginAgent<any>{

    state={};

    // you can use 'middleWare' as a es6 decorator,
    // and pass one MiddleWare,
    // if you need MiddleWares more than one,
    // please use applyMiddleWares
    @middleWare(applyMiddleWares(promiseMW,assignMW))
    async doSomething(){
        // do something ......
        return {};
    }

}

const reducer = createAgentReducer(Model);
const { agent } = reducer;
agent.doSomething();
// agent.state changes
const currentState = agent.state;
```

5 . [MiddleWares](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/middle_wares.md) is a class for storing some useful `MiddleWares` for state reproducing.

```typescript
import {MiddleWares} from 'agent-reducer';

const {
    // reproducing promise returning
    takePromiseResolve,
    // reproducing part of state type returning
    takeAssignable,
    // control method running with Throttle mode
    takeThrottle,
    // control method running with Debounce mode
    takeDebounce,
    // control method running by promise atom mode,
    // only when the previous running end, 
    // it can be allowed to run again. 
    takeBlock,
    // control method running with Debounce mode (old version usage)
    takeLazy
} = MiddleWares;
```
6 . [LifecycleMiddleWares](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/lifecycle_middle_wares.md) is a class for storing a useful `MiddleWare` which can control the lifecycle of `Agent` copy object. It can stop or rebuild an `Agent` copy object by setting `env.expired` to `true` or `false`.

```typescript
import {LifecycleMiddleWares} from 'agent-reducer';

const {
    // stop the early triggered method changing state
    takeLatest
} = LifecycleMiddleWares;
```

7 . [MiddleWarePresets](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/middle_ware_presets.md) is a class for storing some useful chained `MiddleWares`. For example, if you want use `MiddleWares.takePromiseResolve` and `MiddleWares.takeAssignable` together, you can use `MiddleWarePresets.takePromiseResolveAssignable`.
```typescript
import {MiddleWarePresets} from 'agent-reducer';

const {
    // same as MiddleWares.takePromiseResolve
    takePromiseResolve,

    // same as MiddleWares.takeAssignable
    takeAssignable,

    // MiddleWares.takeThrottle,MiddleWares.takePromiseResolve
    takeThrottle,

    // MiddleWares.takeDebounce,MiddleWares.takePromiseResolve
    takeDebounce,

    // LifecycleMiddleWares.takeLatest,MiddleWares.takePromiseResolve
    takeLatest,

    // MiddleWares.takeLazy,MiddleWares.takePromiseResolve
    takeBlock,

    // MiddleWares.takeBlock,MiddleWares.takePromiseResolve
    takeLazy,

    // MiddleWares.takePromiseResolve,MiddleWares.takeAssignable
    takePromiseResolveAssignable,

    // LifecycleMiddleWares.takeLatest,
    // MiddleWares.takePromiseResolve,
    // MiddleWares.takeAssignable
    takeLatestAssignable,

    // LifecycleMiddleWares.takeThrottle,
    // MiddleWares.takePromiseResolve,
    // MiddleWares.takeAssignable
    takeThrottleAssignable,

    // LifecycleMiddleWares.takeDebounce,
    // MiddleWares.takePromiseResolve,
    // MiddleWares.takeAssignable
    takeDebounceAssignable
} = MiddleWarePresets;
```

8 . [sharing](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/sharing.md) is for generating a persistent model.

```typescript
import {sharing, createAgentReducer, OriginAgent} from 'agent-reducer';

class Model implements OriginAgent<any>{

    state = {};

    method():any{
        return {}
    }

}

const sharingModelRef1 = sharing(()=>Model);

const {agent:agent1} = createAgentReducer(sharingModelRef1.current);
const {agent:agent2} = createAgentReducer(sharingModelRef1.current);
```

9 . [weakSharing](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/weak_sharing.md) is for generating a weak persistent model.

```typescript
import {weakSharing, createAgentReducer, OriginAgent} from 'agent-reducer';

class Model implements OriginAgent<any>{

    state = {};

    method():any{
        return {}
    }

}

const sharingModelRef1 = weakSharing(()=>Model);

const {agent:agent1} = createAgentReducer(sharingModelRef1.current);
const {agent:agent2} = createAgentReducer(sharingModelRef1.current);
```

10 . [not often usage](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/not_often_use.md): There are some apis which are not often used, if you want to know, check them [here](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/not_often_use.md).

11 . [not recommend](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/not_recommend.md): There are some apis which are not recommended to use, if you want to know, check them [here](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/not_recommend.md).