# motivation

The pure functional data processor `reducer` is widely used in state immutable systems, like `react`, `redux`. It provides a stable processing environment, and makes data flow clear. But it still has space for evolution, such as the dispatching mechanism. It seems to be a good design for dispatching an action as a param to `reducer` function, but `dispatch` function is still not the `reducer` function, and `action` object is still not natural enough as function arguments. 

We have made a tool working with a ES6 class processor, every method of this class processor is used for producing a next state, just like what a `reducer` does, so we call this tool `agent-reducer`. And you can consider it as a upgraded `reducer` tool.

[next to concept](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/introduction/concept.md)