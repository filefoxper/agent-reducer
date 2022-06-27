# 体验特性与API

`agent-reducer@4.2.0` 重新开启了体验版特性与 API。它们可能在后续版本中发生更改，建议在非生产环境中进行试验和使用。可以通过将 `process.env.AGENT_REDUCER_EXPERIENCE` 设置为 `OPEN` ，并开启[手动编译 agent-reducer](/zh/introduction?id=手动编译) 来开启体验模式。另外在全局使用 API [experience](/zh/api?id=experience) 也可以开启体验模式。

## 引导

目前，在 `agent-reducer` 模型中所有，几乎所有非 flow（工作流） 的方法，都是 action method (能修改 state 的行为方法），因此想要在 flow 中组织并使用一些公共方法是比较困难的，为此我们准备提供一些更显式的 decorator 声明来帮助大家组织这类需要使用 this.state 却不修改数据的公共方法。


