import {PriorLevel, State} from "./type";
import {
    createAgentReducer,
    middleWare,
    MiddleWarePresets,
} from "../../../src";
import {fetchTodoList} from "./service";
import {OriginAgent} from "../../../index";

describe('make request function be called inside model', () => {

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

        // method for changing param 'content'
        changeSearchContent(content?: string): State {
            const {searchParams} = this.state;
            return {...this.state, searchParams: {...searchParams, content}};
        };

        // method for changing param 'remindRange'
        changeSearchRemindRange(remindRange?: [string, string]): State {
            const {searchParams} = this.state;
            return {...this.state, searchParams: {...searchParams, remindRange}};
        }

        // method for changing param priorLevel
        changeSearchPriorLevel(priorLevel?: PriorLevel): State {
            const {searchParams} = this.state;
            return {...this.state, searchParams: {...searchParams, priorLevel}};
        }

        // method for changing dataSource and page infos once
        // we can use 'MiddleWarePresets.takePromiseResolve' to trans a promise resolver be next state,
        // so we can keep fetch function inside model
        @middleWare(MiddleWarePresets.takePromiseResolve())
        async fetchDataSource(currentPage?: number, pageSize?: number): Promise<State> {
            const state = this.state;
            const {searchParams} = state;

            const current = currentPage || state.currentPage;
            const size = pageSize || state.pageSize;
            // change searchParams to fetch params
            const fetchParams = {...searchParams, currentPage: current, pageSize: size};
            const {content: dataSource, total} = await fetchTodoList(fetchParams);
            // change page infos, dataSource and searchParams once
            return {...this.state, dataSource, currentPage: current, pageSize: size, total};
        }

    }

    it('use MiddleWarePresets.takePromiseResolve for keeping request inside model', async () => {
        const {agent} = createAgentReducer(TodoList);
        const handlePriorLevelChange = () => agent.changeSearchPriorLevel(PriorLevel.EMERGENCY);
        // it is a good custom to make only one change about agent state in a event callback,
        // library like 'react' merge 'setState actions' together,
        // if you are using react hooks,
        // you may find 'setState' from 'useState' will cover the early one in one event callback
        const handleSearchContentChange = () => agent.changeSearchContent('todo');

        const handleFetchTodoList = (currentPage?: number, pageSize?: number) =>
            agent.fetchDataSource(currentPage, pageSize);

        handlePriorLevelChange();
        handleSearchContentChange();
        // fetch todo list, and set agent state
        await handleFetchTodoList(2);

        expect(agent.state.total).not.toBe(0);
        expect(agent.state.dataSource).not.toBeNull();
        expect(agent.state.currentPage).toBe(2);
    });

});