import {
  applyMiddleWares,
  clearGlobalConfig,
  createAgentReducer,
  defaultMiddleWare,
  globalConfig,
  toLifecycleMiddleWare,
  useMiddleWare,
  isAgent,
} from "../../src";
import produce from "immer";
import {LifecycleRuntime, MiddleWare, OriginAgent, Runtime, StateProcess} from "../../index";

describe("自定义一个MiddleWare", () => {
  test("如果使用系统内置默认middleWare，reduce-action 必须返回完整的state数据，否则数据可能有缺失", () => {
    class ObjectAgent implements OriginAgent<{ id: number; name: string }> {
      state = { id: 0, name: "" };

      //使用默认middleWare，reduce-action 必须返回完整数据
      rename = (name: string) => {
        return { name };
      };
    }

    const { agent } = createAgentReducer(ObjectAgent);
    agent.rename("jack");
    expect(agent.state.name).toBe("jack");
    expect(agent.state.id).toBeUndefined();
  });

  test("如果使用一个自定义 assignable 的 middleWare，只要返回部分数据就可以了", () => {
    const assignableMiddleWare: MiddleWare = (runtime: Runtime) => {
      // middleWare在方法调用前获取运行环境
      return (next: StateProcess) => {
        //运行结束时提供下一个MiddleWare产生的数据处理方法
        return (result: any) => {
          //运行结束，且获取到next时，对返回数据进行进一步加工，然后通过next把加工完的数据传给下一个middleWare产生的数据处理方法，
          //最终数据流向最底层的dispatch方法，去改变reducer state数据
          const { target } = runtime;
          const state = (target as OriginAgent).state;
          if (Object.prototype.toString.apply(result) === "[object Object]") {
            return next({ ...state, ...result });
          }
          return next(result);
        };
      };
    };

    class ObjectAgent implements OriginAgent<{ id: number; name: string }> {
      state = { id: 0, name: "" };

      //使用自定义assignableMiddleWare，reduce-action 只要返回部分数据就可以了，assignableMiddleWare会对其进行简单扩展
      //注意：这里仅仅只是个例子，真正的assignableMiddleWare要复杂的多。
      rename = (name: string) => {
        return { name };
      };
    }

    //通过applyMiddleWares可以从左到右串行使用middleWare特性。
    const { agent } = createAgentReducer(
      ObjectAgent,
      applyMiddleWares(assignableMiddleWare, defaultMiddleWare)
    );
    agent.rename("jack");
    expect(agent.state.name).toBe("jack");
    expect(agent.state.id).toBe(0);
  });

  test("我们甚至可以自定义一个immer工具机MiddleWare", async () => {
    class ObjectAgent implements OriginAgent<{ id: number; name: string }> {
      state = { id: 0, name: "" };

      //immer语法
      immerRename = (name: string) => {
        this.state.name = name;
      };

      immerVoidRename() {
        this.immerRename("void");
      }
    }

    // 注意：immer.js API 中的 produce function 不能作用与一个异步方法，
    // 所以我们不能让我们的 'immutableMiddleWare' 和
    // 'MiddleWares.takePromiseResolve'一起工作了。
    const immutableMiddleWare:MiddleWare = (runtime: Runtime) => {
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
      ObjectAgent,
      applyMiddleWares(immutableMiddleWare, defaultMiddleWare)
    );
    agent.immerRename("just");
    expect(agent.state.name).toBe("just");
    agent.immerVoidRename();
    expect(agent.state.name).toBe("void");
  });

  test("自定义一个LifecycleMiddleWare", () => {
    class CountAgent implements OriginAgent<number> {
      state = 0;

      sum = (...counts: number[]): number => {
        return this.state + counts.reduce((r, c): number => r + c, 0);
      };
    }

    const count5MiddleWare = toLifecycleMiddleWare(
      (lifecycleRuntime: LifecycleRuntime) => {
        return (next: StateProcess): StateProcess => {
          return (result: number) => {
            if (result <= 5) {
              return next(result);
            }
            lifecycleRuntime.env.expire();
          };
        };
      }
    );
    const { agent } = createAgentReducer(CountAgent);
    const copy = useMiddleWare(agent, count5MiddleWare);
    copy.sum(5);
    expect(agent.state).toBe(5);
    copy.sum(1);
    expect(agent.state).toBe(5);
    copy.sum(-1);
    expect(agent.state).toBe(5);
  });
});

describe("通过 globalConfig 可以设置浏览器端全局配置", () => {
  class ObjectAgent implements OriginAgent<{ id: number; name: string }> {
    state = { id: 0, name: "" };

    rename = (name: string) => {
      return { name };
    };
  }

  beforeAll(() => {
    const assignableMiddleWare: MiddleWare = (runtime: Runtime) => {
      return (next: StateProcess) => {
        return (result: any) => {
          const { target } = runtime;
          const state = (target as OriginAgent).state;
          if (Object.prototype.toString.apply(result) === "[object Object]") {
            return next({ ...state, ...result });
          }
          return next(result);
        };
      };
    };

    //设置全局
    globalConfig({
      env: { strict: false }, //设置全局状态中的strict为false
      defaultMiddleWare: applyMiddleWares(
        assignableMiddleWare,
        defaultMiddleWare
      ), //在全局defaultMiddleWare前加上assignableMiddleWare特性
    });
  });

  afterAll(() => {
    clearGlobalConfig();
  });

  test("使用全局环境运行", () => {
    const { agent } = createAgentReducer(ObjectAgent);
    agent.rename("jack");
    expect(agent.state.name).toBe("jack");
    expect(agent.state.id).toBe(0);
  });
});
