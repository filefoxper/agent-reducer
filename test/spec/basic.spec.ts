import {
  MiddleActions,
  useMiddleWare,
  middleWare,
  createAgentReducer,
  OriginAgent,
  useMiddleActions,
  LifecycleMiddleWares,
  MiddleWares,
  applyMiddleWares,
  MiddleWarePresets,
} from "../../src";

/**
 * 一个 reducer 函数往往没有一个 class 实例对象更容易描述action type分支操作。
 * 但 reducer return 数据的设计要比对象赋值或setState修改数据更稳定，更有预测性，
 * 同时return出现在if分支判断中，能有效减少开发者的思维压力。
 * 让我们把reducer和面向对象两种模式的优点结合起来，用class的形式来重写一个reducer。
 */
describe("Reducer VS Class", () => {
  interface Action {
    type?: "stepUp" | "stepDown" | "step" | "sum";
    payload?: number[] | boolean;
  }

  /**
   * 经典reducer模式
   * @param state
   * @param action
   */
  const countReducer = (state: number = 0, action: Action = {}): number => {
    switch (action.type) {
      case "stepDown":
        return state - 1;
      case "stepUp":
        return state + 1;
      case "step":
        return state + (action.payload ? 1 : -1);
      case "sum":
        return (
          state +
          (Array.isArray(action.payload) ? action.payload : []).reduce(
            (r, c): number => r + c,
            0
          )
        );
      default:
        return state;
    }
  };

  /**
   * 结合reducer特性的class模式
   */
  class CountAgent implements OriginAgent<number> {
    state = 0;

    stepUp = (): number => this.state + 1;

    stepDown = (): number => this.state - 1;

    step = (isUp: boolean) => (isUp ? this.stepUp() : this.stepDown());

    sum = (...counts: number[]): number => {
      return this.state + counts.reduce((r, c): number => r + c, 0);
    };
  }

  test("reducer的action模式比class方法调用模式更难使用（typescript系统还要描述type的类型）", () => {
    expect(countReducer(0, { type: "stepUp" })).toBe(1);
    expect(new CountAgent().stepUp()).toBe(1);
  });

  test("reducer的action传参没有class方法调用入参显得那么自然", () => {
    expect(countReducer(0, { type: "step", payload: true })).toBe(1);
    expect(new CountAgent().step(true)).toBe(1);
  });

  test("reducer的action传参没有class方法调用入参灵活", () => {
    expect(countReducer(0, { type: "sum", payload: [1, 2, 3] })).toBe(6);
    expect(new CountAgent().sum(1, 2, 3)).toBe(6);
  });
});

/**
 * origin-agent: 用户的数据模型部分，必须拥有一个state属性存放数据，可提供 return nextState 的方法作为修改state的方法。
 *               可以把它当作是 reducer 的 class 模型，如：CountAgent
 * reducer:      由 createAgentReducer 方法根据 origin-agent 模型生成的 reducer 方法，用于接入 reducer 工具系统。
 * agent:        reducer附属的 origin-agent 代理对象，使用者可以通过调用 agent 的方法（ 可配合各种 MiddleWare ），
 *               修改state数据 （ 正确的说是指定下一个 state 数据，由整合的 reducer 工具系统来修改 ）。
 * action:       agent对象上的所有方法都拥有配合MiddleWare改变或废弃下一个 this.state 的作用，这些方法称为 action
 */
describe("使用 agent-reducer 来使用 class 与 reducer 模式的结合体", () => {
  /**
   * 这是一个计数agent
   */
  class CountAgent implements OriginAgent<number> {
    // 必须有一个state
    state = 0;

    // 返回一个 state 数据可以修改 this.state
    stepUp = (): number => this.state + 1;

    // 箭头函数还是普通类方法随你挑
    stepDown(): number {
      return this.state - 1;
    }

    // 调用其他方法不必担心多次dispatch
    step(isUp: boolean): number {
      return isUp ? this.stepUp() : this.stepDown();
    }

    sum = (...counts: number[]): number => {
      return this.state + counts.reduce((r, c): number => r + c, 0);
    };
  }

  test("调用一个方法，方法的返回值将会改变 this.state", () => {
    const { agent } = createAgentReducer(CountAgent);
    agent.stepUp();
    expect(agent.state).toBe(1);
  });
});

describe("agent-reducer的基本使用", () => {
  class CountAgent implements OriginAgent<number> {
    state = 0;

    stepUp = (): number => this.state + 1;

    stepDown = (): number => this.state - 1;

    sum = (...counts: number[]): number => {
      return this.state + counts.reduce((r, c): number => r + c, 0);
    };
    //agent只承认第一层调用dispatch，所以，内部方法调用只是一个数据加工而已。
    step(isUp: boolean) {
      return isUp ? this.stepUp() : this.stepDown();
    }

    //因为没有添加middleWare作再加工处理，该方法返回的promise即为下一个state，也就是说预期state是一个number，这里却变成了一个Promise<number>
    callingRequest = () => Promise.resolve(2);

    callingUndefined() {}

    // 通过添加middleWare可以改变下一个state值，这里的takePromiseResolve将promise resolve后的值作为下一个state
    @middleWare(MiddleWares.takePromiseResolve())
    async callingStepUpAfterRequest() {
      return Promise.resolve(1);
    }

    // 通过添加middleWare可以控制方法的调用时机
    @middleWare(MiddleWarePresets.takeThrottle(200))
    takeThrottleSum(num: number) {
      return this.sum(num);
    }

    @middleWare(MiddleWarePresets.takeDebounce(200, { leading: true }))
    takeDebounceLeadingSum(num: number) {
      return this.sum(num);
    }

    // 通过添加middleWare可以控制方法的调用时机
    @middleWare(
      applyMiddleWares(
        LifecycleMiddleWares.takeLatest(),
        MiddleWarePresets.takeDebounce(200)
      )
    )
    async takeDebounceSumAndLatest(num: number) {
      await new Promise((r) => setTimeout(r, num * 100));
      return this.sum(num);
    }
  }

  test("默认情况下agent方法返回数据即为下一个state值", async () => {
    const { agent } = createAgentReducer(CountAgent);
    agent.callingUndefined();
    expect(agent.state).toBeUndefined();
    await agent.callingRequest();
    // 根据默认 defaultMiddleWare 的特性，defaultMiddleWare 只管透传数据，那么下一个 state 将会是个 promise
    expect(typeof agent.state).not.toBe("number");
  });

  test("通过使用middleWare可以改变默认特性，比如通过加takePromiseResolve middleWare可以把promise的结果转成下一个state", async () => {
    const { agent } = createAgentReducer(CountAgent);
    await agent.callingStepUpAfterRequest();
    expect(agent.state).toBe(1);
  });

  test("在测试环境中调用 createAgentReducer 返回的 recordChanges 方法可以获取修改记录", () => {
    const { agent, recordChanges } = createAgentReducer(CountAgent);
    const unRecord = recordChanges(); // 返回一个 unRecord 方法，unRecord 的返回值就是修改记录
    agent.stepUp();
    agent.stepUp();
    agent.stepDown();
    const changes = unRecord(); // 修改记录格式 {type:方法名 , state:记录时刻agent的数据}
    expect(changes).toEqual([
      { type: "stepUp", state: 1 },
      { type: "stepUp", state: 2 },
      { type: "stepDown", state: 1 },
    ]);
  });

  test("即便内部调用其他方法作为action，也不会增加不期望的dispatch负担", () => {
    const { agent, recordChanges } = createAgentReducer(CountAgent);
    const unRecord = recordChanges();
    agent.step(true);
    const changes = unRecord();
    expect(changes.map(({ state }) => state)).toEqual([1]);
  });

  test("使用 MiddleWarePresets.takeThrottle 可以降低方法的调用频率", async () => {
    const { agent } = createAgentReducer(CountAgent);
    const { takeThrottleSum } = agent;
    takeThrottleSum(1); // 立即调用，并准备 200ms 内对当前方法调用的拦截和记录，最后一条记录会在距离这次调用 200ms 以后执行
    takeThrottleSum(1); // 被下一次调用覆盖
    takeThrottleSum(1); // 当前方法被记录为最新的调用记录，在 200ms 以后调用
    expect(agent.state).toBe(1);
    await new Promise((r) => setTimeout(r, 220));
    expect(agent.state).toBe(2);
  });

  test("使用 MiddleWarePresets.takeDebounce 可以降低方法的调用频率", async () => {
    const { agent } = createAgentReducer(CountAgent);
    const { takeDebounceLeadingSum } = agent;
    takeDebounceLeadingSum(1); // 立即调用
    setTimeout(() => takeDebounceLeadingSum(1), 100); // 200ms 内的调用不起效果，在此基础上再推迟 200ms 之后可以调用成功
    setTimeout(() => takeDebounceLeadingSum(1), 320); // 立即调用
    expect(agent.state).toBe(1);
    await new Promise((r) => setTimeout(r, 450));
    expect(agent.state).toBe(2);
  });

  test("MiddleWare随意组合获取不同效果", async () => {
    const { agent } = createAgentReducer(CountAgent);
    const { takeDebounceSumAndLatest } = agent;
    takeDebounceSumAndLatest(3);
    setTimeout(() => takeDebounceSumAndLatest(5), 100);
    setTimeout(() => takeDebounceSumAndLatest(1), 310);
    await new Promise((r) => setTimeout(r, 620));
    expect(agent.state).toBe(1);
    await new Promise((r) => setTimeout(r, 850));
    expect(agent.state).toBe(1);
  });
});

describe("一个 agent 方法中的this，永远指向 origin-agent 实例对象，将方法赋值给其他对象，或重新绑定均无效", () => {
  class CountAgent implements OriginAgent<number> {
    state = 0;

    stepUp = (): number => this.state + 1;

    stepDown = (): number => this.state - 1;

    sum = (...counts: number[]): number =>
      this.state + counts.reduce((r, c): number => r + c, 0);

    step = (isUp: boolean) => (isUp ? this.stepUp() : this.stepDown());

    @middleWare(MiddleWares.takePromiseResolve())
    async callingStepUpAfterRequest() {
      await Promise.resolve();
      return this.stepUp();
    }
  }

  test("将 method 赋值给其他 object 属性，直接调用 object 的属性方法，不会改变 this 的指向，this 应该为 origin-agent", async () => {
    let object: any = {};
    const { agent } = createAgentReducer(CountAgent);
    const { callingStepUpAfterRequest } = agent;
    object.call = callingStepUpAfterRequest;
    await object.call();
    expect(agent.state).toBe(1);
  });

  test("将 method 绑定成其他 object 属性方法，直接调用绑定后方法，不会改变 this 的指向，this 应该为 origin-agent", async () => {
    let object: any = {};
    const { agent } = createAgentReducer(CountAgent);
    const { callingStepUpAfterRequest } = agent;
    const call = callingStepUpAfterRequest.bind(object);
    await call();
    expect(agent.state).toBe(1);
  });
});

/**
 * 使用 useMiddleActions 方法可用于管理和调用 agent 对象上的 state 和 actions
 * 如：useMiddleActions(agent,class extends MiddleActions)
 */
describe("使用 useMiddleActions 方法可用于管理和调用agent对象上的state和actions", () => {
  class CountAgent implements OriginAgent<number> {
    state = 0;

    constructor(initialState: number) {
      this.state = initialState;
    }

    stepUp = (): number => this.state + 1;

    stepDown = (): number => this.state - 1;

    sum = (...counts: number[]): number =>
      this.state + counts.reduce((r, c): number => r + c, 0);

    step = (isUp: boolean) => (isUp ? this.stepUp() : this.stepDown());
  }

  // 一个继承 MiddleActions 的 自定义类型可以调用指定 agent
  class CountBeside extends MiddleActions<CountAgent> {
    // 使用agent的 action 可修改 agent.state
    async callingStepUpAfterRequest() {
      await Promise.resolve();
      return this.agent.stepUp();
    }
  }

  test("使用 useMiddleActions 方法可以管理调用agent上的方法，通过调用 this.agent的方法修改 agent.state", async () => {
    const { agent } = createAgentReducer(new CountAgent(1)); // 你可以使用对象的形式来定义一个 origin-agent，以方便传参
    const middleActions = useMiddleActions(CountBeside, agent); //使用 useMiddleActions 获取自定义MiddleActions的实例
    await middleActions.callingStepUpAfterRequest();
    expect(agent.state).toBe(2);
  });

  test("useMiddleActions 不但可以设置 class 作为 MiddleActions，也可以使用 object 的形式", async () => {
    const { agent } = createAgentReducer(new CountAgent(1)); // 你可以使用对象的形式来定义一个 origin-agent，以方便传参
    const middleActions = useMiddleActions(new CountBeside(agent)); //使用 useMiddleActions 获取自定义MiddleActions的实例
    await middleActions.callingStepUpAfterRequest();
    expect(agent.state).toBe(2);
  });
});

describe("useMiddleWare 会对已存在的 agent 复制一个生命周期不同的版本 ，并让复制版获取指定MiddleWare的能力", () => {
  class CountAgent implements OriginAgent<number> {
    state = 0;

    stepUp = (): number => this.state + 1;

    stepDown = (): number => this.state - 1;

    sum = (...counts: number[]): number => {
      return this.state + counts.reduce((r, c): number => r + c, 0);
    };

    async callingSumAfter(tms: number) {
      await new Promise((r) => setTimeout(r, tms * 100));
      return this.sum(tms);
    }

    @middleWare(
      applyMiddleWares(
        LifecycleMiddleWares.takeLatest(),
        MiddleWares.takePromiseResolve()
      )
    )
    async callingSumAfterWithDec(tms: number) {
      await new Promise((r) => setTimeout(r, tms * 100));
      return this.sum(tms);
    }
  }

  test("使用 LifecycleMiddleWares.takeLatest, 可以保持agent数据为最新版本数据（最后一次触发并修改的数据，有点像saga的takeLatest）", async () => {
    const { agent } = createAgentReducer(CountAgent);
    const { callingSumAfter } = useMiddleWare(
      agent,
      LifecycleMiddleWares.takeLatest(),
      MiddleWares.takePromiseResolve()
    );
    const first = callingSumAfter(5); // resolve 500ms 后
    const second = callingSumAfter(2); // resolve 200ms 后
    // 200ms 后 second promise 先 resolve 并修改了 agent.state, 但 first promise 依然在等待,
    // 这时候 AsyncMiddleWares.takeLatest 这个 MiddleWare 把useMiddleWare新建的agent拷贝版标记成过期，并再次新建一个非过期的agent拷贝来代替这个版本，
    // 500ms 后 first promise resolve，但它所在的老版本拷贝已经过期，所以不能继续修改 agent.state 了.
    await Promise.all([first, second]);
    expect(agent.state).toBe(2);
  });

  test("使用 LifecycleMiddleWares.takeBlock, 可以使被调用方法在resolve之前，不能再被调用", () => {
    const { agent, recordChanges } = createAgentReducer(CountAgent);
    const { callingSumAfter } = useMiddleWare(
      agent,
      MiddleWares.takeBlock(200),
      MiddleWares.takePromiseResolve()
    );
    // 如果设置了阻塞时间，在阻塞时间过期后不论此时是否resolve完成，被调用方法都恢复原来可被调用状态
    const unRecord = recordChanges();
    const first = callingSumAfter(5); // resolve after 500ms
    const second = callingSumAfter(5); // resolve after 500ms
    setTimeout(() => {
      const records = unRecord();
      expect(agent.state).toBe(5);
      expect(records.length).toBe(1);
    }, 600);
  });

  test("使用useMiddleWare时，若被调用的方法已经有指定的middleWare时， 以useMiddleWare为准", () => {
    const { agent, recordChanges } = createAgentReducer(CountAgent);
    // MiddleWarePresets是一个常用MiddleWares的串行集合，比如：
    // MiddleWarePresets.takeBlock = applyMiddleWares(LifecycleMiddleWares.takeBlock(ms),MiddleWares.takePromiseResolve(),MiddleWares.takeAssignable());
    const { callingSumAfterWithDec } = useMiddleWare(
      agent,
      MiddleWarePresets.takeBlock(200)
    );
    const unRecord = recordChanges();
    const first = callingSumAfterWithDec(5); // resolve after 500ms
    const second = callingSumAfterWithDec(2); // resolve after 200ms
    setTimeout(() => {
      const records = unRecord();
      expect(agent.state).toBe(5);
      expect(records.length).toBe(1);
    }, 600);
  });

  test("使用 LifecycleMiddleWares.takeLazy, 可以实现节流效果", async () => {
    const { agent } = createAgentReducer(CountAgent);
    const { stepUp } = useMiddleWare(agent, MiddleWares.takeLazy(200));
    // 延时200ms执行，若200ms内再被触发，以触发时间开始继续延迟200ms
    stepUp();
    stepUp();
    setTimeout(() => stepUp(), 100);
    await new Promise((r) => setTimeout(r, 350));
    expect(agent.state).toBe(1);
  });

  test("使用 LifecycleMiddleWares.takeLazy, 如果使用方法再次调用在触发的设置时间之后，相当于一个普通延时调用", async () => {
    const { agent } = createAgentReducer(CountAgent);
    const { stepUp } = useMiddleWare(agent, MiddleWares.takeLazy(200));
    // 延时200ms执行，若200ms内再被触发，以触发时间开始继续延迟200ms
    stepUp();
    setTimeout(() => stepUp(), 200);
    await new Promise((r) => setTimeout(r, 500));
    expect(agent.state).toBe(2);
  });
});

describe("使用 middleWare 方法可以对当前被调用方法单独添加指定MiddleWare特性", () => {

  class CountAgent implements OriginAgent<number> {
    state = 0;

    constructor() {
      middleWare(
        this.callingStepUpAfterRequestAddMiddleWareInConstructor,
        applyMiddleWares(
          LifecycleMiddleWares.takeLatest(),
          MiddleWares.takePromiseResolve()
        )
      );
    }

    stepUp = (): number => this.state + 1;

    stepDown = (): number => this.state - 1;

    sum = (...counts: number[]): number => {
      return this.state + counts.reduce((r, c): number => r + c, 0);
    };

    // MiddleWarePresets是一个常用MiddleWares的串行集合，比如：
    // MiddleWarePresets.takeBlock = applyMiddleWares(LifecycleMiddleWares.takeBlock(ms),MiddleWares.takePromiseResolve(),MiddleWares.takeAssignable());
    @middleWare(MiddleWarePresets.takeLatest())
    async callingStepUpAfterRequest(tms: number) {
      await new Promise((r) => setTimeout(r, tms * 100));
      return this.sum(tms);
    }

    async callingStepUpAfterRequestAddMiddleWareInConstructor(tms: number) {
      await new Promise((r) => setTimeout(r, tms * 100));
      return this.sum(tms);
    }
  }

  class CountBesides extends MiddleActions<CountAgent> {
    @middleWare(MiddleWarePresets.takeLatest())
    async callingStepUpAfterRequest(tms: number) {
      await new Promise((r) => setTimeout(r, tms * 100));
      return this.agent.sum(tms);
    }

    @middleWare(MiddleWarePresets.takeLazy(200))
    callingStepUpAfterRequestLazy() {
      this.agent.sum(1);
    }
  }

  test("在 agent 的 middle-action 上都可以通过添加middleWare的形式实现简易的useMiddleWare", async () => {
    const { agent } = createAgentReducer(CountAgent);
    const { callingStepUpAfterRequest } = agent;
    const first = callingStepUpAfterRequest(5); // after 500ms
    const second = callingStepUpAfterRequest(2); // after 200ms
    await Promise.all([first, second]);
    expect(agent.state).toBe(2);
  });

  test("在 agent 的 constructor里通过添加middleWare方法调用的形式也能实现简易的useMiddleWare", async () => {
    const { agent } = createAgentReducer(CountAgent);
    const { callingStepUpAfterRequestAddMiddleWareInConstructor } = agent;
    const first = callingStepUpAfterRequestAddMiddleWareInConstructor(5); // after 500ms
    const second = callingStepUpAfterRequestAddMiddleWareInConstructor(2); // after 200ms
    await Promise.all([first, second]);
    expect(agent.state).toBe(2);
  });

  test("在 MiddleActions 的所有方法上都可以通过添加middleWare的形式实现简易的useMiddleWare", async () => {
    const { agent } = createAgentReducer(CountAgent);
    const { callingStepUpAfterRequest } = useMiddleActions(CountBesides, agent);
    const first = callingStepUpAfterRequest(5); // after 500ms
    const second = callingStepUpAfterRequest(2); // after 200ms
    await Promise.all([first, second]);
    expect(agent.state).toBe(2);
  });

  test("在 MiddleActions 的所有方法上都可以通过添加middleWare的形式实现简易的useMiddleWare,比如takeLazy", async () => {
    const { agent } = createAgentReducer(CountAgent);
    const { callingStepUpAfterRequestLazy } = useMiddleActions(
      CountBesides,
      agent
    );
    callingStepUpAfterRequestLazy();
    callingStepUpAfterRequestLazy();
    setTimeout(() => {
      callingStepUpAfterRequestLazy();
    }, 250);
    await new Promise((r) => setTimeout(r, 200));
    expect(agent.state).toBe(1);
    await new Promise((r) => setTimeout(r, 300));
    expect(agent.state).toBe(2);
  });
});

describe("MiddleAction可以使用是任意action集合，甚至与agent无关", () => {
  class CustomMiddleAction {
    data = 0;

    @middleWare(MiddleWarePresets.takeLazy(200))
    callback(value: number) {
      this.data = value;
    }
  }

  test("对一个没有agent属性的action集合方法使用MiddleWarePresets.takeLazy一样是可行的", async () => {
    const actions = useMiddleActions(new CustomMiddleAction());
    const { callback } = actions;
    callback(1);
    setTimeout(() => callback(2), 100);
    setTimeout(() => callback(3), 320);
    expect(actions.data).toBe(0);
    await new Promise((r) => setTimeout(r, 320));
    expect(actions.data).toBe(2);
    await new Promise((r) => setTimeout(r, 530));
    expect(actions.data).toBe(3);
  });
});

// 如果有兴趣请继续看develop.spec.ts，了解一些agent-reducer的非基本用法。
