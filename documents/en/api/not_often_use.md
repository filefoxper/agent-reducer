# not often usage

1 . defaultMiddleWare
  
It look like:
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

This function helps for making a `LifecycleMiddleWare`. It returns a standard `LifecycleMiddleWare`.

``` typescript
const toLifecycleMiddleWare = (
  lifecycleMiddleWare: Omit<LifecycleMiddleWare, "lifecycle"> & {
    lifecycle?: boolean;
  }
): LifecycleMiddleWare
```
* lifecycleMiddleWare - a function which has a little different with `MiddleWare`. You can have a look at [the code of other MiddleWares in system](https://github.com/filefoxper/agent-reducer/blob/master/src/libs/lifecycleMiddleWares.ts).

3 . DefaultActionType

It contains some default action type for [use-redux-agent](https://www.npmjs.com/package/use-redux-agent).

```typescript
enum DefaultActionType {
  // for initial redux agent state
  DX_INITIAL_STATE = "@@AGENT_REDUCER_INITIAL_STATE",
}
```

4 . getAgentNamespaceKey()

This function returns a string, which is used as a property name on `Agent` object for storing a namespace for [use-redux-agent](https://www.npmjs.com/package/use-redux-agent)

5 . isAgent(object)

This function returns a boolean, it is used for checking if the object passed in is an `Agent` object.