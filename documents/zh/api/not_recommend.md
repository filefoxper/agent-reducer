# 不推荐使用的 API

1 . MiddleActions

MiddleActions is a class, it is designed for using `MiddleWares` out of `Agent` object. It is an `Agent` object using helper.
You can build a class extends MiddleActions, and use api `useMiddleActions` to generate a proxy object, just like `createAgentReducer` processing an `OriginAgent` model to an `Agent` object.

You can check code in [notRecommend.spec.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/en/api/notRecommend.spec.ts)

```typescript
import {
    createAgentReducer, 
    MiddleActions, 
    middleWare, 
    MiddleWares, 
    OriginAgent, 
    useMiddleActions
} from "agent-reducer";
import {isPromise} from "util";

describe('how to use MiddleActions', () => {

    class CountAgent implements OriginAgent<number> {

        state = 0;

        increase = (): number => this.state + 1;

        decrease(): number {
            return this.state - 1;
        }

        walk(increment: boolean): number {
            return increment ? this.increase() : this.decrease();
        }

        async sumWithRemoteValue(remoteValue: number): Promise<number> {
            return this.state + remoteValue;
        };
    }

    // a helper class for using Agent object
    class CountMiddleActions extends MiddleActions<CountAgent> {

        // method control MiddleWare can work well
        @middleWare(MiddleWares.takeDebounce(200))
        increaseDebounce() {
            this.agent.increase();
        }

        // state processing MiddleWare can not work with MiddleActions
        @middleWare(MiddleWares.takePromiseResolve())
        sumWithRemoteValue() {
            return this.agent.sumWithRemoteValue(1);
        }

    }

    it('method control MiddleWare can work well', async () => {
        const {agent} = createAgentReducer(CountAgent);
        const {increaseDebounce} = useMiddleActions(CountMiddleActions, agent);
        increaseDebounce();
        increaseDebounce();
        await new Promise((r)=>setTimeout(r,210));
        expect(agent.state).toBe(1);
    });

    it('state processing MiddleWare can not work with MiddleActions', async () => {
        const {agent} = createAgentReducer(CountAgent);
        const {sumWithRemoteValue} = useMiddleActions(CountMiddleActions, agent);
        await sumWithRemoteValue();
        // state processing MiddleWare can not work with MiddleActions,
        // so next state will be a Promise object
        expect(isPromise(agent.state)).toBe(true);
    });

});
```
The state processing MiddleWares can not work with `MiddleActions`, but method control MiddleWares still works here, it make a confuse about which MiddleWare can work with `MiddleActions` and a question about where the MiddleWare effect on, the `MiddleActions` or its `Agent`. For these reasons, we do not recommend you to use this api (the same reason to `useMiddleActions`). 

2 . useMiddleActions(middleActions, ...otherParams)

This function can build an `Agent` use helper. It returns a `MiddleActions` instance which is a proxy object. You can use `method control MiddleWares` on this proxy object.

```typescript
type MiddleActionsInterface<T>={agent:T,[key:string]:any};

function useMiddleActions<
  T extends OriginAgent<S>,
  P extends MiddleActionsInterface<T, S>,
  S = any
>(
    middleActions: new (agent:T):MiddleActions, 
    ...otherParams:(T|MiddleWare)[]
): P
```

* middleActions - a class extends MiddleActions
* otherParams - start an `Agent` object, and rest with MiddleWares

3 . globalConfig(config) 

`(destroy at agent-reducer@4.0.0)`

This function can config a global `env` and default `MiddleWare` for `agent-reducer`. That means `createAgentReducer` will find `env` config and default `MiddleWare` from global config first, and merge current one with the default for running.
```typescript
interface GlobalConfig {
  env?: Env;
  defaultMiddleWare?: MiddleWare;
}

function globalConfig(config:GlobalConfig):void
```

4 . clearGlobalConfig()

`(destroy at agent-reducer@4.0.0)`

This function can remove the global config data.

返回 [API Reference](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/api/index.md)