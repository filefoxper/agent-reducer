# 下一版本体验特性

自版本`agent-reducer@3.1.2`，我们加入了下一版本体验特性，开放给使用者预先体验，使用者可以通过 API [createAgentReducer](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/create_agent_reducer.md)传入一个带有`nextExperience`属性为`true`的 env 参数来体验下一版本拥有的部分特性。体验版本跨度为一个中版本为单元。

```typescript
import {createAgentReducer} from 'agent-reducer';

const {agent} = createAgentReducer(OriginAgent,{nextExperience:true});
```

体验版本试例 : `当前 3.1.2 -> next 3.2.0`.

* 下一版本中，MiddleWare 覆盖的优先级变更如下： `useMiddleWare` -> `middleWare` -> `createAgentReducer`. 