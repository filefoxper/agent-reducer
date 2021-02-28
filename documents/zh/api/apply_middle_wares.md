# applyMiddleWares(...middleWares)

该方法用于把多个 MiddleWare 串联成一个 MiddleWare。

```typescript
function applyMiddleWares(
  ...middleWares: (MiddleWare | LifecycleMiddleWare)[]
): MiddleWare | LifecycleMiddleWare
```
* middleWares - `MiddleWares`

查看源码中的 [例子](https://github.com/filefoxper/agent-reducer/blob/master/src/libs/middleWarePresets.ts) 。

返回 [API Reference](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/index.md)