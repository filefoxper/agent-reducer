import {applyMiddleWares, createAgentReducer, middleWare, MiddleWarePresets} from "../../../src";
import {PriorLevel, SearchParams, State} from "./type";
import {fetchTodoList} from "./service";
import {OriginAgent} from "../../../index";

describe('use debounce and take latest state when change page',()=>{

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

        // split method fetchDataSource above to changePageInfo and submit.
        // this method should works with a page navigation
        // add MiddleWarePresets.takeDebounce(200),MiddleWarePresets.takeLatest()
        @middleWare(applyMiddleWares(MiddleWarePresets.takeDebounce(200),MiddleWarePresets.takeLatest()))
        async changePage(currentPage: number, pageSize: number): Promise<State> {
            const {searchParams} = this.state;
            return this.fetchDataSource(searchParams, currentPage, pageSize);
        }

        // this method should works with a submit button
        @middleWare(MiddleWarePresets.takeLatest())
        async submit(searchParams: SearchParams): Promise<State> {
            return this.fetchDataSource(searchParams, 1, 10);
        }

    }

    it('when call changePage method with a takeLatest middleWare and debounce middleWare, ' +
        'the newest state should not be covered by a prev action state, and the request can be throttled down', async () => {
        const {agent} = createAgentReducer(TodoList);

        const handleSubmit = () => agent.submit({});

        const handlePageChange = (currentPage: number, pageSize: number = 10) => agent.changePage(currentPage, pageSize);

        await handleSubmit();
        handlePageChange(2);
        setTimeout(()=>handlePageChange(3),100);
        await new Promise((r)=>setTimeout(r,110));
        expect(agent.state.currentPage).toBe(1);
        await new Promise((r)=>setTimeout(r,210));
        expect(agent.state.currentPage).toBe(3);
    });

});