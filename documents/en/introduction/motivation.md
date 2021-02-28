# motivation

`Reducer` is very popular in state immutable system, like `react`,`redux`. It provides a stable processing environment, and makes data flow clear. But it has troubles too, when we `dispatch an action` into a `reducer function`. We have to collect an `action` object first, and inside the `reducer function`, we need to make a distinction between each `action types (action.type)` for processing different flow.

If we can use a class instance to replace `reducer`, and make calling a method as dispatching an `action`, the usage will be easy enough. Then we keep the best feature of `reducer` on, `return a next state in method` and use a class to build a `reducer`. 

[next to concept](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/introduction/concept.md)