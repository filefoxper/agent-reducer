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

## v3.2.0 2021-03-11

* [bug] 修复 api useMiddleWare 复用了 api createAgentReducer 的 MiddleWare 的问题。
* [design] 在过去， applyMiddleWares 使用的是方法级统一的缓存 cache ,
这使得 MiddleWare 的缓存之间可能存在缓存数据共享问题，自当前版本开始
 applyMiddleWares 会为每个 MiddleWare 开辟了独立的缓存空间 cache ，
 各个 MiddleWare 之间将不再有缓存共享问题。
* [design]  `MiddleWares.takeNone()`作为当前版本新加入的 MiddleWare 可以阻止任何 state 改变。
* [feature] `MiddleWare`的覆盖优先级已经变更为：
`useMiddleWare` -> `middleWare` -> `createAgentReducer`。
* [feature] 使用相同实例模型的`Agent`代理对象之间数据更新同步。

## v3.2.1 2021-03-11

* [bug] 解决 `use-agent-reducer` 同步更新数据时, react throw error: `Cannot update a component (`xxx`) while rendering a different component (`xxx`)`

## v3.2.2 2021-03-12

* [bug] 解决 `use-agent-reducer` 同步更新数据时, react throw error: `Cannot update a component (`xxx`) while rendering a different component (`xxx`)`

## v3.2.7 2021-03-16

* [api] 新增接口 `sharing` 用于生成持久化模型.
* [api] 新增接口 `weakSharing` 用于生成弱持久化模型

## v3.3.0 2021-04-25

* [compile] 编译新增目录 `es`，直接使用`import {...} from 'agent-reducer/es'` 对减包由帮助，[详情清见](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/introduction/installation.md) 。

## v3.3.1 2021-05-07

* [compile] 进一步减小 `es` 目录内容。