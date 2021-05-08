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