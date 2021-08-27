import {PriorLevel, State} from "./type";
import {
    createAgentReducer,
    middleWare,
    MiddleWarePresets,
} from "../../../src";
import {fetchTodoList} from "./service";
import {OriginAgent} from "../../../index";

describe('在模型中使用异步请求', () => {

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

        // 将设置列表数据和设置分页信息的事情放在一个return中完成。
        // 使用'MiddleWarePresets.takePromiseResolve'将promise resolve的对象作为新state，
        // 这样我们就可以把请求方法写在模型中了。
        @middleWare(MiddleWarePresets.takePromiseResolve())
        async fetchDataSource(currentPage?: number, pageSize?: number): Promise<State> {
            const state = this.state;
            const {searchParams} = state;

            const current = currentPage || state.currentPage;
            const size = pageSize || state.pageSize;
            // 将基础查询条件和分页信息组成直接查询条件
            const fetchParams = {...searchParams, currentPage: current, pageSize: size};
            // 请求数据
            const {content: dataSource, total} = await fetchTodoList(fetchParams);
            // 一次性修改返回列表数据和分页信息
            return {...this.state, dataSource, currentPage: current, pageSize: size, total};
        }

    }

    it('通过MiddleWarePresets.takePromiseResolve将异步请求写在模型内部', async () => {
        const {agent} = createAgentReducer(TodoList);
        const handlePriorLevelChange = () => agent.changeSearchPriorLevel(PriorLevel.EMERGENCY);

        const handleSearchContentChange = () => agent.changeSearchContent('todo');

        // 获取异步请求数据，并一次性修改列表和分页数据
        const handleFetchTodoList = (currentPage?: number, pageSize?: number) =>
            agent.fetchDataSource(currentPage, pageSize);

        handlePriorLevelChange();
        handleSearchContentChange();
        // 获取异步请求数据，并一次性修改列表和分页数据
        await handleFetchTodoList(2);

        expect(agent.state.total).not.toBe(0);
        expect(agent.state.dataSource).not.toBeNull();
        expect(agent.state.currentPage).toBe(2);
    });

});