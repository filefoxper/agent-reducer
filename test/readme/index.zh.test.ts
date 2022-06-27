import { Model } from "../../index";
import { effect, Flows, act, create, flow, strict } from "../../src";

describe("基本用法", () => {
  // 定义一个 class 模型模版
  class Counter implements Model<number> {
    // 模型维护的状态
    state: number = 0;

    // 用于生成下一个 state 状态的方法
    increase() {
      // 关键词 this 代表模型，相当于 new Counter()
      return this.state + 1;
    }

    decrease() {
      const nextState = this.state - 1;
      if (nextState < 0) {
        // 使用其他方法加工返回值
        return this.reset();
      }
      return nextState;
    }

    reset() {
      return 0;
    }
  }

  test("调用 agent 模型代理上对应方法修改 state 数据", () => {
    // 'agent' 是 class 模型的代理实例对象,
    // 调用来自 'agent' 的方法可以修改模型 state 状态
    const { agent, connect, disconnect } = create(Counter);
    connect();
    // 调用 'increase' 方法,
    // 'increase' 返回值即为下一个 state
    agent.increase();
    // 模型 state 状态被修改为 1
    // 我们称这种来自 'agent' 可直接修改 state 状态的方法为 '行为方法'
    expect(agent.state).toBe(1);
    disconnect();
  });

  test("只有通过 agent 模型代理调用的方法才能修改 state 数据", () => {
    const actionTypes: string[] = [];
    const { agent, connect, disconnect } = create(Counter);
    connect(({ type }) => {
      // 当 state 发生改变时，记录引起 state 变更的方法名
      actionTypes.push(type);
    });
    // 调用 'decrease' 方法,
    // 'decrease' 返回值即为下一个 state
    agent.decrease();
    // 模型 state 状态被修改为 0
    expect(agent.state).toBe(0);
    // 虽然 'decrease' 方法调用了 'reset' 方法，
    // 但因为 'reset' 方法并非直接来自于 'agent' 代理，
    // 所以 'reset' 方法返回值并没有直接引起 state 变更，
    // 这个例子中，'reset' 方法并非 '行为方法'
    expect(actionTypes).toEqual(["decrease"]);
    disconnect();
  });
});

describe("使用工作流方法 flow", () => {
  type State = {
    sourceList: string[];
    viewList: string[];
    keyword: string;
  };

  const remoteSourceList = ["1", "2", "3", "4", "5"];

  class List implements Model<State> {
    state: State = {
      sourceList: [],
      viewList: [],
      keyword: "",
    };

    // 修改 sourceList,
    // 该方法被加入 effect 监听，所以会触发 `effectForFilterViewList` effect 方法
    private changeSourceList(sourceList: string[]): State {
      return { ...this.state, sourceList };
    }

    // 修改 viewList
    private changeViewList(viewList: string[]): State {
      return { ...this.state, viewList };
    }

    // 修改 keyword,
    // 该方法被加入 effect 监听，所以会触发 `effectForFilterViewList` effect 方法
    changeKeyword(keyword: string): State {
      return { ...this.state, keyword };
    }

    // 从服务端获取 sourceList
    // `flow` 装饰器可以将方法定义为 `工作流方法`,
    // 在工作流方法中, 关键词 `this` 是一个内建的 agent 代理对象,
    // 通过调用 this 上的行为方法就可以修改模型 state 了
    @flow()
    async fetchSourceList() {
      // 获取服务器数据 sourceList
      const sourceList = await Promise.resolve(remoteSourceList);
      // 在工作流方法中, 关键词 `this` 是一个内建的 agent 代理对象,
      // 调用 `this.changeSourceList` 行为方法可以把 sourceList 写入模型的 state
      this.changeSourceList(sourceList);
    }

    // 行为方法副作用
    // 监听 changeSourceList, changeKeyword 行为方法产生的 state 变更，并运行
    // `effect` 装饰器可以把一个内置方法定义为一个`副作用反应方法`,
    // 可以通过监听目标行为方法，及时响应运行，
    // 副作用反应方法是一种特殊的工作流方法，它不能像普通 flow 工作流方法一样被人为调用。
    // 我们也可以对 effect 添加`工作模式`,如：@flow(Flows.debounce(100))
    // 现在我们定义了一个100ms防抖的副作用反应方法
    @flow(Flows.debounce(100))
    @effect(() => [
      // 监听行为方法 `changeSourceList`
      List.prototype.changeSourceList,
      // 监听行为方法 `changeKeyword`
      List.prototype.changeKeyword,
    ])
    private effectForFilterViewList() {
      const { sourceList, keyword } = this.state;
      // 过滤出 viewList
      const viewList = sourceList.filter((content) =>
        content.includes(keyword.trim())
      );
      // 使用 `changeViewList` 行为方法修改模型的 state
      this.changeViewList(viewList);
    }
  }

  test("工作流方法可用于组织单纯的行为方法，完成复杂的业务工作流程", async () => {
    const { agent, connect, disconnect } = create(List);
    connect();
    // 使用 flow 工作流获取服务端数据，并注入模型 state
    await agent.fetchSourceList();
    expect(agent.state.sourceList).toEqual(remoteSourceList);
    disconnect();
  });

  test("副作用反应方法可以在监听到指定行为方法引起 state 变化后，迅速做出反应", async () => {
    const { agent, connect, disconnect } = create(List);
    connect();
    // 使用 flow 工作流获取服务端数据，并注入模型 state
    await agent.fetchSourceList();
    // 在 changeSourceList 方法被调用后，
    // 副作用反应方法 `effectForFilterViewList` 启动，
    // 并在 100ms 防抖设定的影响下，滞后执行
    expect(agent.state.sourceList).toEqual(remoteSourceList);
    // 调用 changeKeyword 修改关键词后，同样会触发`effectForFilterViewList`，
    // 因为防抖作用，本次触发会先取消上次由 changeSourceList 触发的反应。
    agent.changeKeyword("1");
    await new Promise((r) => setTimeout(r, 110));
    // 反应方法 `effectForFilterViewList` 过滤出 viewList
    expect(agent.state.sourceList).toEqual(remoteSourceList);
    expect(agent.state.viewList).toEqual(["1"]);
    disconnect();
  });
});
