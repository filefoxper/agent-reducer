# env 运行环境配置

Env 是`Agent`对象运行时依赖的环境配置。你可以通过配置体验下一版本特性，或控制`Agent`对象的生命周期等。

环境配置结构：
```typescript
// 运行环境配置
export interface Env {
  // 默认 'auto', 
  // 如果设置为 'manual', 
  // 'agent-reducer' 将随接入的 reducer 工具更新 
  updateBy?: "manual" | "auto";
  // 默认 'false',
  // 如果设置为 'true',
  // 'agent-reducer' 将停止更新 state
  expired?: boolean;
  // 默认 'true',
  // 如果设置为 'false',
  // 'Agent' state 会在方法调用后立即更新,
  // 不再等待接入的 reducer 工具更新数据,
  // 这意味着 'Agent' state 可能会与外接 reducer 工具维护的 state 不一致.
  // 虽然最终 'Agent' state 会与 reducer 工具中的 state 一致，
  // 但我们仍不推荐将其设置为 'false' 
  // 注意：自 agent-reducer@3.6.0 开始，设置strict将变得毫无意义。
  // agent-reducer@3.6.0 为了减少对环境平台的依赖，
  // 采取了类似 redux 的 state 先行变更，并通知变更的手段
  // 也就是说，自 agent-reducer@3.6.0 开始，始终采取的是 strict:false 特性
  // 从 agent-reducer@4.0.0 起，该字段将被彻底删除
  strict?: boolean;
  // 默认 'false',
  // 如果设置为 'true',
  // 'agent-reducer'将会表现出旧版本特性
  legacy?: boolean;
  // 默认 'false',
  // 如果设置为 'true',
  // 'agent-reducer'将会表现出未来版本特性
  nextExperience?:boolean;
}
```
你可以在[这里](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/guides/tryEnv.spec.ts)查看 env 的配置方法。

[下一节](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/guides/model_agent_relationship.md)， `Agent` 与 `OriginAgent` 的关系。
