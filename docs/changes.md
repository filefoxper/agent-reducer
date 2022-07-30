## v3.1.2 2021-02-28

* [bug] fix `MiddleWares.takeDebounce` problem. 
* [bug] fix `globalConfig` problem. If a global object can not be found, `globalConfig` should not work.
* [feature] add `nextExperience` in `env` config for experience next version features.
`MiddleWare` override order in next version: `useMiddleWare` -> `middleWare` -> `createAgentReducer`.
* [document] update document structure.
* [document] increase english language support.
* [unit test] update unit test structure.

## v3.2.0 2021-03-11

* [bug] fix `useMiddleWare` reuse the MiddleWare from `createAgentReducer` problem.
* [design] `applyMiddleWares` reassign `runtime.cache` for each `MiddleWare`, 
in this version, `runtime.cache` used in MiddleWare is independent.
* [design]  `MiddleWares.takeNone()` is a new MiddleWare, this MiddleWare can stop any state change. 
* [feature] `MiddleWare` override order in current version: `useMiddleWare` -> `middleWare` -> `createAgentReducer`.
* [feature] `Agent` objects based on the same object mode model updates state synchronously.

## v3.2.1 2021-03-11

* [bug] fix when `use-agent-reducer` update state by its brothers, react throw error: `Cannot update a component (`xxx`) while rendering a different component (`xxx`)`

## v3.2.2 2021-03-12

* [bug] fix when `use-agent-reducer` update state by its brothers, react throw error: `Cannot update a component (`xxx`) while rendering a different component (`xxx`)`

## v3.2.7 2021-03-16

* [api] add `sharing` for generating a persistent model.
* [api] add `weakSharing` for generating a weak persistent model.

## v3.3.0 2021-04-25

* [compile] add import usage like `import {...} from 'agent-reducer\es'`. And this can decrease `agent-reducer` package size. [See detail](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/introduction/installation.md) .

## v3.3.1 2021-05-07

* [compile] make es package less.

## v3.3.2 2021-05-08

* [bug] fix the problem when using model sharing, an expired reducer still can modify state.

## v3.3.3 2021-05-24

* [bug] fix the problem about notify always runs in updateBy:'auto' env.

## v3.4.0 2021-05-31

* [refactor] do refactor for `agent.ts` and `reducer.ts`.

## v3.4.1 2021-06-01

* [bug] fix the problem about when middle param is empty, cause `NPE`.

## v3.5.0 2021-06-08

* [refactor] do refactor for `agent.ts` and `reducer.ts`.

## v3.6.0 2021-06-22

* [design] adopt the state changing strategy of `redux`, that means the model state is always updated immediately.
* [design] when using the model sharing, the `middleWare states` are shared with each agent too.

## v3.6.1 2021-06-22

* [bug] fix v3.6.0, weakSharing can not share inside middleWare caches.

## v3.6.2 2021-07-02

* [bug] fix the state feedback problem, the outside state should not feedback from v3.6.0.

## v3.6.3 2021-07-13

* [bug] fix the problem about state modified by a notified action.

## v3.7.0 2021-07-27

* [design] the weakSharing agent can change model state whether it is destroyed or not, only when all the sharing agents are destroyed.
* [design] add the `initial` callback to the weakSharing API returns. 

## v3.7.1 2021-08-04

* [design] the current property in weakSharing ref will be reset when first usage about it appears.

## v3.7.2 2021-08-26

* [design] add reconnect to reducer function property, that makes destroy can be reversed.

## v3.8.0 2021-09-24

* [design] add `initial` function into api `sharing` returns.
* [update] prepare for `agent-reducer@4.0.0`

## v3.8.1 2021-09-29

* [bug] fix build problem about `module` in `package.json`, and roll back the building config.

## v3.8.2 2021-10-11

* [bug] fix bug about `MiddleWarePresets.takeLatest`, when a promise result rejected, there are two rejections.

## v3.8.3 2021-10-15

* [optimize] optimize the code about `warningSet`.

## v4.0.0 2021-10-25

* [optimize] optimize the code about state change processing
* [design] remove the bad designs
* [design] rename some API functions
* [design] simplify some API functions
* [document] use github docs

## v4.0.1 2021-11-04

* [optimize] optimize the code building structure, and now the size optimization can be used into a windows system too, you can get this info from [installion](/introduction?id=installation).
* [optimize] The promise process in MiddleWare has not dependenced to `ES6 Promise` API.

## v4.0.2 2021-11-04

* [bug] repair bug from compile optimization in `4.0.1`, which makes the modules can not be found.

## v4.0.3 2021-11-23

* [design] add API [getSharingType](/api?id=getsharingtype).

## v4.0.4 2021-12-12

* [optimize] make the state change happens immediately after method runs, but the notify of state change always waits for each other.

# v4.0.5 2021-12-18

* [bug] repair the problem about notify ignore and the problem about repeat state update.

# v4.0.6 2022-01-24

* [bug] resolve the problem about `middleWare` class decorator error.

# v4.0.7 2022-02-10

* [unnecessary change] there is a unnecessary change, which will be reversed in 4.0.8 .

# 4.0.8 2022-02-10

* [reverse] reverse 4.0.7 to 4.0.6, and mark as 4.0.8.

# 4.0.9 2022-03-10

* [bug] resolve typescript problem about `MiddleWarePresets.takeNothing`, `MiddleWarePresets.takeNone`, `MiddleWarePresets.takeAssignable`

# 4.2.0 2022-03-17

* [optimize] use linked list to control the action consuming
* [api] add new API [addEffect](/zh/api?id=addeffect)
* [api] add new API [effect](/zh/api?id=effect)

# 4.2.1 2022-03-17

* [design] modify effect decorator param pattern, use as `()=>Class.prototype.method`.
* [design] effect decorator has support multi target methods to one `effect method` .

# 4.2.2 2022-03-19

* [bug] add the check of if the effect method belongs to the effect model.

# 4.2.3 2022-03-19

* [bug] repair the problem about API addEffect, when pass the method from `agent`, it warns method is invalidate.

# 4.2.4 2022-03-21

* [optimize] add validation about effect method getting from `agent`.

# 4.2.5 2022-03-22

* [bug] repair the problem about when all the connections from agents are disconnected, the method effect may still work, and change state, if it is a asynchronous method. 

# 4.3.0 2022-04-06

* [design] add [flow](/experience?id=flow-experience) and [effect](/experience?id=effect-decorator-experience).
* [design] add experience, set `process.env.AGENT_REDUCER_EXPERIENCE` to `OPEN`, can use the experience features. 

# 4.3.1 2022-04-12

* [design] add [avatar](/experience?id=avatar-experience-1) API.

# 4.3.2 2022-04-28

* [experience] remove experience API `flow.on`.
* [experience] add experience API `flow.force`.
* [experience] fix the problem about the type interface of `@effect`.

# 4.4.0 2022-05-17

* [design] turns [flow](/api?id=flow), [Flows](/api?id=flows),  [effect](/api?id=effect) and [avatar](/api?id=avatar) API to be official.
* [experience] add experience API [strict](/experience?id=strict) and [act](/experience?id=act).

# ~~4.5.0 to 4.5.3~~

* [deprecated]  This design is for react only. It is not reasonable, and we are so sorry for making that decision. We will rollback to `4.4.0`, and force `use-agent-reducer` rollback too.

# 4.5.4 2022-05-25

* [rollback] rollback to `4.4.0`.

# 4.5.5 2022-05-29

* [design] add `Flows.block` WorkFlow mode.
* [design] update `Flows.debounce` interface.

# 4.5.6 2022-05-30

* [design] move version modify of `Flows.latest` from process to invoke, and make `Flows.latest` more easy for compositing with other Flows.

# 4.6.0 2022-06-27

* [design] add [strict](/api?id=strict), [act](/api?id=act) API.

# 4.6.1 2022-07-27

* [bug] resolve the problem about typescript support for `sharing.initial` returning.

# 4.6.2 2022-07-30

* [design] make the avatar object can implement parts of it at different times.