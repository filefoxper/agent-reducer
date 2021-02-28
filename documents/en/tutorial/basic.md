# a simple search page model

We are going to build a todo list searching page model. Before start, let us list the model state:

1. search params
2. data source for a table
3. page infos

So, the model state should look like:
```typescript
// prior : normal, emergency
export enum PriorLevel {
    NORMAL,
    EMERGENCY
}

// data source model
export interface Todo {
    // what todo
    readonly content:string,
    // when to remind
    readonly remindTime?:string,
    readonly createTime:string,
    // prior
    readonly priorLevel:PriorLevel
}

// search params
export interface SearchParams {
    // for matching property 'content' 
    readonly content?:string,
    // for matching property 'remindTime' 
    readonly remindRange?:[string,string],
    // for matching property 'priorLevel' 
    readonly priorLevel?:PriorLevel
}

// state should looks like
export interface State {
    // search params
    readonly searchParams: SearchParams,
    // data source
    readonly dataSource:Array<Todo>|null,
    // page infos
    readonly currentPage:number,
    readonly pageSize:number,
    readonly total:number,
}
```
Now, we can build a 'TodoList' model, see code below. It can change search params, data source, page infos. When the request of todo list responds, we can use method `changeDataSource` to change `state.dataSource`, and we also need method `changePageInfo` to change the page infos in state. 

You can check code in [basic.spec.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/en/tutorial/basic.spec.ts).
```typescript
import {
    applyMiddleWares,
    createAgentReducer,
    middleWare,
    MiddleWarePresets,
    OriginAgent,
    useMiddleWare
} from "agent-reducer";
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
```
It works perfect in a simple `unit test` environment, but still has a lot of problems:

1. The request function is called out of a model, it makes model reusing difficult. 
2. The search params is a part of model, it makes state path too deep, when we want to change search params, we need to process state merge twice. And another problem is it skip the submit action which is very popular in a classify searching page design. 
   
We will recode this model to resolve these problems in [next section](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/tutorial/middle_ware.md).