# 不常用 API

1 . defaultMiddleWare
  
默认 MiddleWare :
```typescript
export function defaultMiddleWare<T>(runtime: Runtime) {
  return function nextProcess(next: (result: any) => any) {
    return function stateProcess(result: any) {
      return next(result);
    };
  };
}
```
2 . toLifecycleMiddleWare ( lifecycleMiddleWareLike )

当前方法用于将一个类 `LifecycleMiddleWare` 转化成一个标准的 `LifecycleMiddleWare`。

``` typescript
const toLifecycleMiddleWare = (
  lifecycleMiddleWare: Omit<LifecycleMiddleWare, "lifecycle"> & {
    lifecycle?: boolean;
  }
): LifecycleMiddleWare
```
* lifecycleMiddleWare - 一个类 LifecycleMiddleWare ，查看[源码](https://github.com/filefoxper/agent-reducer/blob/master/src/libs/lifecycleMiddleWares.ts).

3 . DefaultActionType

这是个包含了 [use-redux-agent](https://www.npmjs.com/package/use-redux-agent) 特别使用的 Action 类型的枚举。

```typescript
enum DefaultActionType {
  // 初始化 redux agent state
  DX_INITIAL_STATE = "@@AGENT_REDUCER_INITIAL_STATE",
}
```

4 . getAgentNamespaceKey()

为 [use-redux-agent](https://www.npmjs.com/package/use-redux-agent) 返回一个寄生在 `Agent` 对象上的 namespace 的属性名。

5 . isAgent(object)

用来判断传入对象是否为一个合法的 `Agent` 对象。

返回[API Reference](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/index.md)