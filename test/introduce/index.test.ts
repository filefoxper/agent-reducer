import {flow, Flows, act, create, strict, effect} from "../../src";
import { Model } from "../../index";

describe("use strict", () => {
  // force model work in strict mode
  @strict()
  class Counter implements Model<number> {
    state: number;

    constructor(initialState: number) {
      this.state = initialState;
    }

    // mark action method
    @act()
    increase() {
      return this.state + 1;
    }

    // mark action method
    @act()
    decrease() {
      const nextState = this.state - 1;
      if (nextState < 0) {
        // use another method for help
        return this.reset();
      }
      return nextState;
    }

    // without `@act` decorator in strict mode,
    // `reset` can not be an action method
    reset() {
      return 0;
    }
  }

  test("In strict mode, we can identify which method can be an action method obviously by using `@act`", () => {
    // If we need set params for initial model,
    // we can use `new constructor` mode to do this.
    const { agent, connect, disconnect } = create(new Counter(0));
    connect();
    // 'increase' method is from 'agent' and it has been marked by `@act`,
    // so, it is an action method
    agent.increase();
    // model state is changed to 1
    expect(agent.state).toBe(1);
    // without `@act` decorator,
    // `reset` can not be an action method
    agent.reset();
    // model state can not be changed by `reset`
    expect(agent.state).toBe(1);
    disconnect();
  });
});

describe("use flow", () => {
  type State = {
    viewList: string[];
    loading: boolean;
  };

  const remoteSourceList = ["1", "2", "3", "4", "5"];

  class List implements Model<State> {
    state: State = {
      viewList: [],
      loading: false,
    };

    private changeViewList(viewList: string[]): State {
      return { ...this.state, viewList };
    }

    private load(): State {
      return { ...this.state, loading: true };
    }

    private unload(): State {
      return { ...this.state, loading: false };
    }

    // flow method works on latest mode,
    // Flows.latest() can make the state change of in this method only happens in the last calling time
    @flow(Flows.latest())
    async fetchList() {
      // keyword `this` represents `Agent` object,
      // so, `load` is an action method,
      // it changes state.loading tobe true
      this.load();
      try {
        const viewList = await Promise.resolve(remoteSourceList);
        // action method, change state.viewList to what promise resolve
        this.changeViewList(viewList);
      } finally {
        // action method, change state.loading false
        this.unload();
      }
    }
  }

  test("flow method can organize action methods to complete a complex work", async () => {
    const { agent, connect, disconnect } = create(List);
    connect();
    const fetchPromise = agent.fetchList();
    // first, action method `load` works in `fetchList`
    expect(agent.state.loading).toBe(true);
    await fetchPromise;
    // finally, action method `unload` works in `fetchList`
    expect(agent.state.loading).toBe(false);
    disconnect();
  });
});

describe("use effect", () => {
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
