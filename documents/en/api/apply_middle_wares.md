# applyMiddleWares(...middleWares)

It is a function for chaining `MiddleWares` together to be one `MiddleWare`. 

```typescript
function applyMiddleWares(
  ...middleWares: (MiddleWare | LifecycleMiddleWare)[]
): MiddleWare | LifecycleMiddleWare
```
* middleWares - `MiddleWares`

You can check the [example](https://github.com/filefoxper/agent-reducer/blob/master/src/libs/middleWarePresets.ts) in our project.

Go back to [API Reference](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/api/index.md)