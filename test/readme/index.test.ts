import { Model } from "../../index";
import { effect, Flows,create, act, strict, flow } from "../../src";

describe("basic", () => {
  // a class model template for managing a state
  class Counter implements Model<number> {
    // state of this model
    state: number = 0;

    // a method for generating a next state
    increase() {
      // keyword `this` represents model instance, like: new Counter()
      return this.state + 1;
    }

    decrease() {
      const nextState = this.state - 1;
      if (nextState < 0) {
        // use another method for help
        return this.reset();
      }
      return nextState;
    }

    reset() {
      return 0;
    }
  }

  test("call method from agent can change state", () => {
    // 'agent' is an avatar object from model class,
    // call method from 'agent' can lead a state change
    const { agent, connect, disconnect } = create(Counter);
    connect();
    // 'increase' method is from 'agent',
    // and returns a new state for model.
    agent.increase();
    // model state is changed to 1
    // We call these state change methods 'action methods'.
    expect(agent.state).toBe(1);
    disconnect();
  });

  test("only the method get from agent object directly, can change state", () => {
    const actionTypes: string[] = [];
    const { agent, connect, disconnect } = create(Counter);
    connect(({ type }) => {
      // record action type, when state is changed
      actionTypes.push(type);
    });
    // 'decrease' method is from 'agent',
    // and returns a new state for model.
    agent.decrease();
    // model state is changed to 0
    expect(agent.state).toBe(0);
    // the 'reset' method called in 'decrease' method,
    // it is not from 'agent',
    // so, it can not lead a state change itself,
    // and it is not an action method in this case.
    expect(actionTypes).toEqual(["decrease"]);
    disconnect();
  });
});

describe("use flow", () => {
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

    // for changing sourceList,
    // which will be used for filtering viewList
    private changeSourceList(sourceList: string[]): State {
      return { ...this.state, sourceList};
    }

    // for changing viewList
    private changeViewList(viewList: string[]): State {
      return { ...this.state, viewList };
    }

    // for changing keyword,
    // which will be used for filtering viewList
    changeKeyword(keyword: string): State {
      return { ...this.state, keyword };
    }

    // fetch remote sourceList
    // `flow` decorator can make a flow method,
    // in flow method, keyword `this` is an agent object,
    // so, you can call action method to change state.
    @flow()
    async fetchSourceList() {
      // fetch remote sourceList
      const sourceList = await Promise.resolve(remoteSourceList);
      // keyword `this` represents an agent object in flow method,
      // `changeSourceList` is from this agent object,
      // and it is marked as an action method,
      // so, it can change state.
      this.changeSourceList(sourceList);
    }

    // effect of action methods: changeSourceList, changeKeyword for filtering viewList.
    // `effect` decorator makes an effect method,
    // the effect method can be used for listening the state change from action methods.
    // effect method is a special flow method, it can not be called manually.
    // We can add a flow mode by using `flow` decorator with effect,
    // now, we have told the effect method works in a debounce mode with 100 ms
    @flow(Flows.debounce(100))
    @effect(() => [
      // listen to action method `changeSourceList`
      List.prototype.changeSourceList,
      // listen to action method `changeKeyword`
      List.prototype.changeKeyword,
    ])
    private effectForFilterViewList() {
      const { sourceList, keyword } = this.state;
      // filter out the viewList
      const viewList = sourceList.filter((content) =>
        content.includes(keyword.trim())
      );
      // use action method `changeViewList` to change state
      this.changeViewList(viewList);
    }
  }

  test("flow method is used for composing action methods together to resolve more complex works", async () => {
    const { agent, connect, disconnect } = create(List);
    connect();
    // use flow to fetch remote sourceList
    await agent.fetchSourceList();
    expect(agent.state.sourceList).toEqual(remoteSourceList);
    disconnect();
  });

  test('effect method can listen to the state change of action methods',async ()=>{
    const { agent, connect, disconnect } = create(List);
    connect();
    // use flow to fetch remote sourceList
    await agent.fetchSourceList();
    // change sourceList, the effect method `effectForFilterViewList` will start after 100 ms
    expect(agent.state.sourceList).toEqual(remoteSourceList);
    // change keyword,
    // the effect method `effectForFilterViewList` will cancel itself,
    // then start after 100 ms
    agent.changeKeyword('1');
    await new Promise((r)=>setTimeout(r,110));
    // effect `effectForFilterViewList` filter out the viewList
    expect(agent.state.sourceList).toEqual(remoteSourceList);
    expect(agent.state.viewList).toEqual(['1']);
    disconnect();
  })
});
