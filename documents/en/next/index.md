# Next experience

Next experience is added from `agent-reducer@3.1.2`, you can config an env object and use api [createAgentReducer](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/create_agent_reducer.md) to have a experience about next features.

```typescript
import {createAgentReducer} from 'agent-reducer';

const {agent} = createAgentReducer(OriginAgent,{nextExperience:true});
```

experience version example : `current 3.1.2 -> next 3.2.0`.

* prior level override of MiddleWare: `useMiddleWare` -> `middleWare` -> `createAgentReducer`. 