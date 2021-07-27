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