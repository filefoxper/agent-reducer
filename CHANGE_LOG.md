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