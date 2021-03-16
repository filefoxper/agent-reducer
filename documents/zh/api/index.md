# API 简介

这一节我们可以大致预览 API 文档的全貌，如果你想要了解每个 API 接口的细节，请点击连接查看细节部分。

1 . [createAgentReducer](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/create_agent_reducer.md) 作为一个核心接口，可用于创建一个 `AgentReducer` function ，我们可以使用这个 function 来连接一个外部 reducer 工具。

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
2 . [useMiddleWare](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/use_middle_ware.md) 可以用来复制一个 `Agent` 对象， 并对这个复制对象使用特殊的 `MiddleWares` 。

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
3 . [middleWare](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/middle_ware.md) 和上述接口 `useMiddleWare` 很像, 但该接口添加的 MiddleWare 直接作用于 method 。你可以用该接口为不同的 method 添加不同的 MiddleWare 。
  
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
        // 通过传入需要被添加 MiddleWare 的方法，
        // 以及需要添加的 MiddleWare 这种普通方式，
        // 添加方法级的 MiddleWare
        middleWare(
            this.doSomething, 
            MiddleWares.takePromiseResolve()
        );
    }

    // 使用 es6 decorator 添加方式，
    // 只传 MiddleWare
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
4 . [applyMiddleWares](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/apply_middle_wares.md) 当前方法用于将多个 `MiddleWares` 串联成一个 `MiddleWare`.

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

    // 以 es6 decorator 的方式使用 middleWare，
    // 这时，你只能传入一个 MiddleWare，
    // 如果你需要多个 MiddleWare 特征，
    // 请使用 applyMiddleWares
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

5 . [MiddleWares](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/middle_wares.md) 是一个用于存储多个常用 MiddleWare 的 class 集合。

```typescript
import {MiddleWares} from 'agent-reducer';

const {
    // 处理 promise 返回值
    takePromiseResolve,
    // 处理不完整 state 返回值
    takeAssignable,
    // 以 Throttle 节流模式运行调用方法
    takeThrottle,
    // 以 Debounce 防抖模式运行调用方法
    takeDebounce,
    // 以原子方式运行被控方法，
    // 如果被控方法为异步方法，
    // 则方法等待上次该方法返回 promise resolve 之后，
    // 继续运行
    takeBlock,
    // 早期版的 takeDebounce
    takeLazy
} = MiddleWares;
```
6 . [LifecycleMiddleWares](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/lifecycle_middle_wares.md) 是一个用于存储生命周期控制类型 MiddleWare 的集合，这类 MiddleWare 可以通过修改 `env.expired` 达到停止或重启`Agent`生命周期的效果。`Agent`生命周期关系到`Agent`是否还能继续改变 state 数据。所以它的作用也是很大的。

```typescript
import {LifecycleMiddleWares} from 'agent-reducer';

const {
    // 停止早期触发方法改变 state 的能力
    takeLatest
} = LifecycleMiddleWares;
```

7 . [MiddleWarePresets](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/middle_ware_presets.md)是一个常见MiddleWare的串行集合，它也是一个 class 。
```typescript
import {MiddleWarePresets} from 'agent-reducer';

const {
    // 同 MiddleWares.takePromiseResolve
    takePromiseResolve,

    // 同 MiddleWares.takeAssignable
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

8 . [sharing](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/sharing.md) 用于创建一个持久化共享模型。

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

9 . [weakSharing](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/weak_sharing.md) 用于创建一个弱持久化共享模型。

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

10 . [不常用 API](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/not_often_use.md): 有些API可能一辈子也用不到，但我们依然列出了它们以供不时之需。

11 . [不推荐使用的 API](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/not_recommend.md): 有些设计不理想API，我们并不推荐使用，但我们依然列出了它们。