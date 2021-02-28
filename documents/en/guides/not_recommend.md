# not recommend

There are some bad design in `agent-reducer`, for some reason, we can not delete them at this version. But you should know which parts are not recommended to use.

## env.strict

As we have knew `agent-reducer` allows `Agent` state changing happens immediately by setting `env.strict` to false, and this may cause difference between `Agent` state and reducer tool state at moment. Though the final `Agent` state is equal with the reducer tool state, but we still do not recommend you to set it `false`.

example:
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
        // we call increase twice,
        // but after update, we check out state is 1,
        // because react hook can not update state immediately,
        // if we set 'env.strict' to be false, agent state will be 2.
        // like `const agent = useAgentReducer(Model,{strict:false});`
        // this feature is very different with other react hooks,
        // like useReducer or useState,
        // so, we do not recommend to use it.
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

In `agent-reducer@3.0.0`, we added an api function `globalConfig`, it allows you set a global config about `env` and `MiddleWare` for `agent-reducer`. But this is a bad design too, for using this api, some hidden features of `agent-reducer` will appear suddenly. So, it is better to set `env` and `MiddleWare` by using `createAgentReducer`, `useMiddleWare`, `middleWare` directly.

## MiddleActions

In `agent-reducer@3.0.0`, we added a concept `MiddleActions` and its using function `useMiddleActions`. At first, we want to provide it as a extention usage about `MiddleWare`, but later, we find the `state processing MiddleWare` can not work with `MiddleActions`, this may confuse users. So, We are not going to update this part in future, and it is better for you not using `MiddleActions` more in your code.

It's time to see the [api](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/index.md) now, besides, it is a tired work for writing so much things. [See api](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/index.md).