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