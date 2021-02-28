import {
    applyMiddleWares,
    createAgentReducer,
    middleWare,
    MiddleWarePresets,
    OriginAgent,
    useMiddleWare
} from "../../../src";
import {PriorLevel, SearchParams, State, Todo} from "./type";
import {fetchTodoList} from "./service";

describe("一个简单的TodoList查询页面模型", () => {

    const defaultState: State = {
        searchParams: {},
        dataSource: null,
        currentPage: 1,
        pageSize: 10,
        total: 0
    };

    /**
     * TodoList查询页面模型
     */
    class TodoList implements OriginAgent<State> {
        // 设置默认数据
        state = defaultState;

        // 'searchParams.content'修改方法
        changeSearchContent(content?: string): State {
            const {searchParams} = this.state;
            return {...this.state, searchParams: {...searchParams, content}};
        };

        // 'searchParams.remindRange'修改方法
        changeSearchRemindRange(remindRange?: [string, string]): State {
            const {searchParams} = this.state;
            return {...this.state, searchParams: {...searchParams, remindRange}};
        }

        // 'searchParams.priorLevel'修改方法
        changeSearchPriorLevel(priorLevel?: PriorLevel): State {
            const {searchParams} = this.state;
            return {...this.state, searchParams: {...searchParams, priorLevel}};
        }

        // 分页信息修改方法
        changePageInfo(currentPage: number, pageSize: number, total: number): State {
            return {...this.state, currentPage, pageSize, total};
        }

        // 列表修改方法
        changeDataSource(dataSource: Array<Todo>): State {
            return {...this.state, dataSource};
        }

    }

    it("当调用方法 'changeSearchContent'时， state.searchParams 会发生改变", () => {
        const {agent} = createAgentReducer(TodoList);
        const input = 'xxx';
        // 为什么要再包一层callback回调？
        // 我们需要模拟一套web事件环境,
        // 在一个事件中只调用一个`Agent`方法是一个好习惯，它有助于保证模型数据的修改一致性，
        // 不至于出现react hook中state的覆盖现象。
        const handleContentChange = (value: string) => agent.changeSearchContent(value);
        handleContentChange(input);
        expect(agent.state.searchParams.content).toBe(input);
    });


    it("调用 'changePageInfo'、'changeDataSource' 方法可以模拟一个查询返回数据修改过程", async () => {
        const {agent} = createAgentReducer(TodoList);
        const handlePriorLevelChange = (value: PriorLevel) => agent.changeSearchPriorLevel(value);
        // 获取 todoList 数据
        const handleFetchTodoList = async () => {
            const {state: {searchParams, currentPage, pageSize}} = agent;
            // 数据请求发生在'TodoList'模型外部，
            // 这不利于保持模型的完整性。
            const {content, total} = await fetchTodoList({...searchParams, currentPage, pageSize});
            // 在一个事件回调中连续多次调用`Agent`方法不是好现象，
            // 在类似`react hooks`系统中，多次调用`useState`产生的`setState`方法，
            // 容易出现数据覆盖现象，该现象对`use-agent-reducer`也是同样存在的。
            agent.changeDataSource(content);
            agent.changePageInfo(currentPage, pageSize, total);
        };
        // 修改查询参数优先级别
        handlePriorLevelChange(PriorLevel.EMERGENCY);
        // 获取 todoList 数据
        await handleFetchTodoList();
        // 看起来还不错，但其实有不少问题
        expect(agent.state.total).not.toBe(0);
        expect(agent.state.dataSource).not.toBeNull();
    });

});