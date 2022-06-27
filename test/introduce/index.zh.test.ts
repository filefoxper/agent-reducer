import {act, create, effect, flow, Flows, strict} from "../../src";
import {Model} from "../../index";

describe("使用严格模式", () => {
    // 强制模型以严格模式工作
    @strict()
    class Counter implements Model<number> {
        state: number = 0;

        // 使用 @act 标记为行为方法
        @act()
        increase() {
            return this.state + 1;
        }

        // 使用 @act 标记为行为方法
        @act()
        decrease() {
            const nextState = this.state - 1;
            if (nextState < 0) {
                // use another method for help
                return this.reset();
            }
            return nextState;
        }

        // 严格模式下未使用 `@act` 标记，
        // 该方法非行为方法，因此调用该方法无论在何场景都不具备修改 state 的能力
        reset() {
            return 0;
        }
    }

    test("在严格模式下，我们可以使用 @act 明确标识出可以修改 state 的行为方法", () => {
        const { agent, connect, disconnect } = create(Counter);
        connect();
        // 当前方法为严格模式下标识的行为方法
        agent.increase();
        // 行为方法可以通过 return 值修改模型 state
        expect(agent.state).toBe(1);
        // 当前方法在严格模式下并未标识，
        // 所以不是行为方法，不具备修改 state 的特性
        agent.reset();
        // state 保持不变
        expect(agent.state).toBe(1);
        disconnect();
    });
});

describe("使用工作流", () => {
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

        // 定义为工作流方法, 并使用 latest 工作模式
        // Flows.latest() 限制当前方法最新调用的行为方法才能修改 state 数据,
        // 过期调用中的行为方法将失活，失去修改 state 的能力
        @flow(Flows.latest())
        async fetchList() {
            // 工作流方法中的关键词 `this` 代表 `Agent` 对象,
            // 所以, `this.load` 是可以修改 state 数据的行为方法,
            // 它将 state.loading 设置为 true
            this.load();
            try {
                const viewList = await Promise.resolve(remoteSourceList);
                // 行为方法, 接收服务端的 viewList 并将它存入 state
                this.changeViewList(viewList);
            } finally {
                // 行为方法, 让 state.loading 置为 false
                this.unload();
            }
        }
    }

    test("工作流方法可用于组织行为方法，以完成更复杂的工作流程", async () => {
        const { agent, connect, disconnect } = create(List);
        connect();
        const fetchPromise = agent.fetchList();
        // 首先, `fetchList` 中的行为方法 `load` 将 state.loading 设置为 true
        expect(agent.state.loading).toBe(true);
        await fetchPromise;
        // 最后, fetchList` 中的行为方法 `unload` 将 state.loading 设置为 false
        expect(agent.state.loading).toBe(false);
        disconnect();
    });
});

describe("使用副作用响应方法", () => {
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

        // 用于修改 sourceList,
        // 作为未来过滤出 viewList 的数据源
        private changeSourceList(sourceList: string[]): State {
            return { ...this.state, sourceList};
        }

        // 用于修改 viewList
        private changeViewList(viewList: string[]): State {
            return { ...this.state, viewList };
        }

        // 用于键入 keyword 关键词,
        // 作为未来过滤出 viewList 的搜索条件
        changeKeyword(keyword: string): State {
            return { ...this.state, keyword };
        }

        // 获取服务端的 sourceList
        // 定义为 `flow` 工作流方法,
        @flow()
        async fetchSourceList() {
            // 获取服务端 sourceList
            const sourceList = await Promise.resolve(remoteSourceList);
            // 工作流方法中的关键词 `this` 代表 `Agent` 对象,
            // `this.changeSourceList` 是行为方法
            this.changeSourceList(sourceList);
        }

        // 监听 changeSourceList, changeKeyword 行为方法的副作用方法.
        // 使用 `@effect` 修饰器可定义副作用响应方法,
        // 副作用响应方法通过监听预设行为方法产生的 state 变化来运行.
        // 副作用响应方法是一种工作流方法，所以也可以通过 `@flow` 为其定义工作模式.
        // 这里我们定义了 100 毫秒间隔的防抖工作模式以优化搜索过程。
        // 注意：副作用响应方法不能被人为调用，否则报错
        @flow(Flows.debounce(100))
        @effect(() => [
            // 监听 `changeSourceList` 行为方法
            List.prototype.changeSourceList,
            // 监听 `changeKeyword` 行为方法
            List.prototype.changeKeyword,
        ])
        private effectForFilterViewList() {
            const { sourceList, keyword } = this.state;
            // 使用源和关键词过滤出 viewList 用于显示
            const viewList = sourceList.filter((content) =>
                content.includes(keyword.trim())
            );
            // 使用 `this.changeViewList` 行为方法存入 过滤数据
            this.changeViewList(viewList);
        }
    }

    test('副作用响应方法可用于监听模型 state 的改变',async ()=>{
        const { agent, connect, disconnect } = create(List);
        connect();
        // 使用工作流方法获取服务端数据
        await agent.fetchSourceList();
        // fetchSourceList 中的 changeSourceList 会触发 `effectForFilterViewList` 响应，
        // 并在防抖模式的 100 毫秒之后预约运行
        expect(agent.state.sourceList).toEqual(remoteSourceList);
        // changeKeyword 会触发 `effectForFilterViewList` 防抖模式取消上次 100 毫秒的启动预约,
        // 并重新预约 100 毫秒之后运行
        agent.changeKeyword('1');
        await new Promise((r)=>setTimeout(r,110));
        // 副作用响应方法 `effectForFilterViewList` 过滤出 viewList
        expect(agent.state.sourceList).toEqual(remoteSourceList);
        expect(agent.state.viewList).toEqual(['1']);
        disconnect();
    })
});
