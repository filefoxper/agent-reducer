# 使用更复杂的MiddleWare

如果我们在快速翻页过程中使用 debounce 特性，可大幅降低请求频率。并减少页面不必要的渲染损耗，从而提升页面的流畅度。

源码位置：[complex.middleWare.spec.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/tutorial/complex.middleWare.spec.ts).

```typescript
import {applyMiddleWares, createAgentReducer, middleWare, MiddleWarePresets, OriginAgent} from "agent-reducer";
import {PriorLevel, SearchParams, State} from "./type";
import {fetchTodoList} from "./service";

describe('use debounce and take latest state when change page',()=>{

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

    class TodoList implements OriginAgent<State> {
        
        state = defaultState;

        private async fetchDataSource(searchParams: SearchParams, currentPage: number, pageSize: number): Promise<State> {
            const fetchParams = {...searchParams, currentPage, pageSize};
            const {content: dataSource, total} = await fetchTodoList(fetchParams);
            return {searchParams, dataSource, currentPage, pageSize, total};
        }

        // 对翻页方法使用 MiddleWarePresets.takeDebounce(200),MiddleWarePresets.takeLatest() 的串行MiddleWare
        @middleWare(applyMiddleWares(MiddleWarePresets.takeDebounce(200),MiddleWarePresets.takeLatest()))
        async changePage(currentPage: number, pageSize: number): Promise<State> {
            const {searchParams} = this.state;
            return this.fetchDataSource(searchParams, currentPage, pageSize);
        }

        @middleWare(MiddleWarePresets.takeLatest())
        async submit(searchParams: SearchParams): Promise<State> {
            return this.fetchDataSource(searchParams, 1, 10);
        }

    }

    it('当我们在翻页方法上同时使用takeLatest和takeDebounce效果时，将得到更佳的性能提升', async () => {
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
```

使用`agent-reducer`你还能对这个页面模型做更多优化。我们将继续移步至[学习指南](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/guides/about_this.md)进行更深入的学习。