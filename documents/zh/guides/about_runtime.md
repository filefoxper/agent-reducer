# 关于 runtime 对象

MiddleWare function 可以接收到一个`runtime`对象。这个对象包含了几乎所有你需要的参数用于重制 state 或控制`Agent`方法。比如：当前运行的`Agent`方法，以及这个方法对应的模型方法，还有`Agent`对象，模型对象，甚至是运行环境 env 。

runtime object 结构：
```typescript
// 'Agent' 对象运行的环境设置
export interface Env {
  updateBy?: "manual" | "auto";
  expired?: boolean;
  strict?: boolean;
  legacy?: boolean;
  nextExperience?:boolean;
}

export type Caller = (...args: any[]) => any;

export type Runtime<T = any> = {
  caller: Caller;           // 当前运行的'Agent'方法
  sourceCaller: Caller;     // 当前‘Agent’方法对应的模型方法
  callerName: keyof T;      // 当前’Agent‘方法名
  args?: any[];             // 当前‘Agent’方法接收的参数
  target: T;                // 当前‘Agent’对象
  source: T;                // 当前‘Agent’对应的模型对象'OriginAgent'
  env: Env;                 // 当前’Agent‘方法的运行环境
  // 供 MiddleWare 使用的数据缓存对象
  cache: { [key: string]: any };
  // MiddleWare 在修改模型数据时，系统产生的暂存对象，不允许修改。
  rollbacks:{[key in keyof T]?:T[key]};
  // 暂时修改 'OriginAgent' 模型属性的方法，
  // 调用该方法时，原模型属性被缓存到 rollbacks 中
  mapSourceProperty:(key:keyof T,callback:(value:any,instance:T,runtime:Runtime<T>)=>any)=>Runtime<T>;
  // MiddleWare 结束时，对模型修改数据的回滚方法,
  rollback:()=>Runtime<T>;
  // tempCaller 属于系统暂存数据，不允许修改。
  tempCaller?: Caller;
};
```
我们在[上一节](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/guides/about_middle_ware.md)建立了一个自定义 MiddleWare ，并选用了`runtime.target.state` 参数为我们的 MiddleWare 服务。现在我们将使用更多的`runtime` 属性，写出更酷的 MiddleWare 插件。

让我们写一个 MiddleWare 用来支持 [immer.js](https://github.com/immerjs/immer) 在`Agent`方法中的工作。 源码位置：[runtime.spec.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/guides/runtime.spec.ts)。

```typescript
import {
    createAgentReducer,
    isAgent,
    OriginAgent,
    Runtime,
    StateProcess
} from "agent-reducer";
import produce from "immer";

type State={
    name:string
}

describe('让agent-reducer支持immer.js',()=>{

    class ImmerModel implements OriginAgent<State>{

        state={name:''};

        changeName(name:string){
            this.state.name=name;
        }

    }

    it("当我们直接调用 changeName 方法时，我们的 state 将变成 undefined，因为我们什么都没有 return",()=>{
        const {agent}=createAgentReducer(ImmerModel);
        agent.changeName('name');
        expect(agent.state).toBeUndefined();
    });

    it('我们可以制造一个MiddleWare来支持 immer.js',()=>{
        // 注意：immer.js API 中的 produce function 不能作用与一个异步方法，
        // 所以我们不能让我们的 'immutableMiddleWare' 和
        // 'MiddleWares.takePromiseResolve'一起工作了。
        const immutableMiddleWare = (runtime: Runtime) => {
            const { target, callerName } = runtime;
            // 检查调用者是否是一个 'Agent' 对象
            if (!isAgent(target)) {
                throw new Error("immutableMiddleWare should work with an agent object");
            }
            // 当 'Agent' 方法被调用时，
            // 我们可以通过 runtime.mapSourceProperty 修改模型 'OriginAgent' 方法，
            // 来暂时性的支持 immer。
            runtime.mapSourceProperty(
                callerName,
                // caller 为需要被修改的源值，
                // instance 为模型对象，
                // runtime 为方法运行参数
                (caller: (...args: any[]) => any, instance: any, runtime: Runtime) => {
                    // 返回一个新 function 来代替模型 'OriginAgent' 的方法
                    return function (...args: any[]) {
                        // 使用 immer 的 produce
                        const result = produce(instance.state, (draft: any) => {
                            // 在 produce 回调开始时，
                            // 修改模型 'OriginAgent' 的 state 为 produce 生成的 draft 对象
                            runtime.mapSourceProperty("state", () => draft);
                            // 调用源方法，这时源方法中的 this.state 已经被替换成了 draft
                            return caller.apply(instance, [...args]);
                        });
                        // 方法运行结束时，需要通过 runtime.rollback 回滚被修改的模型数据，
                        // 当前方法及state
                        runtime.rollback();
                        // 最后把结果返回出去就行了
                        return result;
                    };
                }
            );
            // 在完成了对源方法的零时替换后，就开始运行零时替换方法了。
            return (next: StateProcess) => {
                return (result: any) => {
                    return next(result);
                };
            };
        };
        const { agent } = createAgentReducer(
            ImmerModel,immutableMiddleWare
        );
        agent.changeName("name");
        expect(agent.state.name).toBe("name");
    });

})
```
如果您对 MiddleWare 还想了解更多，可以[看看系统源码](https://github.com/filefoxper/agent-reducer/blob/master/src/libs/middleWares.ts)。

MiddleWare 有三种不同的使用方式，它们互相之间可能产生覆盖现象，移步至[下一节](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/guides/about_middle_ware_override.md) 去了解一下。 