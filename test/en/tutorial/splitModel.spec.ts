import {createAgentReducer, middleWare, MiddleWarePresets} from "../../../src";
import {PriorLevel, SearchParams, State} from "./type";
import {fetchTodoList} from "./service";
import {OriginAgent} from "../../../index";

describe('split searchParams model out', () => {

    class SearchParamsModel implements OriginAgent<SearchParams> {

        state: SearchParams = {};

        // method for changing param 'content'
        changeSearchContent(content?: string): SearchParams {
            return {...this.state, content};
        };

        // method for changing param 'remindRange'
        changeSearchRemindRange(remindRange?: [string, string]): SearchParams {
            return {...this.state, remindRange};
        }

        // method for changing param priorLevel
        changeSearchPriorLevel(priorLevel?: PriorLevel): SearchParams {
            return {...this.state, priorLevel};
        }

        // method for accept search params from 'TodoList' model
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
     * this is a simple search params model
     */
    class TodoList implements OriginAgent<State> {
        // set default state
        state = defaultState;

        // the method fetchDataSource is a common method
        // middleWare only works with method which is called from 'Agent',
        // so, you should add middleWare directly on those methods,
        // which will be called directly from 'Agent'.
        private async fetchDataSource(searchParams: SearchParams, currentPage: number, pageSize: number): Promise<State> {
            // change searchParams to fetch params
            const fetchParams = {...searchParams, currentPage, pageSize};
            const {content: dataSource, total} = await fetchTodoList(fetchParams);
            // change page infos, dataSource and searchParams once
            return {searchParams, dataSource, currentPage, pageSize, total};
        }

        // split method fetchDataSource as a common method for changePageInfo and submit.
        // this method should works with a page navigation
        @middleWare(MiddleWarePresets.takePromiseResolve())
        async changePage(currentPage: number, pageSize: number): Promise<State> {
            const {searchParams} = this.state;
            return this.fetchDataSource(searchParams, currentPage, pageSize);
        }

        // this method should works with a submit button
        @middleWare(MiddleWarePresets.takePromiseResolve())
        async submit(searchParams: SearchParams): Promise<State> {
            return this.fetchDataSource(searchParams, 1, 10);
        }

    }

    it('Without submit SearchParamsModel state to TodoList, the fetch params should not change', async () => {
        const {agent: searchParamsAgent} = createAgentReducer(SearchParamsModel);
        const {agent: todoListAgent} = createAgentReducer(TodoList);

        const handlePriorLevelChange = () => searchParamsAgent.changeSearchPriorLevel(PriorLevel.EMERGENCY);

        const handleRollSearchParamsBack = (searchParams: SearchParams) => searchParamsAgent.feedback(searchParams);

        const handlePageChange = (currentPage: number = 1, pageSize: number = 10) =>
            todoListAgent.changePage(currentPage, pageSize);

        // change search params
        handlePriorLevelChange();
        // the search params in TodoList is not changed
        expect(todoListAgent.state.searchParams.priorLevel).not.toBe(searchParamsAgent.state.priorLevel);

        // change by a page navigation
        await handlePageChange(2);
        // when 'TodoList' state.dataSource changes,
        // the validate searchParams should be rolled back from 'TodoList' to 'SearchParamsModel',
        // doing this can keep searchParams according with dataSource.
        handleRollSearchParamsBack(todoListAgent.state.searchParams);

        const everyPriorLevelEmergency =
            todoListAgent.state.dataSource!.every(({priorLevel}) => priorLevel === PriorLevel.EMERGENCY);

        expect(everyPriorLevelEmergency).toBe(false);
        // finally the searchParams from 'TodoList' and 'SearchParamsModel' should be equal.
        expect(searchParamsAgent.state).toEqual(todoListAgent.state.searchParams);
    });

    it('submit SearchParamsModel state to TodoList, the fetch params should change', async () => {
        const {agent: searchParamsAgent} = createAgentReducer(SearchParamsModel);
        const {agent: todoListAgent} = createAgentReducer(TodoList);

        const handlePriorLevelChange = () => searchParamsAgent.changeSearchPriorLevel(PriorLevel.EMERGENCY);

        const handleSubmit = (params: SearchParams) => todoListAgent.submit(params);

        // change search params
        handlePriorLevelChange();
        expect(todoListAgent.state.searchParams.priorLevel).not.toBe(searchParamsAgent.state.priorLevel);

        // change by a submit button
        await handleSubmit(searchParamsAgent.state);

        const everyPriorLevelEmergency =
            todoListAgent.state.dataSource!.every(({priorLevel}) => priorLevel === PriorLevel.EMERGENCY);

        expect(everyPriorLevelEmergency).toBe(true);
        // finally the searchParams from 'TodoList' and 'SearchParamsModel' should be equivalence
        expect(searchParamsAgent.state).toEqual(todoListAgent.state.searchParams);
    });

});