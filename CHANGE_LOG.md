## v3.1.1 2020-12-17

* [bug] 已修复 reducer.update 方法中当 state 为 undefined 时，
外部 store state 与 agent state 不同步的问题。

## v3.1.2 2021-02-28

* [bug] 使用常规 debounce 代码修复原`MiddleWares.takeDebounce`因事件堆积导致的不稳定问题。
* [bug] 修复了`globalConfig`在无法获取到`window,global,self`情况下报错的问题。
* [feature] 新增`nextExperience`下一版本体验特性，并在`env`中增加了相应开启配置项。
`MiddleWare`的覆盖优先级将在`nextExperience`环境中变更为：`useMiddleWare` -> `middleWare` -> `createAgentReducer`。
* [document] 更改了文档结构以方便分步阅读。
* [document] 新增了英文文档。
* [unit test] 根据文档变更，新增了中英文分离的单元测试案例。