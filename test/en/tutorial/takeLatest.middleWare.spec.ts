import {createAgentReducer, middleWare, MiddleWarePresets, OriginAgent, useMiddleWare} from "../../../src";
import {PriorLevel, SearchParams, State} from "./type";
import {fetchTodoList} from "./service";

describe('take latest state when change page', () => {

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
        @middleWare(MiddleWarePresets.takePromiseResolve())
        async changePage(currentPage: number, pageSize: number): Promise<State> {
            const {searchParams} = this.state;
            // when currentPage is 2, we make a delay,
            // so it will cover the state after changePage 3 happens
            if (currentPage === 2) {
                await new Promise((r) => setTimeout(r));
            }
            return this.fetchDataSource(searchParams, currentPage, pageSize);
        }

        // this method should works with a submit button
        @middleWare(MiddleWarePresets.takePromiseResolve())
        async submit(searchParams: SearchParams): Promise<State> {
            return this.fetchDataSource(searchParams, 1, 10);
        }

    }

    it('when call changePage method without takeLatest middleWare, ' +
        'the newest state may be covered by a prev action state', async () => {
        const {agent} = createAgentReducer(TodoList);
        const handleSubmit = () => agent.submit({});
        const handlePageChange = (currentPage: number, pageSize: number = 10) => agent.changePage(currentPage, pageSize);

        await handleSubmit();
        // when currentPage is 2, we make a delay,
        // so it will cover the state after changePage 3 happens
        const p2 = handlePageChange(2);
        const p3 = handlePageChange(3);
        await Promise.all([p2, p3]);
        expect(agent.state.currentPage).toBe(2);
    });

    it('when call changePage method with a takeLatest middleWare, ' +
        'the newest state should not be covered by a prev action state', async () => {
        const {agent} = createAgentReducer(TodoList,{nextExperience:true});
        // MiddleWarePresets.takeLatest() has chained with a MiddleWares.takePromiseResolve()
        // useMiddleWare create a copy version from 'agent',
        // and for we have open `env.nextExperience`,
        // its MiddleWare will cover MiddleWare from decorators in 'OriginAgent'
        const takeLatestAgent = useMiddleWare(agent, MiddleWarePresets.takeLatest());

        const handleSubmit = () => takeLatestAgent.submit({});

        const handlePageChange = (currentPage: number, pageSize: number = 10) => takeLatestAgent.changePage(currentPage, pageSize);

        await handleSubmit();
        // when currentPage is 2, we make a delay,
        // so it should cover the state after changePage 3 happens,
        // but the MiddleWarePresets.takeLatest() prevent that happens.
        const p2 = handlePageChange(2);
        const p3 = handlePageChange(3);
        await Promise.all([p2, p3]);
        // takeLatestAgent.state keep equal with agent.state,
        // but we suggest you using agent.state
        expect(agent.state.currentPage).toBe(3);
    });

});