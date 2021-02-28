# 不推荐使用的接口

`agent-reducer`依然存在一些不好的设计，因为版本连续性等问题，我们不能直接把这些接口删掉，但我们会为您指出这些我们不推荐使用的接口。

## env.strict

通过把`env.strict`设置为false，我们可以让`Agent` state的变化即刻发生，而不会等待外部接入 reducer 工具的 state 更新，这很容易造成 reducer 工具 state 和 Agent state的临时不一致现象，虽然最终这两个 state 会变得一致起来，但我们仍不推荐你把这个参数设置为 false。

例子:
```typescript
import React from 'react';
import {useAgentReducer} from 'use-agent-reducer';
import {OriginAgent} from 'agent-reducer';

class Model implements OriginAgent<number>{

    state:number = 0;

    increase():number{
        return this.state + 1;
    }

}

const MyComponent=()=>{
    const agent = useAgentReducer(Model);
    const {state,increase} = agent;

    const handleClick=()=>{
        // 连续调用 increase 方法,
        // 我们发现 agent.state 为 1,
        // 这是由 react 事件数据变更合并造成的现象,
        // 如果设置 'env.strict' 为 false, agent.state 会变成 2.
        // 设置如： `const agent = useAgentReducer(Model,{strict:false});`
        // 这与 react hook 中的 useReducer, useState 的特性非常不同。
        increase();
        increase();
    }

    return (
        <div>
            ......
        </div>
    )
}
```
## globalConfig

自 `agent-reducer@3.0.0`， 我们加入了 API 方法 `globalConfig`，这个接口可以用来设置全局范围内默认的 `env` 配置和 `MiddleWare`，但这也是个不好的设计。使用这个 API 接口，会让`agent-reducer`的特性设置隐藏的过深，不容易被共同开发者察觉。所以，通过`createAgentReducer`, `useMiddleWare`, `middleWare`这些接口进行设置更合理一些。 

## MiddleActions

自 `agent-reducer@3.0.0`，我们还加入了`MiddleActions`概念，以及相关的 API useMiddleActions。起初，我们希望利用`MiddleActions`将 `MiddleWare`的使用范围扩展到`Agent`对象之外。但结果同样另人沮丧，我们发现数据处理类型的 MiddleWare 不能在`MiddleActions`环境中工作起来，而方法控制类 MiddleWare 却可以正常工作，这会对使用者造成不必要的疑惑，故不推荐使用。

现在是时候来看看 [API](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/index.md) 了。