import {createAgentReducer, middleWare, MiddleWarePresets, OriginAgent, useMiddleWare} from "../../../src";
import {PriorLevel, SearchParams, State} from "./type";
import {fetchTodoList} from "./service";

describe('保证数据为最新版本数据', () => {

    class SearchParamsModel implements OriginAgent<SearchParams> {

        state: SearchParams = {};

        changeSearchContent(content?: string): SearchParams {
            return {...this.state, content};
        };

        changeSearchRemindRange(remindRange?: [string, string]): SearchParams {
            return {...this.state, remindRange};
        }

        changeSearchPriorLevel(priorLevel?: PriorLevel): SearchParams {
            return {...this.state, priorLevel};
        }

        // 接收生效基础查询条件，并清理显示基础查询条件
        rollback(searchParams: SearchParams): SearchParams {
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
            // 当翻页至第 2 页时，我们人为制造一个延时效果来模拟服务器延时响应，
            // 这导致后续最新页对应的数据会被第 2 页数据覆盖
            if (currentPage === 2) {
                await new Promise((r) => setTimeout(r));
            }
            return this.fetchDataSource(searchParams, currentPage, pageSize);
        }

        // 提交查询接口，因为需要直接使用，可以加上MiddleWare
        @middleWare(MiddleWarePresets.takePromiseResolve())
        async submit(searchParams: SearchParams): Promise<State> {
            return this.fetchDataSource(searchParams, 1, 10);
        }

    }

    it('在没有MiddleWarePresets.takeLatest的帮助下进行翻页，可能出现最新数据被慢响应数据覆盖的情况', async () => {
        const {agent} = createAgentReducer(TodoList);
        const handleSubmit = () => agent.submit({});
        const handlePageChange = (currentPage: number, pageSize: number = 10) => agent.changePage(currentPage, pageSize);

        await handleSubmit();
        // 当翻页至第 2 页时，我们人为制造一个延时效果来模拟服务器延时响应，
        // 这导致后续最新页对应的数据会被第 2 页数据覆盖
        const p2 = handlePageChange(2);
        const p3 = handlePageChange(3);
        await Promise.all([p2, p3]);
        expect(agent.state.currentPage).toBe(2);
    });

    it('在使用MiddleWarePresets.takeLatest的帮助翻页时，不可能出现最新数据被慢响应数据覆盖的情况', async () => {
        const {agent} = createAgentReducer(TodoList);
        // MiddleWarePresets.takeLatest() 已经连入了一个 MiddleWares.takePromiseResolve()
        // useMiddleWare 会创建一个 'agent' 对象的复制版，
        // useMiddleWare 添加的 MiddleWare 将会覆盖通过 decorator 在`OriginAgent`上添加的 MiddleWare
        const takeLatestAgent = useMiddleWare(agent, MiddleWarePresets.takeLatest());

        const handleSubmit = () => takeLatestAgent.submit({});

        const handlePageChange = (currentPage: number, pageSize: number = 10) => takeLatestAgent.changePage(currentPage, pageSize);

        await handleSubmit();
        // 当翻页至第 2 页时，我们人为制造一个延时效果来模拟服务器延时响应，
        // 这本该导致后续最新页对应的数据会被第 2 页数据覆盖，
        // 但却被 MiddleWarePresets.takeLatest() 阻止了
        const p2 = handlePageChange(2);
        const p3 = handlePageChange(3);
        await Promise.all([p2, p3]);
        // takeLatestAgent.state 与 agent.state 保持一致，
        // 但我们依然推荐使用 agent.state
        expect(agent.state.currentPage).toBe(3);
    });

});