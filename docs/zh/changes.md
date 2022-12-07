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

## v3.3.2 2021-05-08

* [bug] 解决使用模型共享时，过期reducer依然可以修改state的问题。

## v3.3.3 2021-05-24

* [bug] 解决 notify 在 updateBy:'auto'时，死循环问题

## v3.4.0 2021-05-31

* [refactor] 重构 `agent.ts` 和 `reducer.ts`.

## v3.4.1 2021-06-01

* [bug] 修复中间变量为 undefined 引起的 `NPE` 问题.

## v3.5.0 2021-06-08

* [refactor] 再次重构 `agent.ts` 和 `reducer.ts`.

## v3.6.0 2021-06-22

* [design] 采取了 redux state 数据变更策略，先改变数据后通知渲染。
* [design] 模型共享时，模型方法级 `middleWare` 特性和状态也共享。

## v3.6.1 2021-06-22

* [bug] 修正 v3.6.0, weakSharing 不能共享middleWare缓存的问题。

## v3.6.2 2021-07-02

* [bug] 修正 state 更新回流问题，采用 redux 更新策略后， state 不能回流更新。

## v3.6.3 2021-07-13

* [bug] 修正关于通知类 action 修改 state ，导致 state 回滚的问题。

## v3.7.0 2021-07-27

* [design] 在 weakSharing 模式下，除非所有共享代理全部销毁，否则就可以更改模型的 state，但外部 state 更新依旧依赖于当前 agent 是否被销毁。
* [design] weakSharing API 返回对象属性中增加了 initial 回调。

## v3.7.1 2021-08-04

* [design] weakSharing 的 current 初始化将发生在第一次重新使用它的时候。

## v3.7.2 2021-08-26

* [design] 在 reducer function 属性中添加 reconnect 方法，用于重连已经被 destroy 的 agent-reducer。

## v3.8.0 2021-09-24

* [design] 对 api `sharing` 返回对象添加 `initial` 方法。
* [update] 准备 `agent-reducer@4.0.0`

## v3.8.1 2021-09-29

* [bug] 修复关于 package.json 中关于 `module` 的配置问题，最终决定在4.0.0中使用该属性。

## v3.8.2 2021-10-11

* [bug] 修复关于 `MiddleWarePresets.takeLatest` 在遇见 Promise reject 时，产生两个 rejection 的问题

## v3.8.3 2021-10-15

* [optimize] 优化掉关于 `warningSet`的代码。

## v4.0.0 2021-10-25

* [optimize] 优化 state 变更处理过程
* [design] 去掉了 bad design
* [design] 修改了部分接口命名
* [design] 对部分接口进行了简化处理
* [document] 采用了 docs 文档功能

## v4.0.1 2021-11-04

* [optimize] 优化了编译结构，使得 windows 系统也可以安全使用优化编译方式，减小手动编译体积。具体操作可参阅[安装](/zh/introduction?id=安装) 。
* [optimize] MiddleWare 中 promise 相关处理不再依赖 `ES6 Promise` API。 

## v4.0.2 2021-11-04

* [bug] 修复 4.0.1 编译优化导致模块无法找到的 bug 。

## v4.0.3 2021-11-23

* [design] 添加 API [getSharingType](/zh/api?id=getsharingtype)。

## v4.0.4 2021-12-12

* [optimize] 让 state 变化立即发生，而 state 变化通知则互相排队等待。

# v4.0.5 2021-12-18

* [bug] 修复 action 排队逻辑引入的重复更新 state 以及漏发更新通知问题。

# v4.0.6 2022-01-24

* [bug] 修复 `middleWare` class decorator 的 typescript 报错问题。

# v4.0.7 2022-02-10

* [unnecessary change] 该版本做了一个不必要修改，将在 4.0.8 回滚。

# 4.0.8 2022-02-10

* [reverse] 将 4.0.7 回滚至 4.0.6, 并标记为 4.0.8。

# 4.0.9 2022-03-10

* [bug] 修复关于 `MiddleWarePresets.takeNothing`, `MiddleWarePresets.takeNone`, `MiddleWarePresets.takeAssignable` 的 typescript 问题。

# 4.2.0 2022-03-17

* [optimize] 使用链表形式控制 action 的非重叠运行过程。
* [api] 新增 [addEffect](/zh/api?id=addeffect) API
* [api] 新增 [effect](/zh/api?id=effect) API

# 4.2.1 2022-03-17

* [design] 修改 effect decorator 传参用法，不在直接使用 `Class.prototype.method` ，改用 `()=>Class.prototype.method`
* [design] effect decorator 支持对一个 `effect method` 追加多个监听方法

# 4.2.2 2022-03-19

* [bug] 对副作用增加方法是否属于当前模型的检查

# 4.2.3 2022-03-19

* [bug] 修复关于 addEffect API 对 agent 方法是否合法的误判问题。

# 4.2.4 2022-03-21

* [optimize] 新增对通过 `agent` 获取 effect 修饰方法的非法校验。

# 4.2.5 2022-03-22

* [bug] 修复异步副作用方法在所有代理断连后，依然可以修改 state 的问题。

# 4.3.0 2022-04-06

* [design] 添加 [flow](/zh/experience?id=工作流-体验) 和 [effect decorator](/zh/experience?id=副作用-decorator-装饰器用法-体验).
* [design] 添加 experience 体验模式，设置 `process.env.AGENT_REDUCER_EXPERIENCE` 为 `OPEN`, 可体验最新特性和 API. 

# 4.3.1 2022-04-12

* [design] 添加 [avatar](/zh/experience?id=avatar-体验) API.

# 4.3.2 2022-04-28

* [experience] 移除体验 API `flow.on`.
* [experience] 添加体验 API `flow.force`.
* [experience] 修复 `@effect` 接口问题.

# 4.4.0 2022-05-17

* [design] 体验 API [flow](/zh/api?id=flow), [Flows](/zh/api?id=flows),  [effect](/zh/api?id=effect) 以及 [avatar](/zh/api?id=avatar) 转正。
* [experience] 添加体验 API [strict](/zh/experience?id=strict（体验）) 和 [act](/zh/experience?id=act（体验）).

# ~~4.5.0 to 4.5.3~~

* [deprecated]  这些版本为 react 做出了一些不合理的牺牲，这并不符合 `agent-reducer` 库作为公允第三方库的初衷，所以，我们将回滚至 `4.4.0` 版本。对此，我们表示非常抱歉，望使用者原谅。

# 4.5.4 2022-05-25

* [rollback] 回滚至 `4.4.0`.

# v4.5.5 2022-05-29

* [design] 添加 `Flows.block` 工作模式。
* [design] 更新 `Flows.debounce` 接口。

# 4.5.6 2022-05-30

* [design] 将 `Flows.latest` 生效时机变更至 invoke 生命周期，以便于组合。

# 4.6.0 2022-06-27

* [design] 体验版 API [strict](/zh/api?id=strict), [act](/zh/api?id=act) 转正。

# 4.6.1 2022-07-27

* [bug] 解决 typescript 对 `sharing` 或 `weakSharing` 提供的 `initial` 方法返回值支持差的问题。

# 4.6.2 2022-07-30

* [design] avatar 对象可以多次调用 implement ，每次以合并增加的形式累积实现。

# 4.6.3 2022-09-11

* [design] 为 effect 回调函数增加了 action 参数。

# 4.6.4 2022-09-11

* [bug] 完善 `index.d.ts` 文件中的 `action` 类型。

# 4.6.5 2022-09-19

* [bug] 解决继承子模型 effect 无法监听父模型行为方法问题。

# 4.6.6 2022-09-20

* [bug] 解决继承关系父模型中的 effect 无法在子模型代理过程中生效的问题。

# 4.6.7 2022-09-21

* [bug] 解决无法正确获取继承中的工作流模式问题。

# 4.6.8 2022-10-27

* [bug] 解决 Flows.debounce leading 状态无法正常运行方法的问题。

# 4.6.9 2022-11-06

* [optmize] 去掉了在 connect 之前 disconnect 的异常。

# 4.7.0 2022-11-13

* [optmize] 优化 @act 修饰方法返回类型为模型的 State 类型。

# 14.7.2 2022-12-07

* [optmize] 增加 Flows.submitOnce 工作模式