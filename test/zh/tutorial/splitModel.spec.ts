import {
    createAgentReducer,
    middleWare,
    MiddleWarePresets,
    OriginAgent
} from "../../../src";
import {PriorLevel, SearchParams, State} from "./type";
import {fetchTodoList} from "./service";

describe('分离基础查询条件模型', () => {

    class SearchParamsModel implements OriginAgent<SearchParams> {

        state: SearchParams = {};

        // 'content'修改方法
        changeSearchContent(content?: string): SearchParams {
            return {...this.state, content};
        };

        // 'remindRange'修改方法
        changeSearchRemindRange(remindRange?: [string, string]): SearchParams {
            return {...this.state, remindRange};
        }

        // 'priorLevel'修改方法
        changeSearchPriorLevel(priorLevel?: PriorLevel): SearchParams {
            return {...this.state, priorLevel};
        }

        // 接收生效基础查询条件，并清理显示基础查询条件
        feedback(searchParams: SearchParams): SearchParams {
            return searchParams;
        }

    }

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
        // 设置默认页面模型数据
        state = defaultState;

        // 翻页和点击查询按钮公共方法，用于查询列表数据，
        // 并将查到的列表数据和分页信息一同设置到state中。
        // 当前公共方法被设置为私有方法，外部不能直接调用，故不要在该方法上添加MiddleWare，
        // MiddleWare必须作用与直接通过`Agent`对象获取或调用的方法上，否则无效
        private async fetchDataSource(searchParams: SearchParams, currentPage: number, pageSize: number): Promise<State> {
            // 将基础查询条件和分页信息组成直接查询条件
            const fetchParams = {...searchParams, currentPage, pageSize};
            // 请求数据
            const {content: dataSource, total} = await fetchTodoList(fetchParams);
            // 一次性修改返回列表数据和分页信息
            return {searchParams, dataSource, currentPage, pageSize, total};
        }

        // 翻页查询接口，因为需要直接使用，可以加上MiddleWare
        @middleWare(MiddleWarePresets.takePromiseResolve())
        async changePage(currentPage: number, pageSize: number): Promise<State> {
            const {searchParams} = this.state;
            return this.fetchDataSource(searchParams, currentPage, pageSize);
        }

        // 提交查询接口，因为需要直接使用，可以加上MiddleWare
        @middleWare(MiddleWarePresets.takePromiseResolve())
        async submit(searchParams: SearchParams): Promise<State> {
            return this.fetchDataSource(searchParams, 1, 10);
        }

    }

    it('若无查询条件提交, 主模型的查询条件应该保持不变', async () => {
        const {agent: searchParamsAgent} = createAgentReducer(SearchParamsModel);
        const {agent: todoListAgent} = createAgentReducer(TodoList);

        const handlePriorLevelChange = () => searchParamsAgent.changeSearchPriorLevel(PriorLevel.EMERGENCY);

        const handleRollSearchParamsBack = (searchParams: SearchParams) => searchParamsAgent.feedback(searchParams);

        const handlePageChange = (currentPage: number = 1, pageSize: number = 10) =>
            todoListAgent.changePage(currentPage, pageSize);

        // 改变显示查询条件
        handlePriorLevelChange();
        // 主模型中相关条件不受影响
        expect(todoListAgent.state.searchParams.priorLevel).not.toBe(searchParamsAgent.state.priorLevel);

        // 分页器分页查询
        await handlePageChange(2);
        // 当主模型`TodoList`的state.dataSource改变时，
        // 当前生效查询条件将清理重置显示查询条件，
        // 这样才能保证查询条件和列表数据的一致性。
        handleRollSearchParamsBack(todoListAgent.state.searchParams);

        const everyPriorLevelEmergency =
            todoListAgent.state.dataSource!.every(({priorLevel}) => priorLevel === PriorLevel.EMERGENCY);

        expect(everyPriorLevelEmergency).toBe(false);
        // 最终生效查询条件必然和显示查询条件相等（或等价）
        expect(searchParamsAgent.state).toEqual(todoListAgent.state.searchParams);
    });

    it('提交查询条件后，应让被提交的提交生效，并按最新查询条件进行查询', async () => {
        const {agent: searchParamsAgent} = createAgentReducer(SearchParamsModel);
        const {agent: todoListAgent} = createAgentReducer(TodoList);

        const handlePriorLevelChange = () => searchParamsAgent.changeSearchPriorLevel(PriorLevel.EMERGENCY);

        const handleSubmit = (params: SearchParams) => todoListAgent.submit(params);

        // 改变显示查询条件
        handlePriorLevelChange();
        expect(todoListAgent.state.searchParams.priorLevel).not.toBe(searchParamsAgent.state.priorLevel);

        // 提交查询显示条件
        await handleSubmit(searchParamsAgent.state);

        const everyPriorLevelEmergency =
            todoListAgent.state.dataSource!.every(({priorLevel}) => priorLevel === PriorLevel.EMERGENCY);

        expect(everyPriorLevelEmergency).toBe(true);
        // 最终生效查询条件必然和显示查询条件相等（或等价）
        expect(searchParamsAgent.state).toEqual(todoListAgent.state.searchParams);
    });

});