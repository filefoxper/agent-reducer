# LifecycleMiddleWares

LifecycleMiddleWares 生命周期控制 MiddleWare 集合，这个 class 只包含了`takeLatest`一个 MiddleWare 。

## LifecycleMiddleWares.takeLatest

使用 takeLatest 生命周期控制类 MiddleWare 后，只有最新一次方法触发才会被允许修改 state ，而早期方法触发的回调或 promise resolve 都不再拥有修改 state 的能力，我们称之为 `Agent` 失活。

实际上，这个 MiddleWare 是通过 runtime 设置 `Agent` 复制版对象的 `env.expired` 来控制 `Agent` 生命周期的，如果有 `Agent` 方法发生了一次 state 修改，那么当前 `Agent` 复制对象就会被失活，并被抛弃，然后 MiddleWare 会重建一个 `Agent` 复制对象来代替原来的复制版。因为需要使用复制版`Agent`容易被丢弃或重建的能力，所以生命周期控制类 MiddeWare 不能直接使用在 api `createAgentReducer` 上。

```typescript
class LifecycleMiddleWares {
    static takeLatest(): LifecycleMiddleWare
}
```
单元测试[例子](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/api/lifecycleMiddleWares.spec.ts).

```typescript
import {
    applyMiddleWares,
    createAgentReducer,
    LifecycleMiddleWares,
    MiddleWares,
    OriginAgent,
    useMiddleWare
} from "agent-reducer";

type User = {
    id?: number,
    name?: string
}

class UserModel implements OriginAgent<User> {

    state: User = {id: 0};

    async fetchUser(version: number, delay: number) {
        await new Promise((r) => setTimeout(r, delay));
        return {id: version, name: 'name_' + version};
    }

}

describe("如何使用 LifecycleMiddleWares.takeLatest", () => {

    it("如果不加这个MiddleWare，最新的数据变更可能会被一个早期触发方法产生的数据变更覆盖掉", async () => {
        const {agent} = createAgentReducer(UserModel, MiddleWares.takePromiseResolve());
        const promise1 = agent.fetchUser(1, 200);
        const promise2 = agent.fetchUser(2, 100);
        await Promise.all([promise1, promise2]);
        // 早期版本数据覆盖现象
        expect(agent.state.id).toBe(1);
    });

    it("你可以通过添加该MiddleWare保护最新数据，防止被一个早期触发方法产生的数据变更覆盖", async () => {
        const {agent} = createAgentReducer(UserModel);
        const copy = useMiddleWare(agent, applyMiddleWares(
            LifecycleMiddleWares.takeLatest(),
            MiddleWares.takePromiseResolve()
        ));
        const promise1 = copy.fetchUser(1, 200);
        const promise2 = copy.fetchUser(2, 100);
        await Promise.all([promise1, promise2]);
        // 早期版本数据覆盖现象被 LifecycleMiddleWares.takeLatest 阻止
        expect(agent.state.id).toBe(2);
    });

});
```
返回[API Reference](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/index.md)