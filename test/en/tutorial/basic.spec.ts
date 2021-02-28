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

describe("A simple todo list model", () => {

    const defaultState: State = {
        searchParams: {},
        dataSource: null,
        currentPage: 1,
        pageSize: 10,
        total: 0
    };

    /**
     * this is a simple todo list model
     */
    class TodoList implements OriginAgent<State> {
        // set default state
        state = defaultState;

        // method for changing param 'searchParams.content'
        changeSearchContent(content?: string): State {
            const {searchParams} = this.state;
            return {...this.state, searchParams: {...searchParams, content}};
        };

        // method for changing param 'searchParams.remindRange'
        changeSearchRemindRange(remindRange?: [string, string]): State {
            const {searchParams} = this.state;
            return {...this.state, searchParams: {...searchParams, remindRange}};
        }

        // method for changing param 'searchParams.priorLevel'
        changeSearchPriorLevel(priorLevel?: PriorLevel): State {
            const {searchParams} = this.state;
            return {...this.state, searchParams: {...searchParams, priorLevel}};
        }

        // method for changing page infos
        changePageInfo(currentPage: number, pageSize: number, total: number): State {
            return {...this.state, currentPage, pageSize, total};
        }

        // method for changing data source
        changeDataSource(dataSource: Array<Todo>): State {
            return {...this.state, dataSource};
        }

    }

    it("when we call method 'changeSearchContent', state.searchParams should be changed", () => {
        const {agent} = createAgentReducer(TodoList);
        const input = 'xxx';
        // why use a handle callback?
        // We are simulating a web event environment,
        // and it is a good custom to change agent state once in one event callback
        const handleContentChange = (value: string) => agent.changeSearchContent(value);
        handleContentChange(input);
        expect(agent.state.searchParams.content).toBe(input);
    });


    it("call method 'changePageInfo' and 'changeDataSource' can simulate a searching action", async () => {
        const {agent} = createAgentReducer(TodoList);
        const handlePriorLevelChange = (value: PriorLevel) => agent.changeSearchPriorLevel(value);

        const handleFetchTodoList = async () => {
            const {state: {searchParams, currentPage, pageSize}} = agent;
            // the dataSource fetch function is out of model 'TodoList',
            // this is not good for a model define
            const {content, total} = await fetchTodoList({...searchParams, currentPage, pageSize});
            // change agent state more then once in one event callback is not good,
            // it may lead to state override problems in system like 'react', or cause some other bugs
            agent.changeDataSource(content);
            agent.changePageInfo(currentPage, pageSize, total);
        };
        // change search param: priorLevel
        handlePriorLevelChange(PriorLevel.EMERGENCY);
        // fetch todo list
        await handleFetchTodoList();
        // it seems perfect, but still a lot of problems
        expect(agent.state.total).not.toBe(0);
        expect(agent.state.dataSource).not.toBeNull();
    });

});