# about env

Env is a running environment config of `Agent` object. You can use it to experience a next version feature, or tell `agent-reducer` updating state with other reducer tools, even stop updating state, and so on.

An env object looks like:
```typescript
// running env config
export interface Env {
  // default 'auto', 
  // if set it to be 'manual', 
  // 'agent-reducer' will update state to a out reducer tool 
  updateBy?: "manual" | "auto";
  // default 'false',
  // if set it to be 'true',
  // 'agent-reducer' will stop updating state
  expired?: boolean;
  // default 'true',
  // if set it to be 'false',
  // 'Agent' state will be updated immediately,
  // and not wait state updating from reducer tool,
  // it means 'Agent' state may not equal with reducer tool state in moment.
  // though, the 'Agent' state will be equal with reducer tool state finally,
  // but, we still do not recommend you set it to 'false'. 
  // Notice, from 'agent-reducer@3.6.0',
  // this env property will be meaningless,
  // `agent-reducer` decide to adopt the state changing strategy of 'redux'.
  // This state changing strategy is changing state in model first,
  // then notice the renders.
  // So, it means the model state is always updated immediately, 
  // just like the {strict:false} setting.
  // When the 'agent-reducer@4.0.0' coming, 
  // this config property will be removed.
  strict?: boolean;
  // default 'false',
  // if set it to be 'true',
  // 'agent-reducer' will run with the old version features
  legacy?: boolean;
  // default 'false',
  // if set it to be 'true',
  // 'agent-reducer' will run with a next version features
  nextExperience? :boolean;
}
```
You can check out the code about how to set env, [here](https://github.com/filefoxper/agent-reducer/blob/master/test/en/guides/tryEnv.spec.ts).

Be careful in `env.strict`, you'd better not set it to be `false`. For it will make the state difference between `Agent` and your reducer tool.

Go to [next section](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/guides/model_agent_relationship.md) to learn relationship of `Agent` and `OriginAgent`.
